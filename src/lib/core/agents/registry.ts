// Vault Core — Workforce roster (Layer 2).
//
// Currently ACTIVE (6): Vega, Veronica, Valentina, Valerie, Vanessa, Vivian.
// Vivian — the AI Client Success / Experience Operator — was activated in Phase
// 8.2 as a RECOMMEND-ONLY runtime agent: she is in ACTIVE_AGENT_IDS, in
// RUNNABLE_AGENTS (src/lib/core/agents/index.ts → vivianAgent), and runs on the
// existing tick. She reads only safe internal data, recommends internal client-
// success actions for HUMAN approval, and never mutates any external system
// (no GHL/Stripe/Meta/SMS/email/workflow, no client contact, no auto tasks).
// See docs/vivian-client-success-operator-spec.md.
//
// NAMING (corrected — see docs/valentina-marketing-director-spec.md):
//   • Valentina = AI Marketing Director — the active marketing executive below.
//     It was previously registered as "victoria"; renamed so the marketing role and
//     the "Victoria" name no longer collide. Same behavior/tiers/safety — identity only.
//   • Victoria = AI Sales Coach — the live sales-call product (src/lib/victoria/**,
//     /api/victoria/**, /victoria). It is NOT a Vault Core executive and is NOT in
//     this roster or the tick. (If it ever becomes a runtime executive, add it then.)
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
    id: "valentina",
    name: "Valentina",
    title: "AI Marketing Director",
    mission: "Understand how attention converts.",
    color: ORANGE,
    active: true, // active — AI Marketing Director (renamed from "victoria"; same role/behavior)
    tiers: ["hourly", "daily"],
  },
  {
    id: "vivian",
    name: "Vivian",
    title: "Client Success Operator",
    mission:
      "Monitor client experience, onboarding health, sentiment, fulfillment gaps, retention risk, and renewal readiness — and recommend internal actions that help Vault Co retain and support clients.",
    color: GREEN,
    active: true, // ACTIVE (Phase 8.2) — AI Client Success / Experience Operator,
                  // RECOMMEND-ONLY. Runnable (vivianAgent), in the tick. Never mutates
                  // external systems. See docs/vivian-client-success-operator-spec.md.
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
