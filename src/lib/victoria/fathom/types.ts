// Victoria — Fathom Integration Types
// Server-side only. Defines shapes for Fathom REST API responses,
// normalized ingestion records, and speaker intelligence derived from diarized transcripts.

import type { EmotionalState } from "../types";

// ─────────────────────────────────────────────────────────────
// Fathom REST API raw response shapes
// Base URL: https://api.fathom.video/v1
// Auth: Authorization: Bearer {FATHOM_API_KEY}
// ─────────────────────────────────────────────────────────────

export interface FathomRawSpeaker {
  id: string;      // e.g. "SPEAKER_0"
  name: string;    // e.g. "Nick Moore"
}

export interface FathomRawUtterance {
  speaker_id: string;
  start: number;   // seconds from call start
  end: number;     // seconds from call start
  words: string;   // transcript text for this utterance
}

export interface FathomRawTranscriptResponse {
  utterances: FathomRawUtterance[];
  speakers: FathomRawSpeaker[];
}

export interface FathomRawSummaryResponse {
  summary: string;
  action_items?: string[];
  key_takeaways?: string[];   // Fathom may return this instead of / in addition to action_items
}

export interface FathomRawCallMetadata {
  id: string;              // recording_id
  title: string;
  duration: number;        // seconds
  url?: string;            // recording playback URL
  share_url?: string;      // shareable link
  created_at: string;      // ISO timestamp
}

// ─────────────────────────────────────────────────────────────
// Normalized Fathom types (what Victoria works with internally)
// ─────────────────────────────────────────────────────────────

export type SpeakerRole = "rep" | "prospect" | "unknown";

export interface FathomSpeaker {
  id: string;              // Fathom speaker ID (e.g. "SPEAKER_0")
  name: string;            // Display name from Fathom
  role: SpeakerRole;       // Assigned by role resolution (rep vs prospect)
  is_known_rep: boolean;   // true if matched against a RepProfile.fathom_speaker_names
}

export interface FathomSegment {
  speaker_id: string;
  speaker_name: string;
  speaker_role: SpeakerRole;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  text: string;
}

// ─────────────────────────────────────────────────────────────
// Speaker Metrics — computed from Fathom diarized transcript
// ─────────────────────────────────────────────────────────────

export interface SpeakerTalkMetrics {
  total_talk_seconds: number;
  talk_percentage: number;   // 0–100
  segment_count: number;
  avg_segment_duration_seconds: number;
  longest_segment_seconds: number;
}

export interface SpeakerMetrics {
  speaker_id: string;
  speaker_name: string;
  speaker_role: SpeakerRole;

  // Talk time
  talk: SpeakerTalkMetrics;

  // Interruptions this speaker made (they started < 0.5s after the other stopped)
  interruption_count: number;

  // Emotional signals attributed to this speaker (from Victoria live agents)
  emotional_signals: {
    state: EmotionalState;
    detected_at_chunk: number;
    start_seconds: number;
  }[];

  // Prospect-specific signals
  buying_signal_count: number;
  objection_count: number;
}

export interface CallSpeakerIntelligence {
  call_id: string;
  computed_at: string;      // ISO timestamp
  speakers: FathomSpeaker[];
  metrics: SpeakerMetrics[];

  // Aggregated ratios
  rep_talk_seconds: number;
  prospect_talk_seconds: number;
  rep_talk_percentage: number;
  prospect_talk_percentage: number;

  // Behavioral
  total_interruptions: number;
  rep_interruption_count: number;
  prospect_interruption_count: number;
  longest_rep_monologue_seconds: number;
  longest_prospect_segment_seconds: number;
}

// ─────────────────────────────────────────────────────────────
// Transcript Reconciliation
// Live browser transcript vs Fathom authoritative transcript
// ─────────────────────────────────────────────────────────────

export type ReconciliationEntrySource = "live" | "fathom_gap" | "reconciled";

export interface EnrichedTranscriptEntry {
  source: ReconciliationEntrySource;
  chunk_index?: number;          // Present when source is "live" or "reconciled"
  fathom_segment_index?: number; // Present when source is "fathom_gap" or "reconciled"
  speaker_role: SpeakerRole;
  speaker_name: string;          // Real name if Fathom data available, else "REP"/"PROSPECT"
  text: string;
  start_seconds: number;
  end_seconds?: number;
  timestamp_ms: number;
  has_coaching_event: boolean;   // true if a coaching card was generated from this chunk
}

export interface ReconciliationResult {
  call_id: string;
  reconciled_at: string;

  // Stats
  live_chunk_count: number;
  fathom_segment_count: number;
  matched_count: number;
  gap_count: number;            // Fathom segments with no matching live chunk

  // Enriched transcript (sorted by start_seconds)
  enriched_transcript: EnrichedTranscriptEntry[];
}

// ─────────────────────────────────────────────────────────────
// Full Fathom Ingestion Record (stored in victoria_fathom_ingestions)
// ─────────────────────────────────────────────────────────────

export interface FathomIngestion {
  id: string;                          // Supabase UUID
  call_id: string;                     // Victoria call_id
  fathom_recording_id: string;
  recording_url: string | null;
  share_url: string | null;
  duration_seconds: number | null;
  title: string | null;

  // Fathom data
  speakers: FathomSpeaker[];
  segments: FathomSegment[];
  summary: string;
  action_items: string[];

  // Computed
  speaker_metrics: CallSpeakerIntelligence | null;
  reconciliation: ReconciliationResult | null;

  ingested_at: string;                 // ISO timestamp
}

// ─────────────────────────────────────────────────────────────
// API request/response for the Fathom ingestion route
// ─────────────────────────────────────────────────────────────

export interface FathomIngestRequest {
  fathom_url?: string;          // Share URL or recording URL — we resolve to recording_id
  fathom_recording_id?: string; // Direct recording ID (skip resolution step)
  fathom_call_id?: string;      // Fathom's own call ID (resolve via API)
}

export interface FathomIngestResponse {
  ingestion: FathomIngestion;
  speaker_intelligence: CallSpeakerIntelligence | null;
  reconciliation: ReconciliationResult | null;
  meta: {
    fathom_available: boolean;
    mock_mode: boolean;
    processing_time_ms: number;
  };
}
