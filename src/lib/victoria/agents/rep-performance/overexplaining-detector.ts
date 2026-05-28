// Victoria — Overexplaining Detector
// Detects rep turns that go past the point of diminishing returns.
// Prospects disengage mentally after ~60 words. Past 100 is overexplaining.
// Server-side only.

import type { TranscriptChunk } from "../../types";

export interface OverexplainingEvent {
  chunk_index: number;
  word_count: number;
  text_preview: string;
  severity: "critical" | "high";
}

// A rep turn past 100 words is overexplaining.
// Past 130 words without a question is a monologue — critical.
export const OVEREXPLAINING_CRITICAL_THRESHOLD = 130;
export const OVEREXPLAINING_WARNING_THRESHOLD = 100;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Scan the transcript for rep turns exceeding the word-count threshold.
 * Returns all events sorted by chunk index.
 */
export function detectOverexplaining(transcript: TranscriptChunk[]): OverexplainingEvent[] {
  const events: OverexplainingEvent[] = [];

  for (let i = 0; i < transcript.length; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "rep") continue;

    const words = countWords(chunk.text);
    if (words >= OVEREXPLAINING_WARNING_THRESHOLD) {
      events.push({
        chunk_index: i,
        word_count: words,
        text_preview: chunk.text.slice(0, 90),
        severity: words >= OVEREXPLAINING_CRITICAL_THRESHOLD ? "critical" : "high",
      });
    }
  }

  return events;
}
