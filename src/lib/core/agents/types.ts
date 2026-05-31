// Vault Core — runnable agent interface (Layer 2).
//
// An agent is metadata + a run() function executed by the runtime dispatcher
// on its scheduled tiers. Agents read company data (READ-ONLY) and write
// knowledge into Vault Memory. They may recommend but NEVER act on external
// systems.

import type { AgentMeta, AgentRunResult, AgentTier } from "../types";

export interface AgentRunContext {
  tier: AgentTier;
  now: Date;
  /** Why this run was triggered — for activity/run detail. */
  trigger: "cron" | "manual";
}

export interface RunnableAgent {
  meta: AgentMeta;
  /**
   * Execute one cycle. MUST be safe to call with no database (mock mode):
   * in that case it performs its analysis and returns counts, but writes no-op.
   * MUST never send/publish/launch/edit/delete anything external.
   */
  run(ctx: AgentRunContext): Promise<AgentRunResult>;
}
