// Victoria — Live Call Timeline Builder
// Converts agent outputs into timeline events for the live call feed.
// Each chunk produces 0–4 events that are appended to session.timeline.
// Server-side only.

import type {
  LiveCallSession,
  TranscriptChunk,
  TimelineEvent,
  TimelineEventType,
  DiscoveryOutput,
  ObjectionOutput,
  DealRiskOutput,
  EmotionalOutput,
  RepPerformanceOutput,
} from "../../types";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function makeId(): string {
  return `tl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function event(
  chunk_index: number,
  event_type: TimelineEventType,
  severity: TimelineEvent["severity"],
  title: string,
  description: string
): TimelineEvent {
  return {
    id: makeId(),
    timestamp_ms: Date.now(),
    chunk_index,
    event_type,
    severity,
    title,
    description,
  };
}

// ─────────────────────────────────────────────────────────────
// Timeline event builder
// Returns only NEW events for this chunk — caller appends to session.timeline
// ─────────────────────────────────────────────────────────────

export function buildTimelineEvents(params: {
  session: LiveCallSession;
  chunk: TranscriptChunk;
  prevDiscoveryDepth: number; // depth_score BEFORE this chunk
  discovery?: DiscoveryOutput | null;
  objection?: ObjectionOutput | null;
  dealRisk?: DealRiskOutput | null;
  emotional?: EmotionalOutput | null;
  repPerformance?: RepPerformanceOutput | null;
}): TimelineEvent[] {
  const { session, chunk, prevDiscoveryDepth, discovery, objection, dealRisk, emotional, repPerformance } = params;
  const events: TimelineEvent[] = [];
  const idx = chunk.chunk_index;

  // ── Prospect-side events ─────────────────────────────────

  // Strong buying signal
  if (chunk.contains_buying_signal && chunk.speaker === "prospect") {
    const keywords = chunk.buying_signal_keywords_found.slice(0, 2);
    events.push(event(
      idx,
      "buying_signal",
      "critical",
      "🟢 Buying signal detected",
      keywords.length > 0
        ? `"${keywords.join('", "')}" — slow down and ask a trial close`
        : `"${chunk.text.slice(0, 60)}…" — prospect moving forward mentally`
    ));
  }

  // Objection detected
  if (objection) {
    const isReal = objection.is_real_objection;
    events.push(event(
      idx,
      "objection_detected",
      isReal ? "high" : "medium",
      `Objection: ${objection.category.replace(/_/g, " ")}`,
      isReal
        ? `Real concern — ${objection.surface_meaning.slice(0, 70)}`
        : `Smokescreen — ${(objection.real_issue_if_smokescreen ?? objection.surface_meaning).slice(0, 70)}`
    ));
  }

  // Emotional events
  if (emotional) {
    if (emotional.alert?.type === "shutdown") {
      events.push(event(
        idx,
        "emotional_shutdown",
        "critical",
        "⚠️ Prospect shutting down",
        `${emotional.signal_evidence.slice(0, 80)}`
      ));
    } else if (emotional.alert?.type === "breakthrough") {
      events.push(event(
        idx,
        "emotional_breakthrough",
        "high",
        "💡 Emotional breakthrough",
        `${emotional.signal_evidence.slice(0, 80)}`
      ));
    } else if (emotional.detected_shift && emotional.direction === "declining" && emotional.intensity === "high") {
      events.push(event(
        idx,
        "emotional_shutdown",
        "high",
        `Prospect mood declining → ${emotional.emotional_state.replace(/_/g, " ")}`,
        `${emotional.signal_evidence.slice(0, 80)}`
      ));
    } else if (emotional.detected_shift && emotional.direction === "improving" && emotional.intensity !== "low") {
      events.push(event(
        idx,
        "emotional_breakthrough",
        "medium",
        `Emotional shift → ${emotional.emotional_state.replace(/_/g, " ")}`,
        `${emotional.signal_evidence.slice(0, 80)}`
      ));
    }
  }

  // Discovery progression milestone
  if (discovery) {
    const newDepth = discovery.depth_score;
    const crossed65 = prevDiscoveryDepth < 65 && newDepth >= 65;
    const crossed80 = prevDiscoveryDepth < 80 && newDepth >= 80;
    if (crossed80) {
      events.push(event(
        idx,
        "discovery_improved",
        "high",
        `Discovery depth: ${newDepth}/100 — ready to position`,
        "Pain vivid and quantified — begin transitioning to Vault Co positioning"
      ));
    } else if (crossed65) {
      events.push(event(
        idx,
        "discovery_improved",
        "medium",
        `Discovery depth: ${newDepth}/100 — getting deeper`,
        "Pain is becoming real — keep digging on financial and emotional impact"
      ));
    }

    // Discovery warning — premature pitch
    if (discovery.warning?.type === "pitching_too_early") {
      events.push(event(
        idx,
        "premature_pitch",
        "critical",
        "Rep pitching too early",
        `Discovery only ${discovery.depth_score}/100 — ${discovery.warning.redirect.slice(0, 70)}`
      ));
    }
  }

  // Deal risk signals
  if (dealRisk) {
    if (dealRisk.recommendation === "attempt_close") {
      events.push(event(
        idx,
        "close_signal",
        "high",
        `🎯 Close readiness: ${dealRisk.overall_score}/100`,
        `All close conditions met — ${dealRisk.rep_tactical_advice.slice(0, 70)}`
      ));
    } else if (dealRisk.recommendation === "rescue_call" && session.scores.close_readiness < 25) {
      events.push(event(
        idx,
        "emotional_shutdown",
        "critical",
        "🚨 Deal at risk — rescue needed",
        `${dealRisk.biggest_risk.slice(0, 80)}`
      ));
    }
  }

  // Phase transition
  const prevPhase = session.phase;
  // Phase events are emitted by orchestrator directly — we only generate content-based events here

  // ── Rep-side events ──────────────────────────────────────

  if (repPerformance) {
    // Only emit rep events for critical and high severity warnings
    // Cap at 2 rep events per chunk to avoid timeline flooding
    let repEventCount = 0;

    for (const warning of repPerformance.warnings) {
      if (repEventCount >= 2) break;
      if (warning.severity !== "critical" && warning.severity !== "high") continue;

      const eventTypeMap: Record<string, TimelineEventType> = {
        overtalking: "rep_overtalking",
        interrupting: "rep_interrupted",
        premature_pitching: "premature_pitch",
        weak_probing: "rep_weak_probe",
        missing_emotional_signal: "rep_missing_emotional",
        overexplaining: "rep_overexplaining",
        question_stacking: "rep_question_stacking",
        poor_listening: "rep_weak_probe",
      };

      const evType = (eventTypeMap[warning.type] ?? "rep_weak_probe") as TimelineEventType;
      events.push(event(
        idx,
        evType,
        warning.severity,
        warning.message.slice(0, 60),
        warning.suggested_fix.slice(0, 80)
      ));
      repEventCount++;
    }
  }

  // Deduplicate: don't emit the same event_type twice in one chunk
  const seen = new Set<TimelineEventType>();
  return events.filter((e) => {
    if (seen.has(e.event_type)) return false;
    seen.add(e.event_type);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────
// Phase transition event factory
// Called explicitly by the orchestrator when phase changes.
// ─────────────────────────────────────────────────────────────

export function buildPhaseTransitionEvent(
  chunk_index: number,
  from: string,
  to: string
): TimelineEvent {
  return event(
    chunk_index,
    "phase_transition",
    "info",
    `Phase: ${from.replace(/_/g, " ")} → ${to.replace(/_/g, " ")}`,
    `Call progressed to ${to.replace(/_/g, " ")} phase`
  );
}
