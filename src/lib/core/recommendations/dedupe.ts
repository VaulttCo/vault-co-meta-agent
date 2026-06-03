// Vault Core — VESPER: Recommendation Deduplication & Coherence Auditor.
//
// Vesper is NOT an active executive, NOT a runtime agent, NOT in ACTIVE_AGENT_IDS
// or RUNNABLE_AGENTS, and never appears in the workforce ring. She is a set of
// PURE, deterministic functions that decide whether a candidate recommendation
// duplicates an existing OPEN recommendation (same client + same issue + same
// action) so Mission Control stays high-signal and never fills with spam.
// No I/O, no DB, no external calls.

import type { RecommendationCandidate, ExistingRecommendation } from "./types";

export type DuplicateRelation = "none" | "near" | "exact";

export interface DuplicateResult {
  duplicateScore: number; // 0..1 — strongest similarity found vs existing open recs
  relation: DuplicateRelation;
  duplicateOfId: string | null;
}

const STOPWORDS = new Set([
  "the", "a", "an", "to", "of", "for", "and", "or", "is", "are", "in", "on", "at",
  "by", "with", "should", "human", "client", "review", "this", "that", "has", "have",
  "been", "be", "it", "as", "their", "his", "her", "they",
]);

function tokens(s: string | null | undefined): Set<string> {
  return new Set(
    (s ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function sharesClient(a: string[] | undefined, b: string[]): boolean {
  if (!a?.length || !b.length) return false;
  const set = new Set(b);
  return a.some((c) => set.has(c));
}

/**
 * Compare a candidate against the existing OPEN recommendations and return the
 * strongest duplicate relation found.
 *   • "exact" — same client and (near-)identical title (same issue + action)
 *   • "near"  — same client OR same agent, with high body/title token overlap
 * Pure + deterministic.
 */
export function findDuplicate(
  candidate: RecommendationCandidate,
  existingOpen: ExistingRecommendation[]
): DuplicateResult {
  const candTitle = tokens(candidate.title);
  const candBody = tokens(`${candidate.title} ${candidate.body ?? ""}`);

  let best: DuplicateResult = { duplicateScore: 0, relation: "none", duplicateOfId: null };

  for (const ex of existingOpen) {
    const sameClient = sharesClient(candidate.related_clients, ex.related_clients);
    const sameAgent = candidate.agent === ex.agent;

    const titleSim = jaccard(candTitle, tokens(ex.title));
    const bodySim = jaccard(candBody, tokens(`${ex.title} ${ex.body ?? ""}`));
    const sim = Math.max(titleSim, bodySim);

    let relation: DuplicateRelation = "none";
    if (sameClient && titleSim >= 0.8) {
      relation = "exact";
    } else if ((sameClient || sameAgent) && bodySim >= 0.6) {
      relation = "near";
    } else if (titleSim >= 0.9) {
      // Identical phrasing even without a shared client → still spam.
      relation = "exact";
    }

    const rank = (r: DuplicateRelation) => (r === "exact" ? 2 : r === "near" ? 1 : 0);
    if (rank(relation) > rank(best.relation) || (rank(relation) === rank(best.relation) && sim > best.duplicateScore)) {
      best = { duplicateScore: sim, relation, duplicateOfId: relation === "none" ? null : ex.id };
    }
  }

  return best;
}
