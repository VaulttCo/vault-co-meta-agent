// Victoria — Momentum Tracker
// Computes directional momentum per scored dimension.
// Compares current session scores against the previous confirmed reading.
// Server-side only.

import type { SessionScores, MomentumDirection, MomentumSnapshot } from "../types";

// Minimum point delta to register directional change.
// Smaller than this = noise, not signal.
const MOVEMENT_THRESHOLD = 6;

function direction(delta: number): MomentumDirection {
  if (delta > MOVEMENT_THRESHOLD) return "improving";
  if (delta < -MOVEMENT_THRESHOLD) return "declining";
  return "stable";
}

function overallDirection(dirs: MomentumDirection[]): MomentumDirection {
  const improving = dirs.filter((d) => d === "improving").length;
  const declining = dirs.filter((d) => d === "declining").length;
  if (improving >= 2 && improving > declining) return "improving";
  if (declining >= 2 && declining > improving) return "declining";
  return "stable";
}

/**
 * Compute momentum snapshot by diffing current scores against previous.
 * If prevScores is null (first deal-risk evaluation), everything is "stable".
 */
export function computeMomentum(
  prevScores: SessionScores | null,
  currentScores: SessionScores,
  chunkIndex: number
): MomentumSnapshot {
  if (!prevScores) {
    return {
      trust: "stable",
      urgency: "stable",
      pain_depth: "stable",
      engagement: "stable",
      close_readiness: "stable",
      overall: "stable",
      computed_at_chunk: chunkIndex,
    };
  }

  const dims: Omit<MomentumSnapshot, "overall" | "computed_at_chunk"> = {
    trust:          direction(currentScores.trust            - prevScores.trust),
    urgency:        direction(currentScores.urgency          - prevScores.urgency),
    pain_depth:     direction(currentScores.pain_depth       - prevScores.pain_depth),
    engagement:     direction(currentScores.emotional_engagement - prevScores.emotional_engagement),
    close_readiness: direction(currentScores.close_readiness - prevScores.close_readiness),
  };

  return {
    ...dims,
    overall: overallDirection(Object.values(dims)),
    computed_at_chunk: chunkIndex,
  };
}

/**
 * Human-readable arrow summary for coaching cards and timeline descriptions.
 * Example: "Trust ↑ · Urgency → · Engagement ↓ · Close ↑"
 */
export function momentumSummary(snap: MomentumSnapshot): string {
  const arrow = (d: MomentumDirection) =>
    d === "improving" ? "↑" : d === "declining" ? "↓" : "→";
  return [
    `Trust ${arrow(snap.trust)}`,
    `Urgency ${arrow(snap.urgency)}`,
    `Engagement ${arrow(snap.engagement)}`,
    `Close ${arrow(snap.close_readiness)}`,
  ].join(" · ");
}
