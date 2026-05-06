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
      className={`bg-[#0D1520] border rounded-xl p-5 transition-colors ${
        isActive
          ? "border-[#0081f2]/25 hover:border-[#0081f2]/40"
          : isApproved
          ? "border-[#22c55e]/20 hover:border-[#22c55e]/30"
          : "border-[rgba(0, 129, 242, 0.15)] hover:border-[rgba(0, 129, 242, 0.25)]"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0081f2]/10 border border-[#0081f2]/20">
          <Bot size={15} className="text-[#0081f2]" />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[12px] font-bold text-[#f8f8f7]">{draft.clientName}</span>
            <span className="text-[11px] text-[#6b7a99]">·</span>
            <span className="text-[11px] text-[#6b7a99]">AI Campaign Draft</span>
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
          <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1.5">{draft.campaignName}</div>
          <div className="flex items-center gap-2 text-[11px] text-[#6b7a99] flex-wrap mb-2">
            <span>{draft.service}</span>
            <span>·</span>
            <span>{draft.market}</span>
            <span>·</span>
            <span>{draft.budget}</span>
            <span>·</span>
            <span>{draft.goal}</span>
          </div>
          <div className="text-[10px] text-[#3d4f6e]">
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
                <span className="text-[10px] text-[#3d4f6e] px-2 py-1.5 bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg flex items-center gap-1">
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
              <span className="text-[10px] text-[#3d4f6e] px-2 py-1.5 bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg flex items-center gap-1">
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
      className={`bg-[#0D1520] border rounded-xl p-5 transition-colors ${
        status === "approved"
          ? "border-[#22c55e]/20"
          : status === "rejected"
          ? "border-[#ef4444]/20"
          : status === "changes"
          ? "border-[#f59e0b]/20"
          : "border-[#a78bfa]/25 hover:border-[#a78bfa]/40"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#a78bfa]/10 border border-[#a78bfa]/20">
          <Film size={15} className="text-[#a78bfa]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[12px] font-bold text-[#f8f8f7]">{draft.clientName}</span>
            <span className="text-[11px] text-[#6b7a99]">·</span>
            <span className="text-[11px] text-[#6b7a99]">Creative Approval Request</span>
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
          <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">{intel.assetType}</div>
          <div className="text-[12px] text-[#6b7a99] mb-1">{intel.creativeStrength}</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {intel.trustSignals.slice(0, 3).map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 rounded-full">{s}</span>
            ))}
          </div>
          <div className="text-[11px] text-[#6b7a99] mb-1">
            <span className="text-[#3d4f6e]">Used in:</span> {draft.campaignName}
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
  useEffect(() => { setMounted(true); }, []);

  const submittedDrafts = mounted ? plans.filter((p) => p.status !== "draft") : [];
  const creativePendingDrafts = mounted
    ? plans.filter((p) => p.creativeIntelligenceUsed && !p.creativeIntelligenceUsed.approvedForAds)
    : [];
  const needsReviewCount = mounted ? plans.filter((p) => p.status === "needs_review").length : 0;
  const changesRequestedCount = mounted
    ? plans.filter((p) => p.status === "changes_requested").length
    : 0;
  const approvedCount = mounted
    ? plans.filter((p) =>
        ["approved", "ready_for_meta", "pushed_paused", "live"].includes(p.status)
      ).length
    : 0;

  const totalPending = needsReviewCount + creativePendingDrafts.length;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Approvals"
        description={`${totalPending} items awaiting review`}
      />

      {/* Safety notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-[#f59e0b]/5 border border-[#f59e0b]/15 rounded-xl mb-6">
        <ShieldCheck size={13} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-[#6b7a99] leading-snug">
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
            className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-4 flex items-center gap-3"
          >
            <span className="text-2xl font-bold tracking-tight" style={{ color: s.color }}>
              {s.count}
            </span>
            <span className="text-[12px] text-[#6b7a99]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── AI Campaign Drafts ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Bot size={13} className="text-[#0081f2]" />
          <h3 className="text-[11px] font-bold text-[#3d4f6e] uppercase tracking-widest">
            AI Campaign Drafts
          </h3>
          {needsReviewCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#0081f2]/15 text-[#0081f2] border border-[#0081f2]/25 rounded-full">
              {needsReviewCount} need review
            </span>
          )}
        </div>

        {submittedDrafts.length === 0 ? (
          <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-10 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] flex items-center justify-center mb-3">
              <Bot size={16} className="text-[#3d4f6e]" />
            </div>
            <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">
              No campaign drafts submitted yet
            </div>
            <p className="text-[12px] text-[#6b7a99] mb-4">
              Generate a campaign with Veronica and click Submit for Approval.
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
            {submittedDrafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} onUpdate={updateStatus} canApprove={canApprove} canMarkReady={canMarkReady} />
            ))}
          </div>
        )}
      </section>

      {/* ── Creative Approval Requests ── */}
      {creativePendingDrafts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Film size={13} className="text-[#a78bfa]" />
            <h3 className="text-[11px] font-bold text-[#3d4f6e] uppercase tracking-widest">
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


    </div>
  );
}
