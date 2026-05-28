// Victoria — Talk Ratio Calculator
// Pure function — no AI, no I/O. Runs synchronously every chunk.
// Server-side only.

import type { TranscriptChunk } from "../../types";

export interface TalkRatio {
  rep_percent: number;
  prospect_percent: number;
  rep_words: number;
  prospect_words: number;
  total_words: number;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Calculate the rolling talk ratio across the entire transcript.
 * The ideal ratio is rep 30-45%, prospect 55-70%.
 */
export function calculateTalkRatio(transcript: TranscriptChunk[]): TalkRatio {
  const repWords = transcript
    .filter((c) => c.speaker === "rep")
    .reduce((sum, c) => sum + wordCount(c.text), 0);

  const prospectWords = transcript
    .filter((c) => c.speaker === "prospect")
    .reduce((sum, c) => sum + wordCount(c.text), 0);

  const total = repWords + prospectWords;

  if (total === 0) {
    return { rep_percent: 50, prospect_percent: 50, rep_words: 0, prospect_words: 0, total_words: 0 };
  }

  return {
    rep_percent: Math.round((repWords / total) * 100),
    prospect_percent: Math.round((prospectWords / total) * 100),
    rep_words: repWords,
    prospect_words: prospectWords,
    total_words: total,
  };
}

/**
 * Evaluate talk ratio and return a severity level.
 * Used for UI coloring and coaching card priority.
 */
export function talkRatioSeverity(
  repPercent: number
): "critical" | "warning" | "good" | "excellent" {
  if (repPercent > 75) return "critical";
  if (repPercent > 60) return "warning";
  if (repPercent <= 45) return "excellent";
  return "good";
}
