// POST /api/core/client-health/[id]/review — internal governance for a client-health draft.
// action ∈ approve_internal | request_revision | reject | archive.
//
// "approve_internal" means APPROVED INSIDE VAULT CORE ONLY — it does NOT contact a client
// or touch any external system. The draft moves to `future_adapter_required` (honest that
// a future approved client-success adapter would be needed to act on anything client-
// facing). This route NEVER sends an SMS/email, NEVER creates/updates a GHL contact/task/
// opportunity/note, NEVER triggers a workflow, and NEVER calls a provider API.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getClientHealthDraft, reviewClientHealthDraft, toClientHealthDraftDTO } from "@/lib/core/client-health/db";
import { scrubText } from "@/lib/core/actions/validation";
import type { VaultClientHealthDraft, HealthReviewAction, HealthStatus } from "@/lib/core/client-health/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }
const ACTIONS: HealthReviewAction[] = ["approve_internal", "request_revision", "reject", "archive"];

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const draft = await getClientHealthDraft(id);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const review = body.action as HealthReviewAction;
  if (!ACTIONS.includes(review)) return NextResponse.json({ error: "invalid review action" }, { status: 400 });
  const notes = typeof body.notes === "string" ? scrubText(body.notes.slice(0, 1000)) : null;

  if ((review === "request_revision" || review === "reject") && (!notes || !notes.trim())) {
    return NextResponse.json({ error: `A reason is required to ${review === "reject" ? "reject" : "request revision"}.` }, { status: 400 });
  }
  // Finance/revenue-tied health drafts run at money tier (L3) — approving internally
  // requires an admin. Standard (L2) drafts may be approved by any approval reviewer.
  const isHighRisk = draft.risk_level === "level_3_money_ads_workflow" || draft.risk_level === "level_4_admin_critical";
  if (review === "approve_internal" && isHighRisk && auth.role !== "admin") {
    return NextResponse.json({ error: "Finance/revenue-tied client-health drafts can only be approved internally by an admin." }, { status: 403 });
  }

  const now = new Date().toISOString();
  // Allowed PRIOR statuses per transition (a stale review can't flip an archived/rejected draft).
  const FROM: Record<HealthReviewAction, string[]> = {
    approve_internal: ["draft", "pending_review", "needs_revision"],
    request_revision: ["draft", "pending_review", "future_adapter_required"],
    reject: ["draft", "pending_review", "needs_revision", "future_adapter_required"],
    archive: ["draft", "pending_review", "needs_revision", "future_adapter_required", "rejected"],
  };
  const nextStatus: HealthStatus =
    review === "approve_internal" ? "future_adapter_required"
    : review === "request_revision" ? "needs_revision"
    : review === "reject" ? "rejected"
    : "archived";

  const statusPatch: Partial<VaultClientHealthDraft> = {
    status: nextStatus,
    reviewed_by: auth.userId,
    reviewed_at: now,
  };
  const auditEntry = {
    at: now, actor: auth.userId, event: review,
    message: `Client health draft ${review.replace(/_/g, " ")}`,
    previous_status: draft.status, next_status: nextStatus,
    note: notes ?? undefined, detail: notes ?? undefined,
  };

  const updated = await reviewClientHealthDraft(id, statusPatch, FROM[review], auditEntry);
  if (!updated) {
    return NextResponse.json({ error: "Cannot review — the draft has changed or is no longer in a reviewable state." }, { status: 409 });
  }
  return NextResponse.json({ draft: toClientHealthDraftDTO(updated) });
}
