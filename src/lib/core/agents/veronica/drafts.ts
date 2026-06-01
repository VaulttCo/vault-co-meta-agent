// Vault Core — message-draft store (server-side). Phase 6.
//
// Drafts are intelligence artifacts requiring human approval. SAFETY: nothing
// here ever sends a message, replies to a lead, or touches GHL/CRM. "Approving"
// a draft only marks it approved internally. Mock-safe: reads fall back to
// seeded mock drafts; writes no-op without a database.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  MessageDraftRow,
  MessageDraftInput,
  DraftCounts,
  DraftStatusV,
} from "../../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseServerClient();
}
const LOG = "[VaultCore:drafts]";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const iso = (ago: number) => new Date(Date.now() - ago).toISOString();
const mid = (s: string) => `mock-${s}`;

export function buildMockDrafts(): MessageDraftRow[] {
  return [
    {
      id: mid("draft-1"),
      agent: "veronica",
      draft_type: "follow_up",
      lead_name: "Roofing — M. Alvarez",
      conversation_summary: "Hot lead: hail damage last week, asked how soon someone can come out. No reply sent yet.",
      rationale: "High-intent inbound within the hour; fast response correlates with +12% booking. Draft a same-day scheduling reply.",
      body: "Hi Mike — sorry to hear about the hail damage. We can have an inspector out as early as tomorrow morning. Does 9am or 1pm work better for you?",
      confidence: 0.82,
      risk_level: "low",
      suggested_send_window: "Within 1 hour (business hours)",
      status: "draft",
      related_node_ids: [mid("hot-lead-1"), mid("sms-pattern-1")],
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      created_at: iso(20 * MIN),
    },
    {
      id: mid("draft-2"),
      agent: "veronica",
      draft_type: "reactivation",
      lead_name: "Roofing — P. Sterling",
      conversation_summary: "Dead conversation (34 days). Said 'maybe next year' — long-term nurture.",
      rationale: "Reactivation opportunity: seasonal re-engage with a low-pressure value touch.",
      body: "Hi Pat — checking in as roofing season ramps up. We're booking free inspections now before the summer rush. Want me to hold a slot for you, no obligation?",
      confidence: 0.61,
      risk_level: "medium",
      suggested_send_window: "Tue–Thu, late morning",
      status: "draft",
      related_node_ids: [mid("reactivation-1")],
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      created_at: iso(2 * HOUR),
    },
    {
      id: mid("draft-3"),
      agent: "veronica",
      draft_type: "no_show_recovery",
      lead_name: "HVAC — J. Carter",
      conversation_summary: "Booked but missed the scheduled call (no-show).",
      rationale: "No-show recovery: re-offer with urgency framing that converts better in the data.",
      body: "Hi John — looks like we missed each other earlier! I can still get you on the schedule this week. Would tomorrow afternoon work to finish setting things up?",
      confidence: 0.7,
      risk_level: "low",
      suggested_send_window: "Same day, +2 hours after miss",
      status: "approved",
      related_node_ids: [mid("appt-risk-1")],
      reviewed_by: "Nick (admin)",
      reviewed_at: iso(40 * MIN),
      review_notes: "Approved internally — not sent. Ops to handle outreach manually.",
      created_at: iso(3 * HOUR),
    },
  ];
}

export async function getDrafts(status?: string): Promise<MessageDraftRow[]> {
  const client = db();
  if (!client) {
    const all = buildMockDrafts();
    return status ? all.filter((d) => d.status === status) : all;
  }
  try {
    let q = client.from("vault_message_drafts").select("*").order("created_at", { ascending: false }).limit(200);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error || !data) return [];
    return data as MessageDraftRow[];
  } catch {
    return [];
  }
}

export async function getDraft(id: string): Promise<MessageDraftRow | null> {
  const client = db();
  if (!client) return buildMockDrafts().find((d) => d.id === id) ?? null;
  try {
    const { data, error } = await client.from("vault_message_drafts").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return data as MessageDraftRow;
  } catch {
    return null;
  }
}

export async function getDraftCounts(): Promise<DraftCounts> {
  const drafts = await getDrafts();
  const counts: DraftCounts = { draft: 0, approved: 0, edited: 0, rejected: 0, total: drafts.length };
  for (const d of drafts) if (d.status in counts) counts[d.status] += 1;
  return counts;
}

export async function insertDraft(input: MessageDraftInput): Promise<string | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("vault_message_drafts")
      .insert({
        agent: input.agent,
        draft_type: input.draft_type,
        lead_name: input.lead_name ?? null,
        conversation_summary: input.conversation_summary ?? null,
        rationale: input.rationale ?? null,
        body: input.body,
        confidence: input.confidence ?? 0.5,
        risk_level: input.risk_level ?? "low",
        suggested_send_window: input.suggested_send_window ?? null,
        status: "draft",
        related_node_ids: input.related_node_ids ?? [],
      })
      .select("id")
      .single();
    if (error) {
      console.error(`${LOG} insertDraft:`, error.message);
      return null;
    }
    return (data as { id: string }).id;
  } catch (e) {
    console.error(`${LOG} insertDraft threw:`, (e as Error).message);
    return null;
  }
}

export type DraftAction = "approve" | "edit" | "reject";
const DRAFT_ACTION_RESULT: Record<DraftAction, DraftStatusV> = {
  approve: "approved",
  edit: "edited",
  reject: "rejected",
};

export interface DraftReviewResult {
  ok: boolean;
  mockMode: boolean;
  status: DraftStatusV;
}

/**
 * Apply a human review to a draft. SAFETY: this NEVER sends the message or
 * touches GHL — it only updates the draft's internal status (and optionally the
 * body, for "edit"). Outbound delivery is intentionally not implemented.
 */
export async function reviewDraft(
  id: string,
  action: DraftAction,
  actor: string,
  opts: { notes?: string | null; body?: string | null } = {}
): Promise<DraftReviewResult> {
  const toStatus = DRAFT_ACTION_RESULT[action];
  const client = db();
  if (!client) return { ok: true, mockMode: true, status: toStatus };
  try {
    const patch: Record<string, unknown> = {
      status: toStatus,
      reviewed_by: actor,
      reviewed_at: new Date().toISOString(),
      review_notes: opts.notes ?? null,
    };
    if (action === "edit" && typeof opts.body === "string" && opts.body.trim()) {
      patch.body = opts.body.trim();
    }
    const { error } = await client.from("vault_message_drafts").update(patch).eq("id", id);
    if (error) {
      console.error(`${LOG} reviewDraft:`, error.message);
      return { ok: false, mockMode: false, status: toStatus };
    }
    return { ok: true, mockMode: false, status: toStatus };
  } catch (e) {
    console.error(`${LOG} reviewDraft threw:`, (e as Error).message);
    return { ok: false, mockMode: false, status: toStatus };
  }
}
