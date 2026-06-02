/**
 * ADMIN CLEANUP ROUTE — DISABLED (fail closed).
 *
 * This route previously performed a one-time, controlled production data cleanup.
 * That cleanup has already been run. Exposing data-mutating cleanup logic behind a
 * public API route (with a fallback secret) is a security/safety risk, so the
 * mutation logic has been removed.
 *
 * Any future cleanup MUST be performed as an offline, locally-run script with the
 * service-role key (never as a deployed HTTP endpoint). See docs for the playbook.
 *
 * This handler now:
 *   • Requires an authenticated admin (resolveServerRole) — no fallback secret.
 *   • Performs NO reads or writes of production data.
 *   • Returns 410 Gone. It never mutates Supabase, Stripe, GHL, Meta, etc.
 */
import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";

export const dynamic = "force-dynamic";

export async function POST() {
  // Admin guard — even though the route does nothing, never let a non-admin probe it.
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    {
      error: "Disabled",
      message:
        "The admin cleanup endpoint has been retired. Production data cleanup must be performed as an offline script run locally with the service-role key, never via a deployed API route.",
    },
    { status: 410 }
  );
}
