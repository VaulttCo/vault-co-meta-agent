// Vault Core — shared types (Layer 1: Vault Memory)
//
// Row types are kept isolated from the shared `Database` generic (same pattern
// as src/lib/victoria/types.ts) so the Vault Core tables are safe to use before
// `supabase gen types` is re-run. All DB access goes through a typed escape
// hatch in src/lib/core/memory/db.ts.

// ─────────────────────────────────────────────────────────────
// Node / edge model
// ─────────────────────────────────────────────────────────────

// Category list mirrors the knowledge-graph node categories in the spec, plus
// two internal categories: `insight` (what agents produce) and `memory_core`
// (the single center node that everything connects around).
export type VaultNodeCategory =
  | "memory_core"
  | "agent"
  | "insight"
  | "recommendation"
  | "lead"
  | "client"
  | "campaign"
  | "ad"
  | "hook"
  | "script"
  | "conversation"
  | "call"
  | "revenue_event"
  | "sop"
  | "workflow"
  | "proposal"
  | "portal_system"
  | "decision"
  | "initiative";

export type VaultEdgeRelationship =
  | "connected_to"
  | "influences"
  | "contributed_by"
  | "impacts"
  | "derived_from";

export type VaultActivityKind =
  | "insight"
  | "analysis"
  | "recommendation"
  | "memory_update"
  | "collaboration"
  | "monitor";

export type AgentTier = "5min" | "15min" | "hourly" | "daily" | "weekly" | "monthly";

export type AgentRunStatus = "success" | "error" | "skipped";

export type RecommendationStatus = "open" | "reviewed" | "accepted" | "dismissed";

// ─────────────────────────────────────────────────────────────
// Row types (what the DB returns on SELECT)
// ─────────────────────────────────────────────────────────────

export interface VaultNodeRow {
  id: string;
  category: VaultNodeCategory;
  label: string;
  summary: string | null;
  confidence: number;
  source_agent: string | null;
  ref_type: string | null;
  ref_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface VaultEdgeRow {
  id: string;
  from_node: string;
  to_node: string;
  relationship: VaultEdgeRelationship;
  weight: number;
  source_agent: string | null;
  created_at: string;
}

export interface VaultActivityRow {
  id: string;
  agent: string;
  kind: VaultActivityKind;
  message: string;
  node_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface VaultRecommendationRow {
  id: string;
  agent: string;
  title: string;
  body: string | null;
  impact: string | null;
  priority_score: number;
  status: RecommendationStatus;
  node_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface VaultAgentRunRow {
  id: string;
  agent: string;
  tier: AgentTier;
  status: AgentRunStatus;
  nodes_created: number;
  edges_created: number;
  recommendations_created: number;
  activity_created: number;
  duration_ms: number | null;
  detail: string | null;
  started_at: string;
  finished_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// Insert inputs (id / timestamps assigned by caller or DB defaults)
// ─────────────────────────────────────────────────────────────

export interface VaultNodeInput {
  id?: string;
  category: VaultNodeCategory;
  label: string;
  summary?: string | null;
  confidence?: number;
  source_agent?: string | null;
  ref_type?: string | null;
  ref_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface VaultEdgeInput {
  from_node: string;
  to_node: string;
  relationship?: VaultEdgeRelationship;
  weight?: number;
  source_agent?: string | null;
}

export interface VaultActivityInput {
  agent: string;
  kind?: VaultActivityKind;
  message: string;
  node_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface VaultRecommendationInput {
  agent: string;
  title: string;
  body?: string | null;
  impact?: string | null;
  priority_score?: number;
  node_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface VaultAgentRunInput {
  agent: string;
  tier: AgentTier;
  status: AgentRunStatus;
  nodes_created?: number;
  edges_created?: number;
  recommendations_created?: number;
  activity_created?: number;
  duration_ms?: number | null;
  detail?: string | null;
  started_at?: string;
  finished_at?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Read-model shapes consumed by the UI
// ─────────────────────────────────────────────────────────────

export interface VaultGraph {
  nodes: VaultNodeRow[];
  edges: VaultEdgeRow[];
}

export interface MemoryOverview {
  totalNodes: number;
  totalRelationships: number;
  knowledgeGrowthToday: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  recommendationVolume: number;
  connectedSystems: number;
  activeContributors: number;
  relationshipDensity: number;   // edges / nodes, rounded
  intelligenceVelocity: number;  // nodes created in last 24h
}

export interface MemoryHealth {
  completeness: number;          // 0..100
  freshness: number;             // 0..100
  relationshipDensity: number;   // 0..100
  utilizationScore: number;      // 0..100
  duplicateRate: number;         // 0..100 (lower better)
  growthRate: number;            // 0..100
  confidence: number;            // 0..100 (avg node confidence)
  recommendationAccuracy: number;// 0..100
}

// ─────────────────────────────────────────────────────────────
// Agent metadata (workforce roster)
// ─────────────────────────────────────────────────────────────

export interface AgentMeta {
  id: string;            // stable slug, e.g. "vega"
  name: string;          // "Vega"
  title: string;         // "Intelligence Director"
  mission: string;
  color: string;         // Veronica Design accent
  active: boolean;       // Phase 1: only Vega is active
  tiers: AgentTier[];    // which cycle tiers this agent participates in
}

export interface AgentRunResult {
  status: AgentRunStatus;
  nodesCreated: number;
  edgesCreated: number;
  recommendationsCreated: number;
  activityCreated: number;
  detail: string;
}
