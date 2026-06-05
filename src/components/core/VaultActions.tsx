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
  Lock, X, Gauge, History, Bot, Lightbulb, Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  VCPageWrapper, VCPanel, VCPanelHeader, VCStatusBadge, VCChip, VCEmptyState, VCSkeleton, VCButton,
} from "@/components/ui/VaultUI";
import { useAuth } from "@/components/AuthProvider";
import { can } from "@/lib/auth/permissions";
import type {
  VaultActionDTO, ActionCounts, ApprovalStatus, RiskLevel,
  ActionType, TargetSystem, ExecutionStatus, AuditEntry,
} from "@/lib/core/actions/types";

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

function timeAgo(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string") return "Unknown";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Unknown";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 0) return "just now";
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Defensive normalization ──────────────────────────────────────────────────
// The API returns safe DTOs, but the page must NEVER crash regardless of the wire
// shape: an empty table, a mock/fallback payload, a bare array, or a row with null /
// out-of-vocabulary fields. We coerce every action into a known-safe DTO here so the
// render can rely on valid enums, real arrays, and string fields throughout.
const APPROVAL_KEYS = new Set(Object.keys(APPROVAL_META));
const RISK_KEYS = new Set(Object.keys(RISK_META));
const FALLBACK_APPROVAL: ApprovalStatus = "pending_review";
const FALLBACK_RISK: RiskLevel = "level_1_internal_action";

function asStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asNullableStr(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function asStrArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function asAuditLog(v: unknown): AuditEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      at: asStr(e.at),
      actor: asStr(e.actor, "system"),
      event: asStr(e.event, "event"),
      detail: typeof e.detail === "string" ? e.detail : undefined,
    }));
}

function normalizeAction(raw: unknown, idx: number): VaultActionDTO {
  const r = asObject(raw);
  const approval_status = (APPROVAL_KEYS.has(asStr(r.approval_status)) ? r.approval_status : FALLBACK_APPROVAL) as ApprovalStatus;
  const risk_level = (RISK_KEYS.has(asStr(r.risk_level)) ? r.risk_level : FALLBACK_RISK) as RiskLevel;
  return {
    id: asStr(r.id, `action-${idx}`),
    agent_id: asStr(r.agent_id, "—"),
    created_by: asNullableStr(r.created_by),
    client_id: asNullableStr(r.client_id),
    title: asStr(r.title, "Untitled action"),
    summary: asStr(r.summary),
    action_type: asStr(r.action_type, "action") as ActionType,
    target_system: asStr(r.target_system, "internal") as TargetSystem,
    risk_level,
    approval_status,
    execution_status: asStr(r.execution_status, "not_ready") as ExecutionStatus,
    safe_preview: asStr(r.safe_preview),
    reason: asNullableStr(r.reason),
    evidence: asStrArray(r.evidence),
    constraints: asStrArray(r.constraints),
    requires_approval: r.requires_approval === true,
    source_type: asNullableStr(r.source_type),
    source_id: asNullableStr(r.source_id),
    approved_by: asNullableStr(r.approved_by),
    approved_at: asNullableStr(r.approved_at),
    rejected_by: asNullableStr(r.rejected_by),
    rejected_at: asNullableStr(r.rejected_at),
    rejection_reason: asNullableStr(r.rejection_reason),
    executed_by_agent: asNullableStr(r.executed_by_agent),
    executed_at: asNullableStr(r.executed_at),
    execution_error: asNullableStr(r.execution_error),
    rollback_notes: asNullableStr(r.rollback_notes),
    audit_log: asAuditLog(r.audit_log),
    adapter_enabled: r.adapter_enabled === true,
    metadata: asObject(r.metadata),
    created_at: asStr(r.created_at),
    updated_at: asStr(r.updated_at),
  };
}

// Accept either { actions, counts } or a bare array; always return a safe array.
function normalizeActions(payload: unknown): VaultActionDTO[] {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { actions?: unknown })?.actions)
      ? (payload as { actions: unknown[] }).actions
      : [];
  return list.map((row, i) => normalizeAction(row, i));
}

// Approval / risk display lookups that can never throw on an unexpected value.
function approvalMeta(s: ApprovalStatus) { return APPROVAL_META[s] ?? APPROVAL_META[FALLBACK_APPROVAL]; }
function riskMeta(r: RiskLevel) { return RISK_META[r] ?? RISK_META[FALLBACK_RISK]; }

