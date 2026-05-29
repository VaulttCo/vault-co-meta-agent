// Victoria — Rep Identity Profile Types
// Server-side only. Persistent rep profiles for tracking performance across all calls.
// Pre-seeded for: Nick, Jaxon.

// ─────────────────────────────────────────────────────────────
// Rep Profile — single row in victoria_rep_profiles
// ─────────────────────────────────────────────────────────────

export interface RepProfile {
  id: string;                         // Supabase UUID
  name: string;                       // "Nick", "Jaxon"
  email: string | null;
  avatar_initials: string;            // "NM", "JB"
  fathom_speaker_names: string[];     // Names Fathom uses for this rep (for diarization matching)

  // Cumulative call stats
  total_calls: number;
  avg_overall_score: number;          // 0–100: lifetime avg RepScorecard.overall_score
  avg_talk_ratio_rep: number;         // 0–100: lifetime avg rep talk %
  avg_discovery_depth: number;        // 0–100
  avg_close_readiness: number;        // 0–100

  // Skill scores — updated after each call's RepScorecard
  skill_talk_ratio: number;           // 0–100 (lower talk ratio = higher score)
  skill_question_quality: number;
  skill_emotional_intelligence: number;
  skill_objection_handling: number;
  skill_closing: number;
  skill_discovery_depth: number;

  // Behavioral tendencies (derived from interruption / overtalking patterns)
  interruption_tendency: "low" | "medium" | "high";
  overtalking_tendency: "low" | "medium" | "high";

  // Coaching notes (free-form summary of patterns observed)
  strengths: string[];
  weaknesses: string[];

  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// Rep Call Log — one row per call in victoria_rep_call_logs
// Records the per-call metrics used to update the rolling averages
// ─────────────────────────────────────────────────────────────

export interface RepCallLog {
  id: string;
  rep_id: string;
  call_id: string;

  // From RepScorecard (post-call review)
  overall_score: number;
  grade: string;
  talk_ratio_score: number;
  question_quality_score: number;
  emotional_intelligence_score: number;
  discovery_score: number;
  objection_handling_score: number;
  closing_skill_score: number;

  // From Fathom speaker metrics (if available)
  fathom_talk_ratio_rep: number | null;   // Actual % from diarized transcript
  fathom_interruption_count: number | null;

  recorded_at: string;
}

// ─────────────────────────────────────────────────────────────
// Stats update — passed to updateRepProfileStats()
// ─────────────────────────────────────────────────────────────

export interface RepCallStatsUpdate {
  overall_score: number;
  talk_ratio_score: number;
  question_quality_score: number;
  emotional_intelligence_score: number;
  discovery_score: number;
  objection_handling_score: number;
  closing_skill_score: number;
  fathom_talk_ratio_rep: number | null;
  fathom_interruption_count: number | null;
  areas_of_strength: string[];
  areas_for_improvement: string[];
}
