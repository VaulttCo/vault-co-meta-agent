// Supabase data provider — active when NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
//
// Each method falls back to the mock provider when Supabase returns an error
// or when the table is empty, so the app stays fully functional during migration.

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  ClientRow,
  ClientIntelligenceRow,
  CreativeAssetRow,
  CampaignDraftRow,
  ReportRow,
} from "@/lib/supabase/types";
import { MockDataProvider } from "./mock-provider";
import type { DataProvider, ClientCreateInput, ClientUpdateInput, PersistedReport } from "./data-provider";
import type { Client, Approval } from "@/lib/data";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import type { CreativeAsset } from "@/lib/creativeAssets";
import type { CampaignDraft, DraftStatus } from "@/lib/planStore";

// Supabase's generated types require exact schema-match to infer correctly.
// Until we generate types from the live project, we cast through `any` at the
// query boundary and rely on our own Row interfaces for type safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;
const cast = <T>(v: unknown): T => v as T;

// ── Row → App type mappers ────────────────────────────────────

function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.company_name,
    owner: row.owner_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    market: row.service_areas[0] ?? "",
    services: row.services_offered,
    avgJobValue: row.average_job_value ?? "",
    monthlyBudget: row.monthly_ad_budget ?? "",
    offer: row.offer ?? "",
    brandTone: row.brand_tone ?? "",
    status: row.status,
    notes: row.notes ?? "",
    metaAccountId: row.meta_ad_account_id ?? "",
    pixelId: row.meta_pixel_id ?? "",
    fbPageId: row.facebook_page_id ?? "",
    instagramId: row.instagram_account_id ?? "",
    ghlLocationId: row.ghl_location_id ?? "",
    ghlPipelineId: row.ghl_pipeline_id ?? "",
    stats: {
      leads: 0, booked: 0, cpl: "$0", cpba: "$0",
      showRate: "0%", pipeline: "$0", revenue: "$0", spend: "$0",
    },
    campaigns: [],
  };
}

function rowToAsset(row: CreativeAssetRow): CreativeAsset {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: "",
    fileName: row.file_name,
    fileType: cast<CreativeAsset["fileType"]>(row.file_type),
    assetType: cast<CreativeAsset["assetType"]>(row.asset_type),
    category: cast<CreativeAsset["category"]>((row as unknown as Record<string, unknown>)["category"] ?? "Creative Asset"),
    thumbnailUrl: row.thumbnail_url ?? "",
    uploadDate: row.upload_date,
    service: row.service ?? "",
    market: row.market ?? "",
    campaignUseCase: row.campaign_use_case ?? "",
    notes: row.notes ?? "",
    status: row.status,
    tags: row.tags,
    approvedForAds: row.approved_for_ads,
  };
}

function rowToDraft(row: CampaignDraftRow): CampaignDraft {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: "",
    campaignName: row.campaign_name,
    market: row.market,
    service: row.service,
    goal: row.goal,
    budget: row.budget,
    creativeType: row.creative_type ?? "",
    status: row.status,
    approvalStatus: row.approval_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    metaStructure: cast(row.meta_campaign_structure),
    adCopy: cast(row.ad_copy),
    leadForm: cast(row.lead_form),
    ghlWorkflow: cast(row.ghl_workflow),
    creativeDirection: cast(row.creative_direction),
    compliance: cast(row.compliance_check),
    optimization: cast(row.optimization_rules),
    buyerPsychologyUsed: cast(row.buyer_psychology_used ?? undefined),
    marketResearchUsed: cast(row.market_research_used ?? undefined),
    clientIntelligenceUsed: cast(row.client_intelligence_used ?? undefined),
    creativeIntelligenceUsed: cast(row.creative_intelligence_used ?? undefined),
    strategicRationale: cast(row.strategic_rationale ?? undefined),
  };
}

