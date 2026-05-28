// Victoria — Rule-Based Rep Behavior Detectors
// Pure functions — no AI, no I/O. All run synchronously.
// Server-side only.

import type { TranscriptChunk, LiveCallSession } from "../../types";

// ─────────────────────────────────────────────────────────────
// Overtalking
// ─────────────────────────────────────────────────────────────

export interface OvertalkingEvent {
  chunk_index: number;
  rep_word_count: number;
  consecutive_rep_chunks: number;
  type: "monologue" | "long_turn" | "dominating";
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function detectOvertalking(transcript: TranscriptChunk[]): OvertalkingEvent[] {
  const events: OvertalkingEvent[] = [];
  const seen = new Set<number>();

  // Long single turn (> 120 words = clear monologue)
  for (let i = 0; i < transcript.length; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "rep") continue;
    const words = countWords(chunk.text);
    if (words > 120 && !seen.has(i)) {
      events.push({ chunk_index: i, rep_word_count: words, consecutive_rep_chunks: 1, type: "monologue" });
      seen.add(i);
    } else if (words > 80 && !seen.has(i)) {
      events.push({ chunk_index: i, rep_word_count: words, consecutive_rep_chunks: 1, type: "long_turn" });
      seen.add(i);
    }
  }

  // Consecutive rep chunks without prospect speaking (3+ = dominating)
  let consecutiveStart = -1;
  let consecutiveCount = 0;
  for (let i = 0; i < transcript.length; i++) {
    if (transcript[i].speaker === "rep") {
      if (consecutiveCount === 0) consecutiveStart = i;
      consecutiveCount++;
      if (consecutiveCount >= 3 && !seen.has(i)) {
        const totalWords = transcript
          .slice(consecutiveStart, i + 1)
          .reduce((s, c) => s + countWords(c.text), 0);
        events.push({
          chunk_index: i,
          rep_word_count: totalWords,
          consecutive_rep_chunks: consecutiveCount,
          type: "dominating",
        });
        seen.add(i);
      }
    } else {
      consecutiveCount = 0;
    }
  }

  return events;
}

// ─────────────────────────────────────────────────────────────
// Premature Pitching
// ─────────────────────────────────────────────────────────────

export interface PrematurePitchEvent {
  chunk_index: number;
  discovery_depth_at_time: number;
  pitch_phrase: string;
}

const PITCH_PATTERNS = [
  /our (60[-\s]?day|revenue system|full system|platform|offer|program|solution)/i,
  /vault co (does|offers|provides|installs|builds)/i,
  /what we (do|offer|provide|build|install|set up) is/i,
  /we (set up|build|install|create) (a|the|your|an)/i,
  /this is how (it|we) work(s)?/i,
  /our (process|approach|methodology|system)/i,
  /let me (tell|show|walk) you (about|through|how)/i,
  /we (include|use|have|run) (a|the) (crm|automation|follow.up|campaign)/i,
];

export function detectPrematurePitching(
  transcript: TranscriptChunk[],
  discoveryDepthScore: number
): PrematurePitchEvent[] {
  if (discoveryDepthScore >= 55) return []; // Not premature past this threshold

  const events: PrematurePitchEvent[] = [];

  for (let i = 0; i < transcript.length; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "rep") continue;

    for (const pattern of PITCH_PATTERNS) {
      const match = chunk.text.match(pattern);
      if (match) {
        events.push({
          chunk_index: i,
          discovery_depth_at_time: discoveryDepthScore,
          pitch_phrase: match[0].slice(0, 50),
        });
        break; // One event per chunk
      }
    }
  }

  return events;
}

// ─────────────────────────────────────────────────────────────
// Question Stacking
// ─────────────────────────────────────────────────────────────

export interface QuestionStackingEvent {
  chunk_index: number;
  question_count: number;
  text_preview: string;
}

export function detectQuestionStacking(transcript: TranscriptChunk[]): QuestionStackingEvent[] {
  const events: QuestionStackingEvent[] = [];

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

// ─────────────────────────────────────────────────────────────
// Overexplaining
// ─────────────────────────────────────────────────────────────

export interface OverexplainingEvent {
  chunk_index: number;
  word_count: number;
  text_preview: string;
}

export function detectOverexplaining(transcript: TranscriptChunk[]): OverexplainingEvent[] {
  const events: OverexplainingEvent[] = [];

  for (let i = 0; i < transcript.length; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "rep") continue;

    const words = countWords(chunk.text);
    if (words > 100) {
      events.push({
        chunk_index: i,
        word_count: words,
        text_preview: chunk.text.slice(0, 90),
      });
    }
  }

  return events;
}

// ─────────────────────────────────────────────────────────────
// Positive observations (rule-based)
// ─────────────────────────────────────────────────────────────

export function detectPositives(transcript: TranscriptChunk[], session: LiveCallSession): string[] {
  const positives: string[] = [];

  if (transcript.length < 3) return positives;

  const repChunks = transcript.filter((c) => c.speaker === "rep");
  const prospectChunks = transcript.filter((c) => c.speaker === "prospect");

  // Good talk ratio
  const repWords = repChunks.reduce((s, c) => s + countWords(c.text), 0);
  const prospectWords = prospectChunks.reduce((s, c) => s + countWords(c.text), 0);
  const total = repWords + prospectWords;

  if (total > 0) {
    const repPct = (repWords / total) * 100;
    if (repPct < 40) {
      positives.push("Excellent listening ratio — prospect is doing most of the talking");
    } else if (repPct < 50) {
      positives.push("Good listening ratio — rep is letting the prospect speak");
    }
  }

  // Discovery progression
  if (session.discovery.depth_score >= 60) {
    positives.push(`Discovery depth at ${session.discovery.depth_score}/100 — pain is becoming vivid`);
  }

  // Buying signals detected
  const bsCount = transcript.filter((c) => c.contains_buying_signal && c.speaker === "prospect").length;
  if (bsCount > 0) {
    positives.push(`${bsCount} buying signal${bsCount > 1 ? "s" : ""} from the prospect — deal is alive`);
  }

  // No consecutive rep monologuing in last 8 turns
  const recent = transcript.slice(-8);
  let maxConsecutiveRep = 0;
  let curRep = 0;
  for (const chunk of recent) {
    if (chunk.speaker === "rep") { curRep++; maxConsecutiveRep = Math.max(maxConsecutiveRep, curRep); }
    else curRep = 0;
  }
  if (maxConsecutiveRep <= 1 && recent.length >= 6) {
    positives.push("Good turn-taking — conversation is balanced and two-way");
  }

  // Rep asked a short question recently (good probing pattern)
  const lastRepChunk = [...repChunks].reverse()[0];
  if (lastRepChunk) {
    const words = countWords(lastRepChunk.text);
    const hasQuestion = /\?/.test(lastRepChunk.text);
    if (words < 25 && hasQuestion) {
      positives.push("Tight, focused question — no unnecessary preamble");
    }
  }

  return positives.slice(0, 3);
}
