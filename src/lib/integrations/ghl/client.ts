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

    return client?.ghl_location_id ?? null;
  } catch {
    return null;
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
 * Test whether GHL credentials are valid and the location is accessible.
 */
export async function testGHLConnection(clientId: string): Promise<{
  connected: boolean;
  locationId?: string;
  locationName?: string;
  error?: string;
}> {
  const locationId = await getGHLLocationId(clientId);
  const creds = getGHLCredentials(locationId ?? undefined);

  if (!creds) {
    return { connected: false, error: "GHL_API_KEY not configured in environment variables." };
  }

  if (!creds.locationId) {
    return { connected: false, error: "No GHL Location ID found for this client. Add it in the client Integrations tab." };
  }

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
    };
  } catch (err) {
    return { connected: false, error: `Network error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Fetch contacts for a GHL location.
 */
export async function getGHLContacts(clientId: string): Promise<GHLContact[]> {
  const locationId = await getGHLLocationId(clientId);
  const creds = getGHLCredentials(locationId ?? undefined);
  if (!creds?.locationId) return [];

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
  const locationId = await getGHLLocationId(clientId);
  const creds = getGHLCredentials(locationId ?? undefined);
  if (!creds?.locationId) return [];

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
  const locationId = await getGHLLocationId(clientId);
  const creds = getGHLCredentials(locationId ?? undefined);
  if (!creds?.locationId) return [];

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
  const locationId = await getGHLLocationId(clientId);
  const creds = getGHLCredentials(locationId ?? undefined);

  if (!creds) {
    return {
      success: false,
      clientId,
      contacts: 0,
      opportunities: 0,
      appointments: 0,
      bookedAppointments: 0,
      pipelineValue: 0,
      closedRevenue: 0,
      error: "GHL_API_KEY not configured. Add GHL_API_KEY and GHL_LOCATION_ID to Vercel environment variables.",
    };
  }

  if (!creds.locationId) {
    return {
      success: false,
      clientId,
      contacts: 0,
      opportunities: 0,
      appointments: 0,
      bookedAppointments: 0,
      pipelineValue: 0,
      closedRevenue: 0,
      error: "No GHL Location ID found for this client.",
    };
  }

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
