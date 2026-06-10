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
  Lock, X, Gauge, History, Bot, Lightbulb, Sparkles, UserCog, StickyNote, Workflow, MessageSquare, Target, Receipt, Clapperboard, HeartPulse,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  VCPageWrapper, VCPanel, VCPanelHeader, VCStatusBadge, VCChip, VCEmptyState, VCSkeleton, VCButton,
} from "@/components/ui/VaultUI";
import { useAuth } from "@/components/AuthProvider";
import { can } from "@/lib/auth/permissions";
import type {
  VaultActionDTO, ActionCounts, ApprovalStatus, RiskLevel,
  ActionType, TargetSystem, ExecutionStatus, AuditEntry, ActionPriority,
} from "@/lib/core/actions/types";

const PRIORITY_KEYS = new Set(["low", "medium", "high", "urgent"]);
const PRIORITY_META: Record<ActionPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "#6b7a99" },
  medium: { label: "Medium", color: "#0081f2" },
  high: { label: "High", color: "#f59e0b" },
  urgent: { label: "Urgent", color: "#ef4444" },
};

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

type FilterKey = ApprovalStatus | "all" | "ready";
const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending_review", label: "Pending" },
  { key: "ready", label: "Ready" },
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
  const optStr = (x: unknown) => (typeof x === "string" ? x.slice(0, 400) : undefined);
  return v
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      at: asStr(e.at),
      actor: asStr(e.actor, "system"),
      event: asStr(e.event, "event"),
      detail: optStr(e.detail),
      // Preserve the Phase 9.2 lifecycle fields so the timeline renders fully.
      message: optStr(e.message),
      previous_status: optStr(e.previous_status),
      next_status: optStr(e.next_status),
      note: optStr(e.note),
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
    owner: asNullableStr(r.owner),
    priority: (PRIORITY_KEYS.has(asStr(r.priority)) ? r.priority : null) as ActionPriority | null,
    due_at: asNullableStr(r.due_at),
    labels: asStrArray(r.labels),
    ready_to_execute: r.ready_to_execute === true,
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
    high_risk_pending: n(r.high_risk_pending), ready: n(r.ready), ready_urgent_high: n(r.ready_urgent_high),
    urgent_high_open: n(r.urgent_high_open), total: n(r.total),
  };
}

