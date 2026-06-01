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
