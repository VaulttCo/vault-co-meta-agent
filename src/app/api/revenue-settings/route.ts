// Server-side only — read all client revenue settings.
// GET returns all rows from client_revenue_settings.
// No external API calls. No Stripe. No GHL modifications.
// stripeInvoiceAutoCreate and stripeInvoiceAutoSend are hardcoded false at the mapper level.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { rowToRevenueSettings } from "@/lib/revenue/types";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────
  // Admin-only: revenue settings expose GHL/Stripe IDs, fee splits, and notes.
  // (canViewReports includes client_viewer, which must NOT see this data.)
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });
  }

  // ── Fetch ─────────────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json({ settings: [] });
    }

    const { data, error } = await supabase
      .from("client_revenue_settings")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/revenue-settings]", error);
      return NextResponse.json({ settings: [] });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = (data ?? []).map((row: any) =>
      rowToRevenueSettings(row, row.client_id)
    );

    return NextResponse.json({ settings });
  } catch (err) {
    console.error("[GET /api/revenue-settings]", err);
    return NextResponse.json({ settings: [] });
  }
}
