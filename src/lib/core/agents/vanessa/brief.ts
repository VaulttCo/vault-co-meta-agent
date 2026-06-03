// Vault Core — Vanessa's Daily Executive Brief builder (Phase 5). Pure function.
//
// Synthesizes current Vault Memory state (recommendations, proposals, activity,
// reputation, collaborations) into the Daily Executive Brief. Shared by Vanessa's
// runtime (which persists a snapshot node) and the /api/core/executive-brief
// endpoint (which computes it fresh), so both always agree.

import { rankByPriority, scorePriority } from "./priority";
import type {
  VaultRecommendationRow,
  VaultActivityRow,
  AgentReputationRow,
  AgentCollaborationRow,
  SystemProposalRow,
  ExecutiveBrief,
  ExecutivePriorityItem,
} from "../../types";

export interface BriefInputs {
  recommendations: VaultRecommendationRow[];
  proposals: SystemProposalRow[];
  activity: VaultActivityRow[];
  reputation: AgentReputationRow[];
  collaborations: AgentCollaborationRow[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function confidenceOf(r: VaultRecommendationRow): number {
  const c = (r.metadata as { confidence?: number } | undefined)?.confidence;
  return typeof c === "number" ? c : r.influence_score;
}

function toItem(r: VaultRecommendationRow): ExecutivePriorityItem {
  const scored = scorePriority(r);
  return {
    recommendationId: r.id,
    title: r.title,
    agent: r.agent,
    priority: r.vanessa_priority ?? scored.level,
    reason: r.priority_reason ?? scored.reason,
    confidence: confidenceOf(r),
    influence: r.influence_score,
    revenueImpact: r.revenue_impact,
    status: r.status,
  };
}

function recentByAgent(activity: VaultActivityRow[], agent: string, limit = 3): string[] {
  return activity.filter((a) => a.agent === agent).slice(0, limit).map((a) => a.message);
}

export function buildExecutiveBrief(input: BriefInputs): ExecutiveBrief {
  const { recommendations, proposals, activity, reputation, collaborations } = input;
  const open = recommendations.filter((r) => r.status === "pending_review");

  // Top 3 priorities across all active executives.
  const ranked = rankByPriority(open.length ? open : recommendations);
  const topPriorities = ranked.slice(0, 3).map((x) => toItem(x.rec));

  // Risks: financial + risk-flavored titles.
  const topRisks = recommendations
    .filter((r) => r.agent === "valerie" || /risk|unpaid|past[- ]?due|concentration|leak/i.test(r.title))
    .slice(0, 3)
    .map((r) => `${r.title}${r.revenue_impact ? ` (${r.revenue_impact})` : ""}`);

  // Opportunities: marketing + opportunity-flavored titles.
  const topOpportunities = recommendations
    .filter((r) => r.agent === "valentina" || /opportunit|winning|content|hook|offer|conversion/i.test(r.title))
    .slice(0, 3)
    .map((r) => r.title);

  // Activity summary by agent (last window already limited by caller).
  const agentCounts = new Map<string, number>();
  for (const a of activity) agentCounts.set(a.agent, (agentCounts.get(a.agent) ?? 0) + 1);
  const agentActivitySummary =
    Array.from(agentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([ag, n]) => `${cap(ag)} ${n}`)
      .join(" · ") || "No recent activity.";

  const financialSignals = recentByAgent(activity, "valerie");
  const marketingSignals = recentByAgent(activity, "valentina");
  const intelligenceSignals = recentByAgent(activity, "vega");

  // Suggested human actions from top priorities.
  const suggestedHumanActions = topPriorities.map((p) => {
    const rec = recommendations.find((r) => r.id === p.recommendationId);
    const sa = (rec?.metadata as { suggested_human_action?: string } | undefined)?.suggested_human_action;
    return sa ?? `Review: ${p.title}`;
  });

  const openCollabs = collaborations.filter((c) => c.status !== "resolved").length;
  const pendingProposals = proposals.filter((p) => p.status === "pending_review").length;
  const systemHealth = `${pendingProposals} system proposal(s) pending · ${openCollabs} open collaboration(s) · runtime nominal.`;

  const topPerformers = [...reputation]
    .sort((a, b) => b.trust_score - a.trust_score)
    .slice(0, 3)
    .map((r) => ({ agent: r.agent, trust: r.trust_score, adoption: r.adoption_rate }));

  const critical = topPriorities.filter((p) => p.priority === "critical" || p.priority === "high").length;
  const executiveSummary =
    `${open.length} recommendation(s) await review; ${critical} are high/critical priority. ` +
    `${topRisks.length} risk signal(s) and ${topOpportunities.length} opportunity signal(s) surfaced across the workforce. ` +
    (topPriorities[0] ? `Top focus: ${topPriorities[0].title}.` : `No standout priority today.`);

  return {
    generatedAt: new Date().toISOString(),
    executiveSummary,
    topPriorities,
    topRisks,
    topOpportunities,
    agentActivitySummary,
    financialSignals,
    marketingSignals,
    intelligenceSignals,
    openRecommendations: open.length,
    suggestedHumanActions,
    systemHealth,
    topPerformers,
  };
}
