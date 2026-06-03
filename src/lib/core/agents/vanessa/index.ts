// Vault Core — VANESSA, Executive Director (Layer 2). Activated in Phase 5.
//
// Mission: coordinate the workforce and convert intelligence into executive
// priorities. Vanessa is the Executive Oversight Layer: she reads outputs from
// the active executives (Vega, Valentina, Valerie), prioritizes, generates the
// Daily Executive Brief, writes executive memory nodes, sets Vanessa-priority on
// open recommendations, and pushes the top item to the Command Hub.
//
// HARD RULES: Vanessa may only read, analyze, prioritize, recommend, write Vault
// Memory / activity / collaboration / Command Hub records, and generate briefs.
// She NEVER sends, publishes, launches, deletes, modifies client systems/Stripe,
// or takes any external action. Humans decide. Mock-safe (writes no-op without DB).

import {
  ensureNode,
  insertNode,
  insertEdge,
  insertActivity,
  insertRecommendation,
  setRecommendationPriority,
  getRecommendations,
  getActivity,
} from "../../memory/db";
import {
  getProposals,
  getReputation,
  getCollaborations,
  insertAgentMessage,
} from "../../collab/db";
import { getAgentMeta } from "../registry";
import { buildExecutiveBrief } from "./brief";
import { rankByPriority } from "./priority";
import type { AgentRunResult } from "../../types";
import type { RunnableAgent, AgentRunContext } from "../types";

const META = getAgentMeta("vanessa")!;

