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

// ─────────────────────────────────────────────────────────────
// Rep Performance — real-time coaching of the sales rep
// ─────────────────────────────────────────────────────────────

export type RepWarningType =
  | "overtalking"
  | "interrupting"
  | "premature_pitching"
  | "weak_probing"
  | "missing_emotional_signal"
  | "overexplaining"
  | "question_stacking"
  | "poor_listening"
  | "buying_signal_ignored"
  | "feature_vs_outcome";

export interface RepWarning {
  type: RepWarningType;
  severity: "critical" | "high" | "medium";
  message: string;       // What went wrong. Max 20 words.
  evidence: string;      // Quote or evidence. Max 30 words.
  chunk_index: number;
  suggested_fix: string; // Exact corrective action. Max 25 words.
}

export interface RepPerformanceOutput {
  overall_performance: "excellent" | "good" | "needs_improvement" | "poor";
  warnings: RepWarning[];
  positive_observations: string[];
  coaching_priorities: string[]; // Ordered, most urgent first
  talk_ratio: {
    rep_percent: number;
    prospect_percent: number;
  };
  interruptions: number;         // Count of detected interruptions
  momentum_direction: string;    // "improving" | "stable" | "declining"
  trust_trend: string;           // "building" | "stable" | "eroding"
  urgency_trend: string;         // "increasing" | "stable" | "decreasing"
}

// ─────────────────────────────────────────────────────────────
// Timeline — live event stream for the call
// ─────────────────────────────────────────────────────────────

export type TimelineEventType =
  | "buying_signal"
  | "emotional_breakthrough"
  | "emotional_shutdown"
  | "emotional_shift"
  | "objection_detected"
  | "objection_not_isolated"
  | "discovery_improved"
  | "premature_pitch"
  | "rep_interrupted"
  | "rep_overtalking"
  | "rep_weak_probe"
  | "rep_missing_emotional"
  | "rep_question_stacking"
  | "rep_overexplaining"
  | "rep_buying_signal_ignored"
  | "rep_feature_vs_outcome"
  | "momentum_declining"
  | "momentum_improving"
  | "trust_declining"
  | "trust_building"
  | "urgency_detected"
  | "urgency_declining"
  | "phase_transition"
  | "close_signal";

export interface TimelineEvent {
  id: string;
  timestamp_ms: number;
  chunk_index: number;
  event_type: TimelineEventType;
  severity: "critical" | "high" | "medium" | "info";
  title: string;
  description: string;
  agent_source?: string; // Which intelligence layer generated this event
}

// ─────────────────────────────────────────────────────────────
// Momentum — directional trend tracking per dimension
// ─────────────────────────────────────────────────────────────

export type MomentumDirection = "improving" | "stable" | "declining";

export interface MomentumSnapshot {
  trust: MomentumDirection;
  urgency: MomentumDirection;
  pain_depth: MomentumDirection;
  engagement: MomentumDirection;
  close_readiness: MomentumDirection;
  overall: MomentumDirection;
  computed_at_chunk: number;
}

// Bundle of all latest agent outputs in a session
export interface AgentOutputBundle {
  discovery: DiscoveryOutput | null;
  objection_intel: ObjectionOutput | null;
  deal_risk: DealRiskOutput | null;
  emotional_signals: EmotionalOutput | null;
  rep_performance: RepPerformanceOutput | null;
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
  prev_scores: SessionScores | null; // Previous reading for momentum computation

  // Discovery
  discovery: DiscoveryState;

  // Objections
  objections: ObjectionState;

  // Prospect
  prospect: ProspectCallState;

  // Latest agent outputs
  agent_outputs: AgentOutputBundle;

  // Live call timeline — event stream across the full call
  timeline: TimelineEvent[];

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
  new_timeline_events: TimelineEvent[];
  momentum: MomentumSnapshot | null;
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
    prev_scores: null,
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
      rep_performance: null,
    },
    timeline: [],
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

// ─────────────────────────────────────────────────────────────
// Post-Call Review — comprehensive call debrief and sales QA
// Generated by the post-call review agent after every completed call.
// Victoria as elite AI sales manager reviewing and coaching each call.
// ─────────────────────────────────────────────────────────────

export type MissedOpportunityType =
  | "emotional_cue_ignored"
  | "buying_signal_ignored"
  | "objection_not_isolated"
  | "shallow_probing"
  | "premature_pitching"
  | "lost_momentum"
  | "failed_close"
  | "overexplaining"
  | "trust_breaking";

