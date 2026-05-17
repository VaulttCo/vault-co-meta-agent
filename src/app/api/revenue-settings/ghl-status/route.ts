// Server-side only — safe GHL connection status metadata per client.
//
// GET ?clientIds=id1,id2,...
//   Admin or canViewReports. Returns safe metadata only — no API keys, no
//   encrypted data, no secrets. Safe to send to the frontend.
//
// Checks GHL connection availability in priority order:
//   1. client_revenue_settings.ghl_location_id / ghl_pipeline_id
//   2. clients.ghl_location_id / ghl_pipeline_id
//   3. integration_connections (provider='ghl', connection_status='connected')
//   4. client_integration_credentials (existence only — no decryption)
//   5. Global env vars (GHL_API_KEY, GHL_LOCATION_ID)
//   6. missing

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type GHLConnectionSource =
  | "revenue_settings"
  | "client_profile"
  | "integration_connection"
  | "encrypted_credentials"
  | "global_env"
  | "missing";

export interface GHLConnectionStatus {
  isGhlConnected: boolean;        // has usable apiKey + locationId from any source
  ghlLocationIdPresent: boolean;  // a locationId is available from any source
  ghlPipelineIdPresent: boolean;  // a pipelineId is available
  connectionSource: GHLConnectionSource;
  missingReason: string | null;
}

export async function GET(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(auth.role, "canViewReports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = req.nextUrl.searchParams.get("clientIds") ?? "";
  const clientIds = raw.split(",").map((s) => s.trim()).filter(Boolean);

  if (clientIds.length === 0) {
    return NextResponse.json({ ghlStatus: {} });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseServerClient() as any;

  // ── Batch fetch from all relevant tables ──────────────────────────────────
  const [
    revenueSettingsResult,
    clientsResult,
    integrationConnectionsResult,
    credentialsResult,
  ] = await Promise.all([
    supabase
      ? supabase
          .from("client_revenue_settings")
          .select("client_id, ghl_location_id, ghl_pipeline_id")
          .in("client_id", clientIds)
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase
          .from("clients")
          .select("id, ghl_location_id, ghl_pipeline_id")
          .in("id", clientIds)
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase
          .from("integration_connections")
          .select("client_id, provider_account_id, connection_status")
          .in("client_id", clientIds)
          .eq("provider", "ghl")
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase
          .from("client_integration_credentials")
          .select("client_id, account_id")
          .in("client_id", clientIds)
          .eq("provider", "ghl")
          .not("encrypted_data", "is", null)
      : Promise.resolve({ data: [] }),
  ]);

  // ── Build lookup maps ─────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revenueSettingsMap = new Map<string, { ghlLocationId: string | null; ghlPipelineId: string | null }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (revenueSettingsResult?.data ?? []) as any[]) {
    revenueSettingsMap.set(row.client_id, {
      ghlLocationId: row.ghl_location_id ?? null,
      ghlPipelineId: row.ghl_pipeline_id ?? null,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientsMap = new Map<string, { ghlLocationId: string | null; ghlPipelineId: string | null }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (clientsResult?.data ?? []) as any[]) {
    const loc = row.ghl_location_id;
    const pip = row.ghl_pipeline_id;
    // Ignore placeholder strings that aren't real IDs
    const isRealId = (v: string | null) => v && v.trim() && !v.startsWith("Pending") && !v.startsWith("GHL-") && !v.startsWith("PIPE-") && v.length > 4;
    clientsMap.set(row.id, {
      ghlLocationId: isRealId(loc) ? loc : null,
      ghlPipelineId: isRealId(pip) ? pip : null,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const integrationConnMap = new Map<string, { locationId: string | null; status: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (integrationConnectionsResult?.data ?? []) as any[]) {
    integrationConnMap.set(row.client_id, {
      locationId: row.provider_account_id ?? null,
      status: row.connection_status ?? "",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encryptedCredsSet = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (credentialsResult?.data ?? []) as any[]) {
    encryptedCredsSet.add(row.client_id);
  }

  // ── Global env ────────────────────────────────────────────────────────────
  const globalApiKeyPresent  = Boolean(process.env.GHL_API_KEY);
  const globalLocationId     = process.env.GHL_LOCATION_ID ?? null;

  // ── Build result per clientId ─────────────────────────────────────────────
  const ghlStatus: Record<string, GHLConnectionStatus> = {};

  for (const clientId of clientIds) {
    const rs  = revenueSettingsMap.get(clientId);
    const cl  = clientsMap.get(clientId);
    const ic  = integrationConnMap.get(clientId);
    const enc = encryptedCredsSet.has(clientId);

    // Determine locationId availability and source
    let ghlLocationIdPresent = false;
    let ghlPipelineIdPresent = false;
    let connectionSource: GHLConnectionSource = "missing";
    let hasApiKey = false;

    if (rs?.ghlLocationId) {
      ghlLocationIdPresent = true;
      connectionSource = "revenue_settings";
    } else if (cl?.ghlLocationId) {
      ghlLocationIdPresent = true;
      connectionSource = "client_profile";
    } else if (ic?.locationId && (ic.status === "connected" || ic.status === "sync_failed")) {
      ghlLocationIdPresent = true;
      connectionSource = "integration_connection";
    } else if (enc) {
      // Encrypted credentials include locationId inside the blob
      ghlLocationIdPresent = true;
      connectionSource = "encrypted_credentials";
    } else if (globalApiKeyPresent && globalLocationId) {
      ghlLocationIdPresent = true;
      connectionSource = "global_env";
    } else if (globalApiKeyPresent) {
      // Has API key but no locationId anywhere
      connectionSource = "global_env";
    }

    // Pipeline ID availability
    if (rs?.ghlPipelineId) {
      ghlPipelineIdPresent = true;
    } else if (cl?.ghlPipelineId) {
      ghlPipelineIdPresent = true;
    }

    // API key availability (needed to make actual GHL API calls)
    hasApiKey = enc || globalApiKeyPresent;

    const isGhlConnected = hasApiKey && ghlLocationIdPresent;

    // Compute missingReason
    let missingReason: string | null = null;
    if (!hasApiKey) {
      missingReason = "No GHL API key configured. Add GHL_API_KEY to environment variables or save per-client GHL credentials in Settings.";
    } else if (!ghlLocationIdPresent) {
      missingReason = "GHL Location ID not found. Set it in Revenue Settings or the client's Settings tab.";
    } else if (!ghlPipelineIdPresent) {
      missingReason = "GHL Pipeline ID not set. Add it in Revenue Settings to enable GHL preview.";
    }

    ghlStatus[clientId] = {
      isGhlConnected,
      ghlLocationIdPresent,
      ghlPipelineIdPresent,
      connectionSource,
      missingReason,
    };
  }

  return NextResponse.json({ ghlStatus });
}
