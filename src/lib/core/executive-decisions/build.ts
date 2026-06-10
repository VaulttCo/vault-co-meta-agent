// Vault Core — Executive Decision Center aggregator (server-side, READ-ONLY).
//
// Purpose: owner decision compression. It rolls the most important PENDING
// decisions out of every existing approval queue into one ranked surface so the
// owner can open Vault OS and immediately see what needs a decision, why it
// matters, how long it takes, who it affects, and where to go to act.
//
// It is a LENS over existing systems — it owns no data, defines no statuses, and
// renders no approval controls. Every card deep-links into the queue page that
// already handles review/approval. Nothing here sends, publishes, pushes to
// Meta, touches Hermes, or mutates any external system.
//
// SAFETY: each queue reader is wrapped so a single failure yields an empty list
// instead of breaking the whole surface. With no Supabase it degrades to the
// same mock data the queues themselves use.

import { getRecommendations } from "../memory/db";
import { getProposals } from "../collab/db";
import { getActions } from "../actions/db";
import { getCampaignDrafts } from "../campaign-drafts/db";
import { getWorkflowDrafts } from "../workflows/db";
import { getMessageDrafts } from "../messages/db";
import { getFinanceDrafts } from "../finance-drafts/db";
import { getCreativeBriefs } from "../creative-briefs/db";
import { getDrafts } from "../agents/veronica/drafts";
import { getDataProvider } from "@/lib/data/data-provider";

export type DecisionUrgency = "critical" | "recommended" | "low";

export interface DecisionCard {
  id: string; // `${source}:${rowId}` — stable, unique
  title: string;
  source: string; // queue key (for icon/accent mapping client-side)
  sourceLabel: string; // human label, e.g. "Meta Campaign Drafts"
  href: string; // deep link to the existing review page
  affects: string; // client name or owning system
  whyItMatters: string;
  status: string; // raw status from the source row
  statusLabel: string; // humanized
  urgency: DecisionUrgency;
  minutesToReview: number;
  businessImpact: string | null; // revenue / amount, when the source provides it
  riskLevel: string | null;
}

export interface ExecutiveDecisionCenter {
  generatedAt: string;
  total: number;
  estimatedMinutes: number;
  critical: DecisionCard[];
  recommended: DecisionCard[];
  low: DecisionCard[];
  /** Human labels of queues that failed to read this cycle. Empty = full data.
   *  Lets the UI distinguish a true "all clear" from a degraded read. */
  partialFailures: string[];
}

// Per-source presentation + review-time estimate (minutes/item). Estimates feed
// only the "time to clear" headline — never spend or any external action.
const SOURCE_META: Record<string, { label: string; href: string; minutes: number; base: DecisionUrgency }> = {
  "recommendations":      { label: "Recommendations",      href: "/recommendations",      minutes: 2, base: "recommended" },
  "actions":              { label: "Actions",              href: "/actions",              minutes: 3, base: "recommended" },
  "meta-campaign-drafts": { label: "Meta Campaign Drafts", href: "/meta-campaign-drafts", minutes: 5, base: "recommended" },
  "finance-drafts":       { label: "Finance Drafts",       href: "/finance-drafts",       minutes: 2, base: "recommended" },
  "ghl-workflows":        { label: "GHL Workflow Drafts",  href: "/ghl-workflows",        minutes: 3, base: "low" },
  "creative-briefs":      { label: "Creative Briefs",      href: "/creative-briefs",      minutes: 4, base: "low" },
  "message-drafts":       { label: "Message Drafts",       href: "/message-drafts",       minutes: 2, base: "low" },
  "proposals":            { label: "System Proposals",     href: "/proposals",            minutes: 3, base: "low" },
  "sms-drafts":           { label: "SMS / Follow-Up Drafts", href: "/drafts",             minutes: 1, base: "low" },
};

const URGENCY_RANK: Record<DecisionUrgency, number> = { critical: 3, recommended: 2, low: 1 };
const RANK_URGENCY: Record<number, DecisionUrgency> = { 3: "critical", 2: "recommended", 1: "low" };

function bump(u: DecisionUrgency, steps: number): DecisionUrgency {
  const next = Math.min(3, Math.max(1, URGENCY_RANK[u] + steps));
  return RANK_URGENCY[next];
}

/** Money/admin/high risk escalates a card's urgency one level. */
function riskBoost(risk: string | null | undefined): number {
  if (!risk) return 0;
  return /money|admin_critical|level_3|level_4|high/i.test(risk) ? 1 : 0;
}

