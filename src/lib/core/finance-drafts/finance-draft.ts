// Vault Core — Finance / Invoice Draft creation helper (Phase 9.6).
//
// Validates + sanitizes a finance draft, attaches compliance notes + a draft-only audit
// entry, and inserts it as `pending_review`. NEVER creates/sends/finalizes a Stripe
// invoice, NEVER charges a card, NEVER collects a payment, NEVER moves money, NEVER calls
// a Stripe/payment API. Mock-safe.

import { validateFinanceDraftInput } from "./validation";
import { insertFinanceDraft } from "./db";
import { scrubText } from "../actions/validation";
import type { VaultFinanceDraft, VaultFinanceDraftInput } from "./types";

export interface CreateFinanceDraftResult {
  created: boolean;
  draft?: VaultFinanceDraft;
  reason?: string;
}

export interface CreateFinanceDraftOptions {
  createdBy?: string | null;
}

// Scrub + cap a known metadata string (template_key / suggested_owner). Redacts any
// emails/phones/tokens/keys before storage so metadata stays "sanitized content only".
function scrubMetadataString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = scrubText(v).slice(0, max).trim();
  return s || null;
}

export async function createFinanceDraft(
  input: VaultFinanceDraftInput,
  opts: CreateFinanceDraftOptions = {},
): Promise<CreateFinanceDraftResult> {
  const v = validateFinanceDraftInput(input);
  if (!v.ok || !v.value) return { created: false, reason: v.error ?? "invalid input" };
  const val = v.value;

  const now = new Date().toISOString();
  const templateKey = scrubMetadataString(input.metadata?.template_key, 80);
  const suggestedOwner = scrubMetadataString(input.metadata?.suggested_owner, 120);
  const row: VaultFinanceDraft = {
    id: (() => { try { return crypto.randomUUID(); } catch { return `fin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; } })(),
    client_id: val.client_id,
    title: val.title,
    description: val.description,
    finance_type: val.finance_type,
    source_agent: val.source_agent,
    source_action_id: val.source_action_id,
    source_snapshot_id: val.source_snapshot_id,
    // A new draft enters the human review queue. It is NEVER auto-approved.
    status: "pending_review",
    // Money tier — requires admin approval; finance adapter stays disabled.
    risk_level: "level_3_money_ads_workflow",
    target_system: val.target_system,
    amount_summary: val.amount_summary,
    calculation: val.calculation,
    line_items: val.line_items,
    partner_split: val.partner_split,
    payment_terms: val.payment_terms,
    follow_up_message_ref: val.follow_up_message_ref,
    missing_inputs: val.missing_inputs,
    compliance_notes: val.compliance_notes,
    safe_preview: val.safe_preview,
    evidence: { items: val.evidence },
    audit_log: [{
      at: now, actor: opts.createdBy ?? (val.source_agent ?? "system"),
      event: "created", message: "Finance draft created (draft-only · finance adapter disabled).", next_status: "pending_review",
    }],
    // Only safe, known metadata keys — never store arbitrary/unsanitized input.metadata.
    metadata: {
      draft_only: true,
      finance_adapter: "disabled",
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
    const draft = await insertFinanceDraft(row);
    return { created: true, draft };
  } catch (e) {
    return { created: false, reason: (e as Error).message };
  }
}
