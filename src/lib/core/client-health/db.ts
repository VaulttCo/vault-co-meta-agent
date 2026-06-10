// Vault Core — Client Health / Retention Risk Draft data layer (Phase 9.8, server-side).
//
// Mock-safe: in-memory store (starts EMPTY) when Supabase is unconfigured or the
// client_health_drafts table is absent; otherwise persists via the service-role client.
// DRAFT-ONLY: nothing here contacts a client, sends anything, mutates GHL/Stripe/Meta, or
// calls a provider API. DTOs RE-SANITIZE stored JSON at the boundary and never expose raw
// provider payloads, credentials/tokens, live provider IDs, or contact PII.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scrubText } from "../actions/validation";
import { scrubStrList, scrubOptional, buildHealthSafePreview } from "./validation";
import { HEALTH_TYPES, HEALTH_TARGET_SYSTEMS } from "./types";
import { RISK_LEVELS } from "../actions/types";
import type {
  VaultClientHealthDraft, VaultClientHealthDraftDTO, ClientHealthDraftCounts, HealthStatus, HealthType,
} from "./types";
import type { AuditEntry } from "../actions/types";

const TABLE = "client_health_drafts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseServerClient();
}

const mock: VaultClientHealthDraft[] = [];

export async function getClientHealthDrafts(limit = 500): Promise<VaultClientHealthDraft[]> {
  const client = db();
  if (!client) return [...mock];
  try {
    const { data, error } = await client.from(TABLE).select("*").order("created_at", { ascending: false }).limit(limit);
    if (error || !data) return [...mock];
    return data as VaultClientHealthDraft[];
  } catch {
    return [...mock];
  }
}

export async function getClientHealthDraft(id: string): Promise<VaultClientHealthDraft | null> {
  const client = db();
  if (!client) return mock.find((d) => d.id === id) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) return mock.find((d) => d.id === id) ?? null;
    return (data as VaultClientHealthDraft) ?? null;
  } catch {
    return mock.find((d) => d.id === id) ?? null;
  }
}

/** Generic idempotency lookup on a single source column (1:1 source → health draft). */
async function getBySourceColumn(column: string, value: string): Promise<VaultClientHealthDraft | null> {
  const client = db();
  const fromMock = () => mock.find((d) => (d as unknown as Record<string, unknown>)[column] === value) ?? null;
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from(TABLE).select("*").eq(column, value).limit(1).maybeSingle();
    if (error) return fromMock();
    return (data as VaultClientHealthDraft) ?? null;
  } catch {
    return fromMock();
  }
}

export async function getClientHealthDraftBySourceAction(actionId: string): Promise<VaultClientHealthDraft | null> {
  return getBySourceColumn("source_action_id", actionId);
}
export async function getClientHealthDraftBySourceMessageDraft(messageDraftId: string): Promise<VaultClientHealthDraft | null> {
  return getBySourceColumn("source_message_draft_id", messageDraftId);
}
export async function getClientHealthDraftBySourceFinanceDraft(financeDraftId: string): Promise<VaultClientHealthDraft | null> {
  return getBySourceColumn("source_finance_draft_id", financeDraftId);
}

/** Idempotency lookup for the from-revenue-snapshot handoff — scoped to a health_type so a
 *  future snapshot-driven type can coexist with the monthly closeout. */
export async function getClientHealthDraftBySourceSnapshot(snapshotId: string, healthType: HealthType): Promise<VaultClientHealthDraft | null> {
  const client = db();
  const fromMock = () => mock.find((d) => d.source_snapshot_id === snapshotId && d.health_type === healthType) ?? null;
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("source_snapshot_id", snapshotId).eq("health_type", healthType).limit(1).maybeSingle();
    if (error) return fromMock();
    return (data as VaultClientHealthDraft) ?? null;
  } catch {
    return fromMock();
  }
}

export async function insertClientHealthDraft(row: VaultClientHealthDraft): Promise<VaultClientHealthDraft> {
  const client = db();
  if (!client) { mock.unshift(row); return row; }
  const { data, error } = await client.from(TABLE).insert(row).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  return data as VaultClientHealthDraft;
}

export async function updateClientHealthDraft(id: string, patch: Partial<VaultClientHealthDraft>): Promise<VaultClientHealthDraft | null> {
  const next = { ...patch, updated_at: new Date().toISOString() };
  const client = db();
  if (!client) {
    const idx = mock.findIndex((d) => d.id === id);
    if (idx < 0) return null;
    mock[idx] = { ...mock[idx], ...next } as VaultClientHealthDraft;
    return mock[idx];
  }
  const { data, error } = await client.from(TABLE).update(next).eq("id", id).select("*").single();
  if (error || !data) return null;
  return data as VaultClientHealthDraft;
}

/**
 * Review status change as a true compare-and-set: only from an allowed prior status,
 * guarded by updated_at, with the audit entry appended onto the FRESHEST row's audit_log
 * (so concurrent reviews can't drop each other's trail). Retries on a lost race; returns
 * null if it could not apply.
 */
