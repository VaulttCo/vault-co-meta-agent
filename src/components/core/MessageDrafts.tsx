"use client";

// Vault Core — Lead Reply + Client Message Drafting, DRAFT MODE (Phase 9.4).
//
// Agents prepare lead replies / client messages; humans review/approve them INSIDE
// Vault Core. Nothing here sends — there is no live send adapter. No "Send"/"Blast"/
// "Push Live"/"Update Contact" controls exist. No raw provider payloads, credentials,
// live IDs, or raw PII are shown.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageSquare, X, Lock, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, RotateCcw, Archive,
  Mail, Smartphone, FileText, StickyNote, Lightbulb, FileWarning, Tag,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  VCPageWrapper, VCPanel, VCPanelHeader, VCStatusBadge, VCChip, VCEmptyState, VCSkeleton, VCButton,
} from "@/components/ui/VaultUI";
import { useAuth } from "@/components/AuthProvider";
import { MESSAGE_TEMPLATES } from "@/lib/core/messages/templates";
import type { VaultMessageDraftDTO, MessageStatus, MessageChannel } from "@/lib/core/messages/types";

const STATUS_META: Record<MessageStatus, { label: string; variant: "success" | "blue" | "orange" | "neutral" | "danger" | "gold" }> = {
  draft: { label: "Draft", variant: "neutral" },
  pending_review: { label: "Pending review", variant: "blue" },
  approved_internal: { label: "Approved (internal)", variant: "success" },
  needs_revision: { label: "Needs revision", variant: "orange" },
  rejected: { label: "Rejected", variant: "danger" },
  archived: { label: "Archived", variant: "neutral" },
  future_adapter_required: { label: "Approved (internal)", variant: "gold" },
};

const CHANNEL_ICON: Record<MessageChannel, typeof Mail> = {
  sms: Smartphone, email: Mail, internal_note: StickyNote, client_update: Mail, lead_reply: Smartphone, report_message: FileText,
};

