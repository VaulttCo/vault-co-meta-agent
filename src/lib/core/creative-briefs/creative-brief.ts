// Vault Core — Creative Brief creation helper (Phase 9.7).
//
// Validates + sanitizes a creative brief, attaches compliance notes + a draft-only audit
// entry, and inserts it as `pending_review`. NEVER posts/publishes/uploads/schedules to any
// social platform, NEVER launches a Meta ad, NEVER contacts a creator/client, NEVER calls a
// social/ad API. Mock-safe.

import { validateCreativeBriefInput } from "./validation";
import { insertCreativeBrief } from "./db";
import { scrubText } from "../actions/validation";
import type { RiskLevel } from "../actions/types";
import type { VaultCreativeBrief, VaultCreativeBriefInput, BriefType } from "./types";

export interface CreateCreativeBriefResult {
  created: boolean;
  brief?: VaultCreativeBrief;
  reason?: string;
}

export interface CreateCreativeBriefOptions {
  createdBy?: string | null;
}

// Scrub + cap a known metadata string (template_key / suggested_owner). Redacts any
// emails/phones/tokens/keys before storage so metadata stays "sanitized content only".
function scrubMetadataString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = scrubText(v).slice(0, max).trim();
  return s || null;
}

// Ad/campaign-linked creative is money/ads tier (L3); everything else is client-facing (L2).
function riskFor(brief_type: BriefType, linkedToCampaign: boolean): RiskLevel {
  const isAd = /ad_brief|competitor_response_creative/.test(brief_type);
  return isAd || linkedToCampaign ? "level_3_money_ads_workflow" : "level_2_client_facing_message";
}

export async function createCreativeBrief(
  input: VaultCreativeBriefInput,
  opts: CreateCreativeBriefOptions = {},
): Promise<CreateCreativeBriefResult> {
  const v = validateCreativeBriefInput(input);
  if (!v.ok || !v.value) return { created: false, reason: v.error ?? "invalid input" };
  const val = v.value;

  const now = new Date().toISOString();
  const templateKey = scrubMetadataString(input.metadata?.template_key, 80);
  const suggestedOwner = scrubMetadataString(input.metadata?.suggested_owner, 120);
  const row: VaultCreativeBrief = {
    id: (() => { try { return crypto.randomUUID(); } catch { return `cb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; } })(),
    client_id: val.client_id,
    title: val.title,
    description: val.description,
    brief_type: val.brief_type,
    source_agent: val.source_agent,
    source_action_id: val.source_action_id,
    source_meta_campaign_draft_id: val.source_meta_campaign_draft_id,
    source_competitor_profile_id: val.source_competitor_profile_id,
    // A new brief enters the human review queue. It is NEVER auto-approved.
    status: "pending_review",
    risk_level: riskFor(val.brief_type, !!val.source_meta_campaign_draft_id),
    target_system: val.target_system,
    platform: val.platform,
    content_format: val.content_format,
    objective: val.objective,
    audience: val.audience,
    hook_bank: val.hook_bank,
    script: val.script,
    shot_list: val.shot_list,
    editor_notes: val.editor_notes,
    visual_direction: val.visual_direction,
    caption_options: val.caption_options,
    thumbnail_concepts: val.thumbnail_concepts,
    deliverables: val.deliverables,
    missing_inputs: val.missing_inputs,
    compliance_notes: val.compliance_notes,
    safe_preview: val.safe_preview,
    evidence: { items: val.evidence },
    audit_log: [{
      at: now, actor: opts.createdBy ?? (val.source_agent ?? "system"),
      event: "created", message: "Creative brief created (draft-only · content adapter disabled).", next_status: "pending_review",
    }],
    // Only safe, known metadata keys — never store arbitrary/unsanitized input.metadata.
    metadata: {
      draft_only: true,
      content_adapter: "disabled",
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
    const brief = await insertCreativeBrief(row);
    return { created: true, brief };
  } catch (e) {
    return { created: false, reason: (e as Error).message };
  }
}
