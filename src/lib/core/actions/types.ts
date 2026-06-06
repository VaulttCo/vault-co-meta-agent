// Vault Core — Approved Execution Engine types (Phase 9.0).
//
// Agents PREPARE actions → Vera/Vesper quality-check → human approves → an
// approved action may EXECUTE only via an ENABLED adapter. In Phase 9.0 the ONLY
// enabled adapter is the INTERNAL adapter. All external adapters (GHL/Meta/Stripe/
// SMS/email/calendar/Slack/ClickUp/website) are DISABLED and return adapter_disabled.
// Nothing here sends/launches/charges/mutates any external system.

export const ACTION_TYPES = [
  "create_internal_task",
  "prepare_content_idea",
  "prepare_competitor_response",
  "prepare_client_success_plan",
  "prepare_tracking_fix",
  "prepare_budget_recommendation",
  "draft_client_message",
  "draft_lead_reply",
  "draft_ghl_workflow",
  "draft_meta_campaign",
  "draft_report",
  "draft_invoice",
  "send_sms",
  "send_email",
  "create_ghl_workflow",
  "update_ghl_contact",
  "launch_meta_campaign",
  "update_meta_budget",
  "create_stripe_invoice",
  "publish_report",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const TARGET_SYSTEMS = [
  "internal", "content", "report", // INTERNAL — executable by the internal adapter
  "ghl", "meta", "stripe", "email", "sms", "calendar", "slack", "clickup", "website", // EXTERNAL — disabled
] as const;
export type TargetSystem = (typeof TARGET_SYSTEMS)[number];

export const RISK_LEVELS = [
  "level_0_internal_note",
  "level_1_internal_action",
  "level_2_client_facing_message",
  "level_3_money_ads_workflow",
  "level_4_admin_critical",
] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const APPROVAL_STATUSES = [
  "pending_review", "approved", "rejected", "needs_revision", "archived",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const EXECUTION_STATUSES = [
  "not_ready", "blocked", "ready_after_approval", "adapter_disabled", "executing", "executed", "failed", "cancelled",
] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export type ReviewAction = "approve" | "reject" | "request_revision" | "archive";

// Human-assignable priority (Phase 9.2). Stored in metadata, surfaced on the DTO.
export const ACTION_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type ActionPriority = (typeof ACTION_PRIORITIES)[number];

// Lifecycle events recorded in audit_log (Phase 9.2). Audit-only — appending one
// NEVER bypasses approval or executes anything; the governed status transitions
// still happen only through the review/execute routes.
export const LIFECYCLE_EVENTS = [
  "created", "generated", "reviewed_by_vera_vesper",
  "approved", "rejected", "revision_requested", "archived",
  "assigned", "priority_changed", "note_added",
  "execution_ready", "internal_execution_started", "internal_execution_completed",
  "internal_execution_failed", "adapter_disabled",
] as const;
export type LifecycleEvent = (typeof LIFECYCLE_EVENTS)[number];

export interface AuditEntry {
  at: string;
  actor: string; // user id or agent id or "system"
  event: string;
  detail?: string;
  // Phase 9.2 lifecycle-timeline fields (all optional; older entries omit them).
  message?: string;            // human-readable description of the event
  previous_status?: string;    // approval/execution status before this event
  next_status?: string;        // approval/execution status after this event
  note?: string;               // sanitized human note text (event = "note_added")
  metadata?: Record<string, unknown>;
}

export interface VaultAction {
  id: string;
  agent_id: string;
  // Human creator for MANUAL actions (a real user id); null for agent-originated
  // actions. Keeps audit attribution honest — a manual action is never recorded as
  // having been "prepared by" an agent it was merely filed under.
  created_by: string | null;
  source_type: string | null; // "recommendation" | "memory_node" | "competitor_capture" | "manual" | …
  source_id: string | null;
  client_id: string | null;
  title: string;
  summary: string;
  action_type: ActionType;
  target_system: TargetSystem;
  risk_level: RiskLevel;
  approval_status: ApprovalStatus;
  execution_status: ExecutionStatus;
  // Raw working payload — SERVER-SIDE ONLY, never returned to the client.
  payload: Record<string, unknown>;
  // Human-safe summary shown in the UI (no raw payload / credentials / PII).
  safe_preview: string;
  reason: string | null;
  evidence: string[];
  constraints: string[];
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  executed_by_agent: string | null;
  executed_at: string | null;
  execution_result: Record<string, unknown> | null;
  execution_error: string | null;
  rollback_notes: string | null;
  audit_log: AuditEntry[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Creation input (validated/sanitized server-side) ──
export interface VaultActionInput {
  agent_id: string;
  action_type: ActionType;
  title: string;
  summary: string;
  reason?: string | null;
  client_id?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  evidence?: string[];
  constraints?: string[];
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ── Public DTO (what the API returns to the client) ──
// OMITS the raw `payload` and `execution_result` blobs; exposes `safe_preview`.
export interface VaultActionDTO {
  id: string;
  agent_id: string;
  created_by: string | null;
  client_id: string | null;
  title: string;
  summary: string;
  action_type: ActionType;
  target_system: TargetSystem;
  risk_level: RiskLevel;
  approval_status: ApprovalStatus;
  execution_status: ExecutionStatus;
  safe_preview: string;
  reason: string | null;
  evidence: string[];
  constraints: string[];
  requires_approval: boolean;
  source_type: string | null;
  source_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  executed_by_agent: string | null;
  executed_at: string | null;
  execution_error: string | null;
  rollback_notes: string | null;
  audit_log: AuditEntry[];
  adapter_enabled: boolean; // is the target adapter enabled (internal) or disabled (external)?
  // Phase 9.2 human triage fields (stored in metadata, surfaced here for the UI).
  owner: string | null;
  priority: ActionPriority | null;
  due_at: string | null;
  labels: string[];
  /** True when approved + ready_after_approval + internal adapter — i.e. executable now. */
  ready_to_execute: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ActionCounts {
  pending_review: number;
  approved: number;
  rejected: number;
  needs_revision: number;
  archived: number;
  executed: number;
  failed: number;
  adapter_disabled: number;
  high_risk_pending: number; // level_3+ awaiting review
  ready: number;             // approved + ready_after_approval + internal (executable now)
  ready_urgent_high: number; // ready AND priority urgent|high
  urgent_high_open: number;  // open (pending/approved/needs_revision) with priority urgent|high
  total: number;
}
