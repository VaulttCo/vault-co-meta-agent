"use client";

import { useState, useEffect } from "react";
import {
  CheckSquare,
  X,
  Eye,
  Megaphone,
  DollarSign,
  FileText,
  ImageIcon,
  GitPullRequest,
  Settings,
  Bot,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  RadioTower,
  Film,
  AlertCircle,
  Archive,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePlans } from "@/components/PlanProvider";
import { useAuth } from "@/components/AuthProvider";
import {
  draftStatusLabel,
  draftStatusVariant,
  type DraftStatus,
  type CampaignDraft,
} from "@/lib/planStore";
import {
  approvalPriorityVariant,
  approvalPriorityLabel,
  type ApprovalIconType,
} from "@/lib/data";

// ── Veronica draft types ──────────────────────────────────────

interface VeronicaDraft {
  id: string;
  clientId: string | null;
  clientName: string | null;
  draftType: string;
  title: string;
  content: string;
  sourcePrompt: string | null;
  agentsUsed: string[];
  dataSources: string[];
  approvalStatus: "needs_review" | "approved" | "changes_requested" | "archived";
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const DRAFT_TYPE_LABELS: Record<string, string> = {
  campaign_draft: "Campaign Draft",
  ghl_workflow_blueprint: "GHL Workflow Blueprint",
  client_message_draft: "Client Message Draft",
  creative_brief: "Creative Brief",
  internal_task_list: "Internal Task List",
  report_draft: "Report Draft",
  ad_copy_draft: "Ad Copy Draft",
};

const DRAFT_TYPE_COLORS: Record<string, string> = {
  campaign_draft: "#0081f2",
  ghl_workflow_blueprint: "#22c55e",
  client_message_draft: "#f59e0b",
  creative_brief: "#a78bfa",
  internal_task_list: "#6b7a99",
  report_draft: "#6b7a99",
  ad_copy_draft: "#ff8400",
};

const AGENT_LABELS: Record<string, string> = {
  client_health: "Client Health",
  launch_readiness: "Launch Readiness",
  client_intelligence: "Client Intelligence",
  media_buyer: "Media Buyer",
  ghl_followup: "GHL Follow-Up",
  sales_conversion: "Sales Conversion",
  creative_strategist: "Creative Strategist",
  offer_messaging: "Offer & Messaging",
  reporting: "Reporting",
  operator_priority: "Operator Priority",
  client_retention: "Client Retention",
  upsell_opportunity: "Upsell Opportunity",
  capacity_scaling: "Capacity & Scaling",
  data_quality: "Data Quality",
  compliance_risk: "Compliance & Risk",
  landing_page_cro: "Landing Page CRO",
  appointment_setter: "Appointment Setter",
  client_communication: "Client Communication",
  ghl_workflow_builder: "GHL Workflow Builder",
};

// ── Veronica draft card ───────────────────────────────────────

function VeronicaDraftCard({
  draft,
  canApprove,
  onStatusChange,
  feedback,
}: {
  draft: VeronicaDraft;
  canApprove: boolean;
  onStatusChange: (id: string, status: VeronicaDraft["approvalStatus"]) => Promise<void>;
  feedback?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const typeColor = DRAFT_TYPE_COLORS[draft.draftType] ?? "#6b7a99";
  const typeLabel = DRAFT_TYPE_LABELS[draft.draftType] ?? draft.draftType;

  const isNeedsReview = draft.approvalStatus === "needs_review";
  const isApproved = draft.approvalStatus === "approved";
  const isChangesRequested = draft.approvalStatus === "changes_requested";
  const isArchived = draft.approvalStatus === "archived";

  const borderColor = isNeedsReview
    ? "rgba(201, 168, 76, 0.25)"
    : isApproved
    ? "rgba(34, 197, 94, 0.20)"
    : isChangesRequested
    ? "rgba(245, 158, 11, 0.20)"
    : "var(--t-border)";

  const shortContent =
    draft.content.length > 350 ? draft.content.slice(0, 350).trimEnd() + "…" : draft.content;

  const formattedDate = new Date(draft.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function handleAction(status: VeronicaDraft["approvalStatus"]) {
    setUpdating(true);
    try {
      await onStatusChange(draft.id, status);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--t-surface)",
        border: `1px solid ${borderColor}`,
        boxShadow: "var(--t-card-shadow)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${typeColor}15`,
            border: `1px solid ${typeColor}28`,
          }}
        >
          <Archive size={15} style={{ color: typeColor }} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[12px] font-bold" style={{ color: "var(--t-text)" }}>
              {draft.clientName ?? "No client attached"}
            </span>
            <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>·</span>
            <span className="text-[10px] font-semibold" style={{ color: "var(--t-muted)" }}>
              Veronica Draft
            </span>

            {/* Draft type badge */}
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
              style={{
                color: typeColor,
                backgroundColor: `${typeColor}12`,
                borderColor: `${typeColor}28`,
              }}
            >
              {typeLabel}
            </span>

            {/* Status badge */}
            {isNeedsReview && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/25">
                Needs Review
              </span>
            )}
            {isApproved && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/25">
                Approved
              </span>
            )}
            {isChangesRequested && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/25">
                Changes Requested
              </span>
            )}
            {isArchived && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#6b7a99]/10 text-[#6b7a99] border border-[#6b7a99]/25">
                Archived
              </span>
            )}
          </div>

          {/* Title */}
          <div className="text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>
            {draft.title}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-[11px] flex-wrap mb-2" style={{ color: "var(--t-muted)" }}>
            <span>{formattedDate}</span>
            {draft.clientId && (
              <>
                <span>·</span>
                <Link
                  href={`/clients/${draft.clientId}`}
                  className="hover:underline"
                  style={{ color: "var(--t-muted)" }}
                >
                  View Client
                </Link>
              </>
            )}
          </div>

          {/* Agents used */}
          {draft.agentsUsed.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {draft.agentsUsed.map((a) => (
                <span
                  key={a}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: "var(--t-surface-2)",
                    color: "var(--t-dim)",
                    border: "1px solid var(--t-border)",
                  }}
                >
                  {AGENT_LABELS[a] ?? a}
                </span>
              ))}
            </div>
          )}

          {/* Data sources */}
          {draft.dataSources.length > 0 && (
            <div className="text-[10px] mb-2" style={{ color: "var(--t-dim)" }}>
              Sources: {draft.dataSources.join(", ")}
            </div>
          )}

          {/* Content preview */}
          <div
            className="rounded-lg p-3 mt-2"
            style={{
              backgroundColor: "var(--t-surface-2)",
              border: "1px solid var(--t-border)",
            }}
          >
            {expanded ? (
              <pre
                className="text-[11px] leading-relaxed whitespace-pre-wrap break-words overflow-auto"
                style={{ color: "var(--t-text)", maxHeight: "400px" }}
              >
                {draft.content}
              </pre>
            ) : (
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                {shortContent}
              </p>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 mt-2 text-[10px] font-medium transition-colors hover:opacity-80"
              style={{ color: typeColor }}
            >
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {expanded ? "Collapse" : "Review Draft"}
            </button>
          </div>

          {feedback && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#22c55e]">
              <CheckCircle2 size={11} />
              {feedback}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2 flex-wrap justify-end">
          {isNeedsReview && canApprove && (
            <>
              <button
                disabled={updating}
                onClick={() => handleAction("changes_requested")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#f59e0b] border border-[#f59e0b]/30 rounded-lg hover:bg-[#f59e0b]/10 transition-colors disabled:opacity-50"
              >
                <MessageSquare size={12} />
                Request Changes
              </button>
              <button
                disabled={updating}
                onClick={() => handleAction("approved")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[#22c55e] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <CheckCircle2 size={12} />
                Mark Approved
              </button>
            </>
          )}

          {isChangesRequested && canApprove && (
            <button
              disabled={updating}
              onClick={() => handleAction("needs_review")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ color: "var(--t-muted)", borderColor: "var(--t-border)" }}
            >
              Reopen
            </button>
          )}

          {isApproved && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#22c55e] px-3 py-1.5 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg">
              <CheckCircle2 size={11} />
              Approved
            </span>
          )}

          {!isArchived && canApprove && (
            <button
              disabled={updating}
              onClick={() => handleAction("archived")}
              className="w-7 h-7 flex items-center justify-center rounded-lg border transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: "var(--t-border)", color: "var(--t-dim)" }}
              title="Archive"
            >
              <Archive size={12} />
            </button>
          )}

          {!canApprove && isNeedsReview && (
            <span
              className="text-[10px] px-2 py-1.5 rounded-lg flex items-center gap-1"
              style={{ color: "var(--t-dim)", backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}
            >
              <ShieldCheck size={10} />
              Admin approval required
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Mock approvals icon maps ──────────────────────────────────

const iconMap: Record<ApprovalIconType, React.ElementType> = {
  campaign: Megaphone,
  copy: FileText,
  budget: DollarSign,
  creative: ImageIcon,
  report: GitPullRequest,
  workflow: Settings,
};

const iconColorMap: Record<ApprovalIconType, string> = {
  campaign: "#0081f2",
  copy: "#ff8400",
  budget: "#22c55e",
  creative: "#a78bfa",
  report: "#6b7a99",
  workflow: "#0081f2",
};

// ── Draft risk helper ─────────────────────────────────────────

function parseRisk(metaRisk: string): { label: string; color: string } {
  if (metaRisk.startsWith("HIGH")) return { label: "High Risk", color: "#ef4444" };
  if (metaRisk.startsWith("MEDIUM")) return { label: "Med Risk", color: "#f59e0b" };
  return { label: "Low Risk", color: "#22c55e" };
}

// ── Campaign draft approval card ──────────────────────────────

function DraftCard({
  draft,
  onUpdate,
  canApprove,
  canMarkReady,
}: {
  draft: CampaignDraft;
  onUpdate: (id: string, status: DraftStatus) => void;
  canApprove: boolean;
  canMarkReady: boolean;
}) {
  const risk = parseRisk(draft.compliance.metaRisk);
  const isActive = draft.status === "needs_review";
  const isApproved = draft.status === "approved";
  const changesRequested = draft.status === "changes_requested";
  const isReadyOrLive = ["ready_for_meta", "pushed_paused", "live"].includes(draft.status);
  const isRejected = draft.status === "rejected";

  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--t-surface)",
        border: isActive
          ? "1px solid rgba(0, 129, 242, 0.25)"
          : isApproved
          ? "1px solid rgba(34, 197, 94, 0.20)"
          : "1px solid var(--t-border)",
        boxShadow: "var(--t-card-shadow)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0081f2]/10 border border-[#0081f2]/20">
          <Bot size={15} className="text-[#0081f2]" />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[12px] font-bold" style={{ color: "var(--t-text)" }}>{draft.clientName}</span>
            <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>·</span>
            <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>AI Campaign Draft</span>
            <Badge label={draftStatusLabel[draft.status]} variant={draftStatusVariant[draft.status]} />
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1"
              style={{
                color: risk.color,
                backgroundColor: `${risk.color}15`,
                borderColor: `${risk.color}28`,
              }}
            >
              <ShieldCheck size={9} />
              {risk.label}
            </span>
          </div>
          <div className="text-[13px] font-semibold mb-1.5" style={{ color: "var(--t-text)" }}>{draft.campaignName}</div>
          <div className="flex items-center gap-2 text-[11px] flex-wrap mb-2" style={{ color: "var(--t-muted)" }}>
            <span>{draft.service}</span>
            <span>·</span>
            <span>{draft.market}</span>
            <span>·</span>
            <span>{draft.budget}</span>
            <span>·</span>
            <span>{draft.goal}</span>
          </div>
          <div className="text-[10px]" style={{ color: "var(--t-dim)" }}>
            Submitted by {draft.createdBy} · {draft.updatedAt}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2 flex-wrap justify-end">
          <Link
            href={`/ai-agent?draft=${draft.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#6b7a99] border border-[rgba(0, 129, 242, 0.15)] rounded-lg hover:text-[#f8f8f7] hover:border-[rgba(0, 129, 242, 0.25)] transition-colors"
          >
            <Eye size={12} />
            View Draft
          </Link>

          {isActive && (
            <>
              <button
                onClick={() => onUpdate(draft.id, "changes_requested")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#f59e0b] border border-[#f59e0b]/30 rounded-lg hover:bg-[#f59e0b]/10 transition-colors"
              >
                <MessageSquare size={12} />
                Request Changes
              </button>
              {canApprove ? (
                <>
                  <button
                    onClick={() => onUpdate(draft.id, "rejected")}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[rgba(0, 129, 242, 0.15)] text-[#6b7a99] hover:text-[#ef4444] hover:border-[#ef4444]/30 transition-colors"
                    title="Reject"
                  >
                    <X size={13} />
                  </button>
                  <button
                    onClick={() => onUpdate(draft.id, "approved")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[#22c55e] text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <CheckCircle2 size={12} />
                    Approve
                  </button>
                </>
              ) : (
                <span className="text-[10px] px-2 py-1.5 rounded-lg flex items-center gap-1" style={{ color: "var(--t-dim)", backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}>
                  <ShieldCheck size={10} />
                  Admin approval required
                </span>
              )}
            </>
          )}

          {isApproved && (
            canMarkReady ? (
              <button
                onClick={() => onUpdate(draft.id, "ready_for_meta")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold vc-orange-gradient text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <RadioTower size={12} />
                Mark Ready for Meta
              </button>
            ) : (
              <span className="text-[10px] px-2 py-1.5 rounded-lg flex items-center gap-1" style={{ color: "var(--t-dim)", backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}>
                <ShieldCheck size={10} />
                Admin only
              </span>
            )
          )}

          {changesRequested && (
            <span className="text-[11px] text-[#f59e0b] px-3 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg">
              Awaiting revision
            </span>
          )}

          {isReadyOrLive && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#22c55e] px-3 py-1.5 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg">
              <CheckCircle2 size={11} />
              {draftStatusLabel[draft.status]}
            </span>
          )}

          {isRejected && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#ef4444] px-3 py-1.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg">
              <XCircle size={11} />
              Rejected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Creative approval card ─────────────────────────────────────

function CreativeApprovalCard({ draft }: { draft: CampaignDraft }) {
  const intel = draft.creativeIntelligenceUsed!;
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "changes">("pending");

  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--t-surface)",
        border: status === "approved"
          ? "1px solid rgba(34, 197, 94, 0.20)"
          : status === "rejected"
          ? "1px solid rgba(239, 68, 68, 0.20)"
          : status === "changes"
          ? "1px solid rgba(245, 158, 11, 0.20)"
          : "1px solid rgba(167, 139, 250, 0.25)",
        boxShadow: "var(--t-card-shadow)",
      }}
    >
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#a78bfa]/10 border border-[#a78bfa]/20">
          <Film size={15} className="text-[#a78bfa]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[12px] font-bold" style={{ color: "var(--t-text)" }}>{draft.clientName}</span>
            <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>·</span>
            <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>Creative Approval Request</span>
            {status === "pending" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/25">
                Needs Approval
              </span>
            )}
            {status === "approved" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/25">
                Approved
              </span>
            )}
            {status === "rejected" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/25">
                Rejected
              </span>
            )}
            {status === "changes" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/25">
                Changes Requested
              </span>
            )}
          </div>
          <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>{intel.assetType}</div>
          <div className="text-[12px] mb-1" style={{ color: "var(--t-muted)" }}>{intel.creativeStrength}</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {intel.trustSignals.slice(0, 3).map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 rounded-full">{s}</span>
            ))}
          </div>
          <div className="text-[11px] mb-1" style={{ color: "var(--t-muted)" }}>
            <span style={{ color: "var(--t-dim)" }}>Used in:</span> {draft.campaignName}
          </div>
          {intel.complianceNote && (
            <div className="flex items-start gap-1.5 mt-2">
              <AlertCircle size={11} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#f59e0b]">{intel.complianceNote}</p>
            </div>
          )}
        </div>
        {status === "pending" && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-2 flex-wrap justify-end">
            <Link
              href={`/ai-agent?draft=${draft.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#6b7a99] border border-[rgba(0, 129, 242, 0.15)] rounded-lg hover:text-[#f8f8f7] hover:border-[rgba(0, 129, 242, 0.25)] transition-colors"
            >
              <Eye size={12} />
              View Draft
            </Link>
            <button
              onClick={() => setStatus("changes")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#f59e0b] border border-[#f59e0b]/30 rounded-lg hover:bg-[#f59e0b]/10 transition-colors"
            >
              <MessageSquare size={12} />
              Request Changes
            </button>
            <button
              onClick={() => setStatus("rejected")}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[rgba(0, 129, 242, 0.15)] text-[#6b7a99] hover:text-[#ef4444] hover:border-[#ef4444]/30 transition-colors"
              title="Reject"
            >
              <X size={13} />
            </button>
            <button
              onClick={() => setStatus("approved")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[#22c55e] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <CheckCircle2 size={12} />
              Approve Creative
            </button>
          </div>
        )}
        {status !== "pending" && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {status === "approved" && (
              <span className="flex items-center gap-1.5 text-[11px] text-[#22c55e] px-3 py-1.5 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg">
                <CheckCircle2 size={11} />
                Approved
              </span>
            )}
            {status === "rejected" && (
              <span className="flex items-center gap-1.5 text-[11px] text-[#ef4444] px-3 py-1.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg">
                <XCircle size={11} />
                Rejected
              </span>
            )}
            {status === "changes" && (
              <span className="text-[11px] text-[#f59e0b] px-3 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg">
                Awaiting revision
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const { plans, updateStatus } = usePlans();
  const { can } = useAuth();
  const canApprove = can("canApproveCampaigns");
  const canMarkReady = can("canMarkReadyForMeta");

  // Prevent hydration mismatch: localStorage-derived counts are 0 on the server
  // and may differ on the client. Render stable placeholders until after mount.
  const [mounted, setMounted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Veronica drafts state
  const [veronicaDrafts, setVeronicaDrafts] = useState<VeronicaDraft[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [draftFeedback, setDraftFeedback] = useState<Record<string, string>>({});

  useEffect(() => { setMounted(true); }, []);

  // Fetch veronica drafts from the server on mount
  useEffect(() => {
    fetch("/api/veronica/drafts")
      .then((r) => r.ok ? r.json() : { drafts: [] })
      .then((body) => setVeronicaDrafts(body.drafts ?? []))
      .catch(() => {});
  }, []);

  async function handleVeronicaStatusChange(
    id: string,
    status: VeronicaDraft["approvalStatus"]
  ) {
    const res = await fetch(`/api/veronica/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalStatus: status }),
    });
    if (res.ok) {
      setVeronicaDrafts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, approvalStatus: status } : d))
      );
      if (status === "approved") {
        const body = await res.json().catch(() => ({}));
        const msg = body.taskAlreadyExists
          ? "Draft approved. Operator task already exists."
          : body.createdTaskId
          ? "Draft approved. Operator task created."
          : "Draft approved.";
        setDraftFeedback((prev) => ({ ...prev, [id]: msg }));
      }
    }
  }

  // Actionable: require human review or revision
  const actionableDrafts = mounted
    ? plans.filter((p) => ["needs_review", "changes_requested"].includes(p.status))
    : [];
  // Approved: admin must mark ready for Meta before launch
  const approvedDrafts = mounted
    ? plans.filter((p) => p.status === "approved")
    : [];
  // History: terminal or launched — no further action needed
  const historyDrafts = mounted
    ? plans.filter((p) =>
        ["ready_for_meta", "pushed_paused", "live", "rejected"].includes(p.status)
      )
    : [];
  const creativePendingDrafts = mounted
    ? plans.filter((p) => p.creativeIntelligenceUsed && !p.creativeIntelligenceUsed.approvedForAds)
    : [];
  const needsReviewCount = mounted ? plans.filter((p) => p.status === "needs_review").length : 0;
  const changesRequestedCount = mounted
    ? plans.filter((p) => p.status === "changes_requested").length
    : 0;
  const approvedCount = mounted ? approvedDrafts.length : 0;

  // Veronica draft computed lists
  const veronicaNeedsReview = veronicaDrafts.filter((d) =>
    ["needs_review", "changes_requested"].includes(d.approvalStatus)
  );
  const veronicaApproved = veronicaDrafts.filter((d) => d.approvalStatus === "approved");
  const veronicaArchived = veronicaDrafts.filter((d) => d.approvalStatus === "archived");
  const veronicaNeedsReviewCount = veronicaNeedsReview.length;

  const totalPending =
    needsReviewCount +
    changesRequestedCount +
    creativePendingDrafts.length +
    veronicaNeedsReviewCount;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Approvals"
        description={`${totalPending} items awaiting review`}
      />

      {/* Safety notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-[#f59e0b]/5 border border-[#f59e0b]/15 rounded-xl mb-6">
        <ShieldCheck size={13} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
        <p className="text-[12px] leading-snug" style={{ color: "var(--t-muted)" }}>
          <span className="text-[#f59e0b] font-semibold">AI Safety: </span>
          AI-generated campaign drafts require human approval before launch, budget changes, or Meta publishing.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: "Needs Review", count: needsReviewCount, color: "#0081f2" },
          { label: "Changes Requested", count: changesRequestedCount, color: "#f59e0b" },
          { label: "Approved / Ready", count: approvedCount, color: "#22c55e" },
          { label: "Creative Approval", count: creativePendingDrafts.length, color: "#a78bfa" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
          >
            <span className="text-[22px] font-bold" style={{ color: s.color, fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif" }}>
              {s.count}
            </span>
            <span className="text-[12px]" style={{ color: "var(--t-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Needs Action ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Bot size={13} className="text-[#0081f2]" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
            Needs Your Review
          </h3>
          {actionableDrafts.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#0081f2]/15 text-[#0081f2] border border-[#0081f2]/25 rounded-full">
              {actionableDrafts.length} actionable
            </span>
          )}
        </div>

        {actionableDrafts.length === 0 ? (
          <div className="rounded-xl p-10 flex flex-col items-center text-center" style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}>
              <Bot size={16} style={{ color: "var(--t-dim)" }} />
            </div>
            <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>
              No approvals waiting for review
            </div>
            <p className="text-[12px] mb-4" style={{ color: "var(--t-muted)" }}>
              Generate a campaign with Veronica and submit it for approval to see it here.
            </p>
            <Link
              href="/ai-agent"
              className="flex items-center gap-2 px-4 py-2 vc-blue-gradient text-white text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Bot size={13} />
              Open Veronica
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {actionableDrafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} onUpdate={updateStatus} canApprove={canApprove} canMarkReady={canMarkReady} />
            ))}
          </div>
        )}
      </section>

      {/* ── Approved — Pending Meta Launch ── */}
      {approvedDrafts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={13} className="text-[#22c55e]" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
              Approved — Pending Meta Launch
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/25 rounded-full">
              {approvedDrafts.length} approved
            </span>
          </div>
          <div className="space-y-3">
            {approvedDrafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} onUpdate={updateStatus} canApprove={canApprove} canMarkReady={canMarkReady} />
            ))}
          </div>
        </section>
      )}

      {/* ── History (collapsed by default) ── */}
      {historyDrafts.length > 0 && (
        <section className="mb-8">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 mb-3 text-left w-full group"
          >
            <span className="text-[11px] font-bold text-[#3d4f6e] uppercase tracking-widest">
              History
            </span>
            <span className="text-[10px] text-[#3d4f6e] bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.12)] px-2 py-0.5 rounded-full">
              {historyDrafts.length} completed
            </span>
            <span className="text-[10px] text-[#3d4f6e] ml-auto group-hover:text-[#6b7a99] transition-colors">
              {showHistory ? "Hide ↑" : "Show ↓"}
            </span>
          </button>
          {showHistory && (
            <div className="space-y-3">
              {historyDrafts.map((draft) => (
                <DraftCard key={draft.id} draft={draft} onUpdate={updateStatus} canApprove={canApprove} canMarkReady={canMarkReady} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Creative Approval Requests ── */}
      {creativePendingDrafts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Film size={13} className="text-[#a78bfa]" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
              Creative Approval Requests
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/25 rounded-full">
              {creativePendingDrafts.length} pending
            </span>
          </div>
          <div className="flex items-start gap-2.5 px-4 py-3 bg-[#a78bfa]/5 border border-[#a78bfa]/15 rounded-xl mb-3">
            <AlertCircle size={13} className="text-[#a78bfa] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#6b7a99] leading-snug">
              <span className="text-[#a78bfa] font-semibold">Creative Review: </span>
              These campaigns use creative assets that have not yet been approved for Meta ads. Review and approve each creative before the campaign can launch.
            </p>
          </div>
          <div className="space-y-3">
            {creativePendingDrafts.map((draft) => (
              <CreativeApprovalCard key={`creative-${draft.id}`} draft={draft} />
            ))}
          </div>
        </section>
      )}

      {/* ── Veronica Drafts ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Archive size={13} className="text-[#c9a84c]" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
            Veronica Drafts
          </h3>
          {veronicaNeedsReviewCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/25 rounded-full">
              {veronicaNeedsReviewCount} needs review
            </span>
          )}
        </div>

        {/* Safety notice */}
        <div className="flex items-start gap-2.5 px-4 py-3 bg-[#c9a84c]/5 border border-[#c9a84c]/15 rounded-xl mb-3">
          <ShieldCheck size={13} className="text-[#c9a84c] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] leading-snug" style={{ color: "var(--t-muted)" }}>
            <span className="text-[#c9a84c] font-semibold">Approval-gated: </span>
            These are internal drafts saved from Veronica. Marking a draft approved does not send, publish, or activate anything externally. Human sign-off required before any content is used.
          </p>
        </div>

        {/* Needs review + changes requested */}
        {veronicaNeedsReview.length > 0 && (
          <div className="space-y-3 mb-4">
            {veronicaNeedsReview.map((draft) => (
              <VeronicaDraftCard
                key={draft.id}
                draft={draft}
                canApprove={canApprove}
                onStatusChange={handleVeronicaStatusChange}
                feedback={draftFeedback[draft.id]}
              />
            ))}
          </div>
        )}

        {/* Approved Veronica drafts */}
        {veronicaApproved.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={11} className="text-[#22c55e]" />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
                Approved
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 rounded-full">
                {veronicaApproved.length}
              </span>
            </div>
            <div className="space-y-3">
              {veronicaApproved.map((draft) => (
                <VeronicaDraftCard
                  key={draft.id}
                  draft={draft}
                  canApprove={canApprove}
                  onStatusChange={handleVeronicaStatusChange}
                  feedback={draftFeedback[draft.id]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Archived toggle */}
        {veronicaArchived.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="flex items-center gap-2 text-left group mb-2"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
                Archived
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ color: "var(--t-dim)", backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}
              >
                {veronicaArchived.length}
              </span>
              <span className="text-[10px] ml-1 group-hover:opacity-80" style={{ color: "var(--t-dim)" }}>
                {showArchived ? "Hide ↑" : "Show ↓"}
              </span>
            </button>
            {showArchived && (
              <div className="space-y-3">
                {veronicaArchived.map((draft) => (
                  <VeronicaDraftCard
                    key={draft.id}
                    draft={draft}
                    canApprove={canApprove}
                    onStatusChange={handleVeronicaStatusChange}
                    feedback={draftFeedback[draft.id]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {veronicaDrafts.length === 0 && (
          <div
            className="rounded-xl p-10 flex flex-col items-center text-center"
            style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}
            >
              <Archive size={16} style={{ color: "var(--t-dim)" }} />
            </div>
            <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>
              No Veronica drafts saved yet
            </div>
            <p className="text-[12px] mb-4" style={{ color: "var(--t-muted)" }}>
              Ask Veronica a question and use &ldquo;Save Draft&rdquo; to create an approval-ready blueprint.
            </p>
            <Link
              href="/ai-agent"
              className="flex items-center gap-2 px-4 py-2 vc-blue-gradient text-white text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Bot size={13} />
              Open Veronica
            </Link>
          </div>
        )}
      </section>

    </div>
  );
}
