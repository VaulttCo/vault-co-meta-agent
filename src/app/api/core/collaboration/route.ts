// GET /api/core/collaboration — Workforce Collaboration feed + open collaborations.
// READ-ONLY. Role-guarded (canViewStrategyData). Mock-safe.

import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getCollaborationFeed, getCollaborations } from "@/lib/core/collab/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const [feed, collaborations] = await Promise.all([
      getCollaborationFeed(60),
      getCollaborations(50),
    ]);
    return NextResponse.json({ feed, collaborations });
  } catch (e) {
    console.error("[GET /api/core/collaboration]", (e as Error).message);
    return NextResponse.json({ feed: [], collaborations: [] });
  }
}
