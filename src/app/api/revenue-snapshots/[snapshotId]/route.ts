// Server-side only — update a single revenue snapshot.
//
// PATCH — admin only. Accepts closedWonRevenue, reviewStatus, notes.
//         Re-computes vault_co_fee, nick_recurring_earnings, jaxon_recurring_earnings
//         server-side whenever closedWonRevenue is provided.
//         No Stripe calls. No GHL writes. No invoice creation.
//
// Lock protection (Phase 2D): if review_status = 'locked', closedWonRevenue edits
// are rejected with 409. Status transitions (unlock, revert) are always allowed.
//
// reviewed_at is set to now() when transitioning to 'reviewed' or 'locked'.
// It is NOT cleared when reverting to 'draft' — preserved as a historical record.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  rowToMonthlyRevenueSnapshot,
  type MonthlyRevenueSnapshotPatchInput,
} from "@/lib/revenue/types";

export const dynamic = "force-dynamic";

const RECURRING_FEE_PCT = 0.05;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admin role required to update revenue snapshots" },
      { status: 403 }
    );
  }

  const { snapshotId } = await params;
  if (!snapshotId?.trim()) {
    return NextResponse.json({ error: "snapshotId is required" }, { status: 400 });
  }

  let body: MonthlyRevenueSnapshotPatchInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseServerClient() as any;

  // ── Lock guard — reject revenue edits on locked snapshots ────────────────────
  // Status-only transitions (unlock, revert to draft) are always permitted.
  if (supabase && typeof body.closedWonRevenue === "number") {
    const { data: current } = await supabase
      .from("client_monthly_revenue_snapshots")
      .select("review_status")
      .eq("id", snapshotId.trim())
      .maybeSingle();

    if (current?.review_status === "locked") {
      return NextResponse.json(
        { error: "Snapshot is locked. Unlock it before editing revenue." },
        { status: 409 }
      );
    }
  }

  // ── Build safe update object ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};

  if (typeof body.closedWonRevenue === "number") {
    if (body.closedWonRevenue < 0 || !isFinite(body.closedWonRevenue)) {
      return NextResponse.json({ error: "closedWonRevenue must be a non-negative number" }, { status: 400 });
    }
    const vaultCoFee = Math.round(body.closedWonRevenue * RECURRING_FEE_PCT * 100) / 100;
    update.closed_won_revenue      = body.closedWonRevenue;
    update.vault_co_fee            = vaultCoFee;
    update.nick_recurring_earnings  = vaultCoFee;
    update.jaxon_recurring_earnings = 0;
  }

  if (body.reviewStatus !== undefined) {
    if (!["draft", "reviewed", "locked"].includes(body.reviewStatus)) {
      return NextResponse.json({ error: "reviewStatus must be draft, reviewed, or locked" }, { status: 400 });
    }
    update.review_status = body.reviewStatus;

    // Set reviewed_at when moving to reviewed or locked.
    // Do not clear it when reverting to draft — it is a historical audit record.
    // If re-reviewed after a revert, reviewed_at is overwritten with the new timestamp.
    if (body.reviewStatus === "reviewed" || body.reviewStatus === "locked") {
      update.reviewed_at = new Date().toISOString();
    }
  }

  if (body.notes !== undefined) {
    update.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  try {
    if (!supabase) {
      return NextResponse.json({ success: true, mockMode: true });
    }

    const { data, error } = await supabase
      .from("client_monthly_revenue_snapshots")
      .update(update)
      .eq("id", snapshotId)
      .select("*")
      .single();

    if (error) {
      console.error("[PATCH /api/revenue-snapshots/:snapshotId]", error);
      return NextResponse.json({ error: "Failed to update snapshot" }, { status: 500 });
    }

    return NextResponse.json({ success: true, snapshot: rowToMonthlyRevenueSnapshot(data) });
  } catch (err) {
    console.error("[PATCH /api/revenue-snapshots/:snapshotId]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
