/**
 * GET /api/analytics/ghl-aggregate
 * Returns aggregated GoHighLevel pipeline data across all clients.
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

    // Check if any GHL connections exist
    const { data: connections } = await supabase
      .from("integration_connections")
      .select("client_id, provider_account_id, last_synced_at")
      .eq("provider", "ghl")
      .eq("connection_status", "connected");

    if (!connections || connections.length === 0) {
      return NextResponse.json({ connected: false, clientsWithData: 0 });
    }

    // Get all GHL pipeline snapshots
    const { data: snapshotsRaw } = await supabase
      .from("ghl_pipeline_snapshots")
      .select("*")
      .order("synced_at", { ascending: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapshots = snapshotsRaw as any[] | null;

    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json({ connected: true, clientsWithData: 0, totalContacts: 0, totalAppointments: 0, totalBooked: 0, totalPipelineValue: 0, totalClosedRevenue: 0, lastSyncedAt: null });
    }

    let totalContacts = 0;
    let totalAppointments = 0;
    let totalBooked = 0;
    let totalPipelineValue = 0;
    let totalClosedRevenue = 0;
    const clientIds = new Set<string>();
    let lastSyncedAt: string | null = null;

    for (const s of snapshots) {
      totalContacts += Number(s.contacts) || 0;
      totalAppointments += Number(s.appointments) || 0;
      totalBooked += Number(s.booked_appointments) || 0;
      totalPipelineValue += Number(s.pipeline_value) || 0;
      totalClosedRevenue += Number(s.closed_revenue) || 0;
      clientIds.add(s.client_id);

      if (!lastSyncedAt || (s.synced_at && s.synced_at > lastSyncedAt)) {
        lastSyncedAt = s.synced_at;
      }
    }

    return NextResponse.json({
      connected: true,
      totalContacts,
      totalAppointments,
      totalBooked,
      totalPipelineValue,
      totalClosedRevenue,
      clientsWithData: clientIds.size,
      lastSyncedAt,
    });
  } catch (err) {
    return NextResponse.json(
      { connected: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
