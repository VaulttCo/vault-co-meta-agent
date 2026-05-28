// Victoria — Urgency Signal Tracker
// Reads the transcript for language that increases or decreases deal urgency.
// Server-side only.

import type { TranscriptChunk } from "../types";

export type UrgencySignalType =
  | "timeline_mentioned"      // Explicit deadline or timeframe
  | "financial_pressure"      // Revenue/lead loss language
  | "seasonal_deadline"       // Industry season pressure
  | "competitor_threat"       // Risk of losing to a competitor
  | "problem_escalating"      // Pain getting worse
  | "no_rush"                 // No urgency expressed
  | "delaying"                // Stalling / think about it
  | "budget_delay";           // Waiting for budget/season

export interface UrgencySignal {
  type: UrgencySignalType;
  direction: "increasing" | "decreasing";
  evidence: string;
  chunk_index: number;
}

const URGENCY_INCREASING: [UrgencySignalType, RegExp][] = [
  ["timeline_mentioned",   /by (end of|next|this) (month|quarter|week|season|year)|need (it|this) (soon|quickly|asap|fast|by)|deadline/i],
  ["financial_pressure",   /(losing|lost) (revenue|leads|jobs|clients|business|calls)|costing (me|us)|miss(ing)? (out|revenue|jobs|season)/i],
  ["seasonal_deadline",    /(roofing|hvac|landscaping|painting|plumbing) season|busy season|slow season|peak (season|time)|before (winter|summer|spring|fall)/i],
  ["competitor_threat",    /competitor(s)?( are| is)?|competition|the other (company|service|option|agency)( is| are)?|they're (getting|taking|running)/i],
  ["problem_escalating",   /getting worse|worse (every|and worse)|more and more|keep (losing|missing|failing)|can't keep up|piling up|out of control/i],
];

const URGENCY_DECREASING: [UrgencySignalType, RegExp][] = [
  ["no_rush",    /no (rush|hurry|urgency)|not (in a hurry|rushed|urgent)|plenty of time|whenever|eventually|someday|later on/i],
  ["delaying",   /think (about|it) (over|more|through)|need (more )?time|not ready|maybe later|we'll see|check with|let me (think|talk|see)/i],
  ["budget_delay", /wait(ing)? for|saving up|after (the season|next month|Q[1-4]|the year)|when (things|business|cash flow)|once (we|things)/i],
];

export function analyzeUrgencySignals(transcript: TranscriptChunk[]): UrgencySignal[] {
  const signals: UrgencySignal[] = [];

  for (let i = 0; i < transcript.length; i++) {
    const chunk = transcript[i];
    const text = chunk.text;

    for (const [type, pattern] of URGENCY_INCREASING) {
      if (pattern.test(text)) {
        signals.push({ type, direction: "increasing", evidence: text.slice(0, 70), chunk_index: i });
        break;
      }
    }

    for (const [type, pattern] of URGENCY_DECREASING) {
      if (pattern.test(text)) {
        signals.push({ type, direction: "decreasing", evidence: text.slice(0, 70), chunk_index: i });
        break;
      }
    }
  }

  return signals;
}

export function recentUrgencyDirection(
  signals: UrgencySignal[],
  lastNChunks = 6
): "increasing" | "stable" | "decreasing" {
  if (signals.length === 0) return "stable";
  const recentMax = signals[signals.length - 1].chunk_index;
  const recent = signals.filter((s) => s.chunk_index >= recentMax - lastNChunks);
  const increasing = recent.filter((s) => s.direction === "increasing").length;
  const decreasing = recent.filter((s) => s.direction === "decreasing").length;
  if (increasing > decreasing) return "increasing";
  if (decreasing > increasing) return "decreasing";
  return "stable";
}
