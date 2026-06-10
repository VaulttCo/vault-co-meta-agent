// GET /api/core/operator-brief — the unified Daily Operator Worklist.
// READ-ONLY. Role-guarded (canViewStrategyData, matching the executive brief).
// Aggregates every human-approval queue into one prioritized "what needs my
// decision today" list. Counting items never sends, publishes, or mutates
// anything — it only links to where the human already reviews.

import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getOperatorWorklist } from "@/lib/core/operator-brief/build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const worklist = await getOperatorWorklist();
    return NextResponse.json({ worklist });
  } catch (e) {
    console.error("[GET /api/core/operator-brief]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load operator brief" }, { status: 500 });
  }
}
