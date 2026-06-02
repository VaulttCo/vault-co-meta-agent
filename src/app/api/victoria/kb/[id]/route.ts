// /api/victoria/kb/[id]
// DELETE: Remove a knowledge base entry by ID
// Server-side only.

import { NextRequest, NextResponse } from "next/server";
import { deleteKBEntry } from "@/lib/victoria/db";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

// ─────────────────────────────────────────────────────────────
// DELETE /api/victoria/kb/:id
// ─────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth: deleting KB entries is a staff-only, destructive action.
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await deleteKBEntry(id);
  return NextResponse.json({ success: true, id });
}
