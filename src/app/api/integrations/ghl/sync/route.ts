/**
 * POST /api/integrations/ghl/sync
 * Sync GoHighLevel pipeline data for a client (read-only from GHL).
 *
 * SCOPE: This is the LEGACY per-client GHL integration used ONLY by the Revenue
 * Dashboard. It reads a client's own GHL sub-account (resolved from per-client
 * credentials / integration_connections / clients.ghl_location_id). It is NOT
 * used by Vault Core — Vault Core reads only the two Vault Co-owned locations via
 * src/lib/core/integrations/ghl/client.ts (env-var-only). Because this endpoint
 * can read arbitrary client sub-accounts, it is restricted to admins.
 */
import { NextRequest, NextResponse } from "next/server";
import { syncGHLPipelineForClient, legacyGhlRoutesEnabled, LEGACY_GHL_DISABLED_BODY } from "@/lib/integrations/ghl/client";
import { resolveServerRole } from "@/lib/auth/server-role";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Kill switch — disabled by default so no arbitrary client GHL sub-account is read.
  if (!legacyGhlRoutesEnabled()) {
    return NextResponse.json(LEGACY_GHL_DISABLED_BODY, { status: 501 });
  }

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

    const result = await syncGHLPipelineForClient(clientId);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
