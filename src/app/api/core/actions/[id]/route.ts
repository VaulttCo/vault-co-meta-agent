// GET   /api/core/actions/[id] — one action (DTO). Role-guarded.
// PATCH /api/core/actions/[id] — limited internal edits (rollback_notes only).
// Never returns raw payload/execution_result; never mutates external systems.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getAction, updateAction, toActionDTO, appendAudit } from "@/lib/core/actions/db";
import { scrubText } from "@/lib/core/actions/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const action = await getAction(id);
  if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ action: toActionDTO(action) });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const action = await getAction(id);
  if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  // Only a safe, bounded internal note may be patched here. NOT status/payload —
  // those move only through the review/execute governance routes.
  const note = typeof body.rollback_notes === "string" ? scrubText(body.rollback_notes.slice(0, 1000)) : action.rollback_notes;
  const updated = await updateAction(id, {
    rollback_notes: note,
    audit_log: appendAudit(action, { at: new Date().toISOString(), actor: auth.userId, event: "patched", detail: "rollback_notes updated" }),
  });
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ action: toActionDTO(updated) });
}
