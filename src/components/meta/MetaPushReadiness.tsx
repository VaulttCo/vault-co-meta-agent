"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  ShieldCheck,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Link,
  Hash,
} from "lucide-react";
import type { CampaignDraft } from "@/lib/planStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MetaConnection {
  id: string | null;
  client_id: string;
  ad_account_id: string | null;
  business_id: string | null;
  page_id: string | null;
  pixel_id: string | null;
  token_status: string;
}

interface MetaPushDraft {
  id: string;
  campaign_name: string | null;
  objective: string | null;
  budget_type: string | null;
  daily_budget: number | null;
  validation_status: string;
  validation_errors: string[] | null;
  approval_status: string;
  meta_push_status: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  clientId: string;
  clientName: string;
  campaignDraft: CampaignDraft;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tokenStatusColor(status: string) {
  if (status === "connected") return "#22c55e";
  if (status === "expired") return "#ef4444";
  if (status === "error") return "#ef4444";
  return "#7b82a0";
}

function validationStatusColor(status: string) {
  if (status === "ready") return "#22c55e";
  if (status === "needs_info") return "#f59e0b";
  return "#7b82a0";
}

function approvalStatusColor(status: string) {
  if (status === "approved") return "#22c55e";
  if (status === "pending") return "#f59e0b";
  if (status === "rejected") return "#ef4444";
  return "#7b82a0";
}

function pushStatusColor(status: string) {
  if (status === "not_pushed") return "#7b82a0";
  if (status === "push_blocked") return "#ef4444";
  return "#7b82a0";
}

function StatusDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function FieldRow({ label, value, missing }: { label: string; value: string | null; missing?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--t-border)] last:border-0">
      <span className="text-[10px] text-[var(--t-dim)] uppercase tracking-wider">{label}</span>
      {value ? (
        <span className="text-[11px] font-mono text-[var(--t-muted)] max-w-[160px] truncate">{value}</span>
      ) : (
        <span className="text-[10px] text-[#f59e0b] flex items-center gap-1">
          <AlertCircle size={9} />
          {missing ? "Missing" : "Not set"}
        </span>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MetaPushReadiness({ clientId, clientName, campaignDraft }: Props) {
  const [connection, setConnection] = useState<MetaConnection | null>(null);
  const [latestDraft, setLatestDraft] = useState<MetaPushDraft | null>(null);
  const [loadingConn, setLoadingConn] = useState(true);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const loadConnection = useCallback(async () => {
    setLoadingConn(true);
    try {
      const res = await fetch(`/api/meta/connections?clientId=${encodeURIComponent(clientId)}`);
      if (res.ok) {
        const json = await res.json();
        setConnection(json.connection ?? null);
      }
    } catch {
      // non-blocking
    } finally {
      setLoadingConn(false);
    }
  }, [clientId]);

  const loadLatestDraft = useCallback(async () => {
    setLoadingDraft(true);
    try {
      const res = await fetch(`/api/meta/push-drafts?clientId=${encodeURIComponent(clientId)}`);
      if (res.ok) {
        const json = await res.json();
        const drafts: MetaPushDraft[] = json.drafts ?? [];
        setLatestDraft(drafts[0] ?? null);
      }
    } catch {
      // non-blocking
    } finally {
      setLoadingDraft(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadConnection();
    loadLatestDraft();
  }, [loadConnection, loadLatestDraft]);

  async function handleCreateDraft() {
    setCreatingDraft(true);
    setActionError(null);
    try {
      const res = await fetch("/api/meta/push-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          campaignDraftId: campaignDraft.id,
          campaignDraft,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setActionError(json.error ?? "Failed to create push draft");
        return;
      }
      await loadLatestDraft();
    } catch {
      setActionError("Network error — could not create push draft");
    } finally {
      setCreatingDraft(false);
    }
  }

  async function handleValidate() {
    if (!latestDraft) return;
    setValidating(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/meta/push-drafts/${latestDraft.id}/validate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setActionError(json.error ?? "Validation failed");
        return;
      }
      await loadLatestDraft();
      setShowValidationErrors(true);
    } catch {
      setActionError("Network error — could not validate");
    } finally {
      setValidating(false);
    }
  }

  async function handleSubmitApproval() {
    if (!latestDraft) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/meta/push-drafts/${latestDraft.id}/submit-approval`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setActionError(json.error ?? "Failed to submit for approval");
        return;
      }
      await loadLatestDraft();
    } catch {
      setActionError("Network error — could not submit for approval");
    } finally {
      setSubmitting(false);
    }
  }

  const isConnected = connection?.token_status === "connected";
  const validationErrors = latestDraft?.validation_errors as string[] | null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(0,129,242,0.2)", backgroundColor: "var(--t-surface)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b"
        style={{ borderColor: "rgba(0,129,242,0.12)" }}
      >
        {isConnected ? (
          <Wifi size={11} style={{ color: "#0081f2" }} />
        ) : (
          <WifiOff size={11} style={{ color: "#7b82a0" }} />
        )}
        <span className="text-[11px] font-semibold" style={{ color: "#0081f2" }}>
          Meta Push Readiness
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ml-auto" style={{ color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          Approval-Gated
        </span>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Connection Block */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Link size={9} style={{ color: "#7b82a0" }} />
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#7b82a0" }}>
              Connection
            </span>
            {loadingConn && <Loader2 size={8} className="animate-spin ml-1" style={{ color: "#7b82a0" }} />}
          </div>
          {!loadingConn && (
            <div className="space-y-0">
              <FieldRow label="Ad Account ID" value={connection?.ad_account_id ?? null} missing />
              <FieldRow label="Facebook Page ID" value={connection?.page_id ?? null} missing />
              <FieldRow label="Pixel ID" value={connection?.pixel_id ?? null} />
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[10px] text-[var(--t-dim)] uppercase tracking-wider">Token Status</span>
                <span className="flex items-center gap-1.5 text-[11px]" style={{ color: tokenStatusColor(connection?.token_status ?? "not_connected") }}>
                  <StatusDot color={tokenStatusColor(connection?.token_status ?? "not_connected")} />
                  {connection?.token_status ?? "not_connected"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Latest Push Draft */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText size={9} style={{ color: "#7b82a0" }} />
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#7b82a0" }}>
              Latest Push Draft
            </span>
            {loadingDraft && <Loader2 size={8} className="animate-spin ml-1" style={{ color: "#7b82a0" }} />}
          </div>
          {!loadingDraft && (
            latestDraft ? (
              <div className="space-y-0">
                <div className="flex items-center justify-between py-1.5 border-b border-[var(--t-border)]">
                  <span className="text-[10px] text-[var(--t-dim)] uppercase tracking-wider">Campaign</span>
                  <span className="text-[11px] text-[var(--t-muted)] max-w-[180px] truncate">{latestDraft.campaign_name ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[var(--t-border)]">
                  <span className="text-[10px] text-[var(--t-dim)] uppercase tracking-wider">Validation</span>
                  <span className="flex items-center gap-1.5 text-[11px]" style={{ color: validationStatusColor(latestDraft.validation_status) }}>
                    <StatusDot color={validationStatusColor(latestDraft.validation_status)} />
                    {latestDraft.validation_status}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[var(--t-border)]">
                  <span className="text-[10px] text-[var(--t-dim)] uppercase tracking-wider">Approval</span>
                  <span className="flex items-center gap-1.5 text-[11px]" style={{ color: approvalStatusColor(latestDraft.approval_status) }}>
                    <StatusDot color={approvalStatusColor(latestDraft.approval_status)} />
                    {latestDraft.approval_status}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[10px] text-[var(--t-dim)] uppercase tracking-wider">Push Status</span>
                  <span className="flex items-center gap-1.5 text-[11px]" style={{ color: pushStatusColor(latestDraft.meta_push_status) }}>
                    <StatusDot color={pushStatusColor(latestDraft.meta_push_status)} />
                    {latestDraft.meta_push_status}
                  </span>
                </div>

                {/* Validation errors toggle */}
                {validationErrors && validationErrors.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-[var(--t-border)]">
                    <button
                      onClick={() => setShowValidationErrors((p) => !p)}
                      className="flex items-center gap-1.5 text-[10px] transition-colors"
                      style={{ color: "#f59e0b" }}
                    >
                      <AlertCircle size={9} />
                      {validationErrors.length} validation {validationErrors.length === 1 ? "issue" : "issues"}
                      {showValidationErrors ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                    </button>
                    {showValidationErrors && (
                      <ul className="mt-2 space-y-1">
                        {validationErrors.map((e, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[10px]" style={{ color: "var(--t-muted)" }}>
                            <AlertCircle size={8} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
                            {e}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {latestDraft.validation_status === "ready" && (
                  <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-[var(--t-border)] text-[10px]" style={{ color: "#22c55e" }}>
                    <CheckCircle2 size={9} />
                    All validation checks passed
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-[var(--t-dim)]">No push draft created yet.</p>
            )
          )}
        </div>

        {/* Error display */}
        {actionError && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-[10px]" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
            <AlertCircle size={10} className="flex-shrink-0 mt-0.5" />
            {actionError}
          </div>
        )}

        {/* Safety notice */}
        <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}>
          <ShieldCheck size={9} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
          <p className="text-[9px] leading-relaxed" style={{ color: "var(--t-dim)" }}>
            No campaign will be pushed to Meta. All push actions are blocked until a human approves a validated draft.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {/* Create Draft */}
          <button
            onClick={handleCreateDraft}
            disabled={creatingDraft}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "rgba(0,129,242,0.1)", border: "1px solid rgba(0,129,242,0.25)", color: "#0081f2" }}
          >
            {creatingDraft ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />}
            {creatingDraft ? "Creating…" : latestDraft ? "Recreate Push Draft" : "Create Meta Push Draft"}
          </button>

          {/* Validate */}
          <button
            onClick={handleValidate}
            disabled={validating || !latestDraft}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa" }}
          >
            {validating ? <Loader2 size={10} className="animate-spin" /> : <Hash size={10} />}
            {validating ? "Validating…" : "Validate Readiness"}
          </button>

          {/* Submit for Approval */}
          <button
            onClick={handleSubmitApproval}
            disabled={
              submitting ||
              !latestDraft ||
              latestDraft.validation_status !== "ready" ||
              latestDraft.approval_status === "pending" ||
              latestDraft.approval_status === "approved"
            }
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}
          >
            {submitting ? (
              <Loader2 size={10} className="animate-spin" />
            ) : latestDraft?.approval_status === "pending" ? (
              <Clock size={10} />
            ) : latestDraft?.approval_status === "approved" ? (
              <CheckCircle2 size={10} />
            ) : (
              <Send size={10} />
            )}
            {submitting
              ? "Submitting…"
              : latestDraft?.approval_status === "pending"
              ? "Pending Review"
              : latestDraft?.approval_status === "approved"
              ? "Approved"
              : "Submit for Approval"}
          </button>

          {latestDraft?.validation_status !== "ready" && latestDraft && (
            <p className="text-[9px] text-center" style={{ color: "var(--t-dim)" }}>
              Validate first — Submit for Approval requires validation to pass
            </p>
          )}
        </div>

        {/* Draft ID */}
        {latestDraft && (
          <p className="text-[9px] font-mono" style={{ color: "var(--t-dim)" }}>
            Push Draft ID: {latestDraft.id}
          </p>
        )}
      </div>
    </div>
  );
}
