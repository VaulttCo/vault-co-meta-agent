"use client";

// Vault Core — Vault Memory knowledge graph: the FULL living intelligence brain.
//
// A radial "digital brain": Vault Memory sits at the center (breathing core), the
// workforce on an inner ring, all other knowledge on an outer ring. It shares its
// entire visual language with the Mission Control preview via brain/brainViz.ts +
// the vm-* motion classes in globals.css, so the compact preview at `/` and this
// full view read as one connected system.
//
// Living behaviors (all disabled under prefers-reduced-motion):
//   • core node breathes + holds a soft glow halo
//   • non-core nodes drift organically (cosmetic wrapper transform — never moves
//     graph edge anchors, so connections stay anchored to real positions)
//   • recently-updated nodes glow; the single newest node emerges + ripples
//   • communication pathways (edges touching the core or an agent) carry a
//     marching signal and a traveling electron particle
//
// React Flow structure — pan / zoom / minimap / selection / dragging — is intact.

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant,
  BaseEdge,
  getBezierPath,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useReducedMotion } from "framer-motion";
import { styleFor } from "./categoryStyle";
import {
  agentColor,
  isFresh,
  newestNodeId,
  driftVars,
  CORE_GRADIENT_STOPS,
  BRAIN_MOTION,
  type DriftKind,
} from "./brain/brainViz";
import type { VaultGraph } from "@/lib/core/types";

// ── Custom node ────────────────────────────────────────────────
interface VCNodeData extends Record<string, unknown> {
  label: string;
  category: string;
  color: string;
  kind: "core" | "agent" | "memory";
  size: number;
  selected: boolean;
  fresh: boolean;
  newest: boolean;
}

function VCGraphNode({ id, data }: NodeProps) {
  const reduced = useReducedMotion() ?? false;
  const d = data as VCNodeData;
  const isCore = d.kind === "core";
  const isMemory = d.kind === "memory";
  const size = d.size;
  const animate = !reduced;

  // Bounded, deterministic drift on a wrapper — purely visual, returns to home,
  // never moves edge anchors. The core only breathes; agents/memory drift within
  // their per-kind amplitude bounds (brainViz.driftVars).
  const drift = animate && !isCore;
  const driftKind: DriftKind = isCore ? "memory" : d.kind === "agent" ? "agent" : d.fresh ? "fresh" : "memory";
  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    width: size,
    height: size,
    ...(drift ? (driftVars(id, driftKind) as React.CSSProperties) : {}),
  };

  // Memory labels stay hidden until hover/selection so the network breathes;
  // fresh memory keeps a dim label so recent thoughts remain legible.
  const memLabelOpacity = d.selected ? 1 : d.fresh ? 0.55 : 0;

  return (
    <div className={`vm-node ${drift ? "vm-drift" : ""}`} style={wrapperStyle}>
      {/* New-memory ripple — only the single freshest node */}
      {animate && d.newest && (
        <span
          className="vm-ripple"
          style={{ position: "absolute", inset: -6, borderRadius: "50%", border: `1.5px solid ${d.color}`, pointerEvents: "none" }}
        />
      )}

      {/* Glow halo — core always, recently-updated nodes too */}
      {animate && (isCore || d.fresh) && (
        <span
          className={isCore ? "vm-breathe" : "vm-glow"}
          style={{ position: "absolute", inset: isCore ? -10 : -6, borderRadius: "50%", border: `1px solid ${d.color}`, opacity: 0.4, pointerEvents: "none" }}
        />
      )}

      <div
        className={`${animate && isCore ? "vm-breathe" : ""} ${animate && d.newest ? "vm-emerge" : ""}`.trim()}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 8,
          fontSize: isCore ? 13 : 10,
          fontWeight: isCore ? 700 : 600,
          lineHeight: 1.15,
          color: isCore ? "#f8f8f7" : "#e2e8f0",
          background: isCore
            ? `radial-gradient(circle at 50% 40%, ${d.color}33, #0D1520 72%)`
            : `radial-gradient(circle at 50% 40%, ${d.color}1f, #0D1520 78%)`,
          border: `1.5px solid ${d.color}${d.selected ? "" : "55"}`,
          boxShadow: d.selected
            ? `0 0 0 2px ${d.color}, 0 0 26px ${d.color}66`
            : isCore
            ? `0 0 30px ${d.color}55`
            : d.fresh
            ? `0 0 18px ${d.color}44`
            : `0 0 14px ${d.color}22`,
          cursor: "pointer",
          transition: "box-shadow 120ms ease, border-color 120ms ease",
          overflow: "hidden",
        }}
        title={d.label}
      >
        <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
        <span
          className={isMemory ? "vm-node-label-mem" : ""}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            opacity: isMemory ? memLabelOpacity : 1,
          }}
        >
          {d.label}
        </span>
      </div>
    </div>
  );
}

