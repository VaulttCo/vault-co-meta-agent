// Vault Core — Competitor Intelligence types (Phase 8.4).
//
// Internal, manual-entry competitor intelligence for Valentina (AI Marketing
// Director). NO scraping, NO external API calls, NO credentials, NO client PII.
// Live automated sources are FUTURE/disabled (see docs/competitor-intel-system.md).

export type CompetitorStatus = "active" | "watch" | "archived";

export type CaptureType =
  | "hook"
  | "offer"
  | "ad_copy"
  | "landing_page"
  | "pricing"
  | "positioning"
  | "screenshot"
  | "creative_pattern"
  | "social_post"
  | "website_observation"
  | "manual_note";

export const CAPTURE_TYPES: CaptureType[] = [
  "hook", "offer", "ad_copy", "landing_page", "pricing", "positioning",
  "screenshot", "creative_pattern", "social_post", "website_observation", "manual_note",
];

export interface CompetitorProfile {
  id: string;
  name: string;
  website: string | null;
  market_niche: string | null;
  service_area: string | null;
  offer_notes: string | null;
  social_links: string[];
  meta_ad_library_url: string | null;
  google_business_profile_url: string | null;
  notes: string | null;
  status: CompetitorStatus;
  // Optional context
  client_id: string | null;
  industry: string | null;
  location: string | null;
  priority: "high" | "medium" | "low" | null;
  tags: string[];
  source: string; // "manual" | "vault_memory" | "demo"
  confidence: number; // 0..1
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_reviewed_at: string | null;
}

export interface CompetitorCapture {
  id: string;
  competitor_profile_id: string;
  client_id: string | null;
  capture_type: CaptureType;
  hook: string | null;
  offer: string | null;
  angle: string | null;
  screenshot_url: string | null;
  ad_copy: string | null;
  landing_page_url: string | null;
  pricing_positioning_notes: string | null;
  creative_pattern: string | null;
  source_url: string | null;
  source_platform: string | null;
  observed_at: string | null;
  confidence: number; // 0..1
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ── Inputs (validated/sanitized server-side before persistence) ──
export interface CompetitorProfileInput {
  name: string;
  website?: string | null;
  market_niche?: string | null;
  service_area?: string | null;
  offer_notes?: string | null;
  social_links?: string[];
  meta_ad_library_url?: string | null;
  google_business_profile_url?: string | null;
  notes?: string | null;
  status?: CompetitorStatus;
  client_id?: string | null;
  industry?: string | null;
  location?: string | null;
  priority?: "high" | "medium" | "low" | null;
  tags?: string[];
  confidence?: number;
}

export interface CompetitorCaptureInput {
  competitor_profile_id: string;
  client_id?: string | null;
  capture_type: CaptureType;
  hook?: string | null;
  offer?: string | null;
  angle?: string | null;
  screenshot_url?: string | null;
  ad_copy?: string | null;
  landing_page_url?: string | null;
  pricing_positioning_notes?: string | null;
  creative_pattern?: string | null;
  source_url?: string | null;
  source_platform?: string | null;
  observed_at?: string | null;
  confidence?: number;
  notes?: string | null;
}

// ── Public DTOs (what the list routes return to the client) ──────
// Deliberately OMIT raw free-text (notes, ad_copy, pricing notes), internal ids
// (created_by, client_id), and source/screenshot/landing URLs. Those stay
// server-side; the dashboard never needs them. Sanitized fields only.
export interface CompetitorProfileDTO {
  id: string;
  name: string;
  website: string | null;
  market_niche: string | null;
  service_area: string | null;
  offer_notes: string | null; // already secret/PII-scrubbed on write
  social_links: string[];
  meta_ad_library_url: string | null;
  google_business_profile_url: string | null;
  status: CompetitorStatus;
}

export interface CompetitorCaptureDTO {
  id: string;
  competitor_profile_id: string;
  capture_type: CaptureType;
  hook: string | null;
  offer: string | null;
  angle: string | null;
  creative_pattern: string | null;
  confidence: number;
  observed_at: string | null;
  created_at: string;
}

// ── Dashboard aggregate (safe, summarized; no raw payloads/PII) ──
export interface HookLeaderboardRow {
  hook: string;
  competitorName: string;
  frequency: number;
  confidence: number;
  lastSeen: string | null;
  market: string | null;
}

export interface OfferShiftEntry {
  date: string;
  competitorName: string;
  captureType: CaptureType;
  summary: string;
}

export interface CompetitorSourceStatus {
  manualProfiles: number;
  manualCaptures: number;
  vaultMemorySignals: number;
  creativeUploadAnalysis: number;
  // Future automated sources — all DISABLED in this phase.
  metaAdsLibrary: "inactive_future";
  websiteMonitoring: "inactive_future";
  landingPageSnapshots: "inactive_future";
  automationEnabled: boolean; // COMPETITOR_AUTOMATION_ENABLED (default false)
}

export interface CompetitorIntelOverview {
  totalProfiles: number;
  totalCaptures: number;
  newSignalsThisPeriod: number; // captures in the last 14 days
  topOfferShift: string | null;
  topHookAngle: string | null;
  coverageState: "none" | "manual" | "memory" | "mixed";
  sources: CompetitorSourceStatus;
  isDemo: boolean; // true when only seeded demo data is present
  live: boolean; // true when backed by a real DB
  // Phase 8.5 — Valentina internal strategy synthesis (recommend-only).
  strategy: import("./strategy").CompetitorStrategy;
}
