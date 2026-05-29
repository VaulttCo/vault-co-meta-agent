// Victoria — Speaker Metrics Computation
// Server-side only. Computes per-speaker analytics from a Fathom diarized transcript.
// Integrates with live session data to attribute emotional/buying signals by speaker.

import type { LiveCallSession } from "../types";
import type {
  FathomSegment,
  FathomSpeaker,
  SpeakerMetrics,
  SpeakerTalkMetrics,
  CallSpeakerIntelligence,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Talk time metrics per speaker
// ─────────────────────────────────────────────────────────────

function computeTalkMetrics(
  segments: FathomSegment[],
  speakerId: string,
  totalCallSeconds: number
): SpeakerTalkMetrics {
  const speakerSegments = segments.filter((s) => s.speaker_id === speakerId);

  if (speakerSegments.length === 0) {
    return {
      total_talk_seconds: 0,
      talk_percentage: 0,
      segment_count: 0,
      avg_segment_duration_seconds: 0,
      longest_segment_seconds: 0,
    };
  }

  const totalSeconds = speakerSegments.reduce((sum, s) => sum + s.duration_seconds, 0);
  const avgDuration = totalSeconds / speakerSegments.length;
  const longestSegment = Math.max(...speakerSegments.map((s) => s.duration_seconds));
  const percentage = totalCallSeconds > 0 ? Math.round((totalSeconds / totalCallSeconds) * 100) : 0;

  return {
    total_talk_seconds: Math.round(totalSeconds),
    talk_percentage: percentage,
    segment_count: speakerSegments.length,
    avg_segment_duration_seconds: Math.round(avgDuration * 10) / 10,
    longest_segment_seconds: Math.round(longestSegment * 10) / 10,
  };
}

// ─────────────────────────────────────────────────────────────
// Interruption detection
// An interruption is when speaker A starts within 0.5s of speaker B ending,
// AND speaker B hadn't paused (the gap between B's last word and A's start is tiny).
// ─────────────────────────────────────────────────────────────

const INTERRUPTION_GAP_THRESHOLD_S = 0.5;

function detectInterruptions(
  segments: FathomSegment[]
): Map<string, number> {
  // Returns: Map<speaker_id, interruption_count> where each count = times THAT speaker interrupted
  const counts = new Map<string, number>();

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const curr = segments[i];

    if (curr.speaker_id === prev.speaker_id) continue; // Same speaker, not an interruption

    const gap = curr.start_seconds - prev.end_seconds;
    if (gap < INTERRUPTION_GAP_THRESHOLD_S) {
      counts.set(curr.speaker_id, (counts.get(curr.speaker_id) ?? 0) + 1);
    }
  }

  return counts;
}

// ─────────────────────────────────────────────────────────────
// Attribute emotional signals from live session to speakers
// We match by timestamp: find the segment active when the chunk was processed.
// ─────────────────────────────────────────────────────────────