async function run(ctx: AgentRunContext): Promise<AgentRunResult> {
  let nodesCreated = 0;
  let edgesCreated = 0;
  let recommendationsCreated = 0;
  let activityCreated = 0;

  // 1. Gather workforce state (all mock-safe reads).
  const [recommendations, proposals, activity, reputation, collaborations] = await Promise.all([
    getRecommendations(200),
    getProposals(),
    getActivity(100),
    getReputation(),
    getCollaborations(50),
  ]);

  const brief = buildExecutiveBrief({ recommendations, proposals, activity, reputation, collaborations });
  const open = recommendations.filter((r) => r.status === "pending_review");
  const ranked = rankByPriority(open);

  // 2. Structural nodes.
  const coreId = await ensureNode({ category: "memory_core", label: "Vault Memory", confidence: 1 });
  const vanId = await ensureNode({
    category: "agent",
    label: META.name,
    summary: `${META.title} — ${META.mission}`,
    source_agent: META.id,
    confidence: 0.95,
    metadata: { title: META.title, color: META.color },
  });

  const link = async (fromId: string | null) => {
    if (fromId && vanId) {
      if (await insertEdge({ from_node: fromId, to_node: vanId, relationship: "contributed_by", weight: 0.9, source_agent: META.id })) edgesCreated += 1;
    }
    if (fromId && coreId) {
      if (await insertEdge({ from_node: fromId, to_node: coreId, relationship: "influences", weight: 0.7, source_agent: META.id })) edgesCreated += 1;
    }
  };

  // 3. Executive brief node (sections stored in metadata; summary = digest).
  const briefId = await insertNode({
    category: "executive_brief",
    label: `Daily Executive Brief — ${new Date().toISOString().slice(0, 10)}`,
    summary: brief.executiveSummary,
    confidence: 0.85,
    source_agent: META.id,
    metadata: { brief: brief as unknown as Record<string, unknown> },
  });
  if (briefId) nodesCreated += 1;
  await link(briefId);

  // 4. Risk + opportunity + workforce-performance summary nodes.
  if (brief.topRisks.length) {
    const riskId = await insertNode({
      category: "risk_summary",
      label: `Top risks (${brief.topRisks.length})`,
      summary: brief.topRisks.join(" · "),
      confidence: 0.78,
      source_agent: META.id,
    });
    if (riskId) nodesCreated += 1;
    await link(riskId);
  }
  if (brief.topOpportunities.length) {
    const oppId = await insertNode({
      category: "opportunity_summary",
      label: `Top opportunities (${brief.topOpportunities.length})`,
      summary: brief.topOpportunities.join(" · "),
      confidence: 0.74,
      source_agent: META.id,
    });
    if (oppId) nodesCreated += 1;
    await link(oppId);
  }
  const perfId = await insertNode({
    category: "workforce_performance_summary",
    label: "Workforce performance summary",
    summary: brief.topPerformers.map((p) => `${p.agent} (trust ${p.trust}, adoption ${p.adoption}%)`).join(" · "),
    confidence: 0.7,
    source_agent: META.id,
  });
  if (perfId) nodesCreated += 1;
  await link(perfId);

  // 5. Set Vanessa-priority on open recommendations + executive_priority nodes for the top items.
  for (const { rec, scored } of ranked) {
    await setRecommendationPriority(rec.id, scored.level, scored.reason);
  }
  for (const { rec, scored } of ranked.slice(0, 3)) {
    const prId = await insertNode({
      category: "executive_priority",
      label: `[${scored.level.toUpperCase()}] ${rec.title}`,
      summary: `Prioritized ${scored.level} — ${scored.reason}. Source: ${rec.agent}.`,
      confidence: 0.8,
      source_agent: META.id,
      metadata: { recommendation_id: rec.id, priority: scored.level },
    });
    if (prId) {
      nodesCreated += 1;
      if (briefId) { if (await insertEdge({ from_node: prId, to_node: briefId, relationship: "supports", weight: 0.8, source_agent: META.id })) edgesCreated += 1; }
    }
  }

  // 6. Activity.
  if (await insertActivity({
    agent: META.id,
    kind: "analysis",
    message: `Vanessa generated the Daily Executive Brief: ${open.length} open recommendation(s), top focus "${brief.topPriorities[0]?.title ?? "—"}".`,
    node_id: briefId,
  })) activityCreated += 1;

  // 7. Executive strategic recommendation → Command Hub (top priority synthesized).
  const top = ranked[0]?.rec;
  if (top) {
    const recId = await insertRecommendation({
      agent: META.id,
      title: `Executive priority: ${top.title}`,
      body: `Vanessa flagged this as the top executive priority (${ranked[0].scored.level}). ${ranked[0].scored.reason}. Source agent: ${top.agent}. Recommend prioritizing human review.`,
      impact: "Highest-value item this cycle",
      priority_score: 0.9,
      node_id: briefId,
      influence_score: 0.85,
      revenue_impact: top.revenue_impact,
      related_node_ids: briefId ? [briefId] : [],
      vanessa_priority: ranked[0].scored.level,
      priority_reason: ranked[0].scored.reason,
      metadata: { confidence: 0.85, executive: true, references_recommendation: top.id },
    });
    if (recId) {
      recommendationsCreated += 1;
      if (await insertActivity({ agent: META.id, kind: "recommendation", message: `Vanessa escalated an executive priority to Command Hub: ${top.title}.`, node_id: recId })) activityCreated += 1;
    }
  }

  // 8. Broadcast executive priorities to the workforce (collaboration / share_context).
  await insertAgentMessage({
    from_agent: META.id,
    to_agent: null,
    kind: "share_context",
    subject: "Executive priorities updated",
    body: `Today's top priorities: ${brief.topPriorities.map((p) => `${p.title} (${p.priority})`).join("; ") || "none"}.`,
    related_node_ids: briefId ? [briefId] : [],
  });

  const persisted = coreId !== null;
  const via = ctx.trigger === "manual" ? "manual" : ctx.tier;
  const detail = persisted
    ? `[${via}] Brief generated · prioritized ${ranked.length} rec(s) · ${nodesCreated} node(s), ${recommendationsCreated} exec rec(s).`
    : `[${via}] Brief generated (mock mode — no persistence). ${open.length} open recs, top: ${brief.topPriorities[0]?.title ?? "—"}.`;

  return { status: "success", nodesCreated, edgesCreated, recommendationsCreated, activityCreated, detail };
}

export const vanessaAgent: RunnableAgent = { meta: META, run };
