"use client";

// Vault Core — Runtime Activity (Phase: IA pass). Read-only view of the 24/7
// continuous-operations runtime: recent agent cycles + the live workforce
// activity feed. Backed by the existing /api/core/activity API. No actions here.

import { useCallback, useEffect, useState } from "react";
import { Activity as ActivityIcon, Cpu, Gauge, History } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  VCPageWrapper,
  VCPanel,
  VCPanelHeader,
  VCStat,
  VCStatusBadge,
  VCEmptyState,
  VCSkeleton,
} from "@/components/ui/VaultUI";
import type { VaultActivityRow, VaultAgentRunRow } from "@/lib/core/types";

const ACTIVITY_COLOR: Record<string, string> = {
  insight: "#a78bfa",
  recommendation: "#ff8400",
  analysis: "#0081f2",
  memory_update: "#22c55e",
  collaboration: "#22d3ee",
  monitor: "#6b7a99",
};

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function runVariant(status: string): "success" | "danger" | "neutral" {
  return status === "success" ? "success" : status === "error" ? "danger" : "neutral";
}

export function RuntimeActivity() {
  const [activity, setActivity] = useState<VaultActivityRow[]>([]);
  const [runs, setRuns] = useState<VaultAgentRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/core/activity?limit=60").then((r) => r.json());
      if (res.error) {
        setError("You don't have access to Runtime Activity.");
        return;
      }
      setError(null);
      setActivity(res.activity ?? []);
      setRuns(res.runs ?? []);
    } catch {
      setError("Failed to load runtime activity.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const last24h = activity.filter((a) => Date.now() - new Date(a.created_at).getTime() <= 864e5).length;
  const activeAgents = new Set(runs.map((r) => r.agent)).size;
  const lastRun = runs[0]?.started_at ? timeAgo(runs[0].started_at) : "—";

  if (error) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vault Core · Continuous Operations" title="Runtime Activity" />
        <VCPanel><VCEmptyState icon={ActivityIcon} title="Runtime Activity unavailable" description={error} /></VCPanel>
      </VCPageWrapper>
    );
  }

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Continuous Operations"
        title="Runtime Activity"
        description="The 24/7 workforce runtime — recent agent cycles and the live operational feed. Read-only."
        badge={<VCStatusBadge label="Runtime nominal" variant="success" dot />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <VCStat label="Events (24h)" value={loading ? "—" : last24h} icon={ActivityIcon} accent="#0081f2" />
        <VCStat label="Agents Run" value={loading ? "—" : activeAgents} icon={Cpu} iconColor="#22d3ee" accent="#22d3ee" />
        <VCStat label="Recent Cycles" value={loading ? "—" : runs.length} icon={Gauge} iconColor="#a78bfa" accent="#a78bfa" />
        <VCStat label="Last Cycle" value={lastRun} icon={History} iconColor="#22c55e" accent="#22c55e" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Agent cycles */}
        <VCPanel>
          <VCPanelHeader icon={Cpu} label="Continuous Runtime" title="Agent Cycles" live />
          <div className="px-4 py-3 space-y-2">
            {loading && <VCSkeleton rows={4} className="px-1 py-1" />}
            {!loading && runs.length === 0 && <p className="text-[12px] px-1" style={{ color: "var(--t-muted)" }}>No cycles recorded yet.</p>}
            {runs.map((r) => (
              <div key={r.id} className="px-3.5 py-2.5 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold capitalize" style={{ color: "var(--t-text)" }}>{r.agent} · {r.tier}</span>
                  <VCStatusBadge label={r.status} variant={runVariant(r.status)} dot />
                </div>
                {r.detail && <p className="text-[11.5px] mt-1 leading-snug" style={{ color: "var(--t-text-body)" }}>{r.detail}</p>}
                <p className="text-[10.5px] mt-1" style={{ color: "var(--t-dim)" }}>{timeAgo(r.started_at)}{r.duration_ms != null ? ` · ${r.duration_ms}ms` : ""}</p>
              </div>
            ))}
          </div>
        </VCPanel>

        {/* Operational feed */}
        <VCPanel>
          <VCPanelHeader icon={ActivityIcon} label="Workforce" title="Activity Feed" live />
          <div className="px-5 py-3 space-y-2.5 max-h-[560px] overflow-y-auto">
            {loading && <VCSkeleton rows={5} className="py-1" />}
            {!loading && activity.length === 0 && <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No activity yet.</p>}
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
      </div>

      <p className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>
        Read-only. The runtime reads, analyzes, and recommends — every action is human-approved. No external systems are modified.
      </p>
    </VCPageWrapper>
  );
}
