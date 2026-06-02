/**
 * Per-Client Credential Resolver
 *
 * Resolves integration credentials for a given client using this priority order:
 *   1. Per-client encrypted credentials in `client_integration_credentials` table
 *   2. Global environment variables (META_ACCESS_TOKEN, GHL_API_KEY, etc.)
 *
 * SECURITY:
 * - Decryption happens server-side only (Node.js crypto)
 * - Raw credential values are NEVER returned to the frontend
 * - This module must only be imported in API routes and server-side code
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { decryptCredential } from "@/lib/crypto/credentials";

// ─── Meta ─────────────────────────────────────────────────────────────────────

export interface ResolvedMetaCredentials {
  accessToken: string;
  adAccountId: string;
  appId?: string;
  appSecret?: string;
  source: "per-client" | "global-env";
}

/**
 * Resolve Meta Ads credentials for a specific client.
 * Returns null if no credentials are available.
 */
export async function resolveMetaCredentials(
  clientId: string
): Promise<ResolvedMetaCredentials | null> {
  // ── 1. Try per-client encrypted credentials ────────────────────────────────
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rowRaw } = await supabase
        .from("client_integration_credentials")
        .select("encrypted_data, account_id")
        .eq("client_id", clientId)
        .eq("provider", "meta")
        .maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = rowRaw as any;

      if (row?.encrypted_data) {
        const decrypted = decryptCredential(row.encrypted_data as string);
        if (decrypted) {
          const creds = JSON.parse(decrypted) as {
            accessToken?: string;
            adAccountId?: string;
            appId?: string;
            appSecret?: string;
          };
          if (creds.accessToken && creds.adAccountId) {
            return {
              accessToken: creds.accessToken,
              adAccountId: creds.adAccountId,
              appId: creds.appId,
              appSecret: creds.appSecret,
              source: "per-client",
            };
          }
        }
      }
    }
  } catch {
    // Fall through to global env
  }

  // ── 2. Fall back to global env vars ───────────────────────────────────────
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (accessToken && adAccountId) {
    return {
      accessToken,
      adAccountId,
      appId: process.env.META_APP_ID,
      appSecret: process.env.META_APP_SECRET,
      source: "global-env",
    };
  }

  // ── 3. Partial global env (token only, account ID from integration_connections) ─
  if (accessToken) {
    // Try to get account ID from integration_connections or clients table
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        const { data: connRaw } = await supabase
          .from("integration_connections")
          .select("provider_account_id")
          .eq("client_id", clientId)
          .eq("provider", "meta")
          .maybeSingle();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conn = connRaw as any;
        if (conn?.provider_account_id) {
          return {
            accessToken,
            adAccountId: conn.provider_account_id,
            appId: process.env.META_APP_ID,
            appSecret: process.env.META_APP_SECRET,
            source: "global-env",
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

// ─── GHL ──────────────────────────────────────────────────────────────────────

export interface ResolvedGHLCredentials {
  apiKey: string;
  locationId: string;
  source: "per-client" | "global-env";
}

/**
 * Resolve GoHighLevel credentials for a specific client.
 * Returns null if no credentials are available.
 *
 * ⚠️ LEGACY / Revenue Dashboard ONLY. This resolves a client's OWN GHL sub-account
 * (per-client encrypted creds → integration_connections → global env). It is
 * GATED behind LEGACY_GHL_ROUTES_ENABLED and returns null by default. Vault Core
 * NEVER calls this — Vault Core uses the env-only core client
 * (src/lib/core/integrations/ghl/client.ts) scoped to the VAULT_CO_* locations.
 */
export async function resolveGHLCredentials(
  clientId: string
): Promise<ResolvedGHLCredentials | null> {
  // ── 0. Kill switch — per-client GHL credential resolution is OFF by default ──
  // This closes the per-client GHL sub-account path even if a caller reaches here.
  if (process.env.LEGACY_GHL_ROUTES_ENABLED !== "true") {
    return null;
  }

  // ── 1. Try per-client encrypted credentials ────────────────────────────────
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rowRaw } = await supabase
        .from("client_integration_credentials")
        .select("encrypted_data, account_id")
        .eq("client_id", clientId)
        .eq("provider", "ghl")
        .maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = rowRaw as any;

      if (row?.encrypted_data) {
        const decrypted = decryptCredential(row.encrypted_data as string);
        if (decrypted) {
          const creds = JSON.parse(decrypted) as {
            apiKey?: string;
            locationId?: string;
          };
          if (creds.apiKey && creds.locationId) {
            return {
              apiKey: creds.apiKey,
              locationId: creds.locationId,
              source: "per-client",
            };
          }
        }
      }
    }
  } catch {
    // Fall through to global env
  }

  // ── 2. Fall back to global env vars ───────────────────────────────────────
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (apiKey && locationId) {
    return { apiKey, locationId, source: "global-env" };
  }

  // ── 3. Partial global env (API key only, location from integration_connections) ─
  if (apiKey) {
    try {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        const { data: connRaw } = await supabase
          .from("integration_connections")
          .select("provider_account_id")
          .eq("client_id", clientId)
          .eq("provider", "ghl")
          .maybeSingle();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conn = connRaw as any;
        if (conn?.provider_account_id) {
          return {
            apiKey,
            locationId: conn.provider_account_id,
            source: "global-env",
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}
