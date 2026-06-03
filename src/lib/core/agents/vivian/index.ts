// Vault Core — VIVIAN, AI Client Success / Experience Operator (Layer 2).
// Activated in Phase 8.2 as the sixth runtime agent — RECOMMEND-ONLY.
//
// Mission: monitor client experience, onboarding health, sentiment, fulfillment
// gaps, communication quality, trust/confidence signals, retention risk, and
// renewal readiness — and recommend INTERNAL actions that help Vault Co retain
// and support clients.
//
// HARD RULES (recommend-only): Vivian may ONLY read safe internal data, analyze,
// write Vault Memory / activity / recommendation candidates, and prioritize. She
// NEVER emails/texts/calls clients, NEVER updates GHL/CRM, NEVER triggers
// workflows, NEVER touches Stripe/billing, NEVER mutates Meta, NEVER sends
// reports, and NEVER auto-creates external tasks. She imports NO external-write
// clients. Humans approve every recommendation. Mock-safe (writes no-op w/o DB).
//
// Every recommendation Vivian produces flows through the Vera + Vesper quality
// gate inside insertRecommendation before it is ever saved or surfaced.

import {
  ensureNode,
  insertNode,
  insertEdge,
  insertActivity,
  insertRecommendation,
} from "../../memory/db";
import { getAgentMeta } from "../registry";
import { analyzeClientSuccess, categoryForRisk, priorityForSeverity } from "./signals";
import { getClientSuccessSnapshots, type ClientSuccessSnapshot } from "./data";
import type { AgentRunResult, VaultNodeCategory } from "../../types";
import type { RunnableAgent, AgentRunContext } from "../types";

const META = getAgentMeta("vivian")!;

const RISK_LABEL: Record<string, string> = {
  onboarding_delay: "Onboarding delay",
  missing_access: "Missing access/assets",
  delayed_launch: "Delayed launch",
  churn_risk: "Retention/churn risk",
  fulfillment_gap: "Fulfillment gap",
  low_confidence: "Low client confidence",
};

async function run(ctx: AgentRunContext): Promise<AgentRunResult> {
  let nodesCreated = 0;
  let edgesCreated = 0;
  let recommendationsCreated = 0;
  let activityCreated = 0;

  // 1. Read PII-FREE client success snapshots (READ-ONLY, mock-safe). Vivian never
  //    loads raw contact PII — getClientSuccessSnapshots selects only safe columns.
  let clients: ClientSuccessSnapshot[] = [];
  try {
    clients = await getClientSuccessSnapshots();
  } catch {
    clients = [];
  }

  // 2. Pure analysis → recommend-only candidates. Strongest first; cap to keep
  //    Mission Control high-signal (the quality gate also dedupes/suppresses).
  const severityRank = { high: 0, medium: 1, low: 2 } as const;
  const candidates = analyzeClientSuccess(clients)
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, 8);

  // 3. Structural nodes (core + Vivian agent node).
  const coreId = await ensureNode({ category: "memory_core", label: "Vault Memory", confidence: 1 });
  const vivId = await ensureNode({
    category: "agent",
    label: META.name,
    summary: `${META.title} — ${META.mission}`,
    source_agent: META.id,
    confidence: 0.95,
    metadata: { title: META.title, color: META.color, active: true },
  });

  const link = async (fromId: string | null) => {
    if (fromId && vivId) {
      if (await insertEdge({ from_node: fromId, to_node: vivId, relationship: "contributed_by", weight: 0.9, source_agent: META.id })) edgesCreated += 1;
    }
    if (fromId && coreId) {
      if (await insertEdge({ from_node: fromId, to_node: coreId, relationship: "influences", weight: 0.7, source_agent: META.id })) edgesCreated += 1;
    }
  };

  // 4. One memory node + one recommend-only recommendation per candidate.
  for (const cand of candidates) {
    const label = `${RISK_LABEL[cand.riskType] ?? cand.riskType} — ${cand.clientName}`;
    const nodeId = await insertNode({
      category: categoryForRisk(cand.riskType) as VaultNodeCategory,
      label,
      summary: cand.evidence,
      confidence: cand.confidence,
      source_agent: META.id,
      ref_type: "client",
      ref_id: cand.clientId,
      metadata: {
        riskType: cand.riskType,
        severity: cand.severity,
        sourceSignals: cand.sourceSignals,
        active: true,
      },
    });
    if (nodeId) { nodesCreated += 1; await link(nodeId); }

    // Recommendation — RECOMMEND-ONLY, human-action language. Goes through the
    // Vera + Vesper quality gate (in insertRecommendation) before it is saved.
    const recId = await insertRecommendation({
      agent: META.id,
      title: `Client success: ${RISK_LABEL[cand.riskType] ?? cand.riskType} — ${cand.clientName}`,
      body: `${cand.evidence} ${cand.recommendedHumanAction}`,
      impact: cand.severity === "high" ? "Retention / onboarding risk" : "Client experience signal",
      priority_score: priorityForSeverity(cand.severity),
      node_id: nodeId,
      influence_score: 0.6,
      related_clients: [cand.clientId],
      related_node_ids: nodeId ? [nodeId] : [],
      metadata: {
        confidence: cand.confidence,
        riskType: cand.riskType,
        severity: cand.severity,
        sourceSignals: cand.sourceSignals,
        clientName: cand.clientName,
        recommendedHumanAction: cand.recommendedHumanAction,
        // Invariants — Vivian never executes; humans approve everything.
        neverAutoExecute: true,
        humanApprovalRequired: true,
        recommendOnly: true,
      },
    });
    if (recId) {
      recommendationsCreated += 1;
      if (await insertActivity({
        agent: META.id,
        kind: "recommendation",
        message: `Vivian flagged a client success signal (${cand.severity}): ${label}. Human review required.`,
        node_id: recId,
      })) activityCreated += 1;
    }
  }

  // 5. Summary activity.
  if (await insertActivity({
    agent: META.id,
    kind: "analysis",
    message: `Vivian reviewed ${clients.length} client(s) and surfaced ${candidates.length} client-success signal(s) for human review.`,
    node_id: vivId,
  })) activityCreated += 1;

  const persisted = coreId !== null;
  const via = ctx.trigger === "manual" ? "manual" : ctx.tier;
  const detail = persisted
    ? `[${via}] Reviewed ${clients.length} client(s) · ${candidates.length} signal(s) · ${recommendationsCreated} recommendation(s) for human review.`
    : `[${via}] Reviewed ${clients.length} client(s) · ${candidates.length} signal(s) (mock mode — no persistence).`;

  return { status: "success", nodesCreated, edgesCreated, recommendationsCreated, activityCreated, detail };
}

export const vivianAgent: RunnableAgent = { meta: META, run };
