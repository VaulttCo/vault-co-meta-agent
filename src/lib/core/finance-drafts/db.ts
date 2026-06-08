// Vault Core — Finance / Invoice Draft data layer (Phase 9.6, server-side).
//
// Mock-safe: in-memory store (starts EMPTY) when Supabase is unconfigured or the
// finance_drafts table is absent; otherwise persists via the service-role client. DRAFT-
// ONLY: nothing here invoices, charges, collects, moves money, or calls Stripe. DTOs
// RE-SANITIZE stored JSON at the boundary and never expose raw provider payloads,
// credentials/tokens, live Stripe IDs, or card/bank/account numbers.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scrubText } from "../actions/validation";
import {
  scrubStrList, scrubOptional, scrubLineItems, scrubPartnerSplit, buildFinanceSafePreview,
} from "./validation";
import { FINANCE_TYPES, FINANCE_TARGET_SYSTEMS } from "./types";
import { RISK_LEVELS } from "../actions/types";
import type {
  VaultFinanceDraft, VaultFinanceDraftDTO, FinanceDraftCounts, FinanceStatus, FinanceType,
} from "./types";
import type { AuditEntry } from "../actions/types";

const TABLE = "finance_drafts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseServerClient();
}

const mock: VaultFinanceDraft[] = [];

export async function getFinanceDrafts(limit = 500): Promise<VaultFinanceDraft[]> {
  const client = db();
  if (!client) return [...mock];
  try {
    const { data, error } = await client.from(TABLE).select("*").order("created_at", { ascending: false }).limit(limit);
    if (error || !data) return [...mock];
    return data as VaultFinanceDraft[];
  } catch {
    return [...mock];
  }
}

export async function getFinanceDraft(id: string): Promise<VaultFinanceDraft | null> {
  const client = db();
  if (!client) return mock.find((d) => d.id === id) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) return mock.find((d) => d.id === id) ?? null;
    return (data as VaultFinanceDraft) ?? null;
  } catch {
    return mock.find((d) => d.id === id) ?? null;
  }
}

/** Idempotency lookup for the from-action handoff (1:1 action → finance draft). */
export async function getFinanceDraftBySourceAction(actionId: string): Promise<VaultFinanceDraft | null> {
  const client = db();
  if (!client) return mock.find((d) => d.source_action_id === actionId) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("source_action_id", actionId).limit(1).maybeSingle();
    if (error) return mock.find((d) => d.source_action_id === actionId) ?? null;
    return (data as VaultFinanceDraft) ?? null;
  } catch {
    return mock.find((d) => d.source_action_id === actionId) ?? null;
  }
}

/** Idempotency lookup for the from-revenue-snapshot handoff (1:1 snapshot → finance draft). */
export async function getFinanceDraftBySourceSnapshot(snapshotId: string): Promise<VaultFinanceDraft | null> {
  const client = db();
  if (!client) return mock.find((d) => d.source_snapshot_id === snapshotId) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("source_snapshot_id", snapshotId).limit(1).maybeSingle();
    if (error) return mock.find((d) => d.source_snapshot_id === snapshotId) ?? null;
    return (data as VaultFinanceDraft) ?? null;
  } catch {
    return mock.find((d) => d.source_snapshot_id === snapshotId) ?? null;
  }
}

export async function insertFinanceDraft(row: VaultFinanceDraft): Promise<VaultFinanceDraft> {
  const client = db();
  if (!client) { mock.unshift(row); return row; }
  const { data, error } = await client.from(TABLE).insert(row).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  return data as VaultFinanceDraft;
}

export async function updateFinanceDraft(id: string, patch: Partial<VaultFinanceDraft>): Promise<VaultFinanceDraft | null> {
  const next = { ...patch, updated_at: new Date().toISOString() };
  const client = db();
  if (!client) {
    const idx = mock.findIndex((d) => d.id === id);
    if (idx < 0) return null;
    mock[idx] = { ...mock[idx], ...next } as VaultFinanceDraft;
    return mock[idx];
  }
  const { data, error } = await client.from(TABLE).update(next).eq("id", id).select("*").single();
  if (error || !data) return null;
  return data as VaultFinanceDraft;
}

/**
 * Review status change as a true compare-and-set: only from an allowed prior status,
 * guarded by updated_at, with the audit entry appended onto the FRESHEST row's audit_log
 * (so concurrent reviews can't drop each other's trail). Retries on a lost race; returns
 * null if it could not apply.
 */
