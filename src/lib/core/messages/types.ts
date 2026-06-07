// Vault Core — Lead Reply + Client Message DRAFT types (Phase 9.4).
//
// DRAFT-ONLY. A VaultMessageDraft is an INTERNAL review artifact describing a message
// a human might later send. NOTHING here sends SMS/email, updates a GHL contact, or
// triggers a workflow — there is no live send adapter in this phase. No raw provider
// payloads, no credentials, no live provider IDs, and no raw contact PII (only a
// sanitized `contact_ref` label) are modelled or stored.

import type { RiskLevel, TargetSystem, AuditEntry } from "../actions/types";

export const MESSAGE_STATUSES = [
  "draft",
  "pending_review",
  "approved_internal",
  "needs_revision",
  "rejected",
  "archived",
  "future_adapter_required",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const MESSAGE_CHANNELS = [
  "sms",
  "email",
  "internal_note",
  "client_update",
  "lead_reply",
  "report_message",
] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const MESSAGE_AUDIENCES = [
  "lead",
  "client",
  "internal",
  "setter",
  "media_buyer",
  "owner",
] as const;
export type MessageAudience = (typeof MESSAGE_AUDIENCES)[number];

export const MESSAGE_TYPES = [
  "lead_reply",
  "missed_call_reply",
  "appointment_confirmation",
  "appointment_reminder",
  "no_show_follow_up",
  "estimate_follow_up",
  "proposal_follow_up",
  "onboarding_access_request",
  "client_check_in",
  "client_update",
  "payment_follow_up",
  "report_summary",
  "review_request",
  "reactivation",
  "nurture_message",
  "competitor_response",
  "custom",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

// Target systems a message could one day route through — ALL external ones are
// disabled in this phase (no send adapter exists).
export const MESSAGE_TARGET_SYSTEMS = ["internal", "sms", "email", "ghl", "report"] as const;

export interface MessageSafePreview {
  summary: string;
  channel: MessageChannel;
  preview_lines: string[];
}

export interface VaultMessageDraft {
  id: string;
  client_id: string | null;
  // NOTE (Phase 9.4 data minimization): there is intentionally NO `lead_id` — a raw
  // lead/contact/provider id is never accepted or stored. Only a sanitized
  // `contact_ref` label is kept. (This diverges from the spec's suggested field list.)
  contact_ref: string | null; // sanitized label only — never raw PII
  title: string;
  message_type: MessageType;
  channel: MessageChannel;
  audience: MessageAudience;
  source_agent: string | null;
  source_action_id: string | null;
  source_workflow_draft_id: string | null;
  status: MessageStatus;
  risk_level: RiskLevel;
  target_system: TargetSystem;
  subject: string | null;
  body: string;
  tone: string | null;
  intent: string | null;
  personalization_tokens: string[]; // placeholders only e.g. {{contact.first_name}}
  missing_inputs: string[];
  compliance_notes: string[];
  safe_preview: MessageSafePreview;
  evidence: { items: string[] };
  audit_log: AuditEntry[];
  metadata: Record<string, unknown>;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultMessageDraftInput {
  client_id?: string | null;
  contact_ref?: string | null;
  title: string;
  message_type: MessageType;
  channel: MessageChannel;
  audience: MessageAudience;
  source_agent?: string | null;
  source_action_id?: string | null;
  source_workflow_draft_id?: string | null;
  target_system?: TargetSystem;
  subject?: string | null;
  body: string;
  tone?: string | null;
  intent?: string | null;
  personalization_tokens?: string[];
  missing_inputs?: string[];
  compliance_notes?: string[];
  evidence?: string[];
  metadata?: Record<string, unknown>;
}

export interface VaultMessageDraftDTO {
  id: string;
  client_id: string | null;
  // lead_id is intentionally NOT exposed in the DTO — it could be a provider/contact id.
  // Only a sanitized `contact_ref` label is surfaced to clients.
  contact_ref: string | null;
  title: string;
  message_type: MessageType;
  channel: MessageChannel;
  audience: MessageAudience;
  source_agent: string | null;
  source_action_id: string | null;
  source_workflow_draft_id: string | null;
  status: MessageStatus;
  risk_level: RiskLevel;
  target_system: TargetSystem;
  subject: string | null;
  body: string;
  tone: string | null;
  intent: string | null;
  personalization_tokens: string[];
  missing_inputs: string[];
  compliance_notes: string[];
  safe_preview: MessageSafePreview;
  evidence: { items: string[] };
  audit_log: AuditEntry[];
  missing_inputs_count: number;
  compliance_notes_count: number;
  adapter_enabled: boolean;          // always false (send adapter disabled in 9.4)
  future_adapter_required: boolean;  // true — sending needs a future approved adapter
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageDraftCounts {
  draft: number;
  pending_review: number;
  approved_internal: number;
  needs_revision: number;
  rejected: number;
  archived: number;
  future_adapter_required: number;
  total: number;
}

export type MessageReviewAction = "approve_internal" | "request_revision" | "reject" | "archive";
