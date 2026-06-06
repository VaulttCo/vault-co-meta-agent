// POST /api/core/actions/[id]/note — add a sanitized internal human note (Phase 9.2).
//
// A note is INTERNAL-ONLY and audit-only: it appends a `note_added` lifecycle entry
// to the action's audit_log and changes NO approval/execution status. It never
// executes anything and never touches an external system. Notes are scrubbed
// (emails/phones/tokens redacted) before persistence — no secrets/PII reach the DTO.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getAction, addActionNote, toActionDTO } from "@/lib/core/actions/db";
import { scrubText } from "@/lib/core/actions/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const action = await getAction(id);
  if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const raw = typeof body.note === "string" ? body.note : "";
  const note = scrubText(raw.slice(0, 1000));
  if (!note.trim()) return NextResponse.json({ error: "note is required" }, { status: 400 });

  const updated = await addActionNote(action, {
    at: new Date().toISOString(),
    actor: auth.userId,
    event: "note_added",
    message: "Human note added",
    note,
    detail: note,
  });
  // If the note could not be persisted (lost every compare-and-set retry), report it
  // honestly — never return a success DTO carrying a note that wasn't saved.
  if (!updated) return NextResponse.json({ error: "Could not save the note — please retry." }, { status: 409 });
  return NextResponse.json({ action: toActionDTO(updated) });
}
