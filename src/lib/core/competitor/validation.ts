// Vault Core — Competitor Intelligence input validation + sanitization.
//
// PURE. Server-side only (called by the API routes before persistence). No
// external calls. Caps lengths, strips control chars, and only accepts http(s)
// URLs — so manual entry can never store scripts, credentials, or oversized blobs.

import type {
  CompetitorProfileInput,
  CompetitorCaptureInput,
  CaptureType,
  CompetitorStatus,
} from "./types";
import { CAPTURE_TYPES } from "./types";

const MAX_TEXT = 2000;
const MAX_SHORT = 300;
const MAX_URL = 600;
const MAX_LINKS = 12;
const MAX_TAGS = 16;

function cleanText(v: unknown, max = MAX_TEXT): string | null {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return s.length ? s : null;
}

/** Redact accidental secrets / contact PII from free-text before persistence.
 *  Competitor intel is marketing copy — it should never store our client PII,
 *  API keys, tokens, or pasted provider-payload fragments. */
function scrub(s: string): string {
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[redacted-email]")
    .replace(/\b(?:sk|pk|rk)_[A-Za-z0-9]{8,}\b/g, "[redacted-key]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{12,}\b/gi, "[redacted-token]")
    .replace(/\beyJ[A-Za-z0-9._-]{20,}\b/g, "[redacted-jwt]")
    .replace(/\bAKIA[0-9A-Z]{12,}\b/g, "[redacted-aws-key]")
    .replace(/\b[A-Fa-f0-9]{32,}\b/g, "[redacted-hex]")
    .replace(/\d[\d ().-]{8,}\d/g, "[redacted-number]"); // long phone/card-like digit runs
}

/** Free-text field: control-stripped, length-capped, AND secret/PII-scrubbed. */
function cleanFreeText(v: unknown, max = MAX_TEXT): string | null {
  const t = cleanText(v, max);
  return t ? scrub(t) : null;
}

/** Internal client reference only — strict slug, never free-form text/PII. */
function cleanClientId(v: unknown): string | null {
  const t = cleanText(v, 120);
  return t && /^[a-zA-Z0-9_-]{1,120}$/.test(t) ? t : null;
}

/** Observed date — must be a real date and NOT in the future (1d clock-skew
 *  allowance), so future-dated captures can't fake "recent" signals. */
function cleanObservedAt(v: unknown): string | null {
  const t = cleanText(v, 40);
  if (!t) return null;
  const ms = new Date(t).getTime();
  if (!Number.isFinite(ms)) return null;
  if (ms > Date.now()) return null; // reject any future date
  return t;
}

// Query-param keys that look like secrets/tokens — stripped from stored URLs.
const SECRET_PARAM = /(token|secret|password|passwd|api[_-]?key|access[_-]?key|auth|bearer|sig|signature|session|credential)/i;

/** Accept only http(s) URLs, capped in length, with NO embedded credentials or
 *  secret-looking query params / fragments. Returns null for anything else. */
export function safeUrl(v: unknown): string | null {
  const s = cleanText(v, MAX_URL);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null; // never store credentials in a URL
    u.hash = ""; // drop fragments (can carry tokens)
    for (const k of Array.from(u.searchParams.keys())) {
      if (SECRET_PARAM.test(k)) u.searchParams.delete(k); // strip secret-looking params
    }
    return u.toString().slice(0, MAX_URL);
  } catch {
    return null;
  }
}

function clampConfidence(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function cleanLinks(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(safeUrl).filter((x): x is string => !!x).slice(0, MAX_LINKS);
}

function cleanTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((t) => cleanFreeText(t, 40)).filter((x): x is string => !!x).slice(0, MAX_TAGS);
}

const STATUSES: CompetitorStatus[] = ["active", "watch", "archived"];

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export function validateProfileInput(body: unknown): ValidationResult<CompetitorProfileInput> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const name = cleanFreeText(b.name, MAX_SHORT);
  if (!name) return { ok: false, error: "name is required" };

  const status = STATUSES.includes(b.status as CompetitorStatus) ? (b.status as CompetitorStatus) : "active";
  const priority = ["high", "medium", "low"].includes(b.priority as string)
    ? (b.priority as "high" | "medium" | "low")
    : null;

  return {
    ok: true,
    value: {
      name,
      website: safeUrl(b.website),
      market_niche: cleanFreeText(b.market_niche, MAX_SHORT),
      service_area: cleanFreeText(b.service_area, MAX_SHORT),
      offer_notes: cleanFreeText(b.offer_notes),
      social_links: cleanLinks(b.social_links),
      meta_ad_library_url: safeUrl(b.meta_ad_library_url),
      google_business_profile_url: safeUrl(b.google_business_profile_url),
      notes: cleanFreeText(b.notes),
      status,
      client_id: cleanClientId(b.client_id),
      industry: cleanFreeText(b.industry, MAX_SHORT),
      location: cleanFreeText(b.location, MAX_SHORT),
      priority,
      tags: cleanTags(b.tags),
      confidence: clampConfidence(b.confidence),
    },
  };
}

export function validateCaptureInput(body: unknown): ValidationResult<CompetitorCaptureInput> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const competitor_profile_id = cleanClientId(b.competitor_profile_id);
  if (!competitor_profile_id) return { ok: false, error: "competitor_profile_id is required" };

  const capture_type = CAPTURE_TYPES.includes(b.capture_type as CaptureType)
    ? (b.capture_type as CaptureType)
    : null;
  if (!capture_type) return { ok: false, error: "valid capture_type is required" };

  return {
    ok: true,
    value: {
      competitor_profile_id,
      client_id: cleanClientId(b.client_id),
      capture_type,
      hook: cleanFreeText(b.hook, MAX_SHORT),
      offer: cleanFreeText(b.offer, MAX_SHORT),
      angle: cleanFreeText(b.angle, MAX_SHORT),
      screenshot_url: safeUrl(b.screenshot_url),
      ad_copy: cleanFreeText(b.ad_copy),
      landing_page_url: safeUrl(b.landing_page_url),
      pricing_positioning_notes: cleanFreeText(b.pricing_positioning_notes),
      creative_pattern: cleanFreeText(b.creative_pattern, MAX_SHORT),
      source_url: safeUrl(b.source_url),
      source_platform: cleanFreeText(b.source_platform, 80),
      observed_at: cleanObservedAt(b.observed_at),
      confidence: clampConfidence(b.confidence),
      notes: cleanFreeText(b.notes),
    },
  };
}
