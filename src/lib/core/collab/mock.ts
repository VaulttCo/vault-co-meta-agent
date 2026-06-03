// Vault Core — seeded mock data for the Workforce Collaboration Engine (Phase 3).
//
// MANDATORY FALLBACK: when the Phase 3 tables / Supabase env are absent, every
// collaboration read serves from here so /workforce and /proposals feel alive —
// executives collaborating, reputation earned, objectives in flight.

import { WORKFORCE } from "../agents/registry";
import type {
  AgentMessageRow,
  AgentTaskRow,
  AgentCollaborationRow,
  AgentObjectiveRow,
  AgentReputationRow,
  SystemProposalRow,
  CollaborationFeedItem,
} from "../types";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const iso = (ago: number) => new Date(Date.now() - ago).toISOString();
const mid = (s: string) => `mock-${s}`;

const COLLAB_ID = mid("collab-offer-shift");
const VAL_COLLAB_ID = mid("collab-payment-risk");
const VER_COLLAB_ID = mid("collab-sms-pattern");

// ── Collaborations ────────────────────────────────────────────
export function buildMockCollaborations(): AgentCollaborationRow[] {
  return [
    {
      id: COLLAB_ID,
      title: "Competitor offer-structure shift",
      initiator: "valentina",
      participants: ["valentina", "vega", "veronica", "vanessa"],
      status: "resolved",
      summary:
        "Valentina flagged competitor agencies moving to a performance-guarantee offer. Vega confirmed a CPL impact pattern; Veronica mapped lead implications; Vanessa shaped the strategic recommendation.",
      joint_recommendation_id: null,
      related_node_ids: [],
      created_at: iso(5 * HOUR),
      resolved_at: iso(2 * HOUR),
    },
    {
      id: mid("collab-hook-rotation"),
      title: "Hook fatigue across roofing accounts",
      initiator: "valentina",
      participants: ["valentina", "vega"],
      status: "in_progress",
      summary: "Valentina detected declining CTR on long-running hooks; requested Vega impact analysis.",
      joint_recommendation_id: null,
      related_node_ids: [],
      created_at: iso(40 * MIN),
      resolved_at: null,
    },
    {
      id: VAL_COLLAB_ID,
      title: "Payment risk — cross-system confidence check",
      initiator: "valerie",
      participants: ["valerie", "vega"],
      status: "in_progress",
      summary: "Valerie flagged open/past-due invoices and requested Vega corroborate the cash-flow risk before escalating a joint recommendation.",
      joint_recommendation_id: null,
      related_node_ids: [],
      created_at: iso(25 * MIN),
      resolved_at: null,
    },
    {
      id: VER_COLLAB_ID,
      title: "SMS booking pattern — validation",
      initiator: "veronica",
      participants: ["veronica", "vega"],
      status: "in_progress",
      summary: "Veronica surfaced a response-time → booking pattern and requested Vega validate it across available conversation data.",
      joint_recommendation_id: null,
      related_node_ids: [],
      created_at: iso(18 * MIN),
      resolved_at: null,
    },
  ];
}

