// Vault Core — seeded mock Vault Memory.
//
// MANDATORY FALLBACK: when the vault_* tables or Supabase env vars are absent,
// every read goes through here so /vault-memory renders a believable, "alive"
// knowledge graph with zero database. Timestamps are generated relative to the
// current time on each call, so the activity feed and "growth today" always
// look fresh — including at 3:17 AM.
//
// This module is read-only and pure; it imports the existing portal mock data
// (clients) to ground the graph in recognizable entities.

import { clients as mockClients } from "@/lib/data";
import { WORKFORCE } from "../agents/registry";
import type {
  VaultGraph,
  VaultNodeRow,
  VaultEdgeRow,
  VaultActivityRow,
  VaultRecommendationRow,
  VaultRecommendationReviewRow,
  VaultAgentRunRow,
  VaultNodeCategory,
} from "../types";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function iso(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString();
}

// Deterministic id so edges can reference nodes without random drift per call.
function nid(parts: string): string {
  return `mock-${parts}`;
}

function node(
  idPart: string,
  category: VaultNodeCategory,
  label: string,
  opts: Partial<VaultNodeRow> = {}
): VaultNodeRow {
  return {
    id: nid(idPart),
    category,
    label,
    summary: opts.summary ?? null,
    confidence: opts.confidence ?? 0.7,
    source_agent: opts.source_agent ?? null,
    ref_type: opts.ref_type ?? null,
    ref_id: opts.ref_id ?? null,
    metadata: opts.metadata ?? {},
    created_at: opts.created_at ?? iso(3 * DAY),
    updated_at: opts.updated_at ?? iso(2 * HOUR),
  };
}

function edge(
  from: string,
  to: string,
  relationship: VaultEdgeRow["relationship"] = "connected_to",
  weight = 0.6,
  sourceAgent: string | null = null
): VaultEdgeRow {
  return {
    id: nid(`edge-${from}-${to}-${relationship}`),
    from_node: nid(from),
    to_node: nid(to),
    relationship,
    weight,
    source_agent: sourceAgent,
    created_at: iso(1 * DAY),
  };
}

// ─────────────────────────────────────────────────────────────
// Build the seeded graph
// ─────────────────────────────────────────────────────────────

