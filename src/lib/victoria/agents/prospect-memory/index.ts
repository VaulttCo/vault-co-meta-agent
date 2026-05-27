// Victoria — Prospect Memory Agent
// Handles pre-call briefing generation and post-call intelligence extraction.
// Uses Sonnet for both (quality matters more than speed here — not in the latency path).
// Server-side only.

import { callAnthropicTool, isAnthropicAvailable, VICTORIA_MODELS } from "../../anthropic";
import {
  PRE_CALL_BRIEFING_SYSTEM_PROMPT,
  PRE_CALL_BRIEFING_TOOL,
  buildPreCallBriefingUserMessage,
  POST_CALL_EXTRACTION_SYSTEM_PROMPT,
  POST_CALL_EXTRACTION_TOOL,
  buildPostCallExtractionUserMessage,
} from "../../prompts/memory";
import {
  loadProspectMemory,
  formatProspectMemoryForPrompt,
} from "../../memory/prospect-memory";
import {
  getProspect,
  updateProspect,
  insertProspectMemorySnapshot,
} from "../../db";
import type {
  LiveCallSession,
  PreCallBriefing,
  PostCallExtraction,
  VictoriaProspectRow,
} from "../../types";

// ─────────────────────────────────────────────────────────────
// Pre-call briefing
// ─────────────────────────────────────────────────────────────

function generateMockBriefing(prospect: VictoriaProspectRow): PreCallBriefing {
  const isFirstCall = prospect.total_calls === 0;
  return {
    prospect_summary: isFirstCall
      ? `${prospect.name} at ${prospect.company ?? "their company"} is a ${prospect.vertical ?? "contractor"} owner with no prior call history. Approach as a warm introduction — focus on establishing trust and understanding their situation before any positioning.`
      : `${prospect.name} at ${prospect.company} is a returning prospect with ${prospect.total_calls} prior call(s). Known pain points include inconsistent lead flow. Approach with continuity — reference the prior conversation.`,
    key_pain_points: prospect.known_pain_points.length > 0
      ? prospect.known_pain_points
      : ["Lead flow inconsistency (to be confirmed)", "Revenue predictability concerns"],
    known_objections: prospect.known_objections.length > 0
      ? prospect.known_objections
      : isFirstCall ? [] : ["Unknown — review prior call recording"],
    recommended_approach: isFirstCall
      ? "Open with a situational question about their current lead flow and how this season has been. Do not pitch. Build trust first."
      : `Continue from the prior conversation. Re-establish pain before introducing any new positioning. Ask what's changed since the last call.`,
    opening_question: isFirstCall
      ? `${prospect.name}, how's the season been treating you so far — is lead flow where you need it to be heading into this stretch?`
      : `${prospect.name}, good to connect again — since we last spoke, how have things been going on the leads and revenue side?`,
    things_to_avoid: [
      "Pitching before pain is re-established",
      "Mentioning price until value is clear",
      prospect.known_resistances.length > 0 ? `These specific triggers: ${prospect.known_resistances.join(", ")}` : "Generic agency promises without specifics",
    ].filter(Boolean),
    prior_call_context: prospect.total_calls > 0
      ? `${prospect.total_calls} prior call(s). Last stage: ${prospect.deal_stage}. ${prospect.next_step ? `Agreed next step: ${prospect.next_step}` : "No specific next step noted."}`
      : null,
    urgency_assessment: `Urgency level: ${prospect.urgency_level}. ${
      prospect.urgency_level === "urgent" ? "Push for a decision this call." :
      prospect.urgency_level === "high" ? "Create urgency around their busy season or competitive timing." :
      prospect.urgency_level === "medium" ? "Build urgency through pain deepening — it's not there naturally yet." :
      "Urgency not established — focus on deepening the cost of inaction."
    }`,
  };
}

