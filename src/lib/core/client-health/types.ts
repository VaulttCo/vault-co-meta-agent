// Vault Core — Client Health / Retention Risk Builder, DRAFT types (Phase 9.8).
//
// DRAFT-ONLY. A VaultClientHealthDraft is an INTERNAL client-success planning artifact for
// Vault Co's OWN operations: which clients need attention, what access/assets are missing,
// what delivery/communication risks exist, and what internal action should be prepared.
// NOTHING here contacts a client, sends an SMS/email, creates/updates a GHL contact/task/
// opportunity/note, triggers a workflow, mutates Stripe/Meta, or calls any provider API —
// there is no live client-success adapter in this phase. No raw contact PII, no provider
// payloads, no credentials/tokens, and no live GHL/Stripe/Meta IDs are modelled or stored.
// health_score is an INTERNAL advisory label only — never a client-facing truth.

import type { RiskLevel, AuditEntry } from "../actions/types";

export const HEALTH_STATUSES = [
  "draft",
  "pending_review",
  "approved_internal",
  "needs_revision",
  "rejected",
  "archived",
  "future_adapter_required",
] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const HEALTH_TYPES = [
  "client_health_review",
  "retention_risk_review",
  "missing_access_review",
  "missing_assets_review",
  "stalled_delivery_review",
  "communication_risk_review",
  "onboarding_risk_review",
  "fulfillment_bottleneck_review",
  "client_save_plan",
  "upsell_opportunity_review",
  "monthly_client_health_closeout",
  "custom",
] as const;
export type HealthType = (typeof HEALTH_TYPES)[number];

// Where a client-health draft would eventually route. `ghl` / `message` are DISABLED
// external lanes in this phase (no live adapter); `internal` / `report` are non-mutating
// internal lanes. The client-success adapter is ALWAYS disabled regardless of target —
// nothing executes here and no client is ever contacted.
export const HEALTH_TARGET_SYSTEMS = ["internal", "report", "ghl", "message"] as const;
export type HealthTargetSystem = (typeof HEALTH_TARGET_SYSTEMS)[number];

// ── Sanitized nested structure (stored as JSONB; re-sanitized at the DTO boundary) ──

export interface ClientHealthSafePreview {
  summary: string;
  health_type: HealthType;
  score_line: string;        // e.g. "Health: 62/100 — At risk (advisory, internal)"
  risk_reason_count: number;
  highlights: string[];
}

export interface VaultClientHealthDraft {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  health_type: HealthType;
  source_agent: string | null;
  source_action_id: string | null;
  source_message_draft_id: string | null;
  source_finance_draft_id: string | null;
  // A safe AGGREGATE snapshot reference (e.g. "clientId:billingMonth"), never a raw
  // provider/customer id.
  source_snapshot_id: string | null;
  status: HealthStatus;
  risk_level: RiskLevel;
  target_system: HealthTargetSystem;
  health_score: string | null;       // INTERNAL advisory label/number text — never client-facing
  risk_level_label: string | null;   // e.g. "Healthy" | "Watch" | "At risk" | "Critical" (advisory)
  risk_reasons: string[];
  missing_access: string[];
  missing_assets: string[];
  delivery_risks: string[];
  communication_risks: string[];
  next_best_actions: string[];       // INTERNAL actions for the Vault Co team — never client contact
  owner_notes: string | null;        // handoff notes for Nick/Jaxon/team
  save_plan: string[];               // internal client-save steps (a human decides + acts)
  upsell_opportunities: string[];
  follow_up_message_ref: string | null; // sanitized ref to a message draft (no PII)
  missing_inputs: string[];
  compliance_notes: string[];
  safe_preview: ClientHealthSafePreview;
  evidence: { items: string[] };
  audit_log: AuditEntry[];
  metadata: Record<string, unknown>;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultClientHealthDraftInput {
  client_id?: string | null;
  title: string;
  description?: string | null;
  health_type: HealthType;
  source_agent?: string | null;
  source_action_id?: string | null;
  source_message_draft_id?: string | null;
  source_finance_draft_id?: string | null;
  source_snapshot_id?: string | null;
  target_system?: HealthTargetSystem | null;
  health_score?: string | null;
  risk_level_label?: string | null;
  risk_reasons?: string[] | null;
  missing_access?: string[] | null;
  missing_assets?: string[] | null;
  delivery_risks?: string[] | null;
  communication_risks?: string[] | null;
  next_best_actions?: string[] | null;
  owner_notes?: string | null;
  save_plan?: string[] | null;
  upsell_opportunities?: string[] | null;
  follow_up_message_ref?: string | null;
  missing_inputs?: string[] | null;
  compliance_notes?: string[] | null;
  evidence?: string[];
  metadata?: Record<string, unknown>;
}

export interface VaultClientHealthDraftDTO {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  health_type: HealthType;
  source_agent: string | null;
  source_action_id: string | null;
  source_message_draft_id: string | null;
  source_finance_draft_id: string | null;
  source_snapshot_id: string | null;
  status: HealthStatus;
  risk_level: RiskLevel;
  target_system: HealthTargetSystem;
  health_score: string | null;
  risk_level_label: string | null;
  risk_reasons: string[];
  missing_access: string[];
  missing_assets: string[];
  delivery_risks: string[];
  communication_risks: string[];
  next_best_actions: string[];
  owner_notes: string | null;
  save_plan: string[];
  upsell_opportunities: string[];
  follow_up_message_ref: string | null;
  missing_inputs: string[];
  compliance_notes: string[];
  safe_preview: ClientHealthSafePreview;
  evidence: { items: string[] };
  audit_log: AuditEntry[];
  risk_reason_count: number;
  missing_inputs_count: number;
  compliance_notes_count: number;
  adapter_enabled: boolean;          // always false (client-success adapter disabled in 9.8)
  future_adapter_required: boolean;  // true — any client contact needs a future approved adapter
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientHealthDraftCounts {
  draft: number;
  pending_review: number;
  approved_internal: number;
  needs_revision: number;
  rejected: number;
  archived: number;
  future_adapter_required: number;
  total: number;
  missing_inputs: number; // drafts with at least one missing input
  high_risk: number;      // drafts at level_3_money_ads_workflow or above
}

export type HealthReviewAction = "approve_internal" | "request_revision" | "reject" | "archive";
