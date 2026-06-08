// POST /api/core/finance-drafts/from-revenue-snapshot — create a finance DRAFT from an
// INTERNAL revenue snapshot already stored in Vault Co.
//
// Reads ONLY internal aggregate revenue data (Valerie's read-only financial reader). NO
// Stripe call, NO Stripe mutation, NO invoice send, NO charge, NO external fetch. DRAFT-
// ONLY: builds an internal planning artifact with SAFE AGGREGATE values (revenue / fee /
// split summaries as advisory text) and links a sanitized source_snapshot_id ref. No raw
// Stripe IDs, payment method ids, or card/bank numbers are read or stored.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getFinancialData } from "@/lib/core/agents/valerie/data";
import { createFinanceDraft } from "@/lib/core/finance-drafts/finance-draft";
import { toFinanceDraftDTO, getFinanceDraftBySourceSnapshot } from "@/lib/core/finance-drafts/db";
import type { VaultFinanceDraftInput } from "@/lib/core/finance-drafts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Safe, sanitized aggregate ref for a snapshot — NEVER a raw provider/customer id.
function snapshotRef(clientId: string, billingMonth: string | null): string {
  return `${clientId}:${billingMonth ?? "current"}`.replace(/[^a-zA-Z0-9_:.-]/g, "").slice(0, 120);
}
function usd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canViewApprovals") || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const snapshotId = typeof body.snapshot_id === "string" ? body.snapshot_id : null;
  if (!snapshotId) return NextResponse.json({ error: "snapshot_id is required" }, { status: 400 });

  // INTERNAL read only — aggregate revenue data; no Stripe/provider call.
  const fin = await getFinancialData();
  const snap = fin.snapshots.find((s) => snapshotRef(s.clientId, s.billingMonth) === snapshotId)
    ?? fin.snapshots.find((s) => s.clientId === snapshotId);
  if (!snap) return NextResponse.json({ error: "Revenue snapshot not found" }, { status: 404 });

  const ref = snapshotRef(snap.clientId, snap.billingMonth);

  // Idempotent: one closeout draft per snapshot ref — don't spam duplicates on repeat POSTs.
  const existing = await getFinanceDraftBySourceSnapshot(ref);
  if (existing) return NextResponse.json({ draft: toFinanceDraftDTO(existing), existing: true }, { status: 200 });

  const period = snap.billingMonth ?? "current period";
  const input: VaultFinanceDraftInput = {
    client_id: snap.clientId,
    title: `Revenue closeout — ${snap.clientName} (${period})`,
    description: `Draft revenue closeout built from an internal revenue snapshot for ${snap.clientName}. Review and refine before any future invoicing. No invoice is sent and no payment is collected.`,
    finance_type: "revenue_closeout",
    source_agent: "valerie",
    source_snapshot_id: ref,
    amount_summary: `Revenue ${usd(snap.revenue)} · Vault fee ${usd(snap.vaultFee)} (${period}, advisory)`,
    calculation: "Aggregated closed-won revenue and Vault Co fee for the snapshot period (internal aggregate values only).",
    line_items: [
      { label: "Closed-won revenue", amount_text: usd(snap.revenue), notes: period },
      { label: "Vault Co fee", amount_text: usd(snap.vaultFee), notes: period },
    ],
    partner_split: {
      summary: `Partner split of the Vault Co fee for ${period} (advisory).`,
      shares: [`Nick: ${usd(snap.nickEarnings)}`, `Jaxon: ${usd(snap.jaxonEarnings)}`],
    },
    missing_inputs: [
      ...(snap.reviewStatus && snap.reviewStatus !== "reviewed" && snap.reviewStatus !== "locked" ? ["Snapshot not yet reviewed — confirm figures before closeout"] : []),
      "Confirm all client snapshots for the period are reviewed",
    ],
    evidence: [
      `Internal revenue snapshot: ${snap.clientName} (${period})`,
      `Source: ${fin.source} aggregate (no Stripe call, no raw provider data)`,
      ...(snap.invoiceStatus ? [`Invoice status (reviewed): ${snap.invoiceStatus}`] : []),
    ],
    metadata: { template_key: "from_revenue_snapshot", suggested_owner: "Valerie (Financial Director)" },
  };

  const result = await createFinanceDraft(input, { createdBy: auth.userId });
  if (!result.created || !result.draft) {
    return NextResponse.json({ error: result.reason ?? "Could not create finance draft" }, { status: 400 });
  }
  return NextResponse.json({ draft: toFinanceDraftDTO(result.draft) }, { status: 201 });
}
