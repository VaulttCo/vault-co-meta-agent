"use client";

// Vault Core — Draft Approval Queue (Phase 6). Veronica's drafted lead messages,
// requiring human approval. SAFETY: approving NEVER sends — it only marks the
// draft approved internally. Outbound delivery is intentionally not implemented.

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, X, CheckCircle2, XCircle, Pencil, ShieldCheck, Clock } from "lucide-react";
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
import { DRAFT_STATUS_META, DRAFT_TYPE_LABEL, RISK_META } from "./recommendationStatus";
import type { MessageDraftRow, DraftCounts } from "@/lib/core/types";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Needs Review" },
  { key: "approved", label: "Approved" },
  { key: "edited", label: "Edited" },
  { key: "rejected", label: "Rejected" },
];

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export function DraftApprovalQueue() {
  const { user } = useAuth();
  const canReview = !!user && (user.role === "admin" || user.role === "media_buyer");

  const [drafts, setDrafts] = useState<MessageDraftRow[]>([]);
  const [counts, setCounts] = useState<DraftCounts | null>(null);
  const [filter, setFilter] = useState<string>("draft");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/core/drafts").then((r) => r.json());
      if (res.error) {
        setError("You don't have access to the draft queue.");
        return;
      }
      setError(null);
      setDrafts(res.drafts ?? []);
      setCounts(res.counts ?? null);
    } catch {
      setError("Failed to load drafts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const selected = useMemo(() => drafts.find((d) => d.id === selectedId) ?? null, [drafts, selectedId]);

  const open = useCallback((d: MessageDraftRow) => {
    setSelectedId(d.id);
    setEditBody(d.body);
    setNotes("");
    setNotice(null);
  }, []);

  const act = useCallback(
    async (action: "approve" | "edit" | "reject") => {
      if (!selectedId) return;
      setActing(true);
      setNotice(null);
      try {
        const res = await fetch(`/api/core/drafts/${selectedId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, notes: notes.trim() || undefined, body: action === "edit" ? editBody : undefined }),
        }).then((r) => r.json());
        if (res.error) { setNotice(res.error); return; }
        setNotice(res.mockMode ? "Preview mode — connect the database to persist." : "Saved internally. Nothing was sent.");
        await load();
      } catch {
        setNotice("Action failed. Please try again.");
      } finally {
        setActing(false);
      }
    },
    [selectedId, notes, editBody, load]
  );

  const visible = useMemo(() => (filter === "all" ? drafts : drafts.filter((d) => d.status === filter)), [drafts, filter]);
  const countFor = (k: string) => (k === "all" ? counts?.total ?? drafts.length : (counts as unknown as Record<string, number>)?.[k] ?? 0);

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Veronica · Conversation Intelligence"
        title="Draft Approval Queue"
        description="Veronica drafts lead messages for human approval. Approving marks a draft approved internally — nothing is ever sent automatically."
        badge={<VCStatusBadge label={`${countFor("draft")} to review`} variant="blue" dot />}
      />

      {error ? (
        <VCPanel><VCEmptyState icon={MessageSquare} title="Drafts unavailable" description={error} /></VCPanel>
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
            <VCPanelHeader icon={MessageSquare} label="Queue" title="Drafted Messages" live />
            <div className="px-4 py-3 space-y-2.5">
              {loading && <VCSkeleton rows={4} className="px-1 py-1" />}
              {!loading && visible.length === 0 && <p className="text-[12px] px-1" style={{ color: "var(--t-muted)" }}>Nothing in this view.</p>}
              {visible.map((d) => {
                const sm = DRAFT_STATUS_META[d.status] ?? DRAFT_STATUS_META.draft;
                const risk = RISK_META[d.risk_level] ?? RISK_META.low;
                return (
                  <button key={d.id} onClick={() => open(d)}
                    className="w-full text-left px-4 py-3 rounded-xl transition-all"
                    style={{ background: selectedId === d.id ? "rgba(0,129,242,0.06)" : "var(--t-surface-2)", border: `1px solid ${selectedId === d.id ? "rgba(0,129,242,0.3)" : "var(--t-border-subtle)"}` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{d.lead_name ?? "Lead"}</p>
                        <p className="text-[12px] mt-0.5 leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>{d.body}</p>
                      </div>
                      <VCStatusBadge label={sm.label} variant={sm.variant} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <VCChip label={DRAFT_TYPE_LABEL[d.draft_type] ?? d.draft_type} color="#0081f2" />
                      <VCChip label={risk.label} color={risk.color} />
                      {d.suggested_send_window && <span className="inline-flex items-center gap-1 text-[10.5px]" style={{ color: "var(--t-dim)" }}><Clock size={10} />{d.suggested_send_window}</span>}
                      <span className="text-[10.5px] ml-auto" style={{ color: "var(--t-dim)" }}>{timeAgo(d.created_at)}</span>
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
          <div className="relative h-full w-full max-w-[560px] overflow-y-auto" style={{ background: "var(--t-bg)", borderLeft: "1px solid var(--t-border)" }}>
            <div className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between gap-3" style={{ background: "var(--t-bg)", borderBottom: "1px solid var(--t-border-subtle)" }}>
              <div className="min-w-0">
                <p className="vc-label mb-1">{DRAFT_TYPE_LABEL[selected.draft_type] ?? selected.draft_type} · {selected.agent}</p>
                <h3 className="text-[16px] font-bold tracking-wide" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color: "var(--t-text)" }}>{selected.lead_name ?? "Lead"}</h3>
              </div>
              <button onClick={() => setSelectedId(null)} className="w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0" style={{ color: "var(--t-muted)" }} aria-label="Close"><X size={16} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <VCStatusBadge label={(DRAFT_STATUS_META[selected.status] ?? DRAFT_STATUS_META.draft).label} variant={(DRAFT_STATUS_META[selected.status] ?? DRAFT_STATUS_META.draft).variant} dot />
                <VCChip label={(RISK_META[selected.risk_level] ?? RISK_META.low).label} color={(RISK_META[selected.risk_level] ?? RISK_META.low).color} />
                <VCChip label={`confidence ${Math.round(selected.confidence * 100)}%`} color="#a78bfa" />
              </div>

              {selected.conversation_summary && (
                <div className="px-3.5 py-2.5 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                  <p className="vc-label mb-1">Conversation Summary</p>
                  <p className="text-[12.5px]" style={{ color: "var(--t-text-body)" }}>{selected.conversation_summary}</p>
                </div>
              )}
              {selected.rationale && (
                <div className="px-3.5 py-2.5 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                  <p className="vc-label mb-1">Why this was drafted</p>
                  <p className="text-[12.5px]" style={{ color: "var(--t-text-body)" }}>{selected.rationale}</p>
                </div>
              )}
              {selected.suggested_send_window && (
                <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: "var(--t-muted)" }}><Clock size={12} /> Suggested send window: {selected.suggested_send_window}</p>
              )}

              <div>
                <p className="vc-label mb-1.5">Draft Message</p>
                {canReview ? (
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={5}
                    className="w-full text-[13px] rounded-lg px-3 py-2 resize-none"
                    style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
                ) : (
                  <p className="text-[13px] px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)", color: "var(--t-text-body)" }}>{selected.body}</p>
                )}
              </div>

              <div className="pt-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
                {canReview ? (
                  <>
                    <p className="vc-label mb-2 mt-3">Human Review</p>
                    <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Review notes (optional)…"
                      className="w-full text-[12.5px] rounded-lg px-3 py-2 mb-3"
                      style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => act("approve")} disabled={acting}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold disabled:opacity-50"
                        style={{ background: "rgba(34,197,94,0.16)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e" }}>
                        <CheckCircle2 size={13} /> Approve
                      </button>
                      <button onClick={() => act("edit")} disabled={acting}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold disabled:opacity-50"
                        style={{ background: "rgba(167,139,250,0.16)", border: "1px solid rgba(167,139,250,0.4)", color: "#a78bfa" }}>
                        <Pencil size={13} /> Save Edit
                      </button>
                      <button onClick={() => act("reject")} disabled={acting}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold disabled:opacity-50"
                        style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.34)", color: "#ef4444" }}>
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                    {notice && <p className="text-[11.5px] mt-3 px-3 py-2 rounded-lg" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>{notice}</p>}
                  </>
                ) : (
                  <p className="text-[11.5px] mt-3 flex items-center gap-1.5" style={{ color: "var(--t-muted)" }}><ShieldCheck size={12} /> View-only. Operator role required to review drafts.</p>
                )}
                <p className="text-[10.5px] mt-3" style={{ color: "var(--t-dim)" }}>
                  Approving marks the draft approved internally only. Vault Core never sends SMS, replies to leads, or touches GHL/CRM. A human sends manually.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </VCPageWrapper>
  );
}
