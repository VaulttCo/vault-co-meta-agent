/**
 * GoHighLevel Read-Only Integration Client
 *
 * READ-ONLY ONLY. This client can:
 * - Fetch contacts, opportunities, appointments, and pipelines
 * - Sync pipeline/appointment data to Supabase
 * - Test connection status
 *
 * This client CANNOT:
 * - Create or update contacts
 * - Create or move opportunities
 * - Book or cancel appointments
 * - Perform any write action on GoHighLevel
 *
 * All credentials are loaded from server-side environment variables only.
 * No API keys are ever exposed to the frontend.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveGHLCredentials } from "@/lib/integrations/credential-resolver";
import type { GHLDealPreview } from "@/lib/revenue/types";
import type { GHLOpportunitySnapshotRow } from "@/lib/supabase/types";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

// ─── Types ────────────────────────────────────────────────────

export interface GHLCredentials {
  apiKey: string;
  locationId: string;
}

export interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  dateAdded: string;
}

export interface GHLOpportunity {
  id: string;
  name: string;
  status: string;
  monetaryValue: number;
  pipelineId: string;
  pipelineStageId: string;
  assignedTo: string;
  contactId: string;
  // Phase 2C: date fields for billing-month filtering
  closedDate?: string | null;
  lastStageChangeAt?: string | null;
  updatedAt?: string | null;
}

export interface GHLClosedWonResult {
  deals: GHLDealPreview[];
  totalRevenue: number;
  dealCount: number;
  locationId: string;
  credentialSource: string;
  error?: string;
}

export interface GHLAppointment {
  id: string;
  title: string;
  status: string;
  startTime: string;
  endTime: string;
  contactId: string;
  calendarId: string;
}

export interface GHLSyncResult {
  success: boolean;
  clientId: string;
  contacts: number;
  opportunities: number;
  appointments: number;
  bookedAppointments: number;
  pipelineValue: number;
  closedRevenue: number;
  error?: string;
}

export interface GHLPipelineStage {
  id: string;
  name: string;
  position: number;
}

export interface GHLPipeline {
  id: string;
  name: string;
  stages: GHLPipelineStage[];
}

export interface GHLOpportunitySyncResult {
  success: boolean;
  clientId: string;
  locationId: string;
  upserted: number;
  error?: string;
}

// ─── Credential loader ────────────────────────────────────────

function getGHLCredentials(locationId?: string): GHLCredentials | null {
  const apiKey = process.env.GHL_API_KEY;
  const defaultLocationId = process.env.GHL_LOCATION_ID;

  if (!apiKey) return null;

  return {
    apiKey,
    locationId: locationId ?? defaultLocationId ?? "",
  };
}

// ─── Client ID → GHL Location ID resolver ────────────────────

async function getGHLLocationId(clientId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const { data: connRaw } = await supabase
      .from("integration_connections")
      .select("provider_account_id, metadata")
      .eq("client_id", clientId)
      .eq("provider", "ghl")
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = connRaw as any;

    if (conn?.provider_account_id) return conn.provider_account_id;

    // Fall back to clients table
    const { data: clientRaw } = await supabase
      .from("clients")
      .select("ghl_location_id")
      .eq("id", clientId)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = clientRaw as any;

    if (client?.ghl_location_id) return client.ghl_location_id;

    // Fall back to global env var (used when all clients share one location)
    return process.env.GHL_LOCATION_ID ?? null;
  } catch {
    // Last resort: global env var
    return process.env.GHL_LOCATION_ID ?? null;
  }
}

// ─── GHL API helpers ──────────────────────────────────────────

async function ghlGet(
  path: string,
  params: Record<string, string>,
  credentials: GHLCredentials
): Promise<Response> {
  const url = new URL(`${GHL_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
  });
}

// ─── Public functions ─────────────────────────────────────────

/**
 * Fetch Closed Won opportunities for a client within a billing month.
 * Filters by status === "won" and the billing month date range.
 * READ-ONLY: never writes to GHL.
 */
