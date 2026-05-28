// Victoria — Rep Performance Agent System Prompt + Tool Schema
// Server-side only. Analyzes sales rep behavior during live calls.

import type { AnthropicTool } from "../anthropic";
import type { RepWarningType, ContractorVertical, ConversationPhase } from "../types";

// ─────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────

export const REP_PERFORMANCE_SYSTEM_PROMPT = `
You are Victoria's Rep Performance Intelligence Engine — the sales director layer of an elite AI coaching system for Vault Co.

YOUR PURPOSE:
Analyze the sales rep's behavior live during the call. You see every mistake. You see every missed opportunity. You see every moment the rep helps or hurts the deal. Your job is to give the rep precise, direct, real-time coaching — not encouragement, not general advice. SPECIFIC corrections.

WHAT YOU DETECT:

1. OVERTALKING
- Rep talks > 60% of words → warning. > 75% → critical.
- Rep monologuing for 3+ consecutive turns without prospect input
- Prospect can't get a word in

2. INTERRUPTING
- Rep answers before prospect finishes their thought
- Abrupt takeover — prospect sentence clearly unfinished
- Too-quick response that cuts off prospect's emotional expression

3. PREMATURE PITCHING
- Rep mentions Vault Co offer, system, process, or pricing before discovery depth is ≥ 50/100
- Explaining features before pain is established and felt
- Moving to positioning while discovery is still shallow

4. WEAK PROBING
- Accepting a surface-level answer without digging deeper
- "Oh interesting" then moving on — not following up on a pain signal
- Not asking "what does that mean for you financially?" after a problem is stated

5. MISSING EMOTIONAL SIGNALS
- Prospect expressed stress, frustration, fear, or overwhelm
- Rep acknowledged it generically or ignored it and moved on
- Emotional moments are doorways to the close — missing them is a deal-killer

6. OVEREXPLAINING
- Single rep turn > 100 words = overexplaining
- Feature dumping — listing capabilities without checking understanding
- Explaining what Vault Co does before understanding what the prospect actually needs

7. QUESTION STACKING
- Two or more questions in one turn
- Compound questions ("Do you use Google Ads and how much do you spend?")
- Prospect will always answer the easiest question — multiple questions dilute focus

8. POOR LISTENING
- Prospect gave a buying signal and rep kept pitching
- Prospect objected and rep didn't isolate it before trying to handle it
- Rep missed a key detail the prospect mentioned

POSITIVE OBSERVATIONS (when applicable):
- Good silence after asking a question
- Clean emotional acknowledgment before moving on
- Trial close attempt after buying signal
- Specific, targeted question that uncovered real pain
- Maintaining curiosity instead of pitching

VAULT CO CONTEXT:
- $3k-$8k/month investment — this is a significant contractor commitment
- Best reps talk 30-40% of the time. Prospect talks 60-70%.
- Discovery cannot be rushed. Pain must be vivid and quantified before positioning.
- One question at a time, always. Silence is power.
- These contractors are skeptical, busy, and direct. They respect directness.

OUTPUT: Strict JSON matching the tool schema. Be specific and direct. Do not soften feedback — be a demanding, honest coach who wants the rep to close this deal.
`.trim();

// ─────────────────────────────────────────────────────────────
// Tool schema
// ─────────────────────────────────────────────────────────────

