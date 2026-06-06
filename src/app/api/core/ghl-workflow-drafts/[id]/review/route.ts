// POST /api/core/ghl-workflow-drafts/[id]/review — internal governance for a draft.
// action ∈ approve_internal | request_revision | reject | archive.
//
// "approve_internal" means APPROVED INSIDE VAULT CORE ONLY — it does NOT publish to
// GHL. The draft moves to `future_adapter_required` so the UI is honest that a future
// approved GHL adapter would be needed to actually build it. This route NEVER calls
// GHL, NEVER mutates a contact/opportunity/workflow, and NEVER sends SMS/email.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getWorkflowDraft, reviewWorkflowDraft, toWorkflowDraftDTO } from "@/lib/core/workflows/db";
import { scrubText } from "@/lib/core/actions/validation";
import type { GHLWorkflowDraft, WorkflowReviewAction, WorkflowStatus } from "@/lib/core/workflows/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }
const ACTIONS: WorkflowReviewAction[] = ["approve_internal", "request_revision", "reject", "archive"];

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const draft = await getWorkflowDraft(id);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const review = body.action as WorkflowReviewAction;
  if (!ACTIONS.includes(review)) return NextResponse.json({ error: "invalid review action" }, { status: 400 });
  const notes = typeof body.notes === "string" ? scrubText(body.notes.slice(0, 1000)) : null;

  // Reject and revision require a reason.
  if ((review === "request_revision" || review === "reject") && (!notes || !notes.trim())) {
    return NextResponse.json({ error: `A reason is required to ${review === "reject" ? "reject" : "request revision"}.` }, { status: 400 });
  }

  // Approving high-risk (GHL workflow) drafts requires an admin.
  if (review === "approve_internal" && auth.role !== "admin") {
    return NextResponse.json({ error: "GHL workflow drafts can only be approved internally by an admin." }, { status: 403 });
  }

  const now = new Date().toISOString();
  // Allowed PRIOR statuses per transition (so a stale review can't, e.g., re-approve
  // or flip an already-archived draft). approve_internal → future_adapter_required
  // (approved internally; publishing still needs a future GHL adapter).
  const FROM: Record<WorkflowReviewAction, string[]> = {
    approve_internal: ["draft", "pending_review", "needs_revision"],
    request_revision: ["draft", "pending_review", "future_adapter_required"],
    reject: ["draft", "pending_review", "needs_revision", "future_adapter_required"],
    archive: ["draft", "pending_review", "needs_revision", "future_adapter_required", "rejected"],
  };
  const nextStatus: WorkflowStatus =
    review === "approve_internal" ? "future_adapter_required"
    : review === "request_revision" ? "needs_revision"
    : review === "reject" ? "rejected"
    : "archived";

  const statusPatch: Partial<GHLWorkflowDraft> = {
    status: nextStatus,
    reviewed_by: auth.userId,
    reviewed_at: now,
    human_review_notes: notes ?? draft.human_review_notes,
  };
  const auditEntry = {
    at: now, actor: auth.userId, event: review,
    message: `Workflow draft ${review.replace(/_/g, " ")}`,
    previous_status: draft.status, next_status: nextStatus,
    note: notes ?? undefined, detail: notes ?? undefined,
  };

  // True compare-and-set: only from an allowed prior status, audit appended onto the
  // freshest row so concurrent reviews never drop each other's trail.
  const updated = await reviewWorkflowDraft(id, statusPatch, FROM[review], auditEntry);
  if (!updated) {
    return NextResponse.json({ error: "Cannot review — the draft has changed or is no longer in a reviewable state." }, { status: 409 });
  }
  return NextResponse.json({ draft: toWorkflowDraftDTO(updated) });
}