export function VaultActions() {
  const { user } = useAuth();
  const canReview = !!user && (user.role === "admin" || user.role === "media_buyer");
  const canApprove = !!user && can(user.role, "canApproveVaultActions");
  const canExecute = !!user && can(user.role, "canExecuteVaultActions");

  const [actions, setActions] = useState<VaultActionDTO[]>([]);
  const [counts, setCounts] = useState<ActionCounts | null>(null);
  const [filter, setFilter] = useState<FilterKey>("pending_review");
  const [priorityFilter, setPriorityFilter] = useState<ActionPriority | "all">("all");
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

  const visible = useMemo(() => {
    let list = actions;
    if (filter === "ready") list = list.filter((a) => a.ready_to_execute);
    else if (filter !== "all") list = list.filter((a) => a.approval_status === filter);
    if (priorityFilter !== "all") list = list.filter((a) => a.priority === priorityFilter);
    return list;
  }, [actions, filter, priorityFilter]);
  const selected = selectedId ? actions.find((a) => a.id === selectedId) ?? null : null;

  const review = useCallback(async (id: string, action: string, notes?: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/actions/${id}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, notes }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Review failed"); return; }
      await load();
    } finally { setActing(false); }
  }, [load]);

  const addNote = useCallback(async (id: string, note: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/actions/${id}/note`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not add note"); return; }
      await load();
    } finally { setActing(false); }
  }, [load]);

  const assign = useCallback(async (id: string, patch: Record<string, unknown>) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/actions/${id}/assign`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not update"); return; }
      await load();
    } finally { setActing(false); }
  }, [load]);

  // Create a GHL workflow DRAFT from an approved draft_ghl_workflow action. This is
  // draft-only — it never publishes to GHL or changes the action's adapter state.
  const createWorkflowDraft = useCallback(async (id: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/ghl-workflow-drafts/from-action`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action_id: id }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not create workflow draft"); return; }
      setNotice(d.existing
        ? "A workflow draft already exists for this action — open GHL Workflows to review it."
        : "Workflow draft created (draft-only) — open GHL Workflows to review it.");
      await load();
    } finally { setActing(false); }
  }, [load]);

  // Create a message DRAFT from an approved draft_lead_reply/draft_client_message
  // action. Draft-only — it never sends or changes the action's adapter state.
  const createMessageDraft = useCallback(async (id: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/message-drafts/from-action`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action_id: id }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not create message draft"); return; }
      setNotice(d.existing
        ? "A message draft already exists for this action — open Message Drafts to review it."
        : "Message draft created (draft-only) — open Message Drafts to review it.");
      await load();
    } finally { setActing(false); }
  }, [load]);

  // Create a Meta campaign DRAFT from an approved draft_meta_campaign action. Draft-only
  // — it never launches, never changes a budget, and never changes the action's adapter state.
  const createCampaignDraft = useCallback(async (id: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/meta-campaign-drafts/from-action`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action_id: id }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not create campaign draft"); return; }
      setNotice(d.existing
        ? "A Meta campaign draft already exists for this action — open Meta Campaign Drafts to review it."
        : "Meta campaign draft created (draft-only) — open Meta Campaign Drafts to review it.");
      await load();
    } finally { setActing(false); }
  }, [load]);

  // Create a finance DRAFT from an approved draft_invoice / prepare_budget_recommendation
  // action. Draft-only — it never invoices, charges, collects, or moves money.
  const createFinanceDraft = useCallback(async (id: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/finance-drafts/from-action`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action_id: id }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not create finance draft"); return; }
      setNotice(d.existing
        ? "A finance draft already exists for this action — open Finance Drafts to review it."
        : "Finance draft created (draft-only) — open Finance Drafts to review it.");
      await load();
    } finally { setActing(false); }
  }, [load]);

  // Create a client-health DRAFT from an approved prepare_client_success_plan /
  // draft_client_message / draft_report / draft_invoice action. Draft-only — it never
  // contacts a client, sends anything, or touches GHL/Stripe.
  const createClientHealthDraft = useCallback(async (id: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/client-health/from-action`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action_id: id }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not create client-health draft"); return; }
      setNotice(d.existing
        ? "A client-health draft already exists for this action — open Client Health to review it."
        : "Client health draft created (draft-only) — open Client Health to review it.");
      await load();
    } finally { setActing(false); }
  }, [load]);

  // Create a creative brief from an approved prepare_content_idea /
  // prepare_competitor_response / draft_meta_campaign action. Draft-only — it never posts,
  // publishes, uploads, or launches.
  const createCreativeBrief = useCallback(async (id: string) => {
    setActing(true); setNotice(null);
    try {
      const res = await fetch(`/api/core/creative-briefs/from-action`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action_id: id }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not create creative brief"); return; }
      setNotice(d.existing
        ? "A creative brief already exists for this action — open Creative Briefs to review it."
        : "Creative brief created (draft-only) — open Creative Briefs to review it.");
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
        <MiniStat label="Ready to execute" value={counts?.ready ?? 0} color="#22c55e" />
        <MiniStat label="Needs revision" value={counts?.needs_revision ?? 0} color="#f59e0b" />
        <MiniStat label="Executed" value={counts?.executed ?? 0} color="#a78bfa" />
        <MiniStat label="Adapter disabled" value={counts?.adapter_disabled ?? 0} color="#6b7a99" />
        <MiniStat label="Failed" value={counts?.failed ?? 0} color="#ef4444" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
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
        <span className="mx-1 h-4 w-px" style={{ background: "var(--t-border-subtle)" }} />
        {(["all", "urgent", "high", "medium", "low"] as const).map((p) => {
          const active = priorityFilter === p;
          const tone = p === "all" ? "#7b82a0" : PRIORITY_META[p].color;
          return (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all"
              style={active
                ? { background: `${tone}22`, border: `1px solid ${tone}55`, color: "#f8f8f7" }
                : { background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)", color: "var(--t-muted)" }}>
              {p === "all" ? "Any priority" : PRIORITY_META[p].label}
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
                {a.priority && <VCChip label={PRIORITY_META[a.priority].label} color={PRIORITY_META[a.priority].color} />}
                {a.owner && <VCChip label={`@ ${a.owner}`} color="#0081f2" />}
                <VCChip label={`→ ${a.target_system}`} color={a.adapter_enabled ? "#22c55e" : "#6b7a99"} />
                {a.ready_to_execute && <VCChip label="ready" color="#22c55e" />}
                {!a.adapter_enabled && <VCChip label="adapter disabled" color="#6b7a99" />}
                {a.execution_status === "executed" && <VCChip label="executed" color="#22c55e" />}
                {a.execution_status === "failed" && <VCChip label="failed" color="#ef4444" />}
                <span className="text-[10.5px] ml-auto" style={{ color: "var(--t-dim)" }}>{timeAgo(a.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      </VCPanel>

      {selected && (
        <ActionDetail
          key={`${selected.id}:${selected.updated_at}`}
          action={selected} canReview={canReview} canApprove={canApprove} canExecute={canExecute} acting={acting} notice={notice}
          onReview={(act, notes) => review(selected.id, act, notes)} onExecute={(confirm) => execute(selected.id, confirm)}
          onNote={(note) => addNote(selected.id, note)} onAssign={(patch) => assign(selected.id, patch)}
          onCreateWorkflowDraft={() => createWorkflowDraft(selected.id)}
          onCreateMessageDraft={() => createMessageDraft(selected.id)}
          onCreateCampaignDraft={() => createCampaignDraft(selected.id)}
          onCreateFinanceDraft={() => createFinanceDraft(selected.id)}
          onCreateCreativeBrief={() => createCreativeBrief(selected.id)}
          onCreateClientHealthDraft={() => createClientHealthDraft(selected.id)}
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

function ActionDetail({ action: a, canReview, canApprove, canExecute, acting, notice, onReview, onExecute, onNote, onAssign, onCreateWorkflowDraft, onCreateMessageDraft, onCreateCampaignDraft, onCreateFinanceDraft, onCreateCreativeBrief, onCreateClientHealthDraft, onClose }: {
  action: VaultActionDTO; canReview: boolean; canApprove: boolean; canExecute: boolean; acting: boolean; notice: string | null;
  onReview: (a: string, notes?: string) => void; onExecute: (confirm: boolean) => void;
  onNote: (note: string) => void; onAssign: (patch: Record<string, unknown>) => void; onCreateWorkflowDraft: () => void; onCreateMessageDraft: () => void; onCreateCampaignDraft: () => void; onCreateFinanceDraft: () => void; onCreateCreativeBrief: () => void; onCreateClientHealthDraft: () => void; onClose: () => void;
}) {
  const meta = (a.metadata ?? {}) as {
    quality_gate?: { qualityScore?: number; quality_score?: number; duplicate_score?: number; safety_status?: string };
    generation?: { generation_source?: string; generation_reason?: string; evidence_count?: number; policy_version?: string };
  };
  const qg = meta.quality_gate;
  const gen = meta.generation;
  const dupScore = typeof qg?.duplicate_score === "number" ? qg.duplicate_score : null;
  const evidenceCount = typeof gen?.evidence_count === "number" ? gen.evidence_count : a.evidence.length;
  const executable = a.ready_to_execute;
  // L4 admin-critical actions require a REAL explicit confirmation: the operator must
  // type the exact phrase before we ever send confirm:true. A normal Execute click can
  // never auto-confirm an admin-critical action.
  const needsConfirm = a.risk_level === "level_4_admin_critical";
  const [l4Phrase, setL4Phrase] = useState("");
  const l4Confirmed = l4Phrase.trim() === L4_CONFIRM_PHRASE;
  // Phase 9.2 triage controls.
  const [reviewMode, setReviewMode] = useState<null | "reject" | "request_revision">(null);
  const [reason, setReason] = useState("");
  const [noteText, setNoteText] = useState("");
  const [ownerText, setOwnerText] = useState(a.owner ?? "");

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
            {a.priority && <VCChip label={`${PRIORITY_META[a.priority].label} priority`} color={PRIORITY_META[a.priority].color} />}
            {a.owner && <VCChip label={`owner: ${a.owner}`} color="#0081f2" />}
            {a.ready_to_execute && <VCChip label="ready to execute" color="#22c55e" />}
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

          {/* Lifecycle timeline */}
          {a.audit_log.length > 0 && (
            <div>
              <p className="vc-label mb-2 flex items-center gap-1.5"><History size={12} /> Lifecycle timeline</p>
              <div className="space-y-1.5">
                {a.audit_log.slice().reverse().map((e, i) => {
                  const transition = e.previous_status && e.next_status && e.previous_status !== e.next_status
                    ? `${String(e.previous_status).replace(/_/g, " ")} → ${String(e.next_status).replace(/_/g, " ")}` : null;
                  const body = e.note ?? e.message ?? e.detail;
                  return (
                    <div key={i} className="px-3 py-1.5 rounded-lg text-[11.5px]" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                      <span className="font-semibold" style={{ color: "var(--t-text)" }}>{String(e.event).replace(/_/g, " ")}</span>
                      <span style={{ color: "var(--t-dim)" }}> · {e.actor} · {timeAgo(e.at)}</span>
                      {transition && <span style={{ color: "#4da6ff" }}> · {transition}</span>}
                      {body && <span style={{ color: "var(--t-muted)" }}> — {body}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Triage — owner / priority / note (internal only) */}
          {canReview && (
            <div className="px-3.5 py-3 rounded-xl space-y-3" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
              <p className="vc-label flex items-center gap-1.5"><UserCog size={12} /> Triage (internal)</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px]" style={{ color: "var(--t-dim)" }}>Priority:</span>
                {(["low", "medium", "high", "urgent"] as const).map((p) => (
                  <button key={p} onClick={() => onAssign({ priority: p })} disabled={acting}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all disabled:opacity-50"
                    style={a.priority === p
                      ? { background: `${PRIORITY_META[p].color}22`, border: `1px solid ${PRIORITY_META[p].color}66`, color: PRIORITY_META[p].color }
                      : { background: "var(--t-bg)", border: "1px solid var(--t-border-subtle)", color: "var(--t-muted)" }}>
                    {PRIORITY_META[p].label}
                  </button>
                ))}
                {a.priority && <button onClick={() => onAssign({ priority: null })} disabled={acting} className="text-[11px] disabled:opacity-50" style={{ color: "var(--t-dim)" }}>clear</button>}
              </div>
              <div className="flex items-center gap-2">
                <input value={ownerText} onChange={(e) => setOwnerText(e.target.value)} placeholder="Assign owner (name or @handle)"
                  className="flex-1 px-3 py-2 rounded-lg text-[12px] outline-none" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
                <ActBtn icon={UserCog} label="Assign" tone="#0081f2" disabled={acting || ownerText.trim() === (a.owner ?? "")} onClick={() => onAssign({ owner: ownerText.trim() || null })} />
              </div>
              <div className="flex items-start gap-2">
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add an internal note…" rows={2}
                  className="flex-1 px-3 py-2 rounded-lg text-[12px] outline-none resize-none" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
                <ActBtn icon={StickyNote} label="Note" tone="#a78bfa" disabled={acting || !noteText.trim()} onClick={() => { onNote(noteText.trim()); setNoteText(""); }} />
              </div>
            </div>
          )}

          {/* Human controls */}
          <div className="pt-2" style={{ borderTop: "1px solid var(--t-border-subtle)" }}>
            {canReview && (a.approval_status === "pending_review" || a.approval_status === "needs_revision") && (
              reviewMode ? (
                <ReasonPanel mode={reviewMode} reason={reason} setReason={setReason} acting={acting}
                  onConfirm={() => { onReview(reviewMode, reason); setReviewMode(null); setReason(""); }}
                  onCancel={() => { setReviewMode(null); setReason(""); }} />
              ) : (
                <div className="flex flex-wrap gap-2 mt-3">
                  {canApprove && <ActBtn icon={CheckCircle2} label="Approve" tone="#22c55e" disabled={acting} onClick={() => onReview("approve")} />}
                  <ActBtn icon={RotateCcw} label="Request revision" tone="#f59e0b" disabled={acting} onClick={() => setReviewMode("request_revision")} />
                  <ActBtn icon={XCircle} label="Reject" tone="#ef4444" disabled={acting} onClick={() => setReviewMode("reject")} />
                  <ActBtn icon={Archive} label="Archive" tone="#6b7a99" disabled={acting} onClick={() => onReview("archive")} />
                </div>
              )
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
                ) : a.action_type === "draft_ghl_workflow" && a.target_system === "ghl" ? (
                  <div className="space-y-2 px-3 py-3 rounded-xl" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.26)" }}>
                    <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: "#e8c97a" }}><ShieldAlert size={12} /> Approved internally · GHL adapter disabled — a future approved adapter is required to publish.</p>
                    <div className="flex flex-wrap gap-2">
                      <ActBtn icon={Workflow} label="Create workflow draft" tone="#c9a84c" disabled={acting} onClick={onCreateWorkflowDraft} />
                      <a href="/ghl-workflows" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.3)", color: "#4da6ff" }}>
                        <Workflow size={13} /> View workflow drafts
                      </a>
                    </div>
                  </div>
                ) : (a.action_type === "draft_lead_reply" || a.action_type === "draft_client_message") ? (
                  <div className="space-y-2 px-3 py-3 rounded-xl" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.26)" }}>
                    <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: "#e8c97a" }}><ShieldAlert size={12} /> Approved internally · send adapter disabled — a future approved adapter is required to send.</p>
                    <div className="flex flex-wrap gap-2">
                      <ActBtn icon={MessageSquare} label="Create message draft" tone="#c9a84c" disabled={acting} onClick={onCreateMessageDraft} />
                      <a href="/message-drafts" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.3)", color: "#4da6ff" }}>
                        <MessageSquare size={13} /> View message drafts
                      </a>
                    </div>
                  </div>
                ) : a.action_type === "draft_meta_campaign" && a.target_system === "meta" ? (
                  <div className="space-y-2 px-3 py-3 rounded-xl" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.26)" }}>
                    <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: "#e8c97a" }}><ShieldAlert size={12} /> Approved internally · Meta adapter disabled — a future approved adapter is required to launch. No campaign is launched, no budget is changed.</p>
                    <div className="flex flex-wrap gap-2">
                      <ActBtn icon={Target} label="Create Meta campaign draft" tone="#c9a84c" disabled={acting} onClick={onCreateCampaignDraft} />
                      <a href="/meta-campaign-drafts" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.3)", color: "#4da6ff" }}>
                        <Target size={13} /> View Meta campaign drafts
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: "var(--t-muted)" }}><ShieldAlert size={12} /> Approved, but the <strong>{a.target_system}</strong> adapter is disabled. A future approved adapter is required to execute.</p>
                )}
                {/* Finance draft offer — for approved finance actions (these run on internal
                    lanes, so they also appear alongside the internal-execute path above).
                    Draft-only: never invoices, charges, or collects. */}
                {(a.action_type === "draft_invoice" || a.action_type === "prepare_budget_recommendation") && (
                  <div className="space-y-2 px-3 py-3 rounded-xl" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.26)" }}>
                    <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: "#e8c97a" }}><ShieldAlert size={12} /> Finance adapter disabled — a future approved adapter is required to invoice/charge. No invoice is created/sent, no card is charged, no payment is collected.</p>
                    <div className="flex flex-wrap gap-2">
                      <ActBtn icon={Receipt} label="Create finance draft" tone="#c9a84c" disabled={acting} onClick={onCreateFinanceDraft} />
                      <a href="/finance-drafts" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.3)", color: "#4da6ff" }}>
                        <Receipt size={13} /> View finance drafts
                      </a>
                    </div>
                  </div>
                )}
                {/* Creative brief offer — for approved content/competitor/campaign actions.
                    Draft-only: never posts, publishes, uploads, or launches. */}
                {(a.action_type === "prepare_content_idea" || a.action_type === "prepare_competitor_response" || a.action_type === "draft_meta_campaign") && (
                  <div className="space-y-2 px-3 py-3 rounded-xl" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.26)" }}>
                    <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: "#e8c97a" }}><ShieldAlert size={12} /> Content adapter disabled — a future approved adapter is required to publish. Nothing is posted, uploaded, or launched.</p>
                    <div className="flex flex-wrap gap-2">
                      <ActBtn icon={Clapperboard} label="Create creative brief" tone="#c9a84c" disabled={acting} onClick={onCreateCreativeBrief} />
                      <a href="/creative-briefs" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.3)", color: "#4da6ff" }}>
                        <Clapperboard size={13} /> View creative briefs
                      </a>
                    </div>
                  </div>
                )}
                {/* Client health offer — for approved client-success-relevant actions.
                    Draft-only: never contacts a client, sends anything, or touches GHL/Stripe. */}
                {(a.action_type === "prepare_client_success_plan" || a.action_type === "draft_client_message" || a.action_type === "draft_report" || a.action_type === "draft_invoice") && (
                  <div className="space-y-2 px-3 py-3 rounded-xl" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.22)" }}>
                    <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: "#22c55e" }}><ShieldAlert size={12} /> Client-success adapter disabled — a future approved adapter is required for anything client-facing. No client is contacted, nothing is sent, no GHL record changes.</p>
                    <div className="flex flex-wrap gap-2">
                      <ActBtn icon={HeartPulse} label="Create client health draft" tone="#22c55e" disabled={acting} onClick={onCreateClientHealthDraft} />
                      <a href="/client-health" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.3)", color: "#4da6ff" }}>
                        <HeartPulse size={13} /> View client health drafts
                      </a>
                    </div>
                  </div>
                )}
                {/* Withdrawal — governance can always pull back an approval before execution. */}
                {canReview && a.execution_status !== "executed" && a.execution_status !== "executing" && (
                  reviewMode ? (
                    <ReasonPanel mode={reviewMode} reason={reason} setReason={setReason} acting={acting}
                      onConfirm={() => { onReview(reviewMode, reason); setReviewMode(null); setReason(""); }}
                      onCancel={() => { setReviewMode(null); setReason(""); }} />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <ActBtn icon={RotateCcw} label="Send back to revision" tone="#f59e0b" disabled={acting} onClick={() => setReviewMode("request_revision")} />
                      <ActBtn icon={XCircle} label="Reject" tone="#ef4444" disabled={acting} onClick={() => setReviewMode("reject")} />
                      <ActBtn icon={Archive} label="Archive" tone="#6b7a99" disabled={acting} onClick={() => onReview("archive")} />
                    </div>
                  )
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

function ReasonPanel({ mode, reason, setReason, acting, onConfirm, onCancel }: {
  mode: "reject" | "request_revision"; reason: string; setReason: (s: string) => void;
  acting: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const isReject = mode === "reject";
  const tone = isReject ? "#ef4444" : "#f59e0b";
  return (
    <div className="mt-3 space-y-2.5 px-3 py-3 rounded-xl" style={{ background: `${tone}10`, border: `1px solid ${tone}3a` }}>
      <p className="text-[12px] font-semibold" style={{ color: tone }}>
        {isReject ? "Reject this action" : "Request a revision"} — a reason is required
      </p>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
        placeholder={isReject ? "Why is this being rejected?" : "What should the agent change before this can be approved?"}
        className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none resize-none"
        style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
      <div className="flex gap-2">
        <VCButton onClick={onConfirm} disabled={acting || !reason.trim()}>
          {isReject ? <XCircle size={13} /> : <RotateCcw size={13} />} Confirm {isReject ? "reject" : "revision"}
        </VCButton>
        <button onClick={onCancel} disabled={acting} className="px-3 py-2 rounded-lg text-[12.5px] font-semibold disabled:opacity-50" style={{ color: "var(--t-muted)" }}>Cancel</button>
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
