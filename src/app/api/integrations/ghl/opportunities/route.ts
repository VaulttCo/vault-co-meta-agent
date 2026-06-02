/**
 * GET /api/integrations/ghl/opportunities?clientId=xxx
 * Read stored GHL opportunity snapshots from Supabase.
 * READ-ONLY — no GHL API calls. Returns what was last synced.
 *
 * SCOPE: LEGACY per-client GHL data (Revenue Dashboard only). Reads snapshots for
 * an arbitrary clientId. NOT used by Vault Core. Admin-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { readGHLOpportunitySnapshots, clientGhlTrackingEnabled, CLIENT_GHL_DISABLED_BODY } from "@/lib/integrations/ghl/client";
import { resolveServerRole } from "@/lib/auth/server-role";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  try {
    const snapshots = await readGHLOpportunitySnapshots(clientId);
    const lastSyncedAt = snapshots.length > 0 ? snapshots[0].synced_at : null;
    return NextResponse.json({ snapshots, lastSyncedAt, total: snapshots.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
