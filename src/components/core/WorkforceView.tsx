"use client";

// Vault Core — Workforce dashboard (Phase 3).
// Executive Reputation Cards + Objectives + the Workforce Collaboration Feed.
// Shows intelligence moving between departments — the workforce as a living
// organization. Read-only; Veronica Design.

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  ShieldCheck,
  Target,
  Network,
  GitMerge,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  VCPageWrapper,
  VCPanel,
  VCPanelHeader,
  VCStatusBadge,
  VCEmptyState,
} from "@/components/ui/VaultUI";
import type { WorkforceMember, CollaborationFeedItem } from "@/lib/core/types";

function money(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
}
function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const FEED_ICON: Record<string, typeof MessageSquare> = {
  message: MessageSquare,
  collaboration: GitMerge,
  task: ClipboardList,
};
const FEED_COLOR: Record<string, string> = {
  message: "#22d3ee",
  collaboration: "#a78bfa",
  task: "#ff8400",
};

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10.5px]" style={{ color: "var(--t-muted)" }}>{label}</span>
        <span className="text-[10.5px] font-semibold" style={{ color: "var(--t-text-body)" }}>{value}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--t-surface-3)" }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function ReputationCard({ member }: { member: WorkforceMember }) {
  const { meta, reputation: r, objectives } = member;
  const c = meta.color;
  return (
    <VCPanel className="!p-0 overflow-hidden">
      <div className="px-4 py-3.5 flex items-center gap-3" style={{ borderBottom: "1px solid var(--t-border-subtle)" }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
          style={{ background: `${c}1a`, border: `1px solid ${c}33`, color: c }}>
          {meta.name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{meta.name}</span>
            <VCStatusBadge label={meta.active ? "Active" : "Stub"} variant={meta.active ? "success" : "neutral"} dot={meta.active} />
          </div>
          <p className="text-[11px] truncate" style={{ color: "var(--t-muted)" }}>{meta.title}</p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* headline metrics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Trust" value={String(r.trust_score)} color={c} />
          <Metric label="Accuracy" value={String(r.accuracy_score)} color={c} />
          <Metric label="Adoption" value={`${r.adoption_rate}%`} color={c} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Knowledge" value={String(r.knowledge_contributions)} color="#22d3ee" />
          <Metric label="Revenue Infl." value={money(r.revenue_influence)} color="#c9a84c" />
          <Metric label="Collab" value={String(r.collaboration_score)} color="#a78bfa" />
        </div>

        {/* score bars */}
        <div className="space-y-1.5 pt-1">
          <Bar label="Influence" value={r.influence_score} color={c} />
          <Bar label="Collaboration" value={r.collaboration_score} color="#a78bfa" />
        </div>

        {/* objectives */}
        {objectives.length > 0 && (
          <div className="pt-1">
            <p className="vc-label mb-1.5 flex items-center gap-1"><Target size={11} /> Objectives</p>
            <div className="space-y-1.5">
              {objectives.map((o) => (
                <Bar key={o.id} label={o.objective} value={Math.round(o.progress * 100)} color="#0081f2" />
              ))}
            </div>
          </div>
        )}
      </div>
    </VCPanel>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-2 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
      <div className="text-[15px] font-bold leading-none" style={{ color }}>{value}</div>
      <div className="text-[9px] mt-1 uppercase tracking-wide" style={{ color: "var(--t-dim)" }}>{label}</div>
    </div>
  );
}

export function WorkforceView() {
  const [workforce, setWorkforce] = useState<WorkforceMember[]>([]);
  const [feed, setFeed] = useState<CollaborationFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, c] = await Promise.all([
        fetch("/api/core/workforce").then((r) => r.json()),
        fetch("/api/core/collaboration").then((r) => r.json()),
      ]);
      if (w.error) {
        setError("You don't have access to the Workforce dashboard.");
        return;
      }
      setError(null);
      setWorkforce(w.workforce ?? []);
      setFeed(c.feed ?? []);
    } catch {
      setError("Failed to load the Workforce dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (error) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vault Core · Layer 2" title="Workforce" />
        <VCPanel><VCEmptyState icon={Users} title="Workforce unavailable" description={error} /></VCPanel>
      </VCPageWrapper>
    );
  }

  const activeCount = workforce.filter((m) => m.meta.active).length;

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Layer 2 & 3"
        title="Workforce"
        description="Executives collaborating, earning reputation, and pursuing objectives — a company operating inside software."
        badge={<VCStatusBadge label={`${activeCount} active`} variant="success" dot />}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Collaboration feed */}
        <div className="xl:col-span-1 order-2 xl:order-1">
          <VCPanel accent="purple">
            <VCPanelHeader icon={Network} label="Layer 3" title="Collaboration Feed" live />
            <div className="px-4 py-3 space-y-2.5 max-h-[720px] overflow-y-auto">
              {loading && <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>Loading…</p>}
              {!loading && feed.length === 0 && (
                <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No collaboration activity yet.</p>
              )}
              {feed.map((f) => {
                const Icon = FEED_ICON[f.type] ?? MessageSquare;
                const color = FEED_COLOR[f.type] ?? "#6b7a99";
                return (
                  <div key={f.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${color}14`, border: `1px solid ${color}2e` }}>
                      <Icon size={12} style={{ color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] leading-snug" style={{ color: "var(--t-text-body)" }}>{f.text}</p>
                      <p className="text-[10.5px] mt-0.5" style={{ color: "var(--t-dim)" }}>{timeAgo(f.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </VCPanel>
        </div>

        {/* Reputation + objectives cards */}
        <div className="xl:col-span-2 order-1 xl:order-2">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={14} style={{ color: "#0081f2" }} />
            <span className="vc-label">Executive Reputation & Objectives</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading && <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>Loading executives…</p>}
            {workforce.map((m) => <ReputationCard key={m.meta.id} member={m} />)}
          </div>
        </div>
      </div>
    </VCPageWrapper>
  );
}
