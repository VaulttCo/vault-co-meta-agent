// Vault Core — Vanessa's Priority Engine (Phase 5). Pure, deterministic.
//
// Scores a recommendation across business/revenue impact, urgency, confidence,
// influence, risk, cross-agent support, and human-review need, then maps it to
// an executive priority level. Vanessa surfaces what matters — not everything.

import type { VaultRecommendationRow, VanessaPriority } from "../../types";

export const PRIORITY_ORDER: Record<VanessaPriority, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  watch: 1,
};

export interface ScoredPriority {
  level: VanessaPriority;
  score: number;       // 0..1 composite
  reason: string;
}

function confidenceOf(r: VaultRecommendationRow): number {
  const c = (r.metadata as { confidence?: number } | undefined)?.confidence;
  return typeof c === "number" ? c : r.influence_score;
}

function isJoint(r: VaultRecommendationRow): boolean {
  return !!(r.metadata as { joint?: boolean } | undefined)?.joint;
}

export function scorePriority(r: VaultRecommendationRow): ScoredPriority {
  const reasons: string[] = [];

  let score = 0;
  // Priority + influence are the backbone.
  score += r.priority_score * 0.4;
  score += r.influence_score * 0.2;
  const conf = confidenceOf(r);
  score += conf * 0.15;

  // Financial/payment risk carries weight (Valerie).
  const isFinancial = r.agent === "valerie";
  if (isFinancial && r.revenue_impact && /risk|past|unpaid|open/i.test(`${r.title} ${r.revenue_impact}`)) {
    score += 0.15;
    reasons.push("financial risk with revenue exposure");
  } else if (r.revenue_impact) {
    score += 0.08;
    reasons.push("quantified revenue impact");
  }

  // Cross-agent (joint) recommendations are validated across departments.
  if (isJoint(r)) {
    score += 0.1;
    reasons.push("cross-agent validated");
  }

  // Still awaiting a human decision = needs surfacing.
  if (r.status === "pending_review") {
    score += 0.05;
    reasons.push("awaiting human review");
  }

  if (r.priority_score >= 0.8) reasons.push("high agent priority");
  if (conf >= 0.8) reasons.push("high confidence");

  score = Math.min(1, score);

  let level: VanessaPriority;
  if (score >= 0.85) level = "critical";
  else if (score >= 0.7) level = "high";
  else if (score >= 0.5) level = "medium";
  else if (score >= 0.35) level = "low";
  else level = "watch";

  const reason = reasons.length ? reasons.join(" · ") : "baseline priority";
  return { level, score, reason };
}

// Sort recommendations by executive priority (desc), then composite score.
export function rankByPriority(recs: VaultRecommendationRow[]): Array<{ rec: VaultRecommendationRow; scored: ScoredPriority }> {
  return recs
    .map((rec) => ({ rec, scored: scorePriority(rec) }))
    .sort(
      (a, b) =>
        PRIORITY_ORDER[b.scored.level] - PRIORITY_ORDER[a.scored.level] ||
        b.scored.score - a.scored.score
    );
}
