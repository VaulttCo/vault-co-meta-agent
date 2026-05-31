// GET /api/core/activity — Live Activity feed + recommendations + agent runs.
// READ-ONLY. Role-guarded. Falls back to seeded mock data when the DB is absent.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getActivity, getRecommendations, getAgentRuns } from "@/lib/core/memory/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limitParamRaw = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(100, Math.max(1, parseInt(limitParamRaw ?? "30", 10) || 30));

  try {
    const [activity, recommendations, runs] = await Promise.all([
      getActivity(limit),
      getRecommendations(25),
      getAgentRuns(50),
    ]);
    return NextResponse.json({ activity, recommendations, runs });
  } catch (e) {
    console.error("[GET /api/core/activity]", (e as Error).message);
    return NextResponse.json({ activity: [], recommendations: [], runs: [] });
  }
}
