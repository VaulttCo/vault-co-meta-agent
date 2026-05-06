/**
 * DELETE /api/integrations/credentials/delete
 *
 * Removes per-client integration credentials from Supabase.
 * Admin role required.
 *
 * Request body: { clientId: string, provider: "meta" | "ghl" }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseSessionClient, getSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
  // ── 1. Auth check (cookie-based session client) ────────────────────────────
  // The service role client cannot read user sessions from cookies.
  // We must use the @supabase/ssr createServerClient (anon key + cookies) here.
  const sessionClient = await getSupabaseSessionClient();
  if (!sessionClient) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── 2. Role check + DB operations (service role client — bypasses RLS) ─────
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role not configured." }, { status: 503 });
  }

  const { data: profileRaw } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileRaw as any;
  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Admin role required to delete integration credentials." },
      { status: 403 }
    );
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

  console.log(
    `[credentials/delete] Deleted ${provider} credentials for client ${clientId} by user ${user.id}`
  );

  return NextResponse.json({
    success: true,
    clientId,
    provider,
    message: `${provider === "meta" ? "Meta Ads" : "GoHighLevel"} credentials removed.`,
  });
}
