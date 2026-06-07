// POST /api/core/meta-campaign-drafts/[id]/review — internal governance for a campaign draft.
// action ∈ approve_internal | request_revision | reject | archive.
//
// "approve_internal" means APPROVED INSIDE VAULT CORE ONLY — it does NOT launch anything.
// The draft moves to `future_adapter_required` (honest that a future approved Meta adapter
// would be needed to build it live). This route NEVER launches a campaign, NEVER changes a
// budget, NEVER creates an ad set/ad/lead form, and NEVER calls a Meta API.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getCampaignDraft, reviewCampaignDraft, toCampaignDraftDTO } from "@/lib/core/campaign-drafts/db";
import { scrubText } from "@/lib/core/actions/validation";
import type { VaultMetaCampaignDraft, CampaignReviewAction, CampaignStatus } from "@/lib/core/campaign-drafts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }
const ACTIONS: CampaignReviewAction[] = ["approve_internal", "request_revision", "reject", "archive"];

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const draft = await getCampaignDraft(id);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const review = body.action as CampaignReviewAction;
  if (!ACTIONS.includes(review)) return NextResponse.json({ error: "invalid review action" }, { status: 400 });
  const notes = typeof body.notes === "string" ? scrubText(body.notes.slice(0, 1000)) : null;

  if ((review === "request_revision" || review === "reject") && (!notes || !notes.trim())) {
    return NextResponse.json({ error: `A reason is required to ${review === "reject" ? "reject" : "request revision"}.` }, { status: 400 });
  }
  // A Meta campaign plan is money/ads tier (L3) — approving internally requires an admin.
  if (review === "approve_internal" && auth.role !== "admin") {
    return NextResponse.json({ error: "Meta campaign drafts can only be approved internally by an admin." }, { status: 403 });
  }

  const now = new Date().toISOString();
  // Allowed PRIOR statuses per transition (a stale review can't flip an archived/rejected draft).
  const FROM: Record<CampaignReviewAction, string[]> = {
    approve_internal: ["draft", "pending_review", "needs_revision"],
    request_revision: ["draft", "pending_review", "future_adapter_required"],
    reject: ["draft", "pending_review", "needs_revision", "future_adapter_required"],
    archive: ["draft", "pending_review", "needs_revision", "future_adapter_required", "rejected"],
  };
  const nextStatus: CampaignStatus =
    review === "approve_internal" ? "future_adapter_required"
    : review === "request_revision" ? "needs_revision"
    : review === "reject" ? "rejected"
    : "archived";

  const statusPatch: Partial<VaultMetaCampaignDraft> = {
    status: nextStatus,
    reviewed_by: auth.userId,
    reviewed_at: now,
  };
  const auditEntry = {
    at: now, actor: auth.userId, event: review,
    message: `Meta campaign draft ${review.replace(/_/g, " ")}`,
    previous_status: draft.status, next_status: nextStatus,
    note: notes ?? undefined, detail: notes ?? undefined,
  };

  const updated = await reviewCampaignDraft(id, statusPatch, FROM[review], auditEntry);
  if (!updated) {
    return NextResponse.json({ error: "Cannot review — the draft has changed or is no longer in a reviewable state." }, { status: 409 });
  }
  return NextResponse.json({ draft: toCampaignDraftDTO(updated) });
}
