// Data provider abstraction — the single interface all data access goes through.
//
// Current pages still import directly from @/lib/data (mock arrays) for read-only
// static data. This provider layer is the migration target: as each feature moves
// to real database reads/writes, it routes through here instead of touching
// mock files directly.
//
// Usage:
//   import { getDataProvider } from "@/lib/data/data-provider";
//   const db = getDataProvider();
//   const clients = await db.getClients();

import type { Client, Approval } from "@/lib/data";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import type { CreativeAsset } from "@/lib/creativeAssets";
import type { CampaignDraft, DraftStatus } from "@/lib/planStore";

// ─────────────────────────────────────────────────────────────
// Input / value types
// ─────────────────────────────────────────────────────────────

export interface ClientCreateInput {
  name: string;
  owner: string;
  email?: string;
  phone?: string;
  website?: string;
  market?: string;
  services?: string[];
  avgJobValue?: string;
  monthlyBudget?: string;
  offer?: string;
  brandTone?: string;
  notes?: string;
  status?: Client["status"];
}

export type ClientUpdateInput = Partial<ClientCreateInput>;

export interface PersistedReport {
  id: string;
  clientId: string;
  clientName?: string;
  reportType: "weekly" | "monthly" | "quarterly";
  reportPeriod: string;
  reportPeriodStart: string;
  reportPeriodEnd: string;
  spend: string;
  leads: number;
  booked: number;
  cpl: string;
  cpba: string;
  showRate: string;
  pipelineValue: string;
  revenueGenerated: string;
  wins: string[];
  issues: string[];
  nextActions: string[];
  generatedContent?: {
    reportTitle: string;
    executiveSummary: string;
    winsSection: string;
    issuesSection: string;
    nextActionsSection: string;
    agentRecommendations: string[];
    clientReadyNarrative: string;
    approvalNote: string;
  };
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Provider interface
// ─────────────────────────────────────────────────────────────

export interface DataProvider {
  readonly name: "mock" | "supabase";

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | null>;
  addClient(data: ClientCreateInput): Promise<Client>;
  updateClient(id: string, updates: ClientUpdateInput): Promise<void>;

  // Approvals (static + DB)
  getApprovals(): Promise<Approval[]>;

  // Client Intelligence
  getClientIntelligence(clientId: string): Promise<ClientIntelligence | null>;
  saveClientIntelligence(clientId: string, intel: ClientIntelligence): Promise<void>;

  // Creative Assets
  getCreativeAssets(clientId?: string): Promise<CreativeAsset[]>;
  saveCreativeAsset(asset: CreativeAsset): Promise<CreativeAsset>;
  updateCreativeAssetStatus(id: string, status: CreativeAsset["status"], approvedForAds?: boolean): Promise<void>;

  // Campaign Drafts
  getCampaignDrafts(clientId?: string): Promise<CampaignDraft[]>;
  getCampaignDraft(id: string): Promise<CampaignDraft | null>;
  saveCampaignDraft(draft: CampaignDraft): Promise<CampaignDraft>;
  updateCampaignStatus(id: string, status: DraftStatus): Promise<void>;
  deleteCampaignDraft(id: string): Promise<void>;

  // Reports
  getReports(clientId?: string): Promise<PersistedReport[]>;
  saveReport(report: PersistedReport): Promise<PersistedReport>;
  updateReportStatus(id: string, status: "draft" | "published"): Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// Factory — returns the right provider based on env vars
// ─────────────────────────────────────────────────────────────

let _provider: DataProvider | null = null;

export function getDataProvider(): DataProvider {
  if (_provider) return _provider;

  const hasSupabase =
    typeof process !== "undefined" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (hasSupabase) {
    // Lazy import to avoid pulling Supabase into mock-only builds
    const { SupabaseDataProvider } = require("./supabase-provider");
    _provider = new SupabaseDataProvider();
  } else {
    const { MockDataProvider } = require("./mock-provider");
    _provider = new MockDataProvider();
  }

  return _provider!;
}

// Reset the cached provider (useful in tests or when env changes)
export function resetDataProvider(): void {
  _provider = null;
}
