// Server-side only — Stripe draft invoice creation is DISABLED.
//
// SAFETY: Vault Core must never create, finalize, send, pay, or otherwise mutate
// Stripe objects from the application. Even "draft" invoice creation
// (stripe.invoices.create / stripe.invoiceItems.create) is a live mutation of the
// connected Stripe account, so it has been removed from this endpoint.
//
// Invoice drafts must be created manually by a human in the Stripe dashboard.
// This route remains only to return a clear, admin-guarded "disabled" response so
// the UI can surface the correct guidance instead of silently mutating Stripe.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  // ── Auth (admin only) ──────────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admin role required" },
      { status: 403 }
    );
  }

  // Consume the param so the route signature stays valid; no work is performed.
  await params;

  return NextResponse.json(
    {
      error: "Disabled",
      message:
        "Automated Stripe invoice draft creation is disabled. Create the invoice draft manually in the Stripe dashboard, then record the invoice ID against this snapshot. The app never mutates Stripe.",
    },
    { status: 501 }
  );
}