export const REP_PERFORMANCE_TOOL: AnthropicTool = {
  name: "analyze_rep_performance",
  description:
    "Analyze the sales rep's performance and provide specific real-time coaching based on recent call transcript",
  input_schema: {
    type: "object",
    properties: {
      overall_performance: {
        type: "string" as const,
        enum: ["excellent", "good", "needs_improvement", "poor"],
        description: "Overall rep performance assessment for this segment of the call",
      },
      warnings: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            type: {
              type: "string" as const,
              enum: [
                "overtalking", "interrupting", "premature_pitching",
                "weak_probing", "missing_emotional_signal",
                "overexplaining", "question_stacking", "poor_listening",
              ] as RepWarningType[],
              description: "The type of rep behavior issue",
            },
            severity: {
              type: "string" as const,
              enum: ["critical", "high", "medium"],
              description: "How urgently this needs to be fixed",
            },
            message: {
              type: "string" as const,
              description: "What the rep did wrong. Direct and specific. Max 20 words.",
            },
            evidence: {
              type: "string" as const,
              description: "Quote or specific evidence from the transcript. Max 30 words.",
            },
            chunk_index: {
              type: "number" as const,
              description: "The transcript turn index where this occurred",
            },
            suggested_fix: {
              type: "string" as const,
              description: "Exact corrective action the rep can take RIGHT NOW. Max 25 words.",
            },
          },
          required: ["type", "severity", "message", "evidence", "chunk_index", "suggested_fix"],
        },
        description: "Rep behavior warnings, ordered by severity descending. Max 4.",
        maxItems: 4,
      },
      positive_observations: {
        type: "array" as const,
        items: {
          type: "string" as const,
          description: "A specific thing the rep did well. Max 15 words.",
        },
        description: "Things the rep did well in this segment. Omit if nothing notable. Max 3.",
        maxItems: 3,
      },
      coaching_priorities: {
        type: "array" as const,
        items: {
          type: "string" as const,
          description: "One actionable coaching point. Max 20 words.",
        },
        description: "What the rep must fix RIGHT NOW, most urgent first. Max 3.",
        maxItems: 3,
      },
      talk_ratio: {
        type: "object" as const,
        properties: {
          rep_percent: {
            type: "number" as const,
            description: "Estimated rep's share of words spoken (0-100)",
          },
          prospect_percent: {
            type: "number" as const,
            description: "Estimated prospect's share of words spoken (0-100)",
          },
        },
        required: ["rep_percent", "prospect_percent"],
        description: "Estimated talk ratio for this call segment",
      },
    },
    required: ["overall_performance", "warnings", "positive_observations", "coaching_priorities", "talk_ratio"],
  },
};

// ─────────────────────────────────────────────────────────────
// User message builder
// ─────────────────────────────────────────────────────────────

export function buildRepPerformanceUserMessage(params: {
  prospect_name: string;
  prospect_vertical: ContractorVertical;
  current_phase: ConversationPhase;
  discovery_depth: number;
  recent_transcript: string;
  rule_based_metrics: {
    talk_ratio: { rep_percent: number; prospect_percent: number };
    interruption_count: number;
    emotional_miss_count: number;
    premature_pitch_events: number;
    question_stacking_events: number;
    overexplaining_events: number;
    warnings: Array<{ type: string; message: string }>;
  };
}): string {
  const {
    prospect_name,
    prospect_vertical,
    current_phase,
    discovery_depth,
    recent_transcript,
    rule_based_metrics,
  } = params;

  const { talk_ratio, interruption_count, emotional_miss_count, premature_pitch_events, question_stacking_events, overexplaining_events } = rule_based_metrics;

  const detectedIssues = [
    interruption_count > 0 && `${interruption_count} potential interruption(s) detected`,
    emotional_miss_count > 0 && `${emotional_miss_count} emotional signal(s) not acknowledged`,
    premature_pitch_events > 0 && `${premature_pitch_events} premature pitch attempt(s) — discovery depth only ${discovery_depth}/100`,
    question_stacking_events > 0 && `${question_stacking_events} instance(s) of multiple questions in one turn`,
    overexplaining_events > 0 && `${overexplaining_events} overexplaining turn(s) detected`,
    talk_ratio.rep_percent > 60 && `Rep overtalking: ${talk_ratio.rep_percent}% of words`,
  ].filter(Boolean).join("\n");

  return `
CALL CONTEXT:
Prospect: ${prospect_name} (${prospect_vertical} business owner)
Phase: ${current_phase} | Discovery depth: ${discovery_depth}/100
Computed talk ratio: Rep ${talk_ratio.rep_percent}% / Prospect ${talk_ratio.prospect_percent}%

AUTOMATED DETECTOR ALERTS:
${detectedIssues || "No specific rule-based issues flagged"}

RECENT TRANSCRIPT (last 12 turns):
${recent_transcript}

TASK: Analyze what the rep is doing well and poorly in this conversation. Focus on the most recent behavior. What must the rep change RIGHT NOW to protect this deal? Be direct, specific, and demanding. Do not soften feedback.
`.trim();
}
