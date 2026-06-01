// GET /api/core/proposals — System Creation Engine proposals + status counts.
// READ-ONLY. Role-guarded (canViewApprovals). Mock-safe.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getProposals, getProposalCounts } from "@/lib/core/collab/db";
import type { RecommendationStatus } from "@/lib/core/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: RecommendationStatus[] = ["pending_review", "approved", "rejected", "archived", "implemented"];

export async function GET(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const statusFilter = req.nextUrl.searchParams.get("status");
  try {
    const [all, counts] = await Promise.all([getProposals(), getProposalCounts()]);
    const proposals =
      statusFilter && STATUSES.includes(statusFilter as RecommendationStatus)
        ? all.filter((p) => p.status === statusFilter)
        : all;
    return NextResponse.json({ proposals, counts });
  } catch (e) {
    console.error("[GET /api/core/proposals]", (e as Error).message);
    return NextResponse.json({ proposals: [], counts: null });
  }
}
