// Vault Core — Workforce roster (Layer 2).
//
// Phase 1: only VEGA is active. The other five executives are registered as
// metadata-only stubs so the UI can render the full workforce and future phases
// can flip `active: true` and attach a runnable agent without schema changes.
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
    active: true, // ← the only active agent in Phase 1
    tiers: ["hourly", "daily"],
  },
  {
    id: "veronica",
    name: "Veronica",
    title: "Lead Acquisition Director",
    mission: "Understand why leads convert.",
    color: BLUE,
    active: false,
    tiers: ["15min", "hourly", "daily"],
  },
  {
    id: "victoria",
    name: "Victoria",
    title: "Marketing Director",
    mission: "Understand why attention converts.",
    color: ORANGE,
    active: false,
    tiers: ["hourly", "daily"],
  },
  {
    id: "vivian",
    name: "Vivian",
    title: "Operations Director",
    mission: "Increase operational efficiency.",
    color: GREEN,
    active: false,
    tiers: ["daily", "weekly"],
  },
  {
    id: "valerie",
    name: "Valerie",
    title: "Financial Director",
    mission: "Protect and grow financial performance.",
    color: GOLD,
    active: false,
    tiers: ["hourly", "daily"],
  },
  {
    id: "vanessa",
    name: "Vanessa",
    title: "Executive Director",
    mission: "Coordinate the workforce and prioritize opportunities and risks.",
    color: PURPLE,
    active: false,
    tiers: ["daily", "weekly", "monthly"],
  },
];

export function getAgentMeta(id: string): AgentMeta | undefined {
  return WORKFORCE.find((a) => a.id === id);
}

export const ACTIVE_AGENT_IDS = WORKFORCE.filter((a) => a.active).map((a) => a.id);
