// Vault Core — Valentina × Competitor source layer (READ-ONLY analysis).
//
// Valentina (AI Marketing Director) reads the INTERNAL, manual competitor source
// layer (profiles + captures) plus existing Vault Memory and turns it into:
//   • Vault Memory nodes (competitor_profile / hook_pattern / offer_shift /
//     market_signal) so competitor intelligence lives in the brain, and
//   • recommend-only recommendation candidates routed through insertRecommendation
//     (→ the Vera/Vesper quality gate, which dedupes/suppresses competitor noise).
//
// HARD RULES: read-only. NO scraping, NO external API calls, NO Meta Ads Library
// calls, NO mutation of GHL/Stripe/Meta/campaigns/budgets, NO contacting anyone.
// Human-review-safe language only (review / inspect / consider / test manually).
// Mock-safe: writes no-op without a DB. Bounded so it never floods the queue.

import { ensureNode, insertNode, insertEdge, insertActivity, insertRecommendation } from "../memory/db";
import { getProfiles, getCaptures } from "./db";
import type { CompetitorCapture } from "./types";

export interface ValentinaCompetitorResult {
  nodesCreated: number;
  edgesCreated: number;
  recommendationsCreated: number;
}

function hookText(c: CompetitorCapture): string | null {
  return c.hook ?? c.angle ?? null;
}

/**
 * Analyze the competitor source layer and write memory + recommend-only
 * candidates. Returns counts. Safe to call every Valentina tick.
 */
export async function runCompetitorSignals(): Promise<ValentinaCompetitorResult> {
  const out: ValentinaCompetitorResult = { nodesCreated: 0, edgesCreated: 0, recommendationsCreated: 0 };

  const [profiles, captures] = await Promise.all([getProfiles(), getCaptures()]);
  if (profiles.length === 0 && captures.length === 0) return out;

  const coreId = await ensureNode({ category: "memory_core", label: "Vault Memory", confidence: 1 });
  const valId = await ensureNode({
    category: "agent",
    label: "Valentina",
    summary: "AI Marketing Director — understand how attention converts.",
    source_agent: "valentina",
    confidence: 0.95,
    metadata: { title: "AI Marketing Director", active: true },
  });

  const link = async (fromId: string | null, weight = 0.85) => {
    if (fromId && valId) { if (await insertEdge({ from_node: fromId, to_node: valId, relationship: "contributed_by", weight, source_agent: "valentina" })) out.edgesCreated += 1; }
    if (fromId && coreId) { if (await insertEdge({ from_node: fromId, to_node: coreId, relationship: "influences", weight: 0.6, source_agent: "valentina" })) out.edgesCreated += 1; }
  };

  // 1. Competitor profile nodes (idempotent by label).
  for (const p of profiles.slice(0, 8)) {
    const id = await ensureNode({
      category: "competitor_profile",
      label: `Competitor: ${p.name}`,
      summary: [p.market_niche, p.offer_notes].filter(Boolean).join(" · ") || "Tracked competitor.",
      source_agent: "valentina",
      confidence: p.confidence,
      ref_type: "competitor_profile",
      ref_id: p.id,
      metadata: { name: p.name, market: p.market_niche, source: "competitor_source_layer" },
    });
    if (id) { out.nodesCreated += 1; await link(id); }
  }

  // 2. Hook-pattern analysis — repeated hooks across captures → memory + a rec.
  const hookFreq = new Map<string, { text: string; count: number; clients: Set<string> }>();
  for (const c of captures) {
    const h = hookText(c);
    if (!h) continue;
    const k = h.toLowerCase();
    const e = hookFreq.get(k) ?? { text: h, count: 0, clients: new Set<string>() };
    e.count += 1;
    if (c.client_id) e.clients.add(c.client_id);
    hookFreq.set(k, e);
  }
  const repeatedHooks = Array.from(hookFreq.values()).filter((h) => h.count >= 2).sort((a, b) => b.count - a.count);
  for (const h of repeatedHooks.slice(0, 5)) {
    const id = await ensureNode({
      category: "hook_pattern",
      label: `Hook pattern: ${h.text.slice(0, 60)}`,
      summary: `Observed across ${h.count} competitor captures.`,
      source_agent: "valentina",
      confidence: Math.min(0.9, 0.5 + h.count * 0.1),
      metadata: { frequency: h.count },
    });
    if (id) { out.nodesCreated += 1; await link(id); }
  }
  // One recommend-only candidate for the strongest repeated hook (gate dedupes the rest).
  const topHook = repeatedHooks[0];
  if (topHook) {
    const recId = await insertRecommendation({
      agent: "valentina",
      title: `Review competitor hook pattern: "${topHook.text.slice(0, 60)}"`,
      body: `This hook/angle appears across ${topHook.count} competitor captures. Consider testing this angle manually against current client campaigns and reviewing how it compares to your live messaging.`,
      impact: "Competitive creative signal",
      priority_score: Math.min(0.75, 0.5 + topHook.count * 0.05),
      influence_score: 0.6,
      related_clients: Array.from(topHook.clients),
      metadata: { source: "competitor_source_layer", recommendOnly: true, humanApprovalRequired: true, neverAutoExecute: true },
    });
    if (recId) out.recommendationsCreated += 1;
  }

  // 3. Offer-shift analysis — recent offer/pricing/positioning captures → market signal + a rec.
  const offerCaptures = captures.filter((c) => ["offer", "pricing", "positioning", "landing_page"].includes(c.capture_type));
  if (offerCaptures.length >= 2) {
    const msId = await insertNode({
      category: "market_signal",
      label: `Market signal: ${offerCaptures.length} recent offer/positioning shifts`,
      summary: "Multiple competitors changing offers/pricing/positioning — possible market shift.",
      source_agent: "valentina",
      confidence: 0.62,
      metadata: { shifts: offerCaptures.length },
    });
    if (msId) { out.nodesCreated += 1; await link(msId); }

    const recId = await insertRecommendation({
      agent: "valentina",
      title: "Review competitor offer / positioning shifts",
      body: `${offerCaptures.length} recent competitor captures show offer, pricing, or positioning changes. Inspect these shifts and consider whether to review our offer positioning or prepare a manual creative/offer test.`,
      impact: "Market positioning signal",
      priority_score: 0.6,
      influence_score: 0.6,
      related_clients: Array.from(new Set(offerCaptures.map((c) => c.client_id).filter((x): x is string => !!x))),
      metadata: { source: "competitor_source_layer", recommendOnly: true, humanApprovalRequired: true, neverAutoExecute: true },
    });
    if (recId) out.recommendationsCreated += 1;
  }

  if (out.nodesCreated > 0 || out.recommendationsCreated > 0) {
    await insertActivity({
      agent: "valentina",
      kind: "analysis",
      message: `Valentina reviewed the competitor source layer (${profiles.length} profile(s), ${captures.length} capture(s)) and surfaced ${out.recommendationsCreated} competitive signal(s) for human review.`,
      node_id: valId,
    });
  }

  return out;
}
