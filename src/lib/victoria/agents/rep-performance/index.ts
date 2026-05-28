// Victoria — Rep Performance Agent
// Analyzes the sales rep's behavior during the call in real time.
// Combines fast rule-based detectors (always) with optional AI synthesis (every 4 chunks).
// Server-side only.

import { callAnthropicTool, isAnthropicAvailable, VICTORIA_MODELS } from "../../anthropic";
import {
  REP_PERFORMANCE_SYSTEM_PROMPT,
  REP_PERFORMANCE_TOOL,
  buildRepPerformanceUserMessage,
} from "../../prompts/rep-performance";
import { computeRepMetrics } from "./metrics";
import type { LiveCallSession, RepPerformanceOutput, RepWarning } from "../../types";

// ─────────────────────────────────────────────────────────────
// Agent result type
// ─────────────────────────────────────────────────────────────

export interface RepPerformanceAgentResult {
  output: RepPerformanceOutput;
  latency_ms: number;
  model: string;
  mock_mode: boolean;
}

// ─────────────────────────────────────────────────────────────
// Mock/rule-based output builder
// Used when Anthropic isn't configured or as a fast fallback.
// ─────────────────────────────────────────────────────────────

function buildRuleBasedOutput(session: LiveCallSession): RepPerformanceOutput {
  const metrics = computeRepMetrics(session);

  // Determine overall performance from warning severity
  const criticalCount = metrics.warnings.filter((w) => w.severity === "critical").length;
  const highCount = metrics.warnings.filter((w) => w.severity === "high").length;

  let overall_performance: RepPerformanceOutput["overall_performance"];
  if (criticalCount >= 2) overall_performance = "poor";
  else if (criticalCount >= 1 || highCount >= 2) overall_performance = "needs_improvement";
  else if (highCount >= 1 || metrics.warnings.length > 0) overall_performance = "good";
  else overall_performance = "excellent";

  // Build ordered coaching priorities
  const coaching_priorities: string[] = [];
  if (metrics.buying_signal_ignore_count > 0) {
    coaching_priorities.push("Buying signal ignored — slow down and ask a trial close immediately.");
  }
  if (metrics.premature_pitch_events > 0) {
    coaching_priorities.push("Abort the pitch — return to discovery. Pain is not vivid enough yet.");
  }
  if (metrics.talk_ratio.rep_percent > 60) {
    coaching_priorities.push(`Talk less — you're at ${metrics.talk_ratio.rep_percent}%. Ask one question and listen fully.`);
  }
  if (metrics.emotional_miss_count > 0) {
    coaching_priorities.push("Go back and acknowledge the emotion you missed — that's where the close is hiding.");
  }
  if (metrics.question_stacking_events > 0) {
    coaching_priorities.push("One question at a time. Delete all but your single most important question.");
  }
  if (metrics.interruption_count > 0) {
    coaching_priorities.push("Wait for the prospect to fully finish before responding. Silence is power.");
  }
  if (metrics.feature_vs_outcome_count > 0) {
    coaching_priorities.push("Connect features to outcomes. After any feature, say: 'What that means for you is…'");
  }
  if (coaching_priorities.length === 0) {
    coaching_priorities.push("Maintain current approach — stay curious, keep digging into pain and impact.");
  }

  return {
    overall_performance,
    warnings: metrics.warnings,
    positive_observations: metrics.positive_observations,
    coaching_priorities: coaching_priorities.slice(0, 3),
    talk_ratio: {
      rep_percent: metrics.talk_ratio.rep_percent,
      prospect_percent: metrics.talk_ratio.prospect_percent,
    },
    interruptions: metrics.interruption_count,
    momentum_direction: "stable",  // Populated by orchestrator using momentum-tracker
    trust_trend: "stable",         // Populated by orchestrator using trust-tracker
    urgency_trend: "stable",       // Populated by orchestrator using urgency-tracker
  };
}

// ─────────────────────────────────────────────────────────────
// Main Rep Performance Agent runner
// ─────────────────────────────────────────────────────────────

export async function runRepPerformanceAgent(
  session: LiveCallSession
): Promise<RepPerformanceAgentResult> {
  const start = Date.now();

  // Always compute rule-based metrics first (synchronous, < 5ms)
  const metrics = computeRepMetrics(session);

  // Use rule-based only if Anthropic isn't configured or call is too new
  if (!isAnthropicAvailable() || session.transcript.length < 4) {
    return {
      output: buildRuleBasedOutput(session),
      latency_ms: Date.now() - start,
      model: "rule-based",
      mock_mode: true,
    };
  }

  try {
    const recentTranscript = session.transcript
      .slice(-12)
      .map((c) => `${c.speaker.toUpperCase()}: ${c.text}`)
      .join("\n");

    const result = await callAnthropicTool<RepPerformanceOutput>({
      model: VICTORIA_MODELS.OBJECTION_INTEL, // Haiku — fast, this is on the latency-critical path
      system: REP_PERFORMANCE_SYSTEM_PROMPT,
      userMessage: buildRepPerformanceUserMessage({
        prospect_name: session.prospect.name,
        prospect_vertical: session.prospect.vertical,
        current_phase: session.phase,
        discovery_depth: session.discovery.depth_score,
        recent_transcript: recentTranscript,
        rule_based_metrics: metrics,
      }),
      tool: REP_PERFORMANCE_TOOL,
      maxTokens: 900,
    });

    // Merge: use computed talk ratio (more accurate than AI estimate)
    // Merge rule-based warnings with AI warnings (deduplicate by type)
    const aiWarnings: RepWarning[] = result.output.warnings ?? [];
    const ruleWarnings: RepWarning[] = metrics.warnings;

    // Keep rule-based warnings for types AI didn't cover, add AI warnings for types it found
    const aiWarningTypes = new Set(aiWarnings.map((w) => w.type));
    const mergedWarnings: RepWarning[] = [
      ...aiWarnings,
      ...ruleWarnings.filter((w) => !aiWarningTypes.has(w.type)),
    ]
      .sort((a, b) => {
        const rank = { critical: 3, high: 2, medium: 1 };
        return (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0);
      })
      .slice(0, 4);

    const merged: RepPerformanceOutput = {
      ...result.output,
      talk_ratio: {
        rep_percent: metrics.talk_ratio.rep_percent,
        prospect_percent: metrics.talk_ratio.prospect_percent,
      },
      warnings: mergedWarnings,
      positive_observations: [
        ...(result.output.positive_observations ?? []),
        ...metrics.positive_observations.filter(
          (p) => !(result.output.positive_observations ?? []).some((ai) => ai.includes(p.slice(0, 15)))
        ),
      ].slice(0, 3),
      interruptions: metrics.interruption_count,
      momentum_direction: result.output.momentum_direction ?? "stable",
      trust_trend: result.output.trust_trend ?? "stable",
      urgency_trend: result.output.urgency_trend ?? "stable",
    };

    return {
      output: merged,
      latency_ms: result.latency_ms,
      model: result.model,
      mock_mode: false,
    };
  } catch (err) {
    console.error(
      "[Victoria:RepPerformance] Agent failed — using rule-based fallback:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      output: buildRuleBasedOutput(session),
      latency_ms: Date.now() - start,
      model: "rule-based-fallback",
      mock_mode: true,
    };
  }
}
