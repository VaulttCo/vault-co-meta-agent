"use client";

// Vault Core — Recommendations console (Command Hub Integration, Phase 2).
// The queue + a traceability detail drawer + human review actions.
// Nothing here executes: review actions only move a recommendation's status in
// Vault Memory and append an audit trail.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Lightbulb,
  Brain,
  Network,
  CheckCircle2,
  XCircle,
  Archive,
  RotateCcw,
  Rocket,
  Gauge,
  Users,
  History,
  X,
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
  VCSkeleton,
} from "@/components/ui/VaultUI";
import { useAuth } from "@/components/AuthProvider";
import { styleFor } from "./categoryStyle";
import { STATUS_META, ACTION_META, actionsFor, PRIORITY_META } from "./recommendationStatus";
import type {
  VaultRecommendationRow,
  RecommendationTrace,
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

const FILTERS: Array<{ key: RecommendationStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending_review", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "implemented", label: "Implemented" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
];

// Recommendations don't carry a dedicated confidence column; Vega stores it in
// metadata.confidence. Fall back to influence_score if absent.
function confidenceOf(r: VaultRecommendationRow): number {
  const c = (r.metadata as { confidence?: number } | undefined)?.confidence;
  return typeof c === "number" ? c : r.influence_score;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ScorePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: `${color}14`, border: `1px solid ${color}2e` }}>
      <Gauge size={11} style={{ color }} />
      <span className="text-[10.5px]" style={{ color: "var(--t-muted)" }}>{label}</span>
      <span className="text-[11px] font-semibold" style={{ color }}>{Math.round(value * 100)}</span>
    </div>
  );
}

