"use client";

// Vault Core — System Creation Engine V1 console (Phase 3).
// Vault Core proposing improvements to itself, reviewed by humans.
// Same review workflow + safety guarantees as recommendations — approving a
// proposal signals intent only; nothing is built or executed automatically.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wrench,
  X,
  CheckCircle2,
  XCircle,
  Archive,
  RotateCcw,
  Rocket,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  VCPageWrapper,
  VCPanel,
  VCPanelHeader,
  VCStatusBadge,
  VCChip,
  VCEmptyState,
} from "@/components/ui/VaultUI";
import { useAuth } from "@/components/AuthProvider";
import { STATUS_META, ACTION_META, actionsFor } from "./recommendationStatus";
import type {
  SystemProposalRow,
  RecommendationCounts,
  RecommendationStatus,
  ReviewAction,
} from "@/lib/core/types";

const ACTION_ICON: Record<ReviewAction, typeof CheckCircle2> = {
  approve: CheckCircle2,
  reject: XCircle,
  archive: Archive,
  implement: Rocket,
  request_revision: RotateCcw,
};

const CATEGORY_LABEL: Record<string, string> = {
  missing_dashboard: "Missing Dashboard",
  missing_workflow: "Missing Workflow",
  missing_automation: "Missing Automation",
  missing_workforce_role: "Missing Workforce Role",
  missing_command_hub_module: "Missing Command Hub Module",
  missing_intelligence_system: "Missing Intelligence System",
};

