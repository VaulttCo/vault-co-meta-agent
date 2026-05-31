// GET /api/core/recommendations — Vault Core recommendation queue + status counts.
// READ-ONLY. Role-guarded (canViewApprovals = operators). Mock-safe.
// Optional ?status=pending_review|approved|rejected|archived|implemented filter.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getRecommendations, getRecommendationCounts } from "@/lib/core/memory/db";
import type { RecommendationStatus } from "@/lib/core/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: RecommendationStatus[] = [
  "pending_review",
  "approved",
  "rejected",
  "archived",
  "implemented",
];

export async function GET(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const statusFilter = req.nextUrl.searchParams.get("status");
  try {
    const [all, counts] = await Promise.all([
      getRecommendations(500),
      getRecommendationCounts(),
    ]);
    const recommendations =
      statusFilter && STATUSES.includes(statusFilter as RecommendationStatus)
        ? all.filter((r) => r.status === statusFilter)
        : all;
    return NextResponse.json({ recommendations, counts });
  } catch (e) {
    console.error("[GET /api/core/recommendations]", (e as Error).message);
    return NextResponse.json({ recommendations: [], counts: null });
  }
}
