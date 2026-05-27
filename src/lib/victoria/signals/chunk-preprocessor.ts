// Victoria — Chunk Preprocessor
// Normalizes raw transcript text and runs keyword detection before AI agents.
// Pure synchronous functions — no I/O, no AI calls.

import { detectKeywords } from "./keyword-detector";
import type { TranscriptChunk } from "../types";

// ─────────────────────────────────────────────────────────────
// Text normalization
// ─────────────────────────────────────────────────────────────

/**
 * Cleans raw transcript text from a speech-to-text provider.
 * Removes excessive filler words for AI context clarity while
 * preserving enough naturalism for emotional detection.
 */
export function normalizeTranscriptText(raw: string): string {
  return raw
    .trim()
    // Collapse multiple spaces
    .replace(/\s{2,}/g, " ")
    // Remove speech artifacts (repeated words from STT)
    .replace(/\b(\w+)\s+\1\b/gi, "$1")
    // Normalize smart quotes to straight
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // Ensure sentence ends with punctuation for cleaner AI parsing
    .replace(/([a-zA-Z0-9])$/, "$1.");
}

// ─────────────────────────────────────────────────────────────
// Main preprocessor
// ─────────────────────────────────────────────────────────────

export interface PreprocessedChunk {
  chunk: TranscriptChunk;
  raw_text: string;             // Original before normalization
  should_trigger_objection_agent: boolean;
  should_trigger_buying_signal_alert: boolean;
  should_trigger_emotional_agent: boolean;
}

export function preprocessChunk(
  raw_text: string,
  speaker: "rep" | "prospect",
  chunk_index: number,
  started_at_seconds?: number,
  ended_at_seconds?: number
): PreprocessedChunk {
  const normalized = normalizeTranscriptText(raw_text);
  const detection = detectKeywords(normalized, speaker);

  const chunk: TranscriptChunk = {
    chunk_index,
    speaker,
    text: normalized,
    started_at_seconds,
    ended_at_seconds,
    contains_objection: detection.contains_objection,
    contains_buying_signal: detection.contains_buying_signal,
    contains_emotional_shift: detection.contains_emotional_shift,
    objection_keywords_found: detection.objection_keywords_found,
    buying_signal_keywords_found: detection.buying_signal_keywords_found,
    timestamp_ms: Date.now(),
  };

  return {
    chunk,
    raw_text,
    // Triggers for the orchestrator's routing logic
    should_trigger_objection_agent: detection.contains_objection,
    should_trigger_buying_signal_alert: detection.contains_buying_signal,
    should_trigger_emotional_agent: detection.contains_emotional_shift,
  };
}

// ─────────────────────────────────────────────────────────────
// Context builder — assembles the last N chunks into readable prose
// for injection into agent prompts. Keeps tokens manageable.
// ─────────────────────────────────────────────────────────────

export function buildRecentTranscriptContext(
  transcript: TranscriptChunk[],
  lastN = 5
): string {
  const recent = transcript.slice(-lastN);
  if (recent.length === 0) return "(No transcript yet — call just started.)";

  return recent
    .map((c) => `[${c.speaker.toUpperCase()}]: ${c.text}`)
    .join("\n");
}

export function buildFullTranscriptContext(
  transcript: TranscriptChunk[],
  rollingeSummary: string,
  recentChunkCount = 5
): string {
  const parts: string[] = [];

  if (rollingeSummary) {
    parts.push(`=== EARLIER CONVERSATION SUMMARY ===\n${rollingeSummary}`);
  }

  const recent = transcript.slice(-recentChunkCount);
  if (recent.length > 0) {
    parts.push(
      `=== RECENT TRANSCRIPT ===\n${recent
        .map((c) => `[${c.speaker.toUpperCase()}]: ${c.text}`)
        .join("\n")}`
    );
  }

  return parts.join("\n\n") || "(Call just started — no transcript yet.)";
}
