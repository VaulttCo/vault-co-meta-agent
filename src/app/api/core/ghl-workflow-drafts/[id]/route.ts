// GET   /api/core/ghl-workflow-drafts/[id] — one draft (DTO). Role-guarded.
// PATCH /api/core/ghl-workflow-drafts/[id] — limited internal edits (human_review_notes).
// DRAFT-ONLY: never returns raw GHL payloads/credentials/IDs; never mutates GHL.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getWorkflowDraft, updateWorkflowDraft, toWorkflowDraftDTO } from "@/lib/core/workflows/db";
import { scrubText } from "@/lib/core/actions/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const draft = await getWorkflowDraft(id);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ draft: toWorkflowDraftDTO(draft) });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const draft = await getWorkflowDraft(id);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  // Only a sanitized internal note may be patched here — NOT status/steps/payload.
  // Status moves only through the review route; steps are immutable post-create.
  const notes = typeof body.human_review_notes === "string" ? scrubText(body.human_review_notes.slice(0, 1000)) : draft.human_review_notes;
  const updated = await updateWorkflowDraft(id, { human_review_notes: notes });
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ draft: toWorkflowDraftDTO(updated) });
}
