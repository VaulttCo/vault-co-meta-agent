// Vault Core — Agent Action Generation (Phase 9.1).
//
// Turns an agent's EXISTING internal signals (its pending, mission-visible Vault
// recommendations) into a small number of approval-ready INTERNAL Vault Actions.
// It never executes anything, never touches an external system, and is fully
// fail-open: any error is logged as internal activity and skipped, never thrown.
//
// Flow per agent:
//   1. collect safe internal signals (this agent's pending recommendations)
//   2. map the top 0–2 into internal action inputs (per generation-policy)
//   3. score (Vera) + gate (shouldCreateAction) + dedupe (findDuplicateAction)
//   4. createAction() with Vera/Vesper generation metadata
//   5. accumulate a summary for the tick response
//
// If there is no useful signal, it creates ZERO actions (no placeholder spam).

import type { VaultRecommendationRow, AgentTier } from "../types";
import { getRecommendations, isHiddenFromMissionControl, insertActivity } from "../memory/db";
import { scoreRecommendation } from "../recommendations/scoring";
import type { ActionType, VaultAction, VaultActionInput } from "./types";
import { getActions } from "./db";
import { createAction } from "./create-action";
import { findDuplicateAction } from "./dedupe";
import {
  getAgentGenerationPolicy, shouldCreateAction, POLICY_VERSION, MAX_ACTIONS_PER_AGENT,
} from "./generation-policy";

// Bounded signal fetch — large enough that a single noisy/recent agent cannot crowd
// older high-priority pending recommendations from quieter agents out of the pass.
const SIGNAL_FETCH_LIMIT = 500;
const EXISTING_ACTIONS_LIMIT = 500;

export interface GenerationContext {
  tier?: AgentTier;
  trigger?: "cron" | "manual";
  /** Preloaded signals (all agents) — avoids re-fetching per agent in the tick pass. */
  recommendations?: VaultRecommendationRow[];
  /** Preloaded existing actions — MUTATED as actions are created so later agents dedupe. */
  existingActions?: VaultAction[];
}

export interface AgentGenerationResult {
  agentId: string;
  reviewedSignals: number;
  created: number;
  skippedDuplicates: number;
  skippedLowQuality: number;
  createdActionIds: string[];
}

export interface ActionGenerationSummary {
  reviewedSignals: number;
  created: number;
  skippedDuplicates: number;
  skippedLowQuality: number;
  byAgent: Record<string, { reviewedSignals: number; created: number; skippedDuplicates: number; skippedLowQuality: number }>;
}

// Human-readable title prefix per internal action type (keeps a clear next action).
const TITLE_PREFIX: Partial<Record<ActionType, string>> = {
  create_internal_task: "Review priority",
  prepare_client_success_plan: "Prepare client success review",
  prepare_competitor_response: "Prepare competitor response review",
  prepare_tracking_fix: "Review tracking gap",
  prepare_content_idea: "Prepare content idea",
  prepare_budget_recommendation: "Prepare budget review",
  draft_report: "Prepare report draft review",
};

function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

function buildEvidence(rec: VaultRecommendationRow): string[] {
  const ev: string[] = [];
  if (rec.related_clients?.length) ev.push(`Clients: ${rec.related_clients.slice(0, 3).join(", ")}`);
  if (rec.related_campaigns?.length) ev.push(`Campaigns: ${rec.related_campaigns.slice(0, 3).join(", ")}`);
  if (rec.revenue_impact) ev.push(`Revenue impact: ${rec.revenue_impact}`);
  if (rec.impact) ev.push(`Impact: ${rec.impact}`);
  if (rec.priority_reason) ev.push(`Priority: ${rec.priority_reason}`);
  ev.push(`Source: pending recommendation by ${rec.agent}`);
  return ev.slice(0, 5);
}

/** Map a recommendation signal into an internal Vault Action input for this agent. */
function buildInput(agentId: string, actionType: ActionType, rec: VaultRecommendationRow): VaultActionInput {
  const prefix = TITLE_PREFIX[actionType] ?? "Review";
  const title = clip(`${prefix}: ${rec.title}`, 180);
  const summaryParts = [rec.body, rec.impact, rec.priority_reason].filter((x): x is string => !!x && x.trim().length > 0);
  const summary = clip(summaryParts.join(" · ") || `Prepared from ${agentId}'s pending recommendation for human review.`, 1000);
  const reason = clip(rec.priority_reason || rec.impact || rec.body || "Surfaced by the workforce as worth a focused human review.", 600);
  const firstClient = (rec.related_clients ?? []).find((c) => /^[a-zA-Z0-9_:-]{1,120}$/.test(c)) ?? null;
  return {
    agent_id: agentId,
    action_type: actionType,
    title,
    summary,
    reason,
    client_id: firstClient,
    source_type: "recommendation",
    source_id: rec.id,
    evidence: buildEvidence(rec),
    constraints: ["Internal review only — no external system is contacted.", "Requires human approval before any execution."],
  };
}

