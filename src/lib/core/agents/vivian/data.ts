// Vault Core — VIVIAN safe client read model (server-side, READ-ONLY).
//
// Vivian must only ever see NON-PII client signals. This module is the single
// place she reads client data: in the Supabase path it selects ONLY non-PII
// columns (never email/phone/owner/notes), and in mock/fallback mode it projects
// the seeded clients to the same PII-free snapshot. Vivian's agent + analysis
// consume `ClientSuccessSnapshot[]` — never `Client` (which carries contact PII).

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { clients as mockClients } from "@/lib/data";
import type { ClientStatus } from "@/lib/data";

export interface ClientSuccessSnapshot {
  id: string;
  name: string; // business/company name only — never personal contact PII
  status: ClientStatus;
  phase?: string;
  hasMetaAccount: boolean;
  hasPixel: boolean;
  // null = UNKNOWN (e.g. live `clients` table doesn't carry these). The signal
  // rules only fire on a known 0, so unknown never produces a false positive.
  activeCampaignCount: number | null;
  leads: number | null;
  intelligenceScore?: number;
}

// NON-PII column whitelist for the live read. Deliberately excludes email, phone,
// owner_name, notes, and any free-text contact fields. It also EXCLUDES
// `ghl_location_id` and any per-client GHL field — Vault Core executive runtime
// (which Vivian is part of) must never touch per-client GHL scope.
const SAFE_COLUMNS =
  "id, company_name, status, phase, intelligence_score, meta_ad_account_id, meta_pixel_id";

interface SafeClientRow {
  id: string;
  company_name: string;
  status: ClientStatus;
  phase?: string | null;
  intelligence_score?: number | null;
  meta_ad_account_id?: string | null;
  meta_pixel_id?: string | null;
}

function fromMock(): ClientSuccessSnapshot[] {
  return mockClients.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    phase: c.phase,
    hasMetaAccount: !!c.metaAccountId?.trim(),
    hasPixel: !!c.pixelId?.trim(),
    activeCampaignCount: (c.campaigns ?? []).filter((cam) => cam.status === "active").length,
    leads: c.stats?.leads ?? 0,
    intelligenceScore: c.intelligenceScore,
  }));
}

/**
 * Read PII-free client success snapshots. Mock-safe: falls back to the seeded
 * clients (projected to the safe shape) when Supabase is unconfigured or the
 * query errors. NEVER selects or returns contact PII.
 */
export async function getClientSuccessSnapshots(): Promise<ClientSuccessSnapshot[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = getSupabaseServerClient() as any;
  if (!client) return fromMock();

  try {
    const { data, error } = await client.from("clients").select(SAFE_COLUMNS).order("company_name");
    if (error || !data) return fromMock();
    return (data as SafeClientRow[]).map((r) => ({
      id: r.id,
      name: r.company_name,
      status: r.status,
      phase: r.phase ?? undefined,
      hasMetaAccount: !!r.meta_ad_account_id?.trim(),
      hasPixel: !!r.meta_pixel_id?.trim(),
      // Live per-client lead/campaign counts are not columns on `clients` (they
      // live in dedicated snapshot tables). Mark UNKNOWN (null) — never 0 — so the
      // lead/campaign rules don't fire false fulfillment/launch signals at runtime.
      activeCampaignCount: null,
      leads: null,
      intelligenceScore: r.intelligence_score ?? undefined,
    }));
  } catch {
    return fromMock();
  }
}
