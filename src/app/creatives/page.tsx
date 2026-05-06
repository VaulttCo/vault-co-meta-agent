"use client";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
  Sparkles,
  CheckSquare,
  Square,
  Loader2,
  Target,
  Zap,
  Shield,
  TrendingUp,
  Eye,
  BarChart2,
  ChevronRight,
  Info,
  ExternalLink,
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
import type { CreativeAnalysis } from "@/lib/agents/creativeAnalysis";

// ─────────────────────────────────────────────────────────────
// Extended analysis type (Anthropic adds quality score etc.)
// ─────────────────────────────────────────────────────────────
interface ExtendedAnalysis extends CreativeAnalysis {
  qualityScore?: number;
  approvalRecommendation?: "Approve" | "Needs Revision" | "Reject";
  approvalReason?: string;
}

interface AnalysisResult {
  assetId: string;
  analysis: ExtendedAnalysis;
  mockMode: boolean;
  savedToDb: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// Thumbnail component — shows real preview for images,
// placeholder for video / no URL
// ─────────────────────────────────────────────────────────────
function AssetThumbnail({
  asset,
  className = "",
}: {
  asset: CreativeAsset;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const color = assetTypeColors[asset.assetType] ?? "#6b7a99";
  const Icon = asset.fileType === "video" ? Video : ImageIcon;

  if (asset.thumbnailUrl && !imgError) {
    return (
      <img
        src={asset.thumbnailUrl}
        alt={asset.fileName}
        className={`w-full h-full object-cover ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`w-full h-full flex items-center justify-center ${className}`}
      style={{ backgroundColor: `${color}08` }}
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}28` }}
      >
        <Icon size={24} style={{ color }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Analysis result panel — shown inside detail modal
// ─────────────────────────────────────────────────────────────
function AnalysisPanel({ analysis, mockMode }: { analysis: ExtendedAnalysis; mockMode: boolean }) {
  const intentColor =
    analysis.buyerIntentLevel === "Hot"
      ? "#ef4444"
      : analysis.buyerIntentLevel === "Warm"
      ? "#f59e0b"
      : "#3b82f6";

  const recColor =
    analysis.approvalRecommendation === "Approve"
      ? "#22c55e"
      : analysis.approvalRecommendation === "Reject"
      ? "#ef4444"
      : "#f59e0b";

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-[#a78bfa]" />
          <span className="text-[12px] font-semibold text-[#f8f8f7]">Veronica AI Analysis</span>
          {mockMode && (
            <span className="text-[9px] font-mono text-[#6b7a99] bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] px-1.5 py-0.5 rounded">
              MOCK
            </span>
          )}
        </div>
        {analysis.qualityScore !== undefined && (
          <div className="flex items-center gap-1.5">
            <BarChart2 size={11} className="text-[#0081f2]" />
            <span className="text-[11px] font-semibold text-[#f8f8f7]">
              Quality: {analysis.qualityScore}/10
            </span>
          </div>
        )}
      </div>

      {/* Approval recommendation */}
      {analysis.approvalRecommendation && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-lg border"
          style={{
            backgroundColor: `${recColor}08`,
            borderColor: `${recColor}25`,
          }}
        >
          <CheckCircle2 size={12} style={{ color: recColor }} className="flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-semibold" style={{ color: recColor }}>
              {analysis.approvalRecommendation}
            </div>
            {analysis.approvalReason && (
              <div className="text-[11px] text-[#6b7a99] mt-0.5">{analysis.approvalReason}</div>
            )}
          </div>
        </div>
      )}

      {/* Key metrics row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#0f1a28] border border-[rgba(0,129,242,0.12)] rounded-lg p-2.5 text-center">
          <div className="text-[9px] text-[#6b7a99] uppercase tracking-wider mb-1">Intent Level</div>
          <div className="text-[11px] font-bold" style={{ color: intentColor }}>
            {analysis.buyerIntentLevel}
          </div>
        </div>
        <div className="bg-[#0f1a28] border border-[rgba(0,129,242,0.12)] rounded-lg p-2.5 text-center">
          <div className="text-[9px] text-[#6b7a99] uppercase tracking-wider mb-1">Hook</div>
          <div className="text-[11px] font-bold text-[#f8f8f7] truncate">{analysis.hookStrength.split(" ")[0]}</div>
        </div>
        <div className="bg-[#0f1a28] border border-[rgba(0,129,242,0.12)] rounded-lg p-2.5 text-center">
          <div className="text-[9px] text-[#6b7a99] uppercase tracking-wider mb-1">Objective</div>
          <div className="text-[10px] font-bold text-[#f8f8f7] truncate">{analysis.recommendedObjective.replace("_", " ")}</div>
        </div>
      </div>

      {/* Why this creative */}
      <div className="bg-[#0f1a28] border border-[rgba(0,129,242,0.12)] rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Info size={10} className="text-[#a78bfa]" />
          <span className="text-[10px] font-semibold text-[#a78bfa] uppercase tracking-wider">Why This Creative</span>
        </div>
        <p className="text-[11px] text-[#6b7a99] leading-relaxed">{analysis.whyThisCreative}</p>
      </div>

      {/* Best campaign angle */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Target size={10} className="text-[#0081f2]" />
          <span className="text-[10px] font-semibold text-[#0081f2] uppercase tracking-wider">Best Campaign Angle</span>
        </div>
        <p className="text-[11px] text-[#f8f8f7]">{analysis.bestCampaignAngle}</p>
      </div>

      {/* Recommended copy angle */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap size={10} className="text-[#ff8400]" />
          <span className="text-[10px] font-semibold text-[#ff8400] uppercase tracking-wider">Recommended Copy Angle</span>
        </div>
        <p className="text-[11px] text-[#f8f8f7]">{analysis.recommendedCopyAngle}</p>
      </div>

      {/* Trust signals */}
      {analysis.trustSignals.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield size={10} className="text-[#22c55e]" />
            <span className="text-[10px] font-semibold text-[#22c55e] uppercase tracking-wider">Trust Signals</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.trustSignals.map((s, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-md bg-[#22c55e]/08 border border-[#22c55e]/20 text-[#22c55e]"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Best placements */}
      {analysis.bestPlacement.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp size={10} className="text-[#0081f2]" />
            <span className="text-[10px] font-semibold text-[#0081f2] uppercase tracking-wider">Best Placements</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.bestPlacement.map((p, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-md bg-[#0081f2]/08 border border-[#0081f2]/20 text-[#0081f2]"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA + Retargeting */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0f1a28] border border-[rgba(0,129,242,0.12)] rounded-lg p-2.5">
          <div className="text-[9px] text-[#6b7a99] uppercase tracking-wider mb-1">Recommended CTA</div>
          <div className="text-[11px] font-semibold text-[#ff8400]">{analysis.recommendedCTA}</div>
        </div>
        <div className="bg-[#0f1a28] border border-[rgba(0,129,242,0.12)] rounded-lg p-2.5">
          <div className="text-[9px] text-[#6b7a99] uppercase tracking-wider mb-1">Audience Temp</div>
          <div className="text-[11px] font-semibold text-[#f8f8f7]">{analysis.bestAudienceTemperature}</div>
        </div>
      </div>

      {/* Compliance risks */}
      {analysis.complianceRisks.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertCircle size={10} className="text-[#f59e0b]" />
            <span className="text-[10px] font-semibold text-[#f59e0b] uppercase tracking-wider">Compliance Risks</span>
          </div>
          <div className="space-y-1">
            {analysis.complianceRisks.map((r, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <ChevronRight size={9} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
                <span className="text-[10px] text-[#6b7a99]">{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Asset detail modal
// ─────────────────────────────────────────────────────────────
function AssetDetailModal({
  asset,
  onClose,
  analysisResult,
  onAnalyze,
  analyzing,
  canAnalyze,
  resolveClientName,
}: {
  asset: CreativeAsset;
  onClose: () => void;
  analysisResult?: AnalysisResult;
  onAnalyze: (asset: CreativeAsset) => void;
  analyzing: boolean;
  canAnalyze: boolean;
  resolveClientName: (a: CreativeAsset) => string;
}) {
  const color = assetTypeColors[asset.assetType] ?? "#6b7a99";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,129,242,0.15)] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Film size={14} className="text-[#ff8400] flex-shrink-0" />
            <span className="text-[13px] font-semibold text-[#f8f8f7] truncate">{asset.fileName}</span>
          </div>
          <button onClick={onClose} className="text-[#6b7a99] hover:text-[#f8f8f7] transition-colors flex-shrink-0 ml-2">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Left: preview + metadata */}
            <div className="p-5 space-y-4 border-b md:border-b-0 md:border-r border-[rgba(0,129,242,0.15)]">
              {/* Preview */}
              <div className="h-48 bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] rounded-xl overflow-hidden">
                <AssetThumbnail asset={asset} />
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge label={asset.status} variant={assetStatusVariant[asset.status]} />
                {asset.approvedForAds ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20">
                    <CheckCircle2 size={9} />Approved for Ads
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20">
                    <AlertCircle size={9} />Needs Approval
                  </span>
                )}
              </div>

              {/* Metadata grid */}
              <div className="space-y-2">
                {[
                  { label: "Client", value: resolveClientName(asset) },
                  { label: "Asset Type", value: asset.assetType },
                  { label: "Category", value: asset.category ?? "Creative Asset" },
                  { label: "File Type", value: asset.fileType.toUpperCase() },
                  { label: "Service", value: asset.service || "—" },
                  { label: "Market", value: asset.market || "—" },
                  { label: "Upload Date", value: asset.uploadDate },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-2">
                    <span className="text-[10px] text-[#3d4f6e] uppercase tracking-wider flex-shrink-0">{label}</span>
                    <span className="text-[11px] text-[#f8f8f7] text-right">{value}</span>
                  </div>
                ))}
              </div>

              {/* Campaign use case */}
              {asset.campaignUseCase && (
                <div>
                  <div className="text-[10px] text-[#3d4f6e] uppercase tracking-wider mb-1">Campaign Use Case</div>
                  <p className="text-[11px] text-[#6b7a99] leading-relaxed">{asset.campaignUseCase}</p>
                </div>
              )}

              {/* Notes */}
              {asset.notes && (
                <div>
                  <div className="text-[10px] text-[#3d4f6e] uppercase tracking-wider mb-1">Notes</div>
                  <p className="text-[11px] text-[#6b7a99] leading-relaxed">{asset.notes}</p>
                </div>
              )}

              {/* Tags */}
              {asset.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {asset.tags.map((t) => (
                    <span key={t} className="flex items-center gap-0.5 text-[9px] font-mono text-[#3d4f6e] bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] px-1.5 py-0.5 rounded">
                      <Tag size={7} />{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Storage URL link */}
              {asset.thumbnailUrl && (
                <a
                  href={asset.thumbnailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-[#0081f2] hover:text-[#0081f2]/80 transition-colors"
                >
                  <ExternalLink size={10} />
                  View full asset
                </a>
              )}
            </div>

            {/* Right: AI analysis */}
            <div className="p-5">
              {analysisResult ? (
                <AnalysisPanel analysis={analysisResult.analysis} mockMode={analysisResult.mockMode} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center">
                    <Sparkles size={22} className="text-[#a78bfa]" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">Veronica AI Analysis</div>
                    <p className="text-[11px] text-[#6b7a99] max-w-[200px]">
                      Get strategic insights, placement recommendations, and compliance checks for this creative.
                    </p>
                  </div>
                  {canAnalyze ? (
                    <button
                      onClick={() => onAnalyze(asset)}
                      disabled={analyzing}
                      className="flex items-center gap-2 px-4 py-2 bg-[#a78bfa]/10 border border-[#a78bfa]/30 rounded-lg text-[12px] text-[#a78bfa] hover:border-[#a78bfa]/50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {analyzing ? (
                        <><Loader2 size={12} className="animate-spin" />Analyzing…</>
                      ) : (
                        <><Sparkles size={12} />Analyze with Veronica</>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#3d4f6e]">
                      <ShieldCheck size={11} />
                      Requires Media Buyer+
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const inputCls = "w-full bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] rounded-lg px-3 py-2 text-[12px] text-[#f8f8f7] placeholder-[#3d4f6e] focus:outline-none focus:border-[#0081f2]/50 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,129,242,0.15)]">
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
                <><span className="text-[#f8f8f7] font-semibold">Local storage mode. </span>Asset metadata is saved in your browser and persists across refreshes.</>
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
            className="border-2 border-dashed border-[rgba(0,129,242,0.15)] rounded-xl p-8 text-center hover:border-[rgba(0,129,242,0.25)] transition-colors cursor-pointer"
          >
            {pickedFileName ? (
              <div className="space-y-1">
                <Upload size={18} className="text-[#ff8400] mx-auto" />
                <div className="text-[12px] font-semibold text-[#f8f8f7]">{pickedFileName}</div>
                <div className="text-[10px] text-[#6b7a99]">Click to change file</div>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] flex items-center justify-center mx-auto mb-3">
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
                        : "bg-[#0f1a28] border-[rgba(0,129,242,0.15)] text-[#6b7a99] hover:text-[#f8f8f7]"
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
          <div className="flex items-center justify-between px-3 py-3 bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] rounded-lg">
            <div>
              <div className="text-[12px] text-[#f8f8f7] font-medium">Approved for Ads</div>
              <div className="text-[11px] text-[#6b7a99] mt-0.5">Mark as reviewed and safe to use in Meta campaigns</div>
            </div>
            <button
              onClick={() => setForm({ ...form, approvedForAds: !form.approvedForAds })}
              className={`w-10 rounded-full relative transition-colors flex-shrink-0 ${form.approvedForAds ? "bg-[#22c55e]/70" : "bg-[rgba(0,129,242,0.15)]"}`}
              style={{ height: "22px", minWidth: "40px" }}
            >
              <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${form.approvedForAds ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[rgba(0,129,242,0.15)] flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-[#6b7a99] border border-[rgba(0,129,242,0.15)] rounded-lg hover:text-[#f8f8f7] transition-colors">
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
function AssetCard({
  asset,
  resolveClientName,
  selected,
  onSelect,
  onOpen,
  analysisResult,
  canAnalyze,
}: {
  asset: CreativeAsset;
  resolveClientName: (a: CreativeAsset) => string;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpen: (asset: CreativeAsset) => void;
  analysisResult?: AnalysisResult;
  canAnalyze: boolean;
}) {
  const color = assetTypeColors[asset.assetType] ?? "#6b7a99";

  return (
    <div
      className={`bg-[#0D1520] border rounded-xl overflow-hidden transition-all group cursor-pointer ${
        selected
          ? "border-[#a78bfa]/50 ring-1 ring-[#a78bfa]/20"
          : "border-[rgba(0,129,242,0.15)] hover:border-[rgba(0,129,242,0.25)]"
      }`}
      onClick={() => onOpen(asset)}
    >
      {/* Thumbnail */}
      <div className="h-40 bg-[#0f1a28] border-b border-[rgba(0,129,242,0.15)] relative overflow-hidden">
        <AssetThumbnail asset={asset} />

        {/* Selection checkbox */}
        {canAnalyze && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(asset.id); }}
            className="absolute top-2.5 left-2.5 z-10 transition-opacity"
          >
            {selected ? (
              <CheckSquare size={16} className="text-[#a78bfa]" />
            ) : (
              <Square size={16} className="text-[#3d4f6e] opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        )}

        {/* Status badges */}
        <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
          <Badge label={asset.status} variant={assetStatusVariant[asset.status]} />
        </div>

        {/* Approval badge */}
        <div className="absolute bottom-2.5 left-2.5">
          {asset.approvedForAds ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#22c55e] bg-[#0D1520]/90 border border-[#22c55e]/30">
              <CheckCircle2 size={9} />Approved
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#f59e0b] bg-[#0D1520]/90 border border-[#f59e0b]/30">
              <AlertCircle size={9} />Needs Approval
            </span>
          )}
        </div>

        {/* AI analyzed indicator */}
        {analysisResult && (
          <div className="absolute bottom-2.5 right-2.5">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-[#a78bfa] bg-[#0D1520]/90 border border-[#a78bfa]/30">
              <Sparkles size={8} />AI
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2.5">
        <div>
          <div className="text-[12px] font-semibold text-[#f8f8f7] truncate">{asset.fileName}</div>
          <div className="text-[11px] text-[#6b7a99] mt-0.5">{resolveClientName(asset)}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border text-[#a78bfa] border-[#a78bfa30] bg-[#a78bfa10]">
            {asset.category ?? "Creative Asset"}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
            style={{ color, borderColor: `${color}30`, backgroundColor: `${color}10` }}
          >
            {asset.assetType}
          </span>
          <span className="text-[10px] text-[#6b7a99] uppercase font-mono">{asset.fileType}</span>
        </div>
        {asset.campaignUseCase && (
          <div className="text-[11px] text-[#6b7a99] leading-snug line-clamp-2">{asset.campaignUseCase}</div>
        )}
        {/* AI analysis summary if available */}
        {analysisResult && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[#a78bfa]/08 border border-[#a78bfa]/20 rounded-lg">
            <Sparkles size={9} className="text-[#a78bfa] flex-shrink-0" />
            <span className="text-[10px] text-[#a78bfa] truncate">
              {analysisResult.analysis.bestCampaignAngle}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1 border-t border-[rgba(0,129,242,0.15)]/50">
          <div className="text-[10px] text-[#3d4f6e]">
            {asset.service}{asset.market ? ` · ${asset.market}` : ""}
          </div>
          <div className="text-[10px] text-[#3d4f6e]">{asset.uploadDate}</div>
        </div>
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.slice(0, 3).map((t) => (
              <span key={t} className="flex items-center gap-0.5 text-[9px] font-mono text-[#3d4f6e] bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] px-1.5 py-0.5 rounded">
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
  const [filterAnalyzed, setFilterAnalyzed] = useState<"all" | "analyzed" | "unanalyzed">("all");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [analysisResults, setAnalysisResults] = useState<Map<string, AnalysisResult>>(new Map());
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [detailAsset, setDetailAsset] = useState<CreativeAsset | null>(null);

  const canAnalyze = can("canAnalyzeCreatives");

  // Load clients
  useEffect(() => {
    getDataProvider().getClients().then(setClients).catch(() => setClients([]));
  }, []);

  // Client name resolution
  const clientNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clients) map[c.id] = c.name;
    return map;
  }, [clients]);

  function resolveClientName(asset: CreativeAsset): string {
    const stored = asset.clientName ?? "";
    if (!stored || /^[a-z0-9-]+$/.test(stored)) {
      return clientNameMap[asset.clientId] ?? asset.clientId;
    }
    return stored;
  }

  // Filtered assets
  const filtered = useMemo(() => {
    return allAssets.filter((a) => {
      if (filterClient !== "all" && a.clientId !== filterClient) return false;
      if (filterType !== "all" && a.assetType !== filterType) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterAnalyzed === "analyzed" && !analysisResults.has(a.id)) return false;
      if (filterAnalyzed === "unanalyzed" && analysisResults.has(a.id)) return false;
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
  }, [allAssets, filterClient, filterType, filterStatus, filterAnalyzed, search, analysisResults]);

  const stats = useMemo(() => ({
    total: allAssets.length,
    approved: allAssets.filter((a) => a.approvedForAds).length,
    needsReview: allAssets.filter((a) => a.status === "Needs Review").length,
    analyzed: analysisResults.size,
  }), [allAssets, analysisResults]);

  // Selection handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map((a) => a.id)));
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // AI analysis
  const runAnalysis = useCallback(async (assetsToAnalyze: CreativeAsset[]) => {
    if (!canAnalyze || assetsToAnalyze.length === 0) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/creatives/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: assetsToAnalyze.map((a) => ({
            id: a.id,
            assetType: a.assetType,
            service: a.service,
            market: a.market,
            notes: a.notes,
            approvedForAds: a.approvedForAds,
            fileName: a.fileName,
            clientName: resolveClientName(a),
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        setAnalyzeError(err.error ?? "Analysis failed");
        return;
      }
      const data = await res.json();
      setAnalysisResults((prev) => {
        const next = new Map(prev);
        for (const r of data.results) {
          next.set(r.assetId, r);
        }
        return next;
      });
      setSelectedIds(new Set());
    } catch (err) {
      setAnalyzeError("Network error — please try again");
      console.error("[CreativesPage] Analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAnalyze]);

  const analyzeSelected = useCallback(() => {
    const toAnalyze = allAssets.filter((a) => selectedIds.has(a.id));
    runAnalysis(toAnalyze);
  }, [allAssets, selectedIds, runAnalysis]);

  const analyzeSingle = useCallback((asset: CreativeAsset) => {
    runAnalysis([asset]);
  }, [runAnalysis]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Creative Library"
        description={`${stats.total} assets · ${stats.approved} approved · ${stats.analyzed} analyzed`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Storage mode indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-lg text-[10px]">
              {usingSupabase ? (
                <><Database size={10} className="text-[#22c55e]" /><span className="text-[#22c55e]">Supabase</span></>
              ) : (
                <><HardDrive size={10} className="text-[#6b7a99]" /><span className="text-[#6b7a99]">Local storage</span></>
              )}
            </div>
            {/* Analyze with AI button */}
            {canAnalyze ? (
              selectedIds.size > 0 ? (
                <button
                  onClick={analyzeSelected}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-3 py-2 bg-[#a78bfa]/10 border border-[#a78bfa]/30 rounded-lg text-[12px] text-[#a78bfa] hover:border-[#a78bfa]/50 transition-colors font-medium disabled:opacity-50"
                >
                  {analyzing ? (
                    <><Loader2 size={13} className="animate-spin" />Analyzing {selectedIds.size}…</>
                  ) : (
                    <><Sparkles size={13} />Analyze {selectedIds.size} Selected</>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Select all visible and analyze
                    const toAnalyze = filtered.slice(0, 10);
                    runAnalysis(toAnalyze);
                  }}
                  disabled={analyzing || filtered.length === 0}
                  className="flex items-center gap-2 px-3 py-2 bg-[#0D1520] border border-[#0081f2]/30 rounded-lg text-[12px] text-[#0081f2] hover:border-[#0081f2]/50 transition-colors font-medium disabled:opacity-40"
                >
                  {analyzing ? (
                    <><Loader2 size={13} className="animate-spin" />Analyzing…</>
                  ) : (
                    <><Sparkles size={13} />Analyze with AI</>
                  )}
                </button>
              )
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] rounded-lg text-[11px] text-[#3d4f6e]">
                <ShieldCheck size={12} />
                Analyze requires Media Buyer+
              </div>
            )}
            {can("canUploadFiles") ? (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 vc-orange-gradient text-white text-[12px] font-semibold rounded-lg transition-opacity hover:opacity-90"
              >
                <Plus size={14} />
                Upload Asset
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] rounded-lg text-[11px] text-[#3d4f6e]">
                <ShieldCheck size={12} />
                Upload requires Media Buyer+
              </div>
            )}
          </div>
        }
      />

      {/* Error banner */}
      {analyzeError && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#ef4444]/08 border border-[#ef4444]/25 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle size={13} className="text-[#ef4444]" />
            <span className="text-[12px] text-[#ef4444]">{analyzeError}</span>
          </div>
          <button onClick={() => setAnalyzeError(null)} className="text-[#6b7a99] hover:text-[#f8f8f7]">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Assets", value: loading ? "…" : stats.total, color: "#0081f2" },
          { label: "Approved for Ads", value: loading ? "…" : stats.approved, color: "#22c55e" },
          { label: "Needs Review", value: loading ? "…" : stats.needsReview, color: "#f59e0b" },
          { label: "AI Analyzed", value: loading ? "…" : stats.analyzed, color: "#a78bfa" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-4">
            <div className="text-[11px] font-semibold text-[#3d4f6e] uppercase tracking-wider mb-1">{label}</div>
            <div className="text-[22px] font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters + selection toolbar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7a99]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="w-48 pl-8 pr-3 py-1.5 bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-lg text-[12px] text-[#f8f8f7] placeholder-[#6b7a99] focus:outline-none focus:border-[#0081f2]/40 transition-colors"
            />
          </div>
          {/* Client filter */}
          <div className="relative">
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="appearance-none bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-lg pl-3 pr-7 py-1.5 text-[12px] text-[#6b7a99] focus:outline-none focus:border-[#0081f2]/40 transition-colors"
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
              className="appearance-none bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-lg pl-3 pr-7 py-1.5 text-[12px] text-[#6b7a99] focus:outline-none focus:border-[#0081f2]/40 transition-colors"
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
                    ? "bg-[#0f1a28] border border-[rgba(0,129,242,0.25)] text-[#f8f8f7]"
                    : "text-[#6b7a99] hover:text-[#f8f8f7]"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
          {/* AI analyzed filter */}
          {canAnalyze && (
            <div className="flex items-center gap-1">
              <Eye size={11} className="text-[#3d4f6e]" />
              {(["all", "analyzed", "unanalyzed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterAnalyzed(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize ${
                    filterAnalyzed === s
                      ? "bg-[#a78bfa]/10 border border-[#a78bfa]/25 text-[#a78bfa]"
                      : "text-[#6b7a99] hover:text-[#f8f8f7]"
                  }`}
                >
                  {s === "all" ? "All AI" : s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selection toolbar */}
        {canAnalyze && filtered.length > 0 && (
          <div className="flex items-center gap-3 text-[11px] text-[#6b7a99]">
            <button
              onClick={selectedIds.size === filtered.length ? clearSelection : selectAll}
              className="flex items-center gap-1.5 hover:text-[#f8f8f7] transition-colors"
            >
              {selectedIds.size === filtered.length && filtered.length > 0 ? (
                <CheckSquare size={12} className="text-[#a78bfa]" />
              ) : (
                <Square size={12} />
              )}
              {selectedIds.size === filtered.length && filtered.length > 0 ? "Deselect all" : "Select all"}
            </button>
            {selectedIds.size > 0 && (
              <>
                <span className="text-[#3d4f6e]">·</span>
                <span className="text-[#a78bfa]">{selectedIds.size} selected</span>
                <button onClick={clearSelection} className="text-[#6b7a99] hover:text-[#f8f8f7] transition-colors">
                  Clear
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-16 flex flex-col items-center text-center">
          <Film size={24} className="text-[#3d4f6e] mb-3 animate-pulse" />
          <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">Loading assets…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-16 flex flex-col items-center text-center">
          <Film size={24} className="text-[#3d4f6e] mb-3" />
          <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">No assets match your filters</div>
          <p className="text-[12px] text-[#6b7a99]">Try a different filter or upload a new asset.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              resolveClientName={resolveClientName}
              selected={selectedIds.has(a.id)}
              onSelect={toggleSelect}
              onOpen={setDetailAsset}
              analysisResult={analysisResults.get(a.id)}
              canAnalyze={canAnalyze}
            />
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

      {/* Asset detail modal */}
      {detailAsset && (
        <AssetDetailModal
          asset={detailAsset}
          onClose={() => setDetailAsset(null)}
          analysisResult={analysisResults.get(detailAsset.id)}
          onAnalyze={analyzeSingle}
          analyzing={analyzing}
          canAnalyze={canAnalyze}
          resolveClientName={resolveClientName}
        />
      )}
    </div>
  );
}
