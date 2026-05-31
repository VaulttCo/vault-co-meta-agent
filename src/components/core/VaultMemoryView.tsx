"use client";

// Vault Core — Vault Memory experience (Layer 1 UI).
// Orchestrates the knowledge graph, Memory Overview, Live Activity feed,
// Memory Health, Recommendations, and Workforce roster. All data is fetched
// from the role-guarded /api/core/* routes (mock-safe on the server side).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain,
  Network,
  Activity as ActivityIcon,
  HeartPulse,
  Lightbulb,
  Users,
  RefreshCw,
  Gauge,
  Sparkles,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  VCPageWrapper,
  VCPanel,
  VCPanelHeader,
  VCStat,
  VCStatusBadge,
  VCChip,
  VCEmptyState,
  VCButton,
} from "@/components/ui/VaultUI";
import { useAuth } from "@/components/AuthProvider";
import { WORKFORCE } from "@/lib/core/agents/registry";
import { styleFor } from "./categoryStyle";
import { STATUS_META } from "./recommendationStatus";
import { VaultMemoryGraph } from "./VaultMemoryGraph";
import type {
  VaultGraph,
  VaultNodeRow,
  VaultActivityRow,
  VaultRecommendationRow,
  VaultAgentRunRow,
  MemoryOverview,
  MemoryHealth,
} from "@/lib/core/types";

// ── helpers ────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ACTIVITY_COLOR: Record<string, string> = {
  insight: "#a78bfa",
  recommendation: "#ff8400",
  analysis: "#0081f2",
  memory_update: "#22c55e",
  collaboration: "#22d3ee",
  monitor: "#6b7a99",
};

interface ApiState {
  graph: VaultGraph;
  overview: MemoryOverview | null;
  health: MemoryHealth | null;
  activity: VaultActivityRow[];
  recommendations: VaultRecommendationRow[];
  runs: VaultAgentRunRow[];
  live: boolean;
}

const EMPTY: ApiState = {
  graph: { nodes: [], edges: [] },
  overview: null,
  health: null,
  activity: [],
  recommendations: [],
  runs: [],
  live: false,
};

