// Vault Core — Meta Campaign Draft creation helper (Phase 9.5).
//
// Validates + sanitizes a campaign draft, attaches compliance notes + a draft-only audit
// entry, and inserts it as `pending_review` on the DISABLED Meta lane. NEVER launches a
// campaign, NEVER changes a budget, NEVER creates an ad set/ad/lead form, NEVER calls a
// Meta API. Mock-safe.

import { validateCampaignDraftInput } from "./validation";
import { insertCampaignDraft } from "./db";
import { scrubText } from "../actions/validation";
import type { VaultMetaCampaignDraft, VaultMetaCampaignDraftInput } from "./types";

// Scrub + cap a known metadata string (template_key / suggested_owner). Redacts any
// emails/phones/tokens/keys before storage so metadata stays "sanitized content only".
// Returns null for non-strings or empties so the caller can drop the key entirely.
function scrubMetadataString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = scrubText(v).slice(0, max).trim();
  return s || null;
}

export interface CreateCampaignDraftResult {
  created: boolean;
  draft?: VaultMetaCampaignDraft;
  reason?: string;
}

export interface CreateCampaignDraftOptions {
  createdBy?: string | null;
}

export async function createCampaignDraft(
  input: VaultMetaCampaignDraftInput,
  opts: CreateCampaignDraftOptions = {},
): Promise<CreateCampaignDraftResult> {
  const v = validateCampaignDraftInput(input);
  if (!v.ok || !v.value) return { created: false, reason: v.error ?? "invalid input" };
  const val = v.value;

  const now = new Date().toISOString();
  const templateKey = scrubMetadataString(input.metadata?.template_key, 80);
  const suggestedOwner = scrubMetadataString(input.metadata?.suggested_owner, 120);
  const row: VaultMetaCampaignDraft = {
    id: (() => { try { return crypto.randomUUID(); } catch { return `mcd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; } })(),
    client_id: val.client_id,
    title: val.title,
    description: val.description,
    campaign_type: val.campaign_type,
    source_agent: val.source_agent,
    source_action_id: val.source_action_id,
    source_competitor_profile_id: val.source_competitor_profile_id,
    // A new draft enters the human review queue. It is NEVER auto-approved.
    status: "pending_review",
    // Money/ads/workflow tier — requires admin approval; Meta lane stays disabled.
    risk_level: "level_3_money_ads_workflow",
    target_system: "meta",
    objective: val.objective,
    offer_angle: val.offer_angle,
    audience: val.audience,
    ad_sets: val.ad_sets,
    creative_direction: val.creative_direction,
    ad_copy: val.ad_copy,
    lead_form: val.lead_form,
    budget_recommendation: val.budget_recommendation,
    launch_checklist: val.launch_checklist,
    missing_inputs: val.missing_inputs,
    compliance_notes: val.compliance_notes,
    safe_preview: val.safe_preview,
    evidence: { items: val.evidence },
    audit_log: [{
      at: now, actor: opts.createdBy ?? (val.source_agent ?? "system"),
      event: "created", message: "Meta campaign draft created (draft-only · Meta adapter disabled).", next_status: "pending_review",
    }],
    // Only safe, known metadata keys — never store arbitrary/unsanitized input.metadata.
    // The two known string keys are SCRUBBED (not just sliced) so no email/phone/token/key
    // material can be smuggled into stored metadata.
    metadata: {
      draft_only: true,
      meta_adapter: "disabled",
      future_adapter_required: true,
      ...(templateKey ? { template_key: templateKey } : {}),
      ...(suggestedOwner ? { suggested_owner: suggestedOwner } : {}),
    },
    reviewed_by: null,
    reviewed_at: null,
    created_by: opts.createdBy ?? null,
    created_at: now,
    updated_at: now,
  };

  try {
    const draft = await insertCampaignDraft(row);
    return { created: true, draft };
  } catch (e) {
    return { created: false, reason: (e as Error).message };
  }
}
