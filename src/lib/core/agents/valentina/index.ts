// Vault Core — VALENTINA, AI Marketing Director (Layer 2).
//
// NAMING: this is the active AI Marketing Director executive. It was previously
// registered as "victoria"; renamed to "valentina" so the name "Victoria" is
// reserved for the AI Sales Coach (the live sales-call product, src/lib/victoria/**).
// Same behavior, tiers, and read-only safety rules as before — identity only.
//
// Mission: understand how attention converts. Valentina reads available creative/
// campaign data (READ-ONLY) and surfaces content/hook/offer intelligence, then
// — when a discovery is strong — opens a COLLABORATION requesting Vega's impact
// analysis (the start of the standard collaboration workflow).
//
// HARD RULES: read-only on all client/external systems; never sends/publishes/
// launches/edits/deletes; recommendations are created for human review only.
// Fully mock-safe: analysis always runs; writes no-op without a database.
//
// NOTE on Obsidian: per ADR-0003 the Vercel runtime cannot write the local
// Obsidian vault. Valentina's discoveries are written to Vault Memory (the source
// of truth), structured so they can be captured into Obsidian via the /valentina
// skill during a session.

import { getDataProvider } from "@/lib/data/data-provider";
import {
  ensureNode,
  insertNode,
  insertEdge,
  insertActivity,
  insertRecommendation,
} from "../../memory/db";
import { createCollaboration, insertAgentMessage, insertAgentTask } from "../../collab/db";
import { runCompetitorSignals } from "../../competitor/valentina-signals";
import { getAgentMeta } from "../registry";
import { isAnthropicAvailable, callAnthropicTool, VICTORIA_MODELS } from "@/lib/victoria/anthropic";
import type { AgentRunResult } from "../../types";
import type { RunnableAgent, AgentRunContext } from "../types";
import type { Client, Campaign } from "@/lib/data";

const META = getAgentMeta("valentina")!;

