// Vault Core — agent action creation helper (Phase 9.0).
//
// Agents call createAction() to PREPARE an action. It validates + sanitizes,
// attaches Vera/Vesper quality metadata, dedupes against existing pending actions,
// and inserts the action as `pending_review`. It NEVER executes anything and
// NEVER bypasses approval — execution is a separate, human-triggered, policy-gated
// step. Level 2+ are force-flagged `requires_approval`. Mock-safe.

import { insertActivity } from "../memory/db";
import { scoreRecommendation } from "../recommendations/scoring";
import { ACTIVE_AGENT_IDS } from "../agents/registry";
import { validateActionInput } from "./validation";
import { insertAction, getActions } from "./db";
import { isAdapterEnabled } from "./policies";
import type { VaultAction, VaultActionInput, AuditEntry } from "./types";

export interface CreateActionResult {
  created: boolean;
  action?: VaultAction;
  reason?: string;
}

/** Who/what is creating this action. AGENT-originated actions must name an active
 *  workforce agent (audit actor = the agent). MANUAL actions are created by a human
 *  operator (audit actor + created_by = that human's user id) and are NOT attributed
 *  to an agent's authorship — `agent_id` is only a domain/lane tag for them. */
export interface CreateActionOptions {
  origin?: "agent" | "manual";
  /** Required for manual origin: the human user id that created the action. */
  actor?: string;
}

export async function createAction(input: VaultActionInput, opts: CreateActionOptions = {}): Promise<CreateActionResult> {
  const v = validateActionInput(input);
  if (!v.ok || !v.value) return { created: false, reason: v.error ?? "invalid input" };
  const val = v.value;

  const isManual = opts.origin === "manual" || !!opts.actor;
  if (isManual && !opts.actor) {
    return { created: false, reason: "manual action requires a human actor" };
  }

  // Audit integrity: an AGENT-originated action may only be attributed to an ACTIVE
  // workforce agent — this blocks agent code from filing under non-roster names
  // (codex, vera/vesper, victoria, arbitrary slugs). Manual/human actions are filed
  // under a dedicated non-agent `manual` lane regardless of any submitted agent_id,
  // so a human-created action can NEVER masquerade as a workforce agent in the feed;
  // its true author is the human, recorded via created_by + the audit actor below.
  if (!isManual && !ACTIVE_AGENT_IDS.includes(val.agent_id)) {
    return { created: false, reason: `agent_id "${val.agent_id}" is not an active workforce agent` };
  }
  const agentId = isManual ? "manual" : val.agent_id;

  // Vera/Vesper quality metadata (pure scoring; no mutation, no external calls).
  const q = scoreRecommendation({ agent: agentId, title: val.title, body: val.summary });

  // Dedupe — don't create a second pending action with the same lane + type + title.
  try {
    const existing = await getActions(500);
    const dup = existing.find(
      (a) =>
        a.approval_status === "pending_review" &&
        a.agent_id === agentId &&
        a.action_type === val.action_type &&
        a.title.toLowerCase() === val.title.toLowerCase()
    );
    if (dup) return { created: false, reason: "duplicate of an existing pending action" };
  } catch {
    /* fail-open: proceed to create */
  }

  const now = new Date().toISOString();
  // Audit actor is the TRUE author: the human for manual actions, the agent otherwise.
  const createdBy = isManual ? opts.actor! : null;
  const audit: AuditEntry[] = [{
    at: now,
    actor: isManual ? opts.actor! : agentId,
    event: "created",
    detail: isManual ? "Action created manually by a human operator." : "Action prepared by agent.",
  }];

  const row: VaultAction = {
    id: (() => { try { return crypto.randomUUID(); } catch { return `act-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; } })(),
    agent_id: agentId,
    created_by: createdBy,
    source_type: val.source_type,
    source_id: val.source_id,
    client_id: val.client_id,
    title: val.title,
    summary: val.summary,
    action_type: val.action_type,
    target_system: val.target_system,
    risk_level: val.risk_level,
    approval_status: "pending_review",
    // External targets are flagged adapter_disabled from birth so the UI is honest;
    // internal targets are "ready_after_approval" (still need a human approval first).
    execution_status: isAdapterEnabled(val.target_system) ? "ready_after_approval" : "adapter_disabled",
    payload: val.payload,
    safe_preview: val.safe_preview,
    reason: val.reason,
    evidence: val.evidence,
    constraints: val.constraints,
    requires_approval: val.requires_approval,
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    executed_by_agent: null,
    executed_at: null,
    execution_result: null,
    execution_error: null,
    rollback_notes: null,
    audit_log: audit,
    metadata: {
      ...val.metadata,
      quality_gate: {
        qualityScore: Number(q.qualityScore.toFixed(3)),
        safety_status: q.safetyStatus,
        reviewed_by: ["vera", "vesper"],
      },
      never_auto_execute: true,
      requires_human_review: true,
    },
    created_at: now,
    updated_at: now,
  };

  let action: VaultAction;
  try {
    action = await insertAction(row);
  } catch (e) {
    return { created: false, reason: (e as Error).message };
  }

  // Internal activity so the prepared action is visible in the brain/feed.
  try {
    const who = isManual ? "A human operator" : agentId;
    await insertActivity({
      agent: agentId,
      kind: "recommendation",
      message: `${who} prepared an action for human review: ${val.title} (${val.action_type.replace(/_/g, " ")}).`,
      node_id: null,
      metadata: { vault_action_id: action.id, requires_human_review: true },
    });
  } catch { /* non-fatal */ }

  return { created: true, action };
}
