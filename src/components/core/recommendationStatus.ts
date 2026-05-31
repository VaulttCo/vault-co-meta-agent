// Vault Core — recommendation status + action presentation (shared).

import type { RecommendationStatus, ReviewAction } from "@/lib/core/types";

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
