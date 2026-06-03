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
import { identityNodeSpecs } from "../identity/vault-co-identity";
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

  // A few hooks / scripts Valentina-style knowledge (static, illustrative)
  const hooks = [
    ["hook-1", "“Booked solid in 30 days” roofing hook"],
    ["hook-2", "Storm-season urgency hook"],
  ];
  for (const [id, label] of hooks) {
    nodes.push(node(id, "hook", label, { confidence: 0.72, source_agent: "valentina" }));
    edges.push(edge(id, "memory-core", "connected_to", 0.5, "valentina"));
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

  // Financial intelligence nodes (Valerie, Phase 4)
  const financial: Array<[string, VaultNodeCategory, string, string]> = [
    ["fin-trend", "revenue_trend", "Revenue concentration: top client 41% of revenue", "Tracked revenue concentrated in one account — dependency risk."],
    ["fin-risk", "payment_risk", "2 invoices at risk · $7,000", "Open/past-due invoice statuses detected this cycle."],
    ["fin-partner", "partner_earnings_signal", "Partner earnings · Nick $3,010 / Jaxon $3,990", "Recurring partner-split visibility across snapshots."],
  ];
  financial.forEach(([id, cat, label, summary], i) => {
    nodes.push(
      node(id, cat, label, {
        summary,
        confidence: 0.74 + i * 0.02,
        source_agent: "valerie",
        created_at: iso((i + 1) * 4 * HOUR),
        updated_at: iso((i + 1) * 25 * MINUTE),
      })
    );
    edges.push(edge(id, "agent-valerie", "contributed_by", 0.88, "valerie"));
    edges.push(edge(id, "memory-core", "influences", 0.65, "valerie"));
  });
  // Tie payment risk to a client to show traceability
  const riskClient = mockClients[0];
  if (riskClient) edges.push(edge("fin-risk", `client-${riskClient.id}`, "related_to", 0.7, "valerie"));

  // Executive oversight nodes (Vanessa, Phase 5)
  const executive: Array<[string, VaultNodeCategory, string, string]> = [
    ["exec-brief", "executive_brief", `Daily Executive Brief — ${new Date().toISOString().slice(0, 10)}`, "Synthesized workforce intelligence: 3 open recommendations, 1 critical financial risk, 1 marketing opportunity."],
    ["exec-priority-1", "executive_priority", "[CRITICAL] Review unpaid / open client invoices", "Prioritized critical — financial risk with revenue exposure. Source: valerie."],
    ["risk-summary", "risk_summary", "Top risks (2)", "Open/past-due invoices ($7k) · revenue concentration 41%."],
    ["opportunity-summary", "opportunity_summary", "Top opportunities (1)", "Replicate winning creative angle across lagging accounts."],
    ["workforce-perf", "workforce_performance_summary", "Workforce performance summary", "Valentina (trust 94) · Vega (92) · Valerie (88) leading on trust + adoption."],
  ];
  executive.forEach(([id, cat, label, summary], i) => {
    nodes.push(
      node(id, cat, label, {
        summary,
        confidence: 0.8 - i * 0.02,
        source_agent: "vanessa",
        created_at: iso((i + 1) * 35 * MINUTE),
        updated_at: iso((i + 1) * 10 * MINUTE),
      })
    );
    edges.push(edge(id, "agent-vanessa", "contributed_by", 0.9, "vanessa"));
    edges.push(edge(id, "memory-core", "influences", 0.7, "vanessa"));
  });
  // Vanessa synthesizes across the workforce: brief references the financial risk + a Vega insight
  edges.push(edge("exec-priority-1", "fin-risk", "supports", 0.8, "vanessa"));
  edges.push(edge("exec-brief", "insight-cpl", "related_to", 0.6, "vanessa"));
  edges.push(edge("risk-summary", "fin-trend", "related_to", 0.7, "vanessa"));

  // Conversation intelligence nodes (Veronica, Phase 6)
  const conversation: Array<[string, VaultNodeCategory, string, string]> = [
    ["convo-insight", "conversation_insight", "Conversation intelligence: 2 hot · 2 dead · 25% booked", "Reviewed 8 lead conversations — hot leads need follow-up, dead conversations are reactivation candidates."],
    ["sms-pattern-1", "sms_pattern", "Fast response on hot leads lifts booking", "Hot inbound contacted within the hour books at a higher rate; urgency-framed confirmations reduce no-shows."],
    ["hot-lead-1", "hot_lead_signal", "Hot lead needs follow-up: Roofing — M. Alvarez", "High-intent inbound (hail damage) awaiting reply."],
    ["reactivation-1", "reactivation_opportunity", "Reactivation: Roofing — P. Sterling (34d cold)", "Dead conversation worth a seasonal re-engagement touch."],
    ["appt-risk-1", "appointment_risk", "No-show recovery: HVAC — J. Carter", "Booked lead missed the appointment — recovery window open."],
    ["sms-draft-1", "sms_draft", "follow up draft · Roofing — M. Alvarez", "Same-day scheduling reply drafted for human approval."],
  ];
  conversation.forEach(([id, cat, label, summary], i) => {
    nodes.push(
      node(id, cat, label, {
        summary,
        confidence: 0.78 - i * 0.02,
        source_agent: "veronica",
        created_at: iso((i + 1) * 22 * MINUTE),
        updated_at: iso((i + 1) * 8 * MINUTE),
      })
    );
    edges.push(edge(id, "agent-veronica", "contributed_by", 0.9, "veronica"));
    edges.push(edge(id, "memory-core", "influences", 0.65, "veronica"));
  });
  // Traceability: draft requires approval (→ Command Hub / memory core); pattern ties to a lead
  edges.push(edge("sms-draft-1", "memory-core", "requires_approval", 0.9, "veronica"));
  edges.push(edge("hot-lead-1", "sms-pattern-1", "supports", 0.7, "veronica"));
  const leadClient = mockClients[1];
  if (leadClient) edges.push(edge("convo-insight", `client-${leadClient.id}`, "related_to", 0.6, "veronica"));

  // Vault Co Identity Core nodes (Phase 6.8) — company DNA, defines the company.
  identityNodeSpecs().forEach((spec, i) => {
    nodes.push(
      node(`identity-${spec.key}`, spec.category, spec.label, {
        summary: spec.summary,
        confidence: 0.95,
        source_agent: "vault_co",
        created_at: iso(20 * DAY),
        updated_at: iso((i + 1) * 20 * MINUTE),
        metadata: { identity: true },
      })
    );
    edges.push(edge(`identity-${spec.key}`, "memory-core", "defines", 0.8, "vault_co"));
  });

  // Legacy GHL learning nodes (Phase 6.8) — historical lessons.
  const legacyLearnings: Array<[string, string, string]> = [
    ["legacy-followup", "“Just following up” texts were ignored", "Generic check-ins with no new value or specific ask were the most-ghosted legacy messages."],
    ["legacy-timing", "Late missed-call texts lost the lead", "Missed-call follow-up sent hours late (not minutes) missed the intent window."],
    ["legacy-reactivation", "Reactivation flow was too aggressive", "Daily reactivation texts drove opt-outs; cadence was not value-led."],
    ["legacy-price", "“Price seems high” handled with discounts", "Historically met with price drops instead of reframing to cost-per-booked-job."],
  ];
  legacyLearnings.forEach(([id, label, summary], i) => {
    nodes.push(
      node(id, "legacy_learning", label, {
        summary,
        confidence: 0.72,
        source_agent: "veronica",
        created_at: iso((i + 1) * 8 * HOUR),
        updated_at: iso((i + 1) * 45 * MINUTE),
        metadata: { legacy: true },
      })
    );
    edges.push(edge(id, "memory-core", "influences", 0.6, "veronica"));
  });
  edges.push(edge("legacy-followup", "identity-messaging_principle", "supports", 0.7, "veronica"));

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
      vanessa_priority: "high",
      priority_reason: "quantified revenue impact · high agent priority",
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
      vanessa_priority: "medium",
      priority_reason: "quantified revenue impact",
    },
    {
      id: nid("rec-fin-1"),
      agent: "valerie",
      title: "Review unpaid / open client invoices",
      body: "2 invoices show at-risk status (open / past-due) this cycle. Recommend a human review of collection status. Valerie cannot send, charge, or modify Stripe — review only.",
      impact: "Cash-flow risk if unresolved",
      priority_score: 0.85,
      status: "pending_review",
      node_id: nid("fin-risk"),
      metadata: { confidence: 0.8, suggested_human_action: "Review Stripe invoice status; follow up on collection." },
      created_at: iso(90 * MINUTE),
      influence_score: 0.72,
      revenue_impact: "$7,000 at risk",
      related_clients: sampleClients,
      related_campaigns: [],
      related_conversations: [],
      related_node_ids: [nid("fin-risk"), nid("fin-trend")],
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      implemented_at: null,
      vanessa_priority: "critical",
      priority_reason: "financial risk with revenue exposure · high agent priority · awaiting human review",
    },
    {
      id: nid("rec-exec-1"),
      agent: "vanessa",
      title: "Executive priority: Review unpaid / open client invoices",
      body: "Vanessa flagged this as the top executive priority (critical). Financial risk with revenue exposure, awaiting human review. Source agent: valerie. Recommend prioritizing human review.",
      impact: "Highest-value item this cycle",
      priority_score: 0.9,
      status: "pending_review",
      node_id: nid("exec-brief"),
      metadata: { confidence: 0.85, executive: true, references_recommendation: nid("rec-fin-1") },
      created_at: iso(30 * MINUTE),
      influence_score: 0.85,
      revenue_impact: "$7,000 at risk",
      related_clients: sampleClients,
      related_campaigns: [],
      related_conversations: [],
      related_node_ids: [nid("exec-brief"), nid("fin-risk")],
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      implemented_at: null,
      vanessa_priority: "critical",
      priority_reason: "financial risk with revenue exposure · cross-agent validated",
    },
    {
      id: nid("rec-convo-1"),
      agent: "veronica",
      title: "Review hot lead needing follow-up",
      body: "Roofing — M. Alvarez sent a high-intent message (hail damage) with no reply yet. A drafted same-day follow-up is ready for approval. No message will be sent automatically.",
      impact: "Booking risk if the lead goes cold",
      priority_score: 0.86,
      status: "pending_review",
      node_id: nid("convo-insight"),
      metadata: { confidence: 0.8, suggested_human_action: "Approve/edit the drafted SMS, then send manually. Veronica cannot send." },
      created_at: iso(20 * MINUTE),
      influence_score: 0.74,
      revenue_impact: "Potential booked job",
      related_clients: ["Roofing — M. Alvarez"],
      related_campaigns: [],
      related_conversations: ["lead-001"],
      related_node_ids: [nid("convo-insight"), nid("hot-lead-1"), nid("sms-draft-1")],
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      implemented_at: null,
      vanessa_priority: "high",
      priority_reason: "high-intent lead awaiting human follow-up",
    },
    {
      id: nid("rec-legacy-1"),
      agent: "veronica",
      title: "Stop using weak “just following up” language",
      body: "Legacy Vault Co GHL data shows generic check-ins were the most-ignored messages. Replace with value- or specific-ask follow-ups and update the follow-up framework. Nothing sends automatically.",
      impact: "Higher reply + booking rate on follow-ups",
      priority_score: 0.7,
      status: "pending_review",
      node_id: nid("legacy-followup"),
      metadata: { confidence: 0.75, legacy: true, suggested_human_action: "Adopt into the Vault Co messaging standard." },
      created_at: iso(5 * HOUR),
      influence_score: 0.65,
      revenue_impact: null,
      related_clients: [],
      related_campaigns: [],
      related_conversations: [],
      related_node_ids: [nid("legacy-followup"), nid("identity-messaging_principle")],
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      implemented_at: null,
      vanessa_priority: "medium",
      priority_reason: "company messaging standard · derived from legacy history",
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
