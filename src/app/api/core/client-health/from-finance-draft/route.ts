// POST /api/core/client-health/from-finance-draft — create a client-health DRAFT from an
// INTERNAL finance draft whose type signals client risk (overdue invoice, payment
// follow-up, revenue closeout issue, refund review, attribution/revenue dispute risk).
//
// READS the internal finance draft only. NO Stripe mutation, NO payment collection, NO
// external fetch. The health draft is composed from the finance TYPE and client ref — not
// the finance figures — and runs at money tier (L3) because it is finance-tied.
// Idempotent via source_finance_draft_id (1:1 finance draft → health draft).

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getFinanceDraft } from "@/lib/core/finance-drafts/db";
import { createClientHealthDraft } from "@/lib/core/client-health/health-draft";
import { toClientHealthDraftDTO, getClientHealthDraftBySourceFinanceDraft } from "@/lib/core/client-health/db";
import type { VaultClientHealthDraftInput, HealthType } from "@/lib/core/client-health/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Finance types that signal client risk, and the health lens each maps to.
const HEALTH_FINANCE_TYPES: Record<string, HealthType> = {
  payment_follow_up: "retention_risk_review",
  overdue_invoice_review: "retention_risk_review",
  refund_review: "retention_risk_review",
  revenue_closeout: "client_health_review",
  attribution_review: "client_health_review",
};

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canViewApprovals") || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const financeDraftId = typeof body.finance_draft_id === "string" ? body.finance_draft_id : null;
  if (!financeDraftId) return NextResponse.json({ error: "finance_draft_id is required" }, { status: 400 });

  const fin = await getFinanceDraft(financeDraftId);
  if (!fin) return NextResponse.json({ error: "Finance draft not found" }, { status: 404 });

  const healthType = HEALTH_FINANCE_TYPES[fin.finance_type];
  if (!healthType) {
    return NextResponse.json({ error: "Finance draft type does not indicate client risk (overdue / payment follow-up / closeout / refund / attribution types only)." }, { status: 400 });
  }

  const existing = await getClientHealthDraftBySourceFinanceDraft(fin.id);
  if (existing) return NextResponse.json({ draft: toClientHealthDraftDTO(existing), existing: true }, { status: 200 });

  const typeLabel = fin.finance_type.replace(/_/g, " ");
  // Composed from the finance TYPE only — deliberately not amounts/figures, which stay in
  // the finance lane. The finance tie sets this draft to money tier (L3) automatically.
  const input: VaultClientHealthDraftInput = {
    client_id: fin.client_id,
    title: `Client health signal — ${typeLabel}`,
    description: `Internal health review prompted by a ${typeLabel} finance draft. Assess what the payment/revenue signal means for this client relationship; figures stay in the finance lane.`,
    health_type: healthType,
    source_agent: fin.source_agent ?? "valerie",
    source_finance_draft_id: fin.id,
    risk_reasons: [`A ${typeLabel} finance draft exists for this client — assess the relationship impact`],
    delivery_risks: healthType === "client_health_review" ? ["Confirm delivery results support the period's revenue picture"] : [],
    next_best_actions: ["Complete the health assessment; the linked finance draft is reviewed separately in /finance-drafts"],
    missing_inputs: ["Confirm health score inputs", "Confirm risk label", "Confirm renewal/contract timing"],
    evidence: [`Linked finance draft (${typeLabel}, internal, draft-only)`, `Finance draft status: ${fin.status}`],
    metadata: { template_key: "from_finance_draft" },
  };

  const result = await createClientHealthDraft(input, { createdBy: auth.userId });
  if (!result.created || !result.draft) {
    return NextResponse.json({ error: result.reason ?? "Could not create client-health draft" }, { status: 400 });
  }
  return NextResponse.json({ draft: toClientHealthDraftDTO(result.draft) }, { status: 201 });
}
