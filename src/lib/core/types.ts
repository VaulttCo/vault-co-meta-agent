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
  | "initiative"
  // Phase 4 — Financial Intelligence Layer (Valerie)
  | "financial_insight"
  | "revenue_trend"
  | "payment_risk"
  | "failed_payment_signal"
  | "partner_earnings_signal"
  | "forecast_signal"
  | "client_revenue_signal"
  | "commission_signal"
  // Phase 5 — Executive Oversight Layer (Vanessa)
  | "executive_brief"
  | "executive_priority"
  | "strategic_recommendation"
  | "risk_summary"
  | "opportunity_summary"
  | "workforce_performance_summary"
  | "decision_support_brief"
  | "company_priority"
  // Phase 6 — Conversation Intelligence Layer (Veronica)
  | "conversation_insight"
  | "lead_conversion_signal"
  | "sms_pattern"
  | "call_pattern"
  | "missed_opportunity"
  | "reactivation_opportunity"
  | "booking_signal"
  | "objection_pattern"
  | "follow_up_signal"
  | "appointment_risk"
  | "nurture_sequence_draft"
  | "sms_draft"
  | "hot_lead_signal"
  | "dead_conversation_signal"
  // Phase 6.8 — Vault Co Identity Core + legacy learning
  | "company_identity"
  | "brand_voice"
  | "target_market"
  | "core_offer"
  | "sales_positioning"
  | "objection_handling"
  | "messaging_principle"
  | "differentiation"
  | "proof_point"
  | "pricing_context"
  | "internal_principle"
  | "legacy_learning"
  // Phase 8.2 — Vivian, AI Client Success / Experience Operator (recommend-only)
  | "client_success_signal"
  | "client_experience_signal"
  | "retention_risk"
  | "onboarding_health"
  // Phase 8.4 — Valentina competitor intelligence (internal, manual-sourced)
  | "competitor_profile"
  | "competitor_capture"
  | "hook_pattern"
  | "offer_shift"
  | "creative_pattern"
  | "landing_page_pattern"
  | "pricing_positioning"
  | "market_signal";

export type VaultEdgeRelationship =
  | "connected_to"
  | "influences"
  | "contributed_by"
  | "impacts"
  | "derived_from"
  | "related_to"
  | "supports"
  | "requires_approval"
  | "has_identity"
  | "defines"
  | "guides";

export type VaultActivityKind =
  | "insight"
  | "analysis"
  | "recommendation"
  | "memory_update"
  | "collaboration"
  | "monitor";

export type AgentTier = "5min" | "15min" | "hourly" | "daily" | "weekly" | "monthly";

export type AgentRunStatus = "success" | "error" | "skipped";

// Human-review workflow (Phase 2). `pending_review` is the entry state.
export type RecommendationStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "archived"
  | "implemented";

// Actions a human operator can take in the Command Hub. None execute anything.
export type ReviewAction =
  | "approve"
  | "reject"
  | "archive"
  | "implement"
  | "request_revision";

// Vanessa's executive priority levels (Phase 5 Priority Engine).
export type VanessaPriority = "critical" | "high" | "medium" | "low" | "watch";

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
  impact: string | null;             // estimated business impact (human-readable)
  priority_score: number;
  status: RecommendationStatus;
  node_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Phase 2 — traceability + review
  influence_score: number;
  revenue_impact: string | null;
  related_clients: string[];
  related_campaigns: string[];
  related_conversations: string[];
  related_node_ids: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  implemented_at: string | null;
  // Phase 5 — Vanessa executive prioritization
  vanessa_priority: VanessaPriority | null;
  priority_reason: string | null;
}