// ── Messages (the example-flow thread) ────────────────────────
export function buildMockMessages(): AgentMessageRow[] {
  const m = (
    s: string,
    from: string,
    to: string | null,
    kind: AgentMessageRow["kind"],
    subject: string,
    body: string,
    ago: number,
    collab: string | null = COLLAB_ID
  ): AgentMessageRow => ({
    id: mid(`msg-${s}`),
    from_agent: from,
    to_agent: to,
    kind,
    subject,
    body,
    related_node_ids: [],
    collaboration_id: collab,
    read_at: null,
    created_at: iso(ago),
  });

  return [
    m("1", "valentina", null, "share_discovery", "Competitor offer-structure shift",
      "Three competitor agencies moved to a performance-guarantee offer this week.", 5 * HOUR),
    m("2", "valentina", "vega", "request_analysis", "Requesting impact analysis",
      "Vega — can you quantify the likely CPL / conversion impact if our roofing clients matched this?", 4.7 * HOUR),
    m("3", "vega", "valentina", "response", "Pattern confirmed",
      "Confirmed: accounts on guarantee-style messaging show ~14% lower CPL in the sample.", 4.2 * HOUR),
    m("4", "veronica", null, "share_context", "Lead implications mapped",
      "Guarantee offers raise lead intent but add a qualification step; booking flow needs a tweak.", 3.4 * HOUR),
    m("5", "vanessa", null, "joint_proposal", "Strategic recommendation drafted",
      "Packaging this into a joint recommendation for the Command Hub. High strategic value.", 2.2 * HOUR),
    m("6", "valentina", "vega", "request_analysis", "Hook fatigue check",
      "CTR sliding on long-running hooks — can you confirm the decay rate?", 40 * MIN, mid("collab-hook-rotation")),
    m("7", "valerie", null, "share_discovery", "Payment risk detected",
      "Several invoices are open/past-due this cycle — flagging cash-flow risk.", 25 * MIN, VAL_COLLAB_ID),
    m("8", "valerie", "vega", "request_analysis", "Confirm payment-risk impact",
      "Vega — corroborate the at-risk invoice signal against cross-system patterns before we escalate.", 22 * MIN, VAL_COLLAB_ID),
    m("9", "vanessa", null, "share_context", "Executive priorities updated",
      "Today's top priorities: Review unpaid/open invoices (critical); Replicate winning creative angle (high).", 15 * MIN, null),
    m("10", "veronica", null, "share_discovery", "Hot lead awaiting follow-up",
      "High-intent inbound (hail damage) with no reply yet — drafted a same-day follow-up for approval.", 18 * MIN, null),
    m("11", "veronica", "vega", "request_analysis", "Validate SMS booking pattern",
      "Vega — confirm the response-time → booking correlation across conversation data.", 16 * MIN, VER_COLLAB_ID),
  ];
}

// ── Tasks ─────────────────────────────────────────────────────
export function buildMockTasks(): AgentTaskRow[] {
  return [
    {
      id: mid("task-1"),
      assigned_to: "vega",
      assigned_by: "valentina",
      title: "Quantify guarantee-offer CPL impact",
      detail: "Compare CPL on guarantee-style vs standard messaging across roofing accounts.",
      status: "done",
      collaboration_id: COLLAB_ID,
      related_node_ids: [],
      created_at: iso(4.6 * HOUR),
      completed_at: iso(4.2 * HOUR),
    },
    {
      id: mid("task-2"),
      assigned_to: "vega",
      assigned_by: "valentina",
      title: "Measure hook CTR decay rate",
      detail: "Determine how quickly CTR declines on hooks older than 3 weeks.",
      status: "in_progress",
      collaboration_id: mid("collab-hook-rotation"),
      related_node_ids: [],
      created_at: iso(38 * MIN),
      completed_at: null,
    },
    {
      id: mid("task-3"),
      assigned_to: "vega",
      assigned_by: "valerie",
      title: "Validate payment-risk signal",
      detail: "Cross-check Valerie's at-risk invoice signal against performance/conversion data.",
      status: "in_progress",
      collaboration_id: VAL_COLLAB_ID,
      related_node_ids: [],
      created_at: iso(22 * MIN),
      completed_at: null,
    },
  ];
}

