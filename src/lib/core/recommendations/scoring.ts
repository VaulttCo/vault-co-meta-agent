// Vault Core — VERA: Recommendation Quality Auditor (backend QA layer).
//
// Vera is NOT an active executive, NOT a runtime agent, NOT in ACTIVE_AGENT_IDS or
// RUNNABLE_AGENTS, and never appears in the workforce ring. She is a set of PURE,
// deterministic scoring functions that judge whether a candidate recommendation is
// useful, specific, clear, safe, evidence-supported, and free of any implication
// that the AI executed an external action. No I/O, no DB, no external calls.

import type { RecommendationCandidate } from "./types";

export type SafetyStatus = "safe" | "needs_human_review" | "unsafe";
export type Priority = "urgent" | "high" | "medium" | "low";

export interface QualityScore {
  qualityScore: number; // 0..1 overall usefulness/specificity/evidence
  actionability: number; // 0..1 — does it state a clear next HUMAN action?
  confidence: number; // 0..1 — evidence support
  priority: Priority;
  safetyStatus: SafetyStatus;
  issues: string[]; // human-readable reasons for any downgrade/flag
}

// Vague / filler phrasing that signals a weak, non-specific recommendation.
const VAGUE_PATTERNS = [
  /\bimprove (things|stuff|everything|performance)\b/i,
  /\bdo better\b/i,
  /\boptimi[sz]e (things|everything)\b/i,
  /\bgeneral(ly)? (review|improvement)\b/i,
  /\bmake .* better\b/i,
  /\bkeep (it )?up\b/i,
];

// Clear next-HUMAN-action verbs (Vault Core recommends; humans act).
const ACTION_VERBS = [
  "review", "approve", "rewrite", "investigate", "follow up", "follow-up",
  "prepare", "prioritize", "check", "resolve", "confirm", "audit", "reach out",
];

// Phrases implying the AI itself executed an external action. These must never
// appear in a recommendation — Vault Core never sends/launches/charges/mutates.
const UNSAFE_EXECUTION_PATTERNS = [
  /\bautomatically (sent|launched|charged|updated|triggered|emailed|texted|called|messaged)\b/i,
  /\b(ads?|campaigns?) (were |was )?launched\b/i,
  /\bbudget (was |has been )?(changed|increased|decreased|updated)\b/i,
  /\binvoice (was |has been )?(sent|charged|created and sent)\b/i,
  /\bworkflow (was |has been )?triggered\b/i,
  /\b(i|we) (have )?(sent|emailed|texted|called|messaged|charged|launched)\b/i,
  /\bghl (was |has been )?(updated|mutated|written)\b/i,
  /\bstripe (was |has been )?(charged|updated)\b/i,
];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function text(candidate: RecommendationCandidate): string {
  return `${candidate.title ?? ""} ${candidate.body ?? ""}`.trim();
}

function priorityFromScore(score: number): Priority {
  if (score >= 0.8) return "urgent";
  if (score >= 0.6) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

/** Vera's verdict on a single candidate. Pure + deterministic. */
export function scoreRecommendation(candidate: RecommendationCandidate): QualityScore {
  const issues: string[] = [];
  const title = (candidate.title ?? "").trim();
  const body = (candidate.body ?? "").trim();
  const blob = text(candidate);

  // ── Safety: does the wording imply the AI executed something external? ──
  let safetyStatus: SafetyStatus = "safe";
  if (UNSAFE_EXECUTION_PATTERNS.some((re) => re.test(blob))) {
    safetyStatus = "unsafe";
    issues.push("Wording implies external execution by the AI — must be recommend-only.");
  }

  // ── Quality signals ──
  let quality = 0.5;

  if (!title) { quality -= 0.4; issues.push("Missing title."); }
  if (title.length < 8) { quality -= 0.15; issues.push("Title too short to be specific."); }
  if (!body || body.length < 24) { quality -= 0.2; issues.push("Little or no supporting detail/evidence."); }
  if (VAGUE_PATTERNS.some((re) => re.test(blob))) { quality -= 0.25; issues.push("Vague / generic phrasing."); }

  // Evidence support: numbers, named entities, or linked clients raise confidence.
  const hasNumber = /\d/.test(blob);
  const linkedClients = candidate.related_clients?.length ?? 0;
  const evidenceFromMeta = candidate.metadata && typeof candidate.metadata === "object"
    ? Array.isArray((candidate.metadata as { sourceSignals?: unknown }).sourceSignals)
      ? ((candidate.metadata as { sourceSignals?: unknown[] }).sourceSignals as unknown[]).length
      : 0
    : 0;
  let confidence = 0.4;
  if (hasNumber) confidence += 0.15;
  if (linkedClients > 0) confidence += 0.2;
  if (evidenceFromMeta > 0) confidence += Math.min(0.2, evidenceFromMeta * 0.1);
  if (body.length >= 80) confidence += 0.1;
  confidence = clamp01(confidence);
  if (confidence < 0.45) issues.push("Weak evidence support.");

  // Actionability: is there a clear next human action?
  const lower = blob.toLowerCase();
  const hasAction = ACTION_VERBS.some((v) => lower.includes(v));
  const actionability = clamp01(hasAction ? 0.7 + (lower.includes("human") ? 0.2 : 0) : 0.25);
  if (!hasAction) { quality -= 0.2; issues.push("No clear next human action."); }

  // Reward concrete, evidence-backed, actionable items.
  quality += confidence * 0.25 + actionability * 0.25;
  quality = clamp01(quality);

  const priority = priorityFromScore(candidate.priority_score ?? 0.5);

  return { qualityScore: quality, actionability, confidence, priority, safetyStatus, issues };
}
