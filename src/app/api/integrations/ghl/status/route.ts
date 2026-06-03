/**
 * GET /api/integrations/ghl/status?clientId=xxx
 * Get GoHighLevel connection status and latest synced data for a client.
 * Requires a valid Supabase user session — returns 401 if unauthenticated.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { clientGhlTrackingEnabled, CLIENT_GHL_DISABLED_BODY, sanitizeGhlStatusMetadata } from "@/lib/integrations/ghl/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Feature flag — per-client GHL connection data (integration_connections +
  // snapshots) for client tracking. Enabled by default; set
  // CLIENT_GHL_TRACKING_ENABLED=false to disable (501). Not used by Vault Core.
  if (!clientGhlTrackingEnabled()) {
    return NextResponse.json(CLIENT_GHL_DISABLED_BODY, { status: 501 });
  }

  // ── Auth guard (before any parameter validation) ──────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Exposes provider account/location IDs, metadata, and global credential-
  // presence — restrict to integration managers (admin or canConnectIntegrations),
  // not broad canViewAnalytics.
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
      .eq("provider", "ghl")
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = connRaw as any;

    if (!conn) {
      return NextResponse.json({ connected: false, hasCredentials: !!process.env.GHL_API_KEY });
    }

    // Get latest pipeline snapshot — explicit NON-PII aggregate columns only.
    // Never select `*`/`raw_payload`: that JSONB can hold raw provider payloads
    // (legacy/manual rows), which would bypass the metadata PII whitelist.
    const { data: snapshotRaw } = await supabase
      .from("ghl_pipeline_snapshots")
      .select(
        "leads, contacts, appointments, booked_appointments, show_rate, opportunities, pipeline_value, closed_revenue, synced_at"
      )
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
      // Whitelisted, non-PII aggregates only — never the raw metadata blob, which
      // may contain full contact PII from legacy sync rows.
      metadata: sanitizeGhlStatusMetadata(conn.metadata),
    });
  } catch (err) {
    return NextResponse.json(
      { connected: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