export async function reviewClientHealthDraft(
  id: string,
  statusPatch: Partial<VaultClientHealthDraft>,
  fromStates: string[],
  auditEntry: AuditEntry,
): Promise<VaultClientHealthDraft | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const fresh = await getClientHealthDraft(id);
    if (!fresh) return null;
    if (!fromStates.includes(fresh.status)) return null;
    const log = Array.isArray(fresh.audit_log) ? fresh.audit_log : [];
    const next = { ...statusPatch, audit_log: [...log, auditEntry].slice(-50), updated_at: new Date().toISOString() };
    const client = db();
    if (!client) {
      const idx = mock.findIndex((d) => d.id === id);
      if (idx < 0) return null;
      mock[idx] = { ...mock[idx], ...next } as VaultClientHealthDraft;
      return mock[idx];
    }
    const { data, error } = await client.from(TABLE).update(next).eq("id", id).eq("updated_at", fresh.updated_at).in("status", fromStates).select("*").maybeSingle();
    if (error) return null;
    if (data) return data as VaultClientHealthDraft;
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
const uuidStr = (v: unknown) => (typeof v === "string" ? v : null);

// ── DTO — DEFENSE IN DEPTH: re-sanitize stored JSON; client-success adapter ALWAYS
// disabled; rebuild safe_preview from sanitized fields; never raw payloads/PII/IDs. ──
export function toClientHealthDraftDTO(d: VaultClientHealthDraft): VaultClientHealthDraftDTO {
  const title = scrubText(typeof d.title === "string" ? d.title : "Untitled health draft").slice(0, 160);
  const health_type = (HEALTH_TYPES.includes(d.health_type as HealthType) ? d.health_type : "custom") as HealthType;
  const health_score = scrubOptional(d.health_score, 80);
  const risk_level_label = scrubOptional(d.risk_level_label, 60);
  const risk_reasons = scrubStrList(d.risk_reasons);
  const missing = scrubStrList(d.missing_inputs);
  const compliance = scrubStrList(d.compliance_notes);
  const rawEvidence = (d.evidence && typeof d.evidence === "object" && Array.isArray((d.evidence as { items?: unknown }).items))
    ? (d.evidence as { items: unknown[] }).items : [];
  return {
    id: d.id,
    client_id: refStr(d.client_id),
    title,
    description: scrubOptional(d.description, 600),
    health_type,
    source_agent: refStr(d.source_agent),
    source_action_id: uuidStr(d.source_action_id),
    source_message_draft_id: uuidStr(d.source_message_draft_id),
    source_finance_draft_id: uuidStr(d.source_finance_draft_id),
    source_snapshot_id: refStr(d.source_snapshot_id),
    status: d.status,
    // Whitelist risk/target at the boundary — never trust a malformed/backfilled row.
    risk_level: (RISK_LEVELS as readonly string[]).includes(d.risk_level) ? d.risk_level : "level_2_client_facing_message",
    target_system: (HEALTH_TARGET_SYSTEMS as readonly string[]).includes(d.target_system) ? d.target_system : "internal",
    health_score,
    risk_level_label,
    risk_reasons,
    missing_access: scrubStrList(d.missing_access),
    missing_assets: scrubStrList(d.missing_assets),
    delivery_risks: scrubStrList(d.delivery_risks),
    communication_risks: scrubStrList(d.communication_risks),
    next_best_actions: scrubStrList(d.next_best_actions),
    owner_notes: scrubOptional(d.owner_notes, 1000),
    save_plan: scrubStrList(d.save_plan),
    upsell_opportunities: scrubStrList(d.upsell_opportunities),
    follow_up_message_ref: refStr(d.follow_up_message_ref),
    missing_inputs: missing,
    compliance_notes: compliance,
    safe_preview: buildHealthSafePreview(title, health_type, health_score, risk_level_label, risk_reasons),
    evidence: { items: scrubStrList(rawEvidence) },
    audit_log: sanitizeAuditLog(d.audit_log),
    risk_reason_count: risk_reasons.length,
    missing_inputs_count: missing.length,
    compliance_notes_count: compliance.length,
    adapter_enabled: false,          // client-success adapter disabled in Phase 9.8
    future_adapter_required: true,   // any client contact needs a future approved adapter
    reviewed_by: refStr(d.reviewed_by),
    reviewed_at: d.reviewed_at,
    created_by: refStr(d.created_by),
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

export async function getClientHealthDraftCounts(): Promise<ClientHealthDraftCounts> {
  const all = await getClientHealthDrafts(1000);
  const counts: ClientHealthDraftCounts = {
    draft: 0, pending_review: 0, approved_internal: 0, needs_revision: 0,
    rejected: 0, archived: 0, future_adapter_required: 0, total: all.length,
    missing_inputs: 0, high_risk: 0,
  };
  for (const d of all) {
    if ((d.status as HealthStatus) in counts) (counts as unknown as Record<string, number>)[d.status] += 1;
    if (Array.isArray(d.missing_inputs) && d.missing_inputs.length > 0) counts.missing_inputs += 1;
    if (d.risk_level === "level_3_money_ads_workflow" || d.risk_level === "level_4_admin_critical") counts.high_risk += 1;
  }
  return counts;
}
