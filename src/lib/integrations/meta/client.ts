/**
 * Meta Ads Read-Only Integration Client
 *
 * READ-ONLY ONLY. This client can:
 * - Fetch campaigns, ad sets, ads, and insights
 * - Sync performance data to Supabase
 * - Test connection status
 *
 * This client CANNOT:
 * - Create campaigns, ad sets, or ads
 * - Publish, pause, or activate campaigns
 * - Change budgets or bids
 * - Perform any write action on Meta
 *
 * All credentials are loaded from server-side environment variables only.
 * No API keys are ever exposed to the frontend.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveMetaCredentials } from "@/lib/integrations/credential-resolver";

const META_API_VERSION = "v19.0";
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// ─── Types ────────────────────────────────────────────────────

export interface MetaCredentials {
  accessToken: string;
  appId?: string;
  appSecret?: string;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  effective_status: string;
}

export interface MetaInsights {
  campaign_id: string;
  campaign_name: string;
  status: string;
  objective: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm: string;
  actions?: Array<{ action_type: string; value: string }>;
  date_start: string;
  date_stop: string;
}

export interface MetaSyncResult {
  success: boolean;
  clientId: string;
  campaignsSynced: number;
  totalSpend: number;
  totalLeads: number;
  totalImpressions: number;
  totalClicks: number;
  error?: string;
  mockMode?: boolean;
}

// ─── Credential loader ────────────────────────────────────────

function getMetaCredentials(): MetaCredentials | null {
  const accessToken = process.env.META_ACCESS_TOKEN;
  // APP_ID and APP_SECRET are optional — only needed for server-to-server token validation.
  // A user access token generated from the Marketing API Tools page works with just the token.
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!accessToken) {
    return null;
  }

  return { accessToken, appId, appSecret };
}

// ─── Client ID → Meta Account ID resolver ────────────────────

async function getMetaAccountId(clientId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    // First check integration_connections
    const { data: connRaw } = await supabase
      .from("integration_connections")
      .select("provider_account_id, metadata")
      .eq("client_id", clientId)
      .eq("provider", "meta")
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = connRaw as any;

    if (conn?.provider_account_id) return conn.provider_account_id;

    // Fall back to clients table
    const { data: clientRaw } = await supabase
      .from("clients")
      .select("meta_account_id")
      .eq("id", clientId)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = clientRaw as any;

    if (client?.meta_account_id) return client.meta_account_id;

    // Fall back to global env var (used when all clients share one ad account)
    return process.env.META_AD_ACCOUNT_ID ?? null;
  } catch {
    // Last resort: global env var
    return process.env.META_AD_ACCOUNT_ID ?? null;
  }
}

// ─── Meta API helpers ─────────────────────────────────────────

async function metaGet(
  path: string,
  params: Record<string, string>,
  credentials: MetaCredentials
): Promise<Response> {
  // SECURITY: the access token is sent in the Authorization header, never as an
  // `access_token` query param — query strings leak through logs, proxies, and
  // error telemetry. Only non-secret params go in the URL. (Graph API accepts a
  // bearer token in the Authorization header.)
  const url = new URL(`${META_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${credentials.accessToken}` },
  });
}

// ─── Public functions ─────────────────────────────────────────

/**
 * Test whether Meta credentials are valid and the ad account is accessible.
 */
