// Victoria AI Sales Coach — Core Type Definitions
// Server-side only. These types are the shared contract between all Victoria agents.
// Never import this in client components.

// ─────────────────────────────────────────────────────────────
// Enumerations
// ─────────────────────────────────────────────────────────────

export type ConversationPhase =
  | "rapport"       // Building trust, small talk, opening
  | "discovery"     // Extracting pain, current situation
  | "deep_discovery"// Emotional/financial impact questions
  | "positioning"   // Presenting Vault Co value
  | "handling"      // Objection territory
  | "closing"       // Asking for the business
  | "post_close"    // Logistics, onboarding
  | "lost";         // Call going off the rails

export type EmotionalState =
  | "open_engaged"
  | "hesitant"
  | "skeptical"
  | "frustrated"
  | "confused"
  | "excited"
  | "defensive"
  | "hopeful"
  | "resigned"
  | "urgent";

export type ObjectionCategory =
  | "price"
  | "timing"
  | "authority"             // "need to talk to wife/partner"
  | "trust"                 // "how do I know this works"
  | "agency_skepticism"     // "I've been burned before"
  | "already_have_marketing"
  | "cash_flow"
  | "think_about_it"
  | "send_info"             // "just send me information"
  | "guarantee"
  | "competitor"
  | "busy"
  | "seasonal"
  | "not_ready"
  | "unknown";

export type CoachingType =
  | "next_question"
  | "probe_deeper"
  | "reframe_objection"
  | "shut_up_listen"
  | "buying_signal_detected"
  | "danger_warning"
  | "positioning_angle"
  | "close_attempt"
  | "rep_warning"
  | "phase_transition";

export type CoachingPriority = "critical" | "high" | "normal" | "background";

export type DiscoveryDepth = "shallow" | "moderate" | "deep";

export type ContractorVertical =
  | "roofing"
  | "hvac"
  | "remodeling"
  | "landscaping"
  | "plumbing"
  | "electrical"
  | "painting"
  | "general_contracting"
  | "home_services"
  | "other";

// ─────────────────────────────────────────────────────────────
// Transcript
// ─────────────────────────────────────────────────────────────

export interface TranscriptChunk {
  chunk_index: number;
  speaker: "rep" | "prospect";
  text: string;
  started_at_seconds?: number;
  ended_at_seconds?: number;
  // Pre-processing flags (set by chunk-preprocessor)
  contains_objection: boolean;
  contains_buying_signal: boolean;
  contains_emotional_shift: boolean;
  objection_keywords_found: string[];
  buying_signal_keywords_found: string[];
  timestamp_ms: number;
}

// ─────────────────────────────────────────────────────────────
// Discovery State
// ─────────────────────────────────────────────────────────────

export interface DiscoveryState {
  // Situation
  current_marketing_spend_known: boolean;
  current_lead_sources_known: boolean;
  current_close_rate_known: boolean;
  current_revenue_known: boolean;
  business_age_known: boolean;
  team_size_known: boolean;

  // Problem
  main_pain_stated: boolean;
  pain_specificity: "vague" | "specific" | "vivid";

  // Implication / Consequence
  financial_impact_quantified: boolean;
  emotional_impact_expressed: boolean;
  operational_impact_stated: boolean;

  // Desired Outcome
  ideal_outcome_stated: boolean;
  timeline_urgency_present: boolean;
  decision_process_known: boolean;

  // Assessment
  missing_areas: string[];
  depth_rating: DiscoveryDepth;
  depth_score: number; // 0–100
}

// ─────────────────────────────────────────────────────────────
// Objection Tracking
// ─────────────────────────────────────────────────────────────

export interface ObjectionEvent {
  id: string;
  chunk_index: number;
  raw_text: string;
  category: ObjectionCategory;
  detected_at: number;
}

export interface ObjectionState {
  raised: ObjectionEvent[];
  handled: string[];
  unresolved: string[];
  hidden_objections: string[];
}

// ─────────────────────────────────────────────────────────────
// Session Scores (0–100 each)
// ─────────────────────────────────────────────────────────────

export interface SessionScores {
  trust: number;
  urgency: number;
  pain_depth: number;
  authority: number;         // Is this the decision maker?
  budget_fit: number;
  emotional_engagement: number;
  close_readiness: number;
  deal_risk: number;         // Inverse of close readiness
}

