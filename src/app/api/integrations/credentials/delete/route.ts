/**
 * DELETE /api/integrations/credentials/delete
 *
 * Removes per-client integration credentials from Supabase.
 * Admin role required.
 *
 * Request body: { clientId: string, provider: "meta" | "ghl" }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

export async function DELETE(req: NextRequest) {
  // ── 1. Auth + permission (shared, fail-closed role resolution) ─────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!can(auth.role, "canConnectIntegrations")) {
    return NextResponse.json(
      { error: "Admin role required to delete integration credentials." },
      { status: 403 }
    );
  }

  // ── 2. Service role client for the credential delete (bypasses RLS) ────────
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role not configured." }, { status: 503 });
  }

  // ── 3. Parse body ──────────────────────────────────────────────────────────
  let body: { clientId?: string; provider?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { clientId, provider } = body;
  if (!clientId || (provider !== "meta" && provider !== "ghl")) {
    return NextResponse.json(
      { error: "clientId and provider ('meta' or 'ghl') are required." },
      { status: 400 }
    );
  }

  // ── 4. Delete from Supabase ────────────────────────────────────────────────
  const { error } = await supabase
    .from("client_integration_credentials")
    .delete()
    .eq("client_id", clientId)
    .eq("provider", provider);

  if (error) {
    console.error("[credentials/delete] Supabase delete error:", error);
    return NextResponse.json({ error: "Failed to delete credentials." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    clientId,
    provider,
    message: `${provider === "meta" ? "Meta Ads" : "GoHighLevel"} credentials removed.`,
  });
}
