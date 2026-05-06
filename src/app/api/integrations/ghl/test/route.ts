/**
 * POST /api/integrations/ghl/test
 * Test GoHighLevel connection for a client.
 */
import { NextRequest, NextResponse } from "next/server";
import { testGHLConnection } from "@/lib/integrations/ghl/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const result = await testGHLConnection(clientId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
