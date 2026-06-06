// Vault Core — GHL Workflow Draft data layer (Phase 9.3, server-side).
//
// Mock-safe: in-memory store (starts EMPTY) when Supabase is unconfigured or the
// ghl_workflow_drafts table is absent; otherwise persists via the service-role
// client. DRAFT-ONLY: nothing here calls GHL. DTOs strip arbitrary metadata and
// never expose raw GHL payloads, credentials, or live IDs.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scrubText } from "../actions/validation";
import { sanitizeStoredSteps, sanitizeStoredTrigger, scrubStrList, scrubOptionalText, buildWorkflowSafePreview } from "./validation";
import { WORKFLOW_TYPES } from "./types";
import type { GHLWorkflowDraft, GHLWorkflowDraftDTO, WorkflowDraftCounts, WorkflowStatus, WorkflowType } from "./types";
import type { AuditEntry } from "../actions/types";

// Sanitize the review trail at the DTO boundary — whitelist fields, scrub + cap text,
// drop arbitrary metadata. Never trust stored JSON (backfill/import/service-role write).
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

const TABLE = "ghl_workflow_drafts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseServerClient();
}

const mock: GHLWorkflowDraft[] = [];

export async function getWorkflowDrafts(limit = 500): Promise<GHLWorkflowDraft[]> {
  const client = db();
  if (!client) return [...mock];
  try {
    const { data, error } = await client.from(TABLE).select("*").order("created_at", { ascending: false }).limit(limit);
    if (error || !data) return [...mock];
    return data as GHLWorkflowDraft[];
  } catch {
    return [...mock];
  }
}

/** Find an existing draft for a source action (idempotency for the from-action handoff). */
export async function getWorkflowDraftBySourceAction(actionId: string): Promise<GHLWorkflowDraft | null> {
  const client = db();
  if (!client) return mock.find((d) => d.source_action_id === actionId) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("source_action_id", actionId).limit(1).maybeSingle();
    if (error) return mock.find((d) => d.source_action_id === actionId) ?? null;
    return (data as GHLWorkflowDraft) ?? null;
  } catch {
    return mock.find((d) => d.source_action_id === actionId) ?? null;
  }
}

export async function getWorkflowDraft(id: string): Promise<GHLWorkflowDraft | null> {
  const client = db();
  if (!client) return mock.find((d) => d.id === id) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) return mock.find((d) => d.id === id) ?? null;
    return (data as GHLWorkflowDraft) ?? null;
  } catch {
    return mock.find((d) => d.id === id) ?? null;
  }
}

export async function insertWorkflowDraft(row: GHLWorkflowDraft): Promise<GHLWorkflowDraft> {
  const client = db();
  if (!client) { mock.unshift(row); return row; }
  const { data, error } = await client.from(TABLE).insert(row).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  return data as GHLWorkflowDraft;
}

export async function updateWorkflowDraft(id: string, patch: Partial<GHLWorkflowDraft>): Promise<GHLWorkflowDraft | null> {
  const next = { ...patch, updated_at: new Date().toISOString() };
  const client = db();
  if (!client) {
    const idx = mock.findIndex((d) => d.id === id);
    if (idx < 0) return null;
    mock[idx] = { ...mock[idx], ...next } as GHLWorkflowDraft;
    return mock[idx];
  }
  const { data, error } = await client.from(TABLE).update(next).eq("id", id).select("*").single();
  if (error || !data) return null;
  return data as GHLWorkflowDraft;
}

/**
 * Apply a review status change as a true compare-and-set: only from one of
 * `fromStates`, guarded by `updated_at`, with the audit entry appended onto the
 * FRESHEST row's audit_log (so two concurrent reviews can't overwrite each other's
 * trail, and a stale review can't flip an already-approved draft). Retries on a lost
 * updated_at race; returns null if it could not apply (wrong prior state / lost race).
 */
