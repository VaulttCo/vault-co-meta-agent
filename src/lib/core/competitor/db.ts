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
  CompetitorProfileDTO,
  CompetitorCaptureDTO,
  CompetitorSourceStatus,
} from "./types";
import { synthesizeStrategy } from "./strategy";

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

// ── Safe DTOs returned to the client by the list routes ──
// Strip raw free-text (notes/ad_copy/pricing notes), internal ids (created_by,
// client_id), and source/screenshot/landing URLs — those stay server-side.
export function toProfileDTO(p: CompetitorProfile): CompetitorProfileDTO {
  return {
    id: p.id,
    name: p.name,
    website: p.website,
    market_niche: p.market_niche,
    service_area: p.service_area,
    offer_notes: p.offer_notes, // already scrubbed on write
    social_links: p.social_links,
    meta_ad_library_url: p.meta_ad_library_url,
    google_business_profile_url: p.google_business_profile_url,
    status: p.status,
  };
}

export function toCaptureDTO(c: CompetitorCapture): CompetitorCaptureDTO {
  return {
    id: c.id,
    competitor_profile_id: c.competitor_profile_id,
    capture_type: c.capture_type,
    hook: c.hook,
    offer: c.offer,
    angle: c.angle,
    creative_pattern: c.creative_pattern,
    confidence: c.confidence,
    observed_at: c.observed_at,
    created_at: c.created_at,
  };
}

// ── Dashboard aggregate (safe, summarized — no raw payloads / PII) ──
const PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

export async function getOverview(): Promise<CompetitorIntelOverview> {
  const [profiles, captures] = await Promise.all([getProfiles(), getCaptures()]);
  const live = !!db();
  const now = Date.now();

  const newSignalsThisPeriod = captures.filter((c) => {
    const diff = now - new Date(c.observed_at ?? c.created_at).getTime();
    return Number.isFinite(diff) && diff >= 0 && diff <= PERIOD_MS; // not future, within window
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

  // Valentina's internal strategy synthesis (pure, recommend-only).
  const strategy = synthesizeStrategy(profiles, captures);

  return {
    totalProfiles: profiles.length,
    totalCaptures: captures.length,
    newSignalsThisPeriod,
    topOfferShift: strategy.offerShifts[0]?.offer ?? null,
    topHookAngle: strategy.topHooks[0]?.hook ?? null,
    coverageState,
    sources,
    isDemo: false,
    live,
    strategy,
  };
}
