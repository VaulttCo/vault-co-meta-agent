// Vault Core — runnable agent map.
//
// Runnable (6): Vega, Veronica, Valentina (AI Marketing Director), Valerie,
// Vanessa, and Vivian (AI Client Success / Experience Operator — activated in
// Phase 8.2 as a RECOMMEND-ONLY agent).
// NOTE: the AI Marketing Director executive is "valentina" — it was renamed from
// "victoria" so the name "Victoria" is reserved for the AI Sales Coach (the live
// sales-call product, src/lib/victoria/**, which is NOT a Vault Core executive).
//
// Vivian is recommend-only: she reads safe internal data, writes Vault Memory +
// recommendation candidates for HUMAN approval, and never mutates any external
// system (no GHL/Stripe/Meta/SMS/email/workflow, no client contact, no auto
// tasks). The dispatcher only runs agents present in this map AND marked active.

import { vegaAgent } from "./vega";
import { valentinaAgent } from "./valentina";
import { valerieAgent } from "./valerie";
import { vanessaAgent } from "./vanessa";
import { veronicaAgent } from "./veronica";
import { vivianAgent } from "./vivian";
import type { RunnableAgent } from "./types";

export const RUNNABLE_AGENTS: Record<string, RunnableAgent> = {
  vega: vegaAgent,
  valentina: valentinaAgent,
  valerie: valerieAgent,
  vanessa: vanessaAgent,
  veronica: veronicaAgent,
  vivian: vivianAgent,
};

export function getRunnableAgent(id: string): RunnableAgent | undefined {
  return RUNNABLE_AGENTS[id];
}
