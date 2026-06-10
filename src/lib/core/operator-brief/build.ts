// Vault Core — Daily Operator Brief aggregator (server-side, READ-ONLY).
//
// Answers one question for the operator: "What needs my decision today, and
// roughly how long will it take to clear it?" It is a thin, mock-safe read over
// the EXISTING approval-queue count readers — it owns no data and mutates
// nothing. It exists so the agency can be run from a single prioritized worklist
// (the "1 hour a day" operating model) instead of nine separate queues.
//
// SAFETY: every reader is wrapped so one failing queue returns 0 instead of
// breaking the brief, and nothing here sends, publishes, or touches an external
// system. It only counts pending_review items and links to where the human
// already reviews them.

import { getRecommendationCounts } from "../memory/db";
import { getProposalCounts } from "../collab/db";
import { getActionCounts } from "../actions/db";
import { getCampaignDraftCounts } from "../campaign-drafts/db";
import { getWorkflowDraftCounts } from "../workflows/db";
import { getMessageDraftCounts } from "../messages/db";
import { getFinanceDraftCounts } from "../finance-drafts/db";
import { getCreativeBriefCounts } from "../creative-briefs/db";
import { getDraftCounts } from "../agents/veronica/drafts";
import { getExecutiveBrief } from "../agents/vanessa/db";

// Stable queue identity. `key` is mapped to an icon + accent client-side so this
// module stays free of React/lucide imports and is safe to call from the runtime.
export interface OperatorQueueItem {
  key: string;
  label: string;
  href: string;
  pending: number;
  minutesEach: number;
}

export interface OperatorPriority {
  id: string;
  title: string;
  agent: string;
  priority: string;
  reason: string;
}

export interface OperatorWorklist {
  generatedAt: string;
  totalPending: number;
  estimatedMinutes: number;
  queues: OperatorQueueItem[]; // sorted: queues with work first, then by pending desc
  topPriorities: OperatorPriority[]; // Vanessa's top-ranked open recommendations
}

// Per-item review-time estimates (minutes). Deliberately conservative — these
// drive the "~X min today" headline, not any spend or external action.
const QUEUE_DEFS: ReadonlyArray<Omit<OperatorQueueItem, "pending">> = [
  { key: "meta-campaign-drafts", label: "Meta Campaign Drafts", href: "/meta-campaign-drafts", minutesEach: 5 },
  { key: "creative-briefs",      label: "Creative Briefs",      href: "/creative-briefs",      minutesEach: 4 },
  { key: "actions",              label: "Actions",              href: "/actions",              minutesEach: 3 },
  { key: "ghl-workflows",        label: "GHL Workflow Drafts",  href: "/ghl-workflows",        minutesEach: 3 },
  { key: "proposals",            label: "System Proposals",     href: "/proposals",            minutesEach: 3 },
  { key: "recommendations",      label: "Recommendations",      href: "/recommendations",      minutesEach: 2 },
  { key: "finance-drafts",       label: "Finance Drafts",       href: "/finance-drafts",       minutesEach: 2 },
  { key: "message-drafts",       label: "Message Drafts",       href: "/message-drafts",       minutesEach: 2 },
  { key: "sms-drafts",           label: "SMS / Follow-Up Drafts", href: "/drafts",             minutesEach: 1 },
];

/** Run a count reader defensively — any failure contributes 0, never throws. */
async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    const n = await fn();
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export async function getOperatorWorklist(): Promise<OperatorWorklist> {
  const [
    recs,
    proposals,
    actions,
    campaigns,
    workflows,
    messages,
    finance,
    briefs,
    sms,
    executive,
  ] = await Promise.all([
    safeCount(async () => (await getRecommendationCounts()).pending_review),
    safeCount(async () => (await getProposalCounts()).pending_review),
    safeCount(async () => (await getActionCounts()).pending_review),
    safeCount(async () => (await getCampaignDraftCounts()).pending_review),
    safeCount(async () => (await getWorkflowDraftCounts()).pending_review),
    safeCount(async () => (await getMessageDraftCounts()).pending_review),
    safeCount(async () => (await getFinanceDraftCounts()).pending_review),
    safeCount(async () => (await getCreativeBriefCounts()).pending_review),
    safeCount(async () => (await getDraftCounts()).draft),
    getExecutiveBrief().catch(() => ({ queue: [] as Awaited<ReturnType<typeof getExecutiveBrief>>["queue"] })),
  ]);

  const pendingByKey: Record<string, number> = {
    "recommendations": recs,
    "proposals": proposals,
    "actions": actions,
    "meta-campaign-drafts": campaigns,
    "ghl-workflows": workflows,
    "message-drafts": messages,
    "finance-drafts": finance,
    "creative-briefs": briefs,
    "sms-drafts": sms,
  };

  const queues: OperatorQueueItem[] = QUEUE_DEFS.map((d) => ({
    ...d,
    pending: pendingByKey[d.key] ?? 0,
  })).sort((a, b) => b.pending - a.pending);

  const totalPending = queues.reduce((sum, q) => sum + q.pending, 0);
  const estimatedMinutes = queues.reduce((sum, q) => sum + q.pending * q.minutesEach, 0);

  const topPriorities: OperatorPriority[] = (executive.queue ?? [])
    .slice(0, 3)
    .map((q) => ({
      id: q.recommendationId ?? `${q.agent}:${q.title}`,
      title: q.title,
      agent: q.agent,
      priority: q.priority,
      reason: q.reason,
    }));

  return {
    generatedAt: new Date().toISOString(),
    totalPending,
    estimatedMinutes,
    queues,
    topPriorities,
  };
}