// ── Custom edge — base path + signal march + traveling electron ──
interface VCEdgeData extends Record<string, unknown> {
  color: string;
  signal: boolean;
  opacity: number;
  begin: string;
}

function VCSignalEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps) {
  const reduced = useReducedMotion() ?? false;
  const d = (data ?? {}) as VCEdgeData;
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const animate = !reduced && d.signal;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: d.color, strokeWidth: d.signal ? 1.4 : 1, opacity: d.opacity }} />
      {animate && (
        <>
          {/* Marching signal overlay */}
          <path
            className="vm-signal"
            d={edgePath}
            fill="none"
            stroke={d.color}
            strokeWidth={1.6}
            strokeOpacity={0.6}
            strokeDasharray="3 13"
            style={{ animationDelay: d.begin }}
          />
          {/* Traveling electron particle — rides the bezier edge path */}
          <circle r={2.4} fill={d.color} className="vm-spark">
            <animateMotion
              dur={`${BRAIN_MOTION.particleSec}s`}
              repeatCount="indefinite"
              begin={d.begin}
              path={edgePath}
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="linear"
            />
          </circle>
        </>
      )}
    </>
  );
}

const nodeTypes = { vc: VCGraphNode };
const edgeTypes = { vc: VCSignalEdge };

// Deterministic per-node seed (two values in [0,1)) from its id — used only for
// stable layout jitter so the bands read organic, never Math.random per render.
function seedFromId(id: string): { a: number; r: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = h >>> 0;
  return { a: (h & 0xffff) / 0xffff, r: ((h >> 16) & 0xffff) / 0xffff };
}

