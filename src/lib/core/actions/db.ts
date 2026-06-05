// Vault Core — vault_actions data layer (server-side, internal-only).
//
// Mock-safe: in-memory store (starts EMPTY) when Supabase is unconfigured or the
// vault_actions table is absent; otherwise persists via the service-role client.
// DTOs strip the raw `payload`/`execution_result` blobs before reaching clients.
// No external calls anywhere in this module.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAdapterEnabled } from "./policies";
import { scrubText } from "./validation";
import type { VaultAction, VaultActionDTO, ActionCounts, AuditEntry } from "./types";

const TABLE = "vault_actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseServerClient();
}

const mock: VaultAction[] = [];

export function actionsDbAvailable(): boolean {
  return !!db();
}

// ── Reads ──
export async function getActions(limit = 500): Promise<VaultAction[]> {
  const client = db();
  if (!client) return [...mock];
  try {
    const { data, error } = await client.from(TABLE).select("*").order("created_at", { ascending: false }).limit(limit);
    if (error || !data) return [...mock];
    return data as VaultAction[];
  } catch {
    return [...mock];
  }
}

export async function getAction(id: string): Promise<VaultAction | null> {
  const client = db();
  if (!client) return mock.find((a) => a.id === id) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) return mock.find((a) => a.id === id) ?? null;
    return (data as VaultAction) ?? null;
  } catch {
    return mock.find((a) => a.id === id) ?? null;
  }
}

// Thrown when an insert collides with the (agent_id, source_type, source_id) unique
// index — i.e. another (possibly concurrent) run already generated this exact action.
// createAction() catches this and reports a duplicate skip rather than a hard error.
export const DUPLICATE_ACTION_MESSAGE = "duplicate of an existing generated action (same source signal)";

function isGeneratedSignal(row: VaultAction): boolean {
  return !!row.source_type && !!row.source_id;
}

// ── Insert (called by createAction after validation) ──
export async function insertAction(row: VaultAction): Promise<VaultAction> {
  const client = db();
  if (!client) {
    // Mock parity with the DB unique index: one action per (agent, source signal).
    if (isGeneratedSignal(row) && mock.some((a) => a.agent_id === row.agent_id && a.source_type === row.source_type && a.source_id === row.source_id)) {
      throw new Error(DUPLICATE_ACTION_MESSAGE);
    }
    mock.unshift(row);
    return row;
  }
  const { data, error } = await client.from(TABLE).insert(row).select("*").single();
  // 23505 = unique_violation on the generated-signal partial index → treat as duplicate.
  if (error && (error.code === "23505" || /duplicate key value/i.test(error.message ?? ""))) {
    throw new Error(DUPLICATE_ACTION_MESSAGE);
  }
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  return data as VaultAction;
}

// ── Update (review / execute status + audit). Internal-only, never deletes. ──
export async function updateAction(id: string, patch: Partial<VaultAction>): Promise<VaultAction | null> {
  const next = { ...patch, updated_at: new Date().toISOString() };
  const client = db();
  if (!client) {
    const idx = mock.findIndex((a) => a.id === id);
    if (idx < 0) return null;
    mock[idx] = { ...mock[idx], ...next } as VaultAction;
    return mock[idx];
  }
  const { data, error } = await client.from(TABLE).update(next).eq("id", id).select("*").single();
  if (error || !data) return null;
  return data as VaultAction;
}

/**
 * Apply a REVIEW transition (approve/reject/request_revision/archive) ONLY when
 * the row is currently in one of `fromStates` AND not mid-execution/executed.
 * Conditional compare-and-set so a review can never race a claimed/executing
 * action (which would leave e.g. needs_revision + executed). The caller passes
 * the set of approval_status values valid as the *prior* state for this specific
 * transition (e.g. withdrawal-style transitions also permit "approved"). Returns
 * null if it could not be applied (lost the race / wrong prior state).
 */
