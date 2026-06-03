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
  staggerDelay,
  CORE_GRADIENT_STOPS,
  BRAIN_MOTION,
} from "./brain/brainViz";
import type { VaultGraph } from "@/lib/core/types";

// ── Custom node ────────────────────────────────────────────────
interface VCNodeData extends Record<string, unknown> {
  label: string;
  category: string;
  color: string;
  isCore: boolean;
  selected: boolean;
  fresh: boolean;
  newest: boolean;
  delay: string;
}

function VCGraphNode({ data }: NodeProps) {
  const reduced = useReducedMotion() ?? false;
  const d = data as VCNodeData;
  const size = d.isCore ? 132 : 92;
  const animate = !reduced;

  // Cosmetic drift on a wrapper — purely visual, does not affect edge anchors.
  const driftClass = animate && !d.isCore ? "vm-drift" : "";

  return (
    <div className={driftClass} style={{ position: "relative", width: size, height: size, animationDelay: d.delay }}>
      {/* New-memory ripple — only the single freshest node */}
      {animate && d.newest && (
        <span
          className="vm-ripple"
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            border: `1.5px solid ${d.color}`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Glow halo — core always, recently-updated nodes too */}
      {animate && (d.isCore || d.fresh) && (
        <span
          className={d.isCore ? "vm-breathe" : "vm-glow"}
          style={{
            position: "absolute",
            inset: d.isCore ? -10 : -6,
            borderRadius: "50%",
            border: `1px solid ${d.color}`,
            opacity: 0.4,
            pointerEvents: "none",
          }}
        />
      )}

      <div
        className={animate && d.isCore ? "vm-breathe" : ""}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 8,
          fontSize: d.isCore ? 13 : 10.5,
          fontWeight: d.isCore ? 700 : 600,
          lineHeight: 1.15,
          color: d.isCore ? "#f8f8f7" : "#e2e8f0",
          background: d.isCore
            ? `radial-gradient(circle at 50% 40%, ${d.color}33, #0D1520 72%)`
            : `radial-gradient(circle at 50% 40%, ${d.color}1f, #0D1520 78%)`,
          border: `1.5px solid ${d.color}${d.selected ? "" : "55"}`,
          boxShadow: d.selected
            ? `0 0 0 2px ${d.color}, 0 0 26px ${d.color}66`
            : d.isCore
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
        <span style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
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

// ── Radial layout ──────────────────────────────────────────────
function layout(graph: VaultGraph, selectedId: string | null): { nodes: Node[]; edges: Edge[] } {
  const core = graph.nodes.find((n) => n.category === "memory_core") ?? graph.nodes[0];
  const agents = graph.nodes.filter((n) => n.category === "agent");
  const others = graph.nodes.filter((n) => n.category !== "agent" && n.id !== core?.id);

  const newestId = newestNodeId(others);
  const agentIds = new Set(agents.map((a) => a.id));

  const nodes: Node[] = [];

  if (core) {
    nodes.push({
      id: core.id,
      type: "vc",
      position: { x: 0, y: 0 },
      data: { label: core.label, category: core.category, color: styleFor(core.category).color, isCore: true, selected: core.id === selectedId, fresh: false, newest: false, delay: "0s" },
      draggable: true,
    });
  }

  const agentR = 270;
  agents.forEach((n, i) => {
    const a = (i / Math.max(1, agents.length)) * Math.PI * 2 - Math.PI / 2;
    nodes.push({
      id: n.id,
      type: "vc",
      position: { x: Math.cos(a) * agentR, y: Math.sin(a) * agentR },
      data: { label: n.label, category: n.category, color: agentColor(n), isCore: false, selected: n.id === selectedId, fresh: isFresh(n.updated_at), newest: false, delay: staggerDelay(i) },
      draggable: true,
    });
  });

  const outerR = 620;
  others.forEach((n, i) => {
    const a = (i / Math.max(1, others.length)) * Math.PI * 2 - Math.PI / 2;
    // slight radius variation so the ring reads as an organic cloud, not a perfect circle
    const r = outerR + ((i % 3) - 1) * 70;
    nodes.push({
      id: n.id,
      type: "vc",
      position: { x: Math.cos(a) * r, y: Math.sin(a) * r },
      data: { label: n.label, category: n.category, color: styleFor(n.category).color, isCore: false, selected: n.id === selectedId, fresh: isFresh(n.updated_at), newest: n.id === newestId, delay: staggerDelay(i + 2) },
      draggable: true,
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
