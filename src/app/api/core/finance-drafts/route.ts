// GET  /api/core/finance-drafts — list finance drafts (DTOs) + counts. Role-guarded.
// POST /api/core/finance-drafts — create a draft (from template or custom).
//
// DRAFT-ONLY: no Stripe invoice create/send/finalize, no charge, no payment collection, no
// money movement, no Stripe API call, no external fetch, no publish/execute. DTOs return
// safe_preview + sanitized fields only — never raw provider payloads, credentials/tokens,
// live Stripe IDs, or card/bank/account numbers.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getFinanceDrafts, getFinanceDraftCounts, toFinanceDraftDTO } from "@/lib/core/finance-drafts/db";
import { createFinanceDraft } from "@/lib/core/finance-drafts/finance-draft";
import { getFinanceTemplate, financeTemplateToInput } from "@/lib/core/finance-drafts/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [drafts, counts] = await Promise.all([getFinanceDrafts(500), getFinanceDraftCounts()]);
    return NextResponse.json({ drafts: drafts.map(toFinanceDraftDTO), counts });
  } catch (e) {
    console.error("[GET /api/core/finance-drafts]", (e as Error).message);
    return NextResponse.json({ drafts: [], counts: null });
  }
}

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canViewApprovals") || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const fromTemplate = typeof body.template_key === "string";
    // CUSTOM drafts (free-form finance figures) are higher-trust: restrict to admin /
    // integration managers. Approval reviewers may still create from templates.
    if (!fromTemplate && !(auth.role === "admin" || can(auth.role, "canConnectIntegrations"))) {
      return NextResponse.json({ error: "Custom finance drafts require an admin or integration manager. Use a template instead." }, { status: 403 });
    }
    let input = body;
    if (fromTemplate) {
      const tpl = getFinanceTemplate(body.template_key);
      if (!tpl) return NextResponse.json({ error: "unknown template_key" }, { status: 400 });
      input = financeTemplateToInput(tpl, { client_id: typeof body.client_id === "string" ? body.client_id : null });
    }
    const result = await createFinanceDraft(input, { createdBy: auth.userId });
    if (!result.created || !result.draft) {
      return NextResponse.json({ error: result.reason ?? "Could not create finance draft" }, { status: 400 });
    }
    return NextResponse.json({ draft: toFinanceDraftDTO(result.draft) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/core/finance-drafts]", (e as Error).message);
    return NextResponse.json({ error: "Failed to create finance draft" }, { status: 500 });
  }
}
