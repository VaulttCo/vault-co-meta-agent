// Victoria — Orchestrator Agent
// The executive brain. Receives every transcript chunk, routes to agents,
// synthesizes outputs into a single coaching card.
// Server-side only.

import { callAnthropicTool, isAnthropicAvailable, VICTORIA_MODELS } from "../../anthropic";
import {
  ORCHESTRATOR_SYSTEM_PROMPT,
  ORCHESTRATOR_TOOL,
  buildOrchestratorUserMessage,
} from "../../prompts/orchestrator";
import { preprocessChunk, buildRecentTranscriptContext } from "../../signals/chunk-preprocessor";
import { runDiscoveryAgent, updateDiscoveryState } from "../discovery";
import { runObjectionIntelAgent } from "../objection-intel";
import { getSession, saveSession, saveLatestCoachingCard } from "../../memory/session-store";
import {
  insertTranscriptChunk,
  insertCoachingEvent,
  insertObjectionEvent,
  insertAgentOutput,
} from "../../db";

import type {
  LiveCallSession,
  TranscriptChunk,
  CoachingCard,
  SubmitChunkRequest,
  ChunkProcessingResult,
  ObjectionEvent,
  CoachingType,
  CoachingPriority,
  ObjectionCategory,
} from "../../types";

// ─────────────────────────────────────────────────────────────
// Orchestrator configuration
// ─────────────────────────────────────────────────────────────

const CONFIG = {
  // How often to run discovery agent (every N chunks)
  DISCOVERY_EVERY_N_CHUNKS: 1,
  // Minimum confidence threshold to emit a coaching card
  MIN_CONFIDENCE_TO_EMIT: 0.55,
  // Max coaching history to keep in session state
  MAX_COACHING_HISTORY: 30,
};

// ─────────────────────────────────────────────────────────────
// Coaching card factory — builds a card without going to Anthropic.
// Used when we have clear deterministic signal (objection detected, etc.)
// ─────────────────────────────────────────────────────────────

function generateCardId(): string {
  return `vc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildObjectionCard(
  session: LiveCallSession,
  chunk: TranscriptChunk,
  objectionOutput: import("../../types").ObjectionOutput
): CoachingCard {
  return {
    id: generateCardId(),
    call_id: session.call_id,
    chunk_index: chunk.chunk_index,
    timestamp_ms: Date.now(),
    priority: "high",
    coaching_type: "reframe_objection",
    headline: `Objection: ${objectionOutput.category.replace(/_/g, " ")}`,
    primary_action: objectionOutput.reframe_strategy.approach.slice(0, 120),
    why: objectionOutput.hidden_meaning,
    suggested_language: objectionOutput.reframe_strategy.suggested_language,
    what_not_to_do: objectionOutput.what_not_to_do,
    context_tags: ["objection", objectionOutput.category, "reframe"],
    confidence: 0.85,
    current_phase: session.phase,
    source_agent: "objection_intel",
  };
}

function buildDiscoveryCard(
  session: LiveCallSession,
  chunk: TranscriptChunk,
  discoveryOutput: import("../../types").DiscoveryOutput
): CoachingCard {
  const hasWarning = !!discoveryOutput.warning;
  const priority: CoachingPriority = discoveryOutput.warning?.type === "pitching_too_early"
    ? "critical"
    : discoveryOutput.assessment === "incomplete"
    ? "high"
    : "normal";

  const coachingType: CoachingType = discoveryOutput.warning?.type === "pitching_too_early"
    ? "danger_warning"
    : discoveryOutput.depth_score < 50
    ? "probe_deeper"
    : "next_question";

  return {
    id: generateCardId(),
    call_id: session.call_id,
    chunk_index: chunk.chunk_index,
    timestamp_ms: Date.now(),
    priority,
    coaching_type: coachingType,
    headline: hasWarning
      ? (discoveryOutput.warning!.type === "pitching_too_early" ? "⚠️ Stop — discovery incomplete" : discoveryOutput.warning!.message.slice(0, 60))
      : `Ask: ${discoveryOutput.next_best_question.slice(0, 50)}`,
    primary_action: hasWarning
      ? discoveryOutput.warning!.redirect
      : discoveryOutput.next_best_question,
    why: hasWarning
      ? `Discovery depth: ${discoveryOutput.depth_score}/100 — ${discoveryOutput.why_this_question}`
      : discoveryOutput.why_this_question,
    suggested_language: hasWarning ? undefined : discoveryOutput.next_best_question,
    what_not_to_do: hasWarning ? "Do not pitch — go back to discovery" : undefined,
    context_tags: ["discovery", discoveryOutput.question_framework.toLowerCase(), "pain"],
    confidence: discoveryOutput.depth_score > 80 ? 0.9 : 0.75,
    current_phase: session.phase,
    source_agent: "discovery",
  };
}

function buildBuyingSignalCard(
  session: LiveCallSession,
  chunk: TranscriptChunk,
  keywords: string[]
): CoachingCard {
  return {
    id: generateCardId(),
    call_id: session.call_id,
    chunk_index: chunk.chunk_index,
    timestamp_ms: Date.now(),
    priority: "critical",
    coaching_type: "buying_signal_detected",
    headline: "🟢 Buying signal — they're interested",
    primary_action: "Do NOT pitch more features. Slow down. Ask a trial close question.",
    why: `Detected: "${keywords.slice(0, 2).join('", "')}" — they're mentally moving forward`,
    suggested_language: "It sounds like you're seeing how this could work for you — what would need to happen for you to feel good about moving forward?",
    what_not_to_do: "Do not pile on more features or benefits — they're already there. Overselling now kills the deal.",
    context_tags: ["buying_signal", "close", "trial_close"],
    confidence: 0.88,
    current_phase: session.phase,
    source_agent: "buying_signal",
  };
}

