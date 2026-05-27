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

export interface ClientRevenueSettingsRow {
  id: string;
  client_id: string;
  recurring_billing_active: boolean;
  recurring_billing_start_date: string | null;
  setup_fee_total: number;
  setup_month_1_amount: number;
  setup_month_2_amount: number;
  jaxon_setup_split: number;
  nick_setup_split: number;
  recurring_fee_percentage: number;
  nick_recurring_split: number;
  jaxon_recurring_split: number;
  ghl_pipeline_id: string | null;
  ghl_location_id: string | null;
  stripe_customer_id: string | null;
  stripe_invoice_auto_create: boolean;
  stripe_invoice_auto_send: boolean;
  manual_revenue_entry_enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientMonthlyRevenueSnapshotRow {
  id: string;
  client_id: string;
  billing_month: string;           // date as ISO string: 'YYYY-MM-DD'
  closed_won_revenue: number;
  vault_co_fee: number;
  recurring_fee_percentage: number;
  nick_recurring_earnings: number;
  jaxon_recurring_earnings: number;
  source: 'manual' | 'ghl';
  review_status: 'draft' | 'reviewed' | 'locked';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Phase 2C: GHL sync metadata
  deal_count: number;
  source_payload: Record<string, unknown>;
  synced_at: string | null;
  reviewed_at: string | null;
  // Phase 2E: Stripe draft invoice metadata
  stripe_invoice_id: string | null;
  stripe_invoice_status: string | null;
  stripe_invoice_url: string | null;
  invoice_draft_created_at: string | null;
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

export interface GHLOpportunitySnapshotRow {
  id: string;
  client_id: string;
  ghl_location_id: string | null;
  opportunity_id: string;
  contact_id: string | null;
  pipeline_id: string | null;
  pipeline_stage_id: string | null;
  pipeline_stage_name: string | null;
  opportunity_name: string | null;
  contact_name: string | null;
  status: string | null;
  monetary_value: number | null;
  source: string | null;
  assigned_user: string | null;
  created_at_ghl: string | null;
  updated_at_ghl: string | null;
  last_activity_at: string | null;
  appointment_status: string | null;
  raw_payload: Json | null;
  synced_at: string;
  created_at: string;
}

export interface MetaCampaignSnapshotRow {
  id: string;
  client_id: string;
  meta_account_id: string | null;
  campaign_id: string;
  campaign_name: string | null;
  status: string | null;
  objective: string | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  leads: number | null;
  cpl: number | null;
  date_start: string;
  date_end: string;
  raw_payload: Json | null;
  synced_at: string;
  created_at: string;
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
      client_revenue_settings: {
        Row: ClientRevenueSettingsRow;
        Insert: Omit<ClientRevenueSettingsRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ClientRevenueSettingsRow, "id" | "created_at" | "updated_at">>;
      };
      client_monthly_revenue_snapshots: {
        Row: ClientMonthlyRevenueSnapshotRow;
        Insert: Omit<ClientMonthlyRevenueSnapshotRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ClientMonthlyRevenueSnapshotRow, "id" | "created_at" | "updated_at">>;
      };
      integration_connections: {
        Row: IntegrationConnectionRow;
        Insert: Omit<IntegrationConnectionRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<IntegrationConnectionRow, "id" | "created_at" | "updated_at">>;
      };
      meta_campaign_snapshots: {
        Row: MetaCampaignSnapshotRow;
        Insert: Omit<MetaCampaignSnapshotRow, "id" | "created_at">;
        Update: Partial<Omit<MetaCampaignSnapshotRow, "id" | "created_at">>;
      };
      ghl_opportunity_snapshots: {
        Row: GHLOpportunitySnapshotRow;
        Insert: Omit<GHLOpportunitySnapshotRow, "id" | "created_at">;
        Update: Partial<Omit<GHLOpportunitySnapshotRow, "id" | "created_at">>;
      };
      // ── Victoria AI Sales Coach tables ─────────────────
      victoria_calls: {
        Row: {
          id: string;
          prospect_id: string | null;
          rep_id: string | null;
          status: string;
          phase: string;
          is_test_call: boolean;
          outcome: string | null;
          close_probability_final: number | null;
          session_state: Record<string, unknown> | null;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id: string;
          prospect_id?: string | null;
          rep_id?: string | null;
          status?: string;
          phase?: string;
          is_test_call?: boolean;
          outcome?: string | null;
          close_probability_final?: number | null;
          session_state?: Record<string, unknown> | null;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
        };
        Update: {
          status?: string;
          phase?: string;
          outcome?: string | null;
          close_probability_final?: number | null;
          session_state?: Record<string, unknown> | null;
          ended_at?: string | null;
          duration_seconds?: number | null;
        };
      };
      victoria_transcript_chunks: {
        Row: {
          id: string;
          call_id: string;
          chunk_index: number;
          speaker: string;
          text: string;
          started_at_seconds: number | null;
          ended_at_seconds: number | null;
          contains_objection: boolean;
          contains_buying_signal: boolean;
          contains_emotional_shift: boolean;
          created_at: string;
        };
        Insert: {
          call_id: string;
          chunk_index: number;
          speaker: string;
          text: string;
          started_at_seconds?: number | null;
          ended_at_seconds?: number | null;
          contains_objection?: boolean;
          contains_buying_signal?: boolean;
          contains_emotional_shift?: boolean;
        };
        Update: Partial<{
          contains_objection: boolean;
          contains_buying_signal: boolean;
          contains_emotional_shift: boolean;
        }>;
      };
      victoria_coaching_events: {
        Row: {
          id: string;
          call_id: string;
          chunk_index: number | null;
          coaching_type: string;
          priority: string;
          headline: string;
          primary_action: string;
          why: string | null;
          suggested_language: string | null;
          what_not_to_do: string | null;
          context_tags: string[];
          confidence: number | null;
          source_agent: string;
          acknowledged: boolean;
          rep_rating: number | null;
          created_at: string;
        };
        Insert: {
          call_id: string;
          chunk_index?: number | null;
          coaching_type: string;
          priority: string;
          headline: string;
          primary_action: string;
          why?: string | null;
          suggested_language?: string | null;
          what_not_to_do?: string | null;
          context_tags?: string[];
          confidence?: number | null;
          source_agent: string;
        };
        Update: Partial<{
          acknowledged: boolean;
          rep_rating: number | null;
        }>;
      };
      victoria_objection_events: {
        Row: {
          id: string;
          call_id: string;
          prospect_id: string | null;
          chunk_index: number | null;
          raw_text: string;
          category: string;
          hidden_meaning: string | null;
          emotional_driver: string | null;
          reframe_recommended: string | null;
          follow_up_question: string | null;
          resolution: string | null;
          created_at: string;
        };
        Insert: {
          call_id: string;
          prospect_id?: string | null;
          chunk_index?: number | null;
          raw_text: string;
          category: string;
          hidden_meaning?: string | null;
          emotional_driver?: string | null;
          reframe_recommended?: string | null;
          follow_up_question?: string | null;
          resolution?: string | null;
        };
        Update: Partial<{ resolution: string | null }>;
      };
      victoria_agent_outputs: {
        Row: {
          id: string;
          call_id: string;
          agent_name: string;
          chunk_index: number | null;
          input_tokens: number | null;
          output_tokens: number | null;
          latency_ms: number | null;
          model_used: string | null;
          output: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          call_id: string;
          agent_name: string;
          chunk_index?: number | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          latency_ms?: number | null;
          model_used?: string | null;
          output: Record<string, unknown>;
        };
        Update: never;
      };
      victoria_prospects: {
        Row: {
          id: string;
          name: string;
          company: string | null;
          email: string | null;
          phone: string | null;
          vertical: string | null;
          location_city: string | null;
          location_state: string | null;
          business_size: string | null;
          years_in_business: number | null;
          personality_type: string | null;
          communication_style: string | null;
          known_pain_points: string[];
          known_objections: string[];
          known_triggers: string[];
          known_resistances: string[];
          primary_fear: string | null;
          primary_desire: string | null;
          deal_stage: string;
          last_contact: string | null;
          next_step: string | null;
          urgency_level: string;
          total_calls: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          vertical?: string | null;
          location_city?: string | null;
          location_state?: string | null;
        };
        Update: Partial<{
          name: string;
          company: string | null;
          email: string | null;
          phone: string | null;
          vertical: string | null;
          deal_stage: string;
          last_contact: string | null;
          next_step: string | null;
          urgency_level: string;
          total_calls: number;
          known_pain_points: string[];
          known_objections: string[];
          known_triggers: string[];
          known_resistances: string[];
          updated_at: string;
        }>;
      };
    };
  };
}