export async function reviewTransition(
  id: string,
  patch: Partial<VaultAction>,
  fromStates: string[],
): Promise<VaultAction | null> {
  const next = { ...patch, updated_at: new Date().toISOString() };
  const client = db();
  if (!client) {
    const idx = mock.findIndex((a) => a.id === id);
    if (idx < 0) return null;
    // Single-winner: only an allowed prior state on a non-executing/executed row.
    if (!fromStates.includes(mock[idx].approval_status)) return null;
    if (mock[idx].execution_status === "executing" || mock[idx].execution_status === "executed") return null;
    mock[idx] = { ...mock[idx], ...next } as VaultAction;
    return mock[idx];
  }
  const { data, error } = await client
    .from(TABLE)
    .update(next)
    .eq("id", id)
    .in("approval_status", fromStates)
    .neq("execution_status", "executing")
    .neq("execution_status", "executed")
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return data as VaultAction;
}

/**
 * Finalize a claimed execution — apply the result ONLY while the row is still in
 * our `executing` claim. If something else changed it, do nothing (returns null).
 */
export async function finalizeExecution(id: string, patch: Partial<VaultAction>): Promise<VaultAction | null> {
  const next = { ...patch, updated_at: new Date().toISOString() };
  const client = db();
  if (!client) {
    const idx = mock.findIndex((a) => a.id === id);
    if (idx < 0 || mock[idx].execution_status !== "executing") return null;
    mock[idx] = { ...mock[idx], ...next } as VaultAction;
    return mock[idx];
  }
  const { data, error } = await client
    .from(TABLE)
    .update(next)
    .eq("id", id)
    .eq("execution_status", "executing")
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return data as VaultAction;
}

export function appendAudit(action: VaultAction, entry: AuditEntry): AuditEntry[] {
  return [...(action.audit_log ?? []), entry].slice(-50);
}

/**
 * Atomically CLAIM an action for execution — compare-and-set to `executing` only
 * when it is not already executing/executed/cancelled. Prevents concurrent
 * double-execution (the internal adapter writing memory/activity twice). Returns
 * the claimed action, or null if another request already claimed it.
 */
const UNCLAIMABLE = ["executing", "executed", "cancelled"];
export async function claimForExecution(id: string): Promise<VaultAction | null> {
  const now = new Date().toISOString();
  const client = db();
  if (!client) {
    const a = mock.find((x) => x.id === id);
    if (!a || UNCLAIMABLE.includes(a.execution_status)) return null;
    // Claim ONLY a still-approved action — closes the TOCTOU vs request_revision.
    if (a.approval_status !== "approved" || !a.approved_by) return null;
    a.execution_status = "executing";
    a.updated_at = now;
    return a;
  }
  // Compare-and-set includes the approval invariants atomically: a concurrent
  // review can't leave the row claimable once it's no longer approved.
  const { data, error } = await client
    .from(TABLE)
    .update({ execution_status: "executing", updated_at: now })
    .eq("id", id)
    .eq("approval_status", "approved")
    .not("approved_by", "is", null)
    .neq("execution_status", "executing")
    .neq("execution_status", "executed")
    .neq("execution_status", "cancelled")
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return data as VaultAction;
}

