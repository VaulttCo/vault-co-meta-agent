// Vault Core — Competitor Intelligence data layer (server-side, internal-only).
//
// Manual-entry competitor profiles + intelligence captures. NO scraping, NO
// external API calls, NO credentials, NO client PII, NO raw provider payloads.
// Mock-safe: when Supabase is unconfigured (or the competitor_* tables don't
// exist yet) it uses an in-memory store that starts EMPTY — so the dashboard
// shows honest empty states, and manual creates work in-process. Apply
// docs/competitor-intel-schema.sql to persist across cold starts.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CompetitorProfile,
  CompetitorCapture,
  CompetitorProfileInput,
  CompetitorCaptureInput,
  CompetitorIntelOverview,
  HookLeaderboardRow,
  OfferShiftEntry,
  CompetitorSourceStatus,
} from "./types";

const PROFILES_TABLE = "competitor_profiles";
const CAPTURES_TABLE = "competitor_intelligence_captures";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseServerClient();
}

/** Future automated sources (Meta Ads Library, site monitoring, etc.) are OFF by
 *  default and require an explicit opt-in. No code path acts on this in 8.4. */
export function competitorAutomationEnabled(): boolean {
  return process.env.COMPETITOR_AUTOMATION_ENABLED === "true";
}

// ── In-memory mock store (per-process; starts empty) ──
const mockProfiles: CompetitorProfile[] = [];
const mockCaptures: CompetitorCapture[] = [];

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

// ── Reads ──
export async function getProfiles(): Promise<CompetitorProfile[]> {
  const client = db();
  if (!client) return [...mockProfiles];
  try {
    const { data, error } = await client.from(PROFILES_TABLE).select("*").order("created_at", { ascending: false });
    if (error || !data) return [...mockProfiles];
    return data as CompetitorProfile[];
  } catch {
    return [...mockProfiles];
  }
}

export async function getCaptures(): Promise<CompetitorCapture[]> {
  const client = db();
  if (!client) return [...mockCaptures];
  try {
    const { data, error } = await client.from(CAPTURES_TABLE).select("*").order("created_at", { ascending: false });
    if (error || !data) return [...mockCaptures];
    return data as CompetitorCapture[];
  } catch {
    return [...mockCaptures];
  }
}

// ── Writes (internal DB only — no external calls) ──
export async function createProfile(input: CompetitorProfileInput, createdBy: string | null): Promise<CompetitorProfile> {
  const now = new Date().toISOString();
  const row: CompetitorProfile = {
    id: uuid(),
    name: input.name,
    website: input.website ?? null,
    market_niche: input.market_niche ?? null,
    service_area: input.service_area ?? null,
    offer_notes: input.offer_notes ?? null,
    social_links: input.social_links ?? [],
    meta_ad_library_url: input.meta_ad_library_url ?? null,
    google_business_profile_url: input.google_business_profile_url ?? null,
    notes: input.notes ?? null,
    status: input.status ?? "active",
    client_id: input.client_id ?? null,
    industry: input.industry ?? null,
    location: input.location ?? null,
    priority: input.priority ?? null,
    tags: input.tags ?? [],
    source: "manual",
    confidence: input.confidence ?? 0.5,
    created_at: now,
    updated_at: now,
    created_by: createdBy,
    last_reviewed_at: null,
  };
  const client = db();
  // No DB configured → in-memory store (documented; in-process only).
  if (!client) {
    mockProfiles.unshift(row);
    return row;
  }
  // DB present → persist for real. A DB error is SURFACED (the route returns 500)
  // rather than silently faking success on a row that wouldn't persist.
  const { data, error } = await client.from(PROFILES_TABLE).insert(row).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  return data as CompetitorProfile;
}

