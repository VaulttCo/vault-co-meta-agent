/**
 * GET /api/integrations/meta/status?clientId=xxx
 * Get Meta Ads connection status and latest synced data for a client.
 * Requires a valid Supabase user session — returns 401 if unauthenticated.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // ── Auth guard (before any parameter validation) ──────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Exposes provider account ID, metadata, and global credential-presence —
  // restrict to integration managers (admin or canConnectIntegrations), not
  // broad canViewAnalytics.
  if (!(auth.role === "admin" || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // ─────────────────────────────────────────────────────────────────────────

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  try {

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ connected: false, error: "Supabase not available" });
    }

    // Get connection record
    const { data: connRaw } = await supabase
      .from("integration_connections")
      .select("*")
      .eq("client_id", clientId)
      .eq("provider", "meta")
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = connRaw as any;

    if (!conn) {
      return NextResponse.json({ connected: false, hasCredentials: !!process.env.META_ACCESS_TOKEN });
    }

    // Get latest campaign snapshots
    const { data: snapshotsRaw } = await supabase
      .from("meta_campaign_snapshots")
      .select("*")
      .eq("client_id", clientId)
      .order("synced_at", { ascending: false })
      .limit(20)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapshots = snapshotsRaw as any;

    // Aggregate totals
    const totals = (snapshots ?? []).reduce(
      (acc: { spend: number; leads: number; impressions: number; clicks: number }, s: Record<string, unknown>) => ({
        spend: acc.spend + (Number(s.spend) || 0),
        leads: acc.leads + (Number(s.leads) || 0),
        impressions: acc.impressions + (Number(s.impressions) || 0),
        clicks: acc.clicks + (Number(s.clicks) || 0),
      }),
      { spend: 0, leads: 0, impressions: 0, clicks: 0 }
    );

    const cpl = totals.leads > 0 ? totals.spend / totals.leads : null;

    return NextResponse.json({
      connected: conn.connection_status === "connected",
      connectionStatus: conn.connection_status,
      accountId: conn.provider_account_id,
      lastSyncedAt: conn.last_synced_at,
      hasCredentials: !!process.env.META_ACCESS_TOKEN,
      campaigns: snapshots ?? [],
      totals: { ...totals, cpl },
      metadata: conn.metadata,
    });
  } catch (err) {
    return NextResponse.json(
      { connected: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
