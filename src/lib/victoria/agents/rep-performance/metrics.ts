// Victoria — Rep Performance Metrics Aggregator
// Combines all rule-based detectors into a single metrics object.
// Pure function — no AI, no I/O.
// Server-side only.

import type { LiveCallSession, RepWarning, RepWarningType } from "../../types";
import { calculateTalkRatio, type TalkRatio } from "./talk-ratio";
import { detectInterruptions, type InterruptionEvent } from "./interruption-detector";
import { detectEmotionalMisses, type EmotionalMissEvent } from "./emotional-miss-detector";
import {
  detectOvertalking,
  detectPrematurePitching,
  detectQuestionStacking,
  detectOverexplaining,
  detectPositives,
  type OvertalkingEvent,
  type PrematurePitchEvent,
  type QuestionStackingEvent,
  type OverexplainingEvent,
} from "./detectors";

export interface RuleBasedMetrics {
  talk_ratio: TalkRatio;
  interruptions: InterruptionEvent[];
  emotional_misses: EmotionalMissEvent[];
  overtalking: OvertalkingEvent[];
  premature_pitches: PrematurePitchEvent[];
  question_stacking: QuestionStackingEvent[];
  overexplaining: OverexplainingEvent[];
  warnings: RepWarning[];
  positive_observations: string[];
  // Counts for quick access
  interruption_count: number;
  emotional_miss_count: number;
  premature_pitch_events: number;
  question_stacking_events: number;
  overexplaining_events: number;
}

/**
 * Compute all rule-based metrics from the session.
 * This runs synchronously before any AI calls.
 */
export function computeRepMetrics(session: LiveCallSession): RuleBasedMetrics {
  const { transcript, discovery } = session;
  const depthScore = discovery.depth_score;

  // Run all detectors
  const talkRatio = calculateTalkRatio(transcript);
  const interruptions = detectInterruptions(transcript);
  const emotionalMisses = detectEmotionalMisses(transcript);
  const overtalkingEvents = detectOvertalking(transcript);
  const prematurePitches = detectPrematurePitching(transcript, depthScore);
  const questionStacking = detectQuestionStacking(transcript);
  const overexplaining = detectOverexplaining(transcript);
  const positives = detectPositives(transcript, session);

  // Build warnings list from all detected issues
  const warnings: RepWarning[] = [];
  const lastChunk = transcript.length - 1;

  // --- Overtalking ---
  if (talkRatio.rep_percent > 70) {
    warnings.push({
      type: "overtalking" as RepWarningType,
      severity: talkRatio.rep_percent > 80 ? "critical" : "high",
      message: `Rep is doing ${talkRatio.rep_percent}% of the talking — prospect can't build momentum`,
      evidence: `Rolling talk ratio: ${talkRatio.rep_percent}% rep / ${talkRatio.prospect_percent}% prospect`,
      chunk_index: lastChunk,
      suggested_fix: "Stop. Ask one open question. Count to 3 in your head before speaking again.",
    });
  } else if (overtalkingEvents.some((e) => e.type === "monologue")) {
    const evt = overtalkingEvents.filter((e) => e.type === "monologue").slice(-1)[0];
    warnings.push({
      type: "overtalking" as RepWarningType,
      severity: "high",
      message: `Rep monologued for ${evt.rep_word_count} words in one turn`,
      evidence: `Single turn exceeded 120 words — prospect disengages after ~60 words`,
      chunk_index: evt.chunk_index,
      suggested_fix: "Cut the explanation short. Ask: 'Does that make sense so far?' or just ask a question.",
    });
  }

  // --- Interrupting ---
  if (interruptions.length > 0) {
    const latest = interruptions[interruptions.length - 1];
    warnings.push({
      type: "interrupting" as RepWarningType,
      severity: latest.confidence === "high" ? "critical" : "high",
      message: "Rep appears to have cut the prospect off before they finished",
      evidence: `Prospect: "${latest.prospect_text.slice(0, 55)}…" (incomplete)`,
      chunk_index: latest.chunk_index,
      suggested_fix: "Let them finish. Count to 2 after they stop before responding. Their unfinished thought matters.",
    });
  }

  // --- Premature pitching ---
  if (prematurePitches.length > 0) {
    const latest = prematurePitches[prematurePitches.length - 1];
    warnings.push({
      type: "premature_pitching" as RepWarningType,
      severity: "critical",
      message: `Rep is pitching before pain is established — discovery only ${depthScore}/100`,
      evidence: `Used: "${latest.pitch_phrase}" at discovery depth ${depthScore}/100`,
      chunk_index: latest.chunk_index,
      suggested_fix: `Abort pitch now. Return: "Before I go there — what's the real impact of this for you financially?"`,
    });
  }

  // --- Question stacking ---
  if (questionStacking.length > 0) {
    const latest = questionStacking[questionStacking.length - 1];
    warnings.push({
      type: "question_stacking" as RepWarningType,
      severity: "medium",
      message: `${latest.question_count} questions in one turn — prospect answers the easiest one`,
      evidence: `"${latest.text_preview.slice(0, 55)}…"`,
      chunk_index: latest.chunk_index,
      suggested_fix: "Pick your single most important question. Delete the others. Wait for the answer.",
    });
  }

  // --- Overexplaining ---
  const criticalOverexplaining = overexplaining.filter((e) => e.word_count > 130);
  if (criticalOverexplaining.length > 0) {
    const latest = criticalOverexplaining[criticalOverexplaining.length - 1];
    warnings.push({
      type: "overexplaining" as RepWarningType,
      severity: "high",
      message: `Rep rambling — ${latest.word_count}-word turn without checking for understanding`,
      evidence: `"${latest.text_preview.slice(0, 55)}…"`,
      chunk_index: latest.chunk_index,
      suggested_fix: "Stop mid-thought if needed. Ask: 'What questions do you have?' Let them respond.",
    });
  }

  // --- Emotional misses ---
  const seriousMisses = emotionalMisses.filter(
    (e) => e.missed_type === "pivot_without_acknowledge" || e.missed_type === "complete_ignore"
  );
  if (seriousMisses.length > 0) {
    const latest = seriousMisses[seriousMisses.length - 1];
    warnings.push({
      type: "missing_emotional_signal" as RepWarningType,
      severity: latest.missed_type === "pivot_without_acknowledge" ? "critical" : "high",
      message: "Prospect revealed emotion — rep moved on without acknowledging it",
      evidence: `Prospect: "${latest.emotional_signal.slice(0, 55)}…" — rep pivoted`,
      chunk_index: latest.chunk_index,
      suggested_fix: `Go back: "I want to circle back — what you said about [that] — tell me more about that."`,
    });
  }

  // Sort by severity — critical first
  const severityRank = { critical: 3, high: 2, medium: 1 };
  warnings.sort((a, b) => (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0));

  return {
    talk_ratio: talkRatio,
    interruptions,
    emotional_misses: emotionalMisses,
    overtalking: overtalkingEvents,
    premature_pitches: prematurePitches,
    question_stacking: questionStacking,
    overexplaining,
    warnings: warnings.slice(0, 4), // Max 4 warnings — don't overwhelm
    positive_observations: positives,
    // Counts
    interruption_count: interruptions.length,
    emotional_miss_count: emotionalMisses.length,
    premature_pitch_events: prematurePitches.length,
    question_stacking_events: questionStacking.length,
    overexplaining_events: overexplaining.length,
  };
}
