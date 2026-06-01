// Vault Core — Vanessa executive-brief reader (server-side).
// Gathers current Vault Memory state (all via mock-safe readers) and computes
// the Daily Executive Brief + the Command Hub Executive Queue. READ-ONLY.

import { getRecommendations, getActivity } from "../../memory/db";
import { getProposals, getReputation, getCollaborations } from "../../collab/db";
import { buildExecutiveBrief } from "./brief";
import { rankByPriority } from "./priority";
import type { ExecutiveBrief, ExecutivePriorityItem, VaultRecommendationRow } from "../../types";

function confidenceOf(r: VaultRecommendationRow): number {
  const c = (r.metadata as { confidence?: number } | undefined)?.confidence;
  return typeof c === "number" ? c : r.influence_score;
}

export async function getExecutiveBrief(): Promise<{
  brief: ExecutiveBrief;
  queue: ExecutivePriorityItem[];
}> {
  const [recommendations, proposals, activity, reputation, collaborations] = await Promise.all([
    getRecommendations(200),
    getProposals(),
    getActivity(100),
    getReputation(),
    getCollaborations(50),
  ]);

  const brief = buildExecutiveBrief({ recommendations, proposals, activity, reputation, collaborations });

  // Executive Queue — open recommendations ranked by executive priority.
  const open = recommendations.filter((r) => r.status === "pending_review");
  const queue: ExecutivePriorityItem[] = rankByPriority(open).map(({ rec, scored }) => ({
    recommendationId: rec.id,
    title: rec.title,
    agent: rec.agent,
    priority: rec.vanessa_priority ?? scored.level,
    reason: rec.priority_reason ?? scored.reason,
    confidence: confidenceOf(rec),
    influence: rec.influence_score,
    revenueImpact: rec.revenue_impact,
    status: rec.status,
  }));

  return { brief, queue };
}