function attributeEmotionalSignals(
  session: LiveCallSession,
  segments: FathomSegment[],
  speakerId: string
): SpeakerMetrics["emotional_signals"] {
  const results: SpeakerMetrics["emotional_signals"] = [];

  // Get chunks where emotional signals were detected
  const emotionalChunks = session.transcript.filter(
    (chunk) => chunk.contains_emotional_shift
  );

  for (const chunk of emotionalChunks) {
    const chunkStartMs = chunk.timestamp_ms ?? (session.started_at + (chunk.chunk_index * 8000));
    const chunkStartSeconds = (chunkStartMs - session.started_at) / 1000;

    // Find which Fathom segment was active at this time
    const activeSegment = segments.find(
      (s) => s.start_seconds <= chunkStartSeconds && s.end_seconds >= chunkStartSeconds - 5
    );

    if (activeSegment?.speaker_id === speakerId) {
      const emotionalState = session.agent_outputs.emotional_signals?.emotional_state;
      if (emotionalState) {
        results.push({
          state: emotionalState,
          detected_at_chunk: chunk.chunk_index,
          start_seconds: chunkStartSeconds,
        });
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Count buying signals and objections per speaker
// from the live session data
// ─────────────────────────────────────────────────────────────

function countBuyingSignals(session: LiveCallSession, speakerId: string, speakers: FathomSpeaker[]): number {
  const speaker = speakers.find((s) => s.id === speakerId);
  if (speaker?.role !== "prospect") return 0; // Buying signals only matter for prospects

  return session.transcript.filter((c) => c.contains_buying_signal && c.speaker === "prospect").length;
}

function countObjections(session: LiveCallSession, speakerId: string, speakers: FathomSpeaker[]): number {
  const speaker = speakers.find((s) => s.id === speakerId);
  if (speaker?.role !== "prospect") return 0;

  return session.objections.raised.length;
}

// ─────────────────────────────────────────────────────────────
// Main: Compute full speaker intelligence from Fathom + live session
// ─────────────────────────────────────────────────────────────

export function computeSpeakerIntelligence(
  callId: string,
  speakers: FathomSpeaker[],
  segments: FathomSegment[],
  session: LiveCallSession | null
): CallSpeakerIntelligence {
  if (segments.length === 0) {
    return {
      call_id: callId,
      computed_at: new Date().toISOString(),
      speakers,
      metrics: [],
      rep_talk_seconds: 0,
      prospect_talk_seconds: 0,
      rep_talk_percentage: 0,
      prospect_talk_percentage: 0,
      total_interruptions: 0,
      rep_interruption_count: 0,
      prospect_interruption_count: 0,
      longest_rep_monologue_seconds: 0,
      longest_prospect_segment_seconds: 0,
    };
  }

  // Total call duration from segments
  const totalSeconds = Math.max(...segments.map((s) => s.end_seconds));
  const interruptionCounts = detectInterruptions(segments);

  const metrics: SpeakerMetrics[] = speakers.map((speaker) => {
    const talkMetrics = computeTalkMetrics(segments, speaker.id, totalSeconds);
    const speakerSegments = segments.filter((s) => s.speaker_id === speaker.id);
    const longestSegment = speakerSegments.length > 0
      ? Math.max(...speakerSegments.map((s) => s.duration_seconds))
      : 0;

    return {
      speaker_id: speaker.id,
      speaker_name: speaker.name,
      speaker_role: speaker.role,
      talk: { ...talkMetrics, longest_segment_seconds: longestSegment },
      interruption_count: interruptionCounts.get(speaker.id) ?? 0,
      emotional_signals: session
        ? attributeEmotionalSignals(session, segments, speaker.id)
        : [],
      buying_signal_count: session ? countBuyingSignals(session, speaker.id, speakers) : 0,
      objection_count: session ? countObjections(session, speaker.id, speakers) : 0,
    };
  });

  // Aggregate rep vs prospect stats
  const repMetrics = metrics.filter((m) => m.speaker_role === "rep");
  const prospectMetrics = metrics.filter((m) => m.speaker_role === "prospect");

  const repTalkSeconds = repMetrics.reduce((sum, m) => sum + m.talk.total_talk_seconds, 0);
  const prospectTalkSeconds = prospectMetrics.reduce((sum, m) => sum + m.talk.total_talk_seconds, 0);
  const totalAttributed = repTalkSeconds + prospectTalkSeconds;

  const repTalkPct = totalAttributed > 0 ? Math.round((repTalkSeconds / totalAttributed) * 100) : 0;
  const prospectTalkPct = totalAttributed > 0 ? Math.round((prospectTalkSeconds / totalAttributed) * 100) : 0;

  const repInterruptions = repMetrics.reduce((sum, m) => sum + m.interruption_count, 0);
  const prospectInterruptions = prospectMetrics.reduce((sum, m) => sum + m.interruption_count, 0);

  const longestRepMonologue = repMetrics.reduce((max, m) => Math.max(max, m.talk.longest_segment_seconds), 0);
  const longestProspectSegment = prospectMetrics.reduce((max, m) => Math.max(max, m.talk.longest_segment_seconds), 0);

  return {
    call_id: callId,
    computed_at: new Date().toISOString(),
    speakers,
    metrics,
    rep_talk_seconds: repTalkSeconds,
    prospect_talk_seconds: prospectTalkSeconds,
    rep_talk_percentage: repTalkPct,
    prospect_talk_percentage: prospectTalkPct,
    total_interruptions: repInterruptions + prospectInterruptions,
    rep_interruption_count: repInterruptions,
    prospect_interruption_count: prospectInterruptions,
    longest_rep_monologue_seconds: longestRepMonologue,
    longest_prospect_segment_seconds: longestProspectSegment,
  };
}
