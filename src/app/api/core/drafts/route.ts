// GET /api/core/drafts — Veronica's draft-message approval queue + counts.
// READ-ONLY. Role-guarded (canViewApprovals). Mock-safe.
// Drafts are intelligence artifacts — listing them never sends anything.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getDrafts, getDraftCounts } from "@/lib/core/agents/veronica/drafts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["draft", "approved", "edited", "rejected"];

export async function GET(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const statusFilter = req.nextUrl.searchParams.get("status");
  try {
    const [all, counts] = await Promise.all([getDrafts(), getDraftCounts()]);
    const drafts =
      statusFilter && STATUSES.includes(statusFilter)
        ? all.filter((d) => d.status === statusFilter)
        : all;
    return NextResponse.json({ drafts, counts });
  } catch (e) {
    console.error("[GET /api/core/drafts]", (e as Error).message);
    return NextResponse.json({ drafts: [], counts: null });
  }
}
