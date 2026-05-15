// Server-side only — update approval_status on a single veronica_drafts row.
// Only writes veronica_drafts.approval_status. No Meta, GHL, SMS, email, or external action.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["needs_review", "approved", "changes_requested", "archived"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── 1. Auth ───────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Permission ─────────────────────────────────────────────
  // Status changes require the same admin-level gate as campaign approval.
  if (!can(auth.role, "canApproveCampaigns")) {
    return NextResponse.json(
      { error: "Forbidden — admin role required to update Veronica draft status" },
      { status: 403 }
    );
  }

  // ── 3. Route param ────────────────────────────────────────────
  const { id: draftId } = await params;
  if (!draftId?.trim()) {
    return NextResponse.json({ error: "Missing draft id" }, { status: 400 });
  }

  // ── 4. Parse body ─────────────────────────────────────────────
  let body: { approvalStatus: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── 5. Validate ───────────────────────────────────────────────
  if (!ALLOWED_STATUSES.includes(body.approvalStatus as AllowedStatus)) {
    return NextResponse.json(
      { error: `Invalid approval_status. Allowed: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // ── 6. Update ─────────────────────────────────────────────────
  // Only approval_status and updated_at are ever written. No external action.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json({ success: true, mockMode: true });
    }

    const { error } = await supabase
      .from("veronica_drafts")
      .update({
        approval_status: body.approvalStatus as AllowedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId.trim());

    if (error) {
      console.error("[PATCH /api/veronica/drafts/[id]]", error);
      return NextResponse.json({ error: "Failed to update draft status" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/veronica/drafts/[id]]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
