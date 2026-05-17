// Server-side only — read and create monthly revenue snapshots.
//
// GET  — returns all snapshots, optionally filtered by ?billing_month=YYYY-MM-DD
//         Requires canViewReports permission.
// POST — creates or upserts a snapshot (admin only).
//         Server computes vault_co_fee, nick_recurring_earnings, jaxon_recurring_earnings.
//         No Stripe API calls. No GHL writes. No invoice creation.
//
// closed_won_revenue is the client's own Closed Won revenue — NOT Vault Co's collected revenue.
// vault_co_fee is Vault Co's estimated 5% fee — NOT a confirmed payment or invoice.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  rowToMonthlyRevenueSnapshot,
  makeDefaultSnapshot,
  type MonthlyRevenueSnapshotInput,
} from "@/lib/revenue/types";

export const dynamic = "force-dynamic";

const RECURRING_FEE_PCT = 0.05;

// ── GET — load snapshots ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(auth.role, "canViewReports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const billingMonth = req.nextUrl.searchParams.get("billing_month");

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json({ snapshots: [] });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("client_monthly_revenue_snapshots")
      .select("*")
      .order("created_at", { ascending: true });

    if (billingMonth) {
      query = query.eq("billing_month", billingMonth);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/revenue-snapshots]", error);
      return NextResponse.json({ snapshots: [] });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapshots = (data ?? []).map((row: any) => rowToMonthlyRevenueSnapshot(row));
    return NextResponse.json({ snapshots });
  } catch (err) {
    console.error("[GET /api/revenue-snapshots]", err);
    return NextResponse.json({ snapshots: [] });
  }
}

// ── POST — create or upsert a snapshot ───────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admin role required to save revenue snapshots" },
      { status: 403 }
    );
  }

  let body: MonthlyRevenueSnapshotInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  const { clientId, billingMonth, closedWonRevenue, notes, source = "manual", dealCount, sourcePayload } = body;

  if (!clientId?.trim()) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }
  if (!billingMonth || !/^\d{4}-\d{2}-\d{2}$/.test(billingMonth)) {
    return NextResponse.json({ error: "billingMonth must be YYYY-MM-DD" }, { status: 400 });
  }
  if (typeof closedWonRevenue !== "number" || closedWonRevenue < 0 || !isFinite(closedWonRevenue)) {
    return NextResponse.json({ error: "closedWonRevenue must be a non-negative number" }, { status: 400 });
  }
  if (source !== "manual" && source !== "ghl") {
    return NextResponse.json({ error: "source must be manual or ghl" }, { status: 400 });
  }

  // ── Server-side fee computation ───────────────────────────────────────────
  // vault_co_fee is Vault Co's estimated fee — not a confirmed payment.
  // nick_recurring_earnings = vault_co_fee (Nick earns 100% of recurring).
  // jaxon_recurring_earnings = 0 (Jaxon earns $0 on recurring per business model).
  const vaultCoFee            = Math.round(closedWonRevenue * RECURRING_FEE_PCT * 100) / 100;
  const nickRecurringEarnings  = vaultCoFee;
  const jaxonRecurringEarnings = 0;

  const row: Record<string, unknown> = {
    client_id:                clientId.trim(),
    billing_month:            billingMonth,
    closed_won_revenue:       closedWonRevenue,
    vault_co_fee:             vaultCoFee,
    recurring_fee_percentage: RECURRING_FEE_PCT,
    nick_recurring_earnings:  nickRecurringEarnings,
    jaxon_recurring_earnings: jaxonRecurringEarnings,
    source,
    review_status:            "draft",
    notes:                    typeof notes === "string" ? notes.trim() || null : null,
    created_by:               auth.userId ?? null,
  };

  // Phase 2C: include GHL sync metadata when provided
  if (source === "ghl") {
    row.deal_count     = typeof dealCount === "number" ? dealCount : 0;
    row.source_payload = sourcePayload ?? {};
    row.synced_at      = new Date().toISOString();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json({
        success: true,
        mockMode: true,
        snapshot: makeDefaultSnapshot(clientId, billingMonth),
      });
    }

    const { data, error } = await supabase
      .from("client_monthly_revenue_snapshots")
      .upsert(row, {
        onConflict: "client_id,billing_month,source",
        ignoreDuplicates: false,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/revenue-snapshots]", error);
      return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
    }

    return NextResponse.json({ success: true, snapshot: rowToMonthlyRevenueSnapshot(data) });
  } catch (err) {
    console.error("[POST /api/revenue-snapshots]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
