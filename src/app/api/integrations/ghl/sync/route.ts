/**
 * POST /api/integrations/ghl/sync
 * Sync GoHighLevel pipeline data for a client (read-only).
 */
import { NextRequest, NextResponse } from "next/server";
import { syncGHLPipelineForClient } from "@/lib/integrations/ghl/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
