import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// One-time admin user creation endpoint.
// Protected by a static secret token — remove this route after use.
// One-time secret — this endpoint and secret will be removed immediately after use
const ADMIN_SECRET = "SKQ4ZMbXd5Pwded4eEd4W2XHwn8MCWCZXDdR0pcdryw";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Verify admin secret ──────────────────────────────────────────────
    const { secret, email, fullName, role } = await req.json() as {
      secret: string;
      email: string;
      fullName: string;
      role: string;
    };

    if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!email || !fullName || !role) {
      return NextResponse.json({ error: "Missing required fields: email, fullName, role" }, { status: 400 });
    }

    const validRoles = ["admin", "media_buyer", "setter", "client_viewer"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }, { status: 400 });
    }

    // ── 2. Get Supabase service role client ─────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client unavailable" }, { status: 500 });
    }

    // ── 3. Create auth user via Supabase Admin API ──────────────────────────
    const adminRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      }),
    });

    const adminData = await adminRes.json() as { id?: string; email?: string; error?: string; message?: string };

    if (!adminRes.ok || !adminData.id) {
      return NextResponse.json({
        error: "Failed to create auth user",
        detail: adminData.error ?? adminData.message ?? "Unknown error",
      }, { status: 500 });
    }

    const authUserId = adminData.id;

    // ── 4. Insert user_profiles row ─────────────────────────────────────────
    const { error: profileError } = await supabase
      .from("user_profiles" as never)
      .insert({
        auth_user_id: authUserId,
        email,
        full_name: fullName,
        role,
      } as never);

    if (profileError) {
      // Auth user was created but profile insert failed — return partial success
      return NextResponse.json({
        success: false,
        warning: "Auth user created but user_profiles insert failed",
        authUserId,
        profileError: profileError.message,
      }, { status: 207 });
    }

    // ── 5. Send magic link so user can set their password ───────────────────
    const magicRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}/send-magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
    });

    const magicSent = magicRes.ok;

    return NextResponse.json({
      success: true,
      authUserId,
      email,
      role,
      magicLinkSent: magicSent,
      message: `Admin user ${email} created with role '${role}'. ${magicSent ? "A magic link has been sent to their email." : "Magic link could not be sent — user can request one from the login page."}`,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