function parseMoney(v: string | undefined | null): number {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

interface CampaignSignal {
  client: string;
  campaign: Campaign;
  cpl: number;
  leads: number;
}

interface Discovery {
  clientCount: number;
  campaignCount: number;
  winner: CampaignSignal | null;
  fatigued: CampaignSignal | null;
  headline: string;
  summary: string;
  recommendation: string | null;
  impact: string | null;
  confidence: number;
  strong: boolean; // worth a collaboration
}

function analyze(clients: Client[]): Discovery {
  const signals: CampaignSignal[] = [];
  for (const c of clients) {
    for (const camp of c.campaigns ?? []) {
      signals.push({ client: c.name, campaign: camp, cpl: parseMoney(camp.cpl), leads: camp.leads });
    }
  }
  const withLeads = signals.filter((s) => s.leads > 0);

  if (withLeads.length < 2) {
    return {
      clientCount: clients.length,
      campaignCount: signals.length,
      winner: null,
      fatigued: null,
      headline: "Baseline creative sweep",
      summary: `Reviewed ${signals.length} campaigns across ${clients.length} accounts; not enough lead data to surface a content pattern this cycle.`,
      recommendation: null,
      impact: null,
      confidence: 0.5,
      strong: false,
    };
  }

  // Winner = lowest CPL with real volume. Fatigued = high spend / low leads.
  const byCpl = [...withLeads].sort((a, b) => a.cpl - b.cpl);
  const winner = byCpl[0];
  const fatigued = [...signals]
    .filter((s) => parseMoney(s.campaign.spend) > 0)
    .sort((a, b) => b.cpl - a.cpl)[0] ?? null;

  const headline = `“${winner.campaign.type}” creative is converting attention best`;
  const summary =
    `Across ${signals.length} campaigns, ${winner.client}'s "${winner.campaign.name}" ` +
    `(${winner.campaign.type}) leads on efficiency at $${winner.cpl.toFixed(0)} CPL with ` +
    `${winner.leads} leads. The winning angle looks transferable to lagging creatives` +
    (fatigued ? `, including "${fatigued.campaign.name}" ($${fatigued.cpl.toFixed(0)} CPL).` : ".");

  const spreadPct = winner.cpl > 0 && fatigued ? Math.round(((fatigued.cpl - winner.cpl) / winner.cpl) * 100) : 0;
  const strong = spreadPct >= 25;
  const recommendation = strong
    ? `Rebuild lagging creatives around the "${winner.campaign.type}" hook/angle that is winning on ${winner.client}.`
    : null;
  const impact = strong ? `Est. CPL reduction up to ${Math.min(spreadPct, 35)}% on fatigued creatives` : null;
  const confidence = Math.min(0.9, 0.6 + withLeads.length * 0.03);

  return {
    clientCount: clients.length,
    campaignCount: signals.length,
    winner,
    fatigued,
    headline,
    summary,
    recommendation,
    impact,
    confidence,
    strong,
  };
}

async function enrich(d: Discovery): Promise<{ headline: string; summary: string } | null> {
  if (!isAnthropicAvailable()) return null;
  try {
    const res = await callAnthropicTool<{ headline: string; summary: string }>({
      model: VICTORIA_MODELS.DEAL_RISK,
      system:
        "You are Valentina, Vault Co's AI Marketing Director. Sharpen one creative/content insight into a crisp headline and a 1–2 sentence summary. Be specific and non-hyperbolic. Never invent numbers not provided.",
      userMessage: JSON.stringify({ headline: d.headline, summary: d.summary, winner: d.winner?.campaign?.type }),
      tool: {
        name: "emit_insight",
        description: "Return a sharpened headline and summary.",
        input_schema: {
          type: "object",
          properties: { headline: { type: "string" }, summary: { type: "string" } },
          required: ["headline", "summary"],
        },
      },
      maxTokens: 300,
    });
    if (res?.output?.headline && res?.output?.summary) return res.output;
    return null;
  } catch {
    return null;
  }
}

async function run(ctx: AgentRunContext): Promise<AgentRunResult> {
  let nodesCreated = 0;
  let edgesCreated = 0;
  let recommendationsCreated = 0;
  let activityCreated = 0;
  let collaborationsOpened = 0;

  let clients: Client[] = [];
  try {
    clients = await getDataProvider().getClients();
  } catch {
    clients = [];
  }

  const d = analyze(clients);
  const sharpened = await enrich(d);
  const label = sharpened?.headline ?? d.headline;
  const summary = sharpened?.summary ?? d.summary;

  const coreId = await ensureNode({ category: "memory_core", label: "Vault Memory", confidence: 1 });
  const vicId = await ensureNode({
    category: "agent",
    label: META.name,
    summary: `${META.title} — ${META.mission}`,
    source_agent: META.id,
    confidence: 0.95,
    metadata: { title: META.title, color: META.color },
  });

  // Hook/content discovery node
  const hookId = await insertNode({
    category: "hook",
    label,
    summary,
    confidence: d.confidence,
    source_agent: META.id,
    metadata: {
      winner: d.winner ? { client: d.winner.client, type: d.winner.campaign.type, cpl: d.winner.cpl } : null,
      campaignCount: d.campaignCount,
    },
  });
  if (hookId) nodesCreated += 1;
  if (hookId && vicId) {
    if (await insertEdge({ from_node: hookId, to_node: vicId, relationship: "contributed_by", weight: 0.9, source_agent: META.id })) edgesCreated += 1;
  }
  if (hookId && coreId) {
    if (await insertEdge({ from_node: hookId, to_node: coreId, relationship: "influences", weight: 0.6, source_agent: META.id })) edgesCreated += 1;
  }

  if (await insertActivity({
    agent: META.id,
    kind: "insight",
    message: `Valentina analyzed ${d.campaignCount} campaigns and surfaced: ${label}.`,
    node_id: hookId,
  })) activityCreated += 1;

  // Recommendation when the pattern is strong
  if (d.recommendation) {
    const recId = await insertRecommendation({
      agent: META.id,
      title: d.headline,
      body: d.recommendation,
      impact: d.impact,
      priority_score: Math.min(0.95, d.confidence + 0.03),
      node_id: hookId,
      influence_score: Math.min(0.85, d.confidence),
      revenue_impact: d.impact,
      related_clients: d.winner ? [d.winner.client] : [],
      related_node_ids: hookId ? [hookId] : [],
      metadata: { confidence: d.confidence },
    });
    if (recId) {
      recommendationsCreated += 1;
      if (await insertActivity({ agent: META.id, kind: "recommendation", message: `Valentina generated a creative recommendation: ${d.headline}.`, node_id: recId })) activityCreated += 1;
    }
  }

  // Open a collaboration requesting Vega's impact analysis (start of the flow).
  if (d.strong) {
    const collabId = await createCollaboration({
      title: `Creative pattern: ${d.winner?.campaign.type ?? "winning angle"}`,
      initiator: META.id,
      participants: [META.id, "vega"],
      status: "open",
      summary: `Valentina surfaced a winning creative angle and requested Vega quantify the cross-account impact. ${label}.`,
      related_node_ids: hookId ? [hookId] : [],
    });
    if (collabId) {
      collaborationsOpened += 1;
      await insertAgentMessage({
        from_agent: META.id,
        to_agent: "vega",
        kind: "request_analysis",
        subject: `Quantify impact: ${label}`,
        body: "Vega — can you confirm the cross-account CPL impact if we rebuild lagging creatives around this angle?",
        related_node_ids: hookId ? [hookId] : [],
        collaboration_id: collabId,
      });
      await insertAgentTask({
        assigned_to: "vega",
        assigned_by: META.id,
        title: `Quantify impact of "${d.winner?.campaign.type ?? "winning"}" angle`,
        detail: "Compare CPL on the winning angle vs lagging creatives across accounts.",
        status: "open",
        collaboration_id: collabId,
        related_node_ids: hookId ? [hookId] : [],
      });
    }
  }

  // Competitor source layer (READ-ONLY): reads the internal manual competitor
  // profiles/captures, writes memory nodes, and emits recommend-only candidates
  // through the Vera/Vesper gate. Fully guarded — a failure never breaks the run.
  try {
    const comp = await runCompetitorSignals();
    nodesCreated += comp.nodesCreated;
    edgesCreated += comp.edgesCreated;
    recommendationsCreated += comp.recommendationsCreated;
  } catch (e) {
    console.error("[valentina] competitor signals (non-fatal):", (e as Error).message);
  }

  const persisted = coreId !== null;
  const via = ctx.trigger === "manual" ? "manual" : ctx.tier;
  const detail = persisted
    ? `[${via}] Analyzed ${d.campaignCount} campaigns · ${nodesCreated} node(s), ${recommendationsCreated} rec(s), ${collaborationsOpened} collaboration(s) opened.`
    : `[${via}] Analyzed ${d.campaignCount} campaigns (mock mode — no persistence). Discovery: ${label}.`;

  return { status: "success", nodesCreated, edgesCreated, recommendationsCreated, activityCreated, detail };
}

export const valentinaAgent: RunnableAgent = { meta: META, run };
