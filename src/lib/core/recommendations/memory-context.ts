// Vault Core — safe, bounded Vault Memory context for Vera/Vesper hygiene.
//
// PURE + deterministic. Callers fetch the raw sources (open recs, graph, activity)
// with the existing mock-safe db helpers and pass them in — this module never
// imports the DB (avoids a cycle with memory/db.ts → quality-gate.ts). It returns
// a SMALL, bounded, NON-PII context object: ids, categories, labels, summaries,
// timestamps only. It never returns raw credentials, raw provider payloads, raw
// GHL contacts, emails/phones/messages, tokens, or giant graph blobs.

import type { RecommendationCandidate, ExistingRecommendation } from "./types";

// Bounds — keep context small so it is cheap and high-signal.
const MAX_RECS = 8;
const MAX_NODES = 10;
const MAX_EDGES = 12;
const MAX_ACTIVITY = 8;
const STALE_AFTER_MS = 21 * 24 * 60 * 60 * 1000; // 21 days unacted → stale indicator

// Minimal shapes the builder needs (structurally satisfied by the real rows).
export interface ContextGraphNode { id: string; category: string; label: string; summary?: string | null; updated_at?: string }
export interface ContextGraphEdge { from_node: string; to_node: string; relationship: string }
export interface ContextActivity { agent: string; message: string; created_at: string }

export interface MemoryContextSources {
  openRecs: ExistingRecommendation[];
  allRecs?: ExistingRecommendation[]; // incl. resolved/merged (for prior actions)
  nodes?: ContextGraphNode[];
  edges?: ContextGraphEdge[];
  activity?: ContextActivity[];
}

// ID / category / relationship / status / count ONLY. This object deliberately
// carries NO verbatim recommendation titles, memory-node labels, activity
// messages, or summaries — those can contain lead/client-identifying text. The
// builder reads that text internally for matching, but never returns it, so no
// downstream consumer (e.g. metadata that gets persisted) can leak PII.
export interface RecommendationMemoryContext {
  used: boolean;
  relatedOpenRecommendations: { id: string; agent: string }[];
  relatedMemoryNodes: { id: string; category: string }[];
  relatedEdges: { from: string; to: string; relationship: string }[];
  relatedClientIds: string[]; // internal client slugs/ids only — never names/contacts
  recentActivityCount: number;
  recentActivityAgents: string[];
  priorActions: { id: string; status: string }[];
  duplicateCandidateIds: string[];
  staleIndicators: string[]; // "<id>: <days>d" — ids + day counts, no PII
  contradictionIndicators: string[]; // "<id>" references only, no PII
}

const STOPWORDS = new Set([
  "the", "a", "an", "to", "of", "for", "and", "or", "is", "are", "in", "on", "at",
  "by", "with", "should", "human", "client", "review", "this", "that", "has", "have",
]);

function tokens(s: string | null | undefined): Set<string> {
  return new Set(
    (s ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / Math.min(a.size, b.size);
}

function sharesClient(a: string[] | undefined, b: string[] | undefined): boolean {
  if (!a?.length || !b?.length) return false;
  const set = new Set(b);
  return a.some((c) => set.has(c));
}

export const EMPTY_CONTEXT: RecommendationMemoryContext = {
  used: false,
  relatedOpenRecommendations: [],
  relatedMemoryNodes: [],
  relatedEdges: [],
  relatedClientIds: [],
  recentActivityCount: 0,
  recentActivityAgents: [],
  priorActions: [],
  duplicateCandidateIds: [],
  staleIndicators: [],
  contradictionIndicators: [],
};

/**
 * Build a safe, bounded memory context for a candidate recommendation. Pure +
 * deterministic. Missing sources degrade gracefully (recommendation-only).
 */
export function buildRecommendationMemoryContext(
  candidate: RecommendationCandidate,
  sources: MemoryContextSources
): RecommendationMemoryContext {
  const candTokens = tokens(`${candidate.title} ${candidate.body ?? ""}`);
  const candClients = candidate.related_clients ?? [];
  const now = Date.now();

  // Related open recommendations (same client or strong token overlap).
  const related = sources.openRecs
    .map((r) => ({ r, rel: sharesClient(candClients, r.related_clients), sim: overlap(candTokens, tokens(`${r.title} ${r.body ?? ""}`)) }))
    .filter((x) => x.rel || x.sim >= 0.4)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, MAX_RECS);

  const duplicateCandidateIds = related.filter((x) => x.sim >= 0.6 && x.rel).map((x) => x.r.id);

  // Stale indicators — old, still-open, related items (id + day count only).
  const staleIndicators = related
    .filter((x) => {
      const t = new Date(x.r.created_at).getTime();
      return Number.isFinite(t) && now - t > STALE_AFTER_MS;
    })
    .map((x) => `${x.r.id}: ${Math.round((now - new Date(x.r.created_at).getTime()) / (24 * 60 * 60 * 1000))}d`);

  // Contradiction indicators — same client, opposite-leaning keywords. Text is
  // read locally; only the related rec id is returned (no verbatim text).
  const contradictionIndicators: string[] = [];
  for (const x of related) {
    const ex = `${x.r.title} ${x.r.body ?? ""}`.toLowerCase();
    const cand = `${candidate.title} ${candidate.body ?? ""}`.toLowerCase();
    if (x.rel && ((/pause|stop|reduce|lower/.test(cand) && /increase|scale|raise|grow/.test(ex)) ||
                  (/increase|scale|raise|grow/.test(cand) && /pause|stop|reduce|lower/.test(ex)))) {
      contradictionIndicators.push(x.r.id);
    }
  }

  // Related memory nodes (label/summary read locally for matching; id+category out).
  const nodes = (sources.nodes ?? [])
    .map((n) => ({ n, sim: overlap(candTokens, tokens(`${n.label} ${n.summary ?? ""}`)) }))
    .filter((x) => x.sim >= 0.3)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, MAX_NODES)
    .map((x) => x.n);
  const nodeIds = new Set(nodes.map((n) => n.id));

  const edges = (sources.edges ?? [])
    .filter((e) => nodeIds.has(e.from_node) || nodeIds.has(e.to_node))
    .slice(0, MAX_EDGES)
    .map((e) => ({ from: e.from_node, to: e.to_node, relationship: e.relationship }));

  // Recent activity — agents + count only (no verbatim messages).
  const recent = (sources.activity ?? []).slice(0, MAX_ACTIVITY);

  // Prior actions — resolved/merged recs for the same client AND same topic (token
  // overlap), so a resolved rec for an UNRELATED issue can't mark this one stale.
  const priorActions = (sources.allRecs ?? [])
    .filter(
      (r) =>
        r.status !== "pending_review" &&
        sharesClient(candClients, r.related_clients) &&
        overlap(candTokens, tokens(`${r.title} ${r.body ?? ""}`)) >= 0.4
    )
    .slice(0, MAX_RECS)
    .map((r) => ({ id: r.id, status: r.status }));

  return {
    used: true,
    relatedOpenRecommendations: related.map((x) => ({ id: x.r.id, agent: x.r.agent })),
    relatedMemoryNodes: nodes.map((n) => ({ id: n.id, category: n.category })),
    relatedEdges: edges,
    relatedClientIds: candClients.slice(0, MAX_RECS),
    recentActivityCount: recent.length,
    recentActivityAgents: Array.from(new Set(recent.map((a) => a.agent))),
    priorActions,
    duplicateCandidateIds,
    staleIndicators,
    contradictionIndicators,
  };
}