/** Map a recommendation's Vanessa priority to a base urgency. */
function urgencyFromVanessa(p: string | null | undefined): DecisionUrgency {
  switch (p) {
    case "critical": return "critical";
    case "high": return "recommended";
    case "medium": return "recommended";
    default: return "low"; // low | watch | null
  }
}

function humanizeStatus(status: string): string {
  return status
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function truncate(s: string | null | undefined, n = 160): string {
  const t = (s ?? "").trim();
  if (!t) return "";
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

const PER_SOURCE_CAP = 40;

export async function getExecutiveDecisionCenter(): Promise<ExecutiveDecisionCenter> {
  // Tracks queues that failed this cycle so the UI can show a degraded-read
  // signal instead of a misleading "all clear".
  const partialFailures: string[] = [];

  /** Read a queue defensively: on failure record the label and return []. */
  async function read<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
    try {
      return await fn();
    } catch {
      partialFailures.push(label);
      return [];
    }
  }

  // Resolve a client-id → name map once (best-effort, mock-safe). A failure here
  // only downgrades client names to system labels — it is not a queue failure.
  const clientNames = new Map<string, string>();
  try {
    const clients = await getDataProvider().getClients();
    for (const c of clients) clientNames.set(c.id, c.name);
  } catch {
    // names fall back to system labels below
  }

  const affectsFor = (clientId: string | null | undefined, systemLabel: string): string => {
    if (clientId && clientNames.has(clientId)) return clientNames.get(clientId)!;
    return systemLabel;
  };

  // Pull pending items from every queue in parallel. Readers that support a
  // status filter are queried for pending rows directly so the per-source cap is
  // never spent on already-decided items; the rest read recent rows and are
  // filtered below. Any single failure is isolated and surfaced via partialFailures.
  const [
    recommendations,
    proposals,
    actions,
    campaigns,
    workflows,
    messages,
    finance,
    briefs,
    sms,
  ] = await Promise.all([
    read("Recommendations", () => getRecommendations(200)),
    read("System Proposals", () => getProposals("pending_review")),
    read("Actions", () => getActions(500)),
    read("Meta Campaign Drafts", () => getCampaignDrafts(500)),
    read("GHL Workflow Drafts", () => getWorkflowDrafts(500)),
    read("Message Drafts", () => getMessageDrafts(500)),
    read("Finance Drafts", () => getFinanceDrafts(500)),
    read("Creative Briefs", () => getCreativeBriefs(500)),
    read("SMS / Follow-Up Drafts", () => getDrafts("draft")),
  ]);

  const cards: DecisionCard[] = [];
  const push = (
    source: string,
    rowId: string,
    title: string,
    affects: string,
    whyItMatters: string,
    status: string,
    urgency: DecisionUrgency,
    businessImpact: string | null,
    riskLevel: string | null,
  ) => {
    const meta = SOURCE_META[source];
    cards.push({
      id: `${source}:${rowId}`,
      title: truncate(title, 120) || "Untitled",
      source,
      sourceLabel: meta.label,
      href: meta.href,
      affects,
      whyItMatters: truncate(whyItMatters) || "Awaiting your review.",
      status,
      statusLabel: humanizeStatus(status),
      urgency,
      minutesToReview: meta.minutes,
      businessImpact: businessImpact ? truncate(businessImpact, 80) : null,
      riskLevel,
    });
  };

  // ── Recommendations (Vanessa-prioritized) ──────────────────────────────────
  for (const r of recommendations.filter((x) => x.status === "pending_review").slice(0, PER_SOURCE_CAP)) {
    push(
      "recommendations",
      r.id,
      r.title,
      r.related_clients?.[0] || affectsFor(null, "Vault Intelligence"),
      r.priority_reason || r.impact || r.body || "",
      r.status,
      urgencyFromVanessa(r.vanessa_priority),
      r.revenue_impact || r.impact || null,
      null,
    );
  }

  // ── System proposals ───────────────────────────────────────────────────────
  for (const p of proposals.filter((x) => x.status === "pending_review").slice(0, PER_SOURCE_CAP)) {
    const base = p.priority_score >= 0.7 ? "recommended" : "low";
    push(
      "proposals",
      p.id,
      p.title,
      "Vault OS",
      p.problem || p.opportunity || p.impact || "",
      p.status,
      base,
      p.expected_outcome || p.impact || null,
      null,
    );
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  for (const a of actions.filter((x) => x.approval_status === "pending_review").slice(0, PER_SOURCE_CAP)) {
    push(
      "actions",
      a.id,
      a.title,
      affectsFor(a.client_id, a.agent_id ? `Agent · ${a.agent_id}` : "Vault Core"),
      a.reason || a.summary || "",
      a.approval_status,
      bump(SOURCE_META["actions"].base, riskBoost(a.risk_level)),
      null,
      a.risk_level ?? null,
    );
  }

  // ── Meta campaign drafts ───────────────────────────────────────────────────
  for (const c of campaigns.filter((x) => x.status === "pending_review").slice(0, PER_SOURCE_CAP)) {
    push(
      "meta-campaign-drafts",
      c.id,
      c.title,
      affectsFor(c.client_id, "Meta Ads"),
      c.description || c.objective || "",
      c.status,
      bump(SOURCE_META["meta-campaign-drafts"].base, riskBoost(c.risk_level)),
      null,
      c.risk_level ?? null,
    );
  }

  // ── Finance drafts ─────────────────────────────────────────────────────────
  for (const f of finance.filter((x) => x.status === "pending_review").slice(0, PER_SOURCE_CAP)) {
    push(
      "finance-drafts",
      f.id,
      f.title,
      affectsFor(f.client_id, "Vault Co Finance"),
      f.description || f.calculation || "",
      f.status,
      bump(SOURCE_META["finance-drafts"].base, riskBoost(f.risk_level)),
      f.amount_summary || null,
      f.risk_level ?? null,
    );
  }

  // ── GHL workflow drafts ────────────────────────────────────────────────────
  for (const w of workflows.filter((x) => x.status === "pending_review").slice(0, PER_SOURCE_CAP)) {
    push(
      "ghl-workflows",
      w.id,
      w.title,
      affectsFor(w.client_id, "GHL"),
      w.description || "",
      w.status,
      bump(SOURCE_META["ghl-workflows"].base, riskBoost(w.risk_level)),
      null,
      w.risk_level ?? null,
    );
  }

  // ── Creative briefs ────────────────────────────────────────────────────────
  for (const b of briefs.filter((x) => x.status === "pending_review").slice(0, PER_SOURCE_CAP)) {
    push(
      "creative-briefs",
      b.id,
      b.title,
      affectsFor(b.client_id, "Creative"),
      b.description || b.objective || "",
      b.status,
      bump(SOURCE_META["creative-briefs"].base, riskBoost(b.risk_level)),
      null,
      b.risk_level ?? null,
    );
  }

  // ── Message drafts ─────────────────────────────────────────────────────────
  for (const m of messages.filter((x) => x.status === "pending_review").slice(0, PER_SOURCE_CAP)) {
    push(
      "message-drafts",
      m.id,
      m.title,
      affectsFor(m.client_id, "Outreach"),
      m.intent || m.subject || "",
      m.status,
      bump(SOURCE_META["message-drafts"].base, riskBoost(m.risk_level)),
      null,
      m.risk_level ?? null,
    );
  }

  // ── Veronica SMS / follow-up drafts ────────────────────────────────────────
  for (const d of sms.filter((x) => x.status === "draft").slice(0, PER_SOURCE_CAP)) {
    push(
      "sms-drafts",
      d.id,
      d.lead_name ? `Follow-up · ${d.lead_name}` : "SMS follow-up draft",
      d.lead_name || "Lead",
      d.rationale || d.conversation_summary || "",
      d.status,
      bump(SOURCE_META["sms-drafts"].base, riskBoost(d.risk_level)),
      null,
      d.risk_level ?? null,
    );
  }

  // Sort within a bucket: money/impact first, then by review time, then title.
  const sortCards = (list: DecisionCard[]) =>
    list.sort((a, b) => {
      const ai = a.businessImpact ? 1 : 0;
      const bi = b.businessImpact ? 1 : 0;
      if (ai !== bi) return bi - ai;
      if (a.minutesToReview !== b.minutesToReview) return b.minutesToReview - a.minutesToReview;
      return a.title.localeCompare(b.title);
    });

  const critical = sortCards(cards.filter((c) => c.urgency === "critical"));
  const recommended = sortCards(cards.filter((c) => c.urgency === "recommended"));
  const low = sortCards(cards.filter((c) => c.urgency === "low"));

  const estimatedMinutes = cards.reduce((sum, c) => sum + c.minutesToReview, 0);

  return {
    generatedAt: new Date().toISOString(),
    total: cards.length,
    estimatedMinutes,
    critical,
    recommended,
    low,
    partialFailures,
  };
}
