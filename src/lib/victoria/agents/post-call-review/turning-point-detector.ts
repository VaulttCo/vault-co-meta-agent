// Victoria — Turning Point Detector
// Identifies the pivotal moments where the call's trajectory changed.
// Uses the timeline events captured during the live call + additional full-call analysis.
// Rule-based, synchronous — no AI, no I/O.
// Server-side only.

import type { LiveCallSession, TurningPoint, TurningPointType, TimelineEvent } from "../../types";

let _idCounter = 0;
function makeId(type: TurningPointType): string {
  return `tp_${type}_${++_idCounter}`;
}

// ─────────────────────────────────────────────────────────────
// Mapping from timeline event types → turning point types
// ─────────────────────────────────────────────────────────────

const EVENT_TO_TURNING_POINT: Record<string, {
  type: TurningPointType;
  direction: "positive" | "negative";
  impact: "high" | "medium" | "low";
  titleFn: (evt: TimelineEvent) => string;
  descFn: (evt: TimelineEvent) => string;
} | null> = {
  emotional_breakthrough: {
    type: "emotional_breakthrough",
    direction: "positive",
    impact: "high",
    titleFn: () => "Emotional Breakthrough",
    descFn: (evt) => evt.description,
  },
  emotional_shutdown: {
    type: "trust_collapsed",
    direction: "negative",
    impact: "high",
    titleFn: () => "Prospect Shut Down",
    descFn: (evt) => evt.description,
  },
  buying_signal: {
    type: "buying_intent_increased",
    direction: "positive",
    impact: "high",
    titleFn: () => "Buying Intent Detected",
    descFn: (evt) => evt.description,
  },
  close_signal: {
    type: "buying_intent_increased",
    direction: "positive",
    impact: "high",
    titleFn: () => "Close Readiness Signal",
    descFn: (evt) => evt.description,
  },
  momentum_declining: {
    type: "deal_momentum_shifted",
    direction: "negative",
    impact: "high",
    titleFn: () => "Deal Momentum Dropped",
    descFn: (evt) => evt.description,
  },
  momentum_improving: {
    type: "deal_momentum_shifted",
    direction: "positive",
    impact: "medium",
    titleFn: () => "Momentum Improved",
    descFn: (evt) => evt.description,
  },
  trust_building: {
    type: "trust_increased",
    direction: "positive",
    impact: "medium",
    titleFn: () => "Trust Built",
    descFn: (evt) => evt.description,
  },
  trust_declining: {
    type: "trust_collapsed",
    direction: "negative",
    impact: "high",
    titleFn: () => "Trust Eroded",
    descFn: (evt) => evt.description,
  },
  urgency_detected: {
    type: "urgency_increased",
    direction: "positive",
    impact: "high",
    titleFn: () => "Urgency Revealed",
    descFn: (evt) => evt.description,
  },
  premature_pitch: {
    type: "rep_lost_control",
    direction: "negative",
    impact: "high",
    titleFn: () => "Premature Pitch — Discovery Abandoned",
    descFn: (evt) => `Rep moved to pitch before pain was vivid. ${evt.description}`,
  },
  rep_buying_signal_ignored: {
    type: "rep_lost_control",
    direction: "negative",
    impact: "high",
    titleFn: () => "Buying Signal Missed",
    descFn: (evt) => `Rep failed to capitalize on a buying signal. ${evt.description}`,
  },
  emotional_shift: {
    type: "deal_momentum_shifted",
    direction: "negative",
    impact: "medium",
    titleFn: () => "Emotional State Shifted",
    descFn: (evt) => evt.description,
  },
  rep_interrupted: {
    type: "trust_collapsed",
    direction: "negative",
    impact: "medium",
    titleFn: () => "Rep Interrupted Prospect",
    descFn: (evt) => `${evt.description} Interruptions break rapport and signal impatience.`,
  },
  objection_detected: {
    type: "deal_momentum_shifted",
    direction: "negative",
    impact: "medium",
    titleFn: () => "Objection Raised",
    descFn: (evt) => evt.description,
  },
};

// ─────────────────────────────────────────────────────────────
// Convert significant timeline events into turning points
// ─────────────────────────────────────────────────────────────

