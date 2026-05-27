// Victoria — Discovery Agent
// The most important agent. Runs on every transcript chunk.
// Detects shallow discovery, recommends next questions, warns against premature pitching.
// Server-side only.

import { callAnthropicTool, isAnthropicAvailable, VICTORIA_MODELS } from "../../anthropic";
import {
  DISCOVERY_SYSTEM_PROMPT,
  DISCOVERY_TOOL,
  buildDiscoveryUserMessage,
} from "../../prompts/discovery";
import {
  buildFullTranscriptContext,
} from "../../signals/chunk-preprocessor";
import type {
  LiveCallSession,
  DiscoveryOutput,
  DiscoveryState,
} from "../../types";

// ─────────────────────────────────────────────────────────────
// Discovery state updater
// Scans the transcript to update known discovery facts.
// Pure function — no AI calls, no I/O.
// ─────────────────────────────────────────────────────────────

const SITUATION_PATTERNS = {
  current_marketing_spend_known: [
    /\$[\d,]+.*(?:month|mo|week|year)/i,
    /spend(?:ing)?.*(?:on|for) (?:ads?|marketing)/i,
    /(?:ads?|marketing) budget/i,
    /how much (?:are you|do you) spend/i,
    /(\d+)k?\s*(?:a|per) (?:month|mo)/i,
  ],
  current_lead_sources_known: [
    /(?:leads?|customers?|jobs?) (?:from|through|via|come from)/i,
    /where (?:do|are) (?:your|the) leads?/i,
    /referrals?/i,
    /google|facebook|instagram|home\s*advisor|angi|thumbtack/i,
    /word of mouth/i,
  ],
  main_pain_stated: [
    /(?:inconsistent|unpredictable|slow|dry|not enough) (?:leads?|work|jobs?|revenue)/i,
    /struggle(?:ing)? (?:to|with)/i,
    /problem(?:s)?|challenge(?:s)?|issue(?:s)?|frustrat/i,
    /can'?t (?:find|get|scale|grow|afford)/i,
    /not (?:enough|getting|making)/i,
    /too (?:slow|slow|quiet)/i,
  ],
  financial_impact_quantified: [
    /(?:cost|losing|costing|miss(?:ing)?)\s*\$[\d,]+/i,
    /\$[\d,]+\s*(?:a|per)\s*(?:month|year|week)\s*(?:in|of|on)/i,
    /revenue (?:is|was|dropped|down|lost)/i,
    /how much.*(?:cost|lose|losing|miss)/i,
  ],
  emotional_impact_expressed: [
    /stress(?:ed|ful|ing)?/i,
    /frustrat(?:ed|ing|ion)/i,
    /worried|anxious|nervous|scared/i,
    /tired of|fed up|done with|sick of/i,
    /keep(?:s)? me up/i,
    /can'?t sleep/i,
    /overwhelm/i,
  ],
  ideal_outcome_stated: [
    /(?:want|need|looking for|hoping for|goal is|trying to)/i,
    /(?:would love|dream|wish|ideal)/i,
    /if (?:we|i) could/i,
    /what (?:i|we) (?:really )?(?:want|need)/i,
  ],
  timeline_urgency_present: [
    /asap|urgently|right away|as soon as/i,
    /(?:by|before|in) (?:\d+ )?(?:weeks?|months?|days?|Q[1-4])/i,
    /slow season coming/i,
    /busy season (?:starts?|coming|approaching)/i,
    /this (?:year|season|month|quarter)/i,
  ],
};

export function updateDiscoveryState(
  session: LiveCallSession
): DiscoveryState {
  const state = { ...session.discovery };
  const fullText = session.transcript
    .filter((c) => c.speaker === "prospect")
    .map((c) => c.text)
    .join(" ");

  // Run pattern matching against all prospect speech
  for (const [field, patterns] of Object.entries(SITUATION_PATTERNS)) {
    if (!(field in state)) continue;
    const key = field as keyof typeof SITUATION_PATTERNS;
    if ((state as Record<string, unknown>)[key] === true) continue; // Already known — don't downgrade

    for (const pattern of patterns) {
      if (pattern.test(fullText)) {
        (state as Record<string, unknown>)[key] = true;
        break;
      }
    }
  }

  // Recalculate depth_score
  const scoreFactors = [
    [state.current_marketing_spend_known, 8],
    [state.current_lead_sources_known, 8],
    [state.main_pain_stated, 20],
    [state.pain_specificity === "specific", 8],
    [state.pain_specificity === "vivid", 16],
    [state.financial_impact_quantified, 20],
    [state.emotional_impact_expressed, 15],
    [state.operational_impact_stated, 10],
    [state.ideal_outcome_stated, 10],
    [state.timeline_urgency_present, 8],
    [state.decision_process_known, 5],
  ] as [boolean, number][];

  const raw = scoreFactors.reduce(
    (sum, [cond, points]) => sum + (cond ? points : 0),
    0
  );
  state.depth_score = Math.min(100, raw);

  // Update depth_rating
  if (state.depth_score < 30) state.depth_rating = "shallow";
  else if (state.depth_score < 65) state.depth_rating = "moderate";
  else state.depth_rating = "deep";

  return state;
}

