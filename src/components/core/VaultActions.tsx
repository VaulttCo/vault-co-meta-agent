"use client";

// Vault Core — Approved Execution Engine console (Phase 9.0).
//
// Agents PREPARE actions → Vera/Vesper quality-check → humans approve → approved
// INTERNAL actions can execute via the internal adapter. EXTERNAL targets show
// "adapter disabled" and never execute. Nothing here sends/launches/charges/mutates
// any external system. Review actions only change internal status + audit log.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Play, CheckCircle2, XCircle, Archive, RotateCcw, ShieldCheck, ShieldAlert,
  Lock, X, Gauge, History, Bot, Lightbulb,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  VCPageWrapper, VCPanel, VCPanelHeader, VCStatusBadge, VCChip, VCEmptyState, VCSkeleton, VCButton,
} from "@/components/ui/VaultUI";
import { useAuth } from "@/components/AuthProvider";
import { can } from "@/lib/auth/permissions";
import type { VaultActionDTO, ActionCounts, ApprovalStatus, RiskLevel } from "@/lib/core/actions/types";

// Exact phrase an operator must type to confirm an L4 admin-critical execution.
const L4_CONFIRM_PHRASE = "EXECUTE L4";

const RISK_META: Record<RiskLevel, { label: string; color: string }> = {
  level_0_internal_note: { label: "L0 · internal note", color: "#22c55e" },
  level_1_internal_action: { label: "L1 · internal", color: "#0081f2" },
  level_2_client_facing_message: { label: "L2 · client-facing", color: "#ff8400" },
  level_3_money_ads_workflow: { label: "L3 · money/ads", color: "#ef4444" },
  level_4_admin_critical: { label: "L4 · admin-critical", color: "#b91c1c" },
};

