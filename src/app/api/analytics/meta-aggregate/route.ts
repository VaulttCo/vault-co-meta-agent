/**
 * GET /api/analytics/meta-aggregate
 * Returns aggregated Meta Ads performance data across all clients.
 */
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ connected: false, error: "Supabase not available" });
    }

    // Check if any Meta connections exist
    const { data: connections } = await supabase
      .from("integration_connections")
      .select("client_id, provider_account_id, last_synced_at")
      .eq("provider", "meta")
      .eq("connection_status", "connected");

    if (!connections || connections.length === 0) {
      return NextResponse.json({ connected: false, clientsWithData: 0 });
    }

    // Get all campaign snapshots
    const { data: snapshotsRaw } = await supabase
      .from("meta_campaign_snapshots")
      .select("*, clients(name)")
      .order("synced_at", { ascending: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapshots = snapshotsRaw as any[] | null;

    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json({ connected: true, clientsWithData: 0, totalSpend: 0, totalLeads: 0, totalImpressions: 0, totalClicks: 0, avgCpl: null, campaigns: [], lastSyncedAt: null });
    }

    // Aggregate totals
    let totalSpend = 0;
    let totalLeads = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    const clientIds = new Set<string>();
    let lastSyncedAt: string | null = null;

    const campaigns = snapshots.map((s) => {
      const spend = Number(s.spend) || 0;
      const leads = Number(s.leads) || 0;
      const impressions = Number(s.impressions) || 0;
      const clicks = Number(s.clicks) || 0;

      totalSpend += spend;
      totalLeads += leads;
      totalImpressions += impressions;
      totalClicks += clicks;
      clientIds.add(s.client_id);

      if (!lastSyncedAt || (s.synced_at && s.synced_at > lastSyncedAt)) {
        lastSyncedAt = s.synced_at;
      }

      return {
        clientId: s.client_id,
        clientName: (s.clients as { name?: string } | null)?.name ?? s.client_id,
        campaignName: s.campaign_name ?? "Campaign",
        spend,
        leads,
        impressions,
        clicks,
        cpl: leads > 0 ? spend / leads : null,
      };
    });

    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : null;

    return NextResponse.json({
      connected: true,
      totalSpend,
      totalLeads,
      totalImpressions,
      totalClicks,
      avgCpl,
      clientsWithData: clientIds.size,
      lastSyncedAt,
      campaigns,
    });
  } catch (err) {
    return NextResponse.json(
      { connected: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