function turningPointsFromTimeline(session: LiveCallSession): TurningPoint[] {
  const { timeline } = session;
  const results: TurningPoint[] = [];

  // Only process high-impact events
  const significantEvents = timeline.filter(
    (e) => e.severity === "critical" || e.severity === "high"
  );

  for (const evt of significantEvents) {
    const mapping = EVENT_TO_TURNING_POINT[evt.event_type];
    if (!mapping) continue;

    // Get the prospect transcript around this event for evidence
    const nearbyChunk = session.transcript.find(
      (c) => Math.abs(c.chunk_index - evt.chunk_index) <= 1
    );
    const evidence = nearbyChunk
      ? `"${nearbyChunk.text.slice(0, 70)}…"`
      : evt.description;

    results.push({
      id: makeId(mapping.type),
      chunk_index: evt.chunk_index,
      type: mapping.type,
      direction: mapping.direction,
      title: mapping.titleFn(evt),
      description: mapping.descFn(evt),
      impact: mapping.impact,
      evidence,
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Detect score-based turning points (big score swings)
// ─────────────────────────────────────────────────────────────

function turningPointsFromScores(session: LiveCallSession): TurningPoint[] {
  const { scores, prev_scores } = session;
  if (!prev_scores) return [];

  const results: TurningPoint[] = [];
  const midPoint = Math.floor(session.transcript.length / 2);

  const trustDelta = scores.trust - prev_scores.trust;
  const engagementDelta = scores.emotional_engagement - prev_scores.emotional_engagement;
  const closeReadinessDelta = scores.close_readiness - prev_scores.close_readiness;
  const urgencyDelta = scores.urgency - prev_scores.urgency;

  if (trustDelta >= 15) {
    results.push({
      id: makeId("trust_increased"),
      chunk_index: midPoint,
      type: "trust_increased",
      direction: "positive",
      title: "Significant Trust Build",
      description: `Trust score increased by ${trustDelta} points during the call — rapport was established effectively.`,
      impact: "high",
      evidence: `Trust: ${prev_scores.trust} → ${scores.trust}`,
    });
  } else if (trustDelta <= -12) {
    results.push({
      id: makeId("trust_collapsed"),
      chunk_index: midPoint,
      type: "trust_collapsed",
      direction: "negative",
      title: "Trust Eroded During Call",
      description: `Trust score dropped by ${Math.abs(trustDelta)} points — something in the conversation damaged rapport.`,
      impact: "high",
      evidence: `Trust: ${prev_scores.trust} → ${scores.trust}`,
    });
  }

  if (urgencyDelta >= 15) {
    results.push({
      id: makeId("urgency_increased"),
      chunk_index: midPoint,
      type: "urgency_increased",
      direction: "positive",
      title: "Urgency Created or Discovered",
      description: `Urgency score increased by ${urgencyDelta} points — the prospect's pain or timeline became clearer.`,
      impact: "high",
      evidence: `Urgency: ${prev_scores.urgency} → ${scores.urgency}`,
    });
  }

  if (closeReadinessDelta >= 20) {
    results.push({
      id: makeId("buying_intent_increased"),
      chunk_index: midPoint,
      type: "buying_intent_increased",
      direction: "positive",
      title: "Close Readiness Jumped",
      description: `Close readiness increased by ${closeReadinessDelta} points — the prospect moved significantly closer to a decision.`,
      impact: "high",
      evidence: `Close readiness: ${prev_scores.close_readiness} → ${scores.close_readiness}`,
    });
  }

  if (engagementDelta <= -15) {
    results.push({
      id: makeId("deal_momentum_shifted"),
      chunk_index: midPoint,
      type: "deal_momentum_shifted",
      direction: "negative",
      title: "Engagement Dropped Sharply",
      description: `Emotional engagement fell by ${Math.abs(engagementDelta)} points — the prospect disengaged at some point in the call.`,
      impact: "high",
      evidence: `Engagement: ${prev_scores.emotional_engagement} → ${scores.emotional_engagement}`,
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Detect rep losing conversational control (dominant overtalking)
// ─────────────────────────────────────────────────────────────

function detectRepLostControl(session: LiveCallSession): TurningPoint[] {
  const { transcript } = session;
  if (transcript.length < 6) return [];

  const repChunks = transcript.filter((c) => c.speaker === "rep");
  const prospectChunks = transcript.filter((c) => c.speaker === "prospect");

  if (repChunks.length === 0 || prospectChunks.length === 0) return [];

  const repWords = repChunks.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0);
  const prospectWords = prospectChunks.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0);
  const totalWords = repWords + prospectWords;
  const repPercent = Math.round((repWords / totalWords) * 100);

  if (repPercent >= 65) {
    return [{
      id: makeId("rep_lost_control"),
      chunk_index: Math.floor(transcript.length / 2),
      type: "rep_lost_control",
      direction: "negative",
      title: "Rep Dominated the Conversation",
      description: `Rep spoke ${repPercent}% of the call — the prospect barely had room to express their pain, objections, or interest.`,
      impact: repPercent >= 75 ? "high" : "medium",
      evidence: `Rep: ${repPercent}% · Prospect: ${100 - repPercent}% · Target: Rep 30–45%`,
    }];
  }

  return [];
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export function detectTurningPoints(session: LiveCallSession): TurningPoint[] {
  _idCounter = 0; // Reset counter per run

  const allPoints: TurningPoint[] = [
    ...turningPointsFromTimeline(session),
    ...turningPointsFromScores(session),
    ...detectRepLostControl(session),
  ];

  // De-duplicate by type + direction within close chunk proximity (±3 chunks)
  const seen = new Set<string>();
  const deduped = allPoints.filter((tp) => {
    const key = `${tp.type}_${tp.direction}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort chronologically (by chunk_index)
  return deduped
    .sort((a, b) => a.chunk_index - b.chunk_index)
    .slice(0, 10); // Cap at 10 turning points — the most significant
}
