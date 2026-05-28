// Victoria — Emotional Miss Detector
// Pure function — no AI, no I/O.
// Detects when the prospect expresses an emotional signal and the rep ignores it.
// Server-side only.

import type { TranscriptChunk } from "../../types";

export interface EmotionalMissEvent {
  chunk_index: number;
  emotional_signal: string;      // The prospect's emotional statement
  rep_response_preview: string;  // What the rep said instead of acknowledging
  missed_type: "complete_ignore" | "pivot_without_acknowledge" | "generic_acknowledge";
}

// Patterns that signal the prospect is expressing emotion / vulnerability
const EMOTIONAL_SIGNALS = [
  /stress(ed|ful|ing)?/i,
  /frustrat(ed|ing|ion)/i,
  /worried|anxious|nervous|scared/i,
  /tired of|fed up|done with|sick of/i,
  /overwhelm(ed|ing)?/i,
  /keep(s)? me up/i,
  /can'?t (sleep|relax)/i,
  /honestly|I'?m (just )?being honest/i,
  /feel(ing)? (stuck|lost|defeated|hopeless|behind)/i,
  /I don'?t know (what|how) (to|I)/i,
  /it'?s (been|getting) (hard|tough|rough)/i,
  /I'?m (struggling|worried|nervous|scared)/i,
  /this (keeps|has been) (bothering|killing|hurting)/i,
];

// Patterns that indicate the rep genuinely acknowledged the emotion
const STRONG_ACKNOWLEDGMENTS = [
  /that'?s (real|tough|hard|rough|fair|a lot)/i,
  /I (hear|understand) (you|that|what you'?re saying)/i,
  /sounds like (you|that)/i,
  /that (must|would) (be|feel)/i,
  /I can (see|imagine|understand) (why|how)/i,
  /makes (complete )?sense/i,
  /tell me more about that/i,
  /walk me through (that|what happened)/i,
];

// Patterns that indicate the rep said something generic instead
const GENERIC_ACKNOWLEDGMENTS = [
  /absolutely|totally|completely/i,
  /I understand/i,
  /got it/i,
  /okay|ok/i,
  /right,? (so|let me|what if)/i,
];

// Patterns that indicate the rep pivoted to pitch immediately
const PITCH_PIVOT_PATTERNS = [
  /our (system|platform|service|offer|program)/i,
  /vault co/i,
  /what we do/i,
  /we (set up|build|install|create)/i,
  /let me (tell|show|explain) you/i,
  /our (process|approach|solution)/i,
];

export function detectEmotionalMisses(transcript: TranscriptChunk[]): EmotionalMissEvent[] {
  const events: EmotionalMissEvent[] = [];

  for (let i = 0; i < transcript.length - 1; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "prospect") continue;

    const hasEmotion = EMOTIONAL_SIGNALS.some((p) => p.test(chunk.text));
    if (!hasEmotion) continue;

    const nextChunk = transcript[i + 1];
    if (!nextChunk || nextChunk.speaker !== "rep") continue;

    const stronglyAcknowledged = STRONG_ACKNOWLEDGMENTS.some((p) => p.test(nextChunk.text));
    if (stronglyAcknowledged) continue; // Rep handled it well

    const genericAcknowledged = GENERIC_ACKNOWLEDGMENTS.some((p) => p.test(nextChunk.text));
    const pivotedToPitch = PITCH_PIVOT_PATTERNS.some((p) => p.test(nextChunk.text));

    let missed_type: EmotionalMissEvent["missed_type"];
    if (pivotedToPitch) {
      missed_type = "pivot_without_acknowledge";
    } else if (genericAcknowledged) {
      missed_type = "generic_acknowledge";
    } else {
      missed_type = "complete_ignore";
    }

    events.push({
      chunk_index: i + 1,
      emotional_signal: chunk.text.slice(0, 100),
      rep_response_preview: nextChunk.text.slice(0, 70),
      missed_type,
    });
  }

  return events;
}