// ── Objectives (canonical seed, used for mock + DB seeding) ────
export const DEFAULT_OBJECTIVES: Record<string, Array<{ objective: string; metric: string; progress: number }>> = {
  veronica: [
    { objective: "Improve booking intelligence", metric: "booking insights", progress: 0.6 },
    { objective: "Identify missed opportunities", metric: "missed flagged", progress: 0.55 },
    { objective: "Improve follow-up recommendations", metric: "follow-up recs", progress: 0.5 },
    { objective: "Improve reactivation intelligence", metric: "reactivations found", progress: 0.46 },
    { objective: "Increase conversation insight accuracy", metric: "insight accuracy", progress: 0.62 },
    { objective: "Increase lead-to-appointment learning", metric: "lead→appt patterns", progress: 0.48 },
    { objective: "Improve objection pattern detection", metric: "objection patterns", progress: 0.52 },
  ],
  valentina: [
    { objective: "Discover winning content", metric: "winning patterns", progress: 0.61 },
    { objective: "Discover winning offers", metric: "offers analyzed", progress: 0.54 },
    { objective: "Improve script quality", metric: "script score", progress: 0.47 },
    { objective: "Increase content intelligence", metric: "content nodes", progress: 0.66 },
  ],
  vivian: [
    { objective: "Improve operational efficiency", metric: "efficiency index", progress: 0.3 },
    { objective: "Reduce bottlenecks", metric: "bottlenecks resolved", progress: 0.22 },
    { objective: "Improve onboarding quality", metric: "onboarding score", progress: 0.18 },
  ],
  valerie: [
    { objective: "Improve financial visibility", metric: "coverage", progress: 0.58 },
    { objective: "Detect payment risk", metric: "at-risk invoices flagged", progress: 0.52 },
    { objective: "Improve forecasting accuracy", metric: "forecast accuracy", progress: 0.44 },
    { objective: "Improve partner earnings clarity", metric: "split visibility", progress: 0.6 },
    { objective: "Identify revenue leakage", metric: "leakage found", progress: 0.38 },
    { objective: "Increase financial recommendation accuracy", metric: "adoption rate", progress: 0.5 },
  ],
  vega: [
    { objective: "Increase intelligence quality", metric: "avg confidence", progress: 0.72 },
    { objective: "Increase recommendation accuracy", metric: "adoption rate", progress: 0.68 },
    { objective: "Increase knowledge graph value", metric: "relationship density", progress: 0.7 },
  ],
  vanessa: [
    { objective: "Improve strategic alignment", metric: "alignment index", progress: 0.62 },
    { objective: "Improve recommendation prioritization", metric: "prioritized / total", progress: 0.7 },
    { objective: "Improve workforce performance", metric: "workforce score", progress: 0.58 },
    { objective: "Reduce decision overload", metric: "items surfaced vs total", progress: 0.55 },
    { objective: "Increase executive clarity", metric: "brief clarity score", progress: 0.66 },
    { objective: "Increase high-impact recommendation adoption", metric: "high-impact adoption", progress: 0.6 },
  ],
};

export function buildMockObjectives(): AgentObjectiveRow[] {
  const out: AgentObjectiveRow[] = [];
  for (const [agent, list] of Object.entries(DEFAULT_OBJECTIVES)) {
    list.forEach((o, i) => {
      out.push({
        id: mid(`obj-${agent}-${i}`),
        agent,
        objective: o.objective,
        metric: o.metric,
        target: 1,
        progress: o.progress,
        period: "quarter",
        updated_at: iso(3 * HOUR),
      });
    });
  }
  return out;
}

// ── Reputation (seeded; active agents have richer histories) ──
const REP_SEED: Record<string, Omit<AgentReputationRow, "agent" | "updated_at">> = {
  vega:     { trust_score: 92, accuracy_score: 88, adoption_rate: 81, influence_score: 90, knowledge_contributions: 146, revenue_influence: 184000, collaboration_score: 87 },
  valentina: { trust_score: 94, accuracy_score: 89, adoption_rate: 84, influence_score: 86, knowledge_contributions: 128, revenue_influence: 217000, collaboration_score: 91 },
  valerie:  { trust_score: 88, accuracy_score: 85, adoption_rate: 77, influence_score: 83, knowledge_contributions: 64, revenue_influence: 241000, collaboration_score: 79 },
  veronica: { trust_score: 87, accuracy_score: 83, adoption_rate: 76, influence_score: 82, knowledge_contributions: 58, revenue_influence: 198000, collaboration_score: 85 },
  vanessa:  { trust_score: 90, accuracy_score: 86, adoption_rate: 80, influence_score: 91, knowledge_contributions: 73, revenue_influence: 263000, collaboration_score: 93 },
  vivian:   { trust_score: 60, accuracy_score: 57, adoption_rate: 44, influence_score: 52, knowledge_contributions: 7, revenue_influence: 12000, collaboration_score: 41 },
};

export function buildMockReputation(): AgentReputationRow[] {
  return WORKFORCE.map((a) => {
    const s = REP_SEED[a.id] ?? REP_SEED.vivian;
    return { agent: a.id, ...s, updated_at: iso(2 * HOUR) };
  });
}

