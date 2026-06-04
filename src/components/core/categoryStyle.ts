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
  // Phase 4 — Financial Intelligence (gold/amber/red palette; Valerie = gold)
  financial_insight: { label: "Financial Insight", color: "#c9a84c" },
  revenue_trend: { label: "Revenue Trend", color: "#eab308" },
  payment_risk: { label: "Payment Risk", color: "#ef4444" },
  failed_payment_signal: { label: "Failed Payment", color: "#f87171" },
  partner_earnings_signal: { label: "Partner Earnings", color: "#c9a84c" },
  forecast_signal: { label: "Forecast", color: "#f59e0b" },
  client_revenue_signal: { label: "Client Revenue", color: "#d4b35a" },
  commission_signal: { label: "Commission", color: "#fbbf24" },
  // Phase 5 — Executive Oversight (Vanessa = purple)
  executive_brief: { label: "Executive Brief", color: "#a78bfa" },
  executive_priority: { label: "Executive Priority", color: "#b89eff" },
  strategic_recommendation: { label: "Strategic Recommendation", color: "#8b5cf6" },
  risk_summary: { label: "Risk Summary", color: "#ef4444" },
  opportunity_summary: { label: "Opportunity Summary", color: "#22c55e" },
  workforce_performance_summary: { label: "Workforce Performance", color: "#a78bfa" },
  decision_support_brief: { label: "Decision Support", color: "#818cf8" },
  company_priority: { label: "Company Priority", color: "#c084fc" },
  // Phase 6 — Conversation Intelligence (Veronica = blue/teal)
  conversation_insight: { label: "Conversation Insight", color: "#0081f2" },
  lead_conversion_signal: { label: "Lead Conversion", color: "#22c55e" },
  sms_pattern: { label: "SMS Pattern", color: "#38bdf8" },
  call_pattern: { label: "Call Pattern", color: "#2dd4bf" },
  missed_opportunity: { label: "Missed Opportunity", color: "#f59e0b" },
  reactivation_opportunity: { label: "Reactivation", color: "#34d399" },
  booking_signal: { label: "Booking Signal", color: "#22c55e" },
  objection_pattern: { label: "Objection Pattern", color: "#fb923c" },
  follow_up_signal: { label: "Follow-Up Signal", color: "#60a5fa" },
  appointment_risk: { label: "Appointment Risk", color: "#ef4444" },
  nurture_sequence_draft: { label: "Nurture Draft", color: "#818cf8" },
  sms_draft: { label: "SMS Draft", color: "#0070d4" },
  hot_lead_signal: { label: "Hot Lead", color: "#ef4444" },
  dead_conversation_signal: { label: "Dead Conversation", color: "#6b7a99" },
  // Phase 6.8 — Vault Co Identity Core (gold/blue — company DNA) + legacy learning
  company_identity: { label: "Company Identity", color: "#c9a84c" },
  brand_voice: { label: "Brand Voice", color: "#e8c97a" },
  target_market: { label: "Target Market", color: "#0081f2" },
  core_offer: { label: "Core Offer", color: "#22c55e" },
  sales_positioning: { label: "Sales Positioning", color: "#38bdf8" },
  objection_handling: { label: "Objection Handling", color: "#fb923c" },
  messaging_principle: { label: "Messaging Principle", color: "#a78bfa" },
  differentiation: { label: "Differentiation", color: "#c9a84c" },
  proof_point: { label: "Proof Point", color: "#22c55e" },
  pricing_context: { label: "Pricing Context", color: "#d4b35a" },
  internal_principle: { label: "Internal Principle", color: "#818cf8" },
  legacy_learning: { label: "Legacy Learning", color: "#f59e0b" },
  // Phase 8.2 — Vivian, AI Client Success / Experience Operator (green — retention)
  client_success_signal: { label: "Client Success", color: "#22c55e" },
  client_experience_signal: { label: "Client Experience", color: "#34d399" },
  retention_risk: { label: "Retention Risk", color: "#ef4444" },
  onboarding_health: { label: "Onboarding Health", color: "#2dd4bf" },
  // Phase 8.4 — Valentina competitor intelligence (orange — marketing)
  competitor_profile: { label: "Competitor", color: "#ff8400" },
  competitor_capture: { label: "Competitor Capture", color: "#fb923c" },
  hook_pattern: { label: "Hook Pattern", color: "#ff8400" },
  offer_shift: { label: "Offer Shift", color: "#f59e0b" },
  creative_pattern: { label: "Creative Pattern", color: "#fbbf24" },
  landing_page_pattern: { label: "Landing Page Pattern", color: "#fb923c" },
  pricing_positioning: { label: "Pricing / Positioning", color: "#f59e0b" },
  market_signal: { label: "Market Signal", color: "#fdba74" },
};

export function styleFor(category: string): CategoryStyle {
  return (
    CATEGORY_STYLE[category as VaultNodeCategory] ?? {
      label: category,
      color: "#6b7a99",
    }
  );
}
