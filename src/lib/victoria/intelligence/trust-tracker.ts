// Victoria — Trust Signal Tracker
// Reads the transcript for trust-building and trust-eroding language patterns.
// Supplements the AI trust score with rule-based signal detection.
// Server-side only.

import type { TranscriptChunk } from "../types";

export type TrustSignalType =
  | "vulnerability_shared"    // Prospect opens up personally
  | "validation_given"        // Rep acknowledges without pitching
  | "agreement_expressed"     // Explicit agreement or affirmation
  | "skepticism"              // Doubt about the offer/rep/agency
  | "objection_repeated"      // Same objection surfacing again
  | "competitor_mentioned"    // Prospect references a competitor
  | "price_anchoring";        // Price/budget resistance language

export interface TrustSignal {
  type: TrustSignalType;
  direction: "building" | "eroding";
  evidence: string;
  chunk_index: number;
  speaker: "rep" | "prospect";
}

const TRUST_BUILDING_PATTERNS: [TrustSignalType, RegExp][] = [
  ["vulnerability_shared",  /honest(ly)?|frankly|between us|i'll be real|truth(fully)?|can i be honest|real talk/i],
  ["validation_given",      /that makes (total )?sense|i understand|i hear you|absolutely|you're right|fair point|valid/i],
  ["agreement_expressed",   /\byes\b|\bexactly\b|\bgreat\b|\bdefinitely\b|\bof course\b|\bagreed\b|\bcorrect\b|\bright\b/i],
];

const TRUST_ERODING_PATTERNS: [TrustSignalType, RegExp][] = [
  ["skepticism",           /not sure (about|if)|hard to believe|skeptical|seen this before|heard (that|this) before|just another (agency|company|vendor)/i],
  ["objection_repeated",  /still concerned|still worried|still not (sure|convinced)|already (said|mentioned|told you)|brought (that|this) up/i],
  ["competitor_mentioned", /homeadvisor|angi|yelp|thumbtack|servicetitan|the other (guys|company|service|agency)|we were looking at/i],
  ["price_anchoring",      /too expensive|can'?t afford|out of (my |our )?budget|cheaper|less expensive|what['']?s the cost|how much (is|does)/i],
];

export function analyzeTrustSignals(transcript: TranscriptChunk[]): TrustSignal[] {
  const signals: TrustSignal[] = [];

  for (let i = 0; i < transcript.length; i++) {
    const chunk = transcript[i];
    const text = chunk.text;

    for (const [type, pattern] of TRUST_BUILDING_PATTERNS) {
      if (pattern.test(text)) {
        signals.push({ type, direction: "building", evidence: text.slice(0, 70), chunk_index: i, speaker: chunk.speaker });
        break;
      }
    }

    for (const [type, pattern] of TRUST_ERODING_PATTERNS) {
      if (pattern.test(text)) {
        signals.push({ type, direction: "eroding", evidence: text.slice(0, 70), chunk_index: i, speaker: chunk.speaker });
        break;
      }
    }
  }

  return signals;
}

/**
 * Derive the net trust direction from the most recent N chunks' signals.
 */
export function recentTrustDirection(
  signals: TrustSignal[],
  lastNChunks = 6
): "building" | "stable" | "eroding" {
  if (signals.length === 0) return "stable";
  const recentMax = signals[signals.length - 1].chunk_index;
  const recent = signals.filter((s) => s.chunk_index >= recentMax - lastNChunks);
  const building = recent.filter((s) => s.direction === "building").length;
  const eroding  = recent.filter((s) => s.direction === "eroding").length;
  if (building > eroding + 1) return "building";
  if (eroding > building + 1) return "eroding";
  return "stable";
}
