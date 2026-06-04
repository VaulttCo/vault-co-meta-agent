// GET /api/core/competitor-intel — competitor intelligence dashboard aggregate.
// READ-ONLY. Role-guarded (canViewStrategyData). Mock-safe. Internal data only —
// no external calls, no credentials, no raw payloads, no client PII.

import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getOverview } from "@/lib/core/competitor/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const overview = await getOverview();
    return NextResponse.json({ overview });
  } catch (e) {
    console.error("[GET /api/core/competitor-intel]", (e as Error).message);
    return NextResponse.json({ overview: null });
  }
}
