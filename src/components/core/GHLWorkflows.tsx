"use client";

// Vault Core — GHL Workflow Builder, DRAFT MODE (Phase 9.3).
//
// Agents design GHL follow-up workflow DRAFTS; humans review/approve them INSIDE
// Vault Core. Nothing here publishes to GHL — there is no live GHL adapter. No
// "Publish", "Send", "Activate", or "Update Contact" controls exist. No raw GHL
// payloads, credentials, or live IDs are shown.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Workflow, X, Lock, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, RotateCcw, Archive,
  Clock, GitBranch, StickyNote, MessageSquare, Mail, UserPlus, Tag, ListTodo, Move, Webhook, Square, Lightbulb, FileWarning,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  VCPageWrapper, VCPanel, VCPanelHeader, VCStatusBadge, VCChip, VCEmptyState, VCSkeleton, VCButton,
} from "@/components/ui/VaultUI";
import { useAuth } from "@/components/AuthProvider";
import { WORKFLOW_TEMPLATES } from "@/lib/core/workflows/templates";
import type { GHLWorkflowDraftDTO, WorkflowStatus, StepType } from "@/lib/core/workflows/types";

const STATUS_META: Record<WorkflowStatus, { label: string; variant: "success" | "blue" | "orange" | "neutral" | "danger" | "gold" }> = {
  draft: { label: "Draft", variant: "neutral" },
  pending_review: { label: "Pending review", variant: "blue" },
  approved_internal: { label: "Approved (internal)", variant: "success" },
  needs_revision: { label: "Needs revision", variant: "orange" },
  rejected: { label: "Rejected", variant: "danger" },
  archived: { label: "Archived", variant: "neutral" },
  future_adapter_required: { label: "Future adapter required", variant: "gold" },
};

const STEP_ICON: Record<StepType, typeof Clock> = {
  wait: Clock, condition: GitBranch, internal_note: StickyNote, draft_sms: MessageSquare, draft_email: Mail,
  assign_user: UserPlus, add_tag: Tag, remove_tag: Tag, create_task: ListTodo, move_pipeline_stage: Move,
  webhook_placeholder: Webhook, stop_sequence: Square,
};

