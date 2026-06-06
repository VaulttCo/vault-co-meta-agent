// POST /api/core/actions/[id]/review — human approval governance.
// action ∈ approve | reject | request_revision | archive. This route NEVER
// executes anything and NEVER mutates external systems — it only changes the
// internal approval_status and appends to the audit log. Level 3+ approvals
// require an admin.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getAction, reviewTransition, toActionDTO } from "@/lib/core/actions/db";
import { requiresAdminApproval, isAdapterEnabled } from "@/lib/core/actions/policies";
import { scrubText } from "@/lib/core/actions/validation";
import type { ReviewAction, VaultAction, AuditEntry } from "@/lib/core/actions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }
const ACTIONS: ReviewAction[] = ["approve", "reject", "request_revision", "archive"];

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const action = await getAction(id);
  if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const review = body.action as ReviewAction;
  if (!ACTIONS.includes(review)) return NextResponse.json({ error: "invalid review action" }, { status: 400 });
  // Scrub notes — they land in audit_log.detail which is returned via DTO.
  const notes = typeof body.notes === "string" ? scrubText(body.notes.slice(0, 1000)) : null;

  // Requesting a revision (and rejecting) requires a reason so the agent/queue knows
  // what to fix — the revision loop must be actionable.
  if ((review === "request_revision" || review === "reject") && (!notes || !notes.trim())) {
    return NextResponse.json({ error: `A reason is required to ${review === "reject" ? "reject" : "request revision"}.` }, { status: 400 });
  }

  // Granting APPROVAL requires explicit approval authority (not merely the ability to
  // view the queue) — triage verbs (reject / request_revision / archive) stay open to
  // any reviewer with canViewApprovals, but only an approver can move an action to
  // approved (the state that makes it executable).
  if (review === "approve" && !can(auth.role, "canApproveVaultActions")) {
    return NextResponse.json({ error: "You do not have authority to approve Vault actions." }, { status: 403 });
  }
  // High-risk actions can only be APPROVED by an admin (defense in depth; the perm
  // above is admin-only today, but this keeps the risk-tier rule explicit).
  if (review === "approve" && requiresAdminApproval(action.risk_level) && auth.role !== "admin") {
    return NextResponse.json({ error: "This risk level can only be approved by an admin." }, { status: 403 });
  }

  const now = new Date().toISOString();
  // Lifecycle event name per review verb (Phase 9.2 audit timeline).
  const LIFECYCLE: Record<ReviewAction, string> = {
    approve: "approved", reject: "rejected", request_revision: "revision_requested", archive: "archived",
  };
  const patch: Partial<VaultAction> = {};

  // Allowed PRIOR approval_status values per transition. Approve can only move a
  // fresh/revised action forward; the withdrawal-style transitions may also be
  // applied to an already-approved (but not-yet-executed) action so governance can
  // always pull back an approval — clearing the approval stamp when they do.
  // Adapter enablement is the SOURCE OF TRUTH for whether an approved action is
  // executable — never the prior execution_status (which a legacy/malformed row could
  // carry). Internal → ready_after_approval; every external target → adapter_disabled.
  const internalTarget = isAdapterEnabled(action.target_system);
  let fromStates: string[];
  if (review === "approve") {
    fromStates = ["pending_review", "needs_revision"];
    patch.approval_status = "approved";
    patch.approved_by = auth.userId;
    patch.approved_at = now;
    patch.execution_status = internalTarget ? "ready_after_approval" : "adapter_disabled";
  } else if (review === "reject") {
    fromStates = ["pending_review", "needs_revision", "approved"];
    patch.approval_status = "rejected";
    patch.rejected_by = auth.userId;
    patch.rejected_at = now;
    patch.rejection_reason = notes;
    patch.execution_status = "cancelled";
    patch.approved_by = null;
    patch.approved_at = null;
  } else if (review === "request_revision") {
    fromStates = ["pending_review", "needs_revision", "approved"];
    patch.approval_status = "needs_revision";
    patch.rejection_reason = notes;
    // Sent back for revision → no longer executable until re-approved. Internal → blocked;
    // external targets remain adapter_disabled.
    patch.execution_status = internalTarget ? "blocked" : "adapter_disabled";
    patch.approved_by = null;
    patch.approved_at = null;
  } else {
    // archive
    fromStates = ["pending_review", "needs_revision", "approved", "rejected"];
    patch.approval_status = "archived";
    patch.execution_status = "cancelled";
    patch.approved_by = null;
    patch.approved_at = null;
  }

  const auditEntries: AuditEntry[] = [{
    at: now,
    actor: auth.userId,
    event: LIFECYCLE[review],
    message: `Action ${LIFECYCLE[review].replace(/_/g, " ")} by reviewer`,
    previous_status: action.approval_status,
    next_status: patch.approval_status,
    note: notes ?? undefined,
    detail: notes ?? undefined,
  }];
  // Internal approvals also cross into the ready-to-execute state — record that
  // execution-status transition explicitly in the lifecycle timeline.
  if (review === "approve" && internalTarget) {
    auditEntries.push({
      at: now, actor: auth.userId, event: "execution_ready",
      message: "Internal action is ready to execute (awaiting a human execute)",
      previous_status: action.execution_status, next_status: "ready_after_approval",
    });
  }

  // Conditional transition — refuses if the prior state is wrong or the action is
  // mid-execution / executed (so a withdrawal can never race a live execution). The
  // audit entries are appended onto the freshest row so a concurrent note isn't lost.
  const updated = await reviewTransition(id, patch, fromStates, auditEntries);
  if (!updated) {
    return NextResponse.json(
      { error: "Cannot apply this review — the action is executing, already executed, or no longer in a reviewable state." },
      { status: 409 },
    );
  }
  return NextResponse.json({ action: toActionDTO(updated) });
}
