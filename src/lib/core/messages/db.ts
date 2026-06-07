// Vault Core — Message Draft data layer (Phase 9.4, server-side).
//
// Mock-safe: in-memory store (starts EMPTY) when Supabase is unconfigured or the
// vault_core_message_drafts table is absent; otherwise persists via the service-role
// client. DRAFT-ONLY: nothing here sends or calls a provider. DTOs RE-SANITIZE stored
// JSON at the boundary and never expose raw provider payloads, credentials, live IDs,
// or PII beyond a sanitized contact_ref.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scrubText } from "../actions/validation";
import { scrubStrList, scrubTokenList, scrubOptional, buildMessageSafePreview } from "./validation";
import { MESSAGE_TYPES, MESSAGE_CHANNELS, MESSAGE_AUDIENCES, MESSAGE_TARGET_SYSTEMS } from "./types";
import { RISK_LEVELS } from "../actions/types";
import type {
  VaultMessageDraft, VaultMessageDraftDTO, MessageDraftCounts, MessageStatus,
  MessageType, MessageChannel, MessageAudience,
} from "./types";
import type { AuditEntry } from "../actions/types";

const TABLE = "vault_core_message_drafts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseServerClient();
}

const mock: VaultMessageDraft[] = [];

export async function getMessageDrafts(limit = 500): Promise<VaultMessageDraft[]> {
  const client = db();
  if (!client) return [...mock];
  try {
    const { data, error } = await client.from(TABLE).select("*").order("created_at", { ascending: false }).limit(limit);
    if (error || !data) return [...mock];
    return data as VaultMessageDraft[];
  } catch {
    return [...mock];
  }
}

export async function getMessageDraft(id: string): Promise<VaultMessageDraft | null> {
  const client = db();
  if (!client) return mock.find((d) => d.id === id) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) return mock.find((d) => d.id === id) ?? null;
    return (data as VaultMessageDraft) ?? null;
  } catch {
    return mock.find((d) => d.id === id) ?? null;
  }
}

/** Idempotency lookups for the from-action / from-workflow-draft handoffs. */
export async function getMessageDraftBySourceAction(actionId: string): Promise<VaultMessageDraft | null> {
  const client = db();
  if (!client) return mock.find((d) => d.source_action_id === actionId) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("source_action_id", actionId).limit(1).maybeSingle();
    if (error) return mock.find((d) => d.source_action_id === actionId) ?? null;
    return (data as VaultMessageDraft) ?? null;
  } catch {
    return mock.find((d) => d.source_action_id === actionId) ?? null;
  }
}

/** Idempotency for the from-workflow-draft handoff: one draft per (workflow draft, step). */
export async function getMessageDraftBySourceWorkflowStep(workflowDraftId: string, stepId: string): Promise<VaultMessageDraft | null> {
  const match = (d: VaultMessageDraft) =>
    d.source_workflow_draft_id === workflowDraftId &&
    (d.metadata as { source_step_id?: unknown } | undefined)?.source_step_id === stepId;
  const client = db();
  if (!client) return mock.find(match) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("source_workflow_draft_id", workflowDraftId).limit(50);
    if (error || !data) return mock.find(match) ?? null;
    return (data as VaultMessageDraft[]).find(match) ?? null;
  } catch {
    return mock.find(match) ?? null;
  }
}

export async function insertMessageDraft(row: VaultMessageDraft): Promise<VaultMessageDraft> {
  const client = db();
  if (!client) { mock.unshift(row); return row; }
  const { data, error } = await client.from(TABLE).insert(row).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  return data as VaultMessageDraft;
}

export async function updateMessageDraft(id: string, patch: Partial<VaultMessageDraft>): Promise<VaultMessageDraft | null> {
  const next = { ...patch, updated_at: new Date().toISOString() };
  const client = db();
  if (!client) {
    const idx = mock.findIndex((d) => d.id === id);
    if (idx < 0) return null;
    mock[idx] = { ...mock[idx], ...next } as VaultMessageDraft;
    return mock[idx];
  }
  const { data, error } = await client.from(TABLE).update(next).eq("id", id).select("*").single();
  if (error || !data) return null;
  return data as VaultMessageDraft;
}

/**
 * Review status change as a true compare-and-set: only from an allowed prior status,
 * guarded by updated_at, with the audit entry appended onto the FRESHEST row's
 * audit_log (so concurrent reviews can't drop each other's trail). Retries on a lost
 * race; returns null if it could not apply.
 */
export async function reviewMessageDraft(
  id: string,
  statusPatch: Partial<VaultMessageDraft>,
  fromStates: string[],
  auditEntry: AuditEntry,
): Promise<VaultMessageDraft | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const fresh = await getMessageDraft(id);
    if (!fresh) return null;
    if (!fromStates.includes(fresh.status)) return null;
    const log = Array.isArray(fresh.audit_log) ? fresh.audit_log : [];
    const next = { ...statusPatch, audit_log: [...log, auditEntry].slice(-50), updated_at: new Date().toISOString() };
    const client = db();
    if (!client) {
      const idx = mock.findIndex((d) => d.id === id);
      if (idx < 0) return null;
      mock[idx] = { ...mock[idx], ...next } as VaultMessageDraft;
      return mock[idx];
    }
    const { data, error } = await client.from(TABLE).update(next).eq("id", id).eq("updated_at", fresh.updated_at).in("status", fromStates).select("*").maybeSingle();
    if (error) return null;
    if (data) return data as VaultMessageDraft;
  }
  return null;
}

