// Supabase database type definitions.
// These mirror the SQL schema in /docs/database-schema.md.
// When you connect Supabase, replace this with the generated types from:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type ClientStatus = "active" | "setup" | "onboarding" | "paused";
export type DraftStatus =
  | "draft"
  | "needs_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "ready_for_meta"
  | "pushed_paused"
  | "live";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "changes_requested";
export type AssetStatus = "Uploaded" | "Needs Review" | "Approved" | "Used in Campaign" | "Archived";
export type IntegrationStatus = "connected" | "disconnected" | "error" | "pending";

// ── Row types (what the DB returns on SELECT) ──────────────────

export interface ClientRow {
  id: string;
  company_name: string;
  owner_name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  service_areas: string[];
  services_offered: string[];
  average_job_value: string | null;
  monthly_ad_budget: string | null;
  meta_ad_account_id: string | null;
  facebook_page_id: string | null;
  instagram_account_id: string | null;
  meta_pixel_id: string | null;
  ghl_location_id: string | null;
  ghl_pipeline_id: string | null;
  brand_tone: string | null;
  offer: string | null;
  notes: string | null;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
}

export interface ClientIntelligenceRow {
  id: string;
  client_id: string;
  onboarding_summary: string | null;
  company_profile: Json;
  service_area: Json;
  target_market: Json;
  competitive_landscape: Json;
  kpi_baseline: Json;
  sales_audit: Json;
  content_planning: Json;
  buyer_profile: Json;
  market_research: Json;
  offer_intelligence: Json;
  sales_intelligence: Json;
  brand_intelligence: Json;
  campaign_implications: Json;
  created_at: string;
  updated_at: string;
}

export interface CreativeAssetRow {
  id: string;
  client_id: string;
  file_name: string;
  file_type: string;
  asset_type: string;
  thumbnail_url: string | null;
  storage_url: string | null;
  upload_date: string;
  service: string | null;
  market: string | null;
  campaign_use_case: string | null;
  notes: string | null;
  status: AssetStatus;
  tags: string[];
  approved_for_ads: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignDraftRow {
  id: string;
  client_id: string;
  campaign_name: string;
  market: string;
  service: string;
  goal: string;
  budget: string;
  creative_type: string | null;
  creative_asset_id: string | null;
  status: DraftStatus;
  approval_status: DraftStatus;
  meta_campaign_structure: Json | null;
  ad_copy: Json | null;
  lead_form: Json | null;
  ghl_workflow: Json | null;
  creative_direction: Json | null;
  compliance_check: Json | null;
  optimization_rules: Json | null;
  buyer_psychology_used: Json | null;
  market_research_used: Json | null;
  client_intelligence_used: Json | null;
  creative_intelligence_used: Json | null;
  strategic_rationale: Json | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRow {
  id: string;
  client_id: string;
  related_type: string;
  related_id: string | null;
  approval_type: string;
  title: string;
  description: string | null;
  risk_level: "low" | "medium" | "high";
  status: ApprovalStatus;
  requested_by: string;
  reviewed_by: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportRow {
  id: string;
  client_id: string;
  report_type: string;
  report_period: string | null;
  report_period_start: string;
  report_period_end: string;
  spend: number | null;
  leads: number | null;
  booked_appointments: number | null;
  cpl: number | null;
  cpba: number | null;
  show_rate: number | null;
  pipeline_value: number | null;
  revenue_generated: number | null;
  summary: string | null;
  wins: string[];
  issues: string[];
  next_actions: string[];
  generated_content: Json | null;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
}

export interface IntegrationConnectionRow {
  id: string;
  client_id: string;
  provider: string;
  provider_account_id: string | null;
  connection_status: IntegrationStatus;
  last_synced_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// ── Database type (used by createClient<Database>) ────────────

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: ClientRow;
        Insert: Omit<ClientRow, "created_at" | "updated_at">;
        Update: Partial<Omit<ClientRow, "id" | "created_at" | "updated_at">>;
      };
      client_intelligence: {
        Row: ClientIntelligenceRow;
        Insert: Omit<ClientIntelligenceRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ClientIntelligenceRow, "id" | "created_at" | "updated_at">>;
      };
      creative_assets: {
        Row: CreativeAssetRow;
        Insert: Omit<CreativeAssetRow, "created_at" | "updated_at">;
        Update: Partial<Omit<CreativeAssetRow, "id" | "created_at" | "updated_at">>;
      };
      campaign_drafts: {
        Row: CampaignDraftRow;
        Insert: Omit<CampaignDraftRow, "created_at" | "updated_at">;
        Update: Partial<Omit<CampaignDraftRow, "id" | "created_at" | "updated_at">>;
      };
      approvals: {
        Row: ApprovalRow;
        Insert: Omit<ApprovalRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ApprovalRow, "id" | "created_at" | "updated_at">>;
      };
      reports: {
        Row: ReportRow;
        Insert: Omit<ReportRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ReportRow, "id" | "created_at" | "updated_at">>;
      };
      integration_connections: {
        Row: IntegrationConnectionRow;
        Insert: Omit<IntegrationConnectionRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<IntegrationConnectionRow, "id" | "created_at" | "updated_at">>;
      };
    };
  };
}
