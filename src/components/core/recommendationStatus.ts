// Vault Core — recommendation status + action presentation (shared).

import type { RecommendationStatus, ReviewAction, VanessaPriority } from "@/lib/core/types";

// Vanessa executive priority presentation (Phase 5).
export const PRIORITY_META: Record<VanessaPriority, { label: string; color: string }> = {
  critical: { label: "Critical", color: "#ef4444" },
  high: { label: "High", color: "#ff8400" },
  medium: { label: "Medium", color: "#0081f2" },
  low: { label: "Low", color: "#6b7a99" },
  watch: { label: "Watch", color: "#3d4f6e" },
};

export const PRIORITY_RANK: Record<VanessaPriority, number> = {
  critical: 5, high: 4, medium: 3, low: 2, watch: 1,
};

// Phase 6 — draft message presentation.
export const DRAFT_STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Needs Review", variant: "blue" },
  approved: { label: "Approved", variant: "success" },
  edited: { label: "Edited", variant: "purple" },
  rejected: { label: "Rejected", variant: "danger" },
};

export const DRAFT_TYPE_LABEL: Record<string, string> = {
  sms_reply: "SMS Reply",
  follow_up: "Follow-Up",
  reactivation: "Reactivation",
  appointment_confirmation: "Appt Confirmation",
  no_show_recovery: "No-Show Recovery",
  objection_response: "Objection Response",
  lead_nurture: "Lead Nurture",
};

export const RISK_META: Record<string, { label: string; color: string }> = {
  low: { label: "Low risk", color: "#22c55e" },
  medium: { label: "Medium risk", color: "#f59e0b" },
  high: { label: "High risk", color: "#ef4444" },
};

type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "blue" | "orange" | "purple" | "gold";

export const STATUS_META: Record<RecommendationStatus, { label: string; variant: BadgeVariant }> = {
  pending_review: { label: "Pending Review", variant: "blue" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  archived: { label: "Archived", variant: "neutral" },
  implemented: { label: "Implemented", variant: "purple" },
};

export const ACTION_META: Record<ReviewAction, { label: string; variant: "orange" | "blue" | "ghost"; tone: string }> = {
  approve: { label: "Approve", variant: "blue", tone: "#22c55e" },
  implement: { label: "Mark Implemented", variant: "blue", tone: "#a78bfa" },
  request_revision: { label: "Request Revision", variant: "ghost", tone: "#ff8400" },
  reject: { label: "Reject", variant: "ghost", tone: "#ef4444" },
  archive: { label: "Archive", variant: "ghost", tone: "#6b7a99" },
};

// Which actions make sense from each status.
export function actionsFor(status: RecommendationStatus): ReviewAction[] {
  switch (status) {
    case "pending_review":
      return ["approve", "reject", "request_revision", "archive"];
    case "approved":
      return ["implement", "reject", "archive"];
    case "rejected":
      return ["request_revision", "archive"];
    case "archived":
      return ["request_revision"];
    case "implemented":
      return ["archive"];
    default:
      return [];
  }
}
