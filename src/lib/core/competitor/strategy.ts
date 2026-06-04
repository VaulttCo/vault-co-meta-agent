// Vault Core — Competitor strategy synthesis (Valentina). PURE + READ-ONLY.
//
// Turns the INTERNAL manual competitor source layer (profiles + captures, plus
// optional Vault Memory competitor node summaries) into safe, internal strategy
// outputs: strongest hooks, offer shifts, creative patterns, opportunities,
// risks, and recommended HUMAN next actions. NO external calls, NO scraping, NO
// mutation, NO credentials, NO raw PII. All recommendation language is human-safe
// (review / inspect / consider / prepare / test manually / compare / analyze) —
// never launch / send / update campaign / change budget / contact / trigger.

import type { CompetitorProfile, CompetitorCapture, CaptureType } from "./types";

export interface StrategicHook {
  hook: string;
  frequency: number;
  confidence: number;
  competitors: string[];
  competitorCount: number;
  lastSeen: string | null;
  score: number;
  suggestedHumanAction: string;
}

export interface StrategicOfferShift {
  date: string;
  competitorName: string;
  offer: string | null;
  angle: string | null;
  confidence: number;
  captureType: CaptureType;
  note: string;
}

export interface CreativePattern {
  pattern: string;
  frequency: number;
  competitors: string[];
}

export interface CompetitorSynthesis {
  competitorId: string;
  competitorName: string;
  strongestPattern: string | null;
  opportunity: string | null;
  risk: string | null;
  recommendedHumanAction: string | null;
  latestHooks: string[];
  latestOffers: string[];
}

export type CoverageState = "none" | "thin" | "manual" | "strong";

export interface CompetitorStrategy {
  topHooks: StrategicHook[];
  offerShifts: StrategicOfferShift[];
  creativePatterns: CreativePattern[];
  competitorOpportunities: string[];
  competitorRisks: string[];
  recommendedHumanActions: string[];
  perCompetitor: CompetitorSynthesis[];
  confidence: number;
  coverageState: CoverageState;
  sourceSummary: string;
}

const OFFER_TYPES: CaptureType[] = ["offer", "pricing", "positioning", "landing_page", "website_observation"];
const PERIOD_MS = 21 * 24 * 60 * 60 * 1000;

function hookText(c: CompetitorCapture): string | null {
  return c.hook ?? c.angle ?? null;
}
function seenAt(c: CompetitorCapture): string {
  return c.observed_at ?? c.created_at;
}
function recencyFactor(iso: string, now: number): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  const age = now - t;
  if (age < 0) return 0; // future-dated → never treated as recent
  return Math.max(0, 1 - age / PERIOD_MS); // 1 (now) → 0 (>21d)
}

export const EMPTY_STRATEGY: CompetitorStrategy = {
  topHooks: [],
  offerShifts: [],
  creativePatterns: [],
  competitorOpportunities: [],
  competitorRisks: [],
  recommendedHumanActions: [],
  perCompetitor: [],
  confidence: 0,
  coverageState: "none",
  sourceSummary: "No competitor profiles or captures yet — manual/internal only, future automation disabled.",
};

