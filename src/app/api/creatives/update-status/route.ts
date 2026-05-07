import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/creatives/update-status
//
// Updates the approval status of a creative asset.
// Supported actions:
//   "approve"      → status = "active", approved_for_ads = true
//   "needs-review" → status = "pending", approved_for_ads = false
//
// Auth: requires valid Supabase session
// Permission: canApproveCreatives (admin only per current permissions matrix)
// Safety: read-only on Meta/GHL — only writes to creative_assets table
// ─────────────────────────────────────────────────────────────────────────────
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // ── 1. Server-side auth + role resolution ────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { role: serverRole } = auth;

  // ── 2. Permission check ──────────────────────────────────────────────────
  if (!can(serverRole, "canApproveCreatives")) {
    return NextResponse.json(
      { error: "Forbidden — admin role required to approve or update creative status" },
      { status: 403 }
    );
  }

  // ── 3. Parse and validate request body ───────────────────────────────────
  let body: { assetId: string; action: "approve" | "needs-review" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { assetId, action } = body;
  if (!assetId || typeof assetId !== "string") {
    return NextResponse.json({ error: "assetId is required" }, { status: 400 });
  }
  if (action !== "approve" && action !== "needs-review") {
    return NextResponse.json(
      { error: "action must be 'approve' or 'needs-review'" },
      { status: 400 }
    );
  }

  // ── 4. Build the update payload ───────────────────────────────────────────
  const updatePayload =
    action === "approve"
      ? { status: "active", approved_for_ads: true }
      : { status: "pending", approved_for_ads: false };

  // ── 5. Attempt Supabase update ────────────────────────────────────────────
  const serviceClient = getSupabaseServerClient();
  if (serviceClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error, data } = await (serviceClient.from("creative_assets") as any)
      .update(updatePayload)
      .eq("id", assetId)
      .select("id, status, approved_for_ads")
      .single();
    if (error) {
      console.error("[update-status] Supabase error:", error.message);
      return NextResponse.json(
        { error: "Failed to update asset status", detail: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      assetId,
      action,
      updatedStatus: action === "approve" ? "Approved" : "Needs Review",
      approvedForAds: action === "approve",
      savedToDb: true,
      data,
    });
  }

  // ── 6. Mock mode fallback (Supabase not configured) ───────────────────────
  // Return success so the UI can update optimistically; data won't persist to DB
  return NextResponse.json({
    success: true,
    assetId,
    action,
    updatedStatus: action === "approve" ? "Approved" : "Needs Review",
    approvedForAds: action === "approve",
    savedToDb: false,
    mockMode: true,
  });
}
