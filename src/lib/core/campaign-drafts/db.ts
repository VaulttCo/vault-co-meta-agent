// Vault Core — Meta Campaign Draft data layer (Phase 9.5, server-side).
//
// Mock-safe: in-memory store (starts EMPTY) when Supabase is unconfigured or the
// meta_campaign_drafts table is absent; otherwise persists via the service-role client.
// DRAFT-ONLY: nothing here launches, mutates, or calls Meta. DTOs RE-SANITIZE stored
// JSON at the boundary and never expose raw provider payloads, credentials/tokens, live
// campaign/ad-account IDs, or numeric budget values destined for a Meta API.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scrubText } from "../actions/validation";
import {
  scrubStrList, scrubOptional, scrubAudience, scrubAdSets, scrubAdCopy, scrubLeadForm,
  scrubBudget, buildCampaignSafePreview,
} from "./validation";
import { CAMPAIGN_TYPES } from "./types";
import { RISK_LEVELS } from "../actions/types";
import type {
  VaultMetaCampaignDraft, VaultMetaCampaignDraftDTO, CampaignDraftCounts, CampaignStatus, CampaignType,
} from "./types";
import type { AuditEntry } from "../actions/types";

const TABLE = "meta_campaign_drafts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseServerClient();
}

const mock: VaultMetaCampaignDraft[] = [];

export async function getCampaignDrafts(limit = 500): Promise<VaultMetaCampaignDraft[]> {
  const client = db();
  if (!client) return [...mock];
  try {
    const { data, error } = await client.from(TABLE).select("*").order("created_at", { ascending: false }).limit(limit);
    if (error || !data) return [...mock];
    return data as VaultMetaCampaignDraft[];
  } catch {
    return [...mock];
  }
}

export async function getCampaignDraft(id: string): Promise<VaultMetaCampaignDraft | null> {
  const client = db();
  if (!client) return mock.find((d) => d.id === id) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) return mock.find((d) => d.id === id) ?? null;
    return (data as VaultMetaCampaignDraft) ?? null;
  } catch {
    return mock.find((d) => d.id === id) ?? null;
  }
}

/** Idempotency lookup for the from-action handoff (1:1 action → campaign draft). */
export async function getCampaignDraftBySourceAction(actionId: string): Promise<VaultMetaCampaignDraft | null> {
  const client = db();
  if (!client) return mock.find((d) => d.source_action_id === actionId) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("source_action_id", actionId).limit(1).maybeSingle();
    if (error) return mock.find((d) => d.source_action_id === actionId) ?? null;
    return (data as VaultMetaCampaignDraft) ?? null;
  } catch {
    return mock.find((d) => d.source_action_id === actionId) ?? null;
  }
}

export async function insertCampaignDraft(row: VaultMetaCampaignDraft): Promise<VaultMetaCampaignDraft> {
  const client = db();
  if (!client) { mock.unshift(row); return row; }
  const { data, error } = await client.from(TABLE).insert(row).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  return data as VaultMetaCampaignDraft;
}

export async function updateCampaignDraft(id: string, patch: Partial<VaultMetaCampaignDraft>): Promise<VaultMetaCampaignDraft | null> {
  const next = { ...patch, updated_at: new Date().toISOString() };
  const client = db();
  if (!client) {
    const idx = mock.findIndex((d) => d.id === id);
    if (idx < 0) return null;
    mock[idx] = { ...mock[idx], ...next } as VaultMetaCampaignDraft;
    return mock[idx];
  }
  const { data, error } = await client.from(TABLE).update(next).eq("id", id).select("*").single();
  if (error || !data) return null;
  return data as VaultMetaCampaignDraft;
}

/**
 * Review status change as a true compare-and-set: only from an allowed prior status,
 * guarded by updated_at, with the audit entry appended onto the FRESHEST row's audit_log
 * (so concurrent reviews can't drop each other's trail). Retries on a lost race; returns
 * null if it could not apply.
 */