export interface MissedOpportunity {
  id: string;
  chunk_index: number;
  type: MissedOpportunityType;
  severity: "critical" | "high" | "medium";
  what_happened: string;
  why_it_mattered: string;
  what_should_have_happened: string;
  evidence: string;
}

export type TurningPointType =
  | "trust_increased"
  | "trust_collapsed"
  | "urgency_increased"
  | "emotional_breakthrough"
  | "buying_intent_increased"
  | "rep_lost_control"
  | "deal_momentum_shifted";

export interface TurningPoint {
  id: string;
  chunk_index: number;
  type: TurningPointType;
  direction: "positive" | "negative";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  evidence: string;
}

export type ReplayCategory = "best" | "worst" | "missed" | "objection" | "buying_signal";

export interface ReplayMoment {
  id: string;
  chunk_index: number;
  category: ReplayCategory;
  label: string;
  transcript_excerpt: string;
  coaching_note: string;
  speaker: "rep" | "prospect" | "both";
}

export interface RepScorecard {
  overall_score: number;          // 0–100
  grade: "A" | "B" | "C" | "D" | "F";
  talk_ratio_score: number;       // 0–100: how well rep managed talk time
  question_quality_score: number; // 0–100: depth and quality of probing
  emotional_intelligence_score: number;  // 0–100: how well rep read/responded to emotion
  discovery_score: number;        // 0–100: mirrors session discovery depth
  objection_handling_score: number;      // 0–100: objections handled vs raised
  closing_skill_score: number;    // 0–100: close readiness achieved + trial closes
  areas_of_strength: string[];
  areas_for_improvement: string[];
}

export interface CloseProbabilityAssessment {
  probability: number;   // 0–100
  reasoning: string;
  blockers: string[];
  accelerators: string[];
}

export interface PostCallReview {
  call_id: string;
  generated_at: string;            // ISO timestamp
  prospect_name: string;
  call_duration_chunks: number;    // Total chunks processed
  executive_summary: string;       // 2–3 sentence overview of what happened
  rep_performance_review: string;  // Detailed narrative rep coaching
  missed_opportunities: MissedOpportunity[];
  turning_points: TurningPoint[];
  objection_analysis: string;      // How objections were handled
  close_probability: CloseProbabilityAssessment;
  next_call_strategy: string;      // Specific strategy for the next call
  follow_up_recommendations: string[];
  rep_scorecard: RepScorecard;
  replay_timeline: ReplayMoment[];
  ai_coaching_summary: string;     // Victoria's direct coaching message to the rep
  processing_time_ms: number;
  model: string;
  mock_mode: boolean;
}

// ─────────────────────────────────────────────────────────────
// Action Engine — automated follow-up, CRM sync, task generation
// Victoria as autonomous AI sales manager driving next-step execution.
// ─────────────────────────────────────────────────────────────

export type FollowUpType =
  | "hot_lead"        // High close readiness, ready to move
  | "nurture"         // Interested but not ready yet
  | "skeptical"       // Trust/agency skepticism blocker
  | "authority_issue" // Need to loop in decision maker
  | "budget_issue"    // Price/cash flow concern
  | "timing_issue"    // Seasonal or "not right time" objection
  | "ghosting_risk"   // Low engagement, likely to go dark
  | "proposal_sent"   // Next call is a proposal review
  | "follow_up_booked"; // Next step already scheduled

export type DealHealth = "hot" | "warm" | "cold" | "at_risk" | "lost";

export type UrgencyApproach =
  | "seasonal_deadline"
  | "cost_of_inaction"
  | "competitor_threat"
  | "scarcity"
  | "milestone_based"
  | "social_proof";

export interface UrgencyStrategy {
  approach: UrgencyApproach;
  headline: string;
  key_messages: string[];
  timing: string;
  what_to_avoid: string;
}

export interface FollowUpEmail {
  subject: string;
  body: string;
  send_timing: string;  // e.g. "within 2 hours", "next morning"
}

export interface FollowUpSMS {
  body: string;          // Max 160 chars
  send_timing: string;
}

export interface FollowUpKit {
  follow_up_type: FollowUpType;
  email: FollowUpEmail;
  sms: FollowUpSMS;
  loom_talking_points: string[];       // 3–5 key points for a 2–3 min Loom
  proposal_positioning: string;        // How to frame the proposal/offer
  objection_specific_recap: string;    // Objection handling context for follow-up
  next_step_recommendation: string;    // Exact recommended next action + timing
}

