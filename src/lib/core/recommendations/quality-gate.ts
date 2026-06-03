// Vault Core — Recommendation Quality Gate (Vera + Vesper orchestrator).
//
// Runs AFTER an agent produces a candidate recommendation and BEFORE it is saved
// or surfaced (wired into insertRecommendation). It is PURE + deterministic, makes
// NO external calls, mutates nothing, and never sends/launches/charges. It only
// decides whether a candidate should be kept, merged/suppressed as a duplicate,
// downgraded for weakness, or flagged for human review. Approvals stay human-only;
// every surviving recommendation is still created as `pending_review`.
//
// Vera  = quality (useful / specific / safe / evidence-supported)  → scoring.ts
// Vesper = dedupe / coherence (no duplicate spam for the same issue) → dedupe.ts

import { scoreRecommendation, type QualityScore, type Priority, type SafetyStatus } from "./scoring";
import { findDuplicate } from "./dedupe";
import type { RecommendationCandidate, ExistingRecommendation } from "./types";

export type FinalDecision = "keep" | "merge" | "suppress" | "downgrade" | "needs_human_review";

export interface GateDecision {
  qualityScore: number;
  duplicateScore: number;
  confidence: number;
  priority: Priority;
  actionability: number;
  safetyStatus: SafetyStatus;
  finalDecision: FinalDecision;
  reason: string;
  /** Existing open recommendation this candidate duplicates / merges into. */
  mergeTargetId: string | null;
}

// Thresholds tuned conservatively — the gate is a quality SAFETY NET, so it
// only suppresses clear duplicates / clearly-weak items and otherwise keeps.
const SUPPRESS_QUALITY = 0.32; // below this with no other value → drop
const DOWNGRADE_QUALITY = 0.5; // below this → keep but lower priority

/**
 * Decide what to do with a candidate recommendation given the current open
 * recommendations. Pure + deterministic; fail-safe by design (callers should
 * fail OPEN — i.e. keep — if they cannot gather existing recommendations).
 */
export function runQualityGate(
  candidate: RecommendationCandidate,
  existingOpen: ExistingRecommendation[]
): GateDecision {
  const q: QualityScore = scoreRecommendation(candidate);
  const dup = findDuplicate(candidate, existingOpen);

  let finalDecision: FinalDecision = "keep";
  let reason = "Passed quality gate.";

  // 1. Duplicate handling first — don't spam Mission Control with the same issue.
  if (dup.relation === "exact") {
    finalDecision = "suppress";
    reason = `Exact duplicate of open recommendation ${dup.duplicateOfId}.`;
  } else if (dup.relation === "near") {
    // Near-duplicate of an existing OPEN rec for the same client/issue → the
    // existing one is the canonical; fold this in rather than create a second.
    finalDecision = "merge";
    reason = `Near-duplicate of open recommendation ${dup.duplicateOfId} (same issue) — merged.`;
  }
  // 2. Safety: wording implies external execution → never silently drop; flag it.
  else if (q.safetyStatus === "unsafe") {
    finalDecision = "needs_human_review";
    reason = "Wording implies external execution — flagged for human review (Vault Core is recommend-only).";
  }
  // 3. Quality: clearly weak/vague with no evidence → suppress the noise.
  else if (q.qualityScore < SUPPRESS_QUALITY && q.actionability < 0.4) {
    finalDecision = "suppress";
    reason = `Low quality (${q.qualityScore.toFixed(2)}) and not actionable — suppressed. ${q.issues.join(" ")}`.trim();
  }
  // 4. Borderline → keep but downgrade priority so it doesn't crowd strong items.
  else if (q.qualityScore < DOWNGRADE_QUALITY) {
    finalDecision = "downgrade";
    reason = `Borderline quality (${q.qualityScore.toFixed(2)}) — kept but downgraded. ${q.issues.join(" ")}`.trim();
  }

  return {
    qualityScore: q.qualityScore,
    duplicateScore: dup.duplicateScore,
    confidence: q.confidence,
    priority: q.priority,
    actionability: q.actionability,
    safetyStatus: q.safetyStatus,
    finalDecision,
    reason,
    mergeTargetId: dup.duplicateOfId,
  };
}

/** Compact, JSON-safe summary to stamp into a recommendation's metadata. */
export function gateMetadata(decision: GateDecision): Record<string, unknown> {
  return {
    quality_gate: {
      qualityScore: Number(decision.qualityScore.toFixed(3)),
      duplicateScore: Number(decision.duplicateScore.toFixed(3)),
      confidence: Number(decision.confidence.toFixed(3)),
      actionability: Number(decision.actionability.toFixed(3)),
      safetyStatus: decision.safetyStatus,
      finalDecision: decision.finalDecision,
      checkedBy: ["vera", "vesper"],
    },
  };
}
