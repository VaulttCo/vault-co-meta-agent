// Vault Core — runnable agent map.
//
// Runnable: Vega (P1) + Victoria (P3) + Valerie (P4) + Vanessa (P5) + Veronica (P6).
// Only Vivian remains a metadata stub in registry.ts (not runnable yet). To
// activate it later:
//   1. flip `active: true` in registry.ts
//   2. implement its agent module
//   3. add it here
//
// The dispatcher only ever runs agents present in this map AND marked active.

import { vegaAgent } from "./vega";
import { victoriaAgent } from "./victoria";
import { valerieAgent } from "./valerie";
import { vanessaAgent } from "./vanessa";
import { veronicaAgent } from "./veronica";
import type { RunnableAgent } from "./types";

export const RUNNABLE_AGENTS: Record<string, RunnableAgent> = {
  vega: vegaAgent,
  victoria: victoriaAgent,
  valerie: valerieAgent,
  vanessa: vanessaAgent,
  veronica: veronicaAgent,
};

export function getRunnableAgent(id: string): RunnableAgent | undefined {
  return RUNNABLE_AGENTS[id];
}