// Sanitize the audit trail at the DTO boundary — whitelist fields, scrub + cap text.
function sanitizeAuditLog(log: unknown): AuditEntry[] {
  if (!Array.isArray(log)) return [];
  const cap = (v: unknown, n: number) => (typeof v === "string" ? scrubText(v).slice(0, n) : undefined);
  return log.slice(-50).filter((e) => e && typeof e === "object").map((e) => {
    const x = e as Record<string, unknown>;
    const out: AuditEntry = { at: typeof x.at === "string" ? x.at : "", actor: cap(x.actor, 120) ?? "system", event: cap(x.event, 60) ?? "event" };
    const d = cap(x.detail, 400); if (d) out.detail = d;
    const m = cap(x.message, 400); if (m) out.message = m;
    const p = cap(x.previous_status, 60); if (p) out.previous_status = p;
    const n = cap(x.next_status, 60); if (n) out.next_status = n;
    const nt = cap(x.note, 400); if (nt) out.note = nt;
    return out;
  });
}

const refStr = (v: unknown, n = 120) => (typeof v === "string" ? scrubText(v).slice(0, n) : null);

// ── DTO — DEFENSE IN DEPTH: re-sanitize stored JSON; send adapter ALWAYS disabled;
// rebuild safe_preview from sanitized fields; never raw payloads/credentials/IDs/PII. ──
export function toMessageDraftDTO(d: VaultMessageDraft): VaultMessageDraftDTO {
  const title = scrubText(typeof d.title === "string" ? d.title : "Untitled message").slice(0, 160);
  const channel = (MESSAGE_CHANNELS.includes(d.channel as MessageChannel) ? d.channel : "internal_note") as MessageChannel;
  const message_type = (MESSAGE_TYPES.includes(d.message_type as MessageType) ? d.message_type : "custom") as MessageType;
  const audience = (MESSAGE_AUDIENCES.includes(d.audience as MessageAudience) ? d.audience : "internal") as MessageAudience;
  const body = scrubOptional(d.body, 2000) ?? "";
  const missing = scrubStrList(d.missing_inputs);
  const compliance = scrubStrList(d.compliance_notes);
  const rawEvidence = (d.evidence && typeof d.evidence === "object" && Array.isArray((d.evidence as { items?: unknown }).items))
    ? (d.evidence as { items: unknown[] }).items : [];
  return {
    id: d.id,
    client_id: refStr(d.client_id),
    contact_ref: refStr(d.contact_ref),
    title,
    message_type,
    channel,
    audience,
    source_agent: refStr(d.source_agent),
    source_action_id: typeof d.source_action_id === "string" ? d.source_action_id : null,
    source_workflow_draft_id: typeof d.source_workflow_draft_id === "string" ? d.source_workflow_draft_id : null,
    status: d.status,
    // Whitelist risk/target at the boundary too — never trust a malformed/backfilled row.
    risk_level: (RISK_LEVELS as readonly string[]).includes(d.risk_level) ? d.risk_level : "level_2_client_facing_message",
    target_system: (MESSAGE_TARGET_SYSTEMS as readonly string[]).includes(d.target_system) ? d.target_system : "internal",
    subject: scrubOptional(d.subject, 200),
    body,
    tone: scrubOptional(d.tone, 60),
    intent: scrubOptional(d.intent, 200),
    personalization_tokens: scrubTokenList(d.personalization_tokens),
    missing_inputs: missing,
    compliance_notes: compliance,
    safe_preview: buildMessageSafePreview(title, channel, body),
    evidence: { items: scrubStrList(rawEvidence) },
    audit_log: sanitizeAuditLog(d.audit_log),
    missing_inputs_count: missing.length,
    compliance_notes_count: compliance.length,
    adapter_enabled: false,          // send adapter disabled in Phase 9.4
    future_adapter_required: true,   // sending needs a future approved adapter
    reviewed_by: refStr(d.reviewed_by),
    reviewed_at: d.reviewed_at,
    created_by: refStr(d.created_by),
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

export async function getMessageDraftCounts(): Promise<MessageDraftCounts> {
  const all = await getMessageDrafts(1000);
  const counts: MessageDraftCounts = {
    draft: 0, pending_review: 0, approved_internal: 0, needs_revision: 0,
    rejected: 0, archived: 0, future_adapter_required: 0, total: all.length,
  };
  for (const d of all) {
    if ((d.status as MessageStatus) in counts) (counts as unknown as Record<string, number>)[d.status] += 1;
  }
  return counts;
}
