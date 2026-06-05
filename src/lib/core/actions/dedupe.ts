// Vault Core — Action deduplication (Phase 9.1). PURE.
//
// Stops auto-generation from spamming /actions with near-identical actions every
// tick. A candidate is a duplicate of an existing action when they share the same
// agent + action_type + target, OR the same source signal (source_type/source_id),
// AND the existing action is still "live" (pending_review / approved / needs_revision
// — NOT rejected/archived/executed-terminal), within a recency window. Title
// similarity (token Jaccard) catches reworded repeats.
//
// No I/O — callers pass the existing actions in. Never mutates anything.

import type { VaultAction, VaultActionInput } from "./types";
import { DEDUPE_WINDOW_HOURS } from "./generation-policy";

// Approval states that still "occupy" the queue — a new copy would be noise.
const LIVE_STATUSES = new Set(["pending_review", "approved", "needs_revision"]);
const TITLE_SIMILARITY_THRESHOLD = 0.7;

function normalize(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((w) => w.length > 2));
}

/** Token-set Jaccard similarity (0..1) between two titles. */
export function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function withinWindow(iso: string | null | undefined, now: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return now - t <= DEDUPE_WINDOW_HOURS * 3600 * 1000;
}

export interface DuplicateResult {
  isDuplicate: boolean;
  /** Strongest similarity (0..1) found against a live existing action. */
  duplicateScore: number;
  /** id of the matched existing action, if any. */
  matchedId: string | null;
  reason: string | null;
}

/**
 * Decide whether `candidate` duplicates any of `existing`. Only LIVE, in-window
 * actions are considered. Returns the best match + a 0..1 duplicate score (used as
 * quality metadata even when not a hard duplicate).
 */
export function findDuplicateAction(candidate: VaultActionInput, existing: VaultAction[]): DuplicateResult {
  const now = Date.now();
  let best: DuplicateResult = { isDuplicate: false, duplicateScore: 0, matchedId: null, reason: null };

  for (const a of existing) {
    if (a.agent_id !== candidate.agent_id) continue;

    // Same source signal → PERMANENT duplicate across ANY status (the core anti-spam
    // guard). Not time-windowed and NOT limited to live statuses: once an action has
    // been generated for this exact signal — even if a human REJECTED or ARCHIVED it
    // — the same recommendation must never re-spawn another. This respects the human's
    // decision and stops a still-pending recommendation regenerating it every tick.
    const sameSource =
      !!candidate.source_type && !!candidate.source_id &&
      a.source_type === candidate.source_type && a.source_id === candidate.source_id;
    if (sameSource) {
      return { isDuplicate: true, duplicateScore: 1, matchedId: a.id, reason: "same source signal" };
    }

    // Fuzzy title match only blocks against LIVE, RECENT actions (an old or
    // rejected/archived similar-titled action shouldn't block a fresh, genuinely-new
    // one), so keep both the live-status and time-window filters here.
    if (!LIVE_STATUSES.has(a.approval_status)) continue;
    if (!withinWindow(a.created_at, now)) continue;
    const sameLane = a.action_type === candidate.action_type;
    const sim = titleSimilarity(a.title, candidate.title);
    if (sim > best.duplicateScore) {
      best = {
        isDuplicate: sameLane && sim >= TITLE_SIMILARITY_THRESHOLD,
        duplicateScore: sim,
        matchedId: a.id,
        reason: sameLane && sim >= TITLE_SIMILARITY_THRESHOLD ? "similar title in same action lane" : null,
      };
    }
  }

  return best;
}
