// Victoria — Deal Risk Agent
// Scores the deal across 6 dimensions on every 3rd chunk.
// Uses Haiku for speed — latency is critical here.
// Server-side only.

import { callAnthropicTool, isAnthropicAvailable, VICTORIA_MODELS } from "../../anthropic";
import {
  DEAL_RISK_SYSTEM_PROMPT,
  DEAL_RISK_TOOL,
  buildDealRiskUserMessage,
} from "../../prompts/deal-risk";
import type { LiveCallSession, DealRiskOutput } from "../../types";

// ─────────────────────────────────────────────────────────────
// Agent result type
// ─────────────────────────────────────────────────────────────

export interface DealRiskAgentResult {
  output: DealRiskOutput;
  latency_ms: number;
  model: string;
  mock_mode: boolean;
  input_tokens?: number;
  output_tokens?: number;
}

// ─────────────────────────────────────────────────────────────
// Mock output — used when Anthropic is not configured
// ─────────────────────────────────────────────────────────────

function generateMockDealRisk(session: LiveCallSession): DealRiskOutput {
  const { discovery, objections, phase, prospect } = session;

  const painScore = discovery.main_pain_stated
    ? discovery.financial_impact_quantified ? 55 : 35
    : 15;
  const urgencyScore = discovery.timeline_urgency_present ? 50 : 20;
  const trustBase = phase === "rapport" ? 28 : phase === "discovery" ? 35 : 45;
  const engagementBase = prospect.emotional_state === "open_engaged" ? 55
    : prospect.emotional_state === "excited" ? 70
    : prospect.emotional_state === "hesitant" || prospect.emotional_state === "skeptical" ? 30
    : 40;

  const overall = Math.round(
    painScore * 0.25 + trustBase * 0.20 + urgencyScore * 0.20 +
    50 * 0.15 + 50 * 0.10 + engagementBase * 0.10
  );

  const hasActiveObjection = objections.unresolved.length > 0;

  const recommendation: DealRiskOutput["recommendation"] =
    hasActiveObjection ? "address_objection"
    : painScore < 35 ? "continue_discovery"
    : painScore < 55 ? "deepen_pain"
    : overall > 80 ? "attempt_close"
    : overall > 65 ? "position_now"
    : "continue_discovery";

  const missingConditions: string[] = [];
  if (!discovery.main_pain_stated) missingConditions.push("Clear pain articulated by prospect");
  if (!discovery.financial_impact_quantified) missingConditions.push("Financial impact quantified");
  if (!discovery.emotional_impact_expressed) missingConditions.push("Emotional impact connected");
  if (!discovery.ideal_outcome_stated) missingConditions.push("Desired outcome stated");
  if (!discovery.timeline_urgency_present) missingConditions.push("Timeline / urgency established");

  const biggestRisk = !discovery.main_pain_stated
    ? "Pain not established — prospect has no felt reason to buy"
    : hasActiveObjection
    ? `Unresolved objection is blocking progress`
    : !discovery.financial_impact_quantified
    ? "No financial stake — prospect not emotionally invested in solving this"
    : urgencyScore < 30
    ? "No urgency — prospect has no reason to act now vs. 6 months from now"
    : "Discovery adequate — risk is manageable";

  const advice = recommendation === "continue_discovery"
    ? "Ask: 'What's the biggest challenge with your current lead flow right now?'"
    : recommendation === "deepen_pain"
    ? "Ask: 'If that doesn't change, what does that cost you over the next 12 months?'"
    : recommendation === "address_objection"
    ? "Acknowledge the objection before doing anything else — don't push past it"
    : recommendation === "position_now"
    ? "Discovery is solid — you can now introduce how Vault Co solves this specifically for their situation"
    : recommendation === "attempt_close"
    ? "Ask a trial close: 'It sounds like you can see how this could work — what would need to be true for you to feel confident moving forward?'"
    : "Slow down and re-engage — ask an open question about what they are hoping for";

  return {
    overall_score: overall,
    scoring_breakdown: {
      trust: { score: trustBase, evidence: `Phase: ${phase} — trust builds through conversation` },
      urgency: { score: urgencyScore, evidence: discovery.timeline_urgency_present ? "Timeline signal detected" : "No urgency signals in transcript" },
      pain_clarity: { score: painScore, evidence: discovery.main_pain_stated ? "Pain stated" + (discovery.financial_impact_quantified ? " and quantified" : " but not quantified") : "No clear pain established yet" },
      authority: { score: 55, evidence: "Authority not yet confirmed or denied" },
      budget_fit: { score: 50, evidence: "Budget not discussed" },
      engagement: { score: engagementBase, evidence: `Emotional state: ${prospect.emotional_state}` },
    },
    biggest_risk: biggestRisk,
    missing_close_conditions: missingConditions.slice(0, 4),
    recommendation,
    rep_tactical_advice: advice,
  };
}

// ─────────────────────────────────────────────────────────────
// Main agent runner
// ─────────────────────────────────────────────────────────────

export async function runDealRiskAgent(
  session: LiveCallSession
): Promise<DealRiskAgentResult> {
  const start = Date.now();

  if (!isAnthropicAvailable()) {
    return {
      output: generateMockDealRisk(session),
      latency_ms: Date.now() - start,
      model: "mock",
      mock_mode: true,
    };
  }

  const userMessage = buildDealRiskUserMessage(session);

  try {
    const result = await callAnthropicTool<DealRiskOutput>({
      model: VICTORIA_MODELS.DEAL_RISK,
      system: DEAL_RISK_SYSTEM_PROMPT,
      userMessage,
      tool: DEAL_RISK_TOOL,
      maxTokens: 900,
    });

    return {
      output: result.output,
      latency_ms: result.latency_ms,
      model: result.model,
      mock_mode: false,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
    };
  } catch (err) {
    console.error("[Victoria:DealRisk] Agent failed — using mock fallback:", err instanceof Error ? err.message : String(err));
    return {
      output: generateMockDealRisk(session),
      latency_ms: Date.now() - start,
      model: "mock-fallback",
      mock_mode: true,
    };
  }
}
