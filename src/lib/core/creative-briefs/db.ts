// Vault Core — Creative Brief data layer (Phase 9.7, server-side).
//
// Mock-safe: in-memory store (starts EMPTY) when Supabase is unconfigured or the
// creative_briefs table is absent; otherwise persists via the service-role client. DRAFT-
// ONLY: nothing here posts, publishes, uploads, schedules, launches, or calls a social/
// Meta API. DTOs RE-SANITIZE stored JSON at the boundary and never expose raw provider
// payloads, credentials, live social/ad IDs, or raw creator/contact PII.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scrubText } from "../actions/validation";
import { scrubStrList, scrubOptional, buildBriefSafePreview } from "./validation";
import { BRIEF_TYPES, BRIEF_TARGET_SYSTEMS, BRIEF_PLATFORMS, CONTENT_FORMATS } from "./types";
import { RISK_LEVELS } from "../actions/types";
import type {
  VaultCreativeBrief, VaultCreativeBriefDTO, CreativeBriefCounts, BriefStatus,
  BriefType, BriefPlatform, ContentFormat,
} from "./types";
import type { AuditEntry } from "../actions/types";

const TABLE = "creative_briefs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseServerClient();
}

const mock: VaultCreativeBrief[] = [];

export async function getCreativeBriefs(limit = 500): Promise<VaultCreativeBrief[]> {
  const client = db();
  if (!client) return [...mock];
  try {
    const { data, error } = await client.from(TABLE).select("*").order("created_at", { ascending: false }).limit(limit);
    if (error || !data) return [...mock];
    return data as VaultCreativeBrief[];
  } catch {
    return [...mock];
  }
}

export async function getCreativeBrief(id: string): Promise<VaultCreativeBrief | null> {
  const client = db();
  if (!client) return mock.find((d) => d.id === id) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) return mock.find((d) => d.id === id) ?? null;
    return (data as VaultCreativeBrief) ?? null;
  } catch {
    return mock.find((d) => d.id === id) ?? null;
  }
}

/** Idempotency lookup for the from-action handoff (1:1 action → creative brief). */
export async function getCreativeBriefBySourceAction(actionId: string): Promise<VaultCreativeBrief | null> {
  const client = db();
  if (!client) return mock.find((d) => d.source_action_id === actionId) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("source_action_id", actionId).limit(1).maybeSingle();
    if (error) return mock.find((d) => d.source_action_id === actionId) ?? null;
    return (data as VaultCreativeBrief) ?? null;
  } catch {
    return mock.find((d) => d.source_action_id === actionId) ?? null;
  }
}

/** Idempotency lookup for the from-meta-campaign-draft handoff: one brief per
 *  (campaign draft, brief_type). */
export async function getCreativeBriefByCampaignAndType(campaignDraftId: string, briefType: string): Promise<VaultCreativeBrief | null> {
  const match = (d: VaultCreativeBrief) => d.source_meta_campaign_draft_id === campaignDraftId && d.brief_type === briefType;
  const client = db();
  if (!client) return mock.find(match) ?? null;
  try {
    const { data, error } = await client.from(TABLE).select("*").eq("source_meta_campaign_draft_id", campaignDraftId).limit(50);
    if (error || !data) return mock.find(match) ?? null;
    return (data as VaultCreativeBrief[]).find((d) => d.brief_type === briefType) ?? null;
  } catch {
    return mock.find(match) ?? null;
  }
}

export async function insertCreativeBrief(row: VaultCreativeBrief): Promise<VaultCreativeBrief> {
  const client = db();
  if (!client) { mock.unshift(row); return row; }
  const { data, error } = await client.from(TABLE).insert(row).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  return data as VaultCreativeBrief;
}

export async function updateCreativeBrief(id: string, patch: Partial<VaultCreativeBrief>): Promise<VaultCreativeBrief | null> {
  const next = { ...patch, updated_at: new Date().toISOString() };
  const client = db();
  if (!client) {
    const idx = mock.findIndex((d) => d.id === id);
    if (idx < 0) return null;
    mock[idx] = { ...mock[idx], ...next } as VaultCreativeBrief;
    return mock[idx];
  }
  const { data, error } = await client.from(TABLE).update(next).eq("id", id).select("*").single();
  if (error || !data) return null;
  return data as VaultCreativeBrief;
}

/**
 * Review status change as a true compare-and-set: only from an allowed prior status,
 * guarded by updated_at, with the audit entry appended onto the FRESHEST row's audit_log
 * (so concurrent reviews can't drop each other's trail). Retries on a lost race; returns
 * null if it could not apply.
 */
