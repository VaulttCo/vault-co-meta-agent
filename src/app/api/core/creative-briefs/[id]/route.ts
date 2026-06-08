// GET   /api/core/creative-briefs/[id] — one brief (DTO). Role-guarded.
// PATCH /api/core/creative-briefs/[id] — limited internal edits (review notes only).
// DRAFT-ONLY: never returns raw provider payloads/credentials/IDs; never posts/publishes.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getCreativeBrief, updateCreativeBrief, toCreativeBriefDTO } from "@/lib/core/creative-briefs/db";
import { scrubText } from "@/lib/core/actions/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const brief = await getCreativeBrief(id);
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ brief: toCreativeBriefDTO(brief) });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const brief = await getCreativeBrief(id);
  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  // Only a sanitized internal metadata note may be patched here — NOT status/creative fields.
  // Status moves only through the review route; creative content is immutable post-create.
  const note = typeof body.review_note === "string" ? scrubText(body.review_note.slice(0, 1000)) : null;
  const metadata = note ? { ...(brief.metadata ?? {}), latest_internal_note: note } : brief.metadata;
  const updated = await updateCreativeBrief(id, { metadata });
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ brief: toCreativeBriefDTO(updated) });
}
