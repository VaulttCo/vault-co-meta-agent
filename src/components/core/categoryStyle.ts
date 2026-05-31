// Vault Core — knowledge-graph category styling (Veronica Design palette).
// Shared by the graph nodes, legend, and detail panel.

import type { VaultNodeCategory } from "@/lib/core/types";

export interface CategoryStyle {
  label: string;
  color: string;
}

export const CATEGORY_STYLE: Record<VaultNodeCategory, CategoryStyle> = {
  memory_core: { label: "Vault Memory", color: "#0081f2" },
  agent: { label: "Workforce Agent", color: "#22d3ee" },
  insight: { label: "Insight", color: "#a78bfa" },
  recommendation: { label: "Recommendation", color: "#ff8400" },
  lead: { label: "Lead", color: "#22c55e" },
  client: { label: "Client", color: "#0081f2" },
  campaign: { label: "Campaign", color: "#38bdf8" },
  ad: { label: "Ad", color: "#f59e0b" },
  hook: { label: "Hook", color: "#ff8400" },
  script: { label: "Script", color: "#facc15" },
  conversation: { label: "Conversation", color: "#34d399" },
  call: { label: "Call", color: "#2dd4bf" },
  revenue_event: { label: "Revenue", color: "#c9a84c" },
  sop: { label: "SOP", color: "#94a3b8" },
  workflow: { label: "Workflow", color: "#60a5fa" },
  proposal: { label: "Proposal", color: "#a78bfa" },
  portal_system: { label: "Portal System", color: "#818cf8" },
  decision: { label: "Decision", color: "#f472b6" },
  initiative: { label: "Initiative", color: "#fb923c" },
};

export function styleFor(category: string): CategoryStyle {
  return (
    CATEGORY_STYLE[category as VaultNodeCategory] ?? {
      label: category,
      color: "#6b7a99",
    }
  );
}