// Coerce counts to all-number, tolerating null / partial / non-number fields.
function normalizeCounts(raw: unknown): ActionCounts | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    pending_review: n(r.pending_review), approved: n(r.approved), rejected: n(r.rejected),
    needs_revision: n(r.needs_revision), archived: n(r.archived), executed: n(r.executed),
    failed: n(r.failed), adapter_disabled: n(r.adapter_disabled),
    high_risk_pending: n(r.high_risk_pending), total: n(r.total),
  };
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
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/core/actions").catch(() => null);
    if (!res) { setError(true); setLoading(false); return; }
    if (!res.ok) {
      if (res.status === 403 || res.status === 401) setForbidden(true);
      else setError(true);
      setLoading(false);
      return;
    }
    // Tolerate non-JSON / unexpected bodies without throwing into render.
    const d = await res.json().catch(() => null);
    setActions(normalizeActions(d));
    setCounts(normalizeCounts((d as { counts?: unknown } | null)?.counts));
    setError(false);
    setLoading(false);
  }, []);

  // Initial load uses the promise/.then pattern (setState lands in async callbacks,
  // not synchronously in the effect). `load` itself is reused for refetches from the
  // review/execute event handlers below.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/core/actions")
      .then((res) => (res.ok ? res.json().catch(() => null) : Promise.reject(res.status)))
      .then((d) => {
        if (cancelled) return;
        setActions(normalizeActions(d));
        setCounts(normalizeCounts((d as { counts?: unknown } | null)?.counts));
        setError(false);
        setLoading(false);
      })
      .catch((status) => {
        if (cancelled) return;
        if (status === 401 || status === 403) setForbidden(true);
        else setError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

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

  if (error && actions.length === 0) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vault Core · Approved Execution Engine" title="Actions" />
        <VCPanel>
          <VCEmptyState
            icon={ShieldAlert}
            title="Couldn't load the execution queue"
            description="The actions service is unavailable right now. No external system was contacted. Try again in a moment."
          />
          <div className="px-4 pb-4">
            <VCButton onClick={() => { setLoading(true); setError(false); load(); }}>Retry</VCButton>
          </div>
        </VCPanel>
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
                  <VCStatusBadge label={approvalMeta(a.approval_status).label} variant={approvalMeta(a.approval_status).variant} />
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ color: riskMeta(a.risk_level).color, background: `${riskMeta(a.risk_level).color}18`, border: `1px solid ${riskMeta(a.risk_level).color}38` }}>
                    {riskMeta(a.risk_level).label}
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
  const meta = (a.metadata ?? {}) as {
    quality_gate?: { qualityScore?: number; quality_score?: number; duplicate_score?: number; safety_status?: string };
    generation?: { generation_source?: string; generation_reason?: string; evidence_count?: number; policy_version?: string };
  };
  const qg = meta.quality_gate;
  const gen = meta.generation;
  const dupScore = typeof qg?.duplicate_score === "number" ? qg.duplicate_score : null;
  const evidenceCount = typeof gen?.evidence_count === "number" ? gen.evidence_count : a.evidence.length;
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
            <VCStatusBadge label={approvalMeta(a.approval_status).label} variant={approvalMeta(a.approval_status).variant} dot />
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ color: riskMeta(a.risk_level).color, background: `${riskMeta(a.risk_level).color}18`, border: `1px solid ${riskMeta(a.risk_level).color}38` }}>{riskMeta(a.risk_level).label}</span>
            <VCChip label={`→ ${a.target_system}`} color={a.adapter_enabled ? "#22c55e" : "#6b7a99"} />
            {qg?.qualityScore !== undefined && <span className="inline-flex items-center gap-1"><Gauge size={11} style={{ color: "#22d3ee" }} /><span className="text-[11px] font-semibold" style={{ color: "#22d3ee" }}>{Math.round((qg.qualityScore ?? 0) * 100)}</span></span>}
          </div>

          {/* What will happen */}
          <div className="px-3.5 py-3 rounded-xl" style={{ background: "rgba(0,129,242,0.05)", border: "1px solid rgba(0,129,242,0.18)" }}>
            <p className="vc-label mb-1" style={{ color: "#4da6ff" }}>What this does (safe preview)</p>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>{a.safe_preview}</p>
          </div>

          {/* Why this was generated (Phase 9.1 provenance) */}
          {gen?.generation_reason && (
            <div className="px-3.5 py-3 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
              <p className="vc-label mb-1 flex items-center gap-1.5"><Sparkles size={12} style={{ color: "#22d3ee" }} /> Why this was generated</p>
              <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>{gen.generation_reason}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <VCChip label={`source: ${gen.generation_source ?? "agent"}`} color="#22d3ee" />
                <VCChip label={`evidence: ${evidenceCount}`} color="#a78bfa" />
                {dupScore !== null && <VCChip label={`dup score: ${Math.round(dupScore * 100)}%`} color={dupScore >= 0.7 ? "#f59e0b" : "#6b7a99"} />}
                {typeof qg?.qualityScore === "number" && <VCChip label={`quality: ${Math.round(qg.qualityScore * 100)}`} color="#22c55e" />}
              </div>
            </div>
          )}

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
