import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// One-time admin user creation / role assignment endpoint.
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

    // ── 3. Try to create auth user; if already exists, look them up ─────────
    let authUserId: string | null = null;
    let userCreated = false;

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

    const adminData = await adminRes.json() as {
      id?: string;
      email?: string;
      error?: string;
      message?: string;
      error_code?: string;
      msg?: string;
      code?: number;
    };

    if (adminRes.ok && adminData.id) {
      authUserId = adminData.id;
      userCreated = true;
    } else if (adminData.error_code === "email_exists" || adminData.code === 422) {
      // User already exists — look up their ID via the admin users list
      const listRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&per_page=1`,
        {
          headers: {
            "apikey": serviceRoleKey,
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
        }
      );
      const listData = await listRes.json() as { users?: Array<{ id: string; email: string }> };
      const existingUser = listData.users?.find((u) => u.email === email);
      if (existingUser) {
        authUserId = existingUser.id;
        userCreated = false;
      } else {
        return NextResponse.json({
          error: "User exists but could not be found via admin API",
          detail: listData,
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({
        error: "Failed to create auth user",
        detail: adminData.error ?? adminData.msg ?? "Unknown error",
        rawStatus: adminRes.status,
        rawData: adminData,
      }, { status: 500 });
    }

    // ── 4. Upsert user_profiles row ─────────────────────────────────────────
    const { error: profileError } = await supabase
      .from("user_profiles" as never)
      .upsert({
        auth_user_id: authUserId,
        email,
        full_name: fullName,
        role,
      } as never, { onConflict: "auth_user_id" });

    if (profileError) {
      return NextResponse.json({
        success: false,
        warning: "Auth user found/created but user_profiles upsert failed",
        authUserId,
        profileError: profileError.message,
      }, { status: 207 });
    }

    // ── 5. Send magic link so user can log in ───────────────────────────────
    const magicRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ email_confirm: true }),
    });

    return NextResponse.json({
      success: true,
      authUserId,
      email,
      role,
      userCreated,
      emailConfirmed: magicRes.ok,
      message: `${userCreated ? "New" : "Existing"} auth user ${email} has been assigned role '${role}' in user_profiles. They can now log in via Magic Link at the portal login page.`,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
