// GET  /api/core/creative-briefs — list creative briefs (DTOs) + counts. Role-guarded.
// POST /api/core/creative-briefs — create a brief (from template or custom).
//
// DRAFT-ONLY: no social post/publish/upload/schedule, no Meta ad launch, no external fetch,
// no client contact, no execute. DTOs return safe_preview + sanitized fields only — never
// raw provider payloads, credentials, live social/ad IDs, or raw creator/contact PII.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getCreativeBriefs, getCreativeBriefCounts, toCreativeBriefDTO } from "@/lib/core/creative-briefs/db";
import { createCreativeBrief } from "@/lib/core/creative-briefs/creative-brief";
import { getCreativeTemplate, creativeTemplateToInput } from "@/lib/core/creative-briefs/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [briefs, counts] = await Promise.all([getCreativeBriefs(500), getCreativeBriefCounts()]);
    return NextResponse.json({ briefs: briefs.map(toCreativeBriefDTO), counts });
  } catch (e) {
    console.error("[GET /api/core/creative-briefs]", (e as Error).message);
    return NextResponse.json({ briefs: [], counts: null });
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
    // CUSTOM briefs (free-form client/ad-facing copy) are higher-trust: restrict to admin /
    // integration managers. Approval reviewers may still create from templates.
    if (!fromTemplate && !(auth.role === "admin" || can(auth.role, "canConnectIntegrations"))) {
      return NextResponse.json({ error: "Custom creative briefs require an admin or integration manager. Use a template instead." }, { status: 403 });
    }
    let input = body;
    if (fromTemplate) {
      const tpl = getCreativeTemplate(body.template_key);
      if (!tpl) return NextResponse.json({ error: "unknown template_key" }, { status: 400 });
      input = creativeTemplateToInput(tpl, { client_id: typeof body.client_id === "string" ? body.client_id : null });
    }
    const result = await createCreativeBrief(input, { createdBy: auth.userId });
    if (!result.created || !result.brief) {
      return NextResponse.json({ error: result.reason ?? "Could not create creative brief" }, { status: 400 });
    }
    return NextResponse.json({ brief: toCreativeBriefDTO(result.brief) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/core/creative-briefs]", (e as Error).message);
    return NextResponse.json({ error: "Failed to create creative brief" }, { status: 500 });
  }
}
