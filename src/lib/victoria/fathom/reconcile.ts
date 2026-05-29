// Victoria — Transcript Reconciliation
// Server-side only. Compares the live browser transcript (chunked, low-latency)
// against the authoritative Fathom diarized transcript (precise, post-processed).
//
// Purpose:
// - Assign real speaker names to live chunks
// - Fill transcript gaps that browser transcription missed
// - Build an enriched timeline with accurate timestamps

import type { LiveCallSession } from "../types";
import type {
  FathomSegment,
  EnrichedTranscriptEntry,
  ReconciliationResult,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Text similarity — simple word overlap score (Jaccard)
// Used to match live chunks to Fathom segments.
// Full NLP is overkill; word overlap handles paraphrase differences.
// ─────────────────────────────────────────────────────────────

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2) // ignore short stop words
  );
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = wordSet(a);
  const setB = wordSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

// ─────────────────────────────────────────────────────────────
// Match live chunks to Fathom segments
// Returns matched pairs and unmatched Fathom segments (gaps).
// ─────────────────────────────────────────────────────────────

const MATCH_THRESHOLD = 0.25; // Min Jaccard similarity to consider a match

interface MatchedPair {
  chunk_index: number;
  fathom_segment_index: number;
  similarity: number;
}

function matchChunksToSegments(
  session: LiveCallSession,
  segments: FathomSegment[]
): { matched: MatchedPair[]; unmatchedFathomIndices: number[] } {
  const matched: MatchedPair[] = [];
  const usedSegmentIndices = new Set<number>();

  for (const chunk of session.transcript) {
    let bestSimilarity = MATCH_THRESHOLD;
    let bestSegmentIndex = -1;

    for (let si = 0; si < segments.length; si++) {
      if (usedSegmentIndices.has(si)) continue;

      const similarity = jaccardSimilarity(chunk.text, segments[si].text);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestSegmentIndex = si;
      }
    }

    if (bestSegmentIndex >= 0) {
      matched.push({
        chunk_index: chunk.chunk_index,
        fathom_segment_index: bestSegmentIndex,
        similarity: bestSimilarity,
      });
      usedSegmentIndices.add(bestSegmentIndex);
    }
  }

  const unmatchedFathomIndices = segments
    .map((_, i) => i)
    .filter((i) => !usedSegmentIndices.has(i));

  return { matched, unmatchedFathomIndices };
}

// ─────────────────────────────────────────────────────────────
// Build enriched transcript entries
// ─────────────────────────────────────────────────────────────

export function reconcileTranscripts(
  session: LiveCallSession,
  segments: FathomSegment[],
  callId: string
): ReconciliationResult {
  const { matched, unmatchedFathomIndices } = matchChunksToSegments(session, segments);

  // Map chunk_index → matched segment for quick lookup
  const chunkToSegment = new Map<number, number>(
    matched.map((m) => [m.chunk_index, m.fathom_segment_index])
  );

  // Build set of chunk_indices that have coaching events
  const coachingChunks = new Set(
    session.coaching_history.map((c) => c.chunk_index)
  );

  // Build enriched entries from live chunks
  const liveEntries: EnrichedTranscriptEntry[] = session.transcript.map((chunk) => {
    const segmentIndex = chunkToSegment.get(chunk.chunk_index);
    const segment = segmentIndex !== undefined ? segments[segmentIndex] : null;

    const chunkStartS = chunk.started_at_seconds
      ?? ((chunk.chunk_index * 8)); // Estimate: 8s chunks

    return {
      source: segment ? "reconciled" : "live",
      chunk_index: chunk.chunk_index,
      fathom_segment_index: segmentIndex,
      speaker_role: chunk.speaker,
      // Use Fathom speaker name if matched, otherwise generic label
      speaker_name: segment?.speaker_name ?? (chunk.speaker === "rep" ? "Rep" : "Prospect"),
      text: chunk.text,
      start_seconds: segment?.start_seconds ?? chunkStartS,
      end_seconds: segment?.end_seconds,
      timestamp_ms: chunk.timestamp_ms,
      has_coaching_event: coachingChunks.has(chunk.chunk_index),
    };
  });

  // Build entries from Fathom gap segments (not matched to any live chunk)
  const gapEntries: EnrichedTranscriptEntry[] = unmatchedFathomIndices.map((si) => {
    const seg = segments[si];
    return {
      source: "fathom_gap",
      fathom_segment_index: si,
      speaker_role: seg.speaker_role,
      speaker_name: seg.speaker_name,
      text: seg.text,
      start_seconds: seg.start_seconds,
      end_seconds: seg.end_seconds,
      timestamp_ms: session.started_at + Math.round(seg.start_seconds * 1000),
      has_coaching_event: false,
    };
  });

  // Merge and sort by start_seconds
  const allEntries: EnrichedTranscriptEntry[] = [
    ...liveEntries,
    ...gapEntries,
  ].sort((a, b) => a.start_seconds - b.start_seconds);

  return {
    call_id: callId,
    reconciled_at: new Date().toISOString(),
    live_chunk_count: session.transcript.length,
    fathom_segment_count: segments.length,
    matched_count: matched.length,
    gap_count: unmatchedFathomIndices.length,
    enriched_transcript: allEntries,
  };
}
