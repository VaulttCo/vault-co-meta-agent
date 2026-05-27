// Victoria — Deal Risk Agent Prompts
// Server-side only. Haiku model — fast scoring, runs every 3 chunks.

import type { AnthropicTool } from "../anthropic";
import type { LiveCallSession } from "../types";
import { buildRecentTranscriptContext } from "../signals/chunk-preprocessor";

// ─────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────

export const DEAL_RISK_SYSTEM_PROMPT = `You are the Deal Risk Assessment Agent for Victoria AI Sales Coach.

Your job: score the current deal's close readiness across 6 dimensions and advise the rep on their next strategic move.

This intel is shown ONLY to the rep — never the prospect.

## Scoring dimensions (each 0–100, higher = better for the deal)

- trust: Does the prospect trust the rep and Vault Co? Are they open and honest in answers?
- urgency: How strongly does the prospect feel they need to solve this NOW vs. "someday"?
- pain_clarity: Has the prospect clearly articulated a specific, felt pain — not just a surface complaint?
- authority: Is this the actual decision maker? Can they say yes without consulting anyone else?
- budget_fit: Does Vault Co's pricing fit their business size and stated/implied budget?
- engagement: Is the prospect engaged, responsive, and invested in the conversation?

## Score interpretation
- 0–25: Critical gap — deal is at serious risk unless addressed
- 26–50: Weak — needs development before progressing
- 51–75: Moderate — solid but room to strengthen
- 76–100: Strong — leverage this and build on it

## overall_score calculation
Weight the dimensions: pain_clarity (25%) + trust (20%) + urgency (20%) + authority (15%) + budget_fit (10%) + engagement (10%)
Round to nearest integer. Cap between 0 and 100.

## Recommendation logic
- "continue_discovery" → pain_clarity < 40 or trust < 30 (not ready to advance)
- "deepen_pain" → pain stated but emotional/financial impact not established (pain_clarity 40–65)
- "address_objection" → active unresolved objection present in transcript
- "position_now" → overall_score > 65 and no active objections (safe to introduce Vault Co value)
- "attempt_close" → overall_score > 80 and ideal_outcome stated (go for it)
- "schedule_followup" → promising prospect but clearly not deciding today
- "rescue_call" → engagement < 25 or prospect is shutting down — change strategy now

## rep_tactical_advice
One concrete, specific sentence on what to do right now. Not general advice — specific to what just happened in this call.

## Rules
- Be calibrated. Early in a call, most scores will be 20–40 — that's correct, not a failure.
- Don't inflate scores. A rep seeing 85 trust after 3 exchanges has been misled.
- biggest_risk: The single most important weakness — what is most likely to kill this deal right now?
- missing_close_conditions: List only what's actually missing — don't list things already established.`;

// ─────────────────────────────────────────────────────────────
// Tool schema
// ─────────────────────────────────────────────────────────────

export const DEAL_RISK_TOOL: AnthropicTool = {
  name: "assess_deal_risk",
  description: "Score the current deal across 6 dimensions and recommend the rep's next strategic move.",
  input_schema: {
    type: "object",
    properties: {
      overall_score: {
        type: "number",
        description: "Weighted close readiness score 0–100. Higher = closer to closing.",
      },
      scoring_breakdown: {
        type: "object",
        properties: {
          trust:        { type: "object", properties: { score: { type: "number" }, evidence: { type: "string" } }, required: ["score", "evidence"] },
          urgency:      { type: "object", properties: { score: { type: "number" }, evidence: { type: "string" } }, required: ["score", "evidence"] },
          pain_clarity: { type: "object", properties: { score: { type: "number" }, evidence: { type: "string" } }, required: ["score", "evidence"] },
          authority:    { type: "object", properties: { score: { type: "number" }, evidence: { type: "string" } }, required: ["score", "evidence"] },
          budget_fit:   { type: "object", properties: { score: { type: "number" }, evidence: { type: "string" } }, required: ["score", "evidence"] },
          engagement:   { type: "object", properties: { score: { type: "number" }, evidence: { type: "string" } }, required: ["score", "evidence"] },
        },
        required: ["trust", "urgency", "pain_clarity", "authority", "budget_fit", "engagement"],
      },
      biggest_risk: {
        type: "string",
        description: "The single factor most likely to kill this deal right now.",
      },
      missing_close_conditions: {
        type: "array",
        items: { type: "string" },
        description: "What must be true before attempting a close.",
      },
      recommendation: {
        type: "string",
        enum: [
          "continue_discovery",
          "deepen_pain",
          "address_objection",
          "position_now",
          "attempt_close",
          "schedule_followup",
          "rescue_call",
        ],
      },
      rep_tactical_advice: {
        type: "string",
        description: "One specific, concrete action sentence for the rep to take right now.",
      },
    },
    required: [
      "overall_score",
      "scoring_breakdown",
      "biggest_risk",
      "missing_close_conditions",
      "recommendation",
      "rep_tactical_advice",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// User message builder
// ─────────────────────────────────────────────────────────────

export function buildDealRiskUserMessage(session: LiveCallSession): string {
  const { prospect, discovery, objections, scores, phase } = session;

  const recentContext = buildRecentTranscriptContext(session.transcript, 6);

  const objectionSummary = objections.raised.length > 0
    ? `Active objections: ${objections.unresolved.join(", ") || "none unresolved"}\nObjection categories: ${[...new Set(objections.raised.map(o => o.category))].join(", ")}`
    : "No objections detected yet.";

  const discoveryFacts = [
    discovery.main_pain_stated ? "✓ Pain stated" : "✗ Pain not established",
    discovery.financial_impact_quantified ? "✓ Financial impact quantified" : "✗ Financial impact unknown",
    discovery.emotional_impact_expressed ? "✓ Emotional impact expressed" : "✗ Emotional impact not expressed",
    discovery.ideal_outcome_stated ? "✓ Ideal outcome stated" : "✗ Desired outcome unknown",
    discovery.timeline_urgency_present ? "✓ Timeline/urgency present" : "✗ No urgency signal",
    discovery.decision_process_known ? "✓ Decision process known" : "✗ Decision process unknown",
  ].join("\n");

  return `## Call Context
Prospect: ${prospect.name} | Company: ${prospect.company} | Industry: ${prospect.vertical}
Current phase: ${phase}
Prior emotional state: ${prospect.emotional_state}
Business size: ${prospect.business_size ?? "unknown"}
Current marketing: ${prospect.current_marketing ?? "unknown"}

## Discovery State (depth score: ${discovery.depth_score}/100)
${discoveryFacts}

## Objection State
${objectionSummary}

## Current Session Scores (for reference — calibrate yours based on evidence)
Trust: ${scores.trust} | Urgency: ${scores.urgency} | Pain Depth: ${scores.pain_depth}
Authority: ${scores.authority} | Budget Fit: ${scores.budget_fit} | Deal Risk: ${scores.deal_risk}

## Recent Conversation (last 6 exchanges)
${recentContext}

Score this deal honestly. Provide your assessment.`;
}
