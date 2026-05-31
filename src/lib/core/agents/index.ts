// Vault Core — runnable agent map.
//
// Phase 1: only Vega is runnable. The other executives exist as metadata stubs
// in registry.ts and are intentionally NOT runnable yet. To activate one later:
//   1. flip `active: true` in registry.ts
//   2. implement its agent module
//   3. add it here
//
// The dispatcher only ever runs agents present in this map AND marked active.

import { vegaAgent } from "./vega";
import type { RunnableAgent } from "./types";

export const RUNNABLE_AGENTS: Record<string, RunnableAgent> = {
  vega: vegaAgent,
};

export function getRunnableAgent(id: string): RunnableAgent | undefined {
  return RUNNABLE_AGENTS[id];
}
