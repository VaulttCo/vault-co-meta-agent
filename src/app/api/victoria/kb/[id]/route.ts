// /api/victoria/kb/[id]
// DELETE: Remove a knowledge base entry by ID
// Server-side only.

import { NextRequest, NextResponse } from "next/server";
import { deleteKBEntry } from "@/lib/victoria/db";

// ─────────────────────────────────────────────────────────────
// DELETE /api/victoria/kb/:id
// ─────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await deleteKBEntry(id);
  return NextResponse.json({ success: true, id });
}
