/**
 * POST /api/integrations/meta/sync
 * Sync Meta Ads performance data for a client (read-only).
 */
import { NextRequest, NextResponse } from "next/server";
import { syncMetaPerformanceForClient } from "@/lib/integrations/meta/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const result = await syncMetaPerformanceForClient(clientId);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
