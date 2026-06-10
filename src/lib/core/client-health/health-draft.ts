// Vault Core — Client Health / Retention Risk Draft creation helper (Phase 9.8).
//
// Validates + sanitizes a client-health draft, attaches compliance notes + a draft-only
// audit entry, and inserts it as `pending_review`. NEVER contacts a client, NEVER sends
// SMS/email, NEVER creates/updates a GHL contact/task/opportunity/note, NEVER triggers a
// workflow, NEVER mutates Stripe/Meta, NEVER calls a provider API. Mock-safe.

import { validateClientHealthDraftInput } from "./validation";
import { insertClientHealthDraft } from "./db";
import { scrubText } from "../actions/validation";
import type { RiskLevel } from "../actions/types";
import type { VaultClientHealthDraft, VaultClientHealthDraftInput } from "./types";

export interface CreateClientHealthDraftResult {
  created: boolean;
  draft?: VaultClientHealthDraft;
  reason?: string;
}

export interface CreateClientHealthDraftOptions {
  createdBy?: string | null;
}

// Scrub + cap a known metadata string (template_key / suggested_owner). Redacts any
// emails/phones/tokens/keys before storage so metadata stays "sanitized content only".
function scrubMetadataString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = scrubText(v).slice(0, max).trim();
  return s || null;
}

// Risk tier: client-facing message tier (L2) by default; money tier (L3) when the draft is
// tied to finance/revenue/contract-risk context (a finance draft or revenue snapshot).
// Still draft-only and internal either way — the tier governs review weight, not execution.
function riskFor(val: { source_finance_draft_id: string | null; source_snapshot_id: string | null }): RiskLevel {
  return val.source_finance_draft_id || val.source_snapshot_id
    ? "level_3_money_ads_workflow"
    : "level_2_client_facing_message";
}

export async function createClientHealthDraft(
  input: VaultClientHealthDraftInput,
  opts: CreateClientHealthDraftOptions = {},
): Promise<CreateClientHealthDraftResult> {
  const v = validateClientHealthDraftInput(input);
  if (!v.ok || !v.value) return { created: false, reason: v.error ?? "invalid input" };
  const val = v.value;

  const now = new Date().toISOString();
  const templateKey = scrubMetadataString(input.metadata?.template_key, 80);
  const suggestedOwner = scrubMetadataString(input.metadata?.suggested_owner, 120);
  const row: VaultClientHealthDraft = {
    id: (() => { try { return crypto.randomUUID(); } catch { return `chd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; } })(),
    client_id: val.client_id,
    title: val.title,
    description: val.description,
    health_type: val.health_type,
    source_agent: val.source_agent,
    source_action_id: val.source_action_id,
    source_message_draft_id: val.source_message_draft_id,
    source_finance_draft_id: val.source_finance_draft_id,
    source_snapshot_id: val.source_snapshot_id,
    // A new draft enters the human review queue. It is NEVER auto-approved.
    status: "pending_review",
    risk_level: riskFor(val),
    target_system: val.target_system,
    health_score: val.health_score,
    risk_level_label: val.risk_level_label,
    risk_reasons: val.risk_reasons,
    missing_access: val.missing_access,
    missing_assets: val.missing_assets,
    delivery_risks: val.delivery_risks,
    communication_risks: val.communication_risks,
    next_best_actions: val.next_best_actions,
    owner_notes: val.owner_notes,
    save_plan: val.save_plan,
    upsell_opportunities: val.upsell_opportunities,
    follow_up_message_ref: val.follow_up_message_ref,
    missing_inputs: val.missing_inputs,
    compliance_notes: val.compliance_notes,
    safe_preview: val.safe_preview,
    evidence: { items: val.evidence },
    audit_log: [{
      at: now, actor: opts.createdBy ?? (val.source_agent ?? "system"),
      event: "created", message: "Client health draft created (draft-only · client-success adapter disabled).", next_status: "pending_review",
    }],
    // Only safe, known metadata keys — never store arbitrary/unsanitized input.metadata.
    metadata: {
      draft_only: true,
      client_success_adapter: "disabled",
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
    const draft = await insertClientHealthDraft(row);
    return { created: true, draft };
  } catch (e) {
    return { created: false, reason: (e as Error).message };
  }
}
