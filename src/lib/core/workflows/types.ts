// Vault Core — GHL Workflow Builder DRAFT MODE types (Phase 9.3).
//
// DRAFT-ONLY. A GHLWorkflowDraft is an INTERNAL review artifact describing a GHL
// follow-up workflow a human might later build. Nothing here publishes, creates,
// updates, or triggers anything in GHL — there is no live GHL adapter in this phase.
// Every step is `draft_only`. No raw GHL payloads, no provider credentials, no live
// GHL IDs, no contact PII are modelled or stored.

import type { RiskLevel, TargetSystem, AuditEntry } from "../actions/types";

export const WORKFLOW_TYPES = [
  "missed_call_text_back",
  "speed_to_lead_new_inquiry",
  "appointment_confirmation",
  "appointment_reminder",
  "no_show_follow_up",
  "estimate_follow_up",
  "proposal_follow_up",
  "review_request",
  "reactivation",
  "nurture_sequence",
  "onboarding_access_request",
  "client_check_in",
  "custom",
] as const;
export type WorkflowType = (typeof WORKFLOW_TYPES)[number];

export const WORKFLOW_STATUSES = [
  "draft",
  "pending_review",
  "approved_internal",
  "needs_revision",
  "rejected",
  "archived",
  "future_adapter_required",
] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

// Draft step types — DESIGN-TIME ONLY. None of these execute; `draft_sms`/`draft_email`
// hold draft copy that is never sent; tag/task/pipeline steps are marked draft-only;
// `webhook_placeholder` is explicitly disabled / future-adapter-required.
export const STEP_TYPES = [
  "wait",
  "condition",
  "internal_note",
  "draft_sms",
  "draft_email",
  "assign_user",
  "add_tag",
  "remove_tag",
  "create_task",
  "move_pipeline_stage",
  "webhook_placeholder",
  "stop_sequence",
] as const;
export type StepType = (typeof STEP_TYPES)[number];

export interface WorkflowStep {
  id: string;
  type: StepType;
  label: string;
  description: string;
  /** Always true — a marker that this step is design-time only and never executes. */
  draft_only: true;
  // Optional, type-specific (all sanitized, capped, no PII/secrets/live IDs):
  draft_text?: string;      // draft_sms / draft_email body (never sent)
  wait_duration?: string;   // human-readable, e.g. "1 minute"
  condition?: string;       // human-readable condition logic
  tag?: string;             // add_tag / remove_tag (draft)
  task?: string;            // create_task (draft)
  pipeline_stage?: string;  // move_pipeline_stage (draft)
  assignee?: string;        // assign_user (draft, role/name not a live id)
  note?: string;            // internal_note
}

export interface WorkflowTrigger {
  type: string;        // e.g. "missed_call", "new_inquiry" (sanitized label)
  description: string; // human-readable description of the trigger condition
}

export interface WorkflowSafePreview {
  summary: string;
  step_summaries: string[];
}

export interface GHLWorkflowDraft {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  workflow_type: WorkflowType;
  source_agent: string | null;
  source_action_id: string | null;
  status: WorkflowStatus;
  risk_level: RiskLevel;
  target_system: TargetSystem; // always "ghl" in this phase
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  guardrails: Record<string, unknown>;
  required_assets: string[];
  missing_inputs: string[];
  human_review_notes: string | null;
  safe_preview: WorkflowSafePreview;
  evidence: { items: string[] };
  metadata: Record<string, unknown>;
  // Append-only governance trail (created / approved_internal / revision / reject / archive).
  audit_log: AuditEntry[];
  // governance stamps (internal review only)
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Creation input (validated/sanitized server-side).
export interface GHLWorkflowDraftInput {
  client_id?: string | null;
  title: string;
  description?: string | null;
  workflow_type: WorkflowType;
  source_agent?: string | null;
  source_action_id?: string | null;
  trigger?: Partial<WorkflowTrigger>;
  steps?: Partial<WorkflowStep>[];
  guardrails?: Record<string, unknown>;
  required_assets?: string[];
  missing_inputs?: string[];
  evidence?: string[];
  metadata?: Record<string, unknown>;
}

// Public DTO — returns sanitized steps + safe_preview; never raw GHL payloads,
// credentials, live IDs, or arbitrary metadata.
export interface GHLWorkflowDraftDTO {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  workflow_type: WorkflowType;
  source_agent: string | null;
  source_action_id: string | null;
  status: WorkflowStatus;
  risk_level: RiskLevel;
  target_system: TargetSystem;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  guardrails: Record<string, unknown>;
  required_assets: string[];
  missing_inputs: string[];
  human_review_notes: string | null;
  safe_preview: WorkflowSafePreview;
  evidence: { items: string[] };
  audit_log: AuditEntry[];
  step_count: number;
  missing_inputs_count: number;
  adapter_enabled: boolean;        // always false (GHL adapter disabled in 9.3)
  future_adapter_required: boolean; // true — publishing needs a future approved adapter
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDraftCounts {
  draft: number;
  pending_review: number;
  approved_internal: number;
  needs_revision: number;
  rejected: number;
  archived: number;
  future_adapter_required: number;
  total: number;
}

export type WorkflowReviewAction = "approve_internal" | "request_revision" | "reject" | "archive";
