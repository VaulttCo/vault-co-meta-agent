/**
 * POST /api/integrations/meta/test
 * Test Meta Ads connection for a client.
 */
import { NextRequest, NextResponse } from "next/server";
import { testMetaConnection } from "@/lib/integrations/meta/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const result = await testMetaConnection(clientId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
