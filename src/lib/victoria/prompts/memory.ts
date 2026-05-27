// Victoria — Prospect Memory Agent Prompts
// Server-side only. Two prompts: pre-call briefing + post-call extraction.

import type { AnthropicTool } from "../anthropic";
import type { VictoriaProspectRow } from "../types";

// ─────────────────────────────────────────────────────────────
// PRE-CALL BRIEFING
// ─────────────────────────────────────────────────────────────

export const PRE_CALL_BRIEFING_SYSTEM_PROMPT = `You are Victoria's Pre-Call Intelligence Agent for Vault Co sales calls.

Given a prospect's history, generate a concise, actionable pre-call briefing for the sales rep.

RULES:
- Be specific. Generic advice is worthless.
- Only state what we actually know — do not invent information.
- Write for a rep who has 2 minutes before dialing.
- The opening_question must be designed to immediately rebuild rapport and re-anchor pain.
- things_to_avoid must be specific to THIS prospect (not generic sales tips).
- If this is a first call, note that in prior_call_context.

VAULT CO CONTEXT:
Vault Co is a 60-Day Revenue System for contractors — not a marketing agency.
Investment: $3,000–$8,000/month. Commitment-based. One client per market.
The prospect needs to see ROI math before committing, not features.`.trim();

export const PRE_CALL_BRIEFING_TOOL: AnthropicTool = {
  name: "generate_pre_call_briefing",
  description: "Generate a concise, actionable pre-call briefing for the sales rep based on prospect history.",
  input_schema: {
    type: "object",
    properties: {
      prospect_summary: {
        type: "string",
        description: "2-3 sentence executive summary of who this prospect is, where they stand, and what matters most. Specific to this person.",
      },
      key_pain_points: {
        type: "array",
        items: { type: "string" },
        description: "Specific pain points already established in prior calls. What hurts them most.",
      },
      known_objections: {
        type: "array",
        items: { type: "string" },
        description: "Objections they've raised before, with context on how they were received.",
      },
      recommended_approach: {
        type: "string",
        description: "Specific strategic recommendation for this call based on where we left off. 2-3 sentences.",
      },
      opening_question: {
        type: "string",
        description: "The single best opening question to ask THIS prospect — designed to rebuild rapport and re-anchor pain immediately.",
      },
      things_to_avoid: {
        type: "array",
        items: { type: "string" },
        description: "Specific things to NOT say or do with this prospect based on their history and personality.",
      },
      prior_call_context: {
        type: "string",
        description: "What happened in the last call — what was agreed, where things stood, what to follow up on.",
      },
      urgency_assessment: {
        type: "string",
        description: "Assessment of how urgently this prospect needs to solve their problem, based on known context.",
      },
    },
    required: [
      "prospect_summary",
      "key_pain_points",
      "known_objections",
      "recommended_approach",
      "opening_question",
      "things_to_avoid",
      "urgency_assessment",
    ],
  },
};

export function buildPreCallBriefingUserMessage(
  prospect: VictoriaProspectRow,
  recentCallsSummary: string
): string {
  return `Generate a pre-call briefing for:

PROSPECT: ${prospect.name} | ${prospect.company ?? "unknown company"} | ${prospect.vertical ?? "contractor"}
Business size: ${prospect.business_size ?? "unknown"}
Deal stage: ${prospect.deal_stage} | Urgency: ${prospect.urgency_level}
Total prior calls: ${prospect.total_calls}
Last contact: ${prospect.last_contact ?? "none recorded"}

KNOWN INTELLIGENCE:
Pain points: ${prospect.known_pain_points.join(", ") || "none yet — first call"}
Objections raised: ${prospect.known_objections.join(", ") || "none yet"}
Personality type: ${prospect.personality_type ?? "unknown"}
Communication style: ${prospect.communication_style ?? "unknown"}
Primary fear: ${prospect.primary_fear ?? "unknown"}
Primary desire: ${prospect.primary_desire ?? "unknown"}
Known resistances: ${prospect.known_resistances.join(", ") || "none"}
Known triggers: ${prospect.known_triggers.join(", ") || "none"}
Next step noted: ${prospect.next_step ?? "none"}

CALL HISTORY:
${recentCallsSummary || "No prior calls — this is the first conversation."}

Generate the briefing. Be specific to this prospect.`;
}