// ─────────────────────────────────────────────────────────────
// Prospect State (within a call)
// ─────────────────────────────────────────────────────────────

export interface ProspectCallState {
  name: string;
  company: string;
  vertical: ContractorVertical;
  business_size?: string;
  current_marketing?: string;
  emotional_state: EmotionalState;
  personality_type?: string;
  prior_call_summary?: string;
  known_triggers: string[];
  known_resistances: string[];
}

// ─────────────────────────────────────────────────────────────
// Agent Output Types
// ─────────────────────────────────────────────────────────────

export interface DiscoveryMissingArea {
  area: string;
  importance: "critical" | "high" | "medium";
  suggested_probe: string;
}

export interface DiscoveryWarning {
  type: "pitching_too_early" | "surface_discovery" | "skipping_pain" | "rep_overtalking";
  message: string;
  redirect: string;
}

export interface DiscoveryOutput {
  assessment: "incomplete" | "shallow" | "adequate" | "deep";
  next_best_question: string;
  question_framework: string; // NEPQ | SPIN | Gap | Challenger
  why_this_question: string;
  missing_areas: DiscoveryMissingArea[];
  warning?: DiscoveryWarning;
  pain_summary: string;
  depth_score: number; // 0–100
}

export interface ObjectionReframe {
  approach: string;
  rationale: string;
  suggested_language: string;
}

export interface ObjectionOutput {
  detected_objection: string;
  category: ObjectionCategory;
  surface_meaning: string;
  hidden_meaning: string;
  emotional_driver: string;
  what_not_to_say: string[];
  what_not_to_do: string;
  reframe_strategy: ObjectionReframe;
  follow_up_question: string;
  is_real_objection: boolean;
  real_issue_if_smokescreen?: string;
}

export interface DealRiskOutput {
  overall_score: number; // 0–100
  scoring_breakdown: {
    trust: { score: number; evidence: string };
    urgency: { score: number; evidence: string };
    pain_clarity: { score: number; evidence: string };
    authority: { score: number; evidence: string };
    budget_fit: { score: number; evidence: string };
    engagement: { score: number; evidence: string };
  };
  biggest_risk: string;
  missing_close_conditions: string[];
  recommendation:
    | "continue_discovery"
    | "deepen_pain"
    | "address_objection"
    | "position_now"
    | "attempt_close"
    | "schedule_followup"
    | "rescue_call";
  rep_tactical_advice: string;
}

export interface EmotionalOutput {
  detected_shift: boolean;
  emotional_state: EmotionalState;
  intensity: "low" | "medium" | "high";
  direction: "improving" | "stable" | "declining";
  signal_evidence: string;
  rep_recommendation: string;
  alert?: {
    type: "emotional_spike" | "shutdown" | "breakthrough";
    urgency: "immediate" | "soon";
    action: string;
  };
}

// Bundle of all latest agent outputs in a session
export interface AgentOutputBundle {
  discovery: DiscoveryOutput | null;
  objection_intel: ObjectionOutput | null;
  deal_risk: DealRiskOutput | null;
  emotional_signals: EmotionalOutput | null;
}

// ─────────────────────────────────────────────────────────────
// Coaching Card — the final output rep sees
// ─────────────────────────────────────────────────────────────

export interface CoachingCard {
  id: string;
  call_id: string;
  chunk_index: number;
  timestamp_ms: number;

  priority: CoachingPriority;
  coaching_type: CoachingType;

  headline: string;           // Short, scannable — "Ask about the impact on their busy season"
  primary_action: string;     // What to do RIGHT NOW
  why: string;                // Brief reasoning
  suggested_language?: string;// Optional exact words or pattern
  what_not_to_do?: string;

  context_tags: string[];
  confidence: number;         // 0–1

  current_phase: ConversationPhase;
  phase_recommendation?: string;

  // Source agent that drove this card
  source_agent: "discovery" | "objection_intel" | "orchestrator" | "buying_signal" | "deal_risk";
}

// ─────────────────────────────────────────────────────────────
// Live Call Session — shared state, single source of truth
// ─────────────────────────────────────────────────────────────

export interface LiveCallSession {
  // Identity
  call_id: string;
  prospect_id?: string;    // Set when linked to a real prospect record
  rep_id?: string;
  is_test_call: boolean;

  // State
  status: "active" | "completed" | "abandoned";
  phase: ConversationPhase;
  started_at: number;      // Unix ms
  updated_at: number;      // Unix ms

