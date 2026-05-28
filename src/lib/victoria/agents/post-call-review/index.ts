// Victoria — Post-Call Review Orchestrator
// Runs all post-call analysis agents in parallel after a call completes.
// Returns a complete PostCallReview — the full AI debrief package.
// Server-side only.

import { detectMissedOpportunities } from "./missed-opportunity-detector";
import { detectTurningPoints } from "./turning-point-detector";
import { generateCoachingSummary } from "./coaching-summary";
import { generateReplayTimeline } from "./replay-generator";
import type { LiveCallSession, PostCallReview } from "../../types";

export async function runPostCallReview(session: LiveCallSession): Promise<PostCallReview> {
  const start = Date.now();

  // ── Phase 1: Rule-based detectors (synchronous, instant) ───────────────
  const [missed, turningPoints] = await Promise.all([
    Promise.resolve(detectMissedOpportunities(session)),
    Promise.resolve(detectTurningPoints(session)),
  ]);

  // ── Phase 2: AI coaching summary (may be async, no latency pressure) ───
  const [coachingSummary, replayTimeline] = await Promise.all([
    generateCoachingSummary(session, missed, turningPoints),
    Promise.resolve(generateReplayTimeline(session, missed, turningPoints)),
  ]);

  const processing_time_ms = Date.now() - start;

  return {
    call_id: session.call_id,
    generated_at: new Date().toISOString(),
    prospect_name: session.prospect.name,
    call_duration_chunks: session.transcript.length,

    // AI-generated sections
    executive_summary: coachingSummary.executive_summary,
    rep_performance_review: coachingSummary.rep_performance_review,
    objection_analysis: coachingSummary.objection_analysis,
    close_probability: coachingSummary.close_probability,
    next_call_strategy: coachingSummary.next_call_strategy,
    follow_up_recommendations: coachingSummary.follow_up_recommendations,
    rep_scorecard: coachingSummary.rep_scorecard,
    ai_coaching_summary: coachingSummary.ai_coaching_summary,

    // Rule-based sections
    missed_opportunities: missed,
    turning_points: turningPoints,
    replay_timeline: replayTimeline,

    // Meta
    processing_time_ms,
    model: coachingSummary.model,
    mock_mode: coachingSummary.mock_mode,
  };
}
