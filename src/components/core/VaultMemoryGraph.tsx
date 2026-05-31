"use client";

// Vault Core — Vault Memory knowledge graph (React Flow).
// A radial "digital brain": Vault Memory sits at the center, the workforce on an
// inner ring, all other knowledge on an outer ring. Nodes are styled with the
// Veronica Design palette. Selecting a node bubbles up to the parent for the
// detail panel.

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { styleFor } from "./categoryStyle";
import type { VaultGraph } from "@/lib/core/types";

// ── Custom node ────────────────────────────────────────────────
interface VCNodeData extends Record<string, unknown> {
  label: string;
  category: string;
  color: string;
  isCore: boolean;
  selected: boolean;
}

function VCGraphNode({ data }: NodeProps) {
  const d = data as VCNodeData;
  const size = d.isCore ? 132 : 92;
  return (
    <div
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
          : `0 0 14px ${d.color}22`,
        cursor: "pointer",
        transition: "box-shadow 120ms ease, border-color 120ms ease",
        overflow: "hidden",
      }}
      title={d.label}
    >
      {/* Hidden handles so edges attach; graph is non-interactive for connections */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
      <span style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {d.label}
      </span>
    </div>
  );
}

const nodeTypes = { vc: VCGraphNode };

// ── Radial layout ──────────────────────────────────────────────
function layout(graph: VaultGraph, selectedId: string | null): { nodes: Node[]; edges: Edge[] } {
  const core = graph.nodes.find((n) => n.category === "memory_core") ?? graph.nodes[0];
  const agents = graph.nodes.filter((n) => n.category === "agent");
  const others = graph.nodes.filter(
    (n) => n.category !== "agent" && n.id !== core?.id
  );

  const nodes: Node[] = [];

  if (core) {
    const s = styleFor(core.category);
    nodes.push({
      id: core.id,
      type: "vc",
      position: { x: 0, y: 0 },
      data: { label: core.label, category: core.category, color: s.color, isCore: true, selected: core.id === selectedId },
      draggable: true,
    });
  }

  const agentR = 270;
  agents.forEach((n, i) => {
    const a = (i / Math.max(1, agents.length)) * Math.PI * 2 - Math.PI / 2;
    const s = styleFor(n.category);
    nodes.push({
      id: n.id,
      type: "vc",
      position: { x: Math.cos(a) * agentR, y: Math.sin(a) * agentR },
      data: { label: n.label, category: n.category, color: s.color, isCore: false, selected: n.id === selectedId },
      draggable: true,
    });
  });

  const outerR = 620;
  others.forEach((n, i) => {
    const a = (i / Math.max(1, others.length)) * Math.PI * 2 - Math.PI / 2;
    // slight radius variation so the ring reads as an organic cloud, not a perfect circle
    const r = outerR + ((i % 3) - 1) * 70;
    const s = styleFor(n.category);
    nodes.push({
      id: n.id,
      type: "vc",
      position: { x: Math.cos(a) * r, y: Math.sin(a) * r },
      data: { label: n.label, category: n.category, color: s.color, isCore: false, selected: n.id === selectedId },
      draggable: true,
    });
  });

  const present = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = graph.edges
    .filter((e) => present.has(e.from_node) && present.has(e.to_node))
    .map((e) => {
      const fromStyle = styleFor(
        graph.nodes.find((n) => n.id === e.from_node)?.category ?? ""
      );
      const touchesSelected = selectedId === e.from_node || selectedId === e.to_node;
      return {
        id: e.id,
        source: e.from_node,
        target: e.to_node,
        animated: touchesSelected,
        style: {
          stroke: fromStyle.color,
          strokeWidth: touchesSelected ? 2 : 1,
          opacity: selectedId ? (touchesSelected ? 0.95 : 0.12) : 0.4,
        },
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
