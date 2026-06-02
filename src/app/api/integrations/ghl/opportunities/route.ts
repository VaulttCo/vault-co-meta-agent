/**
 * GET /api/integrations/ghl/opportunities?clientId=xxx
 * Read stored GHL opportunity snapshots from Supabase.
 * READ-ONLY — no GHL API calls. Returns what was last synced.
 *
 * SCOPE: LEGACY per-client GHL data (Revenue Dashboard only). Reads snapshots for
 * an arbitrary clientId. NOT used by Vault Core. Admin-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { readGHLOpportunitySnapshots, legacyGhlRoutesEnabled, LEGACY_GHL_DISABLED_BODY } from "@/lib/integrations/ghl/client";
import { resolveServerRole } from "@/lib/auth/server-role";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Kill switch — disabled by default so no arbitrary client GHL data is read.
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
