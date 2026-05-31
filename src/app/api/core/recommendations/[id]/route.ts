// GET /api/core/recommendations/[id] — full traceability bundle for one rec.
// READ-ONLY. Role-guarded (canViewApprovals). Mock-safe.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getRecommendationTrace } from "@/lib/core/memory/db";

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
    const trace = await getRecommendationTrace(id);
    if (!trace) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ trace });
  } catch (e) {
    console.error("[GET /api/core/recommendations/[id]]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load recommendation" }, { status: 500 });
  }
}
