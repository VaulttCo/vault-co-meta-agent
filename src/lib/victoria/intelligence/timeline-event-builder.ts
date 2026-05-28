// Victoria — Enhanced Timeline Event Builder
// Intelligence layer that wraps the base orchestrator event builder and adds
// momentum, trust, and urgency signal events that base detection can't produce.
// Server-side only.

import type {
  LiveCallSession,
  TranscriptChunk,
  TimelineEvent,
  TimelineEventType,
  SessionScores,
  DiscoveryOutput,
  ObjectionOutput,
  DealRiskOutput,
  EmotionalOutput,
  RepPerformanceOutput,
  MomentumSnapshot,
} from "../types";
import { buildTimelineEvents as buildBaseEvents, buildPhaseTransitionEvent } from "../agents/orchestrator/timeline";
import { computeMomentum, momentumSummary } from "./momentum-tracker";
import { analyzeTrustSignals, recentTrustDirection } from "./trust-tracker";
import { analyzeUrgencySignals, recentUrgencyDirection } from "./urgency-tracker";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function makeId(): string {
  return `tl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function evt(
  chunk_index: number,
  event_type: TimelineEventType,
  severity: TimelineEvent["severity"],
  title: string,
  description: string,
  agent_source = "intelligence"
): TimelineEvent {
  return {
    id: makeId(),
    timestamp_ms: Date.now(),
    chunk_index,
    event_type,
    severity,
    title,
    description,
    agent_source,
  };
}

// ─────────────────────────────────────────────────────────────
// Params
// ─────────────────────────────────────────────────────────────

export interface EnhancedEventBuilderParams {
  session: LiveCallSession;
  chunk: TranscriptChunk;
  prevDiscoveryDepth: number;
  prevScores: SessionScores | null;
  discovery?: DiscoveryOutput | null;
  objection?: ObjectionOutput | null;
  dealRisk?: DealRiskOutput | null;
  emotional?: EmotionalOutput | null;
  repPerformance?: RepPerformanceOutput | null;
}

export interface EnhancedEventBuilderResult {
  events: TimelineEvent[];
  momentum: MomentumSnapshot;
}

// ─────────────────────────────────────────────────────────────
// Main builder
// ─────────────────────────────────────────────────────────────

export function buildEnhancedTimelineEvents(
  params: EnhancedEventBuilderParams
): EnhancedEventBuilderResult {
  const { session, chunk, prevDiscoveryDepth, prevScores } = params;
  const idx = chunk.chunk_index;

  // ── Base events from existing rule-based builder ────────
  const baseEvents = buildBaseEvents({
    session,
    chunk,
    prevDiscoveryDepth,
    discovery: params.discovery,
    objection: params.objection,
    dealRisk: params.dealRisk,
    emotional: params.emotional,
    repPerformance: params.repPerformance,
  });

  const events: TimelineEvent[] = baseEvents.map((e) => ({
    ...e,
    agent_source: e.agent_source ?? "base",
  }));

  // ── Momentum events ────────────────────────────────────
  const momentum = computeMomentum(prevScores, session.scores, idx);

  // Only emit momentum events after the 3rd chunk (too early = baseline noise)
  if (idx >= 3) {
    if (momentum.overall === "declining" && (momentum.close_readiness === "declining" || momentum.trust === "declining")) {
      events.push(evt(
        idx,
        "momentum_declining",
        "high",
        "Momentum declining",
        momentumSummary(momentum),
        "momentum"
      ));
    }

    if (momentum.overall === "improving" && session.scores.close_readiness >= 40) {
      events.push(evt(
        idx,
        "momentum_improving",
        "medium",
        "Momentum building ↑",
        momentumSummary(momentum),
        "momentum"
      ));
    }
  }

  // ── Trust signal events ────────────────────────────────
  // Analyze only the last 4 transcript chunks to avoid re-detecting old signals
  const recentTranscript = session.transcript.slice(-4);
  const trustSignals = analyzeTrustSignals(recentTranscript.map((c, i) => ({
    ...c,
    chunk_index: i, // Relative index for direction detection
  })));
  const trustDir = recentTrustDirection(trustSignals, 4);

  if (trustDir === "eroding") {
    const latest = [...trustSignals].reverse().find((s) => s.direction === "eroding");
    if (latest && idx > 2) {
      events.push(evt(
        idx,
        "trust_declining",
        "high",
        "Trust signal — prospect skeptical",
        `"${latest.evidence.slice(0, 75)}"`,
        "trust"
      ));
    }
  } else if (trustDir === "building" && idx > 2) {
    const latest = [...trustSignals].reverse().find((s) => s.direction === "building");
    if (latest) {
      events.push(evt(
        idx,
        "trust_building",
        "info",
        "Trust building",
        `"${latest.evidence.slice(0, 75)}"`,
        "trust"
      ));
    }
  }

  // ── Urgency signal events ──────────────────────────────
  const urgencySignals = analyzeUrgencySignals(recentTranscript.map((c, i) => ({
    ...c,
    chunk_index: i,
  })));
  const urgencyDir = recentUrgencyDirection(urgencySignals, 4);

  if (urgencyDir === "increasing") {
    const latest = [...urgencySignals].reverse().find((s) => s.direction === "increasing");
    if (latest && idx > 1) {
      events.push(evt(
        idx,
        "urgency_detected",
        "medium",
        `Urgency signal: ${latest.type.replace(/_/g, " ")}`,
        `"${latest.evidence.slice(0, 75)}"`,
        "urgency"
      ));
    }
  } else if (urgencyDir === "decreasing" && idx > 2) {
    const latest = [...urgencySignals].reverse().find((s) => s.direction === "decreasing");
    if (latest) {
      events.push(evt(
        idx,
        "urgency_declining",
        "medium",
        "Urgency declining",
        `"${latest.evidence.slice(0, 75)}"`,
        "urgency"
      ));
    }
  }

  // ── Deduplicate by event_type within this chunk ────────
  const seen = new Set<TimelineEventType>();
  const deduped = events.filter((e) => {
    if (seen.has(e.event_type)) return false;
    seen.add(e.event_type);
    return true;
  });

  return { events: deduped, momentum };
}

export { buildPhaseTransitionEvent };