// ── DTO (safe shape returned to clients — no raw payload / execution_result) ──
export function toActionDTO(a: VaultAction): VaultActionDTO {
  return {
    id: a.id,
    agent_id: a.agent_id,
    created_by: a.created_by ?? null,
    client_id: a.client_id,
    title: a.title,
    summary: a.summary,
    action_type: a.action_type,
    target_system: a.target_system,
    risk_level: a.risk_level,
    approval_status: a.approval_status,
    execution_status: a.execution_status,
    safe_preview: a.safe_preview,
    reason: a.reason,
    evidence: a.evidence ?? [],
    constraints: a.constraints ?? [],
    requires_approval: a.requires_approval,
    source_type: a.source_type,
    source_id: a.source_id,
    approved_by: a.approved_by,
    approved_at: a.approved_at,
    rejected_by: a.rejected_by,
    rejected_at: a.rejected_at,
    rejection_reason: a.rejection_reason,
    executed_by_agent: a.executed_by_agent,
    executed_at: a.executed_at,
    execution_error: a.execution_error,
    rollback_notes: a.rollback_notes,
    audit_log: a.audit_log ?? [],
    adapter_enabled: isAdapterEnabled(a.target_system),
    metadata: stripMetadata(a.metadata ?? {}),
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}

// Only expose safe metadata keys (quality gate scores + flags) — never arbitrary
// blobs. We re-build quality_gate from a known field whitelist rather than passing
// the persisted object through, so a backfilled/tampered/future-written row can
// never leak arbitrary nested JSON across the DTO boundary.
function stripMetadata(m: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const qg = m.quality_gate;
  if (qg && typeof qg === "object" && !Array.isArray(qg)) {
    const g = qg as Record<string, unknown>;
    const safe: Record<string, unknown> = {};
    if (typeof g.qualityScore === "number") safe.qualityScore = g.qualityScore;
    if (typeof g.quality_score === "number") safe.quality_score = g.quality_score;
    if (typeof g.duplicate_score === "number") safe.duplicate_score = g.duplicate_score;
    if (typeof g.safety_status === "string") safe.safety_status = g.safety_status;
    if (typeof g.needs_human_review === "boolean") safe.needs_human_review = g.needs_human_review;
    if (typeof g.never_auto_execute === "boolean") safe.never_auto_execute = g.never_auto_execute;
    if (Array.isArray(g.reviewed_by)) safe.reviewed_by = g.reviewed_by.filter((x) => typeof x === "string");
    out.quality_gate = safe;
  }
  // Phase 9.1 generation provenance (whitelisted scalar fields only).
  const gen = m.generation;
  if (gen && typeof gen === "object" && !Array.isArray(gen)) {
    const g = gen as Record<string, unknown>;
    const safe: Record<string, unknown> = {};
    // Defense in depth: scrub + cap the free-text provenance fields again at the DTO
    // boundary, so even a backfilled/tampered row can't leak PII/secrets to the UI.
    if (typeof g.generation_source === "string") safe.generation_source = scrubText(g.generation_source).slice(0, 80);
    if (typeof g.generation_reason === "string") safe.generation_reason = scrubText(g.generation_reason).slice(0, 400);
    if (typeof g.evidence_count === "number") safe.evidence_count = g.evidence_count;
    if (typeof g.policy_version === "string") safe.policy_version = scrubText(g.policy_version).slice(0, 40);
    if (typeof g.mission_visible === "boolean") safe.mission_visible = g.mission_visible;
    out.generation = safe;
  }
  if (typeof m.never_auto_execute === "boolean") out.never_auto_execute = m.never_auto_execute;
  if (typeof m.requires_human_review === "boolean") out.requires_human_review = m.requires_human_review;
  return out;
}

export async function getActionCounts(): Promise<ActionCounts> {
  const all = await getActions(1000);
  const counts: ActionCounts = {
    pending_review: 0, approved: 0, rejected: 0, needs_revision: 0, archived: 0,
    executed: 0, failed: 0, adapter_disabled: 0, high_risk_pending: 0, total: all.length,
  };
  for (const a of all) {
    if (a.approval_status in counts) (counts as unknown as Record<string, number>)[a.approval_status] += 1;
    if (a.execution_status === "executed") counts.executed += 1;
    if (a.execution_status === "failed") counts.failed += 1;
    if (a.execution_status === "adapter_disabled") counts.adapter_disabled += 1;
    if (a.approval_status === "pending_review" && (a.risk_level === "level_3_money_ads_workflow" || a.risk_level === "level_4_admin_critical")) {
      counts.high_risk_pending += 1;
    }
  }
  return counts;
}
