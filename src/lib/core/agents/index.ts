// Vault Core — runnable agent map.
//
// Runnable (5): Vega, Veronica, Valentina (AI Marketing Director), Valerie, Vanessa.
// NOTE: the AI Marketing Director executive is "valentina" — it was renamed from
// "victoria" so the name "Victoria" is reserved for the AI Sales Coach (the live
// sales-call product, src/lib/victoria/**, which is NOT a Vault Core executive).
// Only Vivian remains a metadata stub in registry.ts (DORMANT, not runnable yet):
// the AI Client Success / Experience Operator. She is intentionally ABSENT from
// RUNNABLE_AGENTS below. To activate her later (a separate, approved phase — see
// docs/vivian-client-success-operator-spec.md):
//   1. flip `active: true` in registry.ts
//   2. implement her agent module (recommend-only; never mutates external systems)
//   3. add it here
//
// The dispatcher only ever runs agents present in this map AND marked active, so
// Vivian cannot run while either condition is unmet (both are, by design).

import { vegaAgent } from "./vega";
import { valentinaAgent } from "./valentina";
import { valerieAgent } from "./valerie";
import { vanessaAgent } from "./vanessa";
import { veronicaAgent } from "./veronica";
import type { RunnableAgent } from "./types";

export const RUNNABLE_AGENTS: Record<string, RunnableAgent> = {
  vega: vegaAgent,
  valentina: valentinaAgent,
  valerie: valerieAgent,
  vanessa: vanessaAgent,
  veronica: veronicaAgent,
};

export function getRunnableAgent(id: string): RunnableAgent | undefined {
  return RUNNABLE_AGENTS[id];
}
