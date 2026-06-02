/**
 * POST /api/integrations/ghl/sync-opportunities
 * Read GHL opportunities and upsert per-opportunity snapshots to Supabase.
 * READ-ONLY from GHL — never modifies contacts, opportunities, or pipelines in GHL.
 *
 * SCOPE: LEGACY per-client GHL integration used ONLY by the Revenue Dashboard. It
 * reads a client's own GHL sub-account by clientId. It is NOT used by Vault Core
 * (Vault Core uses src/lib/core/integrations/ghl/client.ts, env-var-only, scoped
 * to the two Vault Co-owned locations). Restricted to admins because it can read
 * arbitrary client sub-accounts.
 */
import { NextRequest, NextResponse } from "next/server";
import { syncGHLOpportunitiesForClient, clientGhlTrackingEnabled, CLIENT_GHL_DISABLED_BODY } from "@/lib/integrations/ghl/client";
import { resolveServerRole } from "@/lib/auth/server-role";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Feature flag — per-client GHL tracking (admin-only, GET-only); disabled only if CLIENT_GHL_TRACKING_ENABLED=false.
  if (!clientGhlTrackingEnabled()) {
    return NextResponse.json(CLIENT_GHL_DISABLED_BODY, { status: 501 });
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

    const result = await syncGHLOpportunitiesForClient(clientId);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
