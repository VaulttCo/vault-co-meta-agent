// Vault Core — vault_actions data layer (server-side, internal-only).
//
// Mock-safe: in-memory store (starts EMPTY) when Supabase is unconfigured or the
// vault_actions table is absent; otherwise persists via the service-role client.
// DTOs strip the raw `payload`/`execution_result` blobs before reaching clients.
// No external calls anywhere in this module.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAdapterEnabled } from "./policies";
import { canExecute } from "./execution-policy";
import { scrubText } from "./validation";
import type { VaultAction, VaultActionDTO, ActionCounts, AuditEntry, ActionPriority } from "./types";

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
 * Compare-and-set update: applies `patch` ONLY if the row's `updated_at` still equals
 * `expectedUpdatedAt`. Returns null if it lost the race (someone else wrote first).
 * Used by the metadata/audit helpers so concurrent lifecycle entries are never lost
 * (caller refetches + retries on null).
 */
async function updateActionGuarded(id: string, expectedUpdatedAt: string, patch: Partial<VaultAction>): Promise<VaultAction | null> {
  const next = { ...patch, updated_at: new Date().toISOString() };
  const client = db();
  if (!client) {
    const idx = mock.findIndex((a) => a.id === id);
    if (idx < 0 || mock[idx].updated_at !== expectedUpdatedAt) return null;
    mock[idx] = { ...mock[idx], ...next } as VaultAction;
    return mock[idx];
  }
  const { data, error } = await client.from(TABLE).update(next).eq("id", id).eq("updated_at", expectedUpdatedAt).select("*").maybeSingle();
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
  statusPatch: Partial<VaultAction>,
  fromStates: string[],
  auditEntry: AuditEntry | AuditEntry[],
): Promise<VaultAction | null> {
  const entries = Array.isArray(auditEntry) ? auditEntry : [auditEntry];
  // Compare-and-retry: rebuild audit_log from the FRESHEST row (so a concurrent
  // note/assign that landed first isn't dropped), guarded by both the status
  // invariants AND updated_at. A wrong prior state returns null immediately.
  for (let attempt = 0; attempt < 4; attempt++) {
    const fresh = await getAction(id);
    if (!fresh) return null;
    if (!fromStates.includes(fresh.approval_status)) return null;
    if (fresh.execution_status === "executing" || fresh.execution_status === "executed") return null;
    let log = fresh.audit_log ?? [];
    for (const e of entries) log = appendAudit({ ...fresh, audit_log: log }, e);
    const next = { ...statusPatch, audit_log: log, updated_at: new Date().toISOString() };
    const client = db();
    if (!client) {
      const idx = mock.findIndex((a) => a.id === id);
      if (idx < 0) return null;
      mock[idx] = { ...mock[idx], ...next } as VaultAction;
      return mock[idx];
    }
    const { data, error } = await client
      .from(TABLE)
      .update(next)
      .eq("id", id)
      .eq("updated_at", fresh.updated_at)
      .in("approval_status", fromStates)
      .neq("execution_status", "executing")
      .neq("execution_status", "executed")
      .select("*")
      .maybeSingle();
    if (error) return null;
    if (data) return data as VaultAction;
    // null → lost the updated_at race; re-read and retry (or bail if guards now fail).
  }
  return null;
}

/**
 * Finalize a claimed execution — apply the result ONLY while the row is still in
 * our `executing` claim. Rebuilds audit_log from the freshest row (preserving a
 * note added DURING execution) and appends the given lifecycle entries. Guarded by
 * execution_status === "executing" + updated_at. Returns null if the claim was lost.
 */
export async function finalizeExecution(id: string, patch: Partial<VaultAction>, auditEntries: AuditEntry[]): Promise<VaultAction | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const fresh = await getAction(id);
    if (!fresh || fresh.execution_status !== "executing") return null;
    let log = fresh.audit_log ?? [];
    for (const e of auditEntries) log = appendAudit({ ...fresh, audit_log: log }, e);
    const next = { ...patch, audit_log: log, updated_at: new Date().toISOString() };
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
      .eq("updated_at", fresh.updated_at)
      .select("*")
      .maybeSingle();
    if (error) return null;
    if (data) return data as VaultAction;
    // null → a concurrent note bumped updated_at; re-read and retry.
  }
  return null;
}

