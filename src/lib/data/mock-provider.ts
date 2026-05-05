// Mock data provider — returns in-memory data from existing mock files.
// Active when Supabase env vars are not configured.
// All writes are no-ops or in-memory only (no persistence across page reloads).

import { clients, approvals, getClient as getClientFromData } from "@/lib/data";
import type { Client, Approval } from "@/lib/data";
import {
  KACZMAR_INTELLIGENCE,
  type ClientIntelligence,
} from "@/lib/clientIntelligence";
import {
  MOCK_CREATIVE_ASSETS,
  getAssetsForClient,
  type CreativeAsset,
} from "@/lib/creativeAssets";
import type { CampaignDraft, DraftStatus } from "@/lib/planStore";
import type { DataProvider, ClientCreateInput, ClientUpdateInput, PersistedReport } from "./data-provider";

// In-memory stores for writes during a session
const _intelligenceStore = new Map<string, ClientIntelligence>([
  ["kaczmar-builders", KACZMAR_INTELLIGENCE],
]);
const _assetStore = new Map<string, CreativeAsset>(
  MOCK_CREATIVE_ASSETS.map((a) => [a.id, a])
);
const _draftStore = new Map<string, CampaignDraft>();
const _reportStore = new Map<string, PersistedReport>();
// Added clients are stored here so they appear alongside the static mock array
const _addedClients: Client[] = [];

export class MockDataProvider implements DataProvider {
  readonly name = "mock" as const;

  // ── Clients ──────────────────────────────────────────────

  async getClients(): Promise<Client[]> {
    return [...clients, ..._addedClients];
  }

  async getClient(id: string): Promise<Client | null> {
    return (
      getClientFromData(id) ??
      _addedClients.find((c) => c.id === id) ??
      null
    );
  }

  async addClient(data: ClientCreateInput): Promise<Client> {
    const id = `client-${Date.now()}`;
    const newClient: Client = {
      id,
      name: data.name,
      owner: data.owner,
      email: data.email ?? "",
      phone: data.phone ?? "",
      website: data.website ?? "",
      market: data.market ?? "",
      services: data.services ?? [],
      avgJobValue: data.avgJobValue ?? "",
      monthlyBudget: data.monthlyBudget ?? "",
      offer: data.offer ?? "",
      brandTone: data.brandTone ?? "",
      status: data.status ?? "onboarding",
      notes: data.notes ?? "",
      metaAccountId: "",
      pixelId: "",
      fbPageId: "",
      instagramId: "",
      ghlLocationId: "",
      ghlPipelineId: "",
      stats: {
        leads: 0, booked: 0, cpl: "—", cpba: "—",
        showRate: "—", pipeline: "—", revenue: "—", spend: "$0",
      },
      campaigns: [],
    };
    _addedClients.push(newClient);
    return newClient;
  }

  async updateClient(id: string, updates: ClientUpdateInput): Promise<void> {
    const idx = _addedClients.findIndex((c) => c.id === id);
    if (idx >= 0) {
      const existing = _addedClients[idx];
      _addedClients[idx] = {
        ...existing,
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.owner !== undefined && { owner: updates.owner }),
        ...(updates.email !== undefined && { email: updates.email }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
        ...(updates.website !== undefined && { website: updates.website }),
        ...(updates.market !== undefined && { market: updates.market }),
        ...(updates.services !== undefined && { services: updates.services }),
        ...(updates.avgJobValue !== undefined && { avgJobValue: updates.avgJobValue }),
        ...(updates.monthlyBudget !== undefined && { monthlyBudget: updates.monthlyBudget }),
        ...(updates.offer !== undefined && { offer: updates.offer }),
        ...(updates.brandTone !== undefined && { brandTone: updates.brandTone }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.status !== undefined && { status: updates.status }),
      };
    }
    // Static mock clients are read-only — silently succeed
  }

  // ── Approvals ────────────────────────────────────────────

  async getApprovals(): Promise<Approval[]> {
    return approvals;
  }

  // ── Client Intelligence ───────────────────────────────────

  async getClientIntelligence(clientId: string): Promise<ClientIntelligence | null> {
    return _intelligenceStore.get(clientId) ?? null;
  }

  async saveClientIntelligence(clientId: string, intel: ClientIntelligence): Promise<void> {
    _intelligenceStore.set(clientId, { ...intel, clientId });
  }

  // ── Creative Assets ───────────────────────────────────────

  async getCreativeAssets(clientId?: string): Promise<CreativeAsset[]> {
    const all = Array.from(_assetStore.values());
    return clientId ? getAssetsForClient(clientId, all) : all;
  }

  async saveCreativeAsset(asset: CreativeAsset): Promise<CreativeAsset> {
    const saved = { ...asset };
    _assetStore.set(saved.id, saved);
    return saved;
  }

  async updateCreativeAssetStatus(
    id: string,
    status: CreativeAsset["status"],
    approvedForAds?: boolean
  ): Promise<void> {
    const existing = _assetStore.get(id);
    if (!existing) return;
    _assetStore.set(id, {
      ...existing,
      status,
      ...(approvedForAds !== undefined ? { approvedForAds } : {}),
    });
  }

  // ── Campaign Drafts ───────────────────────────────────────

  async getCampaignDrafts(clientId?: string): Promise<CampaignDraft[]> {
    const all = Array.from(_draftStore.values());
    return clientId ? all.filter((d) => d.clientId === clientId) : all;
  }

  async getCampaignDraft(id: string): Promise<CampaignDraft | null> {
    return _draftStore.get(id) ?? null;
  }

  async saveCampaignDraft(draft: CampaignDraft): Promise<CampaignDraft> {
    _draftStore.set(draft.id, draft);
    return draft;
  }

  async updateCampaignStatus(id: string, status: DraftStatus): Promise<void> {
    const existing = _draftStore.get(id);
    if (!existing) return;
    _draftStore.set(id, { ...existing, status, approvalStatus: status });
  }

  async deleteCampaignDraft(id: string): Promise<void> {
    _draftStore.delete(id);
  }

  // ── Reports ───────────────────────────────────────────────

  async getReports(clientId?: string): Promise<PersistedReport[]> {
    const all = Array.from(_reportStore.values());
    return clientId ? all.filter((r) => r.clientId === clientId) : all;
  }

  async saveReport(report: PersistedReport): Promise<PersistedReport> {
    _reportStore.set(report.id, report);
    return report;
  }

  async updateReportStatus(id: string, status: "draft" | "published"): Promise<void> {
    const existing = _reportStore.get(id);
    if (existing) _reportStore.set(id, { ...existing, status });
  }
}