/** Pending, mission-visible recommendations for one agent, strongest first. */
function signalsForAgent(agentId: string, recs: VaultRecommendationRow[]): VaultRecommendationRow[] {
  return recs
    .filter((r) => r.agent === agentId && r.status === "pending_review" && !isHiddenFromMissionControl(r))
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));
}

/**
 * Generate 0–2 internal actions for a single agent from its pending recommendations.
 * Fail-open: returns zeroed counts on any error (and logs internal activity).
 */
export async function generateActionsForAgent(agentId: string, ctx: GenerationContext = {}): Promise<AgentGenerationResult> {
  const result: AgentGenerationResult = {
    agentId, reviewedSignals: 0, created: 0, skippedDuplicates: 0, skippedLowQuality: 0, createdActionIds: [],
  };

  const policy = getAgentGenerationPolicy(agentId);
  if (!policy) return result;

  try {
    const recs = ctx.recommendations ?? (await getRecommendations(SIGNAL_FETCH_LIMIT));
    const existing = ctx.existingActions ?? (await getActions(EXISTING_ACTIONS_LIMIT));
    const signals = signalsForAgent(agentId, recs);
    const cap = Math.min(policy.maxPerTick, MAX_ACTIONS_PER_AGENT);

    for (const rec of signals) {
      if (result.created >= cap) break;
      result.reviewedSignals += 1;

      const input = buildInput(agentId, policy.primaryActionType, rec);

      // Vera quality/safety on the candidate action.
      const q = scoreRecommendation({
        agent: agentId,
        title: input.title,
        body: input.summary,
        related_clients: input.client_id ? [input.client_id] : [],
        priority_score: rec.priority_score,
        metadata: { sourceSignals: input.evidence },
      });

      // Dedupe against live actions (and the ones we've created this pass).
      const dup = findDuplicateAction(input, existing);
      if (dup.isDuplicate) { result.skippedDuplicates += 1; continue; }

      // Policy gate (quality floor, evidence, internal-only target, allowed type).
      const decision = shouldCreateAction({
        agentId,
        input,
        qualityScore: q.qualityScore,
        safetyStatus: q.safetyStatus,
        evidenceCount: input.evidence?.length ?? 0,
      });
      if (!decision.ok) { result.skippedLowQuality += 1; continue; }

      const created = await createAction(input, {
        origin: "agent",
        generation: {
          generationSource: "recommendation",
          generationReason: clip(`From ${agentId}'s pending recommendation: “${rec.title}”.`, 280),
          duplicateScore: dup.duplicateScore,
          evidenceCount: input.evidence?.length ?? 0,
          policyVersion: POLICY_VERSION,
          missionVisible: decision.missionVisible,
        },
      });

      if (created.created && created.action) {
        result.created += 1;
        result.createdActionIds.push(created.action.id);
        existing.unshift(created.action); // so later candidates/agents dedupe against it
      } else if ((created.reason ?? "").toLowerCase().includes("duplicate")) {
        result.skippedDuplicates += 1;
      } else {
        result.skippedLowQuality += 1;
      }
    }
  } catch (e) {
    // Fail-open: never throw into the tick. Record as internal activity.
    try {
      await insertActivity({
        agent: agentId,
        kind: "monitor",
        message: `Action generation skipped for ${agentId}: ${(e as Error).message}`,
        node_id: null,
        metadata: { phase: "9.1", generation_error: true },
      });
    } catch { /* ignore */ }
  }

  return result;
}

/**
 * Consolidated generation pass for the dispatcher — runs after all agents + hygiene.
 * Loads signals + existing actions ONCE, then generates per agent (sharing the
 * existing-actions list so cross-agent duplicates are caught). Always fail-open.
 */
export async function generateAllAgentActions(agentIds: string[], ctx: GenerationContext = {}): Promise<ActionGenerationSummary> {
  const summary: ActionGenerationSummary = {
    reviewedSignals: 0, created: 0, skippedDuplicates: 0, skippedLowQuality: 0, byAgent: {},
  };

  let recommendations = ctx.recommendations;
  let existingActions = ctx.existingActions;
  try {
    if (!recommendations) recommendations = await getRecommendations(SIGNAL_FETCH_LIMIT);
    if (!existingActions) existingActions = await getActions(EXISTING_ACTIONS_LIMIT);
  } catch {
    recommendations = recommendations ?? [];
    existingActions = existingActions ?? [];
  }

  for (const agentId of agentIds) {
    if (!getAgentGenerationPolicy(agentId)) continue;
    const r = await generateActionsForAgent(agentId, { ...ctx, recommendations, existingActions });
    summary.reviewedSignals += r.reviewedSignals;
    summary.created += r.created;
    summary.skippedDuplicates += r.skippedDuplicates;
    summary.skippedLowQuality += r.skippedLowQuality;
    summary.byAgent[agentId] = {
      reviewedSignals: r.reviewedSignals,
      created: r.created,
      skippedDuplicates: r.skippedDuplicates,
      skippedLowQuality: r.skippedLowQuality,
    };
  }

  return summary;
}
