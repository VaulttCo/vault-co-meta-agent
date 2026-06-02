/**
 * POST /api/integrations/ghl/test
 * Test GoHighLevel connection for a client.
 *
 * SCOPE: LEGACY per-client GHL integration (Revenue Dashboard only). Reads a
 * client's own GHL sub-account by clientId. NOT used by Vault Core. Admin-only
 * because it can probe arbitrary client sub-accounts.
 */
import { NextRequest, NextResponse } from "next/server";
import { testGHLConnection } from "@/lib/integrations/ghl/client";
import { resolveServerRole } from "@/lib/auth/server-role";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });
  }

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
