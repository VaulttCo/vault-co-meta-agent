// Vault Core — Content Ideas + Creative Brief Builder, DRAFT types (Phase 9.7).
//
// DRAFT-ONLY. A VaultCreativeBrief is an INTERNAL planning artifact describing content /
// creative a human might later produce. NOTHING here posts/publishes/uploads/schedules to
// any social platform, launches a Meta ad, contacts a creator/client, or calls any
// external API — there is no live content adapter in this phase. No raw provider payloads,
// no credentials, no live social/ad IDs, and no raw creator/contact PII are modelled or
// stored.

import type { RiskLevel, AuditEntry } from "../actions/types";

export const BRIEF_STATUSES = [
  "draft",
  "pending_review",
  "approved_internal",
  "needs_revision",
  "rejected",
  "archived",
  "future_adapter_required",
] as const;
export type BriefStatus = (typeof BRIEF_STATUSES)[number];

export const BRIEF_TYPES = [
  "video_ad_brief",
  "ugc_ad_brief",
  "organic_reel",
  "youtube_short",
  "tiktok_short",
  "instagram_reel",
  "content_calendar",
  "shoot_brief",
  "editor_brief",
  "thumbnail_brief",
  "caption_pack",
  "hook_bank",
  "case_study",
  "client_brand_story",
  "competitor_response_creative",
  "custom",
] as const;
export type BriefType = (typeof BRIEF_TYPES)[number];

// Where a brief would eventually route. All external lanes (social/meta/website) are
// DISABLED in this phase — the content adapter is ALWAYS off regardless of target.
export const BRIEF_TARGET_SYSTEMS = ["internal", "content", "social", "meta", "website"] as const;
export type BriefTargetSystem = (typeof BRIEF_TARGET_SYSTEMS)[number];

export const BRIEF_PLATFORMS = [
  "instagram", "tiktok", "youtube", "facebook", "meta", "multi", "internal", "other",
] as const;
export type BriefPlatform = (typeof BRIEF_PLATFORMS)[number];

export const CONTENT_FORMATS = [
  "video", "reel", "short", "ugc_video", "static_image", "carousel", "story",
  "thumbnail", "caption", "calendar", "script", "other",
] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export interface BriefSafePreview {
  summary: string;
  brief_type: BriefType;
  platform: BriefPlatform;
  objective_line: string;
  deliverable_count: number;
  highlights: string[];
}

export interface VaultCreativeBrief {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  brief_type: BriefType;
  source_agent: string | null;
  source_action_id: string | null;
  source_meta_campaign_draft_id: string | null;
  source_competitor_profile_id: string | null;
  status: BriefStatus;
  risk_level: RiskLevel;
  target_system: BriefTargetSystem;
  platform: BriefPlatform;
  content_format: ContentFormat;
  objective: string;
  audience: string | null;
  hook_bank: string[];
  script: string | null;
  shot_list: string[];
  editor_notes: string | null;
  visual_direction: string[];
  caption_options: string[];
  thumbnail_concepts: string[];
  deliverables: string[];
  missing_inputs: string[];
  compliance_notes: string[];
  safe_preview: BriefSafePreview;
  evidence: { items: string[] };
  audit_log: AuditEntry[];
  metadata: Record<string, unknown>;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultCreativeBriefInput {
  client_id?: string | null;
  title: string;
  description?: string | null;
  brief_type: BriefType;
  source_agent?: string | null;
  source_action_id?: string | null;
  source_meta_campaign_draft_id?: string | null;
  source_competitor_profile_id?: string | null;
  target_system?: BriefTargetSystem | null;
  platform?: BriefPlatform | null;
  content_format?: ContentFormat | null;
  objective: string;
  audience?: string | null;
  hook_bank?: string[] | null;
  script?: string | null;
  shot_list?: string[] | null;
  editor_notes?: string | null;
  visual_direction?: string[] | null;
  caption_options?: string[] | null;
  thumbnail_concepts?: string[] | null;
  deliverables?: string[] | null;
  missing_inputs?: string[] | null;
  compliance_notes?: string[] | null;
  evidence?: string[];
  metadata?: Record<string, unknown>;
}

export interface VaultCreativeBriefDTO {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  brief_type: BriefType;
  source_agent: string | null;
  source_action_id: string | null;
  source_meta_campaign_draft_id: string | null;
  source_competitor_profile_id: string | null;
  status: BriefStatus;
  risk_level: RiskLevel;
  target_system: BriefTargetSystem;
  platform: BriefPlatform;
  content_format: ContentFormat;
  objective: string;
  audience: string | null;
  hook_bank: string[];
  script: string | null;
  shot_list: string[];
  editor_notes: string | null;
  visual_direction: string[];
  caption_options: string[];
  thumbnail_concepts: string[];
  deliverables: string[];
  missing_inputs: string[];
  compliance_notes: string[];
  safe_preview: BriefSafePreview;
  evidence: { items: string[] };
  audit_log: AuditEntry[];
  deliverable_count: number;
  missing_inputs_count: number;
  compliance_notes_count: number;
  adapter_enabled: boolean;          // always false (content adapter disabled in 9.7)
  future_adapter_required: boolean;  // true — any post/publish/upload needs a future adapter
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreativeBriefCounts {
  draft: number;
  pending_review: number;
  approved_internal: number;
  needs_revision: number;
  rejected: number;
  archived: number;
  future_adapter_required: number;
  total: number;
  missing_inputs: number; // briefs with at least one missing input
}

export type BriefReviewAction = "approve_internal" | "request_revision" | "reject" | "archive";