export async function createCapture(input: CompetitorCaptureInput, createdBy: string | null): Promise<CompetitorCapture> {
  const now = new Date().toISOString();
  const row: CompetitorCapture = {
    id: uuid(),
    competitor_profile_id: input.competitor_profile_id,
    client_id: input.client_id ?? null,
    capture_type: input.capture_type,
    hook: input.hook ?? null,
    offer: input.offer ?? null,
    angle: input.angle ?? null,
    screenshot_url: input.screenshot_url ?? null,
    ad_copy: input.ad_copy ?? null,
    landing_page_url: input.landing_page_url ?? null,
    pricing_positioning_notes: input.pricing_positioning_notes ?? null,
    creative_pattern: input.creative_pattern ?? null,
    source_url: input.source_url ?? null,
    source_platform: input.source_platform ?? null,
    observed_at: input.observed_at ?? null,
    confidence: input.confidence ?? 0.5,
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
    created_by: createdBy,
  };
  const client = db();
  // No DB configured → in-memory store (the UI only offers existing profiles).
  if (!client) {
    if (!mockProfiles.some((p) => p.id === row.competitor_profile_id)) {
      throw new Error("competitor profile not found");
    }
    mockCaptures.unshift(row);
    return row;
  }
  // DB present → persist for real. A DB error (incl. the FK to a missing profile)
  // is SURFACED (route returns 500) rather than faked as success.
  const { data, error } = await client.from(CAPTURES_TABLE).insert(row).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  return data as CompetitorCapture;
}

// ── Dashboard aggregate (safe, summarized — no raw payloads / PII) ──
const PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

function hookText(c: CompetitorCapture): string | null {
  return c.hook ?? c.angle ?? (c.capture_type === "offer" ? c.offer : null);
}

export async function getOverview(): Promise<CompetitorIntelOverview> {
  const [profiles, captures] = await Promise.all([getProfiles(), getCaptures()]);
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const live = !!db();
  const now = Date.now();

  // Hook leaderboard — frequency of hook/angle text across captures.
  const hookMap = new Map<string, HookLeaderboardRow>();
  for (const c of captures) {
    const h = hookText(c);
    if (!h) continue;
    const key = h.toLowerCase();
    const prof = profileById.get(c.competitor_profile_id);
    const existing = hookMap.get(key);
    const seen = c.observed_at ?? c.created_at;
    if (existing) {
      existing.frequency += 1;
      existing.confidence = Math.max(existing.confidence, c.confidence);
      if (!existing.lastSeen || (seen && seen > existing.lastSeen)) existing.lastSeen = seen;
    } else {
      hookMap.set(key, {
        hook: h,
        competitorName: prof?.name ?? "—",
        frequency: 1,
        confidence: c.confidence,
        lastSeen: seen,
        market: prof?.market_niche ?? null,
      });
    }
  }
  const hookLeaderboard = Array.from(hookMap.values())
    .sort((a, b) => b.frequency - a.frequency || b.confidence - a.confidence)
    .slice(0, 12);

  // Offer-shift timeline — offer/positioning captures most-recent first.
  const offerShiftTimeline: OfferShiftEntry[] = captures
    .filter((c) => ["offer", "pricing", "positioning", "landing_page", "website_observation"].includes(c.capture_type))
    .map((c) => {
      const prof = profileById.get(c.competitor_profile_id);
      const summary = c.offer ?? c.pricing_positioning_notes ?? c.creative_pattern ?? c.notes ?? c.capture_type;
      return { date: c.observed_at ?? c.created_at, competitorName: prof?.name ?? "—", captureType: c.capture_type, summary };
    })
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .slice(0, 20);

  const newSignalsThisPeriod = captures.filter((c) => {
    const t = new Date(c.observed_at ?? c.created_at).getTime();
    return Number.isFinite(t) && now - t <= PERIOD_MS;
  }).length;

  const sources: CompetitorSourceStatus = {
    manualProfiles: profiles.length,
    manualCaptures: captures.length,
    vaultMemorySignals: 0, // Valentina maps captures into memory; counted on the graph page.
    creativeUploadAnalysis: 0,
    metaAdsLibrary: "inactive_future",
    websiteMonitoring: "inactive_future",
    landingPageSnapshots: "inactive_future",
    automationEnabled: competitorAutomationEnabled(),
  };

  const coverageState: CompetitorIntelOverview["coverageState"] =
    captures.length === 0 && profiles.length === 0 ? "none" : "manual";

  return {
    totalProfiles: profiles.length,
    totalCaptures: captures.length,
    newSignalsThisPeriod,
    topOfferShift: offerShiftTimeline[0]?.summary ?? null,
    topHookAngle: hookLeaderboard[0]?.hook ?? null,
    coverageState,
    sources,
    hookLeaderboard,
    offerShiftTimeline,
    isDemo: false,
    live,
  };
}