export async function getGHLClosedWonForMonth(
  clientId: string,
  billingMonth: string, // YYYY-MM-DD (first of month)
  pipelineId?: string | null
): Promise<GHLClosedWonResult> {
  const resolved = await resolveGHLCredentials(clientId);
  if (!resolved) {
    return { deals: [], totalRevenue: 0, dealCount: 0, locationId: "", credentialSource: "none", error: "GHL credentials not configured." };
  }
  const creds: GHLCredentials = { apiKey: resolved.apiKey, locationId: resolved.locationId };

  // Billing month date range
  const monthStart = new Date(billingMonth);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  monthEnd.setUTCMilliseconds(-1);

  try {
    const params: Record<string, string> = {
      location_id: creds.locationId,
      status: "won",
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
      limit: "100",
    };
    if (pipelineId) params.pipeline_id = pipelineId;

    const resp = await ghlGet("/opportunities/search", params, creds);
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({})) as Record<string, unknown>;
      const msg = typeof errData.message === "string" ? errData.message : resp.statusText;
      return { deals: [], totalRevenue: 0, dealCount: 0, locationId: creds.locationId, credentialSource: resolved.source, error: `GHL API error: ${msg}` };
    }

    const data = await resp.json() as { opportunities?: GHLOpportunity[] };
    const raw: GHLOpportunity[] = data.opportunities ?? [];

    // Filter won deals whose close/stage-change/update date falls in the billing month
    const wonInMonth = raw.filter((o) => {
      if (o.status !== "won") return false;
      const dateStr = o.closedDate ?? o.lastStageChangeAt ?? o.updatedAt;
      if (!dateStr) return true; // include if no date — can't exclude
      const d = new Date(dateStr);
      return d >= monthStart && d <= monthEnd;
    });

    const deals: GHLDealPreview[] = wonInMonth.map((o) => ({
      name: o.name,
      amount: o.monetaryValue ?? 0,
      status: o.status,
      closedDate: o.closedDate ?? o.lastStageChangeAt ?? null,
    }));

    const totalRevenue = deals.reduce((sum, d) => sum + d.amount, 0);

    return {
      deals,
      totalRevenue,
      dealCount: deals.length,
      locationId: creds.locationId,
      credentialSource: resolved.source,
    };
  } catch (err) {
    return {
      deals: [],
      totalRevenue: 0,
      dealCount: 0,
      locationId: creds.locationId,
      credentialSource: resolved.source,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Test whether GHL credentials are valid and the location is accessible.
 */
export async function testGHLConnection(clientId: string): Promise<{
  connected: boolean;
  locationId?: string;
  locationName?: string;
  credentialSource?: string;
  error?: string;
}> {
  const resolved = await resolveGHLCredentials(clientId);
  if (!resolved) {
    return { connected: false, error: "GHL credentials not configured. Add GHL_API_KEY to Vercel env vars or save per-client credentials in the Integrations tab." };
  }
  const creds: GHLCredentials = { apiKey: resolved.apiKey, locationId: resolved.locationId };

  try {
    const resp = await ghlGet(
      `/locations/${creds.locationId}`,
      {},
      creds
    );
    const data = await resp.json();

    if (!resp.ok || data.statusCode === 401) {
      return { connected: false, error: `GHL API error: ${data.message ?? resp.statusText}` };
    }

    return {
      connected: true,
      locationId: data.id ?? creds.locationId,
      locationName: data.name ?? data.business?.name ?? "GHL Location",
      credentialSource: resolved.source,
    };
  } catch (err) {
    return { connected: false, error: `Network error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Fetch contacts for a GHL location.
 */
export async function getGHLContacts(clientId: string): Promise<GHLContact[]> {
  const resolved = await resolveGHLCredentials(clientId);
  if (!resolved) return [];
  const creds: GHLCredentials = { apiKey: resolved.apiKey, locationId: resolved.locationId };

  try {
    const resp = await ghlGet(
      "/contacts/",
      { locationId: creds.locationId, limit: "100" },
      creds
    );
    const data = await resp.json();
    return data.contacts ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch opportunities for a GHL location.
 */
export async function getGHLOpportunities(clientId: string): Promise<GHLOpportunity[]> {
  const resolved = await resolveGHLCredentials(clientId);
  if (!resolved) return [];
  const creds: GHLCredentials = { apiKey: resolved.apiKey, locationId: resolved.locationId };

  try {
    const resp = await ghlGet(
      "/opportunities/search",
      { location_id: creds.locationId, limit: "100" },
      creds
    );
    const data = await resp.json();
    return data.opportunities ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch appointments for a GHL location.
 */
export async function getGHLAppointments(clientId: string): Promise<GHLAppointment[]> {
  const resolved = await resolveGHLCredentials(clientId);
  if (!resolved) return [];
  const creds: GHLCredentials = { apiKey: resolved.apiKey, locationId: resolved.locationId };

  try {
    const resp = await ghlGet(
      "/appointments/",
      { locationId: creds.locationId, limit: "100" },
      creds
    );
    const data = await resp.json();
    return data.appointments ?? [];
  } catch {
    return [];
  }
}

/**
 * Sync GHL pipeline and appointment data for a client and save to Supabase.
 * This is the main sync function called by the API route.
 *
 * READ-ONLY: only fetches and saves data. Never writes to GHL.
 */
export async function syncGHLPipelineForClient(clientId: string): Promise<GHLSyncResult> {
  const resolved = await resolveGHLCredentials(clientId);
  if (!resolved) {
    return {
      success: false,
      clientId,
      contacts: 0,
      opportunities: 0,
      appointments: 0,
      bookedAppointments: 0,
      pipelineValue: 0,
      closedRevenue: 0,
      error: "GHL credentials not configured. Add GHL_API_KEY to Vercel env vars or save per-client credentials in the Integrations tab.",
    };
  }
  const creds: GHLCredentials = { apiKey: resolved.apiKey, locationId: resolved.locationId };

  try {
    const [contacts, opportunities, appointments] = await Promise.all([
      getGHLContacts(clientId),
      getGHLOpportunities(clientId),
      getGHLAppointments(clientId),
    ]);

    const bookedAppointments = appointments.filter(
      (a) => a.status === "booked" || a.status === "confirmed"
    ).length;

    const pipelineValue = opportunities.reduce(
      (sum, o) => sum + (o.monetaryValue ?? 0),
      0
    );

    const closedRevenue = opportunities
      .filter((o) => o.status === "won")
      .reduce((sum, o) => sum + (o.monetaryValue ?? 0), 0);

    const supabase = getSupabaseServerClient();

    if (supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("ghl_pipeline_snapshots") as any).upsert(
        {
          client_id: clientId,
          ghl_location_id: creds.locationId,
          leads: contacts.length,
          contacts: contacts.length,
          appointments: appointments.length,
          booked_appointments: bookedAppointments,
          show_rate: appointments.length > 0 ? (bookedAppointments / appointments.length) * 100 : null,
          opportunities: opportunities.length,
          pipeline_value: pipelineValue,
          closed_revenue: closedRevenue,
          raw_payload: {
            contacts_count: contacts.length,
            opportunities_count: opportunities.length,
            appointments_count: appointments.length,
          },
          synced_at: new Date().toISOString(),
        },
        { onConflict: "client_id,ghl_location_id" }
      );

      // Update integration_connections
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("integration_connections") as any).upsert(
        {
          client_id: clientId,
          provider: "ghl",
          provider_account_id: creds.locationId,
          connection_status: "connected",
          last_synced_at: new Date().toISOString(),
          metadata: {
            contacts,
            opportunities: opportunities.length,
            appointments: appointments.length,
            booked_appointments: bookedAppointments,
            pipeline_value: pipelineValue,
            closed_revenue: closedRevenue,
          },
        },
        { onConflict: "client_id,provider" }
      );
    }

    return {
      success: true,
      clientId,
      contacts: contacts.length,
      opportunities: opportunities.length,
      appointments: appointments.length,
      bookedAppointments,
      pipelineValue,
      closedRevenue,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("integration_connections") as any).upsert(
          {
            client_id: clientId,
            provider: "ghl",
            provider_account_id: creds.locationId,
            connection_status: "sync_failed",
            metadata: { error: errorMsg },
          },
          { onConflict: "client_id,provider" }
        );
      }
    } catch { /* ignore */ }

    return {
      success: false,
      clientId,
      contacts: 0,
      opportunities: 0,
      appointments: 0,
      bookedAppointments: 0,
      pipelineValue: 0,
      closedRevenue: 0,
      error: errorMsg,
    };
  }
}

// ─── GHL Pipeline stages ──────────────────────────────────────

/**
 * Fetch all pipelines and their stages for a GHL location.
 * Returns a map of stageId → stageName for enriching opportunity snapshots.
 * READ-ONLY: never writes to GHL.
 */
export async function getGHLPipelineStageMap(
  clientId: string
): Promise<Map<string, string>> {
  const resolved = await resolveGHLCredentials(clientId);
  if (!resolved) return new Map();
  const creds: GHLCredentials = { apiKey: resolved.apiKey, locationId: resolved.locationId };

  try {
    const resp = await ghlGet(
      "/opportunities/pipelines",
      { locationId: creds.locationId },
      creds
    );
    if (!resp.ok) return new Map();
    const data = await resp.json() as { pipelines?: GHLPipeline[] };
    const pipelines: GHLPipeline[] = data.pipelines ?? [];
    const stageMap = new Map<string, string>();
    for (const pipeline of pipelines) {
      for (const stage of pipeline.stages ?? []) {
        stageMap.set(stage.id, stage.name);
      }
    }
    return stageMap;
  } catch {
    return new Map();
  }
}

// ─── Per-opportunity snapshot sync ───────────────────────────

/**
 * Sync GHL opportunities for a client and upsert per-opportunity snapshot rows.
 * READ-ONLY from GHL — only writes to Supabase `ghl_opportunity_snapshots` table.
 * Never creates, updates, or moves opportunities in GHL.
 */
export async function syncGHLOpportunitiesForClient(
  clientId: string
): Promise<GHLOpportunitySyncResult> {
  const resolved = await resolveGHLCredentials(clientId);
  if (!resolved) {
    return {
      success: false,
      clientId,
      locationId: "",
      upserted: 0,
      error: "GHL credentials not configured. Add GHL_API_KEY to env vars or save per-client credentials.",
    };
  }
  const creds: GHLCredentials = { apiKey: resolved.apiKey, locationId: resolved.locationId };

  try {
    // Fetch opportunities and pipeline stage map in parallel (read-only GHL calls)
    const [rawOpportunities, stageMap] = await Promise.all([
      (async () => {
        const resp = await ghlGet(
          "/opportunities/search",
          { location_id: creds.locationId, limit: "100" },
          creds
        );
        if (!resp.ok) return [];
        const data = await resp.json() as { opportunities?: Record<string, unknown>[] };
        return data.opportunities ?? [];
      })(),
      getGHLPipelineStageMap(clientId),
    ]);

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return { success: false, clientId, locationId: creds.locationId, upserted: 0, error: "Supabase not available." };
    }

    const now = new Date().toISOString();
    const rows: Omit<GHLOpportunitySnapshotRow, "id" | "created_at">[] = rawOpportunities.map((o) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opp = o as any;
      const stageName = opp.pipelineStageId ? (stageMap.get(opp.pipelineStageId) ?? null) : null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contact = opp.contact as any | null;
      return {
        client_id: clientId,
        ghl_location_id: creds.locationId,
        opportunity_id: String(opp.id ?? ""),
        contact_id: opp.contactId ? String(opp.contactId) : null,
        pipeline_id: opp.pipelineId ? String(opp.pipelineId) : null,
        pipeline_stage_id: opp.pipelineStageId ? String(opp.pipelineStageId) : null,
        pipeline_stage_name: stageName,
        opportunity_name: opp.name ? String(opp.name) : null,
        contact_name: contact?.name ? String(contact.name) : null,
        status: opp.status ? String(opp.status) : null,
        monetary_value: typeof opp.monetaryValue === "number" ? opp.monetaryValue : null,
        source: opp.source ? String(opp.source) : null,
        assigned_user: opp.assignedTo ? String(opp.assignedTo) : null,
        created_at_ghl: opp.createdAt ? String(opp.createdAt) : null,
        updated_at_ghl: opp.updatedAt ? String(opp.updatedAt) : null,
        last_activity_at: opp.lastStageChangeAt
          ? String(opp.lastStageChangeAt)
          : opp.updatedAt
          ? String(opp.updatedAt)
          : null,
        appointment_status: opp.calendarBookingStatus
          ? String(opp.calendarBookingStatus)
          : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        raw_payload: o as unknown as any,
        synced_at: now,
      };
    });

    if (rows.length === 0) {
      return { success: true, clientId, locationId: creds.locationId, upserted: 0 };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase.from("ghl_opportunity_snapshots") as any).upsert(
      rows,
      { onConflict: "client_id,opportunity_id" }
    );

    if (upsertError) {
      return {
        success: false,
        clientId,
        locationId: creds.locationId,
        upserted: 0,
        error: `Supabase upsert error: ${upsertError.message}`,
      };
    }

    // Update integration_connections last_synced_at
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("integration_connections") as any).upsert(
      {
        client_id: clientId,
        provider: "ghl",
        provider_account_id: creds.locationId,
        connection_status: "connected",
        last_synced_at: now,
      },
      { onConflict: "client_id,provider" }
    );

    return { success: true, clientId, locationId: creds.locationId, upserted: rows.length };
  } catch (err) {
    return {
      success: false,
      clientId,
      locationId: creds.locationId,
      upserted: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Read GHL opportunity snapshots for a client from Supabase.
 * Used by the GET /api/integrations/ghl/opportunities route and Veronica.
 * READ-ONLY from Supabase — no GHL calls.
 */
export async function readGHLOpportunitySnapshots(
  clientId: string
): Promise<GHLOpportunitySnapshotRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("ghl_opportunity_snapshots") as any)
      .select(
        "id,client_id,ghl_location_id,opportunity_id,contact_id,pipeline_id,pipeline_stage_id,pipeline_stage_name,opportunity_name,contact_name,status,monetary_value,source,assigned_user,created_at_ghl,updated_at_ghl,last_activity_at,appointment_status,synced_at,created_at"
      )
      .eq("client_id", clientId)
      .order("synced_at", { ascending: false })
      .limit(200);
    return (data ?? []) as GHLOpportunitySnapshotRow[];
  } catch {
    return [];
  }
}
