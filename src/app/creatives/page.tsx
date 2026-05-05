"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus,
  Search,
  ImageIcon,
  Video,
  CheckCircle2,
  AlertCircle,
  Film,
  X,
  ChevronDown,
  Tag,
  Filter,
  Upload,
  ShieldCheck,
  Database,
  HardDrive,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  ALL_ASSET_TYPES,
  ALL_ASSET_CATEGORIES,
  ALL_ASSET_STATUSES,
  assetTypeColors,
  assetStatusVariant,
  type CreativeAsset,
  type AssetType,
  type AssetStatus,
  type AssetCategory,
} from "@/lib/creativeAssets";
import { usePersistedCreativeAssets } from "@/lib/usePersistedCreativeAssets";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import { useAuth } from "@/components/AuthProvider";

// ─────────────────────────────────────────────────────────────
// Upload modal
// ─────────────────────────────────────────────────────────────
function UploadModal({
  onClose,
  onAdd,
  usingSupabase,
  clients,
}: {
  onClose: () => void;
  onAdd: (asset: CreativeAsset) => Promise<void>;
  usingSupabase: boolean;
  clients: Client[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fileName: "",
    fileType: "video" as "image" | "video",
    assetType: "Before/After" as AssetType,
    category: "Creative Asset" as AssetCategory,
    clientId: "",
    service: "",
    market: "",
    campaignUseCase: "",
    notes: "",
    status: "Uploaded" as AssetStatus,
    approvedForAds: false,
  });
  const selectedClient = clients.find((c) => c.id === form.clientId);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPickedFileName(file.name);
      setForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileType: file.type.startsWith("image/") ? "image" : "video",
      }));
    }
  }

  async function handleSubmit() {
    if (!form.fileName || !form.clientId) return;
    const client = clients.find((c) => c.id === form.clientId);
    setSaving(true);
    await onAdd({
      id: `ca-new-${Date.now()}`,
      clientId: form.clientId,
      clientName: client?.name ?? form.clientId,
      fileName: form.fileName,
      fileType: form.fileType,
      assetType: form.assetType,
      category: form.category,
      thumbnailUrl: null,
      uploadDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      service: form.service || selectedClient?.services[0] || "",
      market: form.market || selectedClient?.market || "",
      campaignUseCase: form.campaignUseCase,
      notes: form.notes,
      status: form.status,
      tags: [],
      approvedForAds: form.approvedForAds,
    });
    setSaving(false);
    onClose();
  }

  const labelCls = "text-[11px] font-semibold text-[#3d4f6e] uppercase tracking-wider mb-1 block";
  const inputCls = "w-full bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg px-3 py-2 text-[12px] text-[#f8f8f7] placeholder-[#3d4f6e] focus:outline-none focus:border-[#0081f2]/50 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0, 129, 242, 0.15)]">
          <div className="flex items-center gap-2">
            <Film size={14} className="text-[#ff8400]" />
            <span className="text-[13px] font-semibold text-[#f8f8f7]">Upload Creative Asset</span>
          </div>
          <button onClick={onClose} className="text-[#6b7a99] hover:text-[#f8f8f7] transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Storage mode notice */}
          <div className="flex items-start gap-2 px-3 py-2.5 bg-[#3d4f6e]/15 border border-[#3d4f6e]/30 rounded-lg">
            {usingSupabase ? (
              <Database size={11} className="text-[#22c55e] flex-shrink-0 mt-0.5" />
            ) : (
              <HardDrive size={11} className="text-[#6b7a99] flex-shrink-0 mt-0.5" />
            )}
            <p className="text-[11px] text-[#6b7a99]">
              {usingSupabase ? (
                <><span className="text-[#22c55e] font-semibold">Supabase connected. </span>Asset metadata will be saved to the database.</>
              ) : (
                <><span className="text-[#f8f8f7] font-semibold">Local storage mode. </span>Asset metadata is saved in your browser and persists across refreshes. Connect Supabase to share across devices.</>
              )}
            </p>
          </div>
          {/* Drop zone */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi,.webm"
            onChange={handleFileChange}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[rgba(0, 129, 242, 0.15)] rounded-xl p-8 text-center hover:border-[rgba(0, 129, 242, 0.25)] transition-colors cursor-pointer"
          >
            {pickedFileName ? (
              <div className="space-y-1">
                <Upload size={18} className="text-[#ff8400] mx-auto" />
                <div className="text-[12px] font-semibold text-[#f8f8f7]">{pickedFileName}</div>
                <div className="text-[10px] text-[#6b7a99]">Click to change file</div>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] flex items-center justify-center mx-auto mb-3">
                  <ImageIcon size={16} className="text-[#3d4f6e]" />
                </div>
                <div className="text-[12px] text-[#6b7a99]">
                  Drop file here or <span className="text-[#0081f2]">browse</span>
                </div>
                <div className="text-[10px] text-[#3d4f6e] mt-1">JPG, PNG, MP4, MOV · Max 100MB</div>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>File Name *</label>
              <input
                className={inputCls}
                placeholder="my_creative.mp4"
                value={form.fileName}
                onChange={(e) => setForm({ ...form, fileName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>File Type</label>
              <div className="flex gap-2">
                {(["video", "image"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, fileType: t })}
                    className={`flex-1 py-2 text-[11px] font-medium rounded-lg border transition-colors capitalize ${
                      form.fileType === t
                        ? "bg-[#0081f2]/10 border-[#0081f2]/40 text-[#0081f2]"
                        : "bg-[#0f1a28] border-[rgba(0, 129, 242, 0.15)] text-[#6b7a99] hover:text-[#f8f8f7]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Client *</label>
            <div className="relative">
              <select
                className={`${inputCls} appearance-none pr-8`}
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              >
                <option value="">— Select client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7a99] pointer-events-none" />
            </div>
          </div>
          {/* Category — high-level file classification */}
          <div>
            <label className={labelCls}>Category</label>
            <div className="relative">
              <select
                className={`${inputCls} appearance-none pr-8`}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as AssetCategory })}
              >
                {ALL_ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7a99] pointer-events-none" />
            </div>
          </div>
          {/* Asset Type — creative format */}
          <div>
            <label className={labelCls}>Asset Type</label>
            <div className="relative">
              <select
                className={`${inputCls} appearance-none pr-8`}
                value={form.assetType}
                onChange={(e) => setForm({ ...form, assetType: e.target.value as AssetType })}
              >
                {ALL_ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7a99] pointer-events-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Service</label>
              <input
                className={inputCls}
                placeholder={selectedClient?.services[0] ?? "Roof Replacement"}
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Market</label>
              <input
                className={inputCls}
                placeholder={selectedClient?.market ?? "City, State"}
                value={form.market}
                onChange={(e) => setForm({ ...form, market: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Campaign Use Case</label>
            <input
              className={inputCls}
              placeholder="Cold prospecting — trust-first intro"
              value={form.campaignUseCase}
              onChange={(e) => setForm({ ...form, campaignUseCase: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Describe the creative content, tone, key details..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-3 bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg">
            <div>
              <div className="text-[12px] text-[#f8f8f7] font-medium">Approved for Ads</div>
              <div className="text-[11px] text-[#6b7a99] mt-0.5">Mark as reviewed and safe to use in Meta campaigns</div>
            </div>
            <button
              onClick={() => setForm({ ...form, approvedForAds: !form.approvedForAds })}
              className={`w-10 h-5.5 rounded-full relative transition-colors flex-shrink-0 ${form.approvedForAds ? "bg-[#22c55e]/70" : "bg-[rgba(0, 129, 242, 0.15)]"}`}
              style={{ height: "22px", minWidth: "40px" }}
            >
              <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${form.approvedForAds ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[rgba(0, 129, 242, 0.15)] flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-[#6b7a99] border border-[rgba(0, 129, 242, 0.15)] rounded-lg hover:text-[#f8f8f7] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.fileName || !form.clientId || saving}
            className="px-4 py-2 text-[12px] font-semibold vc-orange-gradient text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Add Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Asset card
// ─────────────────────────────────────────────────────────────
function AssetCard({ asset, resolveClientName }: { asset: CreativeAsset; resolveClientName: (a: CreativeAsset) => string }) {
  const color = assetTypeColors[asset.assetType] ?? "#6b7a99";
  const Icon = asset.fileType === "video" ? Video : ImageIcon;
  return (
    <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden hover:border-[rgba(0, 129, 242, 0.25)] transition-colors group">
      {/* Thumbnail */}
      <div className="h-40 bg-[#0f1a28] border-b border-[rgba(0, 129, 242, 0.15)] flex items-center justify-center relative">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}28` }}
        >
          <Icon size={26} style={{ color }} />
        </div>
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <Badge label={asset.status} variant={assetStatusVariant[asset.status]} />
        </div>
        <div className="absolute top-3 left-3">
          {asset.approvedForAds ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20">
              <CheckCircle2 size={9} />Approved
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20">
              <AlertCircle size={9} />Needs Approval
            </span>
          )}
        </div>
      </div>
      {/* Info */}
      <div className="p-4 space-y-2.5">
        <div>
          <div className="text-[12px] font-semibold text-[#f8f8f7] truncate">{asset.fileName}</div>
          <div className="text-[11px] text-[#6b7a99] mt-0.5">{resolveClientName(asset)}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category badge */}
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border text-[#a78bfa] border-[#a78bfa30] bg-[#a78bfa10]">
            {asset.category ?? "Creative Asset"}
          </span>
          {/* Asset type badge */}
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
            style={{ color, borderColor: `${color}30`, backgroundColor: `${color}10` }}
          >
            {asset.assetType}
          </span>
          <span className="text-[10px] text-[#6b7a99] uppercase font-mono">{asset.fileType}</span>
        </div>
        <div className="text-[11px] text-[#6b7a99] leading-snug line-clamp-2">{asset.campaignUseCase}</div>
        <div className="flex items-center justify-between pt-1 border-t border-[rgba(0, 129, 242, 0.15)]/50">
          <div className="text-[10px] text-[#3d4f6e]">
            {asset.service} · {asset.market}
          </div>
          <div className="text-[10px] text-[#3d4f6e]">{asset.uploadDate}</div>
        </div>
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.slice(0, 3).map((t) => (
              <span key={t} className="flex items-center gap-0.5 text-[9px] font-mono text-[#3d4f6e] bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] px-1.5 py-0.5 rounded">
                <Tag size={7} />{t}
              </span>
            ))}
            {asset.tags.length > 3 && (
              <span className="text-[9px] text-[#3d4f6e]">+{asset.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function CreativesPage() {
  const { can } = useAuth();
  const { allAssets, addAsset, usingSupabase, loading } = usePersistedCreativeAssets();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showUpload, setShowUpload] = useState(false);

  // Load clients from Supabase for dropdowns and display name resolution
  useEffect(() => {
    getDataProvider().getClients().then(setClients).catch(() => setClients([]));
  }, []);

  // Build a map of clientId → display name to resolve raw slugs in asset cards
  const clientNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clients) map[c.id] = c.name;
    return map;
  }, [clients]);

  // Resolve display name: use stored clientName if it looks like a real name,
  // otherwise fall back to the clientNameMap lookup
  function resolveClientName(asset: CreativeAsset): string {
    const stored = asset.clientName ?? "";
    // If stored name looks like a slug (no spaces, all lowercase with hyphens), resolve it
    if (!stored || /^[a-z0-9-]+$/.test(stored)) {
      return clientNameMap[asset.clientId] ?? asset.clientId;
    }
    return stored;
  }

  const filtered = useMemo(() => {
    return allAssets.filter((a) => {
      if (filterClient !== "all" && a.clientId !== filterClient) return false;
      if (filterType !== "all" && a.assetType !== filterType) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !a.fileName.toLowerCase().includes(q) &&
          !a.assetType.toLowerCase().includes(q) &&
          !a.clientName.toLowerCase().includes(q) &&
          !a.service.toLowerCase().includes(q) &&
          !a.campaignUseCase.toLowerCase().includes(q) &&
          !(a.category ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [allAssets, filterClient, filterType, filterStatus, search]);

  const stats = useMemo(() => ({
    total: allAssets.length,
    approved: allAssets.filter((a) => a.approvedForAds).length,
    needsReview: allAssets.filter((a) => a.status === "Needs Review").length,
    inCampaign: allAssets.filter((a) => a.status === "Used in Campaign").length,
  }), [allAssets]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Creative Library"
        description={`${stats.total} assets · ${stats.approved} approved for ads`}
        action={
          <div className="flex items-center gap-2">
            {/* Storage mode indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-lg text-[10px]">
              {usingSupabase ? (
                <><Database size={10} className="text-[#22c55e]" /><span className="text-[#22c55e]">Supabase</span></>
              ) : (
                <><HardDrive size={10} className="text-[#6b7a99]" /><span className="text-[#6b7a99]">Local storage</span></>
              )}
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-[#0D1520] border border-[#0081f2]/30 rounded-lg text-[12px] text-[#0081f2] hover:border-[#0081f2]/50 transition-colors font-medium">
              <Film size={13} />
              Analyze with AI
            </button>
            {can("canUploadFiles") ? (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 vc-orange-gradient text-white text-[12px] font-semibold rounded-lg transition-opacity hover:opacity-90"
              >
                <Plus size={14} />
                Upload Asset
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg text-[11px] text-[#3d4f6e]">
                <ShieldCheck size={12} />
                Upload requires Media Buyer+
              </div>
            )}
          </div>
        }
      />
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Assets", value: loading ? "…" : stats.total, color: "#0081f2" },
          { label: "Approved for Ads", value: loading ? "…" : stats.approved, color: "#22c55e" },
          { label: "Needs Review", value: loading ? "…" : stats.needsReview, color: "#f59e0b" },
          { label: "Used in Campaigns", value: loading ? "…" : stats.inCampaign, color: "#a78bfa" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-4">
            <div className="text-[11px] font-semibold text-[#3d4f6e] uppercase tracking-wider mb-1">{label}</div>
            <div className="text-[22px] font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7a99]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="w-48 pl-8 pr-3 py-1.5 bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-lg text-[12px] text-[#f8f8f7] placeholder-[#6b7a99] focus:outline-none focus:border-[#0081f2]/40 transition-colors"
          />
        </div>
        {/* Client filter */}
        <div className="relative">
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="appearance-none bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-lg pl-3 pr-7 py-1.5 text-[12px] text-[#6b7a99] focus:outline-none focus:border-[#0081f2]/40 transition-colors"
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b7a99] pointer-events-none" />
        </div>
        {/* Type filter */}
        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="appearance-none bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-lg pl-3 pr-7 py-1.5 text-[12px] text-[#6b7a99] focus:outline-none focus:border-[#0081f2]/40 transition-colors"
          >
            <option value="all">All Types</option>
            {ALL_ASSET_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b7a99] pointer-events-none" />
        </div>
        {/* Status filter */}
        <div className="flex items-center gap-1">
          <Filter size={11} className="text-[#3d4f6e]" />
          {(["all", ...ALL_ASSET_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                filterStatus === s
                  ? "bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.25)] text-[#f8f8f7]"
                  : "text-[#6b7a99] hover:text-[#f8f8f7]"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>
      {/* Grid */}
      {loading ? (
        <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-16 flex flex-col items-center text-center">
          <Film size={24} className="text-[#3d4f6e] mb-3 animate-pulse" />
          <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">Loading assets…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-16 flex flex-col items-center text-center">
          <Film size={24} className="text-[#3d4f6e] mb-3" />
          <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">No assets match your filters</div>
          <p className="text-[12px] text-[#6b7a99]">Try a different filter or upload a new asset.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <AssetCard key={a.id} asset={a} resolveClientName={resolveClientName} />
          ))}
        </div>
      )}
      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onAdd={addAsset}
          usingSupabase={usingSupabase}
          clients={clients}
        />
      )}
    </div>
  );
}