// ─────────────────────────────────────────────────────────────
// POST-CALL EXTRACTION
// ─────────────────────────────────────────────────────────────

export const POST_CALL_EXTRACTION_SYSTEM_PROMPT = `You are Victoria's Memory Extraction Agent for Vault Co.

After every sales call, you extract intelligence from the transcript to update the prospect's profile for future calls.

EXTRACTION RULES:
- Only extract what was explicitly said or clearly demonstrated during THIS call.
- Do not repeat intelligence already known from prior calls (it will be merged separately).
- Pain points must be specific — not "inconsistent leads" but "they said they had 3 idle crews in July".
- Objections must include the exact framing the prospect used.
- Personality notes: observe HOW they communicate, not just WHAT they said.
- urgency_level: assess based on actual signals — how soon they need a solution, budget availability, season timing.
- next_call_briefing: write for the rep as if they're a different person who knows nothing about this call.
- crm_notes: one paragraph, factual, suitable for a CRM activity log.`.trim();

export const POST_CALL_EXTRACTION_TOOL: AnthropicTool = {
  name: "extract_post_call_memory",
  description: "Extract sales intelligence from a completed call transcript to update the prospect's permanent profile.",
  input_schema: {
    type: "object",
    properties: {
      new_pain_points: {
        type: "array",
        items: { type: "string" },
        description: "Specific, concrete pain points revealed during this call. Use their exact language where possible.",
      },
      new_objections: {
        type: "array",
        items: { type: "string" },
        description: "Objections raised during this call with the context — e.g. 'Price: said $5k/month is too much when he's paying $1k now for HomeAdvisor'.",
      },
      buying_signals_detected: {
        type: "array",
        items: { type: "string" },
        description: "Positive buying signals or moments of engagement — specific quotes or behaviors.",
      },
      emotional_journey: {
        type: "string",
        description: "How the prospect's emotional state changed during the call — from what to what, and what caused the shift.",
      },
      personality_notes: {
        type: "string",
        description: "Observations about HOW this person communicates, makes decisions, and responds to sales approaches.",
      },
      decision_process_learned: {
        type: "string",
        description: "What we learned about their decision-making process — who else is involved, how they evaluate options. Null if nothing new learned.",
      },
      urgency_level: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
      },
      deal_stage: {
        type: "string",
        description: "Updated deal stage based on this call — e.g. 'prospect', 'discovery_complete', 'proposal_sent', 'negotiation', 'closed', 'lost'.",
      },
      next_step: {
        type: "string",
        description: "The exact next step agreed upon or recommended — specific and actionable.",
      },
      next_call_briefing: {
        type: "string",
        description: "A 3-4 sentence briefing for the rep before the next call — context, where we left off, and the best opening move.",
      },
      crm_notes: {
        type: "string",
        description: "One paragraph CRM activity note — factual, professional, captures what happened and what comes next.",
      },
    },
    required: [
      "new_pain_points",
      "new_objections",
      "buying_signals_detected",
      "emotional_journey",
      "personality_notes",
      "urgency_level",
      "deal_stage",
      "next_step",
      "next_call_briefing",
      "crm_notes",
    ],
  },
};

export function buildPostCallExtractionUserMessage(
  prospectName: string,
  prospectVertical: string,
  transcriptText: string,
  coachingHighlights: string[],
  sessionSummary: string
): string {
  return `Extract post-call memory for:
Prospect: ${prospectName} | ${prospectVertical}

COACHING HIGHLIGHTS FROM THIS CALL:
${coachingHighlights.length > 0 ? coachingHighlights.join("\n") : "None generated"}

CALL SUMMARY (if available):
${sessionSummary || "No summary available"}

TRANSCRIPT (last 25 exchanges):
${transcriptText}

Extract all useful intelligence from this call for the prospect's permanent profile.`;
}