export async function reviewFinanceDraft(
  id: string,
  statusPatch: Partial<VaultFinanceDraft>,
  fromStates: string[],
  auditEntry: AuditEntry,
): Promise<VaultFinanceDraft | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const fresh = await getFinanceDraft(id);
    if (!fresh) return null;
    if (!fromStates.includes(fresh.status)) return null;
    const log = Array.isArray(fresh.audit_log) ? fresh.audit_log : [];
    const next = { ...statusPatch, audit_log: [...log, auditEntry].slice(-50), updated_at: new Date().toISOString() };
    const client = db();
    if (!client) {
      const idx = mock.findIndex((d) => d.id === id);
      if (idx < 0) return null;
      mock[idx] = { ...mock[idx], ...next } as VaultFinanceDraft;
      return mock[idx];
    }
    const { data, error } = await client.from(TABLE).update(next).eq("id", id).eq("updated_at", fresh.updated_at).in("status", fromStates).select("*").maybeSingle();
    if (error) return null;
    if (data) return data as VaultFinanceDraft;
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

// ── DTO — DEFENSE IN DEPTH: re-sanitize stored JSON; finance adapter ALWAYS disabled;
// rebuild safe_preview from sanitized fields; never raw payloads/credentials/IDs/numbers. ──
export function toFinanceDraftDTO(d: VaultFinanceDraft): VaultFinanceDraftDTO {
  const title = scrubText(typeof d.title === "string" ? d.title : "Untitled finance draft").slice(0, 160);
  const finance_type = (FINANCE_TYPES.includes(d.finance_type as FinanceType) ? d.finance_type : "custom") as FinanceType;
  const amount_summary = scrubOptional(d.amount_summary, 400);
  const line_items = scrubLineItems(d.line_items);
  const missing = scrubStrList(d.missing_inputs);
  const compliance = scrubStrList(d.compliance_notes);
  const rawEvidence = (d.evidence && typeof d.evidence === "object" && Array.isArray((d.evidence as { items?: unknown }).items))
    ? (d.evidence as { items: unknown[] }).items : [];
  return {
    id: d.id,
    client_id: refStr(d.client_id),
    title,
    description: scrubOptional(d.description, 600),
    finance_type,
    source_agent: refStr(d.source_agent),
    source_action_id: typeof d.source_action_id === "string" ? d.source_action_id : null,
    source_snapshot_id: refStr(d.source_snapshot_id),
    status: d.status,
    // Whitelist risk/target at the boundary — never trust a malformed/backfilled row.
    risk_level: (RISK_LEVELS as readonly string[]).includes(d.risk_level) ? d.risk_level : "level_3_money_ads_workflow",
    target_system: (FINANCE_TARGET_SYSTEMS as readonly string[]).includes(d.target_system) ? d.target_system : "internal",
    amount_summary,
    calculation: scrubOptional(d.calculation, 1000),
    line_items,
    partner_split: scrubPartnerSplit(d.partner_split),
    payment_terms: scrubOptional(d.payment_terms, 400),
    follow_up_message_ref: refStr(d.follow_up_message_ref),
    missing_inputs: missing,
    compliance_notes: compliance,
    safe_preview: buildFinanceSafePreview(title, finance_type, amount_summary, line_items),
    evidence: { items: scrubStrList(rawEvidence) },
    audit_log: sanitizeAuditLog(d.audit_log),
    line_item_count: line_items.length,
    missing_inputs_count: missing.length,
    compliance_notes_count: compliance.length,
    adapter_enabled: false,          // finance adapter disabled in Phase 9.6
    future_adapter_required: true,   // any send/charge needs a future approved adapter
    reviewed_by: refStr(d.reviewed_by),
    reviewed_at: d.reviewed_at,
    created_by: refStr(d.created_by),
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

export async function getFinanceDraftCounts(): Promise<FinanceDraftCounts> {
  const all = await getFinanceDrafts(1000);
  const counts: FinanceDraftCounts = {
    draft: 0, pending_review: 0, approved_internal: 0, needs_revision: 0,
    rejected: 0, archived: 0, future_adapter_required: 0, total: all.length, missing_inputs: 0,
  };
  for (const d of all) {
    if ((d.status as FinanceStatus) in counts) (counts as unknown as Record<string, number>)[d.status] += 1;
    if (Array.isArray(d.missing_inputs) && d.missing_inputs.length > 0) counts.missing_inputs += 1;
  }
  return counts;
}