export async function generatePreCallBriefing(
  prospectId: string
): Promise<{ briefing: PreCallBriefing; prospect: VictoriaProspectRow } | null> {
  const memory = await loadProspectMemory(prospectId);
  if (!memory) return null;

  if (!isAnthropicAvailable()) {
    return {
      briefing: generateMockBriefing(memory.prospect),
      prospect: memory.prospect,
    };
  }

  const userMessage = buildPreCallBriefingUserMessage(
    memory.prospect,
    memory.recent_calls_summary
  );

  try {
    const result = await callAnthropicTool<PreCallBriefing>({
      model: VICTORIA_MODELS.DISCOVERY,
      system: PRE_CALL_BRIEFING_SYSTEM_PROMPT,
      userMessage,
      tool: PRE_CALL_BRIEFING_TOOL,
      maxTokens: 1200,
    });
    return { briefing: result.output, prospect: memory.prospect };
  } catch (err) {
    console.error("[Victoria:MemoryAgent] Briefing generation failed:", err instanceof Error ? err.message : String(err));
    return {
      briefing: generateMockBriefing(memory.prospect),
      prospect: memory.prospect,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Post-call extraction
// Runs after session ends. Updates prospect profile in DB.
// ─────────────────────────────────────────────────────────────

function generateMockExtraction(session: LiveCallSession): PostCallExtraction {
  const transcript = session.transcript;
  const prospectChunks = transcript.filter(c => c.speaker === "prospect").map(c => c.text);
  const objectionCategories = [...new Set(session.objections.raised.map(o => o.category))];

  return {
    new_pain_points: session.discovery.main_pain_stated
      ? ["Inconsistent lead flow mentioned during call"]
      : [],
    new_objections: objectionCategories.map(c => `${c} objection raised during call`),
    buying_signals_detected: session.transcript
      .filter(c => c.contains_buying_signal)
      .map(c => c.text.slice(0, 80)),
    emotional_journey: `Started ${session.transcript[0] ? "engaged" : "unknown"}, ended ${session.prospect.emotional_state}. ${session.scores.emotional_engagement > 50 ? "Good engagement level." : "Engagement was below target."}`,
    personality_notes: prospectChunks.length > 3
      ? "Responded with substantive answers — appears comfortable with discovery questions."
      : "Short answers — may be guarded or pressed for time.",
    decision_process_learned: null,
    urgency_level: session.discovery.timeline_urgency_present ? "high" : "medium",
    deal_stage: session.phase === "closing" ? "negotiation"
      : session.phase === "positioning" ? "discovery_complete"
      : "discovery",
    next_step: "Follow up within 48 hours — reference the specific pain points discussed.",
    next_call_briefing: `${session.prospect.name} had a ${Math.round((Date.now() - session.started_at) / 60000)}-minute conversation. Phase reached: ${session.phase}. ${session.scores.close_readiness > 60 ? "Strong close readiness — lead with ROI math next call." : "Discovery incomplete — focus on deepening pain and financial impact."}`,
    crm_notes: `Call with ${session.prospect.name} at ${session.prospect.company}. Duration: ~${Math.round((Date.now() - session.started_at) / 60000)} min. Phase: ${session.phase}. ${session.objections.raised.length > 0 ? `Objections: ${objectionCategories.join(", ")}.` : "No objections raised."} Close readiness: ${session.scores.close_readiness}/100. Follow-up required.`,
  };
}

export async function extractPostCallMemory(
  session: LiveCallSession,
  prospectId: string
): Promise<PostCallExtraction> {
  const start = Date.now();
  const prospect = await getProspect(prospectId);

  const transcriptText = session.transcript
    .slice(-25) // Last 25 chunks — enough for extraction without token bloat
    .map(c => `${c.speaker.toUpperCase()}: ${c.text}`)
    .join("\n");

  const coachingHighlights = session.coaching_history
    .slice(-8)
    .map(c => `• [${c.priority}] ${c.headline}`);

  let extraction: PostCallExtraction;

  if (!isAnthropicAvailable()) {
    extraction = generateMockExtraction(session);
  } else {
    try {
      const result = await callAnthropicTool<PostCallExtraction>({
        model: VICTORIA_MODELS.DISCOVERY,
        system: POST_CALL_EXTRACTION_SYSTEM_PROMPT,
        userMessage: buildPostCallExtractionUserMessage(
          session.prospect.name,
          session.prospect.vertical,
          transcriptText,
          coachingHighlights,
          session.full_transcript_summary
        ),
        tool: POST_CALL_EXTRACTION_TOOL,
        maxTokens: 1400,
      });
      extraction = result.output;
    } catch (err) {
      console.error("[Victoria:MemoryAgent] Post-call extraction failed:", err instanceof Error ? err.message : String(err));
      extraction = generateMockExtraction(session);
    }
  }

  // Update prospect profile — merge new intelligence
  if (prospect) {
    const mergedPain = [
      ...new Set([...prospect.known_pain_points, ...extraction.new_pain_points])
    ].slice(0, 10);

    const mergedObjections = [
      ...new Set([...prospect.known_objections, ...extraction.new_objections])
    ].slice(0, 10);

    const buyingSignalTriggers = extraction.buying_signals_detected
      .map(s => s.slice(0, 60));

    await updateProspect(prospectId, {
      known_pain_points: mergedPain,
      known_objections: mergedObjections,
      known_triggers: [...new Set([...prospect.known_triggers, ...buyingSignalTriggers])].slice(0, 8),
      deal_stage: extraction.deal_stage,
      next_step: extraction.next_step,
      urgency_level: extraction.urgency_level,
      last_contact: new Date().toISOString(),
      total_calls: (prospect.total_calls ?? 0) + 1,
      ...(extraction.personality_notes && !prospect.personality_type
        ? { personality_type: extraction.personality_notes.slice(0, 100) }
        : {}),
      ...(extraction.decision_process_learned && !prospect.communication_style
        ? { communication_style: extraction.decision_process_learned.slice(0, 100) }
        : {}),
    });
  }

  // Save full snapshot for next briefing
  await insertProspectMemorySnapshot(
    prospectId,
    session.call_id,
    extraction as unknown as Record<string, unknown>
  );

  console.log(`[Victoria:MemoryAgent] Post-call extraction completed in ${Date.now() - start}ms`);
  return extraction;
}

// ─────────────────────────────────────────────────────────────
// Inject prospect memory context into a prompt string
// ─────────────────────────────────────────────────────────────

export async function getProspectContextForSession(
  prospectId: string
): Promise<string | null> {
  const memory = await loadProspectMemory(prospectId);
  if (!memory) return null;
  if (memory.prospect.total_calls === 0) return null; // First call — nothing to inject

  const text = formatProspectMemoryForPrompt(memory);
  return text.length > 20 ? text : null;
}