function rowToReport(row: ReportRow): PersistedReport {
  return {
    id: row.id,
    clientId: row.client_id,
    reportType: cast<PersistedReport["reportType"]>(row.report_type),
    reportPeriod: row.report_period ?? "",
    reportPeriodStart: row.report_period_start,
    reportPeriodEnd: row.report_period_end,
    spend: row.spend !== null ? `$${row.spend}` : "$0",
    leads: row.leads ?? 0,
    booked: row.booked_appointments ?? 0,
    cpl: row.cpl !== null ? `$${row.cpl}` : "—",
    cpba: row.cpba !== null ? `$${row.cpba}` : "—",
    showRate: row.show_rate !== null ? `${Math.round(row.show_rate * 100)}%` : "—",
    pipelineValue: row.pipeline_value !== null ? `$${row.pipeline_value.toLocaleString()}` : "$0",
    revenueGenerated: row.revenue_generated !== null ? `$${row.revenue_generated.toLocaleString()}` : "$0",
    wins: row.wins,
    issues: row.issues,
    nextActions: row.next_actions,
    generatedContent: cast(row.generated_content ?? undefined),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Provider ──────────────────────────────────────────────────

export class SupabaseDataProvider implements DataProvider {
  readonly name = "supabase" as const;
  private mock = new MockDataProvider();

  // Returns the Supabase client cast to any — avoids fighting complex generic
  // type inference until we generate types from the live project schema.
  private get db(): AnyClient | null {
    return getSupabaseBrowserClient() as AnyClient | null;
  }

  // ── Clients ──────────────────────────────────────────────

  async getClients(): Promise<Client[]> {
    const supabase = this.db;
    if (!supabase) return this.mock.getClients();

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("company_name");

    if (error) {
      console.warn("[SupabaseProvider] getClients:", error.message);
      return this.mock.getClients();
    }
    return (data as ClientRow[]).map(rowToClient);
  }

  async getClient(id: string): Promise<Client | null> {
    const supabase = this.db;
    if (!supabase) return this.mock.getClient(id);

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return this.mock.getClient(id);
    return rowToClient(data as ClientRow);
  }

  async addClient(data: ClientCreateInput): Promise<Client> {
    const supabase = this.db;
    if (!supabase) return this.mock.addClient(data);

    const { data: row, error } = await supabase
      .from("clients")
      .insert({
        company_name: data.name,
        owner_name: data.owner,
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        service_areas: data.market ? [data.market] : [],
        services_offered: data.services ?? [],
        average_job_value: data.avgJobValue || null,
        monthly_ad_budget: data.monthlyBudget || null,
        offer: data.offer || null,
        brand_tone: data.brandTone || null,
        notes: data.notes || null,
        status: data.status ?? "onboarding",
      })
      .select()
      .single();

    if (error || !row) {
      console.error("[SupabaseProvider] addClient:", error?.message);
      return this.mock.addClient(data);
    }
    return rowToClient(row as ClientRow);
  }

  async updateClient(id: string, updates: ClientUpdateInput): Promise<void> {
    const supabase = this.db;
    if (!supabase) return;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.company_name = updates.name;
    if (updates.owner !== undefined) dbUpdates.owner_name = updates.owner;
    if (updates.email !== undefined) dbUpdates.email = updates.email || null;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
    if (updates.website !== undefined) dbUpdates.website = updates.website || null;
    if (updates.market !== undefined) dbUpdates.service_areas = updates.market ? [updates.market] : [];
    if (updates.services !== undefined) dbUpdates.services_offered = updates.services;
    if (updates.avgJobValue !== undefined) dbUpdates.average_job_value = updates.avgJobValue || null;
    if (updates.monthlyBudget !== undefined) dbUpdates.monthly_ad_budget = updates.monthlyBudget || null;
    if (updates.offer !== undefined) dbUpdates.offer = updates.offer || null;
    if (updates.brandTone !== undefined) dbUpdates.brand_tone = updates.brandTone || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await supabase
      .from("clients")
      .update(dbUpdates)
      .eq("id", id);

    if (error) console.error("[SupabaseProvider] updateClient:", error.message);
  }

  // ── Approvals ────────────────────────────────────────────

  async getApprovals(): Promise<Approval[]> {
    const supabase = this.db;
    if (!supabase) return this.mock.getApprovals();

    const { data, error } = await supabase
      .from("approvals")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error || !data?.length) {
      if (error) console.warn("[SupabaseProvider] getApprovals:", error.message);
      return this.mock.getApprovals();
    }

    return (data as any[]).map((row, i): Approval => ({
      id: i + 1,
      clientId: row.client_id ?? "",
      clientName: row.client_id ?? "",
      type: row.approval_type ?? "campaign",
      item: row.title ?? "Untitled",
      detail: row.description ?? "",
      priority: (row.risk_level === "high" ? "high" : row.risk_level === "medium" ? "medium" : "low") as Approval["priority"],
      submittedBy: row.requested_by ?? "Veronica",
      submittedAt: row.submitted_at ?? row.created_at ?? new Date().toISOString(),
      iconType: row.approval_type === "campaign" ? "campaign" : row.approval_type === "budget" ? "budget" : "report",
    }));
  }

  // ── Client Intelligence ───────────────────────────────────

  async getClientIntelligence(clientId: string): Promise<ClientIntelligence | null> {
    const supabase = this.db;
    if (!supabase) return this.mock.getClientIntelligence(clientId);

    const { data, error } = await supabase
      .from("client_intelligence")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (error || !data) return this.mock.getClientIntelligence(clientId);

    const row = data as ClientIntelligenceRow;
    return {
      clientId,
      extractedAt: row.updated_at,
      onboardingSummary: row.onboarding_summary ?? "",
      companyProfile: cast<ClientIntelligence["companyProfile"]>(row.company_profile),
      serviceArea: cast<ClientIntelligence["serviceArea"]>(row.service_area),
      targetMarket: cast<ClientIntelligence["targetMarket"]>(row.target_market),
      buyerProfile: cast<ClientIntelligence["buyerProfile"]>(row.buyer_profile),
      marketResearch: cast<ClientIntelligence["marketResearch"]>(row.market_research),
      offerIntelligence: cast<ClientIntelligence["offerIntelligence"]>(row.offer_intelligence),
      salesIntelligence: cast<ClientIntelligence["salesIntelligence"]>(row.sales_intelligence),
      brandIntelligence: cast<ClientIntelligence["brandIntelligence"]>(row.brand_intelligence),
      kpiBaseline: cast<ClientIntelligence["kpiBaseline"]>(row.kpi_baseline),
      salesAudit: cast<ClientIntelligence["salesAudit"]>(row.sales_audit),
      contentPlanning: cast<ClientIntelligence["contentPlanning"]>(row.content_planning),
      campaignImplications: cast<ClientIntelligence["campaignImplications"]>(row.campaign_implications),
    };
  }

  async saveClientIntelligence(clientId: string, intel: ClientIntelligence): Promise<void> {
    const supabase = this.db;
    if (!supabase) return this.mock.saveClientIntelligence(clientId, intel);

    const { error } = await supabase.from("client_intelligence").upsert({
      client_id: clientId,
      onboarding_summary: intel.onboardingSummary,
      company_profile: intel.companyProfile,
      service_area: intel.serviceArea,
      target_market: intel.targetMarket,
      buyer_profile: intel.buyerProfile,
      market_research: intel.marketResearch,
      offer_intelligence: intel.offerIntelligence,
      sales_intelligence: intel.salesIntelligence,
      brand_intelligence: intel.brandIntelligence,
      kpi_baseline: intel.kpiBaseline,
      sales_audit: intel.salesAudit,
      content_planning: intel.contentPlanning,
      campaign_implications: intel.campaignImplications,
    }, { onConflict: "client_id" });

    if (error) console.error("[SupabaseProvider] saveClientIntelligence:", error.message);
  }

  // ── Creative Assets ───────────────────────────────────────

  async getCreativeAssets(clientId?: string): Promise<CreativeAsset[]> {
    const supabase = this.db;
    if (!supabase) return this.mock.getCreativeAssets(clientId);

    let query = supabase
      .from("creative_assets")
      .select("*")
      .order("upload_date", { ascending: false });

    if (clientId) query = query.eq("client_id", clientId);

    const { data, error } = await query;

    if (error) {
      console.warn("[SupabaseProvider] getCreativeAssets:", error.message);
      return this.mock.getCreativeAssets(clientId);
    }
    return (data as CreativeAssetRow[]).map(rowToAsset);
  }

  async saveCreativeAsset(asset: CreativeAsset): Promise<CreativeAsset> {
    const supabase = this.db;
    if (!supabase) return this.mock.saveCreativeAsset(asset);

    const { error } = await supabase.from("creative_assets").upsert({
      id: asset.id,
      client_id: asset.clientId,
      file_name: asset.fileName,
      file_type: asset.fileType,
      asset_type: asset.assetType,
      thumbnail_url: asset.thumbnailUrl || null,
      upload_date: asset.uploadDate,
      service: asset.service || null,
      market: asset.market || null,
      campaign_use_case: asset.campaignUseCase || null,
      notes: asset.notes || null,
      status: asset.status,
      tags: asset.tags,
      approved_for_ads: asset.approvedForAds,
    });

    if (error) console.error("[SupabaseProvider] saveCreativeAsset:", error.message);
    return asset;
  }

  async updateCreativeAssetStatus(
    id: string,
    status: CreativeAsset["status"],
    approvedForAds?: boolean
  ): Promise<void> {
    const supabase = this.db;
    if (!supabase) return this.mock.updateCreativeAssetStatus(id, status, approvedForAds);

    const update: Record<string, unknown> = { status };
    if (approvedForAds !== undefined) update.approved_for_ads = approvedForAds;

    const { error } = await supabase
      .from("creative_assets")
      .update(update)
      .eq("id", id);

    if (error) console.error("[SupabaseProvider] updateCreativeAssetStatus:", error.message);
  }

  // ── Campaign Drafts ───────────────────────────────────────

  async getCampaignDrafts(clientId?: string): Promise<CampaignDraft[]> {
    const supabase = this.db;
    if (!supabase) return this.mock.getCampaignDrafts(clientId);

    let query = supabase
      .from("campaign_drafts")
      .select("*")
      .order("created_at", { ascending: false });

    if (clientId) query = query.eq("client_id", clientId);

    const { data, error } = await query;

    if (error) {
      console.warn("[SupabaseProvider] getCampaignDrafts:", error.message);
      return this.mock.getCampaignDrafts(clientId);
    }
    return (data as CampaignDraftRow[]).map(rowToDraft);
  }

  async getCampaignDraft(id: string): Promise<CampaignDraft | null> {
    const supabase = this.db;
    if (!supabase) return this.mock.getCampaignDraft(id);

    const { data, error } = await supabase
      .from("campaign_drafts")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return this.mock.getCampaignDraft(id);
    return rowToDraft(data as CampaignDraftRow);
  }

  async saveCampaignDraft(draft: CampaignDraft): Promise<CampaignDraft> {
    const supabase = this.db;
    if (!supabase) return this.mock.saveCampaignDraft(draft);

    const { error } = await supabase.from("campaign_drafts").upsert({
      id: draft.id,
      client_id: draft.clientId,
      campaign_name: draft.campaignName,
      market: draft.market,
      service: draft.service,
      goal: draft.goal,
      budget: draft.budget,
      creative_type: draft.creativeType || null,
      creative_asset_id: draft.selectedCreativeAssetId ?? null,
      status: draft.status,
      approval_status: draft.approvalStatus,
      meta_campaign_structure: draft.metaStructure,
      ad_copy: draft.adVariations?.length
        ? { ...draft.adCopy, asset_variations: draft.adVariations }
        : draft.adCopy,
      lead_form: draft.leadForm,
      ghl_workflow: draft.ghlWorkflow,
      creative_direction: draft.creativeDirection,
      compliance_check: draft.compliance,
      optimization_rules: draft.optimization,
      buyer_psychology_used: draft.buyerPsychologyUsed ?? null,
      market_research_used: draft.marketResearchUsed ?? null,
      client_intelligence_used: draft.clientIntelligenceUsed ?? null,
      creative_intelligence_used: draft.creativeIntelligenceUsed ?? null,
      strategic_rationale: draft.strategicRationale ?? null,
      created_by: draft.createdBy,
    });

    if (error) console.error("[SupabaseProvider] saveCampaignDraft:", error.message);
    return draft;
  }

  async updateCampaignStatus(id: string, status: DraftStatus): Promise<void> {
    const supabase = this.db;
    if (!supabase) return this.mock.updateCampaignStatus(id, status);

    const { error } = await supabase
      .from("campaign_drafts")
      .update({ status, approval_status: status })
      .eq("id", id);

    if (error) console.error("[SupabaseProvider] updateCampaignStatus:", error.message);
  }

  async deleteCampaignDraft(id: string): Promise<void> {
    const supabase = this.db;
    if (!supabase) return this.mock.deleteCampaignDraft(id);

    const { error } = await supabase
      .from("campaign_drafts")
      .delete()
      .eq("id", id);

    if (error) console.error("[SupabaseProvider] deleteCampaignDraft:", error.message);
  }

  // ── Reports ───────────────────────────────────────────────

  async getReports(clientId?: string): Promise<PersistedReport[]> {
    const supabase = this.db;
    if (!supabase) return this.mock.getReports(clientId);

    let query = supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (clientId) query = query.eq("client_id", clientId);

    const { data, error } = await query;

    if (error) {
      console.warn("[SupabaseProvider] getReports:", error.message);
      return this.mock.getReports(clientId);
    }
    return (data as ReportRow[]).map(rowToReport);
  }

  async saveReport(report: PersistedReport): Promise<PersistedReport> {
    const supabase = this.db;
    if (!supabase) return this.mock.saveReport(report);

    // Parse numeric values from string representations
    const parseNum = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || null;
    const parseRate = (s: string) => {
      const n = parseFloat(s.replace(/[^0-9.]/g, ""));
      return isNaN(n) ? null : n / 100;
    };

    const { error } = await supabase.from("reports").upsert({
      id: report.id,
      client_id: report.clientId,
      report_type: report.reportType,
      report_period: report.reportPeriod,
      report_period_start: report.reportPeriodStart,
      report_period_end: report.reportPeriodEnd,
      spend: parseNum(report.spend),
      leads: report.leads,
      booked_appointments: report.booked,
      cpl: parseNum(report.cpl),
      cpba: parseNum(report.cpba),
      show_rate: parseRate(report.showRate),
      pipeline_value: parseNum(report.pipelineValue),
      revenue_generated: parseNum(report.revenueGenerated),
      wins: report.wins,
      issues: report.issues,
      next_actions: report.nextActions,
      generated_content: report.generatedContent ?? null,
      status: report.status,
    });

    if (error) console.error("[SupabaseProvider] saveReport:", error.message);
    return report;
  }

  async updateReportStatus(id: string, status: "draft" | "published"): Promise<void> {
    const supabase = this.db;
    if (!supabase) return this.mock.updateReportStatus(id, status);

    const { error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", id);

    if (error) console.error("[SupabaseProvider] updateReportStatus:", error.message);
  }
}
