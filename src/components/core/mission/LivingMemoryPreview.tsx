"use client";

// Vault OS Mission Control — Living Vault Memory preview (Section 7).
//
// A lightweight, premium "digital brain" rendered as a single SVG. It reads the
// REAL knowledge graph from /api/core/memory/graph (read-only, role-guarded) and
// degrades gracefully: on empty/forbidden/error it shows the structural workforce
// brain (the five executives orbiting the memory core) — these are facts from the
// registry, not fabricated memories.
//
// Motion is decorative only and built from transform/opacity (GPU-friendly):
//   • core node breathes          • agent/memory nodes drift
//   • pathways fire signals        • contributions travel agent → memory core
//   • newest node emerges          • recently-updated nodes glow
// Everything is fully disabled under prefers-reduced-motion (useReducedMotion +
// the CSS @media guard in globals.css). The full interactive graph lives at
// /vault-memory — this preview never replaces or breaks it.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Brain, ArrowRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { VCPanel, VCPanelHeader } from "@/components/ui/VaultUI";
import { styleFor } from "@/components/core/categoryStyle";
import { AGENT_ACCENT, CORE_GRADIENT_STOPS, agentColor, isFresh } from "@/components/core/brain/brainViz";
import type { VaultGraph } from "@/lib/core/types";

// Structural fallback brain — the six active executives around the core.
const FALLBACK_AGENTS = ["vega", "veronica", "valentina", "valerie", "vanessa", "vivian"];

const CX = 320;
const CY = 168;
const R_AGENT = 104;
const R_MEM = 162;

interface Placed {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  color: string;
  kind: "core" | "agent" | "memory";
  fresh: boolean; // updated within the last 24h → glow
  newest: boolean; // single most-recent node → emerge
}

interface Link {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  toCore: boolean; // agent → core contribution pathway (carries a signal dot)
}

function buildScene(graph: VaultGraph | null): { nodes: Placed[]; links: Link[] } {
  const realNodes = graph?.nodes ?? [];

  const coreRow = realNodes.find((n) => n.category === "memory_core") ?? null;
  // Active executives only — DORMANT agents (metadata.active === false, e.g. Vivian)
  // are excluded from the preview's five-executive ring.
  const agentRows = realNodes
    .filter((n) => n.category === "agent" && n.metadata?.active !== false)
    .slice(0, 6);
  const memoryRows = realNodes
    .filter((n) => n.category !== "agent" && n.category !== "memory_core" && n.id !== coreRow?.id)
    // newest first so the preview shows the freshest thinking
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 9);

  // Identify the single newest node across memories (for the emergence animation).
  const newestId = memoryRows[0]?.id ?? null;

  const nodes: Placed[] = [];
  const byId = new Map<string, Placed>();

  // Core
  const core: Placed = {
    id: coreRow?.id ?? "__core__",
    label: coreRow?.label ?? "Vault Memory",
    x: CX,
    y: CY,
    r: 36,
    color: styleFor("memory_core").color,
    kind: "core",
    fresh: false,
    newest: false,
  };
  nodes.push(core);
  byId.set(core.id, core);

  // Agents — fall back to the five executives when the graph has none.
  const usingFallback = agentRows.length === 0;
  const agentList: Array<{ id: string; label: string; color: string }> = usingFallback
    ? FALLBACK_AGENTS.map((id) => ({
        id: `__agent_${id}__`,
        label: id.charAt(0).toUpperCase() + id.slice(1),
        color: AGENT_ACCENT[id],
      }))
    : agentRows.map((n) => ({ id: n.id, label: n.label, color: agentColor(n) }));

  const agentPlaced: Placed[] = agentList.map((a, i) => {
    const ang = (i / Math.max(1, agentList.length)) * Math.PI * 2 - Math.PI / 2;
    const p: Placed = {
      id: a.id,
      label: a.label,
      x: CX + Math.cos(ang) * R_AGENT,
      y: CY + Math.sin(ang) * R_AGENT,
      r: 17,
      color: a.color,
      kind: "agent",
      fresh: false,
      newest: false,
    };
    nodes.push(p);
    byId.set(p.id, p);
    return p;
  });

  // Memory nodes — outer organic ring.
  memoryRows.forEach((n, i) => {
    const ang = (i / Math.max(1, memoryRows.length)) * Math.PI * 2 - Math.PI / 2;
    const r = R_MEM + ((i % 3) - 1) * 16;
    const p: Placed = {
      id: n.id,
      label: n.label,
      x: CX + Math.cos(ang) * r,
      y: CY + Math.sin(ang) * r * 0.62, // squash vertically to fit the panel
      r: 12,
      color: styleFor(n.category).color,
      kind: "memory",
      fresh: isFresh(n.updated_at),
      newest: n.id === newestId,
    };
    nodes.push(p);
    byId.set(p.id, p);
  });

  // Links
  const links: Link[] = [];

  // Always draw agent → core contribution pathways (these carry signal dots).
  agentPlaced.forEach((a, i) => {
    links.push({
      id: `core-${a.id}-${i}`,
      x1: a.x,
      y1: a.y,
      x2: core.x,
      y2: core.y,
      color: a.color,
      toCore: true,
    });
  });

  // Real relationship edges between any two visible nodes (capped for perf).
  if (graph?.edges?.length) {
    let added = 0;
    for (const e of graph.edges) {
      if (added >= 14) break;
      const from = byId.get(e.from_node);
      const to = byId.get(e.to_node);
      if (!from || !to) continue;
      // Skip duplicates of the agent→core lines we already drew.
      if (from.kind === "agent" && to.kind === "core") continue;
      links.push({
        id: `edge-${e.id}`,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        color: from.color,
        toCore: false,
      });
      added++;
    }
  }

  return { nodes, links };
}