export interface CRMSyncObject {
  deal_stage: string;
  deal_health: DealHealth;
  trust_score: number;
  urgency_score: number;
  close_probability: number;
  primary_objection: string;
  next_step: string;
  followup_due: string;                // ISO datetime
  recommended_owner_action: string;
  probability_band: "high" | "medium" | "low";
}

export type TaskType =
  | "send_sms"
  | "send_email"
  | "call_back"
  | "send_proposal"
  | "send_case_study"
  | "schedule_meeting"
  | "send_loom"
  | "breakup_message"
  | "crm_update";

export type TaskPriority = "urgent" | "high" | "normal" | "low";

export interface TaskItem {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  title: string;
  description: string;
  due_by: string;          // ISO datetime or human string "within 2 hours"
  due_offset_minutes: number; // Relative to call end, for sorting
}

export interface ActionPlan {
  call_id: string;
  generated_at: string;
  prospect_name: string;
  follow_up_type: FollowUpType;
  deal_health: DealHealth;
  deal_health_summary: string;
  follow_up_kit: FollowUpKit;
  crm_sync: CRMSyncObject;
  tasks: TaskItem[];
  urgency_strategy: UrgencyStrategy;
  processing_time_ms: number;
  model: string;
  mock_mode: boolean;
}

// ─────────────────────────────────────────────────────────────
// Fathom Integration DB Row Types
// ─────────────────────────────────────────────────────────────

export interface VictoriaFathomIngestionRow {
  id: string;
  call_id: string;
  fathom_recording_id: string;
  recording_url: string | null;
  share_url: string | null;
  duration_seconds: number | null;
  title: string | null;
  speakers: unknown;        // JSON — typed at application layer via fathom/types.ts
  segments: unknown;
  summary: string;
  action_items: string[];
  speaker_metrics: unknown | null;
  reconciliation: unknown | null;
  ingested_at: string;
}

// ─────────────────────────────────────────────────────────────
// Rep Profile DB Row Types
// ─────────────────────────────────────────────────────────────

export interface VictoriaRepProfileRow {
  id: string;
  name: string;
  email: string | null;
  avatar_initials: string;
  fathom_speaker_names: string[];
  total_calls: number;
  avg_overall_score: number;
  avg_talk_ratio_rep: number;
  avg_discovery_depth: number;
  avg_close_readiness: number;
  skill_talk_ratio: number;
  skill_question_quality: number;
  skill_emotional_intelligence: number;
  skill_objection_handling: number;
  skill_closing: number;
  skill_discovery_depth: number;
  interruption_tendency: string;
  overtalking_tendency: string;
  strengths: string[];
  weaknesses: string[];
  created_at: string;
  updated_at: string;
}

export interface VictoriaRepCallLogRow {
  id: string;
  rep_id: string;
  call_id: string;
  overall_score: number;
  grade: string;
  talk_ratio_score: number;
  question_quality_score: number;
  emotional_intelligence_score: number;
  discovery_score: number;
  objection_handling_score: number;
  closing_skill_score: number;
  fathom_talk_ratio_rep: number | null;
  fathom_interruption_count: number | null;
  recorded_at: string;
}

// ─────────────────────────────────────────────────────────────
// Shared Intelligence — Victoria ↔ Veronica cross-agent structures
// Data interfaces for eventual cross-agent intelligence sharing.
// DO NOT contain automation logic here — interfaces only.
// ─────────────────────────────────────────────────────────────

export type SharedIntelligenceCategory =
  | "common_objections"
  | "lead_quality_issues"
  | "offer_resonance"
  | "emotional_pain_patterns"
  | "vertical_specific_trends"
  | "trust_blockers";

export type IntelligenceSource = "victoria" | "veronica" | "both";

export interface SharedIntelligenceRecord {
  id: string;
  category: SharedIntelligenceCategory;
  vertical: ContractorVertical | "all";
  insight: string;
  evidence: string;          // Specific evidence or example that supports this insight
  frequency_count: number;   // How many calls/sessions surfaced this pattern
  confidence: "high" | "medium" | "low";
  source: IntelligenceSource;
  created_at: string;
  last_seen_at: string;
}

// Aggregated intelligence summary — what Victoria learned across all calls
export interface VictoriaIntelligenceSummary {
  vertical: ContractorVertical | "all";
  period_start: string;
  period_end: string;
  call_count: number;
  top_objections: { category: string; frequency: number; win_rate: number }[];
  avg_close_probability: number;
  avg_discovery_depth: number;
  trust_blockers: string[];
  emotional_pain_patterns: string[];
  offer_resonance_signals: string[];
  generated_at: string;
}
