// Vault Core — Message Draft creation helper (Phase 9.4).
//
// Validates + sanitizes a message draft, attaches compliance notes + a draft-only
// audit entry, and inserts it as `pending_review`. NEVER sends SMS/email, NEVER
// updates a GHL contact, NEVER triggers a workflow. Mock-safe.

import { validateMessageDraftInput } from "./validation";
import { insertMessageDraft } from "./db";
import type { VaultMessageDraft, VaultMessageDraftInput } from "./types";

export interface CreateMessageDraftResult {
  created: boolean;
  draft?: VaultMessageDraft;
  reason?: string;
}

export interface CreateMessageDraftOptions {
  createdBy?: string | null;
}

// Map a channel to its (always-disabled) target system. Sending is never enabled.
function targetForChannel(channel: string): VaultMessageDraft["target_system"] {
  switch (channel) {
    case "sms": case "lead_reply": return "sms";
    case "email": return "email";
    case "report_message": return "report";
    case "client_update": return "email";
    default: return "internal";
  }
}

export async function createMessageDraft(input: VaultMessageDraftInput, opts: CreateMessageDraftOptions = {}): Promise<CreateMessageDraftResult> {
  const v = validateMessageDraftInput(input);
  if (!v.ok || !v.value) return { created: false, reason: v.error ?? "invalid input" };
  const val = v.value;

  const now = new Date().toISOString();
  const row: VaultMessageDraft = {
    id: (() => { try { return crypto.randomUUID(); } catch { return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; } })(),
    client_id: val.client_id,
    contact_ref: val.contact_ref,
    title: val.title,
    message_type: val.message_type,
    channel: val.channel,
    audience: val.audience,
    source_agent: val.source_agent,
    source_action_id: val.source_action_id,
    source_workflow_draft_id: val.source_workflow_draft_id,
    // A new draft enters the human review queue. It is NEVER auto-approved.
    status: "pending_review",
    // Client/lead-facing messages require approval (level 2).
    risk_level: "level_2_client_facing_message",
    target_system: targetForChannel(val.channel),
    subject: val.subject,
    body: val.body,
    tone: val.tone,
    intent: val.intent,
    personalization_tokens: val.personalization_tokens,
    missing_inputs: val.missing_inputs,
    compliance_notes: val.compliance_notes,
    safe_preview: val.safe_preview,
    evidence: { items: val.evidence },
    audit_log: [{
      at: now, actor: opts.createdBy ?? (val.source_agent ?? "system"),
      event: "created", message: "Message draft created (draft-only).", next_status: "pending_review",
    }],
    // Only safe, known metadata keys — never store arbitrary/unsanitized input.metadata.
    metadata: {
      draft_only: true,
      send_adapter: "disabled",
      future_adapter_required: true,
      ...(typeof input.metadata?.template_key === "string" ? { template_key: input.metadata.template_key.slice(0, 80) } : {}),
      ...(typeof input.metadata?.source_step_id === "string" ? { source_step_id: input.metadata.source_step_id.slice(0, 80) } : {}),
    },
    reviewed_by: null,
    reviewed_at: null,
    created_by: opts.createdBy ?? null,
    created_at: now,
    updated_at: now,
  };

  try {
    const draft = await insertMessageDraft(row);
    return { created: true, draft };
  } catch (e) {
    return { created: false, reason: (e as Error).message };
  }
}
