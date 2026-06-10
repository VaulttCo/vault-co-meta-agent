// GET  /api/core/client-health — list client-health drafts (DTOs) + counts. Role-guarded.
// POST /api/core/client-health — create a draft (from template or custom).
//
// DRAFT-ONLY: no client contact, no SMS/email, no GHL contact/task/opportunity/workflow
// mutation, no Stripe/Meta mutation, no external fetch, no publish/execute. DTOs return
// safe_preview + sanitized fields only — never raw provider payloads, credentials/tokens,
// live provider IDs, or contact PII.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getClientHealthDrafts, getClientHealthDraftCounts, toClientHealthDraftDTO } from "@/lib/core/client-health/db";
import { createClientHealthDraft } from "@/lib/core/client-health/health-draft";
import { getClientHealthTemplate, clientHealthTemplateToInput } from "@/lib/core/client-health/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [drafts, counts] = await Promise.all([getClientHealthDrafts(500), getClientHealthDraftCounts()]);
    return NextResponse.json({ drafts: drafts.map(toClientHealthDraftDTO), counts });
  } catch (e) {
    console.error("[GET /api/core/client-health]", (e as Error).message);
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
    // CUSTOM drafts (free-form retention assessments) are higher-trust: restrict to admin /
    // integration managers. Approval reviewers may still create from templates.
    if (!fromTemplate && !(auth.role === "admin" || can(auth.role, "canConnectIntegrations"))) {
      return NextResponse.json({ error: "Custom client-health drafts require an admin or integration manager. Use a template instead." }, { status: 403 });
    }
    let input = body;
    if (fromTemplate) {
      const tpl = getClientHealthTemplate(body.template_key);
      if (!tpl) return NextResponse.json({ error: "unknown template_key" }, { status: 400 });
      input = clientHealthTemplateToInput(tpl, { client_id: typeof body.client_id === "string" ? body.client_id : null });
    }
    const result = await createClientHealthDraft(input, { createdBy: auth.userId });
    if (!result.created || !result.draft) {
      return NextResponse.json({ error: result.reason ?? "Could not create client-health draft" }, { status: 400 });
    }
    return NextResponse.json({ draft: toClientHealthDraftDTO(result.draft) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/core/client-health]", (e as Error).message);
    return NextResponse.json({ error: "Failed to create client-health draft" }, { status: 500 });
  }
}