export function buildMockGraph(): VaultGraph {
  const nodes: VaultNodeRow[] = [];
  const edges: VaultEdgeRow[] = [];

  // Center: Vault Memory
  nodes.push(
    node("memory-core", "memory_core", "Vault Memory", {
      summary: "The central nervous system of Vault Co. Everything connects here.",
      confidence: 1,
      created_at: iso(30 * DAY),
    })
  );

  // The workforce — one node per registered executive
  for (const agent of WORKFORCE) {
    nodes.push(
      node(`agent-${agent.id}`, "agent", agent.name, {
        summary: `${agent.title} — ${agent.mission}`,
        confidence: agent.active ? 0.95 : 0.4,
        source_agent: agent.id,
        metadata: { title: agent.title, active: agent.active, color: agent.color },
        created_at: iso(30 * DAY),
        updated_at: iso(agent.active ? 12 * MINUTE : 20 * DAY),
      })
    );
    edges.push(edge(`agent-${agent.id}`, "memory-core", "contributed_by", agent.active ? 0.9 : 0.2, agent.id));
  }

  // Clients + campaigns grounded in real portal mock data
  for (const client of mockClients.slice(0, 6)) {
    const cId = `client-${client.id}`;
    nodes.push(
      node(cId, "client", client.name, {
        summary: `${client.market || "Local services"} · ${client.tier ?? "standard"} tier`,
        confidence: 0.85,
        ref_type: "client",
        ref_id: client.id,
        metadata: { revenue: client.stats?.revenue, cpl: client.stats?.cpl },
      })
    );
    edges.push(edge(cId, "memory-core", "connected_to", 0.7));

    (client.campaigns ?? []).slice(0, 2).forEach((c, i) => {
      const campId = `campaign-${client.id}-${i}`;
      nodes.push(
        node(campId, "campaign", c.name, {
          summary: `${c.type} · ${c.leads} leads · CPL ${c.cpl}`,
          confidence: 0.78,
          metadata: { spend: c.spend, leads: c.leads, cpl: c.cpl },
        })
      );
      edges.push(edge(campId, cId, "connected_to", 0.75));
    });

    // A revenue event per client
    const revId = `revenue-${client.id}`;
    nodes.push(
      node(revId, "revenue_event", `${client.name} revenue`, {
        summary: `Tracked revenue ${client.stats?.revenue ?? "—"}`,
        confidence: 0.8,
      })
    );
    edges.push(edge(revId, cId, "impacts", 0.8));
  }

  // A few hooks / scripts Victoria-style knowledge (static, illustrative)
  const hooks = [
    ["hook-1", "“Booked solid in 30 days” roofing hook"],
    ["hook-2", "Storm-season urgency hook"],
  ];
  for (const [id, label] of hooks) {
    nodes.push(node(id, "hook", label, { confidence: 0.72, source_agent: "victoria" }));
    edges.push(edge(id, "memory-core", "connected_to", 0.5, "victoria"));
  }

  // Insights + recommendations attributed to Vega (the active agent)
  const insights: Array<[string, string, string]> = [
    ["insight-cpl", "Cross-client CPL pattern", "Roofing clients show 18% lower CPL on storm-season creatives."],
    ["insight-book", "Booking-rate correlation", "Faster first-text response correlates with +12% booking rate."],
    ["insight-spend", "Spend efficiency cluster", "Top quartile spend efficiency clusters around $3–5k/mo budgets."],
  ];
  insights.forEach(([id, label, summary], i) => {
    nodes.push(
      node(id, "insight", label, {
        summary,
        confidence: 0.68 + i * 0.05,
        source_agent: "vega",
        created_at: iso((i + 1) * 6 * HOUR),
        updated_at: iso((i + 1) * 30 * MINUTE),
      })
    );
    edges.push(edge(id, "agent-vega", "contributed_by", 0.85, "vega"));
    edges.push(edge(id, "memory-core", "influences", 0.7, "vega"));
    // tie each insight to a client to show knowledge flow
    const target = mockClients[i % Math.max(1, Math.min(6, mockClients.length))];
    if (target) edges.push(edge(id, `client-${target.id}`, "derived_from", 0.6, "vega"));
  });

  // A recommendation node (mirrors the recommendations feed)
  nodes.push(
    node("rec-1", "recommendation", "Shift storm-season budget earlier", {
      summary: "Front-load roofing budgets 2 weeks before forecasted storms.",
      confidence: 0.66,
      source_agent: "vega",
      created_at: iso(2 * HOUR),
      updated_at: iso(40 * MINUTE),
    })
  );
  edges.push(edge("rec-1", "insight-cpl", "derived_from", 0.7, "vega"));
  edges.push(edge("rec-1", "agent-vega", "contributed_by", 0.9, "vega"));

  return { nodes, edges };
}

// ─────────────────────────────────────────────────────────────
// Mock activity feed — fresh on every call
// ─────────────────────────────────────────────────────────────

export function buildMockActivity(limit = 30): VaultActivityRow[] {
  const items: Array<[number, string, VaultActivityRow["kind"], string]> = [
    [4 * MINUTE, "vega", "analysis", "Vega analyzed 6 client accounts for cross-account performance patterns."],
    [12 * MINUTE, "vega", "insight", "Vega connected a new CPL pattern across 3 roofing clients."],
    [38 * MINUTE, "vega", "recommendation", "Vega generated a budget-timing recommendation for storm season."],
    [1 * HOUR + 5 * MINUTE, "vega", "memory_update", "Vega updated 4 campaign nodes with refreshed performance metadata."],
    [2 * HOUR, "vega", "monitor", "Vega completed an hourly performance sweep — no anomalies detected."],
    [3 * HOUR + 17 * MINUTE, "vega", "insight", "Vega discovered a booking-rate correlation with response time."],
    [5 * HOUR, "vega", "analysis", "Vega studied workforce outputs and refreshed intelligence priorities."],
    [8 * HOUR, "vega", "memory_update", "Vega expanded the knowledge graph with 3 new relationships."],
    [14 * HOUR, "vega", "monitor", "Vega ran an overnight intelligence cycle while the team was asleep."],
    [22 * HOUR, "vega", "analysis", "Vega reconciled revenue events against campaign performance."],
  ];

  return items.slice(0, limit).map(([offset, agent, kind, message], i) => ({
    id: nid(`activity-${i}`),
    agent,
    kind,
    message,
    node_id: null,
    metadata: {},
    created_at: iso(offset),
  }));
}

