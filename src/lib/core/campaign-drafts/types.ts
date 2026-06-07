// Vault Core — Meta Campaign Action Builder, DRAFT types (Phase 9.5).
//
// DRAFT-ONLY. A VaultMetaCampaignDraft is an INTERNAL planning artifact describing a
// Meta campaign a human might one day build. NOTHING here launches a campaign, changes
// a budget, creates an ad set/ad, publishes a lead form, or calls a Meta write API —
// there is no live Meta adapter in this phase. No raw provider payloads, no credentials/
// access tokens, no live campaign/ad-account IDs are modelled or stored.

import type { RiskLevel, AuditEntry } from "../actions/types";

export const CAMPAIGN_STATUSES = [
  "draft",
  "pending_review",
  "approved_internal",
  "needs_revision",
  "rejected",
  "archived",
  "future_adapter_required",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_TYPES = [
  "roofing_lead_generation",
  "remodeling_lead_generation",
  "storm_damage",
  "roof_replacement",
  "roof_repair",
  "inspection_offer",
  "financing_offer",
  "seasonal_promo",
  "retargeting",
  "reactivation",
  "brand_awareness",
  "custom",
] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

// The ONLY target system for a campaign draft. Meta is a DISABLED external lane in this
// phase — there is no live adapter. Modelled as a one-value union for clarity + checks.
export const CAMPAIGN_TARGET_SYSTEMS = ["meta"] as const;
export type CampaignTargetSystem = (typeof CAMPAIGN_TARGET_SYSTEMS)[number];

// ── Sanitized nested structures (stored as JSONB; re-sanitized at the DTO boundary) ──

export interface CampaignAudience {
  description: string | null;
  geo: string | null;        // service-area description — NOT raw lat/long or live geo IDs
  age_range: string | null;
  interests: string[];
  exclusions: string[];
}

export interface CampaignAdSet {
  name: string;
  audience_summary: string | null;
  placement: string | null;  // e.g. "Facebook + Instagram feeds" — descriptive only
  notes: string | null;
}

export interface CampaignAdCopy {
  primary_texts: string[];
  headlines: string[];
  descriptions: string[];
}

export interface CampaignLeadForm {
  intro: string | null;
  questions: string[];
  privacy_note: string | null;
}

// INTERNAL advisory only. NEVER a live budget mutation — values are human-readable
// guidance strings (e.g. "$50–$75/day"), never numeric values fed to a Meta API, and
// never an ad-account id.
export interface CampaignBudgetRecommendation {
  recommended_daily: string | null;
  recommended_total: string | null;
  pacing_notes: string | null;
  notes: string | null;
}

export interface CampaignSafePreview {
  summary: string;
  campaign_type: CampaignType;
  objective_line: string;
  ad_set_count: number;
  highlights: string[];
}

export interface VaultMetaCampaignDraft {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  campaign_type: CampaignType;
  source_agent: string | null;
  source_action_id: string | null;
  source_competitor_profile_id: string | null;
  status: CampaignStatus;
  risk_level: RiskLevel;
  target_system: CampaignTargetSystem;
  objective: string;
  offer_angle: string | null;
  audience: CampaignAudience;
  ad_sets: CampaignAdSet[];
  creative_direction: string[];
  ad_copy: CampaignAdCopy;
  lead_form: CampaignLeadForm;
  budget_recommendation: CampaignBudgetRecommendation;
  launch_checklist: string[];
  missing_inputs: string[];
  compliance_notes: string[];
  safe_preview: CampaignSafePreview;
  evidence: { items: string[] };
  audit_log: AuditEntry[];
  metadata: Record<string, unknown>;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultMetaCampaignDraftInput {
  client_id?: string | null;
  title: string;
  description?: string | null;
  campaign_type: CampaignType;
  source_agent?: string | null;
  source_action_id?: string | null;
  source_competitor_profile_id?: string | null;
  objective: string;
  offer_angle?: string | null;
  audience?: Partial<CampaignAudience> | null;
  ad_sets?: Array<Partial<CampaignAdSet>> | null;
  creative_direction?: string[] | null;
  ad_copy?: Partial<CampaignAdCopy> | null;
  lead_form?: Partial<CampaignLeadForm> | null;
  budget_recommendation?: Partial<CampaignBudgetRecommendation> | null;
  launch_checklist?: string[] | null;
  missing_inputs?: string[] | null;
  compliance_notes?: string[] | null;
  evidence?: string[];
  metadata?: Record<string, unknown>;
}

export interface VaultMetaCampaignDraftDTO {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  campaign_type: CampaignType;
  source_agent: string | null;
  source_action_id: string | null;
  source_competitor_profile_id: string | null;
  status: CampaignStatus;
  risk_level: RiskLevel;
  target_system: CampaignTargetSystem;
  objective: string;
  offer_angle: string | null;
  audience: CampaignAudience;
  ad_sets: CampaignAdSet[];
  creative_direction: string[];
  ad_copy: CampaignAdCopy;
  lead_form: CampaignLeadForm;
  budget_recommendation: CampaignBudgetRecommendation;
  launch_checklist: string[];
  missing_inputs: string[];
  compliance_notes: string[];
  safe_preview: CampaignSafePreview;
  evidence: { items: string[] };
  audit_log: AuditEntry[];
  ad_set_count: number;
  missing_inputs_count: number;
  compliance_notes_count: number;
  adapter_enabled: boolean;          // always false (Meta adapter disabled in 9.5)
  future_adapter_required: boolean;  // true — launching needs a future approved adapter
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignDraftCounts {
  draft: number;
  pending_review: number;
  approved_internal: number;
  needs_revision: number;
  rejected: number;
  archived: number;
  future_adapter_required: number;
  total: number;
  missing_inputs: number; // drafts with at least one missing input
}

export type CampaignReviewAction = "approve_internal" | "request_revision" | "reject" | "archive";
