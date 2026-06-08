// POST /api/core/creative-briefs/[id]/review — internal governance for a creative brief.
// action ∈ approve_internal | request_revision | reject | archive.
//
// "approve_internal" means APPROVED INSIDE VAULT CORE ONLY — it does NOT post/publish/
// upload/launch anything. The brief moves to `future_adapter_required` (honest that a
// future approved content adapter would be needed to act on it). This route NEVER posts to
// a social platform, NEVER uploads a video, NEVER launches a Meta ad, and NEVER calls a
// social/ad API.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getCreativeBrief, reviewCreativeBrief, toCreativeBriefDTO } from "@/lib/core/creative-briefs/db";
import { scrubText } from "@/lib/core/actions/validation";
import type { VaultCreativeBrief, BriefReviewAction, BriefStatus } from "@/lib/core/creative-briefs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }
const ACTIONS: BriefReviewAction[] = ["approve_internal", "request_revision", "reject", "archive"];

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const brief = await getCreativeBrief(id);
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const review = body.action as BriefReviewAction;
  if (!ACTIONS.includes(review)) return NextResponse.json({ error: "invalid review action" }, { status: 400 });
  const notes = typeof body.notes === "string" ? scrubText(body.notes.slice(0, 1000)) : null;

  if ((review === "request_revision" || review === "reject") && (!notes || !notes.trim())) {
    return NextResponse.json({ error: `A reason is required to ${review === "reject" ? "reject" : "request revision"}.` }, { status: 400 });
  }
  // Approving internally requires an admin. Ad/campaign-linked creative is money/ads tier
  // (L3); other client-facing creative is L2 — both require admin approval here for safety.
  if (review === "approve_internal" && auth.role !== "admin") {
    return NextResponse.json({ error: "Creative briefs can only be approved internally by an admin." }, { status: 403 });
  }

  const now = new Date().toISOString();
  // Allowed PRIOR statuses per transition (a stale review can't flip an archived/rejected brief).
  const FROM: Record<BriefReviewAction, string[]> = {
    approve_internal: ["draft", "pending_review", "needs_revision"],
    request_revision: ["draft", "pending_review", "future_adapter_required"],
    reject: ["draft", "pending_review", "needs_revision", "future_adapter_required"],
    archive: ["draft", "pending_review", "needs_revision", "future_adapter_required", "rejected"],
  };
  const nextStatus: BriefStatus =
    review === "approve_internal" ? "future_adapter_required"
    : review === "request_revision" ? "needs_revision"
    : review === "reject" ? "rejected"
    : "archived";

  const statusPatch: Partial<VaultCreativeBrief> = {
    status: nextStatus,
    reviewed_by: auth.userId,
    reviewed_at: now,
  };
  const auditEntry = {
    at: now, actor: auth.userId, event: review,
    message: `Creative brief ${review.replace(/_/g, " ")}`,
    previous_status: brief.status, next_status: nextStatus,
    note: notes ?? undefined, detail: notes ?? undefined,
  };

  const updated = await reviewCreativeBrief(id, statusPatch, FROM[review], auditEntry);
  if (!updated) {
    return NextResponse.json({ error: "Cannot review — the brief has changed or is no longer in a reviewable state." }, { status: 409 });
  }
  return NextResponse.json({ brief: toCreativeBriefDTO(updated) });
}