// ── Radial layout ──────────────────────────────────────────────
function layout(graph: VaultGraph, selectedId: string | null): { nodes: Node[]; edges: Edge[] } {
  const core = graph.nodes.find((n) => n.category === "memory_core") ?? graph.nodes[0];
  const agents = graph.nodes.filter((n) => n.category === "agent");
  const others = graph.nodes.filter((n) => n.category !== "agent" && n.id !== core?.id);

  const newestId = newestNodeId(others);
  const agentIds = new Set(agents.map((a) => a.id));

  // Per-kind node sizes — memory nodes are smaller so the network reads as a
  // breathable neural cloud rather than a wall of touching bubbles.
  const CORE_SIZE = 132;
  const AGENT_SIZE = 92;
  const MEM_SIZE = 76;

  const nodes: Node[] = [];

  if (core) {
    nodes.push({
      id: core.id,
      type: "vc",
      position: { x: 0, y: 0 },
      data: { label: core.label, category: core.category, color: styleFor(core.category).color, kind: "core", size: CORE_SIZE, selected: core.id === selectedId, fresh: false, newest: false },
      draggable: true,
    });
  }

  const agentR = 300;
  agents.forEach((n, i) => {
    const a = (i / Math.max(1, agents.length)) * Math.PI * 2 - Math.PI / 2;
    nodes.push({
      id: n.id,
      type: "vc",
      position: { x: Math.cos(a) * agentR, y: Math.sin(a) * agentR },
      data: { label: n.label, category: n.category, color: agentColor(n), kind: "agent", size: AGENT_SIZE, selected: n.id === selectedId, fresh: isFresh(n.updated_at), newest: false },
      draggable: true,
    });
  });

  // Memory nodes spread across 2–3 soft orbital bands (instead of one crowded
  // ring): far fewer nodes per band → wide angular gaps + clear radial separation.
  const BANDS = others.length <= 6 ? 1 : others.length <= 16 ? 2 : 3;
  const BAND_BASE = 500;
  const BAND_STEP = 215;
  const bandLists: Array<typeof others> = Array.from({ length: BANDS }, () => []);
  others.forEach((n, i) => bandLists[i % BANDS].push(n));

  bandLists.forEach((list, band) => {
    const R = BAND_BASE + band * BAND_STEP;
    const bandOffset = band * 0.5 - Math.PI / 2; // rotate each band so they interleave
    list.forEach((n, k) => {
      const s = seedFromId(n.id);
      // even angular slot per band + small deterministic jitter so it reads organic
      const a = (k / Math.max(1, list.length)) * Math.PI * 2 + bandOffset + (s.a - 0.5) * 0.16;
      const r = R + (s.r - 0.5) * 46;
      nodes.push({
        id: n.id,
        type: "vc",
        position: { x: Math.cos(a) * r, y: Math.sin(a) * r },
        data: { label: n.label, category: n.category, color: styleFor(n.category).color, kind: "memory", size: MEM_SIZE, selected: n.id === selectedId, fresh: isFresh(n.updated_at), newest: n.id === newestId },
        draggable: true,
      });
    });
  });

  const present = new Set(nodes.map((n) => n.id));
  let signalBudget = 16; // cap traveling particles for performance
  const edges: Edge[] = graph.edges
    .filter((e) => present.has(e.from_node) && present.has(e.to_node))
    .map((e, i) => {
      const fromColor = styleFor(graph.nodes.find((n) => n.id === e.from_node)?.category ?? "").color;
      const touchesSelected = selectedId === e.from_node || selectedId === e.to_node;
      // "Communication pathway" = touches the core or an agent → carries a signal.
      const isPathway =
        e.from_node === core?.id || e.to_node === core?.id || agentIds.has(e.from_node) || agentIds.has(e.to_node);
      const signal = isPathway && signalBudget > 0;
      if (signal) signalBudget--;
      const opacity = selectedId ? (touchesSelected ? 0.95 : 0.1) : signal ? 0.4 : 0.22;
      return {
        id: e.id,
        source: e.from_node,
        target: e.to_node,
        type: "vc",
        data: { color: fromColor, signal: signal || touchesSelected, opacity, begin: `${(i % 6) * 0.42}s` },
      };
    });

  return { nodes, edges };
}

interface VaultMemoryGraphProps {
  graph: VaultGraph;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function VaultMemoryGraph({ graph, selectedId, onSelect }: VaultMemoryGraphProps) {
  const { nodes, edges } = useMemo(() => layout(graph, selectedId), [graph, selectedId]);

  const handleNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => onSelect(node.id),
    [onSelect]
  );
  const handlePaneClick = useCallback(() => onSelect(null), [onSelect]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        nodesConnectable={false}
        edgesFocusable={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(0,129,242,0.10)" />
        <Controls showInteractive={false} style={{ background: "#0f1a28", border: "1px solid rgba(0,129,242,0.15)" }} />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(5,7,11,0.7)"
          style={{ background: "#0D1520", border: "1px solid rgba(0,129,242,0.15)" }}
          nodeColor={(n) => ((n.data as VCNodeData)?.color ?? "#6b7a99")}
        />
      </ReactFlow>
    </div>
  );
}

// Re-exported so consumers that build their own core gradient stay in sync.
export { CORE_GRADIENT_STOPS };
