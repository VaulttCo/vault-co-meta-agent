import type { StorageProvider } from "./storage-provider";
import type { ClientFile } from "./types";

const SEED_FILES: ClientFile[] = [
  {
    id: "file-001",
    clientId: "kaczmar-builders",
    fileName: "kaczmar_onboarding_intake_may2026.pdf",
    fileType: "pdf",
    fileSize: 247552,
    mimeType: "application/pdf",
    category: "onboarding_summary",
    storageUrl: "/mock/files/kaczmar_onboarding_intake_may2026.pdf",
    thumbnailUrl: null,
    uploadedBy: "Nick Moore",
    uploadedAt: "May 2, 2026",
    notes: "Full onboarding intake call transcript — Stanley Kaczmar. Includes company profile, buyer psychology, KPI baseline, and campaign implications.",
    status: "active",
  },
  {
    id: "file-002",
    clientId: "kaczmar-builders",
    fileName: "kaczmar_builders_contract_2026.pdf",
    fileType: "pdf",
    fileSize: 184320,
    mimeType: "application/pdf",
    category: "contract",
    storageUrl: "/mock/files/kaczmar_builders_contract_2026.pdf",
    thumbnailUrl: null,
    uploadedBy: "Nick Moore",
    uploadedAt: "May 2, 2026",
    notes: "Signed agency services agreement — Kaczmar Builders. 6-month term starting May 2026.",
    status: "active",
  },
  {
    id: "file-003",
    clientId: "kaczmar-builders",
    fileName: "kaczmar_brand_kit_logos.zip",
    fileType: "other",
    fileSize: 4194304,
    mimeType: "application/zip",
    category: "client_asset",
    storageUrl: "/mock/files/kaczmar_brand_kit_logos.zip",
    thumbnailUrl: null,
    uploadedBy: "Nick Moore",
    uploadedAt: "May 3, 2026",
    notes: "Logo files, brand colors (hex values), and brand guidelines PDF.",
    status: "pending",
  },
  {
    id: "file-004",
    clientId: "jj-roofing-group",
    fileName: "jj_roofing_onboarding_march2026.pdf",
    fileType: "pdf",
    fileSize: 198656,
    mimeType: "application/pdf",
    category: "onboarding_summary",
    storageUrl: "/mock/files/jj_roofing_onboarding_march2026.pdf",
    thumbnailUrl: null,
    uploadedBy: "Nick Moore",
    uploadedAt: "Mar 5, 2026",
    notes: "Initial onboarding intake — Jason Johnson, JJ Roofing Group. Tempe, AZ market.",
    status: "active",
  },
  {
    id: "file-005",
    clientId: "jj-roofing-group",
    fileName: "jj_roofing_weekly_report_apr28.pdf",
    fileType: "pdf",
    fileSize: 87040,
    mimeType: "application/pdf",
    category: "report",
    storageUrl: "/mock/files/jj_roofing_weekly_report_apr28.pdf",
    thumbnailUrl: null,
    uploadedBy: "Veronica",
    uploadedAt: "Apr 28, 2026",
    notes: "Weekly performance report — 27 leads, $55.56 CPL, 71% show rate. Approved for client delivery.",
    status: "active",
  },
  {
    id: "file-006",
    clientId: "acorns-roofing",
    fileName: "acorns_roofing_intake_notes.pdf",
    fileType: "pdf",
    fileSize: 132096,
    mimeType: "application/pdf",
    category: "onboarding_summary",
    storageUrl: "/mock/files/acorns_roofing_intake_notes.pdf",
    thumbnailUrl: null,
    uploadedBy: "Nick Moore",
    uploadedAt: "Apr 25, 2026",
    notes: "Onboarding notes from intake call with Derek Shields. Intelligence not yet extracted.",
    status: "active",
  },
  {
    id: "file-007",
    clientId: "open-forge-construction",
    fileName: "openforge_discovery_call_notes.pdf",
    fileType: "pdf",
    fileSize: 154624,
    mimeType: "application/pdf",
    category: "onboarding_summary",
    storageUrl: "/mock/files/openforge_discovery_call_notes.pdf",
    thumbnailUrl: null,
    uploadedBy: "Nick Moore",
    uploadedAt: "Mar 12, 2026",
    notes: "Discovery call notes — Marcus Webb, Open Forge Construction. Kitchen and bathroom remodeling focus. Georgia market.",
    status: "active",
  },
  {
    id: "file-008",
    clientId: "open-forge-construction",
    fileName: "openforge_contract_march2026.pdf",
    fileType: "pdf",
    fileSize: 176128,
    mimeType: "application/pdf",
    category: "contract",
    storageUrl: "/mock/files/openforge_contract_march2026.pdf",
    thumbnailUrl: null,
    uploadedBy: "Nick Moore",
    uploadedAt: "Mar 15, 2026",
    notes: "Signed agency agreement — Open Forge Construction. 3-month initial term.",
    status: "active",
  },
];

export class MockStorageProvider implements StorageProvider {
  readonly name = "mock" as const;
  private _store: Map<string, ClientFile>;

  constructor() {
    this._store = new Map(SEED_FILES.map((f) => [f.id, f]));
  }

  async getFiles(clientId?: string): Promise<ClientFile[]> {
    const all = Array.from(this._store.values());
    return clientId ? all.filter((f) => f.clientId === clientId) : all;
  }

  async getFile(id: string): Promise<ClientFile | null> {
    return this._store.get(id) ?? null;
  }

  async saveFile(file: ClientFile): Promise<ClientFile> {
    this._store.set(file.id, file);
    return file;
  }

  async deleteFile(id: string): Promise<void> {
    this._store.delete(id);
  }

  async updateFileStatus(id: string, status: ClientFile["status"]): Promise<void> {
    const f = this._store.get(id);
    if (f) this._store.set(id, { ...f, status });
  }
}
