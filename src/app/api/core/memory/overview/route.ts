// GET /api/core/memory/overview — Memory Overview metrics + Memory Health.
// READ-ONLY. Role-guarded. Derived from the live graph (or mock fallback).

import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getOverview, getHealth, isCoreDbAvailable } from "@/lib/core/memory/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [overview, health] = await Promise.all([getOverview(), getHealth()]);
    return NextResponse.json({ overview, health, live: isCoreDbAvailable() });
  } catch (e) {
    console.error("[GET /api/core/memory/overview]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
