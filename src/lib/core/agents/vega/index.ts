// Vault Core — VEGA, Intelligence Director (Layer 2). The only ACTIVE agent in Phase 1.
//
// Mission: identify patterns across everything and feed recommendations to the
// workforce. Vega reads company data (READ-ONLY via the data provider), derives
// a cross-client intelligence insight, and writes it into Vault Memory.
//
// HARD RULES enforced here:
//   • Read-only on all client/external systems — Vega only reads, never writes
//     to Meta/GHL/Stripe/etc.
//   • Never sends, publishes, launches, edits, or deletes anything external.
//   • Recommendations are created as `open` for human review only.
//   • Fully mock-safe: with no DB, analysis still runs; writes no-op.

import { getDataProvider } from "@/lib/data/data-provider";
import {
  ensureNode,
  insertNode,
  insertEdge,
  insertActivity,
  insertRecommendation,
} from "../../memory/db";
import { getAgentMeta } from "../registry";
import {
  isAnthropicAvailable,
  callAnthropicTool,
  VICTORIA_MODELS,
} from "@/lib/victoria/anthropic";
import type { AgentRunResult } from "../../types";
import type { RunnableAgent, AgentRunContext } from "../types";
import type { Client } from "@/lib/data";

const META = getAgentMeta("vega")!;

// ─────────────────────────────────────────────────────────────
// Deterministic analysis (always available — the fallback brain)
// ─────────────────────────────────────────────────────────────