// ─────────────────────────────────────────────────────────────
// Mock recommendations
// ─────────────────────────────────────────────────────────────

export function buildMockRecommendations(): VaultRecommendationRow[] {
  const sampleClients = mockClients.slice(0, 2).map((c) => c.id);
  return [
    {
      id: nid("rec-1"),
      agent: "vega",
      title: "Shift storm-season budget earlier",
      body: "Front-load roofing budgets ~2 weeks before forecasted storms based on the cross-client CPL pattern.",
      impact: "Est. 10–18% lower CPL during peak demand windows",
      priority_score: 0.82,
      status: "pending_review",
      node_id: nid("rec-1"),
      metadata: { confidence: 0.73 },
      created_at: iso(2 * HOUR),
      influence_score: 0.78,
      revenue_impact: "+$8–14k/mo across roofing accounts",
      related_clients: sampleClients,
      related_campaigns: [],
      related_conversations: [],
      related_node_ids: [nid("insight-cpl"), nid("rec-1")],
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      implemented_at: null,
    },
    {
      id: nid("rec-2"),
      agent: "vega",
      title: "Tighten first-response SLA",
      body: "Booking rate rises ~12% when first text lands under 5 minutes; recommend an SLA + alerting.",
      impact: "Est. +12% booked calls",
      priority_score: 0.74,
      status: "approved",
      node_id: null,
      metadata: { confidence: 0.69 },
      created_at: iso(26 * HOUR),
      influence_score: 0.64,
      revenue_impact: "+~$5k/mo pipeline",
      related_clients: sampleClients.slice(0, 1),
      related_campaigns: [],
      related_conversations: [],
      related_node_ids: [nid("insight-book")],
      reviewed_by: "Nick (admin)",
      reviewed_at: iso(3 * HOUR),
      review_notes: "Approved — ops to draft the SLA. No external action taken.",
      implemented_at: null,
    },
  ];
}

// Seeded review history for the mock recommendations (illustrates retention).
export function buildMockRecommendationReviews(
  recommendationId?: string
): VaultRecommendationReviewRow[] {
  const all: VaultRecommendationReviewRow[] = [
    {
      id: nid("review-1"),
      recommendation_id: nid("rec-2"),
      action: "approve",
      from_status: "pending_review",
      to_status: "approved",
      actor: "Nick (admin)",
      notes: "Approved — ops to draft the SLA. No external action taken.",
      created_at: iso(3 * HOUR),
    },
  ];
  return recommendationId ? all.filter((r) => r.recommendation_id === recommendationId) : all;
}

// ─────────────────────────────────────────────────────────────
// Mock agent runs (Workforce Health)
// ─────────────────────────────────────────────────────────────

export function buildMockAgentRuns(): VaultAgentRunRow[] {
  return [
    {
      id: nid("run-1"),
      agent: "vega",
      tier: "hourly",
      status: "success",
      nodes_created: 2,
      edges_created: 3,
      recommendations_created: 1,
      activity_created: 4,
      duration_ms: 1840,
      detail: "Hourly intelligence sweep across 6 client accounts.",
      started_at: iso(12 * MINUTE),
      finished_at: iso(12 * MINUTE - 1840),
    },
  ];
}