export async function reviewCampaignDraft(
  id: string,
  statusPatch: Partial<VaultMetaCampaignDraft>,
  fromStates: string[],
  auditEntry: AuditEntry,
): Promise<VaultMetaCampaignDraft | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const fresh = await getCampaignDraft(id);
    if (!fresh) return null;
    if (!fromStates.includes(fresh.status)) return null;
    const log = Array.isArray(fresh.audit_log) ? fresh.audit_log : [];
    const next = { ...statusPatch, audit_log: [...log, auditEntry].slice(-50), updated_at: new Date().toISOString() };
    const client = db();
    if (!client) {
      const idx = mock.findIndex((d) => d.id === id);
      if (idx < 0) return null;
      mock[idx] = { ...mock[idx], ...next } as VaultMetaCampaignDraft;
      return mock[idx];
    }
    const { data, error } = await client.from(TABLE).update(next).eq("id", id).eq("updated_at", fresh.updated_at).in("status", fromStates).select("*").maybeSingle();
    if (error) return null;
    if (data) return data as VaultMetaCampaignDraft;
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

// ── DTO — DEFENSE IN DEPTH: re-sanitize stored JSON; Meta adapter ALWAYS disabled;
// rebuild safe_preview from sanitized fields; never raw payloads/credentials/IDs. ──
export function toCampaignDraftDTO(d: VaultMetaCampaignDraft): VaultMetaCampaignDraftDTO {
  const title = scrubText(typeof d.title === "string" ? d.title : "Untitled campaign").slice(0, 160);
  const campaign_type = (CAMPAIGN_TYPES.includes(d.campaign_type as CampaignType) ? d.campaign_type : "custom") as CampaignType;
  const objective = scrubOptional(d.objective, 400) ?? "Lead generation (draft)";
  const offer_angle = scrubOptional(d.offer_angle, 400);
  const ad_sets = scrubAdSets(d.ad_sets);
  const creative_direction = scrubStrList(d.creative_direction);
  const missing = scrubStrList(d.missing_inputs);
  const compliance = scrubStrList(d.compliance_notes);
  const launch_checklist = scrubStrList(d.launch_checklist);
  const rawEvidence = (d.evidence && typeof d.evidence === "object" && Array.isArray((d.evidence as { items?: unknown }).items))
    ? (d.evidence as { items: unknown[] }).items : [];
  return {
    id: d.id,
    client_id: refStr(d.client_id),
    title,
    description: scrubOptional(d.description, 600),
    campaign_type,
    source_agent: refStr(d.source_agent),
    source_action_id: typeof d.source_action_id === "string" ? d.source_action_id : null,
    source_competitor_profile_id: typeof d.source_competitor_profile_id === "string" ? d.source_competitor_profile_id : null,
    status: d.status,
    // Whitelist risk at the boundary; target is pinned to "meta" regardless of stored value.
    risk_level: (RISK_LEVELS as readonly string[]).includes(d.risk_level) ? d.risk_level : "level_3_money_ads_workflow",
    target_system: "meta",
    objective,
    offer_angle,
    audience: scrubAudience(d.audience),
    ad_sets,
    creative_direction,
    ad_copy: scrubAdCopy(d.ad_copy),
    lead_form: scrubLeadForm(d.lead_form),
    budget_recommendation: scrubBudget(d.budget_recommendation),
    launch_checklist,
    missing_inputs: missing,
    compliance_notes: compliance,
    safe_preview: buildCampaignSafePreview(title, campaign_type, objective, ad_sets, offer_angle),
    evidence: { items: scrubStrList(rawEvidence) },
    audit_log: sanitizeAuditLog(d.audit_log),
    ad_set_count: ad_sets.length,
    missing_inputs_count: missing.length,
    compliance_notes_count: compliance.length,
    adapter_enabled: false,          // Meta adapter disabled in Phase 9.5
    future_adapter_required: true,   // launching needs a future approved adapter
    reviewed_by: refStr(d.reviewed_by),
    reviewed_at: d.reviewed_at,
    created_by: refStr(d.created_by),
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

export async function getCampaignDraftCounts(): Promise<CampaignDraftCounts> {
  const all = await getCampaignDrafts(1000);
  const counts: CampaignDraftCounts = {
    draft: 0, pending_review: 0, approved_internal: 0, needs_revision: 0,
    rejected: 0, archived: 0, future_adapter_required: 0, total: all.length, missing_inputs: 0,
  };
  for (const d of all) {
    if ((d.status as CampaignStatus) in counts) (counts as unknown as Record<string, number>)[d.status] += 1;
    if (Array.isArray(d.missing_inputs) && d.missing_inputs.length > 0) counts.missing_inputs += 1;
  }
  return counts;
}