function parseMoney(v: string | undefined | null): number {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

interface Analysis {
  clientCount: number;
  avgCpl: number;
  best: { name: string; cpl: number } | null;
  worst: { name: string; cpl: number } | null;
  spread: number; // worst − best, the "opportunity" gap
  headline: string;
  summary: string;
  recommendation: string | null;
  impact: string | null;
  confidence: number;
}

function analyze(clients: Client[]): Analysis {
  const withCpl = clients
    .map((c) => ({ name: c.name, cpl: parseMoney(c.stats?.cpl) }))
    .filter((c) => c.cpl > 0)
    .sort((a, b) => a.cpl - b.cpl);

  const clientCount = clients.length;

  if (withCpl.length < 2) {
    return {
      clientCount,
      avgCpl: 0,
      best: null,
      worst: null,
      spread: 0,
      headline: "Baseline intelligence sweep",
      summary: `Reviewed ${clientCount} client account${clientCount === 1 ? "" : "s"}; insufficient CPL data to surface a cross-account pattern this cycle.`,
      recommendation: null,
      impact: null,
      confidence: 0.5,
    };
  }

  const best = withCpl[0];
  const worst = withCpl[withCpl.length - 1];
  const avgCpl = withCpl.reduce((s, c) => s + c.cpl, 0) / withCpl.length;
  const spread = worst.cpl - best.cpl;
  const spreadPct = best.cpl > 0 ? Math.round((spread / best.cpl) * 100) : 0;

  const headline = `Cross-client CPL spread of ${spreadPct}%`;
  const summary =
    `Across ${withCpl.length} accounts, CPL ranges from $${best.cpl.toFixed(0)} (${best.name}) to ` +
    `$${worst.cpl.toFixed(0)} (${worst.name}), avg $${avgCpl.toFixed(0)}. ` +
    `The ${spreadPct}% spread suggests transferable creative/targeting wins from ${best.name}.`;

  // Only emit a recommendation when the gap is meaningful (a real "pattern").
  const recommendation =
    spreadPct >= 30
      ? `Replicate ${best.name}'s top-performing creative + audience structure on ${worst.name} to compress its CPL toward the $${avgCpl.toFixed(0)} account average.`
      : null;
  const impact =
    spreadPct >= 30
      ? `Est. CPL reduction up to ${Math.min(spreadPct, 40)}% on the lagging account`
      : null;

  // Confidence scales modestly with how many accounts informed the pattern.
  const confidence = Math.min(0.9, 0.6 + withCpl.length * 0.04);

  return { clientCount, avgCpl, best, worst, spread, headline, summary, recommendation, impact, confidence };
}

// ─────────────────────────────────────────────────────────────
// Optional Anthropic enrichment — phrases the insight more sharply.
// Strictly optional: any failure (no key, timeout, parse) falls back to the
// deterministic analysis. Never blocks the cycle.
// ─────────────────────────────────────────────────────────────

async function enrich(a: Analysis): Promise<{ headline: string; summary: string } | null> {
  if (!isAnthropicAvailable()) return null;
  try {
    const res = await callAnthropicTool<{ headline: string; summary: string }>({
      model: VICTORIA_MODELS.DEAL_RISK, // fast haiku — this is a phrasing pass, not deep reasoning
      system:
        "You are Vega, Vault Co's Intelligence Director. You sharpen one analytical insight into a crisp, executive-grade headline and a 1–2 sentence summary. Be specific and non-hyperbolic. Never invent numbers not provided.",
      userMessage: JSON.stringify({
        headline: a.headline,
        summary: a.summary,
        avgCpl: a.avgCpl,
        best: a.best,
        worst: a.worst,
      }),
      tool: {
        name: "emit_insight",
        description: "Return a sharpened headline and summary for the insight.",
        input_schema: {
          type: "object",
          properties: {
            headline: { type: "string", description: "Max 8 words." },
            summary: { type: "string", description: "1–2 sentences, specific." },
          },
          required: ["headline", "summary"],
        },
      },
      maxTokens: 300,
    });
    if (res?.output?.headline && res?.output?.summary) {
      return { headline: res.output.headline, summary: res.output.summary };
    }
    return null;
  } catch {
    return null; // deterministic fallback
  }
}

// ─────────────────────────────────────────────────────────────
// Run cycle
// ─────────────────────────────────────────────────────────────

async function run(ctx: AgentRunContext): Promise<AgentRunResult> {
  let nodesCreated = 0;
  let edgesCreated = 0;
  let recommendationsCreated = 0;
  let activityCreated = 0;

  // 1. READ-ONLY data pull (mock-safe via the data provider)
  let clients: Client[] = [];
  try {
    clients = await getDataProvider().getClients();
  } catch {
    clients = [];
  }

  // 2. Analyze (deterministic), then optionally sharpen with Anthropic
  const analysis = analyze(clients);
  const sharpened = await enrich(analysis);
  const label = sharpened?.headline ?? analysis.headline;
  const summary = sharpened?.summary ?? analysis.summary;

  // 3. Ensure structural nodes (idempotent; null in mock mode)
  const coreId = await ensureNode({
    category: "memory_core",
    label: "Vault Memory",
    summary: "The central nervous system of Vault Co.",
    confidence: 1,
  });
  const vegaId = await ensureNode({
    category: "agent",
    label: META.name,
    summary: `${META.title} — ${META.mission}`,
    source_agent: META.id,
    confidence: 0.95,
    metadata: { title: META.title, color: META.color },
  });

  // 4. Write the insight node
  const insightId = await insertNode({
    category: "insight",
    label,
    summary,
    confidence: analysis.confidence,
    source_agent: META.id,
    metadata: {
      avgCpl: analysis.avgCpl,
      best: analysis.best,
      worst: analysis.worst,
      clientCount: analysis.clientCount,
    },
  });
  if (insightId) nodesCreated += 1;

  // 5. Relationships — insight contributed_by Vega, influences Vault Memory
  if (insightId && vegaId) {
    if (await insertEdge({ from_node: insightId, to_node: vegaId, relationship: "contributed_by", weight: 0.9, source_agent: META.id })) edgesCreated += 1;
  }
  if (insightId && coreId) {
    if (await insertEdge({ from_node: insightId, to_node: coreId, relationship: "influences", weight: 0.7, source_agent: META.id })) edgesCreated += 1;
  }

  // 6. Activity entry
  if (await insertActivity({
    agent: META.id,
    kind: "insight",
    message: `Vega analyzed ${analysis.clientCount} client account${analysis.clientCount === 1 ? "" : "s"} and surfaced: ${label}.`,
    node_id: insightId,
  })) activityCreated += 1;

  // 7. Recommendation (open, for human review only) when the pattern is strong
  if (analysis.recommendation) {
    const relatedClients = [analysis.best?.name, analysis.worst?.name].filter(
      (n): n is string => !!n
    );
    const recId = await insertRecommendation({
      agent: META.id,
      title: analysis.headline,
      body: analysis.recommendation,
      impact: analysis.impact,
      priority_score: Math.min(0.95, analysis.confidence + 0.05),
      node_id: insightId,
      influence_score: Math.min(0.9, analysis.confidence),
      revenue_impact: analysis.impact, // best available estimate this cycle
      related_clients: relatedClients,
      related_node_ids: insightId ? [insightId] : [],
      metadata: { confidence: analysis.confidence },
    });
    if (recId) {
      recommendationsCreated += 1;
      if (await insertActivity({
        agent: META.id,
        kind: "recommendation",
        message: `Vega generated an executive recommendation: ${analysis.headline}.`,
        node_id: recId,
      })) activityCreated += 1;
    }
  }

  const persisted = coreId !== null; // proxy for "DB is live"
  const via = ctx.trigger === "manual" ? "manual" : ctx.tier;
  const detail = persisted
    ? `[${via}] Analyzed ${analysis.clientCount} accounts · ${nodesCreated} node(s), ${edgesCreated} edge(s), ${recommendationsCreated} recommendation(s).`
    : `[${via}] Analyzed ${analysis.clientCount} accounts (mock mode — no persistence). Insight: ${label}.`;

  return {
    status: "success",
    nodesCreated,
    edgesCreated,
    recommendationsCreated,
    activityCreated,
    detail,
  };
}

export const vegaAgent: RunnableAgent = { meta: META, run };
