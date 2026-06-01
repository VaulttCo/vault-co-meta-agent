// Vault Core — agent dispatcher (Layer 2 runtime).
//
// Given a cycle tier, runs every ACTIVE + runnable agent scheduled for that
// tier, records a vault_agent_runs row per execution, and returns a summary.
// One agent failing never aborts the others.

import { WORKFORCE } from "../agents/registry";
import { getRunnableAgent } from "../agents";
import { insertAgentRun } from "../memory/db";
import { runCollaborationCycle, runSystemCreationCycle } from "../collab/orchestrator";
import { setLastRun } from "./kv";
import type { AgentTier } from "../types";

export interface TierRunSummary {
  tier: AgentTier;
  trigger: "cron" | "manual";
  ranAt: string;
  agents: Array<{
    id: string;
    status: "success" | "error" | "skipped";
    nodesCreated: number;
    edgesCreated: number;
    recommendationsCreated: number;
    activityCreated: number;
    durationMs: number;
    detail: string;
  }>;
  collaboration?: {
    processed: number;
    responses: number;
    jointRecommendations: number;
    proposals: number;
  };
}

/** Active + runnable agents scheduled for this tier. */
function agentsForTier(tier: AgentTier): string[] {
  return WORKFORCE.filter(
    (a) => a.active && a.tiers.includes(tier) && !!getRunnableAgent(a.id)
  ).map((a) => a.id);
}

export async function runTier(
  tier: AgentTier,
  trigger: "cron" | "manual"
): Promise<TierRunSummary> {
  const ids = agentsForTier(tier);
  const summary: TierRunSummary = {
    tier,
    trigger,
    ranAt: new Date().toISOString(),
    agents: [],
  };

  for (const id of ids) {
    const agent = getRunnableAgent(id);
    if (!agent) continue;

    const startedAt = new Date();
    try {
      const result = await agent.run({ tier, now: startedAt, trigger });
      const durationMs = Date.now() - startedAt.getTime();

      await insertAgentRun({
        agent: id,
        tier,
        status: result.status,
        nodes_created: result.nodesCreated,
        edges_created: result.edgesCreated,
        recommendations_created: result.recommendationsCreated,
        activity_created: result.activityCreated,
        duration_ms: durationMs,
        detail: result.detail,
        started_at: startedAt.toISOString(),
        finished_at: new Date().toISOString(),
      });

      summary.agents.push({
        id,
        status: result.status,
        nodesCreated: result.nodesCreated,
        edgesCreated: result.edgesCreated,
        recommendationsCreated: result.recommendationsCreated,
        activityCreated: result.activityCreated,
        durationMs,
        detail: result.detail,
      });
    } catch (e) {
      const durationMs = Date.now() - startedAt.getTime();
      const detail = (e as Error).message ?? "unknown error";
      console.error(`[VaultCore:dispatcher] ${id} (${tier}) failed:`, detail);
      await insertAgentRun({
        agent: id,
        tier,
        status: "error",
        duration_ms: durationMs,
        detail,
        started_at: startedAt.toISOString(),
        finished_at: new Date().toISOString(),
      });
      summary.agents.push({
        id,
        status: "error",
        nodesCreated: 0,
        edgesCreated: 0,
        recommendationsCreated: 0,
        activityCreated: 0,
        durationMs,
        detail,
      });
    }
  }

  // ── Collaboration engine: advance open collaborations into joint
  // recommendations (self-guards to mock mode). Runs every tier so Vega can
  // respond to Victoria's requests promptly.
  try {
    const collab = await runCollaborationCycle();
    // System Creation Engine V1 runs on the daily tier (and manual ticks).
    const sys = tier === "daily" || trigger === "manual"
      ? await runSystemCreationCycle()
      : { proposals: 0 };
    summary.collaboration = {
      processed: collab.processed,
      responses: collab.responses,
      jointRecommendations: collab.jointRecommendations,
      proposals: collab.proposals + sys.proposals,
    };
  } catch (e) {
    console.error(`[VaultCore:dispatcher] collaboration cycle failed:`, (e as Error).message);
  }

  await setLastRun(tier);
  return summary;
}
