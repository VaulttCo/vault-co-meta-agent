// Server-side only — Phase 2E: Stripe draft invoice creation.
// Admin-only. POST only. No sending. No auto-charge. No finalization.
// Only locked snapshots are eligible. Duplicate creation is blocked by
// checking stripe_invoice_id before any Stripe API call.
//
// Flow:
//   1. Auth + admin check
//   2. Fetch snapshot — must have review_status = 'locked'
//   3. Duplicate guard — reject if stripe_invoice_id already set
//   4. Fetch client_revenue_settings — must have stripe_customer_id
//   5. stripe.invoices.create()   — auto_advance: false, collection_method: 'send_invoice'
//   6. stripe.invoiceItems.create() — attached to the invoice via invoice field
//   7. Persist stripe_invoice_id, stripe_invoice_status, stripe_invoice_url, invoice_draft_created_at
//   8. Return updated snapshot
//
// Nothing in this file calls: finalizeInvoice, sendInvoice, pay, or sets auto_advance true.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { resolveServerRole } from "@/lib/auth/server-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { rowToMonthlyRevenueSnapshot } from "@/lib/revenue/types";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admin role required to create invoice drafts" },
      { status: 403 }
    );
  }

  const { snapshotId } = await params;
  if (!snapshotId?.trim()) {
    return NextResponse.json({ error: "snapshotId is required" }, { status: 400 });
  }

  // ── Stripe key guard ──────────────────────────────────────────────────────
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables." },
      { status: 503 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseServerClient() as any;
  if (!supabase) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  // ── Fetch snapshot ────────────────────────────────────────────────────────
  const { data: snapshotRow, error: snapError } = await supabase
    .from("client_monthly_revenue_snapshots")
    .select("*")
    .eq("id", snapshotId.trim())
    .maybeSingle();

  if (snapError) {
    console.error("[POST create-invoice-draft] snapshot fetch error", snapError);
    return NextResponse.json({ error: "Failed to fetch snapshot" }, { status: 500 });
  }
  if (!snapshotRow) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  // ── Lock guard — only locked snapshots may generate invoices ─────────────
  if (snapshotRow.review_status !== "locked") {
    return NextResponse.json(
      { error: "Only locked snapshots can generate invoice drafts. Lock the snapshot first." },
      { status: 422 }
    );
  }

  // ── Duplicate guard ───────────────────────────────────────────────────────
  if (snapshotRow.stripe_invoice_id) {
    return NextResponse.json(
      { error: "An invoice draft already exists for this snapshot. Open it in Stripe to review or edit." },
      { status: 409 }
    );
  }

  // ── Fetch Stripe customer ID from revenue settings ────────────────────────
  const { data: settingsRow } = await supabase
    .from("client_revenue_settings")
    .select("stripe_customer_id")
    .eq("client_id", snapshotRow.client_id)
    .maybeSingle();

  const stripeCustomerId = settingsRow?.stripe_customer_id ?? null;
  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe Customer ID configured for this client. Add one in Revenue Settings before creating an invoice." },
      { status: 400 }
    );
  }

  // ── Vault Co fee — always taken from the locked snapshot row ─────────────
  const feeAmount = Number(snapshotRow.vault_co_fee ?? 0);
  if (feeAmount <= 0 || !isFinite(feeAmount)) {
    return NextResponse.json(
      { error: "Vault Co fee on this snapshot is $0 or invalid. No invoice draft created." },
      { status: 422 }
    );
  }

  // ── Create Stripe draft invoice ───────────────────────────────────────────
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" });

  let invoice: Stripe.Invoice;
  try {
    invoice = await stripe.invoices.create({
      customer:           stripeCustomerId,
      auto_advance:       false,          // NEVER auto-finalize
      collection_method:  "send_invoice", // NEVER charge_automatically
      days_until_due:     30,
      description:        `Vault Co recurring fee — ${snapshotRow.billing_month}`,
      metadata: {
        snapshot_id:    snapshotId,
        client_id:      snapshotRow.client_id,
        billing_month:  snapshotRow.billing_month,
        source:         snapshotRow.source ?? "manual",
        phase:          "2E",
      },
    });
  } catch (err) {
    console.error("[POST create-invoice-draft] stripe.invoices.create error", err);
    const msg = err instanceof Stripe.errors.StripeError ? err.message : "Stripe error creating invoice draft.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // ── Attach invoice item to the draft invoice ──────────────────────────────
  try {
    await stripe.invoiceItems.create({
      customer:    stripeCustomerId,
      invoice:     invoice.id,               // attach to the draft we just created
      amount:      Math.round(feeAmount * 100), // cents
      currency:    "usd",
      description: `Vault Co 5% recurring fee — ${snapshotRow.billing_month} (${snapshotRow.source ?? "manual"} snapshot)`,
    });
  } catch (err) {
    console.error("[POST create-invoice-draft] stripe.invoiceItems.create error", err);
    // Invoice was created but item failed — surface the error; admin can add item manually in Stripe
    const msg = err instanceof Stripe.errors.StripeError ? err.message : "Stripe error adding invoice line item.";
    return NextResponse.json({
      error: `Invoice draft created (${invoice.id}) but line item failed: ${msg}. Add the line item manually in Stripe.`,
      partialInvoiceId: invoice.id,
    }, { status: 502 });
  }

  // ── Persist invoice metadata to snapshot ──────────────────────────────────
  const now = new Date().toISOString();
  const { data: updatedRow, error: updateError } = await supabase
    .from("client_monthly_revenue_snapshots")
    .update({
      stripe_invoice_id:         invoice.id,
      stripe_invoice_status:     invoice.status ?? "draft",
      stripe_invoice_url:        invoice.hosted_invoice_url ?? null,
      invoice_draft_created_at:  now,
    })
    .eq("id", snapshotId.trim())
    .select("*")
    .single();

  if (updateError) {
    console.error("[POST create-invoice-draft] snapshot update error", updateError);
    // Invoice was created — surface the Stripe ID so admin can find it
    return NextResponse.json({
      error: `Invoice draft created in Stripe (${invoice.id}) but snapshot update failed. Record the invoice ID manually.`,
      stripeInvoiceId: invoice.id,
    }, { status: 500 });
  }

  return NextResponse.json({ success: true, snapshot: rowToMonthlyRevenueSnapshot(updatedRow) });
}
