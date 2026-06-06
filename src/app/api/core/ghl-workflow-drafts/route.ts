// GET  /api/core/ghl-workflow-drafts — list workflow drafts (DTOs) + counts. Role-guarded.
// POST /api/core/ghl-workflow-drafts — create a workflow draft (from template or custom).
//
// DRAFT-ONLY: no GHL call, no external fetch, no publish, no execute. DTOs return
// sanitized steps + safe_preview only — never raw GHL payloads, credentials, or live IDs.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getWorkflowDrafts, getWorkflowDraftCounts, toWorkflowDraftDTO } from "@/lib/core/workflows/db";
import { createWorkflowDraft } from "@/lib/core/workflows/ghl-workflow-draft";
import { getWorkflowTemplate, templateToInput } from "@/lib/core/workflows/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [drafts, counts] = await Promise.all([getWorkflowDrafts(500), getWorkflowDraftCounts()]);
    return NextResponse.json({ drafts: drafts.map(toWorkflowDraftDTO), counts });
  } catch (e) {
    console.error("[GET /api/core/ghl-workflow-drafts]", (e as Error).message);
    return NextResponse.json({ drafts: [], counts: null });
  }
}

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Drafting is internal — admin / approvals reviewers / integration managers.
  if (!(auth.role === "admin" || can(auth.role, "canViewApprovals") || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    // Create from a template, or from a custom (validated) input. Either way it is
    // re-sanitized and stored as pending_review — nothing is published to GHL.
    const fromTemplate = typeof body.template_key === "string";
    // CUSTOM drafts (free-form steps incl. draft SMS/email copy) are higher-trust:
    // restrict them to admin / integration managers. Approval reviewers may still
    // create from the vetted template library.
    if (!fromTemplate && !(auth.role === "admin" || can(auth.role, "canConnectIntegrations"))) {
      return NextResponse.json({ error: "Custom workflow drafts require an admin or integration manager. Use a template instead." }, { status: 403 });
    }
    let input = body;
    if (fromTemplate) {
      const tpl = getWorkflowTemplate(body.template_key);
      if (!tpl) return NextResponse.json({ error: "unknown template_key" }, { status: 400 });
      input = templateToInput(tpl, { client_id: typeof body.client_id === "string" ? body.client_id : null });
    }
    const result = await createWorkflowDraft(input, { createdBy: auth.userId });
    if (!result.created || !result.draft) {
      return NextResponse.json({ error: result.reason ?? "Could not create workflow draft" }, { status: 400 });
    }
    return NextResponse.json({ draft: toWorkflowDraftDTO(result.draft) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/core/ghl-workflow-drafts]", (e as Error).message);
    return NextResponse.json({ error: "Failed to create workflow draft" }, { status: 500 });
  }
}
