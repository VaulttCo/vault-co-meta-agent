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

// ── Collaborations ────────────────────────────────────────────
export function buildMockCollaborations(): AgentCollaborationRow[] {
  return [
    {
      id: COLLAB_ID,
      title: "Competitor offer-structure shift",
      initiator: "victoria",
      participants: ["victoria", "vega", "veronica", "vanessa"],
      status: "resolved",
      summary:
        "Victoria flagged competitor agencies moving to a performance-guarantee offer. Vega confirmed a CPL impact pattern; Veronica mapped lead implications; Vanessa shaped the strategic recommendation.",
      joint_recommendation_id: null,
      related_node_ids: [],
      created_at: iso(5 * HOUR),
      resolved_at: iso(2 * HOUR),
    },
    {
      id: mid("collab-hook-rotation"),
      title: "Hook fatigue across roofing accounts",
      initiator: "victoria",
      participants: ["victoria", "vega"],
      status: "in_progress",
      summary: "Victoria detected declining CTR on long-running hooks; requested Vega impact analysis.",
      joint_recommendation_id: null,
      related_node_ids: [],
      created_at: iso(40 * MIN),
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
    m("1", "victoria", null, "share_discovery", "Competitor offer-structure shift",
      "Three competitor agencies moved to a performance-guarantee offer this week.", 5 * HOUR),
    m("2", "victoria", "vega", "request_analysis", "Requesting impact analysis",
      "Vega — can you quantify the likely CPL / conversion impact if our roofing clients matched this?", 4.7 * HOUR),
    m("3", "vega", "victoria", "response", "Pattern confirmed",
      "Confirmed: accounts on guarantee-style messaging show ~14% lower CPL in the sample.", 4.2 * HOUR),
    m("4", "veronica", null, "share_context", "Lead implications mapped",
      "Guarantee offers raise lead intent but add a qualification step; booking flow needs a tweak.", 3.4 * HOUR),
    m("5", "vanessa", null, "joint_proposal", "Strategic recommendation drafted",
      "Packaging this into a joint recommendation for the Command Hub. High strategic value.", 2.2 * HOUR),
    m("6", "victoria", "vega", "request_analysis", "Hook fatigue check",
      "CTR sliding on long-running hooks — can you confirm the decay rate?", 40 * MIN, mid("collab-hook-rotation")),
  ];
}

// ── Tasks ─────────────────────────────────────────────────────
export function buildMockTasks(): AgentTaskRow[] {
  return [
    {
      id: mid("task-1"),
      assigned_to: "vega",
      assigned_by: "victoria",
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
      assigned_by: "victoria",
      title: "Measure hook CTR decay rate",
      detail: "Determine how quickly CTR declines on hooks older than 3 weeks.",
      status: "in_progress",
      collaboration_id: mid("collab-hook-rotation"),
      related_node_ids: [],
      created_at: iso(38 * MIN),
      completed_at: null,
    },
  ];
}

// ── Objectives (canonical seed, used for mock + DB seeding) ────
export const DEFAULT_OBJECTIVES: Record<string, Array<{ objective: string; metric: string; progress: number }>> = {
  veronica: [
    { objective: "Increase booking insights", metric: "insights / week", progress: 0.42 },
    { objective: "Improve follow-up intelligence", metric: "follow-up patterns", progress: 0.35 },
    { objective: "Reduce missed opportunity rate", metric: "% missed", progress: 0.28 },
  ],
  victoria: [
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
    { objective: "Improve financial visibility", metric: "coverage", progress: 0.33 },
    { objective: "Detect anomalies", metric: "anomalies flagged", progress: 0.4 },
    { objective: "Improve forecasting accuracy", metric: "forecast accuracy", progress: 0.29 },
  ],
  vega: [
    { objective: "Increase intelligence quality", metric: "avg confidence", progress: 0.72 },
    { objective: "Increase recommendation accuracy", metric: "adoption rate", progress: 0.68 },
    { objective: "Increase knowledge graph value", metric: "relationship density", progress: 0.7 },
  ],
  vanessa: [
    { objective: "Improve workforce performance", metric: "workforce score", progress: 0.55 },
    { objective: "Improve strategic alignment", metric: "alignment index", progress: 0.5 },
    { objective: "Improve recommendation quality", metric: "quality score", progress: 0.58 },
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
  victoria: { trust_score: 94, accuracy_score: 89, adoption_rate: 84, influence_score: 86, knowledge_contributions: 128, revenue_influence: 217000, collaboration_score: 91 },
  veronica: { trust_score: 71, accuracy_score: 68, adoption_rate: 55, influence_score: 64, knowledge_contributions: 22, revenue_influence: 41000, collaboration_score: 60 },
  vanessa:  { trust_score: 78, accuracy_score: 74, adoption_rate: 62, influence_score: 80, knowledge_contributions: 18, revenue_influence: 96000, collaboration_score: 76 },
  valerie:  { trust_score: 64, accuracy_score: 61, adoption_rate: 48, influence_score: 58, knowledge_contributions: 9, revenue_influence: 23000, collaboration_score: 44 },
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
      problem: "Victoria's competitor findings are scattered across activity and memory with no dedicated view.",
      impact: "Operators can't quickly see competitor moves, slowing strategic response.",
      opportunity: "A focused dashboard would make competitive shifts immediately visible.",
      solution: "A /competitor-intel route rendering Victoria's competitor nodes + offer/hook trends.",
      technical_requirements: "New read API over competitor-category nodes; reuse the graph + VaultUI.",
      ui_requirements: "Veronica Design dashboard: offer-shift timeline, hook leaderboard, competitor cards.",
      estimated_effort: "M (~2 days)",
      priority_score: 0.76,
      expected_outcome: "Faster competitive response; higher Victoria adoption rate.",
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
