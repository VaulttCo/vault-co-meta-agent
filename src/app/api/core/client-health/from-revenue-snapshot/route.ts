// POST /api/core/client-health/from-revenue-snapshot — create the monthly client-health
// closeout DRAFT from an INTERNAL revenue snapshot already stored in Vault Co.
//
// Reads ONLY internal aggregate revenue data (Valerie's read-only financial reader). NO
// Stripe call, NO Stripe mutation, NO GHL mutation, NO invoice send, NO external fetch.
// DRAFT-ONLY: builds an internal closeout artifact with SAFE AGGREGATE references and
// links a sanitized source_snapshot_id ref. No raw provider IDs, payment-method ids, or
// card/bank numbers are read or stored. Runs at money tier (L3) because it is revenue-tied.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getFinancialData } from "@/lib/core/agents/valerie/data";
import { createClientHealthDraft } from "@/lib/core/client-health/health-draft";
import { toClientHealthDraftDTO, getClientHealthDraftBySourceSnapshot } from "@/lib/core/client-health/db";
import type { VaultClientHealthDraftInput } from "@/lib/core/client-health/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Safe, sanitized aggregate ref for a snapshot — NEVER a raw provider/customer id.
// Same shape as the finance-drafts snapshot ref so the two closeouts pair naturally.
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

  // Idempotent: one monthly closeout per snapshot ref + health_type — repeat POSTs return
  // the existing draft instead of duplicating.
  const existing = await getClientHealthDraftBySourceSnapshot(ref, "monthly_client_health_closeout");
  if (existing) return NextResponse.json({ draft: toClientHealthDraftDTO(existing), existing: true }, { status: 200 });

  const period = snap.billingMonth ?? "current period";
  const input: VaultClientHealthDraftInput = {
    client_id: snap.clientId,
    title: `Monthly client health closeout — ${snap.clientName} (${period})`,
    description: `End-of-period internal health closeout for ${snap.clientName}, built from the period's internal revenue snapshot. Roll the period's delivery, responsiveness, and revenue signals into one decision-ready read. No client is contacted and nothing external is touched.`,
    health_type: "monthly_client_health_closeout",
    source_agent: "vivian",
    source_snapshot_id: ref,
    risk_reasons: ["Summarize risks opened and closed this period"],
    delivery_risks: ["Summarize delivery for the period against expectations"],
    communication_risks: ["Summarize responsiveness for the period"],
    next_best_actions: ["Set the single focus item for next period"],
    owner_notes: `Period read for Nick/Jaxon. Revenue context (internal aggregate): revenue ${usd(snap.revenue)}, Vault fee ${usd(snap.vaultFee)} for ${period}.`,
    upsell_opportunities: ["Note expansion signals observed this period, if any"],
    missing_inputs: [
      ...(snap.reviewStatus && snap.reviewStatus !== "reviewed" && snap.reviewStatus !== "locked" ? ["Snapshot not yet reviewed — confirm figures before closeout"] : []),
      "Confirm health score and risk label for the period",
    ],
    evidence: [
      `Internal revenue snapshot: ${snap.clientName} (${period})`,
      `Source: ${fin.source} aggregate (no Stripe call, no raw provider data)`,
      "Pairs with the finance revenue-closeout draft for the same period, if created",
    ],
    metadata: { template_key: "from_revenue_snapshot", suggested_owner: "Vivian (Valerie supplies revenue context)" },
  };

  const result = await createClientHealthDraft(input, { createdBy: auth.userId });
  if (!result.created || !result.draft) {
    return NextResponse.json({ error: result.reason ?? "Could not create client-health draft" }, { status: 400 });
  }
  return NextResponse.json({ draft: toClientHealthDraftDTO(result.draft) }, { status: 201 });
}