const FILTERS: Array<{ key: RecommendationStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending_review", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "implemented", label: "Implemented" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
];

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function SystemProposals() {
  const { user } = useAuth();
  const canReview = !!user && (user.role === "admin" || user.role === "media_buyer");

  const [proposals, setProposals] = useState<SystemProposalRow[]>([]);
  const [counts, setCounts] = useState<RecommendationCounts | null>(null);
  const [filter, setFilter] = useState<RecommendationStatus | "all">("pending_review");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/core/proposals").then((r) => r.json());
      if (res.error) {
        setError("You don't have access to system proposals.");
        return;
      }
      setError(null);
      setProposals(res.proposals ?? []);
      setCounts(res.counts ?? null);
    } catch {
      setError("Failed to load system proposals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const selected = useMemo(
    () => proposals.find((p) => p.id === selectedId) ?? null,
    [proposals, selectedId]
  );

  const act = useCallback(
    async (action: ReviewAction) => {
      if (!selectedId) return;
      setActing(true);
      setNotice(null);
      try {
        const res = await fetch(`/api/core/proposals/${selectedId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, notes: notes.trim() || undefined }),
        }).then((r) => r.json());
        if (res.error) {
          setNotice(res.error);
          return;
        }
        if (res.mockMode) setNotice("Preview mode — connect the database to persist this review.");
        await load();
      } catch {
        setNotice("Action failed. Please try again.");
      } finally {
        setActing(false);
      }
    },
    [selectedId, notes, load]
  );

  const visible = useMemo(
    () => (filter === "all" ? proposals : proposals.filter((p) => p.status === filter)),
    [proposals, filter]
  );
  const countFor = (key: RecommendationStatus | "all") =>
    key === "all" ? counts?.total ?? proposals.length : counts?.[key] ?? 0;

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · System Creation Engine V1"
        title="System Proposals"
        description="Vault Core proposing improvements to itself. Read · analyze · recommend — approval signals intent only; nothing is built automatically."
        badge={<VCStatusBadge label={`${countFor("pending_review")} pending`} variant="blue" dot />}
      />

      {error ? (
        <VCPanel><VCEmptyState icon={Wrench} title="Proposals unavailable" description={error} /></VCPanel>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                  style={active
                    ? { background: "rgba(0,129,242,0.14)", border: "1px solid rgba(0,129,242,0.3)", color: "#f8f8f7" }
                    : { background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)", color: "var(--t-muted)" }}>
                  {f.label}<span className="ml-1.5 opacity-70">{countFor(f.key)}</span>
                </button>
              );
            })}
          </div>

          <VCPanel>
            <VCPanelHeader icon={Wrench} label="Queue" title="System Proposals" live />
            <div className="px-4 py-3 space-y-2.5">
              {loading && <p className="text-[12px] px-1" style={{ color: "var(--t-muted)" }}>Loading…</p>}
              {!loading && visible.length === 0 && (
                <p className="text-[12px] px-1" style={{ color: "var(--t-muted)" }}>Nothing in this view.</p>
              )}
              {visible.map((p) => {
                const sm = STATUS_META[p.status];
                return (
                  <button key={p.id} onClick={() => { setSelectedId(p.id); setNotes(""); setNotice(null); }}
                    className="w-full text-left px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: selectedId === p.id ? "rgba(0,129,242,0.06)" : "var(--t-surface-2)",
                      border: `1px solid ${selectedId === p.id ? "rgba(0,129,242,0.3)" : "var(--t-border-subtle)"}`,
                    }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold" style={{ color: "var(--t-text)" }}>{p.title}</p>
                        {p.problem && <p className="text-[12px] mt-0.5 leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>{p.problem}</p>}
                      </div>
                      <VCStatusBadge label={sm.label} variant={sm.variant} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <VCChip label={`by ${p.agent}`} color="#22d3ee" />
                      <VCChip label={CATEGORY_LABEL[p.category] ?? p.category} color="#a78bfa" />
                      {p.estimated_effort && <VCChip label={p.estimated_effort} color="#ff8400" />}
                      <span className="inline-flex items-center gap-1">
                        <Gauge size={11} style={{ color: "#ff8400" }} />
                        <span className="text-[11px] font-semibold" style={{ color: "#ff8400" }}>{Math.round(p.priority_score * 100)}</span>
                      </span>
                      <span className="text-[10.5px] ml-auto" style={{ color: "var(--t-dim)" }}>{timeAgo(p.created_at)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </VCPanel>
        </>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0" style={{ background: "rgba(5,7,11,0.6)" }} onClick={() => setSelectedId(null)} />
          <div className="relative h-full w-full max-w-[580px] overflow-y-auto" style={{ background: "var(--t-bg)", borderLeft: "1px solid var(--t-border)" }}>
            <div className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between gap-3" style={{ background: "var(--t-bg)", borderBottom: "1px solid var(--t-border-subtle)" }}>
              <div className="min-w-0">
                <p className="vc-label mb-1">{CATEGORY_LABEL[selected.category] ?? selected.category} · {selected.agent}</p>
                <h3 className="text-[16px] font-bold tracking-wide" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color: "var(--t-text)" }}>{selected.title}</h3>
              </div>
              <button onClick={() => setSelectedId(null)} className="w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0" style={{ color: "var(--t-muted)" }} aria-label="Close"><X size={16} /></button>
            </div>

            <div className="px-6 py-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <VCStatusBadge label={STATUS_META[selected.status].label} variant={STATUS_META[selected.status].variant} dot />
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(255,132,0,0.12)", border: "1px solid rgba(255,132,0,0.25)" }}>
                  <Gauge size={11} style={{ color: "#ff8400" }} /><span className="text-[11px] font-semibold" style={{ color: "#ff8400" }}>priority {Math.round(selected.priority_score * 100)}</span>
                </span>
                {selected.estimated_effort && <VCChip label={`effort ${selected.estimated_effort}`} color="#6b7a99" />}
              </div>

              <Field label="Problem" value={selected.problem} />
              <Field label="Impact" value={selected.impact} />
              <Field label="Opportunity" value={selected.opportunity} />
              <Field label="Solution" value={selected.solution} />
              <Field label="Technical Requirements" value={selected.technical_requirements} />
              <Field label="UI Requirements" value={selected.ui_requirements} />
              <Field label="Expected Outcome" value={selected.expected_outcome} tone="#22c55e" />

              <div className="pt-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                {canReview ? (
                  <>
                    <p className="vc-label mb-2 mt-3">Human Review</p>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Review notes (optional)…" rows={2}
                      className="w-full text-[12.5px] rounded-lg px-3 py-2 mb-3 resize-none"
                      style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
                    <div className="flex flex-wrap gap-2">
                      {actionsFor(selected.status).map((a) => {
                        const meta = ACTION_META[a];
                        const Icon = ACTION_ICON[a];
                        return (
                          <button key={a} onClick={() => act(a)} disabled={acting}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-all disabled:opacity-50"
                            style={{ background: `${meta.tone}16`, border: `1px solid ${meta.tone}3a`, color: meta.tone }}>
                            <Icon size={13} />{meta.label}
                          </button>
                        );
                      })}
                    </div>
                    {notice && (
                      <p className="text-[11.5px] mt-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,132,0,0.08)", border: "1px solid rgba(255,132,0,0.2)", color: "#ff8400" }}>{notice}</p>
                    )}
                  </>
                ) : (
                  <p className="text-[11.5px] mt-3 flex items-center gap-1.5" style={{ color: "var(--t-muted)" }}><ShieldCheck size={12} /> View-only. Operator role required to review.</p>
                )}
                <p className="text-[10.5px] mt-3" style={{ color: "var(--t-dim)" }}>
                  Approving a proposal signals intent for a human/engineer to build it. Nothing is created or executed automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </VCPageWrapper>
  );
}

function Field({ label, value, tone }: { label: string; value: string | null; tone?: string }) {
  if (!value) return null;
  return (
    <div className="px-3.5 py-2.5 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
      <p className="vc-label mb-1">{label}</p>
      <p className="text-[12.5px] leading-relaxed" style={{ color: tone ?? "var(--t-text-body)" }}>{value}</p>
    </div>
  );
}
