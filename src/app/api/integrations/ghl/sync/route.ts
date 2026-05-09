/**
 * POST /api/integrations/ghl/sync
 * Sync GoHighLevel pipeline data for a client (read-only).
 */
import { NextRequest, NextResponse } from "next/server";
import { syncGHLPipelineForClient } from "@/lib/integrations/ghl/client";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const result = await syncGHLPipelineForClient(clientId);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
