// GET /api/core/proposals/[id] — single system proposal.
// READ-ONLY. Role-guarded (canViewApprovals). Mock-safe.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getProposal } from "@/lib/core/collab/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  try {
    const proposal = await getProposal(id);
    if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ proposal });
  } catch (e) {
    console.error("[GET /api/core/proposals/[id]]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load proposal" }, { status: 500 });
  }
}