// ── System proposals (System Creation Engine V1) ──────────────
export function buildMockProposals(): SystemProposalRow[] {
  return [
    {
      id: mid("prop-1"),
      agent: "vega",
      title: "Add a Competitor Intelligence dashboard",
      category: "missing_dashboard",
      problem: "Valentina's competitor findings are scattered across activity and memory with no dedicated view.",
      impact: "Operators can't quickly see competitor moves, slowing strategic response.",
      opportunity: "A focused dashboard would make competitive shifts immediately visible.",
      solution: "A /competitor-intel route rendering Valentina's competitor nodes + offer/hook trends.",
      technical_requirements: "New read API over competitor-category nodes; reuse the graph + VaultUI.",
      ui_requirements: "Veronica Design dashboard: offer-shift timeline, hook leaderboard, competitor cards.",
      estimated_effort: "M (~2 days)",
      priority_score: 0.76,
      expected_outcome: "Faster competitive response; higher Valentina adoption rate.",
      status: "pending_review",
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      related_node_ids: [],
      collaboration_id: COLLAB_ID,
      created_at: iso(2 * HOUR),
    },
    {
      id: mid("prop-2"),
      agent: "vanessa",
      title: "Auto-generate a daily executive briefing",
      category: "missing_automation",
      problem: "There is no single morning summary of overnight workforce activity.",
      impact: "Leadership lacks a consolidated view of what the workforce did while they slept.",
      opportunity: "A daily-tier briefing would surface the '3:17 AM' work each morning.",
      solution: "A daily dispatcher step that compiles activity + recommendations into a briefing node.",
      technical_requirements: "Daily tier task; briefing builder over vault_activity + recommendations.",
      ui_requirements: "Executive Briefing card on the Command Hub; Obsidian export via /vanessa.",
      estimated_effort: "S (~1 day)",
      priority_score: 0.68,
      expected_outcome: "Daily strategic visibility; stronger human oversight.",
      status: "pending_review",
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      related_node_ids: [],
      collaboration_id: null,
      created_at: iso(7 * HOUR),
    },
  ];
}

// ── Unified collaboration feed ────────────────────────────────
export function buildMockFeed(): CollaborationFeedItem[] {
  return toFeed(buildMockMessages(), buildMockCollaborations(), buildMockTasks());
}

const KIND_VERB: Record<string, string> = {
  share_discovery: "shared a discovery",
  request_analysis: "requested analysis from",
  escalate: "escalated to",
  share_context: "shared context",
  assign_investigation: "assigned an investigation to",
  joint_proposal: "drafted a joint proposal",
  response: "responded to",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function toFeed(
  messages: AgentMessageRow[],
  collaborations: AgentCollaborationRow[],
  tasks: AgentTaskRow[]
): CollaborationFeedItem[] {
  const items: CollaborationFeedItem[] = [];

  for (const m of messages) {
    const verb = KIND_VERB[m.kind] ?? "messaged";
    const tail = m.to_agent ? ` ${cap(m.to_agent)}` : " the workforce";
    items.push({
      id: m.id,
      type: "message",
      agent: m.from_agent,
      target: m.to_agent,
      kind: m.kind,
      text: `${cap(m.from_agent)} ${verb}${m.to_agent ? tail : ""}: ${m.subject}`,
      collaboration_id: m.collaboration_id,
      created_at: m.created_at,
    });
  }
  for (const c of collaborations) {
    items.push({
      id: c.id,
      type: "collaboration",
      agent: c.initiator,
      target: null,
      kind: c.status,
      text:
        c.status === "resolved"
          ? `Collaboration resolved: ${c.title} (${c.participants.map(cap).join(" · ")})`
          : `Collaboration ${c.status}: ${c.title}`,
      collaboration_id: c.id,
      created_at: c.created_at,
    });
  }
  for (const t of tasks) {
    items.push({
      id: t.id,
      type: "task",
      agent: t.assigned_by,
      target: t.assigned_to,
      kind: t.status,
      text: `${cap(t.assigned_by)} assigned ${cap(t.assigned_to)}: ${t.title} (${t.status.replace("_", " ")})`,
      collaboration_id: t.collaboration_id,
      created_at: t.created_at,
    });
  }

  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
