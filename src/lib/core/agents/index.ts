// Vault Core — runnable agent map.
//
// Runnable: Vega (P1) + Victoria (P3) + Valerie (P4) + Vanessa (P5). Veronica +
// Vivian exist as metadata stubs in registry.ts and are intentionally NOT
// runnable yet. To activate one later:
//   1. flip `active: true` in registry.ts
//   2. implement its agent module
//   3. add it here
//
// The dispatcher only ever runs agents present in this map AND marked active.

import { vegaAgent } from "./vega";
import { victoriaAgent } from "./victoria";
import { valerieAgent } from "./valerie";
import { vanessaAgent } from "./vanessa";
import type { RunnableAgent } from "./types";

export const RUNNABLE_AGENTS: Record<string, RunnableAgent> = {
  vega: vegaAgent,
  victoria: victoriaAgent,
  valerie: valerieAgent,
  vanessa: vanessaAgent,
};

export function getRunnableAgent(id: string): RunnableAgent | undefined {
  return RUNNABLE_AGENTS[id];
}
