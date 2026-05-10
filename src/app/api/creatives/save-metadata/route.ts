/**
 * POST /api/creatives/save-metadata
 *
 * Saves a creative asset metadata row to public.creative_assets after a
 * successful Supabase Storage upload.
 *
 * Uses the service role client to bypass table RLS so the insert succeeds
 * regardless of user_profiles / get_user_role() setup. Auth is enforced here
 * via resolveServerRole() + canUploadFiles permission — the service role key
 * is never sent to the browser.
 *
 * READ-ONLY on Meta/GHL. Writes only to creative_assets table.
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // ── Auth: session + role ────────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(auth.role, "canUploadFiles")) {
    return NextResponse.json({ error: "Forbidden — upload requires admin or media buyer role" }, { status: 403 });
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: {
    id: string;
    clientId: string;
    fileName: string;
    fileType: string;
    uploadDate: string;
    notes: string | null;
    storageUrl: string | null;
    thumbnailUrl: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id, clientId, fileName, fileType, uploadDate, notes, storageUrl, thumbnailUrl } = body;
  if (!id || !clientId || !fileName || !fileType) {
    return NextResponse.json(
      { error: "Missing required fields: id, clientId, fileName, fileType" },
      { status: 400 }
    );
  }

  // ── Supabase write (service role bypasses table RLS) ────────────────────────
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    // Supabase not configured — mock mode, nothing to persist
    return NextResponse.json({ ok: true, saved: false, reason: "Supabase not configured" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("creative_assets") as any).upsert({
    id,
    client_id: clientId,
    file_name: fileName,
    file_type: fileType,
    asset_type: "Creative Asset",
    upload_date: uploadDate,
    notes: notes ?? null,
    status: "uploaded",
    storage_url: storageUrl ?? null,
    thumbnail_url: thumbnailUrl ?? null,
    tags: [],
    approved_for_ads: false,
  });

  if (error) {
    console.error("[save-metadata] Supabase upsert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: true });
}
