// GET /api/core/workforce — workforce roster with reputation + objectives.
// READ-ONLY. Role-guarded (canViewStrategyData). Mock-safe.

import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getWorkforce } from "@/lib/core/collab/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const workforce = await getWorkforce();
    return NextResponse.json({ workforce });
  } catch (e) {
    console.error("[GET /api/core/workforce]", (e as Error).message);
    return NextResponse.json({ workforce: [] });
  }
}