  // Transcript
  transcript: TranscriptChunk[];
  current_chunk_index: number;
  full_transcript_summary: string; // Rolling summary, updated every 10 chunks

  // Scores
  scores: SessionScores;

  // Discovery
  discovery: DiscoveryState;

  // Objections
  objections: ObjectionState;

  // Prospect
  prospect: ProspectCallState;

  // Latest agent outputs
  agent_outputs: AgentOutputBundle;

  // Coaching history
  current_coaching: CoachingCard | null;
  coaching_history: CoachingCard[];
}

// ─────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────

export interface ChunkEvent {
  type: "chunk";
  call_id: string;
  chunk: TranscriptChunk;
  session_snapshot: Pick<LiveCallSession, "phase" | "scores" | "discovery" | "objections">;
}

export interface CoachingEvent {
  type: "coaching";
  call_id: string;
  card: CoachingCard;
}

export interface SessionEvent {
  type: "session_start" | "session_end" | "phase_change";
  call_id: string;
  data: Record<string, unknown>;
}

export type VictoriaEvent = ChunkEvent | CoachingEvent | SessionEvent;

// ─────────────────────────────────────────────────────────────
// API Request / Response types
// ─────────────────────────────────────────────────────────────

export interface StartCallRequest {
  prospect_id?: string;  // Link to existing prospect record for cross-call memory
  prospect: {
    name: string;
    company: string;
    vertical: ContractorVertical;
    business_size?: string;
    current_marketing?: string;
    prior_call_summary?: string;
  };
  rep_id?: string;
  is_test_call?: boolean;
}

export interface SubmitChunkRequest {
  call_id: string;
  speaker: "rep" | "prospect";
  text: string;
  started_at_seconds?: number;
}

export interface ChunkProcessingResult {
  call_id: string;
  chunk_index: number;
  coaching_card: CoachingCard | null;
  agent_outputs: AgentOutputBundle;
  session_phase: ConversationPhase;
  session_scores: SessionScores;
  processing_time_ms: number;
}

// ─────────────────────────────────────────────────────────────
// Default session factory
// ─────────────────────────────────────────────────────────────

export function createDefaultSession(
  call_id: string,
  prospect: StartCallRequest["prospect"],
  rep_id?: string,
  is_test_call = false
): LiveCallSession {
  const now = Date.now();
  return {
    call_id,
    prospect_id: undefined,
    rep_id,
    is_test_call,
    status: "active",
    phase: "rapport",
    started_at: now,
    updated_at: now,
    transcript: [],
    current_chunk_index: 0,
    full_transcript_summary: "",
    scores: {
      trust: 30,
      urgency: 20,
      pain_depth: 0,
      authority: 50,
      budget_fit: 50,
      emotional_engagement: 30,
      close_readiness: 10,
      deal_risk: 70,
    },
    discovery: {
      current_marketing_spend_known: false,
      current_lead_sources_known: false,
      current_close_rate_known: false,
      current_revenue_known: false,
      business_age_known: false,
      team_size_known: false,
      main_pain_stated: false,
      pain_specificity: "vague",
      financial_impact_quantified: false,
      emotional_impact_expressed: false,
      operational_impact_stated: false,
      ideal_outcome_stated: false,
      timeline_urgency_present: false,
      decision_process_known: false,
      missing_areas: [],
      depth_rating: "shallow",
      depth_score: 0,
    },
    objections: {
      raised: [],
      handled: [],
      unresolved: [],
      hidden_objections: [],
    },
    prospect: {
      name: prospect.name,
      company: prospect.company,
      vertical: prospect.vertical,
      business_size: prospect.business_size,
      current_marketing: prospect.current_marketing,
      emotional_state: "open_engaged",
      prior_call_summary: prospect.prior_call_summary,
      known_triggers: [],
      known_resistances: [],
    },
    agent_outputs: {
      discovery: null,
      objection_intel: null,
      deal_risk: null,
      emotional_signals: null,
    },
    current_coaching: null,
    coaching_history: [],
  };
}

// ─────────────────────────────────────────────────────────────
// Database Row Types (mirrors Supabase schema)
// ─────────────────────────────────────────────────────────────

