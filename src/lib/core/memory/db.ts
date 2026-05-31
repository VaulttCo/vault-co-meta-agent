// Vault Core — Vault Memory DB helpers (server-side only).
//
// Typed escape hatch over the service-role Supabase client (same pattern as
// src/lib/victoria/db.ts) so the vault_* tables are usable before
// `supabase gen types` is re-run.
//
// MOCK-SAFE CONTRACT:
//   • Reads return the seeded mock graph when Supabase is unconfigured OR when
//     the vault_* tables don't exist yet (query errors are swallowed → mock).
//   • Writes no-op (and log) when Supabase is unconfigured. Vault Core never
//     throws just because the database isn't wired.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildMockGraph,
  buildMockActivity,
  buildMockRecommendations,
  buildMockAgentRuns,
} from "./mock-graph";
import type {
  VaultGraph,
  VaultNodeRow,
  VaultEdgeRow,
  VaultActivityRow,
  VaultRecommendationRow,
  VaultAgentRunRow,
  VaultNodeInput,
  VaultEdgeInput,
  VaultActivityInput,
  VaultRecommendationInput,
  VaultAgentRunInput,
  MemoryOverview,
  MemoryHealth,
} from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseServerClient();
}

export function isCoreDbAvailable(): boolean {
  return db() !== null;
}

const LOG = "[VaultCore:DB]";

// ─────────────────────────────────────────────────────────────
// READS  (mock fallback on missing client or query error)
// ─────────────────────────────────────────────────────────────

export async function getGraph(): Promise<VaultGraph> {
  const client = db();
  if (!client) return buildMockGraph();
  try {
    const [{ data: nodes, error: nErr }, { data: edges, error: eErr }] = await Promise.all([
      client.from("vault_nodes").select("*").order("created_at", { ascending: true }).limit(2000),
      client.from("vault_edges").select("*").limit(5000),
    ]);
    if (nErr || eErr || !nodes) return buildMockGraph();
    if ((nodes as VaultNodeRow[]).length === 0) return buildMockGraph();
    return { nodes: nodes as VaultNodeRow[], edges: (edges ?? []) as VaultEdgeRow[] };
  } catch {
    return buildMockGraph();
  }
}

export async function getActivity(limit = 30): Promise<VaultActivityRow[]> {
  const client = db();
  if (!client) return buildMockActivity(limit);
  try {
    const { data, error } = await client
      .from("vault_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data || (data as VaultActivityRow[]).length === 0) return buildMockActivity(limit);
    return data as VaultActivityRow[];
  } catch {
    return buildMockActivity(limit);
  }
}

export async function getRecommendations(limit = 25): Promise<VaultRecommendationRow[]> {
  const client = db();
  if (!client) return buildMockRecommendations();
  try {
    const { data, error } = await client
      .from("vault_recommendations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return buildMockRecommendations();
    return data as VaultRecommendationRow[];
  } catch {
    return buildMockRecommendations();
  }
}

export async function getAgentRuns(limit = 50): Promise<VaultAgentRunRow[]> {
  const client = db();
  if (!client) return buildMockAgentRuns();
  try {
    const { data, error } = await client
      .from("vault_agent_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error || !data) return buildMockAgentRuns();
    return data as VaultAgentRunRow[];
  } catch {
    return buildMockAgentRuns();
  }
}

// ─────────────────────────────────────────────────────────────
// Derived read-models (Overview + Health)
// Computed from the live graph + activity so they stay consistent with
// whatever source (DB or mock) is in play.
// ─────────────────────────────────────────────────────────────

export async function getOverview(): Promise<MemoryOverview> {
  const [graph, activity, recs] = await Promise.all([
    getGraph(),
    getActivity(200),
    getRecommendations(200),
  ]);

  const now = Date.now();
  const since = (ms: number) =>
    graph.nodes.filter((n) => now - new Date(n.created_at).getTime() <= ms).length;

  const contributors = new Set(
    graph.nodes.map((n) => n.source_agent).filter((a): a is string => !!a)
  );
  const systemCategories = new Set(graph.nodes.map((n) => n.category));

  const nodeCount = graph.nodes.length || 1;
  const last24hActivity = activity.filter(
    (a) => now - new Date(a.created_at).getTime() <= 24 * 60 * 60 * 1000
  ).length;

  return {
    totalNodes: graph.nodes.length,
    totalRelationships: graph.edges.length,
    knowledgeGrowthToday: since(24 * 60 * 60 * 1000),
    weeklyGrowth: since(7 * 24 * 60 * 60 * 1000),
    monthlyGrowth: since(30 * 24 * 60 * 60 * 1000),
    recommendationVolume: recs.length,
    connectedSystems: systemCategories.size,
    activeContributors: contributors.size,
    relationshipDensity: Math.round((graph.edges.length / nodeCount) * 100) / 100,
    intelligenceVelocity: last24hActivity,
  };
}

export async function getHealth(): Promise<MemoryHealth> {
  const [graph, recs] = await Promise.all([getGraph(), getRecommendations(200)]);
  const now = Date.now();
  const nodeCount = graph.nodes.length || 1;

  const avgConfidence =
    graph.nodes.reduce((s, n) => s + (n.confidence ?? 0), 0) / nodeCount;

  // Freshness: share of nodes updated within the last 7 days.
  const freshNodes = graph.nodes.filter(
    (n) => now - new Date(n.updated_at).getTime() <= 7 * 24 * 60 * 60 * 1000
  ).length;

  // Completeness: share of nodes that carry a summary.
  const withSummary = graph.nodes.filter((n) => !!n.summary).length;

  // Utilization: share of nodes that have at least one edge.
  const connected = new Set<string>();
  graph.edges.forEach((e) => {
    connected.add(e.from_node);
    connected.add(e.to_node);
  });

  const density = Math.min(1, graph.edges.length / nodeCount / 2);
  const accepted = recs.filter((r) => r.status === "accepted").length;
  const reviewed = recs.filter((r) => r.status !== "open").length || 1;

  const pct = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 100);

  return {
    completeness: pct(withSummary / nodeCount),
    freshness: pct(freshNodes / nodeCount),
    relationshipDensity: pct(density),
    utilizationScore: pct(connected.size / nodeCount),
    duplicateRate: pct(0.04), // Phase 1: dedup not yet implemented — placeholder low rate
    growthRate: pct(Math.min(1, graph.nodes.length / 50)),
    confidence: pct(avgConfidence),
    recommendationAccuracy: pct(accepted / reviewed),
  };
}

// ─────────────────────────────────────────────────────────────
// WRITES  (no-op + log when Supabase is unconfigured)
// Used by the agent runtime. Each returns the created row id (or null).
// ─────────────────────────────────────────────────────────────

export async function insertNode(input: VaultNodeInput): Promise<string | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("vault_nodes")
      .insert({
        category: input.category,
        label: input.label,
        summary: input.summary ?? null,
        confidence: input.confidence ?? 0.5,
        source_agent: input.source_agent ?? null,
        ref_type: input.ref_type ?? null,
        ref_id: input.ref_id ?? null,
        metadata: input.metadata ?? {},
      })
      .select("id")
      .single();
    if (error) {
      console.error(`${LOG} insertNode:`, error.message);
      return null;
    }
    return (data as { id: string }).id;
  } catch (e) {
    console.error(`${LOG} insertNode threw:`, (e as Error).message);
    return null;
  }
}