// ─────────────────────────────────────────────────────────────
// Priority resolver — which card wins?
// ─────────────────────────────────────────────────────────────

const PRIORITY_RANK: Record<CoachingPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  background: 1,
};

function selectBestCard(cards: CoachingCard[]): CoachingCard | null {
  const eligible = cards.filter((c) => c.confidence >= CONFIG.MIN_CONFIDENCE_TO_EMIT);
  if (eligible.length === 0) return null;

  return eligible.sort(
    (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
  )[0];
}

// ─────────────────────────────────────────────────────────────
// Phase transition logic
// ─────────────────────────────────────────────────────────────

function detectPhaseTransition(session: LiveCallSession): LiveCallSession["phase"] | null {
  const { phase, discovery, objections } = session;

  if (phase === "rapport" && session.current_chunk_index >= 2) {
    return "discovery";
  }

  if (phase === "discovery" && discovery.depth_score >= 65 && discovery.emotional_impact_expressed) {
    return "deep_discovery";
  }

  if (phase === "deep_discovery" && discovery.depth_score >= 80) {
    return "positioning";
  }

  if ((phase === "discovery" || phase === "deep_discovery" || phase === "positioning") &&
    objections.raised.length > 0 &&
    objections.unresolved.length > 0) {
    return "handling";
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Supabase persistence helpers (delegates to typed db.ts)
// ─────────────────────────────────────────────────────────────

async function persistTranscriptChunk(
  callId: string,
  chunk: TranscriptChunk
): Promise<void> {
  await insertTranscriptChunk({
    call_id: callId,
    chunk_index: chunk.chunk_index,
    speaker: chunk.speaker,
    text: chunk.text,
    started_at_seconds: chunk.started_at_seconds ?? null,
    ended_at_seconds: chunk.ended_at_seconds ?? null,
    contains_objection: chunk.contains_objection,
    contains_buying_signal: chunk.contains_buying_signal,
    contains_emotional_shift: chunk.contains_emotional_shift,
  });
}

async function persistCoachingCard(card: CoachingCard): Promise<void> {
  await insertCoachingEvent({
    call_id: card.call_id,
    chunk_index: card.chunk_index,
    coaching_type: card.coaching_type,
    priority: card.priority,
    headline: card.headline,
    primary_action: card.primary_action,
    why: card.why ?? null,
    suggested_language: card.suggested_language ?? null,
    what_not_to_do: card.what_not_to_do ?? null,
    context_tags: card.context_tags,
    confidence: card.confidence,
    source_agent: card.source_agent,
  });
}

async function persistObjectionEvent(
  callId: string,
  chunk: TranscriptChunk,
  objOutput: import("../../types").ObjectionOutput
): Promise<void> {
  await insertObjectionEvent({
    call_id: callId,
    prospect_id: null,
    chunk_index: chunk.chunk_index,
    raw_text: objOutput.detected_objection,
    category: objOutput.category,
    hidden_meaning: objOutput.hidden_meaning,
    emotional_driver: objOutput.emotional_driver,
    reframe_recommended: objOutput.reframe_strategy.suggested_language,
    follow_up_question: objOutput.follow_up_question,
    resolution: null,
  });
}

async function persistAgentOutput(
  callId: string,
  agentName: string,
  chunkIndex: number,
  output: Record<string, unknown>,
  latencyMs: number,
  model: string,
  inputTokens?: number,
  outputTokens?: number
): Promise<void> {
  await insertAgentOutput({
    call_id: callId,
    agent_name: agentName,
    chunk_index: chunkIndex,
    input_tokens: inputTokens ?? null,
    output_tokens: outputTokens ?? null,
    latency_ms: latencyMs,
    model_used: model,
    output,
  });
}

// ─────────────────────────────────────────────────────────────
// Main orchestrator — process a transcript chunk
// ─────────────────────────────────────────────────────────────

export async function processTranscriptChunk(
  request: SubmitChunkRequest
): Promise<ChunkProcessingResult> {
  const totalStart = Date.now();

  // 1. Load session
  const session = await getSession(request.call_id);
  if (!session) {
    throw new Error(`Session not found: ${request.call_id}`);
  }

  // 2. Preprocess chunk (synchronous — no AI)
  const preprocessed = preprocessChunk(
    request.text,
    request.speaker,
    session.current_chunk_index,
    request.started_at_seconds
  );
  const chunk = preprocessed.chunk;

  // 3. Append chunk to session transcript
  session.transcript.push(chunk);
  session.current_chunk_index = chunk.chunk_index + 1;

  // 4. Detect phase transition
  const newPhase = detectPhaseTransition(session);
  if (newPhase && newPhase !== session.phase) {
    session.phase = newPhase;
  }

  // 5. Update discovery state from patterns (fast, no AI)
  session.discovery = updateDiscoveryState(session);

  // 6. Handle objection event registration
  if (preprocessed.should_trigger_objection_agent && chunk.speaker === "prospect") {
    const objEvent: ObjectionEvent = {
      id: generateCardId(),
      chunk_index: chunk.chunk_index,
      raw_text: chunk.text,
      category: (chunk.objection_keywords_found[0] ? "unknown" : "unknown") as ObjectionCategory,
      detected_at: Date.now(),
    };
    session.objections.raised.push(objEvent);
    if (!session.objections.unresolved.includes(chunk.text)) {
      session.objections.unresolved.push(chunk.text);
    }
  }

  // 7. Run fast-path agents IN PARALLEL
  const candidateCards: CoachingCard[] = [];

  // 7a. Buying signal — immediate critical card if detected
  if (preprocessed.should_trigger_buying_signal_alert) {
    const bsCard = buildBuyingSignalCard(session, chunk, chunk.buying_signal_keywords_found);
    candidateCards.push(bsCard);
  }

  // 7b. Run Discovery Agent + Objection Agent in parallel
  const [discoveryResult, objectionResult] = await Promise.allSettled([
    // Always run discovery
    runDiscoveryAgent(session),
    // Run objection agent only if objection detected
    preprocessed.should_trigger_objection_agent
      ? runObjectionIntelAgent(session, chunk.text, [])
      : Promise.resolve(null),
  ]);

  // Process discovery result
  if (discoveryResult.status === "fulfilled" && discoveryResult.value) {
    const dr = discoveryResult.value;
    session.agent_outputs.discovery = dr.output;
    // Update depth score in discovery state
    session.discovery.depth_score = Math.max(session.discovery.depth_score, dr.output.depth_score);

    const discoveryCard = buildDiscoveryCard(session, chunk, dr.output);
    candidateCards.push(discoveryCard);

    // Persist agent output async (don't await — fire and forget)
    persistAgentOutput(
      session.call_id, "discovery", chunk.chunk_index,
      dr.output as unknown as Record<string, unknown>,
      dr.latency_ms, dr.model, dr.input_tokens, dr.output_tokens
    ).catch(console.error);
  }

  // Process objection result
  if (
    objectionResult.status === "fulfilled" &&
    objectionResult.value !== null
  ) {
    const or = objectionResult.value;
    if (or) {
      session.agent_outputs.objection_intel = or.output;

      const objCard = buildObjectionCard(session, chunk, or.output);
      candidateCards.push(objCard);

      // Persist objection event
      persistObjectionEvent(session.call_id, chunk, or.output).catch(console.error);
      persistAgentOutput(
        session.call_id, "objection_intel", chunk.chunk_index,
        or.output as unknown as Record<string, unknown>,
        or.latency_ms, or.model, or.input_tokens, or.output_tokens
      ).catch(console.error);
    }
  }

  // 8. Select the best coaching card
  const bestCard = selectBestCard(candidateCards);

  // 9. Update session coaching state
  if (bestCard) {
    session.current_coaching = bestCard;
    session.coaching_history.push(bestCard);
    // Keep history bounded
    if (session.coaching_history.length > CONFIG.MAX_COACHING_HISTORY) {
      session.coaching_history = session.coaching_history.slice(-CONFIG.MAX_COACHING_HISTORY);
    }
  }

  // 10. Save session back to Redis
  await saveSession(session);

  // 11. Cache the latest coaching card separately for fast polling
  if (bestCard) {
    await saveLatestCoachingCard(session.call_id, bestCard);
  }

  // 12. Persist everything to Supabase (non-blocking where possible)
  persistTranscriptChunk(session.call_id, chunk).catch(console.error);
  if (bestCard) {
    persistCoachingCard(bestCard).catch(console.error);
  }

  const totalLatency = Date.now() - totalStart;

  return {
    call_id: session.call_id,
    chunk_index: chunk.chunk_index,
    coaching_card: bestCard,
    agent_outputs: session.agent_outputs,
    session_phase: session.phase,
    session_scores: session.scores,
    processing_time_ms: totalLatency,
  };
}
