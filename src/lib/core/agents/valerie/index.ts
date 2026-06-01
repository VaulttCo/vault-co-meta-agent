// Vault Core — VALERIE, Financial Director (Layer 2). Activated in Phase 4.
//
// Mission: protect and grow financial performance. Valerie reads internal
// revenue/payment data (READ-ONLY), surfaces revenue trends, payment risk,
// partner-earnings clarity, and concentration risk, then — on an anomaly —
// opens a COLLABORATION requesting Vega's cross-system confidence check.
//
// HARD RULES (enforced): Valerie may ONLY read, analyze, recommend, and write
// Vault Memory / activity / collaboration / Command Hub records. She NEVER
// touches Stripe, sends invoices, charges, refunds, moves money, modifies any
// revenue record, or takes any external/financial action. Humans decide.
// Fully mock-safe: analysis always runs; writes no-op without a database.

import {
  ensureNode,
  insertNode,
  insertEdge,
  insertActivity,
  insertRecommendation,
} from "../../memory/db";
import { createCollaboration, insertAgentMessage, insertAgentTask } from "../../collab/db";
import { getAgentMeta } from "../registry";
import { getFinancialData, type FinancialData } from "./data";
import type { AgentRunResult } from "../../types";
import type { RunnableAgent, AgentRunContext } from "../types";

const META = getAgentMeta("valerie")!;

const RISK_STATUSES = new Set(["open", "past_due", "failed", "uncollectible", "unpaid"]);
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

interface FinancialAnalysis {
  source: "live" | "mock";
  clientCount: number;
  totalRevenue: number;
  topClient: { name: string; revenue: number } | null;
  concentrationPct: number;          // top client share of revenue
  atRisk: { name: string; revenue: number; status: string }[];
  atRiskTotal: number;
  draftCount: number;
  nickTotal: number;
  jaxonTotal: number;
  anomaly: boolean;                  // worth a collaboration
}

function analyze(data: FinancialData): FinancialAnalysis {
  const { snapshots, totalRevenue } = data;
  const sorted = [...snapshots].sort((a, b) => b.revenue - a.revenue);
  const topClient = sorted[0] ? { name: sorted[0].clientName, revenue: sorted[0].revenue } : null;
  const concentrationPct = totalRevenue > 0 && topClient ? Math.round((topClient.revenue / totalRevenue) * 100) : 0;

  const atRisk = snapshots
    .filter((s) => RISK_STATUSES.has((s.invoiceStatus ?? "").toLowerCase()))
    .map((s) => ({ name: s.clientName, revenue: s.revenue, status: (s.invoiceStatus ?? "").toLowerCase() }));
  const atRiskTotal = atRisk.reduce((sum, x) => sum + x.revenue, 0);
  const draftCount = snapshots.filter(
    (s) => (s.invoiceStatus ?? "") === "draft" || (s.reviewStatus ?? "") === "draft"
  ).length;

  const nickTotal = snapshots.reduce((sum, x) => sum + x.nickEarnings, 0);
  const jaxonTotal = snapshots.reduce((sum, x) => sum + x.jaxonEarnings, 0);

  const anomaly = atRisk.length > 0 || concentrationPct >= 40;

  return {
    source: data.source,
    clientCount: snapshots.length,
    totalRevenue,
    topClient,
    concentrationPct,
    atRisk,
    atRiskTotal,
    draftCount,
    nickTotal,
    jaxonTotal,
    anomaly,
  };
}