export interface VictoriaCallRow {
  id: string;
  prospect_id: string | null;
  rep_id: string | null;
  status: string;
  phase: string;
  is_test_call: boolean;
  outcome: string | null;
  close_probability_final: number | null;
  session_state: Record<string, unknown> | null;  // JSON blob — not typed at DB boundary
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface VictoriaTranscriptChunkRow {
  id: string;
  call_id: string;
  chunk_index: number;
  speaker: string;
  text: string;
  started_at_seconds: number | null;
  ended_at_seconds: number | null;
  contains_objection: boolean;
  contains_buying_signal: boolean;
  contains_emotional_shift: boolean;
  created_at: string;
}

export interface VictoriaCoachingEventRow {
  id: string;
  call_id: string;
  chunk_index: number | null;
  coaching_type: string;
  priority: string;
  headline: string;
  primary_action: string;
  why: string | null;
  suggested_language: string | null;
  what_not_to_do: string | null;
  context_tags: string[];
  confidence: number | null;
  source_agent: string;
  created_at: string;
}

export interface VictoriaObjectionEventRow {
  id: string;
  call_id: string;
  prospect_id: string | null;
  chunk_index: number | null;
  raw_text: string;
  category: string;
  hidden_meaning: string | null;
  emotional_driver: string | null;
  reframe_recommended: string | null;
  follow_up_question: string | null;
  resolution: string | null;
  created_at: string;
}

export interface VictoriaAgentOutputRow {
  id: string;
  call_id: string;
  agent_name: string;
  chunk_index: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  model_used: string | null;
  output: Record<string, unknown>;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// Prospect — persistent cross-call intelligence
// ─────────────────────────────────────────────────────────────

export interface VictoriaProspectRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  vertical: string | null;
  location_city: string | null;
  location_state: string | null;
  business_size: string | null;
  years_in_business: number | null;
  personality_type: string | null;
  communication_style: string | null;
  known_pain_points: string[];
  known_objections: string[];
  known_triggers: string[];
  known_resistances: string[];
  primary_fear: string | null;
  primary_desire: string | null;
  deal_stage: string;
  last_contact: string | null;
  next_step: string | null;
  urgency_level: string;
  total_calls: number;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// Knowledge Base — Vault Co sales intelligence store
// ─────────────────────────────────────────────────────────────

export const KB_DOMAINS = [
  { value: "vault_co_offer",         label: "Vault Co Offer" },
  { value: "60_day_system",          label: "60-Day Revenue System" },
  { value: "objection_handling",     label: "Objection Handling" },
  { value: "contractor_psychology",  label: "Contractor Psychology" },
  { value: "pricing_roi",            label: "Pricing & ROI" },
  { value: "sales_scripts",          label: "Sales Scripts" },
  { value: "case_studies",           label: "Case Studies" },
  { value: "follow_up",              label: "Follow-Up Sequences" },
  { value: "competitor_comparison",  label: "Competitor Comparisons" },
  { value: "failed_agency_stories",  label: "Failed Agency Experiences" },
] as const;

export type KBDomain = (typeof KB_DOMAINS)[number]["value"];

export interface VictoriaKBEntryRow {
  id: string;
  domain: string;
  category: string | null;
  tags: string[];
  title: string;
  content: string;
  vertical_relevance: string[];
  objection_type: string | null;
  call_phase: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KBSearchResult {
  id: string;
  domain: string;
  category: string | null;
  title: string;
  content: string;
  tags: string[];
  vertical_relevance: string[];
  call_phase: string[];
}

// ─────────────────────────────────────────────────────────────
// Prospect Memory — rich context loaded before/after calls
// ─────────────────────────────────────────────────────────────

export interface ProspectMemory {
  prospect: VictoriaProspectRow;
  recent_calls_summary: string;   // Formatted text of last 3 calls
  last_call_snapshot: Record<string, unknown> | null;
}

export interface PreCallBriefing {
  prospect_summary: string;
  key_pain_points: string[];
  known_objections: string[];
  recommended_approach: string;
  opening_question: string;
  things_to_avoid: string[];
  prior_call_context: string | null;
  urgency_assessment: string;
}

export interface PostCallExtraction {
  new_pain_points: string[];
  new_objections: string[];
  buying_signals_detected: string[];
  emotional_journey: string;
  personality_notes: string;
  decision_process_learned: string | null;
  urgency_level: "low" | "medium" | "high" | "urgent";
  deal_stage: string;
  next_step: string;
  next_call_briefing: string;
  crm_notes: string;
}
