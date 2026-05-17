/**
 * GET /api/integrations/meta/snapshots?clientId=...
 * Returns the latest synced Meta campaign snapshots for a client.
 * READ-ONLY. Never modifies Meta or any external system.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import type { MetaCampaignSnapshotRow } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ snapshots: [], aggregated: null });
    }

    const { data, error } = await supabase
      .from("meta_campaign_snapshots")
      .select("id,client_id,meta_account_id,campaign_id,campaign_name,status,objective,spend,impressions,clicks,ctr,cpc,cpm,leads,cpl,date_start,date_end,synced_at")
      .eq("client_id", clientId)
      .order("synced_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const snapshots = (data ?? []) as MetaCampaignSnapshotRow[];

    if (snapshots.length === 0) {
      return NextResponse.json({ snapshots: [], aggregated: null });
    }

    // Aggregate totals across all synced campaigns
    let totalSpend = 0;
    let totalLeads = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let lastSyncedAt: string | null = null;
    let dateStart: string | null = null;
    let dateEnd: string | null = null;

    for (const s of snapshots) {
      totalSpend += Number(s.spend ?? 0);
      totalLeads += Number(s.leads ?? 0);
      totalImpressions += Number(s.impressions ?? 0);
      totalClicks += Number(s.clicks ?? 0);
      if (!lastSyncedAt || s.synced_at > lastSyncedAt) lastSyncedAt = s.synced_at;
      if (!dateStart || s.date_start < dateStart) dateStart = s.date_start;
      if (!dateEnd || s.date_end > dateEnd) dateEnd = s.date_end;
    }

    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : null;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null;
    const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : null;

    return NextResponse.json({
      snapshots,
      aggregated: {
        totalSpend,
        totalLeads,
        totalImpressions,
        totalClicks,
        avgCpl,
        avgCtr,
        avgCpm,
        lastSyncedAt,
        dateRange: dateStart && dateEnd ? { since: dateStart, until: dateEnd } : null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
