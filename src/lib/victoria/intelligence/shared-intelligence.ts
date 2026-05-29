// Victoria ↔ Veronica — Shared Intelligence Layer
// Data structures and builder functions for cross-agent intelligence sharing.
//
// SCOPE: This module ONLY defines interfaces and data extraction functions.
//        Full cross-agent automation is NOT implemented here.
//        This is the foundation that will connect Victoria (sales intelligence)
//        with Veronica (marketing intelligence) in a future phase.
//
// HOW IT WORKS (future):
//   Victoria → extracts patterns from completed calls → SharedIntelligenceRecord[]
//   Veronica → consumes these records to adjust ad targeting, creative, and audience strategy
//   Victoria → uses Veronica's campaign performance data to improve sales coaching
//
// Server-side only.

import type {
  LiveCallSession,
  SharedIntelligenceRecord,
  SharedIntelligenceCategory,
  VictoriaIntelligenceSummary,
  ContractorVertical,
} from "../types";

// ─────────────────────────────────────────────────────────────
// Intelligence extraction from a single completed call
// Builds SharedIntelligenceRecord objects from session data.
// ─────────────────────────────────────────────────────────────

let _recordIdCounter = 0;
function makeRecordId(category: SharedIntelligenceCategory): string {
  return `si_${category}_${++_recordIdCounter}_${Date.now()}`;
}

/**
 * Extract shared intelligence records from a completed call session.
 * These records can be stored and aggregated across all Victoria calls.
 */
export function extractSharedIntelligence(session: LiveCallSession): SharedIntelligenceRecord[] {
  _recordIdCounter = 0;
  const records: SharedIntelligenceRecord[] = [];
  const now = new Date().toISOString();
  const vertical = session.prospect.vertical;

  // ── Common objections ────────────────────────────────────────
  for (const obj of session.objections.raised) {
    records.push({
      id: makeRecordId("common_objections"),
      category: "common_objections",
      vertical,
      insight: `${obj.category.replace(/_/g, " ")} objection raised during ${session.phase} phase`,
      evidence: `"${obj.raw_text.slice(0, 100)}"`,
      frequency_count: 1,
      confidence: "high",
      source: "victoria",
      created_at: now,
      last_seen_at: now,
    });
  }

  // ── Lead quality signals ──────────────────────────────────────
  if (session.scores.pain_depth < 30) {
    records.push({
      id: makeRecordId("lead_quality_issues"),
      category: "lead_quality_issues",
      vertical,
      insight: "Prospect had low pain awareness — discovery depth below 30/100",
      evidence: `Discovery depth: ${session.scores.pain_depth}/100. Pain specificity: ${session.discovery.pain_specificity}`,
      frequency_count: 1,
      confidence: "medium",
      source: "victoria",
      created_at: now,
      last_seen_at: now,
    });
  }

  if (session.scores.authority < 40) {
    records.push({
      id: makeRecordId("lead_quality_issues"),
      category: "lead_quality_issues",
      vertical,
      insight: "Prospect was not the sole decision maker — authority score below 40/100",
      evidence: `Authority score: ${session.scores.authority}/100. Objections: ${session.objections.raised.map((o) => o.category).join(", ") || "none"}`,
      frequency_count: 1,
      confidence: "medium",
      source: "victoria",
      created_at: now,
      last_seen_at: now,
    });
  }

  // ── Offer resonance signals ───────────────────────────────────
  const buyingSignalChunks = session.transcript.filter((c) => c.contains_buying_signal);
  if (buyingSignalChunks.length > 0) {
    records.push({
      id: makeRecordId("offer_resonance"),
      category: "offer_resonance",
      vertical,
      insight: `Offer resonated — ${buyingSignalChunks.length} buying signal(s) detected during call`,
      evidence: `"${buyingSignalChunks[0].text.slice(0, 100)}"`,
      frequency_count: buyingSignalChunks.length,
      confidence: "high",
      source: "victoria",
      created_at: now,
      last_seen_at: now,
    });
  }

  if (session.scores.close_readiness < 25 && session.transcript.length > 5) {
    records.push({
      id: makeRecordId("offer_resonance"),
      category: "offer_resonance",
      vertical,
      insight: "Low close readiness despite multi-chunk call — offer may not be resonating for this vertical/profile",
      evidence: `Close readiness: ${session.scores.close_readiness}/100 after ${session.transcript.length} chunks`,
      frequency_count: 1,
      confidence: "low",
      source: "victoria",
      created_at: now,
      last_seen_at: now,
    });
  }

  // ── Emotional pain patterns ───────────────────────────────────
  if (session.discovery.emotional_impact_expressed) {
    const emotionalChunks = session.transcript.filter(
      (c) => c.speaker === "prospect" && c.contains_emotional_shift
    );
    if (emotionalChunks.length > 0) {
      records.push({
        id: makeRecordId("emotional_pain_patterns"),
        category: "emotional_pain_patterns",
        vertical,
        insight: `Emotional pain expressed — prospect revealed impact beyond financial concern`,
        evidence: `"${emotionalChunks[0].text.slice(0, 120)}"`,
        frequency_count: emotionalChunks.length,
        confidence: "high",
        source: "victoria",
        created_at: now,
        last_seen_at: now,
      });
    }
  }

  if (session.prospect.emotional_state === "skeptical" || session.prospect.emotional_state === "defensive") {
    records.push({
      id: makeRecordId("trust_blockers"),
      category: "trust_blockers",
      vertical,
      insight: `Prospect entered defensive/skeptical state — likely prior bad agency experience or trust gap`,
      evidence: `Emotional state: ${session.prospect.emotional_state}. Trust score: ${session.scores.trust}/100`,
      frequency_count: 1,
      confidence: "high",
      source: "victoria",
      created_at: now,
      last_seen_at: now,
    });
  }

  // ── Vertical-specific trends ──────────────────────────────────
  if (session.discovery.timeline_urgency_present) {
    records.push({
      id: makeRecordId("vertical_specific_trends"),
      category: "vertical_specific_trends",
      vertical,
      insight: `Seasonal/timeline urgency present for ${vertical} prospect`,
      evidence: `Timeline urgency flagged during discovery. Urgency score: ${session.scores.urgency}/100`,
      frequency_count: 1,
      confidence: "medium",
      source: "victoria",
      created_at: now,
      last_seen_at: now,
    });
  }

  // ── Trust blockers ────────────────────────────────────────────
  const trustBreakingEvents = session.timeline.filter(
    (e) => e.event_type === "trust_declining" || e.event_type === "emotional_shutdown"
  );
  if (trustBreakingEvents.length > 0) {
    records.push({
      id: makeRecordId("trust_blockers"),
      category: "trust_blockers",
      vertical,
      insight: `Trust eroded during call — ${trustBreakingEvents.length} trust decline event(s) detected`,
      evidence: trustBreakingEvents[0].description,
      frequency_count: trustBreakingEvents.length,
      confidence: "medium",
      source: "victoria",
      created_at: now,
      last_seen_at: now,
    });
  }

  return records;
}

