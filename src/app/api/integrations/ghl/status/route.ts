/**
 * GET /api/integrations/ghl/status?clientId=xxx
 * Get GoHighLevel connection status and latest synced data for a client.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
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
      .eq("provider", "ghl")
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = connRaw as any;

    if (!conn) {
      return NextResponse.json({ connected: false, hasCredentials: !!process.env.GHL_API_KEY });
    }

    // Get latest pipeline snapshot
    const { data: snapshotRaw } = await supabase
      .from("ghl_pipeline_snapshots")
      .select("*")
      .eq("client_id", clientId)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapshot = snapshotRaw as any;

    return NextResponse.json({
      connected: conn.connection_status === "connected",
      connectionStatus: conn.connection_status,
      locationId: conn.provider_account_id,
      lastSyncedAt: conn.last_synced_at,
      hasCredentials: !!process.env.GHL_API_KEY,
      snapshot: snapshot ?? null,
      metadata: conn.metadata,
    });
  } catch (err) {
    return NextResponse.json(
      { connected: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