export function appendAudit(action: VaultAction, entry: AuditEntry): AuditEntry[] {
  return [...(action.audit_log ?? []), entry].slice(-50);
}

export interface TriagePatch {
  owner?: string | null;
  priority?: ActionPriority | null;
  due_at?: string | null;
  labels?: string[];
}

/**
 * Apply an owner/priority/due/labels patch (Phase 9.2) into `metadata.assignment`,
 * merged with any existing assignment, plus an audit entry. This NEVER changes
 * approval/execution status and never touches generation metadata or human notes —
 * it is pure internal triage. Mock-safe via updateAction.
 */
export async function applyTriagePatch(action: VaultAction, patch: TriagePatch, entry: AuditEntry): Promise<VaultAction | null> {
  // Compare-and-retry: always append the audit entry onto the freshest row's
  // audit_log, guarded by updated_at, so a concurrent note/assign/review can never
  // silently drop a lifecycle entry.
  for (let attempt = 0; attempt < 4; attempt++) {
    const fresh = attempt === 0 ? action : await getAction(action.id);
    if (!fresh) return null;
    const assignment: Record<string, unknown> = { ...triage(fresh.metadata) };
    if ("owner" in patch) assignment.owner = patch.owner;
    if ("priority" in patch) assignment.priority = patch.priority;
    if ("due_at" in patch) assignment.due_at = patch.due_at;
    if ("labels" in patch) assignment.labels = patch.labels;
    const metadata = { ...(fresh.metadata ?? {}), assignment };
    const updated = await updateActionGuarded(fresh.id, fresh.updated_at, { metadata, audit_log: appendAudit(fresh, entry) });
    if (updated) return updated;
  }
  return null;
}

/** Append a sanitized human note as an audit entry only (no status/metadata change).
 *  Compare-and-retry so a concurrent write can never lose the note from the log. */
export async function addActionNote(action: VaultAction, entry: AuditEntry): Promise<VaultAction | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const fresh = attempt === 0 ? action : await getAction(action.id);
    if (!fresh) return null;
    const updated = await updateActionGuarded(fresh.id, fresh.updated_at, { audit_log: appendAudit(fresh, entry) });
    if (updated) return updated;
  }
  return null;
}

/**
 * Atomically CLAIM an action for execution — compare-and-set to `executing` ONLY
 * from the `ready_after_approval` state on an approved row. Requiring that exact
 * starting state (not merely "not terminal") means a `failed`/`blocked`/`not_ready`
 * action can never be (re-)executed, and prevents concurrent double-execution.
 * Returns the claimed action, or null if it wasn't claimable.
 */
export async function claimForExecution(id: string): Promise<VaultAction | null> {
  const now = new Date().toISOString();
  const client = db();
  if (!client) {
    const a = mock.find((x) => x.id === id);
    if (!a || a.execution_status !== "ready_after_approval") return null;
    // Claim ONLY a still-approved action — closes the TOCTOU vs request_revision.
    if (a.approval_status !== "approved" || !a.approved_by) return null;
    a.execution_status = "executing";
    a.updated_at = now;
    return a;
  }
  // Compare-and-set includes the approval + ready invariants atomically: a concurrent
  // review can't leave the row claimable once it's no longer approved-and-ready.
  const { data, error } = await client
    .from(TABLE)
    .update({ execution_status: "executing", updated_at: now })
    .eq("id", id)
    .eq("approval_status", "approved")
    .not("approved_by", "is", null)
    .eq("execution_status", "ready_after_approval")
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
    audit_log: sanitizeAuditLog(a.audit_log),
    adapter_enabled: isAdapterEnabled(a.target_system),
    owner: readOwner(a.metadata),
    priority: readPriority(a.metadata),
    due_at: readDueAt(a.metadata),
    labels: readLabels(a.metadata),
    ready_to_execute: isReadyToExecute(a),
    metadata: stripMetadata(a.metadata ?? {}),
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}

