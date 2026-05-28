// Victoria — Question Stack Detector
// Detects when the rep fires multiple questions in a single turn.
// Prospect always answers the easiest one — the important question gets lost.
// Server-side only.

import type { TranscriptChunk } from "../../types";

export interface QuestionStackEvent {
  chunk_index: number;
  question_count: number;
  text_preview: string;
}

/**
 * Scan the transcript for rep turns containing ≥ 2 question marks.
 * Every additional question dilutes the most important one.
 */
export function detectQuestionStacking(transcript: TranscriptChunk[]): QuestionStackEvent[] {
  const events: QuestionStackEvent[] = [];

  for (let i = 0; i < transcript.length; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "rep") continue;

    const questionCount = (chunk.text.match(/\?/g) ?? []).length;
    if (questionCount >= 2) {
      events.push({
        chunk_index: i,
        question_count: questionCount,
        text_preview: chunk.text.slice(0, 90),
      });
    }
  }

  return events;
}
