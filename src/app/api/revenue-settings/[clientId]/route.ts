// Server-side only — read and update a single client's revenue settings.
//
// GET  — returns the settings row, or defaults if none exists yet.
// PATCH — upserts safe fields only. stripe_invoice_auto_create and
//         stripe_invoice_auto_send are NOT writable via this endpoint.
//         No Stripe calls. No GHL modifications. No invoice creation.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  rowToRevenueSettings,
  makeDefaultSettings,
  type RevenueSettingsPatchInput,
} from "@/lib/revenue/types";

export const dynamic = "force-dynamic";

// ── GET — load settings for one client ───────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin-only: this row exposes GHL/Stripe IDs, fee splits, and notes.
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });
  }

  const { clientId } = await params;
  if (!clientId?.trim()) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json({ settings: makeDefaultSettings(clientId) });
    }

    const { data, error } = await supabase
      .from("client_revenue_settings")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/revenue-settings/:clientId]", error);
      return NextResponse.json({ settings: makeDefaultSettings(clientId) });
    }

    const settings = data
      ? rowToRevenueSettings(data, clientId)
      : makeDefaultSettings(clientId);

    return NextResponse.json({ settings });
  } catch (err) {
    console.error("[GET /api/revenue-settings/:clientId]", err);
    return NextResponse.json({ settings: makeDefaultSettings(clientId) });
  }
}

// ── PATCH — upsert settings for one client ────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin can modify revenue settings
  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admin role required to update revenue settings" },
      { status: 403 }
    );
  }

  const { clientId } = await params;
  if (!clientId?.trim()) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  let body: RevenueSettingsPatchInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── Build the safe update object ─────────────────────────────
  // Only allow fields defined in RevenueSettingsPatchInput.
  // stripe_invoice_auto_create and stripe_invoice_auto_send are deliberately
  // excluded — they cannot be set via this endpoint in Phase 2A.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};

  if (typeof body.recurringBillingActive === "boolean") {
    update.recurring_billing_active = body.recurringBillingActive;
  }
  if (body.recurringBillingStartDate !== undefined) {
    // Accept ISO date string (YYYY-MM-DD) or null
    const d = body.recurringBillingStartDate;
    update.recurring_billing_start_date =
      d === null ? null : typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  }
  if (typeof body.setupFeeTotal === "number" && body.setupFeeTotal >= 0) {
    update.setup_fee_total = body.setupFeeTotal;
  }
  if (typeof body.setupMonth1Amount === "number" && body.setupMonth1Amount >= 0) {
    update.setup_month_1_amount = body.setupMonth1Amount;
  }
  if (typeof body.setupMonth2Amount === "number" && body.setupMonth2Amount >= 0) {
    update.setup_month_2_amount = body.setupMonth2Amount;
  }
  if (typeof body.jaxonSetupSplit === "number" && body.jaxonSetupSplit >= 0 && body.jaxonSetupSplit <= 1) {
    update.jaxon_setup_split = body.jaxonSetupSplit;
  }
  if (typeof body.nickSetupSplit === "number" && body.nickSetupSplit >= 0 && body.nickSetupSplit <= 1) {
    update.nick_setup_split = body.nickSetupSplit;
  }
  if (typeof body.recurringFeePercentage === "number" && body.recurringFeePercentage >= 0 && body.recurringFeePercentage <= 1) {
    update.recurring_fee_percentage = body.recurringFeePercentage;
  }
  if (typeof body.nickRecurringSplit === "number" && body.nickRecurringSplit >= 0 && body.nickRecurringSplit <= 1) {
    update.nick_recurring_split = body.nickRecurringSplit;
  }
  if (typeof body.jaxonRecurringSplit === "number" && body.jaxonRecurringSplit >= 0 && body.jaxonRecurringSplit <= 1) {
    update.jaxon_recurring_split = body.jaxonRecurringSplit;
  }
  if (body.ghlPipelineId !== undefined) {
    update.ghl_pipeline_id =
      typeof body.ghlPipelineId === "string" ? body.ghlPipelineId.trim() || null : null;
  }
  if (body.ghlLocationId !== undefined) {
    update.ghl_location_id =
      typeof body.ghlLocationId === "string" ? body.ghlLocationId.trim() || null : null;
  }
  if (body.stripeCustomerId !== undefined) {
    update.stripe_customer_id =
      typeof body.stripeCustomerId === "string" ? body.stripeCustomerId.trim() || null : null;
  }
  if (typeof body.manualRevenueEntryEnabled === "boolean") {
    update.manual_revenue_entry_enabled = body.manualRevenueEntryEnabled;
  }
  if (body.notes !== undefined) {
    update.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  // ── Upsert ────────────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      // Mock mode — return defaults with the applied update reflected
      return NextResponse.json({ success: true, mockMode: true, settings: makeDefaultSettings(clientId) });
    }

    const { data, error } = await supabase
      .from("client_revenue_settings")
      .upsert(
        { client_id: clientId, ...update },
        { onConflict: "client_id", ignoreDuplicates: false }
      )
      .select("*")
      .single();

    if (error) {
      console.error("[PATCH /api/revenue-settings/:clientId]", error);
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }

    const settings = rowToRevenueSettings(data, clientId);
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    console.error("[PATCH /api/revenue-settings/:clientId]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
