// Vault Core — Vera/Vesper ALWAYS-ON recommendation hygiene pass.
//
// Runs at the END of every Vault Core tick (wired in the dispatcher) as a safe
// internal maintenance pass over the CURRENT open recommendations. It is FAIL-OPEN
// and never blocks the tick. It uses safe, bounded Vault Memory context to keep
// Mission Control high-signal.
//
// HARD LIMITS — this pass:
//   • makes NO external calls (no GHL/Stripe/Meta/SMS/email/calling/workflow), no
//     Codex, no Hermes dependency;
//   • NEVER approves/rejects/implements, never changes a recommendation's `status`;
//   • NEVER hard-deletes and NEVER erases evidence/audit history;
//   • only writes SOFT, reversible metadata (classification + visibility) via
//     patchRecommendationMetadata, and folds merged evidence into a canonical row.
// Humans still approve everything. Vera/Vesper are NOT executives.

import {
  getRecommendations,
  getActivity,
  getGraph,
  insertActivity,
  patchRecommendationMetadata,
} from "../memory/db";
import { scoreRecommendation } from "./scoring";
import { findDuplicate } from "./dedupe";
import { buildRecommendationMemoryContext } from "./memory-context";
import type { ExistingRecommendation, RecommendationCandidate } from "./types";
import type { VaultRecommendationRow } from "../types";

export type HygieneDecision =
  | "keep_visible"
  | "merge_into_existing"
  | "suppress_from_mission_control"
  | "downgrade_priority"
  | "needs_human_review"
  | "stale_archive_candidate";

export interface HygieneSummary {
  reviewed: number;
  keptVisible: number;
  merged: number;
  suppressed: number;
  downgraded: number;
  needsReview: number;
  staleArchive: number;
  avgQuality: number;
  ranAt: string;
  persisted: boolean;
}

const STALE_AFTER_MS = 21 * 24 * 60 * 60 * 1000; // 21 days open + unacted → stale
const HIDDEN: HygieneDecision[] = ["merge_into_existing", "suppress_from_mission_control", "stale_archive_candidate"];

function toCandidate(r: VaultRecommendationRow): RecommendationCandidate {
  return {
    agent: r.agent,
    title: r.title,
    body: r.body,
    impact: r.impact,
    priority_score: r.priority_score,
    related_clients: r.related_clients,
    metadata: r.metadata,
  };
}

function toExisting(r: VaultRecommendationRow): ExistingRecommendation {
  return {
    id: r.id, agent: r.agent, title: r.title, body: r.body, status: r.status,
    related_clients: r.related_clients, created_at: r.created_at, metadata: r.metadata,
  };
}

/**
 * Run a single hygiene pass. Safe to call every tick. Returns a summary even when
 * there is no DB (mock mode) — in that case it classifies in-memory and persists
 * nothing.
 */
