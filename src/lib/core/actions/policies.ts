// Vault Core — Action policy maps (Phase 9.0). PURE.
//
// The action_type AUTHORITATIVELY determines the target system and risk level —
// never trusted from client input. Internal targets (internal/content/report) are
// executable by the internal adapter; every external target is DISABLED.

import type { ActionType, TargetSystem, RiskLevel } from "./types";

export interface ActionMeta {
  target: TargetSystem;
  risk: RiskLevel;
}

// Single source of truth: action_type → { target, risk }.
export const ACTION_META: Record<ActionType, ActionMeta> = {
  // Internal preparation/drafting — executable by the internal adapter.
  create_internal_task:        { target: "internal", risk: "level_1_internal_action" },
  prepare_content_idea:        { target: "content",  risk: "level_1_internal_action" },
  prepare_competitor_response: { target: "content",  risk: "level_1_internal_action" },
  prepare_client_success_plan: { target: "internal", risk: "level_1_internal_action" },
  prepare_tracking_fix:        { target: "internal", risk: "level_1_internal_action" },
  prepare_budget_recommendation: { target: "internal", risk: "level_1_internal_action" },
  draft_report:                { target: "report",   risk: "level_1_internal_action" },
  // Client-facing DRAFTS (internal artifacts) — require approval (level 2).
  draft_client_message:        { target: "content",  risk: "level_2_client_facing_message" },
  draft_lead_reply:            { target: "content",  risk: "level_2_client_facing_message" },
  draft_ghl_workflow:          { target: "content",  risk: "level_2_client_facing_message" },
  draft_meta_campaign:         { target: "content",  risk: "level_2_client_facing_message" },
  draft_invoice:               { target: "report",   risk: "level_2_client_facing_message" },
  // EXTERNAL actions — DISABLED adapters. Money / ads / workflows / sends.
  send_sms:              { target: "sms",     risk: "level_3_money_ads_workflow" },
  send_email:            { target: "email",   risk: "level_3_money_ads_workflow" },
  create_ghl_workflow:   { target: "ghl",     risk: "level_3_money_ads_workflow" },
  update_ghl_contact:    { target: "ghl",     risk: "level_3_money_ads_workflow" },
  launch_meta_campaign:  { target: "meta",    risk: "level_3_money_ads_workflow" },
  update_meta_budget:    { target: "meta",    risk: "level_3_money_ads_workflow" },
  create_stripe_invoice: { target: "stripe",  risk: "level_3_money_ads_workflow" },
  publish_report:        { target: "website", risk: "level_3_money_ads_workflow" },
};

// Targets the INTERNAL adapter can execute. EVERYTHING ELSE IS DISABLED.
export const INTERNAL_TARGETS: ReadonlySet<TargetSystem> = new Set(["internal", "content", "report"]);

/** Adapter enablement. Phase 9.0: internal-only. External adapters return
 *  adapter_disabled. This map is the safety boundary — flipping an external
 *  target to true requires a separate, explicitly-approved future phase. */
export function isAdapterEnabled(target: TargetSystem): boolean {
  return INTERNAL_TARGETS.has(target);
}

/** Risk ordinal for comparisons. */
export function riskOrdinal(r: RiskLevel): number {
  return [
    "level_0_internal_note",
    "level_1_internal_action",
    "level_2_client_facing_message",
    "level_3_money_ads_workflow",
    "level_4_admin_critical",
  ].indexOf(r);
}

/** Level 2+ always requires human approval before execution. */
export function requiresApproval(risk: RiskLevel): boolean {
  return riskOrdinal(risk) >= riskOrdinal("level_2_client_facing_message");
}

/** Level 3+ requires an ADMIN approver. Level 4 also needs an explicit confirm flag. */
export function requiresAdminApproval(risk: RiskLevel): boolean {
  return riskOrdinal(risk) >= riskOrdinal("level_3_money_ads_workflow");
}
export function requiresExplicitConfirm(risk: RiskLevel): boolean {
  return riskOrdinal(risk) >= riskOrdinal("level_4_admin_critical");
}