// ─────────────────────────────────────────────────────────────
// Discovery Agent mock output (when Anthropic not configured)
// ─────────────────────────────────────────────────────────────

function generateMockDiscoveryOutput(session: LiveCallSession): DiscoveryOutput {
  const { discovery } = session;

  const missingAreas = [];

  if (!discovery.main_pain_stated) {
    missingAreas.push({
      area: "Primary pain point",
      importance: "critical" as const,
      suggested_probe: "What's the biggest challenge with your current lead flow right now?",
    });
  }
  if (!discovery.financial_impact_quantified) {
    missingAreas.push({
      area: "Financial impact",
      importance: "critical" as const,
      suggested_probe: "If you had a slow month with no new jobs — what does that cost you?",
    });
  }
  if (!discovery.emotional_impact_expressed) {
    missingAreas.push({
      area: "Emotional/personal impact",
      importance: "high" as const,
      suggested_probe: "Beyond the numbers — how does that inconsistency affect you personally?",
    });
  }

  const isTooEarly = discovery.depth_score < 40 && session.transcript.some(
    (c) => c.speaker === "rep" && /our system|we offer|vault co|what we do|let me tell/i.test(c.text)
  );

  return {
    assessment: discovery.depth_rating === "shallow" ? "incomplete" : "shallow",
    next_best_question: missingAreas[0]?.suggested_probe ?? "What does a great month look like for you revenue-wise?",
    question_framework: "NEPQ",
    why_this_question: "Establishes financial baseline — needed before positioning",
    missing_areas: missingAreas.slice(0, 3),
    warning: isTooEarly
      ? {
          type: "pitching_too_early",
          message: "Discovery score is too low to pitch — pain not established",
          redirect: "Go back to asking about their current situation and what isn't working",
        }
      : undefined,
    pain_summary: discovery.main_pain_stated
      ? "Prospect has indicated lead flow challenges"
      : "No clear pain established yet",
    depth_score: discovery.depth_score,
  };
}

// ─────────────────────────────────────────────────────────────
// Main Discovery Agent runner
// ─────────────────────────────────────────────────────────────

export interface DiscoveryAgentResult {
  output: DiscoveryOutput;
  latency_ms: number;
  model: string;
  mock_mode: boolean;
  input_tokens?: number;
  output_tokens?: number;
}

export async function runDiscoveryAgent(
  session: LiveCallSession,
  options: { kb_context?: string; prospect_memory?: string } = {}
): Promise<DiscoveryAgentResult> {
  const start = Date.now();

  // Update discovery state from transcript patterns first (fast, no AI)
  const updatedDiscovery = updateDiscoveryState(session);
  const sessionWithUpdatedDiscovery: LiveCallSession = {
    ...session,
    discovery: updatedDiscovery,
  };

  // Fall back to mock if Anthropic isn't configured
  if (!isAnthropicAvailable()) {
    return {
      output: generateMockDiscoveryOutput(sessionWithUpdatedDiscovery),
      latency_ms: Date.now() - start,
      model: "mock",
      mock_mode: true,
    };
  }

  const transcriptContext = buildFullTranscriptContext(
    session.transcript,
    session.full_transcript_summary,
    6 // Last 6 chunks for discovery — needs more context
  );

  const userMessage = buildDiscoveryUserMessage({
    prospect_name: session.prospect.name,
    prospect_company: session.prospect.company,
    prospect_vertical: session.prospect.vertical,
    current_phase: session.phase,
    transcript_context: transcriptContext,
    discovery_state: updatedDiscovery,
    kb_context: options.kb_context,
    prospect_memory: options.prospect_memory,
  });

  try {
    const result = await callAnthropicTool<DiscoveryOutput>({
      model: VICTORIA_MODELS.DISCOVERY,
      system: DISCOVERY_SYSTEM_PROMPT,
      userMessage,
      tool: DISCOVERY_TOOL,
      maxTokens: 1200,
    });

    // Merge the AI depth score with our pattern-based score (take the higher — AI may see nuance)
    const mergedScore = Math.max(result.output.depth_score, updatedDiscovery.depth_score);
    result.output.depth_score = mergedScore;

    return {
      output: result.output,
      latency_ms: result.latency_ms,
      model: result.model,
      mock_mode: false,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
    };
  } catch (err) {
    console.error("[Victoria:Discovery] Agent failed — using mock fallback:", err instanceof Error ? err.message : String(err));
    return {
      output: generateMockDiscoveryOutput(sessionWithUpdatedDiscovery),
      latency_ms: Date.now() - start,
      model: "mock-fallback",
      mock_mode: true,
    };
  }
}