// NOTE: approving internally maps a draft to `future_adapter_required` (the approved
// outcome — honest that publishing needs a future GHL adapter), so there is no
// separate `approved_internal` filter/stat.
const FILTERS: Array<{ key: WorkflowStatus | "all"; label: string }> = [
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

function statusMeta(s: WorkflowStatus) { return STATUS_META[s] ?? STATUS_META.draft; }

export function GHLWorkflows() {
  const { user } = useAuth();
  const canReview = !!user && (user.role === "admin" || user.role === "media_buyer");
  const canApprove = !!user && user.role === "admin";

  const [drafts, setDrafts] = useState<GHLWorkflowDraftDTO[]>([]);
  const [filter, setFilter] = useState<WorkflowStatus | "all">("pending_review");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/core/ghl-workflow-drafts").catch(() => null);
    if (!res) { setLoading(false); return; }
    if (!res.ok) { if (res.status === 401 || res.status === 403) setForbidden(true); setLoading(false); return; }
    const d = await res.json().catch(() => null);
    setDrafts(Array.isArray(d?.drafts) ? d.drafts : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/core/ghl-workflow-drafts")
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
      const res = await fetch("/api/core/ghl-workflow-drafts", {
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
      const res = await fetch(`/api/core/ghl-workflow-drafts/${id}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, notes }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Review failed"); return; }
      await load();
    } finally { setActing(false); }
  }, [load]);

  // Seed a message DRAFT from a draft_sms/draft_email workflow step. Draft-only — it
  // links source_workflow_draft_id and never sends or triggers the workflow.
  const createMessageDraftFromStep = useCallback(async (workflowDraftId: string, stepId: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/message-drafts/from-workflow-draft`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflow_draft_id: workflowDraftId, step_id: stepId }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not create message draft"); return; }
      setNotice(d.existing
        ? "A message draft already exists for this step — open Message Drafts to review it."
        : "Message draft created (draft-only) — open Message Drafts to review it.");
    } finally { setActing(false); }
  }, []);

  if (forbidden) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vault Core" title="GHL Workflow Drafts" />
        <VCPanel><VCEmptyState icon={Lock} title="Access restricted" description="You don't have access to the workflow builder." /></VCPanel>
      </VCPageWrapper>
    );
  }

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Vault Co Internal GHL Workflows"
        title="Workflow Drafts"
        description="Drafts for Vault Co's OWN internal GHL sub-account — follow-up with Vault Co prospects, sales, onboarding, and client success. They do not publish to GHL; they help Vault Co improve its own follow-up. Draft-only."
        badge={<VCStatusBadge label="Draft mode" variant="gold" dot />}
      />

      {/* Future adapter disabled notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.28)" }}>
        <ShieldAlert size={16} style={{ color: "#c9a84c", marginTop: 1 }} />
        <div>
          <p className="text-[12.5px] font-semibold" style={{ color: "#e8c97a" }}>GHL workflow publishing is disabled (future adapter required)</p>
          <p className="text-[11.5px] mt-0.5" style={{ color: "var(--t-text-body)" }}>
            These are internal drafts for Vault Co&apos;s own GHL sub-account only. No GHL workflow is created, no contact or opportunity is updated, and no SMS/email is sent. Publishing requires a separate, explicitly-approved future adapter phase.
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
        <MiniStat label="Templates" value={WORKFLOW_TEMPLATES.length} color="#a78bfa" />
      </div>

      {/* Template library */}
      <VCPanel>
        <VCPanelHeader icon={Lightbulb} label="Starter workflows" title="Template Library" />
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {WORKFLOW_TEMPLATES.map((t) => (
            <div key={t.key} className="flex flex-col gap-2 px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{t.title}</p>
                <VCChip label={`${t.steps.length} steps`} color="#6b7a99" />
              </div>
              <p className="text-[11.5px] leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>{t.description}</p>
              <div className="flex items-center justify-between mt-1">
                <VCChip label={t.workflow_type.replace(/_/g, " ")} color="#a78bfa" />
                <VCButton onClick={() => createFromTemplate(t.key)} disabled={acting}>Create Draft</VCButton>
              </div>
            </div>
          ))}
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
        <VCPanelHeader icon={Workflow} label="Draft queue" title="Workflow Drafts" live />
        <div className="px-4 py-3 space-y-2.5">
          {loading && <VCSkeleton rows={3} />}
          {!loading && visible.length === 0 && (
            <VCEmptyState icon={Lightbulb} title="No workflow drafts in this view" description="Create one from a template above (Vault Co internal prospect/sales/onboarding/client-success follow-up), or from an approved GHL workflow action in /actions. Drafts are internal review artifacts for Vault Co's own GHL sub-account — nothing is published to GHL." />
          )}
          {visible.map((d) => (
            <button key={d.id} onClick={() => { setSelectedId(d.id); setNotice(null); }}
              className="w-full text-left px-4 py-3 rounded-xl transition-all"
              style={{ background: selectedId === d.id ? "rgba(0,129,242,0.06)" : "var(--t-surface-2)", border: `1px solid ${selectedId === d.id ? "rgba(0,129,242,0.3)" : "var(--t-border-subtle)"}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold" style={{ color: "var(--t-text)" }}>{d.title}</p>
                  <p className="text-[12px] mt-0.5 leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>{d.safe_preview?.summary}</p>
                </div>
                <VCStatusBadge label={statusMeta(d.status).label} variant={statusMeta(d.status).variant} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <VCChip label={d.workflow_type.replace(/_/g, " ")} color="#a78bfa" />
                {d.source_agent && <VCChip label={d.source_agent} color="#22d3ee" />}
                {d.client_id && <VCChip label={d.client_id} color="#0081f2" />}
                <VCChip label={`${d.step_count} steps`} color="#6b7a99" />
                {d.missing_inputs_count > 0 && <VCChip label={`${d.missing_inputs_count} missing`} color="#f59e0b" />}
                <VCChip label="GHL adapter disabled" color="#c9a84c" />
                <span className="text-[10.5px] ml-auto" style={{ color: "var(--t-dim)" }}>{timeAgo(d.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      </VCPanel>

      {selected && (
        <WorkflowDetail
          key={`${selected.id}:${selected.updated_at}`}
          draft={selected} canReview={canReview} canApprove={canApprove} acting={acting} notice={notice}
          onReview={(act, notes) => review(selected.id, act, notes)}
          onCreateMessageDraft={(stepId) => createMessageDraftFromStep(selected.id, stepId)}
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

function WorkflowDetail({ draft: d, canReview, canApprove, acting, notice, onReview, onCreateMessageDraft, onClose }: {
  draft: GHLWorkflowDraftDTO; canReview: boolean; canApprove: boolean; acting: boolean; notice: string | null;
  onReview: (action: string, notes?: string) => void; onCreateMessageDraft: (stepId: string) => void; onClose: () => void;
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
            <p className="vc-label mb-1 flex items-center gap-1.5"><Workflow size={12} /> {d.workflow_type.replace(/_/g, " ")}{d.source_agent ? ` · ${d.source_agent}` : ""}</p>
            <h3 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color: "var(--t-text)" }}>{d.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ color: "var(--t-muted)" }}><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <VCStatusBadge label={statusMeta(d.status).label} variant={statusMeta(d.status).variant} dot />
            <VCChip label="→ ghl (adapter disabled)" color="#c9a84c" />
            {d.client_id && <VCChip label={`client: ${d.client_id}`} color="#0081f2" />}
          </div>

          {/* Future adapter disabled */}
          <div className="px-3.5 py-3 rounded-xl flex items-center gap-2" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.28)" }}>
            <ShieldAlert size={14} style={{ color: "#c9a84c" }} />
            <span className="text-[12px] font-semibold" style={{ color: "#e8c97a" }}>Draft-only · publishing requires a future approved GHL adapter</span>
          </div>

          {/* Safe preview */}
          <div className="px-3.5 py-3 rounded-xl" style={{ background: "rgba(0,129,242,0.05)", border: "1px solid rgba(0,129,242,0.18)" }}>
            <p className="vc-label mb-1" style={{ color: "#4da6ff" }}>Safe preview</p>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>{d.safe_preview?.summary}</p>
          </div>

          {/* Trigger */}
          <div>
            <p className="vc-label mb-1">Trigger</p>
            <p className="text-[12.5px]" style={{ color: "var(--t-text-body)" }}><strong>{d.trigger?.type?.replace(/_/g, " ")}</strong> — {d.trigger?.description}</p>
          </div>

          {/* Steps timeline */}
          {d.steps.length > 0 && (
            <div>
              <p className="vc-label mb-2">Draft steps ({d.steps.length})</p>
              <div className="space-y-1.5">
                {d.steps.map((s, i) => {
                  const Icon = STEP_ICON[s.type] ?? StickyNote;
                  return (
                    <div key={s.id || i} className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                      <div className="flex items-center gap-2">
                        <Icon size={13} style={{ color: "#22d3ee" }} />
                        <span className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>{i + 1}. {s.label}</span>
                        <VCChip label="draft-only" color="#6b7a99" />
                      </div>
                      <p className="text-[11.5px] mt-1" style={{ color: "var(--t-text-body)" }}>{s.description}</p>
                      {s.draft_text && <p className="text-[11.5px] mt-1 px-2.5 py-1.5 rounded-md italic" style={{ background: "var(--t-bg)", color: "var(--t-muted)" }}>“{s.draft_text}”</p>}
                      {s.wait_duration && <p className="text-[10.5px] mt-1" style={{ color: "var(--t-dim)" }}>Wait: {s.wait_duration}</p>}
                      {s.condition && <p className="text-[10.5px] mt-1" style={{ color: "var(--t-dim)" }}>Condition: {s.condition}</p>}
                      {(s.type === "draft_sms" || s.type === "draft_email") && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button onClick={() => onCreateMessageDraft(s.id)} disabled={acting}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-50"
                            style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.34)", color: "#c9a84c" }}>
                            <MessageSquare size={12} /> Create message draft from step
                          </button>
                          <a href="/message-drafts" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.3)", color: "#4da6ff" }}>
                            <MessageSquare size={12} /> View linked message drafts
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Guardrails */}
          <div className="px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
            <p className="vc-label mb-1 flex items-center gap-1.5"><ShieldCheck size={12} style={{ color: "#22c55e" }} /> Guardrails</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(d.guardrails ?? {}).map(([k, v]) => (
                <VCChip key={k} label={`${k.replace(/_/g, " ")}: ${String(v)}`} color="#22c55e" />
              ))}
            </div>
          </div>

          {/* Required assets + missing inputs */}
          {d.required_assets.length > 0 && (
            <div><p className="vc-label mb-1">Required assets</p><div className="flex flex-wrap gap-1.5">{d.required_assets.map((a, i) => <VCChip key={i} label={a} color="#0081f2" />)}</div></div>
          )}
          {d.missing_inputs.length > 0 && (
            <div className="px-3.5 py-3 rounded-xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <p className="vc-label mb-1 flex items-center gap-1.5" style={{ color: "#f59e0b" }}><FileWarning size={12} /> Missing inputs ({d.missing_inputs.length})</p>
              <ul className="space-y-1 text-[12px]" style={{ color: "var(--t-text-body)" }}>{d.missing_inputs.map((m, i) => <li key={i}>· {m}</li>)}</ul>
            </div>
          )}

          {/* Source action */}
          {d.source_action_id && (
            <p className="text-[11.5px]" style={{ color: "var(--t-muted)" }}>Linked to action <span style={{ color: "#22d3ee" }}>{d.source_action_id.slice(0, 8)}…</span></p>
          )}

          {/* Human notes */}
          {d.human_review_notes && (
            <div><p className="vc-label mb-1 flex items-center gap-1.5"><StickyNote size={12} /> Reviewer notes</p><p className="text-[12px]" style={{ color: "var(--t-text-body)" }}>{d.human_review_notes}</p></div>
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
                  {canApprove && d.status !== "approved_internal" && d.status !== "future_adapter_required" && (
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
            Approving internally does NOT publish to GHL. It records that the draft is approved inside Vault Core; a future approved GHL adapter would be required to build it. Nothing is sent, created, or mutated in GHL.
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