export function VaultCoreRecommendations() {
  const { user } = useAuth();
  const canReview = !!user && (user.role === "admin" || user.role === "media_buyer");

  const [recs, setRecs] = useState<VaultRecommendationRow[]>([]);
  const [counts, setCounts] = useState<RecommendationCounts | null>(null);
  const [filter, setFilter] = useState<RecommendationStatus | "all">("pending_review");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trace, setTrace] = useState<RecommendationTrace | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/core/recommendations").then((r) => r.json());
      if (res.error) {
        setError("You don't have access to the recommendation queue.");
        return;
      }
      setError(null);
      setRecs(res.recommendations ?? []);
      setCounts(res.counts ?? null);
    } catch {
      setError("Failed to load recommendations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setNotes("");
    setNotice(null);
    setTraceLoading(true);
    try {
      const res = await fetch(`/api/core/recommendations/${id}`).then((r) => r.json());
      setTrace(res.trace ?? null);
    } catch {
      setTrace(null);
    } finally {
      setTraceLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setTrace(null);
    setNotice(null);
  }, []);

  const act = useCallback(
    async (action: ReviewAction) => {
      if (!selectedId) return;
      setActing(true);
      setNotice(null);
      try {
        const res = await fetch(`/api/core/recommendations/${selectedId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, notes: notes.trim() || undefined }),
        }).then((r) => r.json());

        if (res.error) {
          setNotice(res.error);
          return;
        }
        if (res.mockMode) {
          setNotice("Preview mode — connect the database to persist this review.");
        }
        await load();
        // refresh the open detail to reflect the new status + review history
        await openDetail(selectedId);
      } catch {
        setNotice("Action failed. Please try again.");
      } finally {
        setActing(false);
      }
    },
    [selectedId, notes, load, openDetail]
  );

  const agents = useMemo(
    () => Array.from(new Set(recs.map((r) => r.agent))).sort(),
    [recs]
  );
  const visible = useMemo(
    () =>
      recs.filter(
        (r) =>
          (filter === "all" || r.status === filter) &&
          (agentFilter === "all" || r.agent === agentFilter) &&
          (priorityFilter === "all" || r.vanessa_priority === priorityFilter)
      ),
    [recs, filter, agentFilter, priorityFilter]
  );

  const countFor = (key: RecommendationStatus | "all") =>
    key === "all" ? counts?.total ?? recs.length : counts?.[key] ?? 0;

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Command Hub"
        title="Vault Core Recommendations"
        description="Agent-generated intelligence awaiting human review. Read · analyze · recommend — nothing executes without you."
        badge={<VCStatusBadge label={`${countFor("pending_review")} pending`} variant="blue" dot />}
      />

      {error ? (
        <VCPanel>
          <VCEmptyState icon={Lightbulb} title="Recommendations unavailable" description={error} />
        </VCPanel>
      ) : (
        <>
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                  style={
                    active
                      ? { background: "rgba(0,129,242,0.14)", border: "1px solid rgba(0,129,242,0.3)", color: "#f8f8f7" }
                      : { background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)", color: "var(--t-muted)" }
                  }
                >
                  {f.label}
                  <span className="ml-1.5 opacity-70">{countFor(f.key)}</span>
                </button>
              );
            })}
          </div>

          {/* Source-agent filter (e.g. Financial = Valerie) */}
          {agents.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="vc-label mr-1">Source</span>
              {["all", ...agents].map((ag) => {
                const active = agentFilter === ag;
                return (
                  <button
                    key={ag}
                    onClick={() => setAgentFilter(ag)}
                    className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-all capitalize"
                    style={
                      active
                        ? { background: "rgba(201,168,76,0.16)", border: "1px solid rgba(201,168,76,0.34)", color: "#e8c97a" }
                        : { background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)", color: "var(--t-muted)" }
                    }
                  >
                    {ag === "all" ? "All agents" : ag}
                  </button>
                );
              })}
            </div>
          )}

          {/* Executive priority filter (Vanessa) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="vc-label mr-1">Exec priority</span>
            {["all", "critical", "high", "medium", "low", "watch"].map((p) => {
              const active = priorityFilter === p;
              const color = p !== "all" ? PRIORITY_META[p as keyof typeof PRIORITY_META].color : "#a78bfa";
              return (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-all capitalize"
                  style={
                    active
                      ? { background: `${color}22`, border: `1px solid ${color}55`, color }
                      : { background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)", color: "var(--t-muted)" }
                  }
                >
                  {p === "all" ? "All priorities" : p}
                </button>
              );
            })}
          </div>

          {/* Queue */}
          <VCPanel>
            <VCPanelHeader icon={Lightbulb} label="Queue" title="Recommendations" live />
            <div className="px-4 py-3 space-y-2.5">
              {loading && <VCSkeleton rows={4} className="px-1 py-1" />}
              {!loading && visible.length === 0 && (
                <p className="text-[12px] px-1" style={{ color: "var(--t-muted)" }}>Nothing in this view.</p>
              )}
              {visible.map((r) => {
                const sm = STATUS_META[r.status];
                return (
                  <button
                    key={r.id}
                    onClick={() => openDetail(r.id)}
                    className="w-full text-left px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: selectedId === r.id ? "rgba(0,129,242,0.06)" : "var(--t-surface-2)",
                      border: `1px solid ${selectedId === r.id ? "rgba(0,129,242,0.3)" : "var(--t-border-subtle)"}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold" style={{ color: "var(--t-text)" }}>{r.title}</p>
                        {r.body && <p className="text-[12px] mt-0.5 leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>{r.body}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <VCStatusBadge label={sm.label} variant={sm.variant} />
                        {r.vanessa_priority && (
                          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                            style={{ color: PRIORITY_META[r.vanessa_priority].color, background: `${PRIORITY_META[r.vanessa_priority].color}18`, border: `1px solid ${PRIORITY_META[r.vanessa_priority].color}38` }}>
                            {PRIORITY_META[r.vanessa_priority].label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <VCChip label={`by ${r.agent}`} color="#22d3ee" />
                      <ScorePill label="conf" value={confidenceOf(r)} color="#a78bfa" />
                      <ScorePill label="infl" value={r.influence_score} color="#0081f2" />
                      <ScorePill label="prio" value={r.priority_score} color="#ff8400" />
                      {r.impact && <VCChip label={r.impact} color="#22c55e" />}
                      {r.revenue_impact && <VCChip label={r.revenue_impact} color="#c9a84c" />}
                      <span className="text-[10.5px] ml-auto" style={{ color: "var(--t-dim)" }}>{timeAgo(r.created_at)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </VCPanel>
        </>
      )}

      {/* Detail drawer */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0" style={{ background: "rgba(5,7,11,0.6)" }} onClick={closeDetail} />
          <div
            className="relative h-full w-full max-w-[560px] overflow-y-auto"
            style={{ background: "var(--t-bg)", borderLeft: "1px solid var(--t-border)" }}
          >
            <RecommendationDetail
              trace={trace}
              loading={traceLoading}
              canReview={canReview}
              acting={acting}
              notes={notes}
              setNotes={setNotes}
              notice={notice}
              onAction={act}
              onClose={closeDetail}
            />
          </div>
        </div>
      )}
    </VCPageWrapper>
  );
}

// ── Detail drawer body ─────────────────────────────────────────
function RecommendationDetail({
  trace,
  loading,
  canReview,
  acting,
  notes,
  setNotes,
  notice,
  onAction,
  onClose,
}: {
  trace: RecommendationTrace | null;
  loading: boolean;
  canReview: boolean;
  acting: boolean;
  notes: string;
  setNotes: (v: string) => void;
  notice: string | null;
  onAction: (a: ReviewAction) => void;
  onClose: () => void;
}) {
  if (loading) {
    return <div className="p-6 text-[12px]" style={{ color: "var(--t-muted)" }}>Loading traceability…</div>;
  }
  if (!trace) {
    return (
      <div className="p-6">
        <button onClick={onClose} className="text-[12px] mb-4" style={{ color: "var(--t-muted)" }}>Close</button>
        <VCEmptyState icon={Lightbulb} title="Not found" description="This recommendation could not be loaded." />
      </div>
    );
  }

  const r = trace.recommendation;
  const sm = STATUS_META[r.status];
  const actions = actionsFor(r.status);

  return (
    <div>
      {/* header */}
      <div className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between gap-3" style={{ background: "var(--t-bg)", borderBottom: "1px solid var(--t-border-subtle)" }}>
        <div className="min-w-0">
          <p className="vc-label mb-1">Recommendation · {r.agent}</p>
          <h3 className="text-[16px] font-bold tracking-wide" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color: "var(--t-text)" }}>{r.title}</h3>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0" style={{ color: "var(--t-muted)" }} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <VCStatusBadge label={sm.label} variant={sm.variant} dot />
          <ScorePill label="confidence" value={confidenceOf(r)} color="#a78bfa" />
          <ScorePill label="influence" value={r.influence_score} color="#0081f2" />
          <ScorePill label="priority" value={r.priority_score} color="#ff8400" />
        </div>

        {/* Vanessa executive priority + reason */}
        {r.vanessa_priority && (
          <div className="px-3.5 py-2.5 rounded-xl" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="vc-label" style={{ color: "#a78bfa" }}>Vanessa priority</span>
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                style={{ color: PRIORITY_META[r.vanessa_priority].color, background: `${PRIORITY_META[r.vanessa_priority].color}18`, border: `1px solid ${PRIORITY_META[r.vanessa_priority].color}38` }}>
                {PRIORITY_META[r.vanessa_priority].label}
              </span>
            </div>
            {r.priority_reason && <p className="text-[12px]" style={{ color: "var(--t-text-body)" }}>{r.priority_reason}</p>}
          </div>
        )}

        {r.body && <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>{r.body}</p>}

        {/* Impact */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
            <p className="vc-label mb-1">Business Impact</p>
            <p className="text-[12.5px]" style={{ color: "var(--t-text-body)" }}>{r.impact ?? "—"}</p>
          </div>
          <div className="px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
            <p className="vc-label mb-1">Revenue Impact</p>
            <p className="text-[12.5px]" style={{ color: "#c9a84c" }}>{r.revenue_impact ?? "—"}</p>
          </div>
        </div>

        {/* Source intelligence */}
        <div>
          <p className="vc-label mb-2 flex items-center gap-1.5"><Brain size={12} /> Source Intelligence</p>
          <div className="space-y-1.5">
            {trace.relatedNodes.length === 0 && <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No linked memory nodes.</p>}
            {trace.relatedNodes.map((n) => (
              <div key={n.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: styleFor(n.category).color }} />
                <span className="text-[12px] truncate flex-1" style={{ color: "var(--t-text-body)" }}>{n.label}</span>
                <span className="text-[10px]" style={{ color: "var(--t-dim)" }}>{styleFor(n.category).label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contributing agents + relations */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <p className="vc-label mb-2 flex items-center gap-1.5"><Network size={12} /> Contributing Agents</p>
            <div className="flex flex-wrap gap-1.5">
              {trace.contributingAgents.map((a) => <VCChip key={a} label={a} color="#22d3ee" />)}
            </div>
          </div>
          {(r.related_clients.length > 0 || r.related_campaigns.length > 0 || r.related_conversations.length > 0) && (
            <div>
              <p className="vc-label mb-2 flex items-center gap-1.5"><Users size={12} /> Related</p>
              <div className="flex flex-wrap gap-1.5">
                {r.related_clients.map((c) => <VCChip key={`c-${c}`} label={c} color="#0081f2" />)}
                {r.related_campaigns.map((c) => <VCChip key={`cam-${c}`} label={c} color="#38bdf8" />)}
                {r.related_conversations.map((c) => <VCChip key={`conv-${c}`} label={`conv ${c}`} color="#2dd4bf" />)}
              </div>
            </div>
          )}
          {trace.relatedRecommendations.length > 0 && (
            <div>
              <p className="vc-label mb-2 flex items-center gap-1.5"><Lightbulb size={12} /> Related Recommendations</p>
              <div className="space-y-1">
                {trace.relatedRecommendations.map((rr) => (
                  <div key={rr.id} className="text-[12px] px-3 py-1.5 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)", color: "var(--t-text-body)" }}>
                    {rr.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Review history */}
        <div>
          <p className="vc-label mb-2 flex items-center gap-1.5"><History size={12} /> Review History</p>
          {trace.reviews.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No reviews yet.</p>
          ) : (
            <div className="space-y-1.5">
              {trace.reviews.map((rev) => (
                <div key={rev.id} className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
                      {rev.action.replace(/_/g, " ")} → {STATUS_META[rev.to_status]?.label ?? rev.to_status}
                    </span>
                    <span className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>{timeAgo(rev.created_at)}</span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>{rev.actor}{rev.notes ? ` · ${rev.notes}` : ""}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
          {canReview ? (
            <>
              <p className="vc-label mb-2 mt-3">Human Review</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Review notes (optional)…"
                className="w-full text-[12.5px] rounded-lg px-3 py-2 mb-3 resize-none"
                rows={2}
                style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
              />
              <div className="flex flex-wrap gap-2">
                {actions.map((a) => {
                  const meta = ACTION_META[a];
                  const Icon = ACTION_ICON[a];
                  return (
                    <button
                      key={a}
                      onClick={() => onAction(a)}
                      disabled={acting}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-all disabled:opacity-50"
                      style={{ background: `${meta.tone}16`, border: `1px solid ${meta.tone}3a`, color: meta.tone }}
                    >
                      <Icon size={13} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              {notice && (
                <p className="text-[11.5px] mt-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,132,0,0.08)", border: "1px solid rgba(255,132,0,0.2)", color: "#ff8400" }}>
                  {notice}
                </p>
              )}
            </>
          ) : (
            <p className="text-[11.5px] mt-3 flex items-center gap-1.5" style={{ color: "var(--t-muted)" }}>
              <ShieldCheck size={12} /> View-only. Operator role required to review.
            </p>
          )}
          <p className="text-[10.5px] mt-3" style={{ color: "var(--t-dim)" }}>
            Reviews update Vault Memory only. Nothing is sent, published, launched, edited, or deleted on any client system.
          </p>
        </div>
      </div>
    </div>
  );
}