// ─────────────────────────────────────────────────────────────
// Intelligence summary builder
// Aggregates multiple SharedIntelligenceRecords into a VictoriaIntelligenceSummary.
// This would be called periodically (e.g., weekly) to produce reporting.
// ─────────────────────────────────────────────────────────────

export function buildIntelligenceSummary(
  records: SharedIntelligenceRecord[],
  vertical: ContractorVertical | "all",
  periodStart: string,
  periodEnd: string,
  callCount: number
): VictoriaIntelligenceSummary {
  const filtered = vertical === "all" ? records : records.filter((r) => r.vertical === vertical || r.vertical === "all");

  // Aggregate objections
  const objectionCounts: Record<string, number> = {};
  for (const r of filtered.filter((r) => r.category === "common_objections")) {
    const key = r.insight;
    objectionCounts[key] = (objectionCounts[key] ?? 0) + r.frequency_count;
  }
  const topObjections = Object.entries(objectionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, frequency]) => ({ category, frequency, win_rate: 0 })); // win_rate requires cross-referencing outcome data

  // Trust blockers
  const trustBlockers = Array.from(new Set(
    filtered.filter((r) => r.category === "trust_blockers").map((r) => r.insight)
  )).slice(0, 5);

  // Emotional pain patterns
  const emotionalPainPatterns = Array.from(new Set(
    filtered.filter((r) => r.category === "emotional_pain_patterns").map((r) => r.insight)
  )).slice(0, 5);

  // Offer resonance signals
  const offerResonanceSignals = Array.from(new Set(
    filtered.filter((r) => r.category === "offer_resonance" && r.confidence !== "low").map((r) => r.insight)
  )).slice(0, 5);

  return {
    vertical,
    period_start: periodStart,
    period_end: periodEnd,
    call_count: callCount,
    top_objections: topObjections,
    avg_close_probability: 0,   // Requires cross-referencing with session outcome data
    avg_discovery_depth: 0,     // Requires cross-referencing with session discovery data
    trust_blockers: trustBlockers,
    emotional_pain_patterns: emotionalPainPatterns,
    offer_resonance_signals: offerResonanceSignals,
    generated_at: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// Intelligence format helpers (for Veronica consumption)
// ─────────────────────────────────────────────────────────────

/**
 * Format SharedIntelligenceRecords as a Veronica-compatible context string.
 * This is the handoff format for sending Victoria's insights to Veronica's AI agents.
 * NOT yet connected to Veronica — building the interface for future integration.
 */
export function formatForVeronica(records: SharedIntelligenceRecord[]): string {
  if (records.length === 0) return "No shared intelligence available.";

  const grouped: Record<SharedIntelligenceCategory, SharedIntelligenceRecord[]> = {
    common_objections:       [],
    lead_quality_issues:     [],
    offer_resonance:         [],
    emotional_pain_patterns: [],
    vertical_specific_trends:[],
    trust_blockers:          [],
  };

  for (const r of records) {
    grouped[r.category].push(r);
  }

  const sections: string[] = [];

  if (grouped.common_objections.length > 0) {
    sections.push("SALES OBJECTIONS VICTORIA IS HEARING:");
    grouped.common_objections.forEach((r) => sections.push(`  - [${r.vertical}] ${r.insight}`));
  }

  if (grouped.emotional_pain_patterns.length > 0) {
    sections.push("\nEMOTIONAL PAIN PATTERNS:");
    grouped.emotional_pain_patterns.forEach((r) => sections.push(`  - [${r.vertical}] ${r.insight}: ${r.evidence}`));
  }

  if (grouped.offer_resonance.length > 0) {
    sections.push("\nOFFER RESONANCE SIGNALS:");
    grouped.offer_resonance.forEach((r) => sections.push(`  - [${r.vertical}] ${r.insight}`));
  }

  if (grouped.trust_blockers.length > 0) {
    sections.push("\nTRUST BLOCKERS THAT HURT SALES VELOCITY:");
    grouped.trust_blockers.forEach((r) => sections.push(`  - [${r.vertical}] ${r.insight}`));
  }

  if (grouped.lead_quality_issues.length > 0) {
    sections.push("\nLEAD QUALITY CONCERNS FROM SALES TEAM:");
    grouped.lead_quality_issues.forEach((r) => sections.push(`  - [${r.vertical}] ${r.insight}`));
  }

  return sections.join("\n");
}