async function run(ctx: AgentRunContext): Promise<AgentRunResult> {
  let nodesCreated = 0;
  let edgesCreated = 0;
  let recommendationsCreated = 0;
  let activityCreated = 0;
  let collaborationsOpened = 0;

  const data = await getFinancialData();
  const a = analyze(data);

  const coreId = await ensureNode({ category: "memory_core", label: "Vault Memory", confidence: 1 });
  const valId = await ensureNode({
    category: "agent",
    label: META.name,
    summary: `${META.title} — ${META.mission}`,
    source_agent: META.id,
    confidence: 0.95,
    metadata: { title: META.title, color: META.color },
  });

  const link = async (fromId: string | null) => {
    if (fromId && valId) {
      if (await insertEdge({ from_node: fromId, to_node: valId, relationship: "contributed_by", weight: 0.9, source_agent: META.id })) edgesCreated += 1;
    }
    if (fromId && coreId) {
      if (await insertEdge({ from_node: fromId, to_node: coreId, relationship: "influences", weight: 0.7, source_agent: META.id })) edgesCreated += 1;
    }
  };

  // 1. Revenue trend / concentration node
  const trendLabel = a.topClient
    ? `Revenue concentration: ${a.topClient.name} is ${a.concentrationPct}% of revenue`
    : "Revenue baseline";
  const trendId = await insertNode({
    category: "revenue_trend",
    label: trendLabel,
    summary: `Total tracked revenue ${usd(a.totalRevenue)} across ${a.clientCount} accounts. Top client ${a.concentrationPct}% concentration.`,
    confidence: 0.75,
    source_agent: META.id,
    metadata: { totalRevenue: a.totalRevenue, concentrationPct: a.concentrationPct, source: a.source },
  });
  if (trendId) nodesCreated += 1;
  await link(trendId);

  // 2. Payment risk node (when invoices are at risk)
  let riskId: string | null = null;
  if (a.atRisk.length > 0) {
    riskId = await insertNode({
      category: "payment_risk",
      label: `${a.atRisk.length} invoice(s) at risk · ${usd(a.atRiskTotal)}`,
      summary: `At-risk invoice statuses detected: ${a.atRisk.map((r) => `${r.name} (${r.status})`).join(", ")}.`,
      confidence: 0.8,
      source_agent: META.id,
      metadata: { atRiskTotal: a.atRiskTotal, statuses: a.atRisk.map((r) => r.status) },
    });
    if (riskId) nodesCreated += 1;
    await link(riskId);
  }

  // 3. Partner earnings signal node
  const partnerId = await insertNode({
    category: "partner_earnings_signal",
    label: `Partner earnings · Nick ${usd(a.nickTotal)} / Jaxon ${usd(a.jaxonTotal)}`,
    summary: "Recurring partner-split visibility across tracked snapshots.",
    confidence: 0.7,
    source_agent: META.id,
    metadata: { nick: a.nickTotal, jaxon: a.jaxonTotal },
  });
  if (partnerId) nodesCreated += 1;
  await link(partnerId);

  // Activity
  if (await insertActivity({
    agent: META.id,
    kind: "insight",
    message: `Valerie reviewed ${a.clientCount} revenue snapshots (${usd(a.totalRevenue)} tracked); ${a.atRisk.length} invoice(s) at risk, top-client concentration ${a.concentrationPct}%.`,
    node_id: trendId,
  })) activityCreated += 1;

  // Recommendation — pick the most pressing financial issue (human review only).
  let recId: string | null = null;
  if (a.atRisk.length > 0) {
    recId = await insertRecommendation({
      agent: META.id,
      title: "Review unpaid / open client invoices",
      body: `${a.atRisk.length} invoice(s) show at-risk status (${a.atRisk.map((r) => `${r.name}: ${r.status}`).join("; ")}). Recommend a human review of collection status. No action taken automatically.`,
      impact: "Cash-flow risk if unresolved",
      priority_score: 0.85,
      node_id: riskId ?? trendId,
      influence_score: 0.72,
      revenue_impact: `${usd(a.atRiskTotal)} at risk`,
      related_clients: a.atRisk.map((r) => r.name),
      related_node_ids: [riskId, trendId].filter((x): x is string => !!x),
      metadata: { confidence: 0.8, suggested_human_action: "Review Stripe invoice status; follow up on collection. Valerie cannot send or charge." },
    });
  } else if (a.concentrationPct >= 40 && a.topClient) {
    recId = await insertRecommendation({
      agent: META.id,
      title: "Review revenue concentration risk",
      body: `${a.topClient.name} represents ${a.concentrationPct}% of tracked revenue. Recommend a human review of diversification / dependency risk.`,
      impact: "Revenue dependency risk",
      priority_score: 0.7,
      node_id: trendId,
      influence_score: 0.66,
      revenue_impact: `${usd(a.topClient.revenue)} concentrated in one account`,
      related_clients: [a.topClient.name],
      related_node_ids: trendId ? [trendId] : [],
      metadata: { confidence: 0.72, suggested_human_action: "Assess client diversification strategy." },
    });
  } else {
    recId = await insertRecommendation({
      agent: META.id,
      title: "Review partner split summary",
      body: `Recurring partner earnings this period: Nick ${usd(a.nickTotal)}, Jaxon ${usd(a.jaxonTotal)}. Informational review for commission clarity.`,
      impact: "Commission visibility",
      priority_score: 0.5,
      node_id: partnerId,
      influence_score: 0.5,
      revenue_impact: `${usd(a.nickTotal + a.jaxonTotal)} partner earnings`,
      related_node_ids: partnerId ? [partnerId] : [],
      metadata: { confidence: 0.65, suggested_human_action: "Confirm commission splits against records." },
    });
  }
  if (recId) {
    recommendationsCreated += 1;
    if (await insertActivity({ agent: META.id, kind: "recommendation", message: `Valerie generated a financial recommendation for Command Hub review.`, node_id: recId })) activityCreated += 1;
  }

  // Collaboration with Vega on an anomaly (revenue concentration / payment risk).
  if (a.anomaly) {
    const collabId = await createCollaboration({
      title: a.atRisk.length > 0 ? "Payment risk — cross-system confidence check" : "Revenue concentration — risk validation",
      initiator: META.id,
      participants: ["valerie", "vega"],
      status: "open",
      summary: a.atRisk.length > 0
        ? `Valerie flagged ${a.atRisk.length} at-risk invoice(s) (${usd(a.atRiskTotal)}) and requested Vega's cross-system confidence.`
        : `Valerie flagged ${a.concentrationPct}% revenue concentration and requested Vega validate the dependency risk.`,
      related_node_ids: [riskId, trendId].filter((x): x is string => !!x),
    });
    if (collabId) {
      collaborationsOpened += 1;
      await insertAgentMessage({
        from_agent: META.id,
        to_agent: "vega",
        kind: "request_analysis",
        subject: a.atRisk.length > 0 ? `Confirm payment-risk impact (${usd(a.atRiskTotal)})` : `Confirm concentration risk (${a.concentrationPct}%)`,
        body: "Vega — can you corroborate this financial signal against cross-system patterns before we escalate to a joint recommendation?",
        related_node_ids: [riskId, trendId].filter((x): x is string => !!x),
        collaboration_id: collabId,
      });
      await insertAgentTask({
        assigned_to: "vega",
        assigned_by: META.id,
        title: a.atRisk.length > 0 ? "Validate payment-risk signal" : "Validate revenue-concentration signal",
        detail: "Cross-check Valerie's financial signal against performance/conversion data.",
        status: "open",
        collaboration_id: collabId,
        related_node_ids: [riskId, trendId].filter((x): x is string => !!x),
      });
    }
  }

  const persisted = coreId !== null;
  const via = ctx.trigger === "manual" ? "manual" : ctx.tier;
  const detail = persisted
    ? `[${via}] Reviewed ${a.clientCount} snapshots (${a.source}) · ${nodesCreated} node(s), ${recommendationsCreated} rec(s), ${collaborationsOpened} collaboration(s).`
    : `[${via}] Reviewed ${a.clientCount} snapshots (mock mode — no persistence). ${a.atRisk.length} at-risk, ${a.concentrationPct}% concentration.`;

  return { status: "success", nodesCreated, edgesCreated, recommendationsCreated, activityCreated, detail };
}

export const valerieAgent: RunnableAgent = { meta: META, run };