export async function testMetaConnection(clientId: string): Promise<{
  connected: boolean;
  accountId?: string;
  accountName?: string;
  credentialSource?: string;
  error?: string;
}> {
  const resolved = await resolveMetaCredentials(clientId);
  if (!resolved) {
    return { connected: false, error: "Meta credentials not configured. Add META_ACCESS_TOKEN to Vercel env vars or save per-client credentials in the Integrations tab." };
  }

  const creds = { accessToken: resolved.accessToken, appId: resolved.appId, appSecret: resolved.appSecret };
  const accountId = resolved.adAccountId;

  try {
    const resp = await metaGet(
      `/act_${accountId}`,
      { fields: "id,name,account_status,currency" },
      creds
    );
    const data = await resp.json();

    if (data.error) {
      return { connected: false, error: `Meta API error: ${data.error.message}` };
    }

    return {
      connected: true,
      accountId: data.id,
      accountName: data.name,
      credentialSource: resolved.source,
    };
  } catch (err) {
    return { connected: false, error: `Network error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Fetch all campaigns for a client's Meta ad account.
 */
export async function getMetaCampaigns(clientId: string): Promise<MetaCampaign[]> {
  const resolved = await resolveMetaCredentials(clientId);
  if (!resolved) return [];
  const creds = { accessToken: resolved.accessToken, appId: resolved.appId, appSecret: resolved.appSecret };
  const accountId = resolved.adAccountId;

  try {
    const resp = await metaGet(
      `/act_${accountId}/campaigns`,
      { fields: "id,name,status,objective,effective_status", limit: "100" },
      creds
    );
    const data = await resp.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch ad sets for a client's Meta ad account.
 */
export async function getMetaAdSets(clientId: string): Promise<unknown[]> {
  const resolved = await resolveMetaCredentials(clientId);
  if (!resolved) return [];
  const creds = { accessToken: resolved.accessToken, appId: resolved.appId, appSecret: resolved.appSecret };
  const accountId = resolved.adAccountId;

  try {
    const resp = await metaGet(
      `/act_${accountId}/adsets`,
      { fields: "id,name,status,campaign_id,daily_budget,lifetime_budget", limit: "100" },
      creds
    );
    const data = await resp.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch ads for a client's Meta ad account.
 */
export async function getMetaAds(clientId: string): Promise<unknown[]> {
  const resolved = await resolveMetaCredentials(clientId);
  if (!resolved) return [];
  const creds = { accessToken: resolved.accessToken, appId: resolved.appId, appSecret: resolved.appSecret };
  const accountId = resolved.adAccountId;

  try {
    const resp = await metaGet(
      `/act_${accountId}/ads`,
      { fields: "id,name,status,adset_id,campaign_id,effective_status", limit: "100" },
      creds
    );
    const data = await resp.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch campaign insights (performance metrics) for a date range.
 */
export async function getMetaInsights(
  clientId: string,
  dateRange: { since: string; until: string }
): Promise<MetaInsights[]> {
  const resolved = await resolveMetaCredentials(clientId);
  if (!resolved) return [];
  const creds = { accessToken: resolved.accessToken, appId: resolved.appId, appSecret: resolved.appSecret };
  const accountId = resolved.adAccountId;

  try {
    const resp = await metaGet(
      `/act_${accountId}/insights`,
      {
        fields: "campaign_id,campaign_name,status,objective,spend,impressions,clicks,ctr,cpc,cpm,actions",
        level: "campaign",
        time_range: JSON.stringify({ since: dateRange.since, until: dateRange.until }),
        limit: "100",
      },
      creds
    );
    const data = await resp.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Sync Meta performance data for a client and save to Supabase.
 * This is the main sync function called by the API route.
 *
 * READ-ONLY: only fetches and saves data. Never writes to Meta.
 */
export async function syncMetaPerformanceForClient(clientId: string): Promise<MetaSyncResult> {
  const resolved = await resolveMetaCredentials(clientId);
  if (!resolved) {
    return {
      success: false,
      clientId,
      campaignsSynced: 0,
      totalSpend: 0,
      totalLeads: 0,
      totalImpressions: 0,
      totalClicks: 0,
      error: "Meta credentials not configured. Add META_ACCESS_TOKEN to Vercel env vars or save per-client credentials in the Integrations tab.",
    };
  }
  const creds = { accessToken: resolved.accessToken, appId: resolved.appId, appSecret: resolved.appSecret };
  const accountId = resolved.adAccountId;

  // Date range: last 30 days
  const until = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const insights = await getMetaInsights(clientId, { since, until });

    const supabase = getSupabaseServerClient();
    let campaignsSynced = 0;
    let totalSpend = 0;
    let totalLeads = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    for (const insight of insights) {
      const leads =
        insight.actions?.find((a) => a.action_type === "lead")?.value ??
        insight.actions?.find((a) => a.action_type === "offsite_conversion.fb_pixel_lead")?.value ??
        "0";

      const spend = parseFloat(insight.spend ?? "0");
      const leadsNum = parseInt(leads ?? "0");
      const impressions = parseInt(insight.impressions ?? "0");
      const clicks = parseInt(insight.clicks ?? "0");
      const cpl = leadsNum > 0 ? spend / leadsNum : null;

      totalSpend += spend;
      totalLeads += leadsNum;
      totalImpressions += impressions;
      totalClicks += clicks;

      if (supabase) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("meta_campaign_snapshots") as any).upsert(
        {
            client_id: clientId,
            meta_account_id: accountId,
            campaign_id: insight.campaign_id,
            campaign_name: insight.campaign_name,
            status: insight.status,
            objective: insight.objective,
            spend,
            impressions,
            clicks,
            ctr: parseFloat(insight.ctr ?? "0"),
            cpc: parseFloat(insight.cpc ?? "0"),
            cpm: parseFloat(insight.cpm ?? "0"),
            leads: leadsNum,
            cpl,
            date_start: since,
            date_end: until,
            raw_payload: insight as unknown as Record<string, unknown>,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "client_id,campaign_id,date_start,date_end" }
        );
        campaignsSynced++;
      }
    }

    // Update integration_connections
    if (supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("integration_connections") as any).upsert(
        {
          client_id: clientId,
          provider: "meta",
          provider_account_id: accountId,
          connection_status: "connected",
          last_synced_at: new Date().toISOString(),
          metadata: {
            campaigns_synced: campaignsSynced,
            total_spend: totalSpend,
            total_leads: totalLeads,
            date_range: { since, until },
          },
        },
        { onConflict: "client_id,provider" }
      );
    }

    return {
      success: true,
      clientId,
      campaignsSynced,
      totalSpend,
      totalLeads,
      totalImpressions,
      totalClicks,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Update connection status to sync_failed
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("integration_connections") as any).upsert(
          {
            client_id: clientId,
            provider: "meta",
            provider_account_id: accountId,
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
      campaignsSynced: 0,
      totalSpend: 0,
      totalLeads: 0,
      totalImpressions: 0,
      totalClicks: 0,
      error: errorMsg,
    };
  }
}