export async function runRecommendationHygiene(): Promise<HygieneSummary> {
  const ranAt = new Date().toISOString();
  const summary: HygieneSummary = {
    reviewed: 0, keptVisible: 0, merged: 0, suppressed: 0, downgraded: 0,
    needsReview: 0, staleArchive: 0, avgQuality: 0, ranAt, persisted: false,
  };

  // Gather context (all mock-safe reads). Any failure → graceful skip.
  let allRecs: VaultRecommendationRow[] = [];
  let graphNodes: { id: string; category: string; label: string; summary?: string | null; updated_at?: string }[] = [];
  let graphEdges: { from_node: string; to_node: string; relationship: string }[] = [];
  let activity: { agent: string; message: string; created_at: string }[] = [];
  try {
    const [recs, graph, act] = await Promise.all([getRecommendations(500), getGraph(), getActivity(50)]);
    allRecs = recs;
    graphNodes = graph.nodes;
    graphEdges = graph.edges;
    activity = act;
  } catch (e) {
    console.error("[hygiene] context read failed — skipping pass:", (e as Error).message);
    return summary;
  }

  const open = allRecs.filter((r) => r.status === "pending_review");
  if (open.length === 0) return summary;

  // Pre-score everything so "canonical" (the strongest in a duplicate pair) is
  // deterministic: higher quality wins; older wins ties.
  const scored = new Map<string, number>();
  for (const r of open) scored.set(r.id, scoreRecommendation(toCandidate(r)).qualityScore);

  let qualitySum = 0;
  const now = Date.now();

  for (const rec of open) {
    summary.reviewed += 1;
    const cand = toCandidate(rec);
    const others = open.filter((o) => o.id !== rec.id).map(toExisting);
    const q = scoreRecommendation(cand);
    qualitySum += q.qualityScore;

    const context = buildRecommendationMemoryContext(cand, {
      openRecs: others,
      allRecs: allRecs.map(toExisting),
      nodes: graphNodes,
      edges: graphEdges,
      activity,
    });

    const dup = findDuplicate(cand, others);
    let decision: HygieneDecision = "keep_visible";
    let reason = "Clear, specific, still relevant.";
    let mergeTargetId: string | null = null;

    const ageMs = now - new Date(rec.created_at).getTime();

    if (q.safetyStatus === "unsafe" || context.contradictionIndicators.length > 0) {
      decision = "needs_human_review";
      reason = q.safetyStatus === "unsafe"
        ? "Wording implies external execution — needs human review."
        : `Conflicts with existing knowledge (${context.contradictionIndicators.join("; ")}).`;
    } else if (dup.relation !== "none" && dup.duplicateOfId) {
      // Only the WEAKER of the pair merges into the canonical (stronger) one.
      const otherQ = scored.get(dup.duplicateOfId) ?? 0;
      const iAmCanonical = q.qualityScore > otherQ || (q.qualityScore === otherQ && rec.id < dup.duplicateOfId);
      if (iAmCanonical) {
        decision = "keep_visible";
        reason = "Canonical of a duplicate cluster — kept visible.";
      } else {
        decision = "merge_into_existing";
        mergeTargetId = dup.duplicateOfId;
        reason = `Duplicate of stronger open recommendation ${dup.duplicateOfId} — merged.`;
      }
    } else if (context.priorActions.some((p) => p.status === "implemented" || p.status === "approved")) {
      decision = "stale_archive_candidate";
      reason = "A prior recommendation for this client/topic was already actioned.";
    } else if (Number.isFinite(ageMs) && ageMs > STALE_AFTER_MS) {
      decision = "stale_archive_candidate";
      reason = `Open and unacted for ${Math.round(ageMs / (24 * 60 * 60 * 1000))} days.`;
    } else if (q.qualityScore < 0.32 && q.actionability < 0.4) {
      decision = "suppress_from_mission_control";
      reason = `Low quality and not actionable. ${q.issues.join(" ")}`.trim();
    } else if (q.qualityScore < 0.5) {
      decision = "downgrade_priority";
      reason = `Borderline quality (${q.qualityScore.toFixed(2)}) — kept but de-emphasized.`;
    }

    // Tally.
    if (decision === "keep_visible") summary.keptVisible += 1;
    else if (decision === "merge_into_existing") summary.merged += 1;
    else if (decision === "suppress_from_mission_control") summary.suppressed += 1;
    else if (decision === "downgrade_priority") summary.downgraded += 1;
    else if (decision === "needs_human_review") summary.needsReview += 1;
    else if (decision === "stale_archive_candidate") summary.staleArchive += 1;

    // Soft, reversible metadata only — status untouched, never deleted.
    const patched = await patchRecommendationMetadata(rec.id, {
      hygiene: {
        classification: decision,
        visibility: HIDDEN.includes(decision) ? "hidden" : "visible",
        qualityScore: Number(q.qualityScore.toFixed(3)),
        reason,
        mergeTargetId,
        relatedRecommendationIds: context.relatedOpenRecommendations.map((r) => r.id),
        memoryContextUsed: context.used,
        reviewedBy: ["vera", "vesper"],
        neverAutoExecute: true,
        lastHygieneAt: ranAt,
      },
    });
    if (patched) summary.persisted = true;

    // Fold the weaker duplicate's evidence into the canonical (metadata only).
    if (decision === "merge_into_existing" && mergeTargetId) {
      try {
        const target = allRecs.find((r) => r.id === mergeTargetId);
        const meta = (target?.metadata ?? {}) as Record<string, unknown>;
        const mergeCount = typeof meta.merge_count === "number" ? (meta.merge_count as number) + 1 : 1;
        await patchRecommendationMetadata(mergeTargetId, {
          // NON-PII merge trace only — ids/agent, never verbatim body/title text.
          merge_count: mergeCount,
          last_merged_at: ranAt,
          merged_source_agent: rec.agent,
          merged_source_recommendation_id: rec.id,
        });
      } catch { /* non-fatal */ }
    }
  }

  summary.avgQuality = open.length > 0 ? Number((qualitySum / open.length).toFixed(3)) : 0;

  // Mission Control hygiene signal — a single auditable activity entry (surfaces
  // in the Operations Feed). Clearly a backend QA layer, not an executive.
  try {
    await insertActivity({
      agent: "hygiene",
      kind: "monitor",
      message:
        `Recommendation hygiene (Vera/Vesper): ${summary.reviewed} reviewed · ${summary.keptVisible} kept · ` +
        `${summary.merged} merged · ${summary.suppressed} suppressed · ${summary.downgraded} downgraded · ` +
        `${summary.needsReview} need review · ${summary.staleArchive} stale · avg quality ${summary.avgQuality}.`,
      node_id: null,
      metadata: { hygiene_summary: summary as unknown as Record<string, unknown>, backendQa: true },
    });
  } catch { /* non-fatal */ }

  return summary;
}