export async function reviewWorkflowDraft(
  id: string,
  statusPatch: Partial<GHLWorkflowDraft>,
  fromStates: string[],
  auditEntry: AuditEntry,
): Promise<GHLWorkflowDraft | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const fresh = await getWorkflowDraft(id);
    if (!fresh) return null;
    if (!fromStates.includes(fresh.status)) return null;
    const log = Array.isArray(fresh.audit_log) ? fresh.audit_log : [];
    const next = { ...statusPatch, audit_log: [...log, auditEntry].slice(-50), updated_at: new Date().toISOString() };
    const client = db();
    if (!client) {
      const idx = mock.findIndex((d) => d.id === id);
      if (idx < 0) return null;
      mock[idx] = { ...mock[idx], ...next } as GHLWorkflowDraft;
      return mock[idx];
    }
    const { data, error } = await client
      .from(TABLE)
      .update(next)
      .eq("id", id)
      .eq("updated_at", fresh.updated_at)
      .in("status", fromStates)
      .select("*")
      .maybeSingle();
    if (error) return null;
    if (data) return data as GHLWorkflowDraft;
    // null → lost the updated_at race; re-read and retry (or bail if prior state now wrong).
  }
  return null;
}

// ── DTO — DEFENSE IN DEPTH: re-sanitize stored JSON at the boundary (never trust a
// backfilled/imported/service-role write). GHL adapter ALWAYS disabled; target forced
// to "ghl"; guardrails forced to disabled; safe_preview rebuilt from sanitized fields;
// never raw payloads/credentials/live IDs. ──
const SAFE_TITLE = (t: unknown) => (typeof t === "string" ? scrubText(t).slice(0, 160) : "Untitled workflow");
export function toWorkflowDraftDTO(d: GHLWorkflowDraft): GHLWorkflowDraftDTO {
  const title = SAFE_TITLE(d.title);
  const workflow_type = (WORKFLOW_TYPES.includes(d.workflow_type as WorkflowType) ? d.workflow_type : "custom") as WorkflowType;
  const steps = sanitizeStoredSteps(d.steps);
  const missing = scrubStrList(d.missing_inputs);
  const rawEvidence = (d.evidence && typeof d.evidence === "object" && Array.isArray((d.evidence as { items?: unknown }).items))
    ? (d.evidence as { items: unknown[] }).items : [];
  return {
    id: d.id,
    client_id: typeof d.client_id === "string" ? scrubText(d.client_id).slice(0, 120) : null,
    title,
    description: scrubOptionalText(d.description, 1200),
    workflow_type,
    source_agent: typeof d.source_agent === "string" ? scrubText(d.source_agent).slice(0, 120) : null,
    source_action_id: typeof d.source_action_id === "string" ? d.source_action_id : null,
    status: d.status,
    risk_level: d.risk_level,
    target_system: "ghl",            // forced — workflow drafts are always the GHL lane
    trigger: sanitizeStoredTrigger(d.trigger),
    steps,
    // Guardrails are forced safe: the disabled/no-send guarantees always win.
    guardrails: { ...(d.guardrails && typeof d.guardrails === "object" ? d.guardrails : {}), draft_only: true, no_external_send: true, requires_human_approval: true, ghl_adapter: "disabled" },
    required_assets: scrubStrList(d.required_assets),
    missing_inputs: missing,
    human_review_notes: d.human_review_notes ? scrubText(d.human_review_notes).slice(0, 1000) : null,
    // Rebuild safe_preview from sanitized fields — never trust the stored blob.
    safe_preview: buildWorkflowSafePreview(title, workflow_type, steps),
    evidence: { items: scrubStrList(rawEvidence) },
    audit_log: sanitizeAuditLog(d.audit_log),
    step_count: steps.length,
    missing_inputs_count: missing.length,
    adapter_enabled: false,          // GHL adapter disabled in Phase 9.3
    future_adapter_required: true,   // publishing needs a future approved adapter
    reviewed_by: typeof d.reviewed_by === "string" ? scrubText(d.reviewed_by).slice(0, 120) : null,
    reviewed_at: d.reviewed_at,
    created_by: typeof d.created_by === "string" ? scrubText(d.created_by).slice(0, 120) : null,
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

export async function getWorkflowDraftCounts(): Promise<WorkflowDraftCounts> {
  const all = await getWorkflowDrafts(1000);
  const counts: WorkflowDraftCounts = {
    draft: 0, pending_review: 0, approved_internal: 0, needs_revision: 0,
    rejected: 0, archived: 0, future_adapter_required: 0, total: all.length,
  };
  for (const d of all) {
    if ((d.status as WorkflowStatus) in counts) (counts as unknown as Record<string, number>)[d.status] += 1;
  }
  return counts;
}
