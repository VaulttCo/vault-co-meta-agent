// Victoria — Orchestrator coaching card synthesis prompt
// Used when the orchestrator needs to synthesize multiple agent outputs
// into a single, prioritized coaching card.
// Server-side only.

import type { AnthropicTool } from "../anthropic";
import type { ConversationPhase, CoachingType } from "../types";

// ─────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────

export const ORCHESTRATOR_SYSTEM_PROMPT = `
You are Victoria — an elite AI sales director embedded in Vault Co's sales coaching system.

Your job is to synthesize intelligence from multiple analysis agents and deliver ONE clear, prioritized coaching action to the sales rep RIGHT NOW.

You are not a chatbot. You are a real-time coach sitting beside the rep.
The rep has 3-5 seconds to glance at your output. Make it count.

VAULT CO CONTEXT:
Vault Co sells a complete 60-Day Revenue System to roofing, construction, and home service businesses.
The system includes: Meta ads, CRM, automations, follow-up sequences, booked appointment tracking, reporting, and conversion optimization.
Investment: $3,000-$8,000/month. NOT a marketing agency — a complete revenue infrastructure.

COACHING CARD RULES:
1. ONE primary action per card — never give the rep multiple things to do
2. The headline must be scannable in 2 seconds
3. primary_action must be specific and immediately actionable
4. suggested_language is optional but powerful — give exact words when clarity matters
5. what_not_to_do is critical — reps often know WHAT to do but not what to AVOID
6. Priority = CRITICAL only for buying signals, deal-threatening objections, or rep errors that will lose the deal RIGHT NOW

PRIORITY DECISION RULES:
- CRITICAL: buying signal detected + rep should close | objection that will kill the deal | rep made a serious error
- HIGH: objection just raised | rep pitching without discovery | emotional shift detected
- NORMAL: next best discovery question | phase transition guidance
- BACKGROUND: performance notes, positioning refinements, long-term observations

PHASE RULES:
- rapport: Focus on building comfort. Suggest light situation questions.
- discovery: Guide toward deeper pain questions. Block premature pitching.
- deep_discovery: Push for financial/emotional impact. Make the pain vivid.
- positioning: Help rep frame Vault Co as a system, not an agency. Anchor on outcomes.
- handling: Objection territory. Guide reframe and recovery.
- closing: Help rep recognize close-readiness. Suggest trial close language.

OUTPUT: Strict JSON matching the tool schema. One card. Clear. Actionable. Right now.
`.trim();

// ─────────────────────────────────────────────────────────────
// Orchestrator synthesis tool
// ─────────────────────────────────────────────────────────────

export const ORCHESTRATOR_TOOL: AnthropicTool = {
  name: "generate_coaching_card",
  description:
    "Synthesize intelligence from Victoria's analysis agents into a single, prioritized coaching card for the sales rep. One clear action. Right now.",
  input_schema: {
    type: "object",
    properties: {
      priority: {
        type: "string" as const,
        enum: ["critical", "high", "normal", "background"],
        description: "Urgency of this coaching card",
      },
      coaching_type: {
        type: "string" as const,
        enum: [
          "next_question",
          "probe_deeper",
          "reframe_objection",
          "shut_up_listen",
          "buying_signal_detected",
          "danger_warning",
          "positioning_angle",
          "close_attempt",
          "rep_warning",
          "phase_transition",
        ] as CoachingType[],
        description: "The type of coaching this card provides",
      },
      headline: {
        type: "string" as const,
        description:
          "Short, scannable headline for the rep — what is happening right now. Max 12 words. Should feel urgent and directional.",
      },
      primary_action: {
        type: "string" as const,
        description:
          "The single most important thing the rep should do RIGHT NOW. Specific and actionable. Max 30 words.",
      },
      why: {
        type: "string" as const,
        description:
          "Brief reason why this action matters right now. Context for the rep. Max 20 words.",
      },
      suggested_language: {
        type: "string" as const,
        description:
          "Optional: Specific words the rep can use. Should sound natural, not scripted. Max 40 words. Omit if the primary action is behavioral (shut up, listen, etc.).",
      },
      what_not_to_do: {
        type: "string" as const,
        description:
          "The most important thing the rep must NOT do right now. Specific and direct. Max 25 words.",
      },
      context_tags: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "2-4 tags describing the coaching context (e.g. 'discovery', 'pain', 'objection', 'trust')",
        maxItems: 4,
      },
      confidence: {
        type: "number" as const,
        description: "Confidence in this coaching card (0.0 to 1.0). Below 0.6 = suppress the card.",
        minimum: 0,
        maximum: 1,
      },
      phase_recommendation: {
        type: "string" as const,
        description:
          "Optional: If the conversation phase should transition, state what and why. Max 20 words.",
      },
    },
    required: [
      "priority",
      "coaching_type",
      "headline",
      "primary_action",
      "why",
      "context_tags",
      "confidence",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// User message builder — synthesizes all agent outputs
// ─────────────────────────────────────────────────────────────

export function buildOrchestratorUserMessage(params: {
  current_phase: ConversationPhase;
  recent_transcript: string;
  discovery_output: string | null;
  objection_output: string | null;
  objection_just_raised: boolean;
  buying_signal_detected: boolean;
  buying_signal_keywords: string[];
  deal_risk_score: number;
  discovery_depth_score: number;
  rep_last_utterance: string;
}): string {
  const {
    current_phase,
    recent_transcript,
    discovery_output,
    objection_output,
    objection_just_raised,
    buying_signal_detected,
    buying_signal_keywords,
    deal_risk_score,
    discovery_depth_score,
    rep_last_utterance,
  } = params;

  const sections: string[] = [
    `CALL STATE:`,
    `Phase: ${current_phase}`,
    `Discovery Depth: ${discovery_depth_score}/100`,
    `Deal Risk: ${deal_risk_score}/100 (higher = more at risk)`,
  ];

  if (objection_just_raised) {
    sections.push(`\n⚠️ OBJECTION JUST DETECTED — This is the highest priority.`);
  }

  if (buying_signal_detected) {
    sections.push(`\n🟢 BUYING SIGNAL DETECTED: "${buying_signal_keywords.join(", ")}" — Consider trial close.`);
  }

  sections.push(`\nREP'S LAST STATEMENT:\n"${rep_last_utterance}"`);
  sections.push(`\nRECENT TRANSCRIPT:\n${recent_transcript}`);

  if (objection_output) {
    sections.push(`\nOBJECTION ANALYSIS:\n${objection_output}`);
  }

  if (discovery_output) {
    sections.push(`\nDISCOVERY ANALYSIS:\n${discovery_output}`);
  }

  sections.push(`\nTASK: Given everything above, what is the single most important coaching action for the rep RIGHT NOW? Synthesize all inputs into one clear coaching card.`);

  return sections.join("\n");
}
