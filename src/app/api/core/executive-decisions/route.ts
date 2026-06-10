// GET /api/core/executive-decisions — the Executive Decision Center feed.
// READ-ONLY. Role-guarded (canViewStrategyData, matching the executive brief).
// Rolls up PENDING items from every existing approval queue into critical /
// recommended / low buckets. It only reads and links — it never sends,
// publishes, pushes to Meta, touches Hermes, or mutates any external system.

import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getExecutiveDecisionCenter } from "@/lib/core/executive-decisions/build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const center = await getExecutiveDecisionCenter();
    return NextResponse.json({ center });
  } catch (e) {
    console.error("[GET /api/core/executive-decisions]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load executive decisions" }, { status: 500 });
  }
}