const APPROVAL_META: Record<ApprovalStatus, { label: string; variant: "success" | "blue" | "orange" | "neutral" | "danger" }> = {
  pending_review: { label: "Pending review", variant: "blue" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  needs_revision: { label: "Needs revision", variant: "orange" },
  archived: { label: "Archived", variant: "neutral" },
};

const FILTERS: Array<{ key: ApprovalStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending_review", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "needs_revision", label: "Revision" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
];

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function VaultActions() {
  const { user } = useAuth();
  const canReview = !!user && (user.role === "admin" || user.role === "media_buyer");
  const canApprove = !!user && can(user.role, "canApproveVaultActions");
  const canExecute = !!user && can(user.role, "canExecuteVaultActions");

  const [actions, setActions] = useState<VaultActionDTO[]>([]);
  const [counts, setCounts] = useState<ActionCounts | null>(null);
  const [filter, setFilter] = useState<ApprovalStatus | "all">("pending_review");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/core/actions");
      if (!res.ok) { if (res.status === 403 || res.status === 401) setForbidden(true); return; }
      const d = await res.json();
      setActions(d.actions ?? []);
      setCounts(d.counts ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => actions.filter((a) => filter === "all" || a.approval_status === filter),
    [actions, filter]
  );
  const selected = selectedId ? actions.find((a) => a.id === selectedId) ?? null : null;

  const review = useCallback(async (id: string, action: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/actions/${id}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Review failed"); return; }
      await load();
    } finally { setActing(false); }
  }, [load]);

  const execute = useCallback(async (id: string, confirm: boolean) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/actions/${id}/execute`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }),
      });
      const d = await res.json();
      // Surface auth/conflict errors (401/403/404/409) honestly rather than collapsing
      // them to "Not executed." — those responses carry `error` and/or `reason`.
      if (!res.ok) { setNotice(d.error ?? d.reason ?? "Execution failed"); await load(); return; }
      setNotice(d.reason ?? (d.executed ? "Executed." : "Not executed."));
      await load();
    } finally { setActing(false); }
  }, [load]);

  if (forbidden) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vault Core" title="Actions" />
        <VCPanel><VCEmptyState icon={Lock} title="Access restricted" description="You don't have access to the execution engine." /></VCPanel>
      </VCPageWrapper>
    );
  }

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Approved Execution Engine"
        title="Actions"
        description="Agents prepare work · Vera/Vesper quality-check · you approve · approved internal actions execute via the internal adapter. External execution is adapter-gated and disabled in this phase."
        badge={<VCStatusBadge label={`${counts?.pending_review ?? 0} pending`} variant="blue" dot />}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        <MiniStat label="Pending" value={counts?.pending_review ?? 0} color="#0081f2" />
        <MiniStat label="Approved" value={counts?.approved ?? 0} color="#22c55e" />
        <MiniStat label="Executed" value={counts?.executed ?? 0} color="#a78bfa" />
        <MiniStat label="Adapter disabled" value={counts?.adapter_disabled ?? 0} color="#6b7a99" />
        <MiniStat label="High-risk pending" value={counts?.high_risk_pending ?? 0} color="#ef4444" />
        <MiniStat label="Failed" value={counts?.failed ?? 0} color="#f59e0b" />
      </div>

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

      <VCPanel>
        <VCPanelHeader icon={Play} label="Execution queue" title="Prepared Actions" live />
        <div className="px-4 py-3 space-y-2.5">
          {loading && <VCSkeleton rows={4} />}
          {!loading && visible.length === 0 && (
            <VCEmptyState icon={Lightbulb} title="No actions in this view" description="When agents prepare work it appears here for your review. Approved internal actions can then be executed; external actions remain adapter-disabled until a future approved phase." />
          )}
          {visible.map((a) => (
            <button key={a.id} onClick={() => { setSelectedId(a.id); setNotice(null); }}
              className="w-full text-left px-4 py-3 rounded-xl transition-all"
              style={{ background: selectedId === a.id ? "rgba(0,129,242,0.06)" : "var(--t-surface-2)", border: `1px solid ${selectedId === a.id ? "rgba(0,129,242,0.3)" : "var(--t-border-subtle)"}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold" style={{ color: "var(--t-text)" }}>{a.title}</p>
                  <p className="text-[12px] mt-0.5 leading-snug line-clamp-2" style={{ color: "var(--t-text-body)" }}>{a.safe_preview}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <VCStatusBadge label={APPROVAL_META[a.approval_status].label} variant={APPROVAL_META[a.approval_status].variant} />
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ color: RISK_META[a.risk_level].color, background: `${RISK_META[a.risk_level].color}18`, border: `1px solid ${RISK_META[a.risk_level].color}38` }}>
                    {RISK_META[a.risk_level].label}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <VCChip label={a.agent_id} color="#22d3ee" />
                <VCChip label={a.action_type.replace(/_/g, " ")} color="#a78bfa" />
                <VCChip label={`→ ${a.target_system}`} color={a.adapter_enabled ? "#22c55e" : "#6b7a99"} />
                {!a.adapter_enabled && <VCChip label="adapter disabled" color="#6b7a99" />}
                {a.execution_status === "executed" && <VCChip label="executed" color="#22c55e" />}
                <span className="text-[10.5px] ml-auto" style={{ color: "var(--t-dim)" }}>{timeAgo(a.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      </VCPanel>

      {selected && (
        <ActionDetail
          action={selected} canReview={canReview} canApprove={canApprove} canExecute={canExecute} acting={acting} notice={notice}
          onReview={(act) => review(selected.id, act)} onExecute={(confirm) => execute(selected.id, confirm)}
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

function ActionDetail({ action: a, canReview, canApprove, canExecute, acting, notice, onReview, onExecute, onClose }: {
  action: VaultActionDTO; canReview: boolean; canApprove: boolean; canExecute: boolean; acting: boolean; notice: string | null;
  onReview: (a: string) => void; onExecute: (confirm: boolean) => void; onClose: () => void;
}) {
  const qg = (a.metadata as { quality_gate?: { qualityScore?: number; safety_status?: string } } | undefined)?.quality_gate;
  const executable = a.approval_status === "approved" && a.adapter_enabled && a.execution_status !== "executed";
  // L4 admin-critical actions require a REAL explicit confirmation: the operator must
  // type the exact phrase before we ever send confirm:true. A normal Execute click can
  // never auto-confirm an admin-critical action.
  const needsConfirm = a.risk_level === "level_4_admin_critical";
  const [l4Phrase, setL4Phrase] = useState("");
  const l4Confirmed = l4Phrase.trim() === L4_CONFIRM_PHRASE;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: "rgba(5,7,11,0.6)" }} onClick={onClose} />
      <div className="relative h-full w-full max-w-[560px] overflow-y-auto" style={{ background: "var(--t-bg)", borderLeft: "1px solid var(--t-border)" }}>
        <div className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between gap-3" style={{ background: "var(--t-bg)", borderBottom: "1px solid var(--t-border-subtle)" }}>
          <div className="min-w-0">
            <p className="vc-label mb-1 flex items-center gap-1.5"><Bot size={12} /> {a.agent_id} · {a.action_type.replace(/_/g, " ")}{a.created_by ? " · created manually" : ""}</p>
            <h3 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color: "var(--t-text)" }}>{a.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ color: "var(--t-muted)" }}><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <VCStatusBadge label={APPROVAL_META[a.approval_status].label} variant={APPROVAL_META[a.approval_status].variant} dot />
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ color: RISK_META[a.risk_level].color, background: `${RISK_META[a.risk_level].color}18`, border: `1px solid ${RISK_META[a.risk_level].color}38` }}>{RISK_META[a.risk_level].label}</span>
            <VCChip label={`→ ${a.target_system}`} color={a.adapter_enabled ? "#22c55e" : "#6b7a99"} />
            {qg?.qualityScore !== undefined && <span className="inline-flex items-center gap-1"><Gauge size={11} style={{ color: "#22d3ee" }} /><span className="text-[11px] font-semibold" style={{ color: "#22d3ee" }}>{Math.round((qg.qualityScore ?? 0) * 100)}</span></span>}
          </div>

          {/* What will happen */}
          <div className="px-3.5 py-3 rounded-xl" style={{ background: "rgba(0,129,242,0.05)", border: "1px solid rgba(0,129,242,0.18)" }}>
            <p className="vc-label mb-1" style={{ color: "#4da6ff" }}>What this does (safe preview)</p>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>{a.safe_preview}</p>
          </div>

          {a.reason && (<div><p className="vc-label mb-1">Why</p><p className="text-[12.5px]" style={{ color: "var(--t-text-body)" }}>{a.reason}</p></div>)}

          {a.evidence.length > 0 && (
            <div><p className="vc-label mb-1">Evidence</p><ul className="space-y-1 text-[12px]" style={{ color: "var(--t-text-body)" }}>{a.evidence.map((e, i) => <li key={i}>· {e}</li>)}</ul></div>
          )}
          {a.constraints.length > 0 && (
            <div><p className="vc-label mb-1">Constraints</p><div className="flex flex-wrap gap-1.5">{a.constraints.map((c, i) => <VCChip key={i} label={c} color="#f59e0b" />)}</div></div>
          )}

          {/* Execution status */}
          <div className="px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
            <div className="flex items-center gap-2">
              {a.adapter_enabled ? <ShieldCheck size={14} style={{ color: "#22c55e" }} /> : <ShieldAlert size={14} style={{ color: "#6b7a99" }} />}
              <span className="text-[12.5px] font-semibold" style={{ color: "var(--t-text)" }}>
                {a.adapter_enabled ? "Internal adapter · execution enabled after approval" : "External target · adapter disabled (future phase required)"}
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--t-dim)" }}>Execution status: {a.execution_status.replace(/_/g, " ")}{a.execution_error ? ` · ${a.execution_error}` : ""}</p>
          </div>

          {/* Audit log */}
          {a.audit_log.length > 0 && (
            <div>
              <p className="vc-label mb-2 flex items-center gap-1.5"><History size={12} /> Audit log</p>
              <div className="space-y-1.5">
                {a.audit_log.slice().reverse().map((e, i) => (
                  <div key={i} className="px-3 py-1.5 rounded-lg text-[11.5px]" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                    <span className="font-semibold" style={{ color: "var(--t-text)" }}>{e.event}</span>
                    <span style={{ color: "var(--t-dim)" }}> · {e.actor} · {timeAgo(e.at)}</span>
                    {e.detail && <span style={{ color: "var(--t-muted)" }}> — {e.detail}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Human controls */}
          <div className="pt-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
            {canReview && (a.approval_status === "pending_review" || a.approval_status === "needs_revision") && (
              <div className="flex flex-wrap gap-2 mt-3">
                {canApprove && <ActBtn icon={CheckCircle2} label="Approve" tone="#22c55e" disabled={acting} onClick={() => onReview("approve")} />}
                <ActBtn icon={RotateCcw} label="Request revision" tone="#f59e0b" disabled={acting} onClick={() => onReview("request_revision")} />
                <ActBtn icon={XCircle} label="Reject" tone="#ef4444" disabled={acting} onClick={() => onReview("reject")} />
                <ActBtn icon={Archive} label="Archive" tone="#6b7a99" disabled={acting} onClick={() => onReview("archive")} />
              </div>
            )}

            {a.approval_status === "approved" && (
              <div className="mt-3 space-y-3">
                {a.adapter_enabled ? (
                  canExecute ? (
                    needsConfirm ? (
                      <div className="space-y-2.5 px-3 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.28)" }}>
                        <p className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: "#ef4444" }}>
                          <ShieldAlert size={13} /> Admin-critical action (L4)
                        </p>
                        <p className="text-[11.5px] leading-snug" style={{ color: "var(--t-text-body)" }}>
                          This is the highest risk tier. To confirm, type <strong>{L4_CONFIRM_PHRASE}</strong> below — execution will not proceed otherwise.
                        </p>
                        <input
                          value={l4Phrase}
                          onChange={(e) => setL4Phrase(e.target.value)}
                          placeholder={L4_CONFIRM_PHRASE}
                          aria-label="Type the confirmation phrase to enable execution"
                          className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none"
                          style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                        />
                        <VCButton onClick={() => onExecute(true)} disabled={acting || !executable || !l4Confirmed}>
                          <Play size={13} /> Execute admin-critical action
                        </VCButton>
                      </div>
                    ) : (
                      <VCButton onClick={() => onExecute(false)} disabled={acting || !executable}><Play size={13} /> Execute internal action</VCButton>
                    )
                  ) : (
                    <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: "var(--t-muted)" }}><Lock size={12} /> Admin role required to execute.</p>
                  )
                ) : (
                  <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: "var(--t-muted)" }}><ShieldAlert size={12} /> Approved, but the <strong>{a.target_system}</strong> adapter is disabled. A future approved adapter is required to execute.</p>
                )}
                {/* Withdrawal — governance can always pull back an approval before execution. */}
                {canReview && a.execution_status !== "executed" && a.execution_status !== "executing" && (
                  <div className="flex flex-wrap gap-2">
                    <ActBtn icon={RotateCcw} label="Send back to revision" tone="#f59e0b" disabled={acting} onClick={() => onReview("request_revision")} />
                    <ActBtn icon={XCircle} label="Reject" tone="#ef4444" disabled={acting} onClick={() => onReview("reject")} />
                    <ActBtn icon={Archive} label="Archive" tone="#6b7a99" disabled={acting} onClick={() => onReview("archive")} />
                  </div>
                )}
              </div>
            )}

            {notice && <p className="text-[11.5px] mt-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,132,0,0.08)", border: "1px solid rgba(255,132,0,0.2)", color: "#ff8400" }}>{notice}</p>}

            <p className="text-[10.5px] mt-3" style={{ color: "var(--t-dim)" }}>
              Reviews and execution only change internal Vault Core state + the audit log. Nothing is sent, launched, charged, or mutated on any external system in this phase.
            </p>
          </div>
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
