// Victoria — Rule-Based Rep Behavior Detectors
// Pure functions — no AI, no I/O. All run synchronously.
// Server-side only.

// Re-export from focused detector modules so metrics.ts can import from one place
export { detectQuestionStacking, type QuestionStackEvent } from "./question-stack-detector";
export { detectOverexplaining, type OverexplainingEvent } from "./overexplaining-detector";

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
// Buying Signal Ignored
// Detect when rep responds to a prospect buying signal by pitching
// features instead of asking a trial close question.
// ─────────────────────────────────────────────────────────────

export interface BuyingSignalIgnoreEvent {
  chunk_index: number;         // The rep turn that ignored the signal
  prospect_signal: string;     // What the prospect said (first 60 chars)
  rep_response_preview: string;// What the rep said instead
}

const TRIAL_CLOSE_PATTERNS = [
  /what would (it|that) take/i,
  /what would need to (be true|happen)/i,
  /does that make sense/i,
  /how does that (sound|feel|look)/i,
  /are you (seeing|feeling|thinking)/i,
  /can you see (how|yourself|this)/i,
  /what('?s| is) (stopping|holding)/i,
  /what('?s| is) your (gut|instinct|feeling)/i,
  /where (are you|do you sit) on (that|this)/i,
];

export function detectBuyingSignalIgnore(transcript: TranscriptChunk[]): BuyingSignalIgnoreEvent[] {
  const events: BuyingSignalIgnoreEvent[] = [];

  for (let i = 0; i < transcript.length - 1; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "prospect" || !chunk.contains_buying_signal) continue;

    // Find the next rep turn
    const nextRep = transcript.slice(i + 1).find((c) => c.speaker === "rep");
    if (!nextRep) continue;

    const hasPitchPattern = PITCH_PATTERNS.some((p) => p.test(nextRep.text));
    const hasTrialClose = TRIAL_CLOSE_PATTERNS.some((p) => p.test(nextRep.text));

    // Rep pitched features instead of asking a trial close
    if (hasPitchPattern && !hasTrialClose) {
      events.push({
        chunk_index: nextRep.chunk_index,
        prospect_signal: chunk.text.slice(0, 60),
        rep_response_preview: nextRep.text.slice(0, 60),
      });
    }
  }

  return events;
}

// ─────────────────────────────────────────────────────────────
// Feature vs Outcome Language
// Detect when rep talks about FEATURES of the product instead of
// OUTCOMES/RESULTS the prospect actually cares about.
// ─────────────────────────────────────────────────────────────

export interface FeatureVsOutcomeEvent {
  chunk_index: number;
  feature_phrase: string;
  word_count: number;
}

const FEATURE_LANGUAGE_PATTERNS = [
  /we (have|use|offer|include|provide|run|build|set up) (a |the |an |our )?(crm|dashboard|portal|platform|automation|software|tool|tracking|system|pipeline)/i,
  /it('?s| is) (built|powered|integrated|connected|synced|automated)/i,
  /we (create|build|install|set up|manage|run) (your )?(website|landing page|funnel|ad campaign|google|facebook|meta)/i,
  /we (include|add|set up) (a |the |an )?(follow.?up|email|sms|text|drip|sequence)/i,
  /our (technology|tech|software|platform|system|process|dashboard|reporting)/i,
];

const OUTCOME_LANGUAGE_PATTERNS = [
  /(more|extra|additional) (revenue|income|profit|jobs|leads|bookings|calls|clients)/i,
  /grow(ing|th) (your )?(business|revenue|team)/i,
  /roi|return on/i,
  /stop (losing|missing|wasting)/i,
  /what (this|that) means for you/i,
  /the (result|impact|difference) (is|will be|for you)/i,
];

export function detectFeatureVsOutcome(transcript: TranscriptChunk[]): FeatureVsOutcomeEvent[] {
  const events: FeatureVsOutcomeEvent[] = [];

  for (let i = 0; i < transcript.length; i++) {
    const chunk = transcript[i];
    if (chunk.speaker !== "rep") continue;

    const hasFeature = FEATURE_LANGUAGE_PATTERNS.some((p) => p.test(chunk.text));
    const hasOutcome = OUTCOME_LANGUAGE_PATTERNS.some((p) => p.test(chunk.text));

    // Feature-heavy without connecting to outcomes
    if (hasFeature && !hasOutcome && countWords(chunk.text) > 30) {
      const match = FEATURE_LANGUAGE_PATTERNS.map((p) => chunk.text.match(p)).filter(Boolean)[0];
      events.push({
        chunk_index: i,
        feature_phrase: match?.[0]?.slice(0, 50) ?? chunk.text.slice(0, 50),
        word_count: countWords(chunk.text),
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