export interface VaultRecommendationReviewRow {
  id: string;
  recommendation_id: string;
  action: ReviewAction;
  from_status: RecommendationStatus | null;
  to_status: RecommendationStatus;
  actor: string;
  notes: string | null;
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
  // Phase 2 traceability
  influence_score?: number;
  revenue_impact?: string | null;
  related_clients?: string[];
  related_campaigns?: string[];
  related_conversations?: string[];
  related_node_ids?: string[];
  vanessa_priority?: VanessaPriority | null;
  priority_reason?: string | null;
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

// Full traceability bundle for a single recommendation (Command Hub detail).
export interface RecommendationTrace {
  recommendation: VaultRecommendationRow;
  relatedNodes: VaultNodeRow[];        // source intelligence behind the rec
  contributingAgents: string[];
  relatedRecommendations: VaultRecommendationRow[];
  reviews: VaultRecommendationReviewRow[];
}

export interface RecommendationCounts {
  pending_review: number;
  approved: number;
  rejected: number;
  archived: number;
  implemented: number;
  total: number;
  // Phase 8.3 — pending_review recommendations NOT hidden from Mission Control by
  // the Vera/Vesper hygiene pass (soft visibility; the full queue still shows all).
  mission_visible?: number;
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

// ─────────────────────────────────────────────────────────────
// Phase 3 — Workforce Collaboration Engine
// ─────────────────────────────────────────────────────────────

export type AgentMessageKind =
  | "share_discovery"
  | "request_analysis"
  | "escalate"
  | "share_context"
  | "assign_investigation"
  | "joint_proposal"
  | "response";

export interface AgentMessageRow {
  id: string;
  from_agent: string;
  to_agent: string | null;
  kind: AgentMessageKind;
  subject: string;
  body: string | null;
  related_node_ids: string[];
  collaboration_id: string | null;
  read_at: string | null;
  created_at: string;
}
export interface AgentMessageInput {
  from_agent: string;
  to_agent?: string | null;
  kind?: AgentMessageKind;
  subject: string;
  body?: string | null;
  related_node_ids?: string[];
  collaboration_id?: string | null;
}

export type AgentTaskStatus = "open" | "in_progress" | "done";
export interface AgentTaskRow {
  id: string;
  assigned_to: string;
  assigned_by: string;
  title: string;
  detail: string | null;
  status: AgentTaskStatus;
  collaboration_id: string | null;
  related_node_ids: string[];
  created_at: string;
  completed_at: string | null;
}
export interface AgentTaskInput {
  assigned_to: string;
  assigned_by: string;
  title: string;
  detail?: string | null;
  status?: AgentTaskStatus;
  collaboration_id?: string | null;
  related_node_ids?: string[];
}

export type CollaborationStatus = "open" | "in_progress" | "resolved";
export interface AgentCollaborationRow {
  id: string;
  title: string;
  initiator: string;
  participants: string[];
  status: CollaborationStatus;
  summary: string | null;
  joint_recommendation_id: string | null;
  related_node_ids: string[];
  created_at: string;
  resolved_at: string | null;
}
export interface AgentCollaborationInput {
  title: string;
  initiator: string;
  participants?: string[];
  status?: CollaborationStatus;
  summary?: string | null;
  joint_recommendation_id?: string | null;
  related_node_ids?: string[];
}

export interface AgentObjectiveRow {
  id: string;
  agent: string;
  objective: string;
  metric: string | null;
  target: number;
  progress: number; // 0..1
  period: "week" | "month" | "quarter";
  updated_at: string;
}

export interface AgentReputationRow {
  agent: string;
  trust_score: number;          // 0..100
  accuracy_score: number;       // 0..100
  adoption_rate: number;        // percent
  influence_score: number;      // 0..100
  knowledge_contributions: number;
  revenue_influence: number;    // dollars
  collaboration_score: number;  // 0..100
  updated_at: string;
}

export type SystemProposalCategory =
  | "missing_dashboard"
  | "missing_workflow"
  | "missing_automation"
  | "missing_workforce_role"
  | "missing_command_hub_module"
  | "missing_intelligence_system";

// System proposals share the human-review status model with recommendations.
export type SystemProposalStatus = RecommendationStatus;

export interface SystemProposalRow {
  id: string;
  agent: string;
  title: string;
  category: SystemProposalCategory;
  problem: string | null;
  impact: string | null;
  opportunity: string | null;
  solution: string | null;
  technical_requirements: string | null;
  ui_requirements: string | null;
  estimated_effort: string | null;
  priority_score: number;
  expected_outcome: string | null;
  status: SystemProposalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  related_node_ids: string[];
  collaboration_id: string | null;
  created_at: string;
}
export interface SystemProposalInput {
  agent: string;
  title: string;
  category?: SystemProposalCategory;
  problem?: string | null;
  impact?: string | null;
  opportunity?: string | null;
  solution?: string | null;
  technical_requirements?: string | null;
  ui_requirements?: string | null;
  estimated_effort?: string | null;
  priority_score?: number;
  expected_outcome?: string | null;
  related_node_ids?: string[];
  collaboration_id?: string | null;
}

// ── Read models ──────────────────────────────────────────────

// One unified, chronological entry for the Workforce Collaboration Feed.
export interface CollaborationFeedItem {
  id: string;
  type: "message" | "collaboration" | "task";
  agent: string;            // the actor (from_agent / initiator / assigned_by)
  target: string | null;    // to_agent / assignee, when applicable
  kind: string;             // message kind / collaboration status / task status
  text: string;             // human-readable line
  collaboration_id: string | null;
  created_at: string;
}

export interface WorkforceMember {
  meta: AgentMeta;
  reputation: AgentReputationRow;
  objectives: AgentObjectiveRow[];
}

// ─────────────────────────────────────────────────────────────
// Phase 5 — Executive Oversight Layer (Vanessa)
// ─────────────────────────────────────────────────────────────

export interface ExecutivePriorityItem {
  recommendationId: string | null;
  title: string;
  agent: string;
  priority: VanessaPriority;
  reason: string;
  confidence: number;       // 0..1
  influence: number;        // 0..1
  revenueImpact: string | null;
  status: RecommendationStatus;
}

// ─────────────────────────────────────────────────────────────
// Phase 6 — Conversation Intelligence Layer (Veronica)
// ─────────────────────────────────────────────────────────────

export type DraftType =
  | "sms_reply"
  | "follow_up"
  | "reactivation"
  | "appointment_confirmation"
  | "no_show_recovery"
  | "objection_response"
  | "lead_nurture";

// Drafts are NEVER sent in Phase 6. Approving only marks the draft approved
// internally — no outbound SMS, no GHL writes, no workflows.
export type DraftStatusV = "draft" | "approved" | "edited" | "rejected";

export type RiskLevel = "low" | "medium" | "high";

export interface MessageDraftRow {
  id: string;
  agent: string;                 // "veronica"
  draft_type: DraftType;
  lead_name: string | null;      // lead context (no PII secrets)
  conversation_summary: string | null;
  rationale: string | null;      // why this message was drafted
  body: string;                  // the draft message text
  confidence: number;            // 0..1
  risk_level: RiskLevel;
  suggested_send_window: string | null;
  status: DraftStatusV;
  related_node_ids: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface MessageDraftInput {
  agent: string;
  draft_type: DraftType;
  lead_name?: string | null;
  conversation_summary?: string | null;
  rationale?: string | null;
  body: string;
  confidence?: number;
  risk_level?: RiskLevel;
  suggested_send_window?: string | null;
  related_node_ids?: string[];
}

export interface DraftCounts {
  draft: number;
  approved: number;
  edited: number;
  rejected: number;
  total: number;
}

// The Daily Executive Brief — computed from current Vault Memory state.
export interface ExecutiveBrief {
  generatedAt: string;
  executiveSummary: string;
  topPriorities: ExecutivePriorityItem[];   // top 3
  topRisks: string[];
  topOpportunities: string[];
  agentActivitySummary: string;
  financialSignals: string[];
  marketingSignals: string[];
  intelligenceSignals: string[];
  openRecommendations: number;
  suggestedHumanActions: string[];
  systemHealth: string;
  topPerformers: { agent: string; trust: number; adoption: number }[];
}

// ─────────────────────────────────────────────────────────────
// Phase 6.8 — Vault Co Identity Core + GHL source status
// ─────────────────────────────────────────────────────────────

export interface GhlSourceStatus {
  account: "current" | "legacy";
  configured: boolean;        // env vars present (NEVER exposes the key)
  locationId: string | null;  // non-secret location id when configured
}

export interface IdentitySummary {
  positioning: string;
  targetMarket: string;
  coreOffer: string;
  brandVoice: string[];
  messagingPrinciples: string[];
  avoid: string[];            // what Vault Co should stop doing / never say
  doubleDownOn: string[];     // what to repeat
  legacyLearnings: { title: string; detail: string }[];
  sources: GhlSourceStatus[];
}
