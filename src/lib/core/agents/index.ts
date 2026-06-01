// Vault Core — runnable agent map.
//
// Runnable: Vega (Phase 1) + Victoria (Phase 3). The other executives exist as
// metadata stubs in registry.ts and are intentionally NOT runnable yet. To
// activate one later:
//   1. flip `active: true` in registry.ts
//   2. implement its agent module
//   3. add it here
//
// The dispatcher only ever runs agents present in this map AND marked active.

import { vegaAgent } from "./vega";
import { victoriaAgent } from "./victoria";
import type { RunnableAgent } from "./types";

export const RUNNABLE_AGENTS: Record<string, RunnableAgent> = {
  vega: vegaAgent,
  victoria: victoriaAgent,
};

export function getRunnableAgent(id: string): RunnableAgent | undefined {
  return RUNNABLE_AGENTS[id];
}