async function fetchGraph(): Promise<VaultGraph | null> {
  try {
    const r = await fetch("/api/core/memory/graph");
    if (!r.ok) return null;
    const json = (await r.json()) as { graph?: VaultGraph };
    return json.graph ?? null;
  } catch {
    return null;
  }
}

export function LivingMemoryPreview() {
  const reduced = useReducedMotion() ?? false;
  const [graph, setGraph] = useState<VaultGraph | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchGraph().then((g) => {
      if (cancelled) return;
      setGraph(g);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { nodes, links } = useMemo(() => buildScene(graph), [graph]);

  const nodeCount = graph?.nodes?.length ?? 0;
  const edgeCount = graph?.edges?.length ?? 0;
  const isLive = nodeCount > 0;
  const animate = !reduced;

  return (
    <VCPanel accent="blue">
      <VCPanelHeader
        icon={Brain}
        iconColor="#0081f2"
        label="Living intelligence"
        title="Vault Memory"
        live={isLive && animate}
        action={
          <Link
            href="/vault-memory"
            className="flex items-center gap-1 text-[11px] font-medium opacity-70 hover:opacity-100"
            style={{ color: "var(--t-muted)" }}
          >
            Open brain <ArrowRight size={10} />
          </Link>
        }
      />

      <div className="relative" style={{ width: "100%", height: 300 }}>
        <svg
          viewBox="0 0 640 340"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Vault Memory knowledge graph preview"
          style={{ display: "block" }}
        >
          <defs>
            {/* Identical core gradient to the full Vault Core brain (shared stops) */}
            <radialGradient id="vm-core-grad" cx="50%" cy="40%" r="60%">
              {CORE_GRADIENT_STOPS.map((s) => (
                <stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </radialGradient>
          </defs>

          {/* ── Pathways ── */}
          <g>
            {links.map((l) => (
              <line
                key={l.id}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke={l.color}
                strokeWidth={l.toCore ? 1.2 : 1}
                strokeOpacity={l.toCore ? 0.32 : 0.18}
              />
            ))}
            {/* Signal overlay — a marching dash on contribution pathways */}
            {animate &&
              links
                .filter((l) => l.toCore)
                .map((l, i) => (
                  <line
                    key={`sig-${l.id}`}
                    className="vm-signal"
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke={l.color}
                    strokeWidth={1.6}
                    strokeOpacity={0.6}
                    strokeDasharray="3 13"
                    style={{ animationDelay: `${(i % 5) * 0.36}s` }}
                  />
                ))}
          </g>

          {/* ── Traveling contribution signals (agent → memory core) ── */}
          {animate &&
            links
              .filter((l) => l.toCore)
              .map((l, i) => (
                <circle key={`dot-${l.id}`} r={2.6} fill={l.color} opacity={0.9}>
                  <animateMotion
                    dur="2.6s"
                    begin={`${(i % 5) * 0.5}s`}
                    repeatCount="indefinite"
                    path={`M ${l.x1} ${l.y1} L ${l.x2} ${l.y2}`}
                    keyPoints="0;1"
                    keyTimes="0;1"
                    calcMode="linear"
                  />
                </circle>
              ))}

          {/* ── Nodes ── */}
          {nodes.map((n, i) => {
            const floatClass = animate && n.kind !== "core" ? "vm-float" : "";
            const emergeClass = animate && n.newest ? "vm-emerge" : "";
            return (
              <g key={n.id} className={`${floatClass} ${emergeClass}`.trim()} style={{ animationDelay: `${(i % 7) * 0.5}s` }}>
                {/* New-memory ripple — the single freshest node, matching the full brain */}
                {animate && n.newest && (
                  <circle
                    className="vm-ripple"
                    cx={n.x}
                    cy={n.y}
                    r={n.r + 4}
                    fill="none"
                    stroke={n.color}
                    strokeWidth={1.2}
                    strokeOpacity={0.5}
                  />
                )}
                {/* Fresh / recently-updated glow halo */}
                {animate && (n.fresh || n.kind === "core") && (
                  <circle
                    className={n.kind === "core" ? "vm-breathe" : "vm-glow"}
                    cx={n.x}
                    cy={n.y}
                    r={n.r + (n.kind === "core" ? 12 : 7)}
                    fill="none"
                    stroke={n.color}
                    strokeWidth={n.kind === "core" ? 1.5 : 1}
                    strokeOpacity={0.4}
                  />
                )}
                <circle
                  className={animate && n.kind === "core" ? "vm-breathe" : ""}
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={n.kind === "core" ? "url(#vm-core-grad)" : `${n.color}22`}
                  stroke={n.color}
                  strokeWidth={n.kind === "core" ? 2 : 1.4}
                  strokeOpacity={n.kind === "core" ? 0.9 : 0.7}
                />
                {(n.kind === "core" || n.kind === "agent") && (
                  <text
                    x={n.x}
                    y={n.kind === "core" ? n.y + 4 : n.y + n.r + 12}
                    textAnchor="middle"
                    fontSize={n.kind === "core" ? 12 : 9.5}
                    fontWeight={700}
                    fill={n.kind === "core" ? "#f8f8f7" : "var(--t-muted)"}
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", letterSpacing: "0.04em" }}
                  >
                    {n.label.length > 16 ? `${n.label.slice(0, 15)}…` : n.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer — real counts + honest status */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-3 flex-wrap"
        style={{ borderTop: "1px solid var(--t-border-subtle)" }}
      >
        <div className="flex items-center gap-4">
          <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>
            <span className="font-bold" style={{ color: "var(--t-text)" }}>{loaded ? nodeCount : "—"}</span> memory nodes
          </span>
          <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>
            <span className="font-bold" style={{ color: "var(--t-text)" }}>{loaded ? edgeCount : "—"}</span> connections
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--t-dim)" }}>
          {!loaded ? "Connecting…" : isLive ? "Read-only · live graph" : "Standby · structural view"}
        </span>
      </div>
    </VCPanel>
  );
}
