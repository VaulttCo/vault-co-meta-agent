// Vault Core — GHL Workflow Draft creation helper (Phase 9.3).
//
// Validates + sanitizes a draft, attaches draft-only guardrails, and inserts it as a
// `pending_review` INTERNAL review artifact. NEVER publishes to GHL, NEVER mutates a
// contact/opportunity/workflow, NEVER sends SMS/email. Mock-safe.

import { validateWorkflowDraftInput } from "./validation";
import { insertWorkflowDraft } from "./db";
import type { GHLWorkflowDraft, GHLWorkflowDraftInput } from "./types";

export interface CreateWorkflowDraftResult {
  created: boolean;
  draft?: GHLWorkflowDraft;
  reason?: string;
}

export interface CreateWorkflowDraftOptions {
  /** human user id (manual creation) or agent id (from an approved action). */
  createdBy?: string | null;
}

export async function createWorkflowDraft(input: GHLWorkflowDraftInput, opts: CreateWorkflowDraftOptions = {}): Promise<CreateWorkflowDraftResult> {
  const v = validateWorkflowDraftInput(input);
  if (!v.ok || !v.value) return { created: false, reason: v.error ?? "invalid input" };
  const val = v.value;

  const now = new Date().toISOString();
  const row: GHLWorkflowDraft = {
    id: (() => { try { return crypto.randomUUID(); } catch { return `wf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; } })(),
    client_id: val.client_id,
    title: val.title,
    description: val.description,
    workflow_type: val.workflow_type,
    source_agent: val.source_agent,
    source_action_id: val.source_action_id,
    // A new draft enters the human review queue. It is NEVER auto-approved.
    status: "pending_review",
    // GHL workflows are money/ads/workflow tier and require human approval.
    risk_level: "level_3_money_ads_workflow",
    target_system: "ghl",
    trigger: val.trigger,
    steps: val.steps,
    guardrails: val.guardrails,
    required_assets: val.required_assets,
    missing_inputs: val.missing_inputs,
    human_review_notes: null,
    safe_preview: val.safe_preview,
    evidence: { items: val.evidence },
    audit_log: [{
      at: now, actor: opts.createdBy ?? (val.source_agent ?? "system"),
      event: "created", message: "GHL workflow draft created (draft-only).", next_status: "pending_review",
    }],
    // Only safe, known metadata keys — never store arbitrary/unsanitized input.metadata.
    metadata: {
      draft_only: true,
      ghl_adapter: "disabled",
      future_adapter_required: true,
      ...(typeof input.metadata?.template_key === "string" ? { template_key: input.metadata.template_key.slice(0, 80) } : {}),
    },
    reviewed_by: null,
    reviewed_at: null,
    created_by: opts.createdBy ?? null,
    created_at: now,
    updated_at: now,
  };

  try {
    const draft = await insertWorkflowDraft(row);
    return { created: true, draft };
  } catch (e) {
    return { created: false, reason: (e as Error).message };
  }
}
