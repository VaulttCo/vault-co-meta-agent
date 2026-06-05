// Vault Core — Execution policy (Phase 9.0). PURE.
//
// THE single gate that decides whether an approved action may execute. Every
// execute path MUST call this first. It fails CLOSED: anything uncertain → denied.

import type { VaultAction } from "./types";
import { ACTION_TYPES } from "./types";
import { ACTION_META, isAdapterEnabled, requiresApproval, requiresAdminApproval, requiresExplicitConfirm } from "./policies";

export interface ExecutionContext {
  /** Role of the human requesting execution. */
  role: string;
  /** Optional explicit confirmation flag (required for level_4). */
  confirm?: boolean;
}

export interface ExecutionDecision {
  allowed: boolean;
  reason: string;
  /** What execution_status to set when NOT allowed (e.g. adapter_disabled, blocked). */
  blockedStatus?: "adapter_disabled" | "blocked";
}

export function canExecute(action: VaultAction, ctx: ExecutionContext): ExecutionDecision {
  // 0. Known action type.
  if (!ACTION_TYPES.includes(action.action_type)) {
    return { allowed: false, reason: "Unknown action type.", blockedStatus: "blocked" };
  }

  // 0b. action_type is AUTHORITATIVE — re-derive target/risk and refuse to trust a
  // persisted row whose target_system or risk_level disagrees. A tampered/malformed
  // row (e.g. action_type=send_sms relabelled target=internal, low risk) must NEVER
  // pass the gate and reach the internal adapter. This enforces the external-disabled
  // invariant against the database itself, not just client input.
  const meta = ACTION_META[action.action_type];
  if (action.target_system !== meta.target || action.risk_level !== meta.risk) {
    return {
      allowed: false,
      reason: `Action metadata mismatch — target/risk do not match action_type "${action.action_type}".`,
      blockedStatus: "blocked",
    };
  }

  // 1. Approval gate — must be approved with an approver, never archived/rejected/revision.
  if (action.approval_status !== "approved") {
    return { allowed: false, reason: `Not approved (status: ${action.approval_status}).`, blockedStatus: "blocked" };
  }
  if (!action.approved_by) {
    return { allowed: false, reason: "Missing approved_by.", blockedStatus: "blocked" };
  }
  if (requiresApproval(action.risk_level) && !action.requires_approval) {
    return { allowed: false, reason: "Risk requires approval but action not flagged.", blockedStatus: "blocked" };
  }

  // 2. Vera/Vesper safety must PASS — and fail CLOSED. A row missing its
  // quality_gate (backfill / direct service-role write / tampering) is NOT trusted:
  // execution requires an explicit, recognized passing safety status. "safe" passes
  // outright; "needs_human_review" passes only because a human already approved this
  // row above. "unsafe", an unknown status, or a missing gate all deny.
  const EXECUTABLE_SAFETY = new Set(["safe", "needs_human_review"]);
  const qg = (action.metadata as { quality_gate?: { safety_status?: string } } | undefined)?.quality_gate;
  if (!qg || typeof qg.safety_status !== "string" || !EXECUTABLE_SAFETY.has(qg.safety_status)) {
    return {
      allowed: false,
      reason: "Vera/Vesper safety did not pass (missing or non-passing safety status) — needs human revision.",
      blockedStatus: "blocked",
    };
  }

  // 3. Adapter must be ENABLED for the target. External targets are disabled in 9.0.
  if (!isAdapterEnabled(action.target_system)) {
    return {
      allowed: false,
      reason: `External adapter for "${action.target_system}" is disabled. Approved, but a future approved adapter is required to execute.`,
      blockedStatus: "adapter_disabled",
    };
  }

  // 4. Risk-based approver checks.
  if (requiresAdminApproval(action.risk_level) && ctx.role !== "admin") {
    return { allowed: false, reason: "This risk level requires an admin to execute.", blockedStatus: "blocked" };
  }
  if (requiresExplicitConfirm(action.risk_level) && ctx.confirm !== true) {
    return { allowed: false, reason: "Admin-critical action requires an explicit confirmation flag.", blockedStatus: "blocked" };
  }

  // 5. Not already terminal.
  if (action.execution_status === "executed") {
    return { allowed: false, reason: "Already executed.", blockedStatus: "blocked" };
  }
  if (action.execution_status === "cancelled") {
    return { allowed: false, reason: "Action was cancelled.", blockedStatus: "blocked" };
  }

  return { allowed: true, reason: "Approved internal action — execution permitted by policy." };
}
