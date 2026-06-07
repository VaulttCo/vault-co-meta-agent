// GET  /api/core/message-drafts — list message drafts (DTOs) + counts. Role-guarded.
// POST /api/core/message-drafts — create a draft (from template or custom).
//
// DRAFT-ONLY: no SMS/email send, no GHL call, no external fetch, no publish/execute.
// DTOs return safe_preview + sanitized body only — never raw provider payloads,
// credentials, live IDs, or PII beyond a sanitized contact_ref.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getMessageDrafts, getMessageDraftCounts, toMessageDraftDTO } from "@/lib/core/messages/db";
import { createMessageDraft } from "@/lib/core/messages/message-draft";
import { getMessageTemplate, messageTemplateToInput } from "@/lib/core/messages/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [drafts, counts] = await Promise.all([getMessageDrafts(500), getMessageDraftCounts()]);
    return NextResponse.json({ drafts: drafts.map(toMessageDraftDTO), counts });
  } catch (e) {
    console.error("[GET /api/core/message-drafts]", (e as Error).message);
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
    // CUSTOM drafts (free-form client/lead-facing copy) are higher-trust: restrict to
    // admin / integration managers. Approval reviewers may still create from templates.
    if (!fromTemplate && !(auth.role === "admin" || can(auth.role, "canConnectIntegrations"))) {
      return NextResponse.json({ error: "Custom message drafts require an admin or integration manager. Use a template instead." }, { status: 403 });
    }
    let input = body;
    if (fromTemplate) {
      const tpl = getMessageTemplate(body.template_key);
      if (!tpl) return NextResponse.json({ error: "unknown template_key" }, { status: 400 });
      input = messageTemplateToInput(tpl, { client_id: typeof body.client_id === "string" ? body.client_id : null });
    }
    const result = await createMessageDraft(input, { createdBy: auth.userId });
    if (!result.created || !result.draft) {
      return NextResponse.json({ error: result.reason ?? "Could not create message draft" }, { status: 400 });
    }
    return NextResponse.json({ draft: toMessageDraftDTO(result.draft) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/core/message-drafts]", (e as Error).message);
    return NextResponse.json({ error: "Failed to create message draft" }, { status: 500 });
  }
}