export function VaultMemoryView() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [state, setState] = useState<ApiState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [g, o, a] = await Promise.all([
        fetch("/api/core/memory/graph").then((r) => r.json()),
        fetch("/api/core/memory/overview").then((r) => r.json()),
        fetch("/api/core/activity").then((r) => r.json()),
      ]);
      if (g.error || o.error) {
        setError("You don't have access to Vault Memory.");
        return;
      }
      setError(null);
      setState({
        graph: g.graph ?? { nodes: [], edges: [] },
        overview: o.overview ?? null,
        health: o.health ?? null,
        activity: a.activity ?? [],
        recommendations: a.recommendations ?? [],
        runs: a.runs ?? [],
        live: !!g.live,
      });
    } catch {
      setError("Failed to load Vault Memory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // load() is async: all setState calls happen after the first await, so they
    // are not synchronous-in-effect. The lint heuristic can't see through the
    // async boundary — this is a false positive.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const runCycle = useCallback(async () => {
    setRunning(true);
    try {
      await fetch("/api/core/tick?tier=hourly", { method: "POST" });
      await load();
    } finally {
      setRunning(false);
    }
  }, [load]);

  const { graph, overview, health, activity, recommendations, runs } = state;

  // node lookups + connections for the detail panel
  const nodeById = useMemo(() => {
    const m = new Map<string, VaultNodeRow>();
    graph.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [graph.nodes]);

  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;
  const connections = useMemo(() => {
    if (!selectedId) return [];
    const out: { node: VaultNodeRow; relationship: string }[] = [];
    for (const e of graph.edges) {
      if (e.from_node !== selectedId && e.to_node !== selectedId) continue;
      const otherId = e.from_node === selectedId ? e.to_node : e.from_node;
      const node = nodeById.get(otherId);
      if (node) out.push({ node, relationship: e.relationship });
    }
    return out;
  }, [selectedId, graph.edges, nodeById]);

  // last-run per active agent (Workforce Health)
  const lastRunByAgent = useMemo(() => {
    const m = new Map<string, VaultAgentRunRow>();
    runs.forEach((r) => {
      if (!m.has(r.agent)) m.set(r.agent, r);
    });
    return m;
  }, [runs]);

  if (error) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vault Core" title="Vault Memory" />
        <VCPanel>
          <VCEmptyState icon={Brain} title="Vault Memory unavailable" description={error} />
        </VCPanel>
      </VCPageWrapper>
    );
  }

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Layer 1"
        title="Vault Memory"
        description="The living intelligence layer of Vault Co — continuously expanded by the workforce."
        badge={
          <VCStatusBadge
            label={state.live ? "Live memory" : "Seeded preview"}
            variant={state.live ? "success" : "blue"}
            dot
          />
        }
        action={
          isAdmin ? (
            <VCButton onClick={runCycle} disabled={running} variant="ghost">
              <RefreshCw size={13} className={running ? "animate-spin" : ""} />
              {running ? "Running…" : "Run cycle"}
            </VCButton>
          ) : undefined
        }
      />

      {/* ── Memory Overview ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <VCStat label="Total Nodes" value={overview?.totalNodes ?? "—"} icon={Brain} accent="#0081f2" />
        <VCStat label="Relationships" value={overview?.totalRelationships ?? "—"} icon={Network} iconColor="#22d3ee" accent="#22d3ee" />
        <VCStat label="Growth Today" value={overview ? `+${overview.knowledgeGrowthToday}` : "—"} icon={Sparkles} iconColor="#a78bfa" accent="#a78bfa" changeType="up" />
        <VCStat label="Intelligence Velocity" value={overview ? `${overview.intelligenceVelocity}/24h` : "—"} icon={Zap} iconColor="#ff8400" accent="#ff8400" />
        <VCStat label="Active Contributors" value={overview?.activeContributors ?? "—"} icon={Users} iconColor="#22c55e" accent="#22c55e" />
      </div>

      {/* ── Graph + right rail ────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Knowledge graph */}
        <div className="xl:col-span-2">
          <VCPanel accent="blue" className="!p-0 overflow-hidden">
            <VCPanelHeader
              icon={Network}
              label="Knowledge Graph"
              title="Intelligence Network"
              live
              action={<span className="text-[11px]" style={{ color: "var(--t-muted)" }}>{graph.nodes.length} nodes · {graph.edges.length} links</span>}
            />
            <div style={{ height: 620 }}>
              {loading ? (
                <div className="h-full flex items-center justify-center text-[12px]" style={{ color: "var(--t-muted)" }}>
                  Loading the digital brain…
                </div>
              ) : (
                <VaultMemoryGraph graph={graph} selectedId={selectedId} onSelect={setSelectedId} />
              )}
            </div>
          </VCPanel>
        </div>

        {/* Right rail: node detail OR activity */}
        <div className="space-y-4">
          {selected ? (
            <VCPanel accent="purple">
              <VCPanelHeader
                icon={Brain}
                label={styleFor(selected.category).label}
                title={selected.label}
                action={
                  <button onClick={() => setSelectedId(null)} className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                    Close
                  </button>
                }
              />
              <div className="px-5 py-4 space-y-3">
                {selected.summary && (
                  <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>
                    {selected.summary}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {selected.source_agent && <VCChip label={`by ${selected.source_agent}`} color="#22d3ee" />}
                  <VCChip label={`confidence ${Math.round((selected.confidence ?? 0) * 100)}%`} color="#a78bfa" />
                </div>
                <div>
                  <p className="vc-label mb-2">Connected ({connections.length})</p>
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
                    {connections.length === 0 && (
                      <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No relationships yet.</p>
                    )}
                    {connections.map((c, i) => (
                      <button
                        key={`${c.node.id}-${i}`}
                        onClick={() => setSelectedId(c.node.id)}
                        className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                        style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: styleFor(c.node.category).color }} />
                        <span className="text-[12px] truncate flex-1" style={{ color: "var(--t-text-body)" }}>{c.node.label}</span>
                        <span className="text-[10px]" style={{ color: "var(--t-dim)" }}>{c.relationship.replace(/_/g, " ")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </VCPanel>
          ) : (
            <VCPanel>
              <VCPanelHeader icon={ActivityIcon} label="Live Activity" title="Workforce Feed" live />
              <div className="px-5 py-3 space-y-2.5 max-h-[560px] overflow-y-auto">
                {activity.length === 0 && (
                  <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No activity yet.</p>
                )}
                {activity.map((a) => (
                  <div key={a.id} className="flex gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: ACTIVITY_COLOR[a.kind] ?? "#6b7a99" }} />
                    <div className="min-w-0">
                      <p className="text-[12.5px] leading-snug" style={{ color: "var(--t-text-body)" }}>{a.message}</p>
                      <p className="text-[10.5px] mt-0.5" style={{ color: "var(--t-dim)" }}>{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </VCPanel>
          )}
        </div>
      </div>

      {/* ── Workforce + Health + Recommendations ──────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Workforce roster */}
        <VCPanel className="xl:col-span-2">
          <VCPanelHeader icon={Users} label="Layer 2" title="Workforce" />
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {WORKFORCE.map((agent) => {
              const run = lastRunByAgent.get(agent.id);
              return (
                <div
                  key={agent.id}
                  className="flex items-start gap-3 px-3.5 py-3 rounded-xl"
                  style={{
                    background: "var(--t-surface-2)",
                    border: `1px solid ${agent.active ? agent.color + "33" : "var(--t-border-subtle)"}`,
                    opacity: agent.active ? 1 : 0.62,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                    style={{ background: `${agent.color}1a`, border: `1px solid ${agent.color}33`, color: agent.color }}
                  >
                    {agent.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{agent.name}</span>
                      <VCStatusBadge label={agent.active ? "Active" : "Stub"} variant={agent.active ? "success" : "neutral"} dot={agent.active} />
                    </div>
                    <p className="text-[11px] truncate" style={{ color: "var(--t-muted)" }}>{agent.title}</p>
                    <p className="text-[10.5px] mt-1" style={{ color: "var(--t-dim)" }}>
                      {agent.active
                        ? run
                          ? `Last ran ${timeAgo(run.started_at)} · ${run.detail ?? ""}`
                          : "Scheduled — awaiting first cycle"
                        : "Registered · not yet activated"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </VCPanel>

        {/* Memory Health */}
        <VCPanel accent="green">
          <VCPanelHeader icon={HeartPulse} label="Memory" title="Health" />
          <div className="px-5 py-4 space-y-3">
            {health
              ? (
                [
                  ["Completeness", health.completeness],
                  ["Freshness", health.freshness],
                  ["Relationship Density", health.relationshipDensity],
                  ["Knowledge Utilization", health.utilizationScore],
                  ["Avg Confidence", health.confidence],
                  ["Growth Rate", health.growthRate],
                ] as Array<[string, number]>
              ).map(([label, val]) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11.5px]" style={{ color: "var(--t-muted)" }}>{label}</span>
                    <span className="text-[11.5px] font-semibold" style={{ color: "var(--t-text-body)" }}>{val}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--t-surface-3)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${val}%`, background: val >= 70 ? "#22c55e" : val >= 40 ? "#f59e0b" : "#ef4444" }}
                    />
                  </div>
                </div>
              ))
              : <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>Loading…</p>}
          </div>
        </VCPanel>
      </div>

      {/* ── Recommendations (Command Hub queue preview) ───────── */}
      <VCPanel accent="orange">
        <VCPanelHeader
          icon={Lightbulb}
          label="Layer 4 · Human review"
          title="Workforce Recommendations"
          action={<span className="text-[11px]" style={{ color: "var(--t-muted)" }}>{recommendations.length} open</span>}
        />
        <div className="px-5 py-4 space-y-2.5">
          {recommendations.length === 0 && (
            <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No recommendations yet.</p>
          )}
          {recommendations.map((r) => (
            <div
              key={r.id}
              className="px-3.5 py-3 rounded-xl"
              style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{r.title}</p>
                  {r.body && <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "var(--t-text-body)" }}>{r.body}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Gauge size={12} style={{ color: "#ff8400" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "#ff8400" }}>{Math.round(r.priority_score * 100)}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <VCChip label={`by ${r.agent}`} color="#22d3ee" />
                {r.impact && <VCChip label={r.impact} color="#22c55e" />}
                <VCStatusBadge label={STATUS_META[r.status].label} variant={STATUS_META[r.status].variant} />
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-4">
          <p className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>
            Vault Core recommends only. Nothing is sent, published, launched, edited, or deleted without human approval.
          </p>
        </div>
      </VCPanel>
    </VCPageWrapper>
  );
}
