// GET  /api/core/meta-campaign-drafts — list Meta campaign drafts (DTOs) + counts. Role-guarded.
// POST /api/core/meta-campaign-drafts — create a draft (from template or custom).
//
// DRAFT-ONLY: no Meta launch, no budget change, no ad set/ad/lead-form creation, no Meta
// API call, no external fetch, no publish/execute. DTOs return safe_preview + sanitized
// fields only — never raw provider payloads, credentials/tokens, or live campaign/ad-
// account IDs.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getCampaignDrafts, getCampaignDraftCounts, toCampaignDraftDTO } from "@/lib/core/campaign-drafts/db";
import { createCampaignDraft } from "@/lib/core/campaign-drafts/meta-campaign-draft";
import { getCampaignTemplate, campaignTemplateToInput } from "@/lib/core/campaign-drafts/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [drafts, counts] = await Promise.all([getCampaignDrafts(500), getCampaignDraftCounts()]);
    return NextResponse.json({ drafts: drafts.map(toCampaignDraftDTO), counts });
  } catch (e) {
    console.error("[GET /api/core/meta-campaign-drafts]", (e as Error).message);
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
    // CUSTOM drafts (free-form campaign plans) are higher-trust: restrict to admin /
    // integration managers. Approval reviewers may still create from templates.
    if (!fromTemplate && !(auth.role === "admin" || can(auth.role, "canConnectIntegrations"))) {
      return NextResponse.json({ error: "Custom campaign drafts require an admin or integration manager. Use a template instead." }, { status: 403 });
    }
    let input = body;
    if (fromTemplate) {
      const tpl = getCampaignTemplate(body.template_key);
      if (!tpl) return NextResponse.json({ error: "unknown template_key" }, { status: 400 });
      input = campaignTemplateToInput(tpl, { client_id: typeof body.client_id === "string" ? body.client_id : null });
    }
    const result = await createCampaignDraft(input, { createdBy: auth.userId });
    if (!result.created || !result.draft) {
      return NextResponse.json({ error: result.reason ?? "Could not create campaign draft" }, { status: 400 });
    }
    return NextResponse.json({ draft: toCampaignDraftDTO(result.draft) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/core/meta-campaign-drafts]", (e as Error).message);
    return NextResponse.json({ error: "Failed to create campaign draft" }, { status: 500 });
  }
}