// ── Phase 9.2 triage-field readers (sanitized; metadata-stored) ──
const PRIORITIES = new Set<ActionPriority>(["low", "medium", "high", "urgent"]);
function triage(m: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const t = (m ?? {}).assignment;
  return t && typeof t === "object" && !Array.isArray(t) ? (t as Record<string, unknown>) : {};
}
function readOwner(m: Record<string, unknown> | null | undefined): string | null {
  const v = triage(m).owner;
  return typeof v === "string" && v.trim() ? scrubText(v).slice(0, 120) : null;
}
function readPriority(m: Record<string, unknown> | null | undefined): ActionPriority | null {
  const v = triage(m).priority;
  return typeof v === "string" && PRIORITIES.has(v as ActionPriority) ? (v as ActionPriority) : null;
}
function readDueAt(m: Record<string, unknown> | null | undefined): string | null {
  const v = triage(m).due_at;
  if (typeof v !== "string") return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}
function readLabels(m: Record<string, unknown> | null | undefined): string[] {
  const v = triage(m).labels;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => scrubText(x).slice(0, 40)).slice(0, 10) : [];
}

// Sanitize audit_log for the DTO: whitelist known fields, scrub + cap free text, and
// DROP the arbitrary `metadata` blob entirely — so a backfilled/service-role/future
// audit entry can never leak raw metadata/PII/secrets to canViewApprovals clients.
function sanitizeAuditLog(log: AuditEntry[] | null | undefined): AuditEntry[] {
  if (!Array.isArray(log)) return [];
  const cap = (v: unknown, n: number) => (typeof v === "string" ? scrubText(v).slice(0, n) : undefined);
  return log.slice(-50).map((e) => {
    const out: AuditEntry = {
      at: typeof e.at === "string" ? e.at : "",
      actor: cap(e.actor, 120) ?? "system",
      event: cap(e.event, 60) ?? "event",
    };
    const detail = cap(e.detail, 400); if (detail) out.detail = detail;
    const message = cap(e.message, 400); if (message) out.message = message;
    const prev = cap(e.previous_status, 60); if (prev) out.previous_status = prev;
    const next = cap(e.next_status, 60); if (next) out.next_status = next;
    const note = cap(e.note, 400); if (note) out.note = note;
    // `metadata` is intentionally NOT surfaced.
    return out;
  });
}

/**
 * Executable-now. Delegates to the SAME `canExecute()` policy used by the execute
 * route (so the Ready queue / DTO flag can never disagree with the actual gate). We
 * pass role=admin + confirm=true to neutralize the viewer-role and L4-confirm checks
 * — those are about WHO/HOW, not whether the action itself is ready — leaving the
 * full ROW-level invariants (action_type authority, target/risk match, approved_by,
 * Vera/Vesper safety, enabled adapter, `ready_after_approval`). A malformed/backfilled
 * row that would fail policy therefore never appears ready or enables the execute UI.
 */
export function isReadyToExecute(a: VaultAction): boolean {
  return canExecute(a, { role: "admin", confirm: true }).allowed;
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
    executed: 0, failed: 0, adapter_disabled: 0, high_risk_pending: 0,
    ready: 0, ready_urgent_high: 0, urgent_high_open: 0, total: all.length,
  };
  const OPEN = new Set(["pending_review", "approved", "needs_revision"]);
  for (const a of all) {
    if (a.approval_status in counts) (counts as unknown as Record<string, number>)[a.approval_status] += 1;
    if (a.execution_status === "executed") counts.executed += 1;
    if (a.execution_status === "failed") counts.failed += 1;
    if (a.execution_status === "adapter_disabled") counts.adapter_disabled += 1;
    if (a.approval_status === "pending_review" && (a.risk_level === "level_3_money_ads_workflow" || a.risk_level === "level_4_admin_critical")) {
      counts.high_risk_pending += 1;
    }
    const pr = readPriority(a.metadata);
    const urgentHigh = pr === "urgent" || pr === "high";
    if (isReadyToExecute(a)) { counts.ready += 1; if (urgentHigh) counts.ready_urgent_high += 1; }
    if (OPEN.has(a.approval_status) && urgentHigh) counts.urgent_high_open += 1;
  }
  return counts;
}
