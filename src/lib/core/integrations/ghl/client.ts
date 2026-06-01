// Vault Core — GoHighLevel / LeadConnector client (SERVER-SIDE ONLY, READ-ONLY).
//
// SECURITY (hard rules):
//   • Reads credentials ONLY from server-side env vars: GHL_API_KEY, GHL_LOCATION_ID.
//   • NEVER logs, returns, or exposes credentials. No credential ever appears in
//     an error message, an API response, mock data, or the client bundle.
//   • READ-ONLY: only HTTP GET. No send/reply/update/create/delete, no workflow
//     triggers, no pipeline changes.
//   • Fails SAFELY: any missing config / error returns null so callers fall back
//     to mock conversation data.
//
// NOTE: never import this module from a client component. It has no "use client".

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";
const TIMEOUT_MS = 12_000;

interface GhlConfig {
  apiKey: string;
  locationId: string;
}

// Resolve config from env. Returns null (fail-safe) if either value is absent.
// The returned object is used only inside this module and never leaves it.
function resolveConfig(): GhlConfig | null {
  const apiKey = process.env.GHL_API_KEY?.trim();
  const locationId = process.env.GHL_LOCATION_ID?.trim();
  if (!apiKey || !locationId) return null;
  return { apiKey, locationId };
}

export function isGhlConfigured(): boolean {
  return resolveConfig() !== null;
}

/** The location id only (safe, non-secret) — for building query params. Null if unconfigured. */
export function getGhlLocationId(): string | null {
  return resolveConfig()?.locationId ?? null;
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
 * Read-only GET against the LeadConnector API. Returns parsed JSON, or null on
 * ANY problem (missing config, non-2xx, network/timeout, parse error). Error
 * logging is intentionally generic — the API key is NEVER included in logs.
 */
export async function ghlGet<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T | null> {
  const config = resolveConfig();
  if (!config) return null;

  const url = new URL(path.replace(/^\//, ""), GHL_BASE + "/");
  // Always scope to the configured location.
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
      // Generic log only — no key, no Authorization header echoed.
      console.error(`[VaultCore:GHL] GET ${path} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    // Never include the key; (e as Error).message won't contain it.
    console.error(`[VaultCore:GHL] GET ${path} failed:`, (e as Error).message);
    return null;
  }
}
