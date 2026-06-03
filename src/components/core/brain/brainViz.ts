// Vault OS — shared "living brain" visual language.
//
// Single source of truth for BOTH brain experiences so they stay unified:
//   • Mission Control preview  → src/components/core/mission/LivingMemoryPreview.tsx
//   • Full Vault Core brain     → src/components/core/VaultMemoryGraph.tsx
//
// Pure constants + helpers — no React, no DOM, no side effects. Motion itself is
// expressed by the shared `vm-*` CSS classes in globals.css (one breathing/float/
// signal/glow/emerge/ripple vocabulary), all disabled under prefers-reduced-motion.

import { styleFor } from "../categoryStyle";

// ── Color system ───────────────────────────────────────────────
// The six active executives carry distinct accents so the network reads as
// several minds, not a uniform cloud. Anything unmapped falls back to the
// category color (agents → cyan).
export const AGENT_ACCENT: Record<string, string> = {
  vega: "#22d3ee",
  veronica: "#0081f2",
  valentina: "#ff8400",
  valerie: "#c9a84c",
  vanessa: "#a78bfa",
  vivian: "#22c55e", // AI Client Success / Experience Operator (active, recommend-only)
};

export const CORE_COLOR = styleFor("memory_core").color; // #0081f2

// Identical radial-gradient stops for the memory core in both brains.
export const CORE_GRADIENT_STOPS: Array<{ offset: string; color: string; opacity: number }> = [
  { offset: "0%", color: "#0081f2", opacity: 0.55 },
  { offset: "70%", color: "#0D1520", opacity: 0.95 },
  { offset: "100%", color: "#0D1520", opacity: 1 },
];

// ── Motion timing (kept in sync with the vm-* keyframes in globals.css) ──
export const BRAIN_MOTION = {
  breatheSec: 4.2,
  floatSec: 6,
  signalSec: 1.8,
  particleSec: 2.6,
  glowSec: 2.6,
} as const;

// Freshness window — a node touched within this window "glows".
export const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

// ── Helpers ────────────────────────────────────────────────────
interface Agentish {
  id?: string | null;
  label?: string | null;
  source_agent?: string | null;
}

/** Distinct accent for an agent-ish node, by id / source / label match. */
export function agentColor(node: Agentish): string {
  const key = (node.source_agent ?? node.label ?? node.id ?? "").toLowerCase();
  for (const id of Object.keys(AGENT_ACCENT)) {
    if (key.includes(id)) return AGENT_ACCENT[id];
  }
  return styleFor("agent").color;
}

/** True when an ISO timestamp is within the freshness window. */
export function isFresh(iso: string | null | undefined, now = Date.now()): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && now - t < FRESH_WINDOW_MS;
}

/** Id of the single most-recently-created node among the given rows (for the
 *  emergence + ripple "new memory" reaction). Null when empty. */
export function newestNodeId<T extends { id: string; created_at?: string }>(rows: T[]): string | null {
  let best: T | null = null;
  for (const r of rows) {
    if (!r.created_at) continue;
    if (!best || new Date(r.created_at).getTime() > new Date(best.created_at!).getTime()) best = r;
  }
  return best?.id ?? null;
}

/** Per-node deterministic delay so floating/drift is staggered, not synchronized. */
export function staggerDelay(index: number, span = 7, step = 0.5): string {
  return `${(index % span) * step}s`;
}

// ── Bounded deterministic drift ────────────────────────────────
// Each node gets stable, organic, in-place motion derived ONLY from its id, so it
// looks alive but never wanders or shifts the layout. Motion is expressed by the
// single `vm-drift` keyframe (globals.css) reading these CSS variables — pure CSS,
// GPU-friendly, no per-frame JS, no Math.random in render.

export type DriftKind = "agent" | "memory" | "fresh";

// [ampMin, ampMax (px), durMin, durMax (s)] — bounded amplitude per node kind.
// Larger/structural nodes move less; smaller/fresher memory moves a touch more.
const DRIFT_RANGE: Record<DriftKind, [number, number, number, number]> = {
  agent: [2, 5, 8, 12],
  memory: [6, 14, 7, 12],
  fresh: [8, 16, 6, 11],
};

/** FNV-1a hash → stable unsigned int from a node id. */
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** CSS custom properties driving the bounded `vm-drift` animation for one node.
 *  Returns a style object: amplitude (x/y), duration, and a negative delay so
 *  every node starts mid-cycle (desynchronized, no synchronized "pop" on mount). */
export function driftVars(id: string, kind: DriftKind): Record<string, string> {
  const h = hashId(id);
  const r0 = (h & 0xff) / 255;
  const r1 = ((h >> 8) & 0xff) / 255;
  const r2 = ((h >> 16) & 0xff) / 255;
  const r3 = ((h >> 24) & 0xff) / 255;
  const [aMin, aMax, dMin, dMax] = DRIFT_RANGE[kind];

  const ax = (aMin + r0 * (aMax - aMin)) * (h & 1 ? 1 : -1);
  const ay = (aMin + r1 * (aMax - aMin)) * (h & 2 ? 1 : -1);
  const dur = dMin + r2 * (dMax - dMin);
  const delay = r3 * dur; // up to one full cycle

  return {
    "--vm-ax": `${ax.toFixed(2)}px`,
    "--vm-ay": `${ay.toFixed(2)}px`,
    "--vm-dur": `${dur.toFixed(2)}s`,
    "--vm-delay": `-${delay.toFixed(2)}s`,
  };
}