/** Synthesize internal competitor strategy. Pure + deterministic. */
export function synthesizeStrategy(
  profiles: CompetitorProfile[],
  captures: CompetitorCapture[]
): CompetitorStrategy {
  if (profiles.length === 0 && captures.length === 0) return EMPTY_STRATEGY;

  const now = Date.now();
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const nameOf = (id: string) => profileById.get(id)?.name ?? "—";

  // ── Hook aggregation (frequency · recency · confidence · #competitors) ──
  interface HookAgg { text: string; freq: number; conf: number; competitors: Set<string>; lastSeen: string | null; recency: number }
  const hookMap = new Map<string, HookAgg>();
  for (const c of captures) {
    const h = hookText(c);
    if (!h) continue;
    const key = h.toLowerCase();
    const e = hookMap.get(key) ?? { text: h, freq: 0, conf: 0, competitors: new Set<string>(), lastSeen: null, recency: 0 };
    e.freq += 1;
    e.conf = Math.max(e.conf, c.confidence);
    e.competitors.add(nameOf(c.competitor_profile_id));
    const seen = seenAt(c);
    if (!e.lastSeen || seen > e.lastSeen) e.lastSeen = seen;
    e.recency = Math.max(e.recency, recencyFactor(seen, now));
    hookMap.set(key, e);
  }
  const topHooks: StrategicHook[] = Array.from(hookMap.values())
    .map((e) => {
      // Composite score: frequency + repeated-angle, recency, confidence, breadth.
      const score = e.freq * 0.4 + e.recency * 0.25 + e.conf * 0.2 + (e.competitors.size - 1) * 0.15;
      return {
        hook: e.text,
        frequency: e.freq,
        confidence: e.conf,
        competitors: Array.from(e.competitors),
        competitorCount: e.competitors.size,
        lastSeen: e.lastSeen,
        score: Number(score.toFixed(3)),
        suggestedHumanAction:
          e.competitors.size > 1
            ? "Multiple competitors use this angle — consider testing it manually and compare against current client creative."
            : "Review this hook against current client campaigns; consider a manual test.",
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  // ── Offer shifts (offer / pricing / positioning / landing) ──
  const offerShifts: StrategicOfferShift[] = captures
    .filter((c) => OFFER_TYPES.includes(c.capture_type))
    .map((c) => ({
      date: seenAt(c),
      competitorName: nameOf(c.competitor_profile_id),
      // Public-safe: only DTO-allowed fields (never raw pricing_positioning_notes).
      offer: c.offer ?? c.creative_pattern,
      angle: c.angle ?? c.creative_pattern,
      confidence: c.confidence,
      captureType: c.capture_type,
      note: "Inspect this positioning/offer shift and consider whether to review our offer positioning.",
    }))
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .slice(0, 20);

  // ── Creative patterns ──
  const patternMap = new Map<string, { text: string; freq: number; competitors: Set<string> }>();
  for (const c of captures) {
    if (!c.creative_pattern) continue;
    const key = c.creative_pattern.toLowerCase();
    const e = patternMap.get(key) ?? { text: c.creative_pattern, freq: 0, competitors: new Set<string>() };
    e.freq += 1;
    e.competitors.add(nameOf(c.competitor_profile_id));
    patternMap.set(key, e);
  }
  const creativePatterns: CreativePattern[] = Array.from(patternMap.values())
    .map((e) => ({ pattern: e.text, frequency: e.freq, competitors: Array.from(e.competitors) }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // ── Opportunities / risks (heuristics over the aggregates) ──
  const competitorOpportunities: string[] = [];
  const competitorRisks: string[] = [];
  const recommendedHumanActions: string[] = [];

  const sharedHook = topHooks.find((h) => h.competitorCount >= 2);
  if (sharedHook) {
    competitorOpportunities.push(`Several competitors lean on the "${sharedHook.hook}" angle — consider testing it manually against current client creative.`);
    competitorRisks.push(`The market appears to be converging on the "${sharedHook.hook}" angle — review how our messaging differentiates.`);
  }
  const recentOffers = offerShifts.filter((o) => recencyFactor(o.date, now) > 0).length;
  if (recentOffers >= 2) {
    competitorOpportunities.push(`${recentOffers} recent competitor offer/positioning shifts — consider preparing a manual offer/creative test.`);
    competitorRisks.push("Competitors are actively changing offers/pricing — review our positioning before it lags.");
  }
  const topPattern = creativePatterns[0];
  if (topPattern && topPattern.frequency >= 2) {
    competitorOpportunities.push(`Recurring creative pattern: "${topPattern.pattern}" — analyze it and compare against our current creative.`);
  }

  // Recommended human actions — generated, human-safe, deduped.
  for (const h of topHooks.slice(0, 3)) recommendedHumanActions.push(`Review the "${h.hook}" hook (seen ${h.frequency}×). ${h.suggestedHumanAction}`);
  if (recentOffers >= 1) recommendedHumanActions.push("Inspect recent competitor offer/positioning shifts in the timeline.");
  if (topPattern) recommendedHumanActions.push(`Compare current client creative against the "${topPattern.pattern}" pattern.`);
  recommendedHumanActions.push("Ask Valentina for deeper analysis on the strongest competitor or angle.");
  const dedupActions = Array.from(new Set(recommendedHumanActions)).slice(0, 6);

  // ── Per-competitor synthesis ──
  const perCompetitor: CompetitorSynthesis[] = profiles.map((p) => {
    const own = captures.filter((c) => c.competitor_profile_id === p.id);
    const hooks = own.map(hookText).filter((x): x is string => !!x);
    const offers = own.map((c) => c.offer).filter((x): x is string => !!x);
    const patterns = own.map((c) => c.creative_pattern).filter((x): x is string => !!x);
    const strongest = patterns[0] ?? hooks[0] ?? offers[0] ?? null;
    return {
      competitorId: p.id,
      competitorName: p.name,
      strongestPattern: strongest,
      opportunity: hooks[0] ? `Test the "${hooks[0]}" angle manually and compare to current creative.` : (own.length === 0 ? null : "Review this competitor's captures for a testable angle."),
      risk: offers[0] ? `Watch the "${offers[0]}" offer — review whether our positioning competes.` : null,
      recommendedHumanAction: own.length === 0
        ? "Capture hooks/offers for this competitor so Valentina can analyze them."
        : "Review the latest captures and consider a manual creative/offer test.",
      latestHooks: hooks.slice(0, 3),
      latestOffers: offers.slice(0, 2),
    };
  });

  // ── Confidence + coverage ──
  const confidence = captures.length
    ? Number((captures.reduce((s, c) => s + c.confidence, 0) / captures.length).toFixed(2))
    : 0;
  const coverageState: CoverageState =
    captures.length === 0 && profiles.length === 0 ? "none"
    : captures.length < 3 ? "thin"
    : captures.length < 10 ? "manual"
    : "strong";

  const sourceSummary = `${profiles.length} competitor profile(s) · ${captures.length} manual capture(s) · internal only · future automation disabled.`;

  return {
    topHooks,
    offerShifts,
    creativePatterns,
    competitorOpportunities,
    competitorRisks,
    recommendedHumanActions: dedupActions,
    perCompetitor,
    confidence,
    coverageState,
    sourceSummary,
  };
}
