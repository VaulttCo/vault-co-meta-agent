// GET /api/core/executive-brief — Vanessa's Daily Executive Brief + Executive Queue.
// READ-ONLY. Role-guarded (canViewStrategyData). Computed fresh from current
// Vault Memory state, mock-safe.

import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getExecutiveBrief } from "@/lib/core/agents/vanessa/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { brief, queue } = await getExecutiveBrief();
    return NextResponse.json({ brief, queue });
  } catch (e) {
    console.error("[GET /api/core/executive-brief]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load executive brief" }, { status: 500 });
  }
}
