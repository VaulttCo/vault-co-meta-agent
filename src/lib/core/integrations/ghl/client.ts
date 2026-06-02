// Vault Core — GoHighLevel / LeadConnector client (SERVER-SIDE ONLY, READ-ONLY).
//
// SCOPE (Phase 6.8): Vault Core reads ONLY two explicitly-labeled Vault Co-owned
// sub-accounts and NEVER client sub-accounts:
//   • "current" → VAULT_CO_GHL_API_KEY / VAULT_CO_GHL_LOCATION_ID
//   • "legacy"  → VAULT_CO_LEGACY_GHL_API_KEY / VAULT_CO_LEGACY_GHL_LOCATION_ID
// Vault Core uses ONLY these Vault-Co-owned vars. It does NOT fall back to the
// generic GHL_API_KEY / GHL_LOCATION_ID (those are legacy/client-tracking only),
// and it never reads per-client credentials, integration_connections, or
// clients.ghl_location_id.
// There is NO multi-location scanning and NO looping over locations. A read is
// always scoped to one of these two configured locations.
//
// SECURITY (hard rules):
//   • Credentials read ONLY from server-side env vars. NEVER logged, returned,
//     exposed to the client bundle, or placed in mock data.
//   • READ-ONLY: only HTTP GET. No send/reply/update/create/delete, no workflow
//     triggers, no pipeline changes.
//   • Fails SAFELY: missing config / any error returns null so callers fall back
//     to mock data.
//
// Never import this module from a client component. It has no "use client".

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";
const TIMEOUT_MS = 12_000;

export type GhlAccount = "current" | "legacy";

interface GhlConfig {
  apiKey: string;
  locationId: string;
}

// Resolve config for a specific Vault Co account. Returns null (fail-safe) if
// that account's vars are absent. Only these two accounts are ever resolvable.
function resolveConfig(account: GhlAccount): GhlConfig | null {
  if (account === "legacy") {
    const apiKey = process.env.VAULT_CO_LEGACY_GHL_API_KEY?.trim();
    const locationId = process.env.VAULT_CO_LEGACY_GHL_LOCATION_ID?.trim();
    if (!apiKey || !locationId) return null;
    return { apiKey, locationId };
  }
  // current — Vault Co-owned vars ONLY. No generic GHL_* fallback (Vault Core must
  // never resolve GHL credentials outside the Vault-Co-owned accounts).
  const apiKey = process.env.VAULT_CO_GHL_API_KEY?.trim();
  const locationId = process.env.VAULT_CO_GHL_LOCATION_ID?.trim();
  if (!apiKey || !locationId) return null;
  return { apiKey, locationId };
}

export function isGhlConfigured(account: GhlAccount = "current"): boolean {
  return resolveConfig(account) !== null;
}

/** The location id only (safe, non-secret) for a given account. Null if unconfigured. */
export function getGhlLocationId(account: GhlAccount = "current"): string | null {
  return resolveConfig(account)?.locationId ?? null;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read-only GET against the LeadConnector API for a specific Vault Co account.
 * Always scoped to that account's location. Returns parsed JSON, or null on ANY
 * problem (missing config, non-2xx, network/timeout, parse error). Logging is
 * generic — the API key is NEVER included in logs.
 */
export async function ghlGet<T = unknown>(
  account: GhlAccount,
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T | null> {
  const config = resolveConfig(account);
  if (!config) return null;

  const url = new URL(path.replace(/^\//, ""), GHL_BASE + "/");
  // Always scope to THIS account's configured location — never any other.
  url.searchParams.set("locationId", config.locationId);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  try {
    const res = await fetchWithTimeout(url.toString(), {
      method: "GET", // READ-ONLY — never anything else
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Version: GHL_VERSION,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.error(`[VaultCore:GHL:${account}] GET ${path} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[VaultCore:GHL:${account}] GET ${path} failed:`, (e as Error).message);
    return null;
  }
}