export async function reviewCreativeBrief(
  id: string,
  statusPatch: Partial<VaultCreativeBrief>,
  fromStates: string[],
  auditEntry: AuditEntry,
): Promise<VaultCreativeBrief | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const fresh = await getCreativeBrief(id);
    if (!fresh) return null;
    if (!fromStates.includes(fresh.status)) return null;
    const log = Array.isArray(fresh.audit_log) ? fresh.audit_log : [];
    const next = { ...statusPatch, audit_log: [...log, auditEntry].slice(-50), updated_at: new Date().toISOString() };
    const client = db();
    if (!client) {
      const idx = mock.findIndex((d) => d.id === id);
      if (idx < 0) return null;
      mock[idx] = { ...mock[idx], ...next } as VaultCreativeBrief;
      return mock[idx];
    }
    const { data, error } = await client.from(TABLE).update(next).eq("id", id).eq("updated_at", fresh.updated_at).in("status", fromStates).select("*").maybeSingle();
    if (error) return null;
    if (data) return data as VaultCreativeBrief;
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

// ── DTO — DEFENSE IN DEPTH: re-sanitize stored JSON; content adapter ALWAYS disabled;
// rebuild safe_preview from sanitized fields; never raw payloads/credentials/IDs/PII. ──
export function toCreativeBriefDTO(d: VaultCreativeBrief): VaultCreativeBriefDTO {
  const title = scrubText(typeof d.title === "string" ? d.title : "Untitled brief").slice(0, 160);
  const brief_type = (BRIEF_TYPES.includes(d.brief_type as BriefType) ? d.brief_type : "custom") as BriefType;
  const platform = (BRIEF_PLATFORMS.includes(d.platform as BriefPlatform) ? d.platform : "multi") as BriefPlatform;
  const content_format = (CONTENT_FORMATS.includes(d.content_format as ContentFormat) ? d.content_format : "video") as ContentFormat;
  const objective = scrubOptional(d.objective, 400) ?? "Define the objective (draft)";
  const hook_bank = scrubStrList(d.hook_bank);
  const deliverables = scrubStrList(d.deliverables);
  const missing = scrubStrList(d.missing_inputs);
  const compliance = scrubStrList(d.compliance_notes);
  const rawEvidence = (d.evidence && typeof d.evidence === "object" && Array.isArray((d.evidence as { items?: unknown }).items))
    ? (d.evidence as { items: unknown[] }).items : [];
  return {
    id: d.id,
    client_id: refStr(d.client_id),
    title,
    description: scrubOptional(d.description, 600),
    brief_type,
    source_agent: refStr(d.source_agent),
    source_action_id: typeof d.source_action_id === "string" ? d.source_action_id : null,
    source_meta_campaign_draft_id: typeof d.source_meta_campaign_draft_id === "string" ? d.source_meta_campaign_draft_id : null,
    source_competitor_profile_id: refStr(d.source_competitor_profile_id),
    status: d.status,
    // Whitelist risk/target at the boundary — never trust a malformed/backfilled row.
    risk_level: (RISK_LEVELS as readonly string[]).includes(d.risk_level) ? d.risk_level : "level_2_client_facing_message",
    target_system: (BRIEF_TARGET_SYSTEMS as readonly string[]).includes(d.target_system) ? d.target_system : "content",
    platform,
    content_format,
    objective,
    audience: scrubOptional(d.audience, 400),
    hook_bank,
    script: scrubOptional(d.script, 4000),
    shot_list: scrubStrList(d.shot_list),
    editor_notes: scrubOptional(d.editor_notes, 4000),
    visual_direction: scrubStrList(d.visual_direction),
    caption_options: scrubStrList(d.caption_options),
    thumbnail_concepts: scrubStrList(d.thumbnail_concepts),
    deliverables,
    missing_inputs: missing,
    compliance_notes: compliance,
    safe_preview: buildBriefSafePreview(title, brief_type, platform, objective, deliverables, hook_bank),
    evidence: { items: scrubStrList(rawEvidence) },
    audit_log: sanitizeAuditLog(d.audit_log),
    deliverable_count: deliverables.length,
    missing_inputs_count: missing.length,
    compliance_notes_count: compliance.length,
    adapter_enabled: false,          // content adapter disabled in Phase 9.7
    future_adapter_required: true,   // any post/publish/upload needs a future approved adapter
    reviewed_by: refStr(d.reviewed_by),
    reviewed_at: d.reviewed_at,
    created_by: refStr(d.created_by),
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

export async function getCreativeBriefCounts(): Promise<CreativeBriefCounts> {
  const all = await getCreativeBriefs(1000);
  const counts: CreativeBriefCounts = {
    draft: 0, pending_review: 0, approved_internal: 0, needs_revision: 0,
    rejected: 0, archived: 0, future_adapter_required: 0, total: all.length, missing_inputs: 0,
  };
  for (const d of all) {
    if ((d.status as BriefStatus) in counts) (counts as unknown as Record<string, number>)[d.status] += 1;
    if (Array.isArray(d.missing_inputs) && d.missing_inputs.length > 0) counts.missing_inputs += 1;
  }
  return counts;
}
