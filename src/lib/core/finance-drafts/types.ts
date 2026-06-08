// Vault Core — Finance / Invoice Action Builder, DRAFT types (Phase 9.6).
//
// DRAFT-ONLY. A VaultFinanceDraft is an INTERNAL planning artifact describing finance /
// invoice work a human might later perform. NOTHING here creates/sends/finalizes a Stripe
// invoice, charges a card, collects a payment, moves money, touches a bank account, or
// calls any payment/provider API — there is no live finance adapter in this phase. No raw
// provider payloads, no credentials/tokens, no live Stripe IDs (invoice / payment-intent /
// customer / payment-method), and no card/bank/account numbers are modelled or stored.

import type { RiskLevel, AuditEntry } from "../actions/types";

export const FINANCE_STATUSES = [
  "draft",
  "pending_review",
  "approved_internal",
  "needs_revision",
  "rejected",
  "archived",
  "future_adapter_required",
] as const;
export type FinanceStatus = (typeof FINANCE_STATUSES)[number];

export const FINANCE_TYPES = [
  "setup_fee_invoice",
  "revenue_share_invoice",
  "monthly_retainer_invoice",
  "commission_calculation",
  "partner_split_summary",
  "payment_follow_up",
  "overdue_invoice_review",
  "revenue_closeout",
  "attribution_review",
  "refund_review",
  "custom",
] as const;
export type FinanceType = (typeof FINANCE_TYPES)[number];

// Where a finance draft would eventually route. `stripe` is a DISABLED external lane in
// this phase (no live adapter); `internal`/`report` are non-mutating internal lanes. The
// finance adapter is ALWAYS disabled regardless of target — nothing executes here.
export const FINANCE_TARGET_SYSTEMS = ["internal", "stripe", "report"] as const;
export type FinanceTargetSystem = (typeof FINANCE_TARGET_SYSTEMS)[number];

// ── Sanitized nested structures (stored as JSONB; re-sanitized at the DTO boundary) ──

export interface FinanceLineItem {
  label: string;
  amount_text: string | null;   // advisory text e.g. "$2,500" — NEVER a charge instruction
  notes: string | null;
}

export interface FinancePartnerSplit {
  summary: string | null;       // e.g. "Vault 5% of extra revenue; Nick 43% / Jaxon 57% of fee"
  shares: string[];             // advisory share lines, sanitized text only
}

export interface FinanceSafePreview {
  summary: string;
  finance_type: FinanceType;
  amount_line: string;
  line_item_count: number;
  highlights: string[];
}

export interface VaultFinanceDraft {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  finance_type: FinanceType;
  source_agent: string | null;
  source_action_id: string | null;
  source_snapshot_id: string | null;
  status: FinanceStatus;
  risk_level: RiskLevel;
  target_system: FinanceTargetSystem;
  amount_summary: string | null;   // text-only advisory summary — never a charge amount
  calculation: string | null;      // how the number was derived (advisory text)
  line_items: FinanceLineItem[];
  partner_split: FinancePartnerSplit;
  payment_terms: string | null;
  follow_up_message_ref: string | null; // sanitized ref to a message draft (no PII)
  missing_inputs: string[];
  compliance_notes: string[];
  safe_preview: FinanceSafePreview;
  evidence: { items: string[] };
  audit_log: AuditEntry[];
  metadata: Record<string, unknown>;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultFinanceDraftInput {
  client_id?: string | null;
  title: string;
  description?: string | null;
  finance_type: FinanceType;
  source_agent?: string | null;
  source_action_id?: string | null;
  source_snapshot_id?: string | null;
  target_system?: FinanceTargetSystem | null;
  amount_summary?: string | null;
  calculation?: string | null;
  line_items?: Array<Partial<FinanceLineItem>> | null;
  partner_split?: Partial<FinancePartnerSplit> | null;
  payment_terms?: string | null;
  follow_up_message_ref?: string | null;
  missing_inputs?: string[] | null;
  compliance_notes?: string[] | null;
  evidence?: string[];
  metadata?: Record<string, unknown>;
}

export interface VaultFinanceDraftDTO {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  finance_type: FinanceType;
  source_agent: string | null;
  source_action_id: string | null;
  source_snapshot_id: string | null;
  status: FinanceStatus;
  risk_level: RiskLevel;
  target_system: FinanceTargetSystem;
  amount_summary: string | null;
  calculation: string | null;
  line_items: FinanceLineItem[];
  partner_split: FinancePartnerSplit;
  payment_terms: string | null;
  follow_up_message_ref: string | null;
  missing_inputs: string[];
  compliance_notes: string[];
  safe_preview: FinanceSafePreview;
  evidence: { items: string[] };
  audit_log: AuditEntry[];
  line_item_count: number;
  missing_inputs_count: number;
  compliance_notes_count: number;
  adapter_enabled: boolean;          // always false (finance adapter disabled in 9.6)
  future_adapter_required: boolean;  // true — any send/charge needs a future approved adapter
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceDraftCounts {
  draft: number;
  pending_review: number;
  approved_internal: number;
  needs_revision: number;
  rejected: number;
  archived: number;
  future_adapter_required: number;
  total: number;
  missing_inputs: number; // drafts with at least one missing input
}

export type FinanceReviewAction = "approve_internal" | "request_revision" | "reject" | "archive";
