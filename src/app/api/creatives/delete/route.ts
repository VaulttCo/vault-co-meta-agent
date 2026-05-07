import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/creatives/delete
//
// Deletes a creative asset record from the database.
// The Supabase schema does not have a deleted_at / is_deleted column, so this
// performs a hard delete of the DB record only.
// Supabase Storage files are NOT deleted here — they are managed separately
// and only when safe to do so.
//
// Auth: requires valid Supabase session
// Permission: canDeleteFiles (admin only per current permissions matrix)
// Safety: no Meta/GHL writes; only removes from creative_assets table
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  // ── 1. Server-side auth + role resolution ────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { role: serverRole } = auth;

  // ── 2. Permission check ──────────────────────────────────────────────────
  if (!can(serverRole, "canDeleteFiles")) {
    return NextResponse.json(
      { error: "Forbidden — admin role required to delete creative assets" },
      { status: 403 }
    );
  }

  // ── 3. Parse and validate request body ───────────────────────────────────
  let body: { assetId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { assetId } = body;

  if (!assetId || typeof assetId !== "string") {
    return NextResponse.json({ error: "assetId is required" }, { status: 400 });
  }

  // ── 4. Attempt Supabase delete ────────────────────────────────────────────
  const serviceClient = getSupabaseServerClient();
  if (serviceClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (serviceClient.from("creative_assets") as any)
      .delete()
      .eq("id", assetId);

    if (error) {
      console.error("[delete] Supabase error:", error.message);
      return NextResponse.json(
        { error: "Failed to delete asset", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assetId,
      deleted: true,
      savedToDb: true,
    });
  }

  // ── 5. Mock mode fallback (Supabase not configured) ───────────────────────
  // Return success so the UI can remove the asset optimistically
  return NextResponse.json({
    success: true,
    assetId,
    deleted: true,
    savedToDb: false,
    mockMode: true,
  });
}