// approve_internal → future_adapter_required (no separate approved_internal state).
const FILTERS: Array<{ key: MessageStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending_review", label: "Pending" },
  { key: "future_adapter_required", label: "Approved (internal)" },
  { key: "needs_revision", label: "Revision" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
];

function timeAgo(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string") return "Unknown";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Unknown";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function statusMeta(s: MessageStatus) { return STATUS_META[s] ?? STATUS_META.draft; }

export function MessageDrafts() {
  const { user } = useAuth();
  const canReview = !!user && (user.role === "admin" || user.role === "media_buyer");
  const canApprove = !!user && user.role === "admin";

  const [drafts, setDrafts] = useState<VaultMessageDraftDTO[]>([]);
  const [filter, setFilter] = useState<MessageStatus | "all">("pending_review");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/core/message-drafts").catch(() => null);
    if (!res) { setLoading(false); return; }
    if (!res.ok) { if (res.status === 401 || res.status === 403) setForbidden(true); setLoading(false); return; }
    const d = await res.json().catch(() => null);
    setDrafts(Array.isArray(d?.drafts) ? d.drafts : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/core/message-drafts")
      .then((r) => (r.ok ? r.json().catch(() => null) : Promise.reject(r.status)))
      .then((d) => { if (cancelled) return; setDrafts(Array.isArray(d?.drafts) ? d.drafts : []); setLoading(false); })
      .catch((s) => { if (cancelled) return; if (s === 401 || s === 403) setForbidden(true); setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => drafts.filter((d) => filter === "all" || d.status === filter), [drafts, filter]);
  const selected = selectedId ? drafts.find((d) => d.id === selectedId) ?? null : null;
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of drafts) c[d.status] = (c[d.status] ?? 0) + 1;
    return c;
  }, [drafts]);

  const createFromTemplate = useCallback(async (templateKey: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch("/api/core/message-drafts", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template_key: templateKey }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not create draft"); return; }
      setNotice("Draft created — review it in the queue.");
      await load();
    } finally { setActing(false); }
  }, [load]);

  const review = useCallback(async (id: string, action: string, notes?: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/message-drafts/${id}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, notes }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Review failed"); return; }
      await load();
    } finally { setActing(false); }
  }, [load]);

  if (forbidden) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vault Core" title="Message Drafts" />
        <VCPanel><VCEmptyState icon={Lock} title="Access restricted" description="You don't have access to the message drafting console." /></VCPanel>
      </VCPageWrapper>
    );
  }

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Lead Reply + Client Messaging"
        title="Message Drafts"
        description="Agents draft lead replies and client messages · you review and approve them internally. Nothing is sent — this phase is draft-only."
        badge={<VCStatusBadge label="Draft mode" variant="gold" dot />}
      />

      {/* Future send adapter disabled notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.28)" }}>
        <ShieldAlert size={16} style={{ color: "#c9a84c", marginTop: 1 }} />
        <div>
          <p className="text-[12.5px] font-semibold" style={{ color: "#e8c97a" }}>Message sending is disabled (future adapter required)</p>
          <p className="text-[11.5px] mt-0.5" style={{ color: "var(--t-text-body)" }}>
            These are internal review artifacts only. No SMS or email is sent, no GHL contact or opportunity is updated, and no workflow is triggered. Sending requires a separate, explicitly-approved future adapter phase.
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        <MiniStat label="Pending review" value={counts.pending_review ?? 0} color="#0081f2" />
        <MiniStat label="Approved (internal)" value={counts.future_adapter_required ?? 0} color="#22c55e" />
        <MiniStat label="Needs revision" value={counts.needs_revision ?? 0} color="#f59e0b" />
        <MiniStat label="Rejected" value={counts.rejected ?? 0} color="#ef4444" />
        <MiniStat label="Archived" value={counts.archived ?? 0} color="#6b7a99" />
        <MiniStat label="Templates" value={MESSAGE_TEMPLATES.length} color="#a78bfa" />
      </div>

      {/* Template library */}
      <VCPanel>
        <VCPanelHeader icon={Lightbulb} label="Starter messages" title="Template Library" />
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {MESSAGE_TEMPLATES.map((t) => {
            const Icon = CHANNEL_ICON[t.channel] ?? MessageSquare;
            return (
              <div key={t.key} className="flex flex-col gap-2 px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Icon size={13} style={{ color: "#22d3ee" }} /> {t.title}</p>
                  <VCChip label={t.channel.replace(/_/g, " ")} color="#6b7a99" />
                </div>
                <p className="text-[11.5px] leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>{t.body}</p>
                <div className="flex items-center justify-between mt-1">
                  <VCChip label={t.audience} color="#a78bfa" />
                  <VCButton onClick={() => createFromTemplate(t.key)} disabled={acting}>Create Draft</VCButton>
                </div>
              </div>
            );
          })}
        </div>
      </VCPanel>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={active
                ? { background: "rgba(0,129,242,0.14)", border: "1px solid rgba(0,129,242,0.3)", color: "#f8f8f7" }
                : { background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)", color: "var(--t-muted)" }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Draft queue */}
      <VCPanel>
        <VCPanelHeader icon={MessageSquare} label="Draft queue" title="Message Drafts" live />
        <div className="px-4 py-3 space-y-2.5">
          {loading && <VCSkeleton rows={3} />}
          {!loading && visible.length === 0 && (
            <VCEmptyState icon={Lightbulb} title="No message drafts in this view" description="Create one from a template above, or from an approved message action in /actions, or from a GHL workflow draft step. Drafts are internal review artifacts — nothing is sent." />
          )}
          {visible.map((d) => {
            const Icon = CHANNEL_ICON[d.channel] ?? MessageSquare;
            return (
              <button key={d.id} onClick={() => { setSelectedId(d.id); setNotice(null); }}
                className="w-full text-left px-4 py-3 rounded-xl transition-all"
                style={{ background: selectedId === d.id ? "rgba(0,129,242,0.06)" : "var(--t-surface-2)", border: `1px solid ${selectedId === d.id ? "rgba(0,129,242,0.3)" : "var(--t-border-subtle)"}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Icon size={13} style={{ color: "#22d3ee" }} /> {d.title}</p>
                    <p className="text-[12px] mt-0.5 leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>{d.safe_preview?.summary}</p>
                  </div>
                  <VCStatusBadge label={statusMeta(d.status).label} variant={statusMeta(d.status).variant} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <VCChip label={d.message_type.replace(/_/g, " ")} color="#a78bfa" />
                  <VCChip label={d.audience} color="#0081f2" />
                  {d.source_agent && <VCChip label={d.source_agent} color="#22d3ee" />}
                  {d.client_id && <VCChip label={d.client_id} color="#0081f2" />}
                  {d.missing_inputs_count > 0 && <VCChip label={`${d.missing_inputs_count} missing`} color="#f59e0b" />}
                  {d.compliance_notes_count > 0 && <VCChip label={`${d.compliance_notes_count} compliance`} color="#c9a84c" />}
                  <VCChip label="send disabled" color="#c9a84c" />
                  <span className="text-[10.5px] ml-auto" style={{ color: "var(--t-dim)" }}>{timeAgo(d.created_at)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </VCPanel>

      {selected && (
        <MessageDetail
          key={`${selected.id}:${selected.updated_at}`}
          draft={selected} canReview={canReview} canApprove={canApprove} acting={acting} notice={notice}
          onReview={(act, notes) => review(selected.id, act, notes)}
          onClose={() => { setSelectedId(null); setNotice(null); }}
        />
      )}
    </VCPageWrapper>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="px-3 py-2.5 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
      <div className="text-[20px] font-bold leading-none" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color: value > 0 ? color : "var(--t-dim)" }}>{value}</div>
      <div className="text-[10px] mt-1" style={{ color: "var(--t-dim)" }}>{label}</div>
    </div>
  );
}

function MessageDetail({ draft: d, canReview, canApprove, acting, notice, onReview, onClose }: {
  draft: VaultMessageDraftDTO; canReview: boolean; canApprove: boolean; acting: boolean; notice: string | null;
  onReview: (action: string, notes?: string) => void; onClose: () => void;
}) {
  const [reviewMode, setReviewMode] = useState<null | "reject" | "request_revision">(null);
  const [reason, setReason] = useState("");
  const reviewable = !["rejected", "archived"].includes(d.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: "rgba(5,7,11,0.6)" }} onClick={onClose} />
      <div className="relative h-full w-full max-w-[580px] overflow-y-auto" style={{ background: "var(--t-bg)", borderLeft: "1px solid var(--t-border)" }}>
        <div className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between gap-3" style={{ background: "var(--t-bg)", borderBottom: "1px solid var(--t-border-subtle)" }}>
          <div className="min-w-0">
            <p className="vc-label mb-1 flex items-center gap-1.5"><MessageSquare size={12} /> {d.channel.replace(/_/g, " ")} · {d.message_type.replace(/_/g, " ")}{d.source_agent ? ` · ${d.source_agent}` : ""}</p>
            <h3 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color: "var(--t-text)" }}>{d.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ color: "var(--t-muted)" }}><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <VCStatusBadge label={statusMeta(d.status).label} variant={statusMeta(d.status).variant} dot />
            <VCChip label={`audience: ${d.audience}`} color="#0081f2" />
            <VCChip label="send adapter disabled" color="#c9a84c" />
            {d.client_id && <VCChip label={`client: ${d.client_id}`} color="#0081f2" />}
          </div>

          {/* Future send disabled */}
          <div className="px-3.5 py-3 rounded-xl flex items-center gap-2" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.28)" }}>
            <ShieldAlert size={14} style={{ color: "#c9a84c" }} />
            <span className="text-[12px] font-semibold" style={{ color: "#e8c97a" }}>Draft-only · sending requires a future approved adapter</span>
          </div>

          {/* Subject + body */}
          {d.subject && (
            <div><p className="vc-label mb-1">Subject</p><p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{d.subject}</p></div>
          )}
          <div className="px-3.5 py-3 rounded-xl" style={{ background: "rgba(0,129,242,0.05)", border: "1px solid rgba(0,129,242,0.18)" }}>
            <p className="vc-label mb-1" style={{ color: "#4da6ff" }}>Draft body</p>
            <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--t-text-body)" }}>{d.body}</p>
          </div>

          {/* Personalization tokens */}
          {d.personalization_tokens.length > 0 && (
            <div><p className="vc-label mb-1 flex items-center gap-1.5"><Tag size={12} /> Personalization tokens</p><div className="flex flex-wrap gap-1.5">{d.personalization_tokens.map((t, i) => <VCChip key={i} label={t} color="#22d3ee" />)}</div></div>
          )}

          {/* Intent */}
          {d.intent && (<div><p className="vc-label mb-1">Intent</p><p className="text-[12.5px]" style={{ color: "var(--t-text-body)" }}>{d.intent}</p></div>)}

          {/* Compliance notes */}
          {d.compliance_notes.length > 0 && (
            <div className="px-3.5 py-3 rounded-xl" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.25)" }}>
              <p className="vc-label mb-1 flex items-center gap-1.5" style={{ color: "#c9a84c" }}><ShieldCheck size={12} /> Compliance notes ({d.compliance_notes.length})</p>
              <ul className="space-y-1 text-[12px]" style={{ color: "var(--t-text-body)" }}>{d.compliance_notes.map((c, i) => <li key={i}>· {c}</li>)}</ul>
            </div>
          )}

          {/* Missing inputs */}
          {d.missing_inputs.length > 0 && (
            <div className="px-3.5 py-3 rounded-xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <p className="vc-label mb-1 flex items-center gap-1.5" style={{ color: "#f59e0b" }}><FileWarning size={12} /> Missing inputs ({d.missing_inputs.length})</p>
              <ul className="space-y-1 text-[12px]" style={{ color: "var(--t-text-body)" }}>{d.missing_inputs.map((m, i) => <li key={i}>· {m}</li>)}</ul>
            </div>
          )}

          {/* Evidence */}
          {d.evidence.items.length > 0 && (
            <div><p className="vc-label mb-1">Evidence</p><ul className="space-y-1 text-[12px]" style={{ color: "var(--t-text-body)" }}>{d.evidence.items.map((e, i) => <li key={i}>· {e}</li>)}</ul></div>
          )}

          {/* Source links */}
          {(d.source_action_id || d.source_workflow_draft_id) && (
            <p className="text-[11.5px]" style={{ color: "var(--t-muted)" }}>
              {d.source_action_id && <>Linked to action <span style={{ color: "#22d3ee" }}>{d.source_action_id.slice(0, 8)}…</span> </>}
              {d.source_workflow_draft_id && <>· From workflow draft <span style={{ color: "#22d3ee" }}>{d.source_workflow_draft_id.slice(0, 8)}…</span></>}
            </p>
          )}

          {/* Review trail */}
          {d.audit_log?.length > 0 && (
            <div>
              <p className="vc-label mb-2">Review trail</p>
              <div className="space-y-1.5">
                {d.audit_log.slice().reverse().map((e, i) => {
                  const transition = e.previous_status && e.next_status && e.previous_status !== e.next_status
                    ? `${String(e.previous_status).replace(/_/g, " ")} → ${String(e.next_status).replace(/_/g, " ")}` : null;
                  return (
                    <div key={i} className="px-3 py-1.5 rounded-lg text-[11.5px]" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                      <span className="font-semibold" style={{ color: "var(--t-text)" }}>{String(e.event).replace(/_/g, " ")}</span>
                      <span style={{ color: "var(--t-dim)" }}> · {e.actor} · {timeAgo(e.at)}</span>
                      {transition && <span style={{ color: "#4da6ff" }}> · {transition}</span>}
                      {(e.note ?? e.message) && <span style={{ color: "var(--t-muted)" }}> — {e.note ?? e.message}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Review controls */}
          {canReview && reviewable && (
            <div className="pt-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
              {reviewMode ? (
                <div className="mt-3 space-y-2.5 px-3 py-3 rounded-xl" style={{ background: reviewMode === "reject" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${reviewMode === "reject" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}` }}>
                  <p className="text-[12px] font-semibold" style={{ color: reviewMode === "reject" ? "#ef4444" : "#f59e0b" }}>
                    {reviewMode === "reject" ? "Reject draft" : "Request a revision"} — a reason is required
                  </p>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    placeholder={reviewMode === "reject" ? "Why is this draft being rejected?" : "What should change before this draft can be approved?"}
                    className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none resize-none" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
                  <div className="flex gap-2">
                    <VCButton onClick={() => { onReview(reviewMode, reason); setReviewMode(null); setReason(""); }} disabled={acting || !reason.trim()}>Confirm</VCButton>
                    <button onClick={() => { setReviewMode(null); setReason(""); }} disabled={acting} className="px-3 py-2 rounded-lg text-[12.5px] font-semibold disabled:opacity-50" style={{ color: "var(--t-muted)" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-3">
                  {canApprove && d.status !== "future_adapter_required" && (
                    <ActBtn icon={CheckCircle2} label="Approve Internally" tone="#22c55e" disabled={acting} onClick={() => onReview("approve_internal")} />
                  )}
                  <ActBtn icon={RotateCcw} label="Request Revision" tone="#f59e0b" disabled={acting} onClick={() => setReviewMode("request_revision")} />
                  <ActBtn icon={XCircle} label="Reject" tone="#ef4444" disabled={acting} onClick={() => setReviewMode("reject")} />
                  <ActBtn icon={Archive} label="Archive" tone="#6b7a99" disabled={acting} onClick={() => onReview("archive")} />
                </div>
              )}
              {!canApprove && (
                <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: "var(--t-muted)" }}><Lock size={12} /> Admin role required to approve internally.</p>
              )}
            </div>
          )}

          {notice && <p className="text-[11.5px] mt-1 px-3 py-2 rounded-lg" style={{ background: "rgba(255,132,0,0.08)", border: "1px solid rgba(255,132,0,0.2)", color: "#ff8400" }}>{notice}</p>}

          <p className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>
            Approving internally does NOT send the message. It records that the draft is approved inside Vault Core; a future approved send adapter would be required to deliver it. Nothing is sent, and no GHL contact/workflow is touched.
          </p>
        </div>
      </div>
    </div>
  );
}

function ActBtn({ icon: Icon, label, tone, disabled, onClick }: { icon: typeof CheckCircle2; label: string; tone: string; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-all disabled:opacity-50"
      style={{ background: `${tone}16`, border: `1px solid ${tone}3a`, color: tone }}>
      <Icon size={13} /> {label}
    </button>
  );
}
