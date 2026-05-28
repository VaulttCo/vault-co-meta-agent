// Victoria — Interruption Detector
// Pure function — no AI, no I/O. Detects when the rep cuts the prospect off.
// Server-side only.

import type { TranscriptChunk } from "../../types";

export interface InterruptionEvent {
  chunk_index: number;
  type: "abrupt_takeover" | "quick_response";
  prospect_text: string;    // The incomplete prospect utterance
  rep_text_preview: string; // What the rep said instead
  confidence: "high" | "medium";
}

// A clean prospect turn ends with terminal punctuation
const TERMINAL_PUNCT = /[.!?]["']?\s*$/;

/**
 * Detect when the rep takes over before the prospect has finished speaking.
 *
 * Pattern: Prospect chunk ends abruptly (no terminal punctuation, short)
 * followed immediately by a rep chunk.
 *
 * Thresholds (tuned for 8-second chunks):
 * - < 6 words, no terminal punct → high confidence interruption
 * - < 12 words, no terminal punct → medium confidence
 */
export function detectInterruptions(transcript: TranscriptChunk[]): InterruptionEvent[] {
  const events: InterruptionEvent[] = [];

  for (let i = 1; i < transcript.length; i++) {
    const prev = transcript[i - 1];
    const curr = transcript[i];

    if (prev.speaker !== "prospect" || curr.speaker !== "rep") continue;

    const text = prev.text.trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    const endsCleanly = TERMINAL_PUNCT.test(text);

    // Only flag if the prospect chunk was short AND didn't end with punctuation
    if (!endsCleanly && words < 12) {
      events.push({
        chunk_index: i,
        type: "abrupt_takeover",
        prospect_text: text.slice(0, 100),
        rep_text_preview: curr.text.slice(0, 60),
        confidence: words < 6 ? "high" : "medium",
      });
    }
  }

  return events;
}

/**
 * Returns only the most recent N interruption events to avoid
 * flooding the coaching system with old events.
 */
export function getRecentInterruptions(
  events: InterruptionEvent[],
  limit = 3
): InterruptionEvent[] {
  return events.slice(-limit);
}
