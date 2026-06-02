// Vault Core — Workforce roster (Layer 2).
//
// Currently ACTIVE (5): Vega, Veronica, Victoria, Valerie, Vanessa.
// Metadata-only STUB (not active, not in the tick): Vivian — the UI renders the
// full workforce; a future phase can flip `active: true` and attach a runnable agent.
//
// ROLE-SPLIT NOTE (spec stage — see docs/valentina-marketing-director-spec.md):
//   The active "victoria" executive below performs the AI MARKETING DIRECTOR role.
//   Per the corrected naming, that role is being repositioned as "Valentina (AI
//   Marketing Director)", while the name "Victoria" now denotes the AI SALES COACH
//   (the live sales-call product: src/lib/victoria/**, /api/victoria/**, /victoria).
//   Valentina is SPEC-ONLY for now — NOT activated, NOT added to the tick, NO runtime
//   change. The rename/activation of this executive is deferred to a future phase, so
//   this entry's id/title/active/tiers are intentionally left unchanged here.
//
// This module is PURE metadata — no DB, no AI, no side effects — so it is safe
// to import from both server runtime and (indirectly) the mock graph.

import type { AgentMeta } from "../types";

// Veronica Design accents (see DESIGN_SYSTEM.md)
const BLUE = "#0081f2";
const ORANGE = "#ff8400";
const PURPLE = "#a78bfa";
const GREEN = "#22c55e";
const GOLD = "#c9a84c";
const CYAN = "#22d3ee";

export const WORKFORCE: AgentMeta[] = [
  {
    id: "vega",
    name: "Vega",
    title: "Intelligence Director",
    mission: "Identify patterns across everything and feed recommendations to the workforce.",
    color: CYAN,
    active: true, // active — Intelligence Director
    tiers: ["hourly", "daily"],
  },
  {
    id: "veronica",
    name: "Veronica",
    title: "Lead Acquisition Director",
    mission: "Understand why leads convert.",
    color: BLUE,
    active: true, // active — Lead Acquisition Director
    tiers: ["hourly", "daily"],
  },
  {
    id: "victoria",
    name: "Victoria",
    title: "Marketing Director",
    mission: "Understand how attention converts.",
    color: ORANGE,
    // active — performs the AI Marketing Director role. Per the role-split note above,
    // this executive is slated to be renamed "Valentina (AI Marketing Director)" in a
    // future phase; the "Victoria" name is being repositioned as the AI Sales Coach.
    // Left unchanged here to avoid any runtime change (spec-only stage).
    active: true,
    tiers: ["hourly", "daily"],
  },
  {
    id: "vivian",
    name: "Vivian",
    title: "Operations Director",
    mission: "Increase operational efficiency.",
    color: GREEN,
    active: false, // stub — not active, not in the tick (future phase)
    tiers: ["daily", "weekly"],
  },
  {
    id: "valerie",
    name: "Valerie",
    title: "Financial Director",
    mission: "Protect and grow financial performance.",
    color: GOLD,
    active: true, // active — Financial Director
    tiers: ["hourly", "daily"],
  },
  {
    id: "vanessa",
    name: "Vanessa",
    title: "Executive Director",
    mission: "Coordinate the workforce and convert intelligence into executive priorities.",
    color: PURPLE,
    active: true, // active — Executive Director
    tiers: ["hourly", "daily"],
  },
];

export function getAgentMeta(id: string): AgentMeta | undefined {
  return WORKFORCE.find((a) => a.id === id);
}

export const ACTIVE_AGENT_IDS = WORKFORCE.filter((a) => a.active).map((a) => a.id);