/**
 * Find a node by (category, label) or create it. Used to keep singleton
 * structural nodes — the memory_core center and per-agent nodes — idempotent
 * so repeated agent cycles don't duplicate them. Returns the node id, or null
 * when Supabase is unconfigured (mock mode).
 */
export async function ensureNode(input: VaultNodeInput): Promise<string | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data: existing } = await client
      .from("vault_nodes")
      .select("id")
      .eq("category", input.category)
      .eq("label", input.label)
      .limit(1)
      .maybeSingle();
    if (existing && (existing as { id: string }).id) {
      return (existing as { id: string }).id;
    }
  } catch {
    // fall through to insert
  }
  return insertNode(input);
}

export async function insertEdge(input: VaultEdgeInput): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const { error } = await client.from("vault_edges").upsert(
      {
        from_node: input.from_node,
        to_node: input.to_node,
        relationship: input.relationship ?? "connected_to",
        weight: input.weight ?? 0.5,
        source_agent: input.source_agent ?? null,
      },
      { onConflict: "from_node,to_node,relationship", ignoreDuplicates: true }
    );
    if (error) {
      console.error(`${LOG} insertEdge:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`${LOG} insertEdge threw:`, (e as Error).message);
    return false;
  }
}

export async function insertActivity(input: VaultActivityInput): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const { error } = await client.from("vault_activity").insert({
      agent: input.agent,
      kind: input.kind ?? "analysis",
      message: input.message,
      node_id: input.node_id ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) {
      console.error(`${LOG} insertActivity:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`${LOG} insertActivity threw:`, (e as Error).message);
    return false;
  }
}

export async function insertRecommendation(
  input: VaultRecommendationInput
): Promise<string | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("vault_recommendations")
      .insert({
        agent: input.agent,
        title: input.title,
        body: input.body ?? null,
        impact: input.impact ?? null,
        priority_score: input.priority_score ?? 0.5,
        status: "open", // always created as open — only humans advance it
        node_id: input.node_id ?? null,
        metadata: input.metadata ?? {},
      })
      .select("id")
      .single();
    if (error) {
      console.error(`${LOG} insertRecommendation:`, error.message);
      return null;
    }
    return (data as { id: string }).id;
  } catch (e) {
    console.error(`${LOG} insertRecommendation threw:`, (e as Error).message);
    return null;
  }
}

export async function insertAgentRun(input: VaultAgentRunInput): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const { error } = await client.from("vault_agent_runs").insert({
      agent: input.agent,
      tier: input.tier,
      status: input.status,
      nodes_created: input.nodes_created ?? 0,
      edges_created: input.edges_created ?? 0,
      recommendations_created: input.recommendations_created ?? 0,
      activity_created: input.activity_created ?? 0,
      duration_ms: input.duration_ms ?? null,
      detail: input.detail ?? null,
      started_at: input.started_at ?? new Date().toISOString(),
      finished_at: input.finished_at ?? new Date().toISOString(),
    });
    if (error) {
      console.error(`${LOG} insertAgentRun:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`${LOG} insertAgentRun threw:`, (e as Error).message);
    return false;
  }
}
