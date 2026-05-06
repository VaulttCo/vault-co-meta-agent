"use client";

import { useState, useEffect, useRef, use } from "react";
import {
  ChevronLeft,
  Phone,
  Globe,
  MapPin,
  Bot,
  Megaphone,
  BarChart3,
  ImageIcon,
  FileText,
  CheckSquare,
  Settings,
  Zap,
  Brain,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Target,
  Users,
  ShieldCheck,
  TrendingUp,
  Lightbulb,
  Folder,
  Upload,
  FileIcon,
  Film,
  Video,
  X,
  Plus,
  Paperclip,
  Trash2,
  Link2,
  RefreshCw,
  Wifi,
  WifiOff,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { getClient, clientStatusVariant, campaignStatusVariant } from "@/lib/data";
import type { Client } from "@/lib/data";
import { getDataProvider } from "@/lib/data/data-provider";
import { useIntelligence } from "@/components/IntelligenceProvider";
import { useAuth } from "@/components/AuthProvider";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import { getStorageProvider } from "@/lib/storage/storage-provider";
import {
  type ClientFile,
  type FileCategory,
  FILE_CATEGORY_LABELS,
  FILE_CATEGORY_COLORS,
  ALL_FILE_CATEGORIES,
  mimeToFileType,
  formatFileSize,
} from "@/lib/storage/types";

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "campaigns", label: "Meta Campaigns", icon: Megaphone },
  { id: "intelligence", label: "Intelligence", icon: Brain },
  { id: "files", label: "Files", icon: Folder },
  { id: "ai-builder", label: "Build with Veronica", icon: Bot },
  { id: "ad-copy", label: "Ad Copy", icon: FileText },
  { id: "creative", label: "Creative Direction", icon: ImageIcon },
  { id: "lead-forms", label: "Lead Forms", icon: CheckSquare },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "ghl", label: "GHL Workflow", icon: Settings },
  { id: "optimization", label: "Optimization", icon: Zap },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "approvals", label: "Approvals", icon: CheckSquare },
];

// ─── Intelligence section card ────────────────────────────────

function IntelCard({
  title,
  icon: Icon,
  color,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0f1a28] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color }} />
          <span className="text-[12px] font-semibold text-[#f8f8f7]">{title}</span>
        </div>
        {open ? <ChevronUp size={13} className="text-[#6b7a99]" /> : <ChevronDown size={13} className="text-[#6b7a99]" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-[rgba(0, 129, 242, 0.15)]">{children}</div>}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-[rgba(0, 129, 242, 0.15)]/40 last:border-0">
      <span className="text-[11px] text-[#3d4f6e] w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-[12px] text-[#f8f8f7] leading-snug flex-1">{value}</span>
    </div>
  );
}

function BulletField({ label, items, color = "#6b7a99" }: { label: string; items: string[]; color?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="py-1.5 border-b border-[rgba(0, 129, 242, 0.15)]/40 last:border-0">
      <div className="text-[11px] text-[#3d4f6e] mb-1.5">{label}</div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-2 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[12px] text-[#f8f8f7] leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── File Upload Modal ────────────────────────────────────────

function FileUploadModal({
  clientId,
  uploadedBy,
  onClose,
  onAdd,
}: {
  clientId: string;
  uploadedBy: string;
  onClose: () => void;
  onAdd: (file: ClientFile) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [mimeType, setMimeType] = useState("");
  const [category, setCategory] = useState<FileCategory>("client_asset");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBlob, setSelectedBlob] = useState<File | null>(null);
  const storageProvider = getStorageProvider();
  const isRealStorage = storageProvider.name === "supabase";
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedBlob(f);
      setFileName(f.name);
      setFileSize(f.size);
      setMimeType(f.type || "application/octet-stream");
      // Auto-detect category from mime type
      if (f.type === "application/pdf" && category === "client_asset") {
        setCategory("onboarding_summary");
      } else if (f.type.startsWith("image/") || f.type.startsWith("video/")) {
        setCategory("creative_asset");
      }
    }
  }
  async function handleSubmit() {
    if (!fileName) return;
    setIsSaving(true);
    const newFile: ClientFile & { _blob?: File } = {
      id: `file-${Date.now()}`,
      clientId,
      fileName,
      fileType: mimeToFileType(mimeType),
      fileSize,
      mimeType,
      category,
      storageUrl: isRealStorage ? "" : `/mock/files/${fileName}`,
      thumbnailUrl: null,
      uploadedBy,
      uploadedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      notes,
      status: "active",
      _blob: selectedBlob ?? undefined,
    };
    const saved = await storageProvider.saveFile(newFile);
    onAdd(saved);
    setIsSaving(false);
    onClose();
  }

  const labelCls = "text-[11px] font-semibold text-[#3d4f6e] uppercase tracking-wider mb-1 block";
  const inputCls = "w-full bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg px-3 py-2 text-[12px] text-[#f8f8f7] placeholder-[#3d4f6e] focus:outline-none focus:border-[#0081f2]/50 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0, 129, 242, 0.15)]">
          <div className="flex items-center gap-2">
            <Upload size={14} className="text-[#ff8400]" />
            <span className="text-[13px] font-semibold text-[#f8f8f7]">Upload File</span>
          </div>
          <button onClick={onClose} className="text-[#6b7a99] hover:text-[#f8f8f7] transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Storage mode notice */}
          {isRealStorage ? (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#0081f2]/10 border border-[#0081f2]/30 rounded-lg">
              <CheckCircle2 size={12} className="text-[#0081f2] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#6b7a99] leading-snug">
                <span className="text-[#f8f8f7] font-semibold">Supabase Storage active. </span>
                Files will be uploaded to your Vault Co storage bucket and persisted to the database.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#3d4f6e]/15 border border-[#3d4f6e]/30 rounded-lg">
              <AlertCircle size={12} className="text-[#6b7a99] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#6b7a99] leading-snug">
                <span className="text-[#f8f8f7] font-semibold">Mock storage mode. </span>
                File metadata is saved locally. Connect Supabase Storage to persist actual file bytes.
              </p>
            </div>
          )}

          {/* Drop zone / file input */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[rgba(0, 129, 242, 0.15)] rounded-xl p-8 text-center hover:border-[rgba(0, 129, 242, 0.25)] transition-colors cursor-pointer"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi,.doc,.docx,.txt,.zip"
              onChange={handleFileChange}
              className="hidden"
            />
            {fileName ? (
              <div className="space-y-1">
                <FileIcon size={20} className="text-[#ff8400] mx-auto" />
                <div className="text-[12px] font-semibold text-[#f8f8f7]">{fileName}</div>
                <div className="text-[10px] text-[#6b7a99]">{formatFileSize(fileSize)}</div>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] flex items-center justify-center mx-auto mb-3">
                  <Upload size={16} className="text-[#3d4f6e]" />
                </div>
                <div className="text-[12px] text-[#6b7a99]">
                  Click to browse or drop file here
                </div>
                <div className="text-[10px] text-[#3d4f6e] mt-1">PDF, JPG, PNG, MP4, MOV, DOC · Max 100MB</div>
              </>
            )}
          </div>

          {/* File name override */}
          <div>
            <label className={labelCls}>File Name *</label>
            <input
              className={inputCls}
              placeholder="my_document.pdf"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Category</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_FILE_CATEGORIES.map((cat) => {
                const color = FILE_CATEGORY_COLORS[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-medium text-left transition-colors border ${
                      category === cat
                        ? "text-[#f8f8f7] border-[rgba(0, 129, 242, 0.25)] bg-[#0f1a28]"
                        : "border-[rgba(0, 129, 242, 0.15)] text-[#6b7a99] hover:text-[#f8f8f7] hover:border-[rgba(0, 129, 242, 0.25)]"
                    }`}
                    style={category === cat ? { borderColor: `${color}50`, backgroundColor: `${color}10`, color } : {}}
                  >
                    {FILE_CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Describe this file..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[rgba(0, 129, 242, 0.15)] flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-[#6b7a99] border border-[rgba(0, 129, 242, 0.15)] rounded-lg hover:text-[#f8f8f7] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!fileName || isSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold vc-orange-gradient text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            Save File
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Client Files Tab ─────────────────────────────────────────

function ClientFilesTab({ clientId }: { clientId: string }) {
  const { user, can } = useAuth();
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<FileCategory | "all">("all");
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    getStorageProvider().getFiles(clientId).then((f) => {
      setFiles(f);
      setIsLoading(false);
    });
  }, [clientId]);

  function handleAdd(file: ClientFile) {
    setFiles((prev) => [file, ...prev]);
  }

  async function handleDelete(id: string) {
    await getStorageProvider().deleteFile(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  const filtered = filterCategory === "all" ? files : files.filter((f) => f.category === filterCategory);

  const counts = ALL_FILE_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = files.filter((f) => f.category === cat).length;
    return acc;
  }, {});

  function FileTypeIcon({ file }: { file: ClientFile }) {
    if (file.fileType === "pdf") return <FileText size={14} className="text-[#ef4444]" />;
    if (file.fileType === "video") return <Video size={14} className="text-[#0081f2]" />;
    if (file.fileType === "image") return <ImageIcon size={14} className="text-[#22c55e]" />;
    return <FileIcon size={14} className="text-[#6b7a99]" />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-[#f8f8f7]">Client Files</h3>
          <p className="text-[12px] text-[#6b7a99] mt-0.5">
            Onboarding documents, contracts, creative assets, and reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#3d4f6e] px-2 py-1 bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg">
            {getStorageProvider().name === "supabase" ? "Supabase Storage" : "Mock storage"}
          </span>
          {can("canUploadFiles") && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 vc-orange-gradient text-white text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={12} />
              Upload File
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {ALL_FILE_CATEGORIES.map((cat) => {
          const color = FILE_CATEGORY_COLORS[cat];
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
              className={`p-3 rounded-xl border text-left transition-all ${
                filterCategory === cat
                  ? "border-[rgba(0, 129, 242, 0.25)] bg-[#0f1a28]"
                  : "border-[rgba(0, 129, 242, 0.15)] bg-[#0D1520] hover:border-[rgba(0, 129, 242, 0.25)]"
              }`}
              style={filterCategory === cat ? { borderColor: `${color}50` } : {}}
            >
              <div className="text-[18px] font-bold" style={{ color }}>{counts[cat] ?? 0}</div>
              <div className="text-[9px] font-semibold text-[#3d4f6e] leading-tight mt-0.5">{FILE_CATEGORY_LABELS[cat]}</div>
            </button>
          );
        })}
      </div>

      {/* File list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={18} className="animate-spin text-[#6b7a99]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-10 text-center">
          <Folder size={20} className="text-[#3d4f6e] mx-auto mb-3" />
          <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">No files yet</div>
          <p className="text-[12px] text-[#6b7a99]">
            {can("canUploadFiles")
              ? "Upload onboarding documents, contracts, creative assets, and reports."
              : "No files have been uploaded for this client yet."}
          </p>
        </div>
      ) : (
        <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden">
          <div className="divide-y divide-[rgba(0, 129, 242, 0.15)]">
            {filtered.map((file) => {
              const catColor = FILE_CATEGORY_COLORS[file.category];
              return (
                <div key={file.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#0f1a28]/60 transition-colors group">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileTypeIcon file={file} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <span className="text-[12px] font-semibold text-[#f8f8f7] truncate">{file.fileName}</span>
                      <span
                        className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                        style={{ color: catColor, backgroundColor: `${catColor}12`, borderColor: `${catColor}30` }}
                      >
                        {FILE_CATEGORY_LABELS[file.category]}
                      </span>
                      {file.status === "pending" && (
                        <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/25">
                          Pending
                        </span>
                      )}
                    </div>
                    {file.notes && (
                      <p className="text-[11px] text-[#6b7a99] mt-0.5 leading-snug line-clamp-1">{file.notes}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[#3d4f6e]">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>·</span>
                      <span>Uploaded by {file.uploadedBy}</span>
                      <span>·</span>
                      <span>{file.uploadedAt}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {can("canDeleteFiles") && (
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#3d4f6e] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                        title="Delete file"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showUpload && user && (
        <FileUploadModal
          clientId={clientId}
          uploadedBy={user.name}
          onClose={() => setShowUpload(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}

// ─── Intelligence tab ─────────────────────────────────────────

// ── PDF upload progress stages ───────────────────────────────
type PdfStage =
  | "idle"
  | "uploading"
  | "extracting"
  | "analyzing"
  | "saved"
  | "error"
  | "scanned";

function IntelligenceTab({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const { getIntelligence, saveIntelligence, fetchAndCacheIntelligence } = useIntelligence();
  const [intel, setIntel] = useState<ClientIntelligence | null>(null);
  const [summaryText, setSummaryText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>("mock");
  // PDF upload state
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfStage, setPdfStage] = useState<PdfStage>("idle");
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    // Load from context (localStorage) immediately
    const existing = getIntelligence(clientId);
    if (existing) {
      setIntel(existing);
      setSummaryText(existing.onboardingSummary);
    }
    // Then fetch from data provider (Supabase if configured) — DB wins on conflict
    fetchAndCacheIntelligence(clientId).then(() => {
      const fresh = getIntelligence(clientId);
      if (fresh) {
        setIntel(fresh);
        setSummaryText(fresh.onboardingSummary);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  /**
   * Full PDF extraction pipeline:
   * 1. Upload file to Supabase Storage (or mock)
   * 2. Send file to /api/extract-pdf-text for server-side text extraction
   * 3. Populate the summary textarea with extracted text
   * 4. Automatically trigger Veronica intelligence extraction
   * 5. Save extracted intelligence to Supabase
   */
  async function handlePdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfFileName(file.name);
    setPdfStage("uploading");
    setPdfError(null);
    setExtractError(null);
    setExtractSuccess(false);

    // ── Step 1: Upload to Supabase Storage (fire-and-forget, non-blocking) ──
    if (user) {
      const sp = getStorageProvider();
      const newFile: ClientFile & { _blob?: File } = {
        id: `file-pdf-${Date.now()}`,
        clientId,
        fileName: file.name,
        fileType: "pdf" as const,
        fileSize: file.size,
        mimeType: "application/pdf",
        category: "onboarding_summary" as const,
        storageUrl: sp.name === "supabase" ? "" : `/mock/files/${file.name}`,
        thumbnailUrl: null,
        uploadedBy: user.name,
        uploadedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        notes: "Onboarding summary PDF — uploaded from Intelligence tab",
        status: "active" as const,
        _blob: file,
      };
      sp.saveFile(newFile).catch((err) =>
        console.warn("[IntelligenceTab] Storage upload warning:", err)
      );
    }

    // ── Step 2: Server-side PDF text extraction ──────────────────────────────
    setPdfStage("extracting");
    let extractedText = "";
    try {
      const formData = new FormData();
      formData.append("file", file);

      const extractRes = await fetch("/api/extract-pdf-text", {
        method: "POST",
        body: formData,
      });

      const extractJson = await extractRes.json();

      if (!extractRes.ok) {
        // Server returned an error (corrupted, password-protected, etc.)
        setPdfStage("error");
        setPdfError(
          extractJson.error ??
            "PDF text extraction failed. Paste the onboarding summary manually."
        );
        return;
      }

      if (extractJson.scanned) {
        // PDF has no embedded text — likely a scanned image
        setPdfStage("scanned");
        setPdfError(
          "PDF text extraction failed — this appears to be a scanned image PDF with no embedded text. Paste the onboarding summary manually."
        );
        return;
      }

      extractedText = extractJson.text ?? "";
      if (!extractedText.trim()) {
        setPdfStage("scanned");
        setPdfError(
          "No text could be extracted from this PDF. Paste the onboarding summary manually."
        );
        return;
      }

      // Populate the textarea with extracted text
      setSummaryText(extractedText);
    } catch (err) {
      setPdfStage("error");
      setPdfError(
        `PDF extraction failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }. Paste the onboarding summary manually.`
      );
      return;
    }

    // ── Step 3: Automatically run Veronica intelligence extraction ───────────
    setPdfStage("analyzing");
    setIsExtracting(true);
    try {
      const res = await fetch("/api/ai/extract-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, onboardingSummary: extractedText }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const { intelligence, mockMode: isMock, provider, notice } = await res.json();
      const extracted: ClientIntelligence = { ...intelligence, onboardingSummary: extractedText };
      setIntel(extracted);
      saveIntelligence(extracted);
      setExtractSuccess(true);
      setMockMode(isMock);
      setAiProvider(provider ?? "mock");
      if (notice) setExtractError(notice);
      // ── Step 4: Mark as saved ──────────────────────────────────────────────
      setPdfStage("saved");
    } catch (err) {
      setExtractError(
        `Veronica analysis failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setPdfStage("error");
    } finally {
      setIsExtracting(false);
    }
  }

  function handleSaveSummary() {
    if (!intel) return;
    const updated: ClientIntelligence = { ...intel, onboardingSummary: summaryText };
    saveIntelligence(updated);
    setIntel(updated);
  }

  async function handleExtract() {
    if (!summaryText.trim()) return;
    setIsExtracting(true);
    setExtractError(null);
    setExtractSuccess(false);

    try {
      const res = await fetch("/api/ai/extract-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, onboardingSummary: summaryText }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const { intelligence, mockMode: isMock, provider, notice } = await res.json();
      const extracted: ClientIntelligence = { ...intelligence, onboardingSummary: summaryText };
      setIntel(extracted);
      saveIntelligence(extracted);
      setExtractSuccess(true);
      setMockMode(isMock);
      setAiProvider(provider ?? "mock");
      if (notice) setExtractError(notice);
    } catch (err) {
      setExtractError(`Extraction failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-[#f8f8f7]">Client Intelligence</h3>
          <p className="text-[12px] text-[#6b7a99] mt-0.5">
            Onboarding summary, buyer psychology, market research, and campaign implications
          </p>
        </div>
        {intel?.extractedAt && (
          <span className="text-[10px] text-[#3d4f6e]">Last extracted: {intel.extractedAt}</span>
        )}
      </div>

      {extractSuccess && !mockMode && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-[#22c55e]" />
            <p className="text-[12px] text-[#22c55e]">
              <span className="font-semibold">Intelligence extracted with live AI — </span>
              {aiProvider === "anthropic" ? "Anthropic Claude (claude-sonnet-4-6)" : aiProvider === "openai" ? "OpenAI GPT-4o" : aiProvider}
            </p>
          </div>
          <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 uppercase tracking-wider">
            {aiProvider === "anthropic" ? "Claude" : aiProvider === "openai" ? "GPT-4o" : "Live AI"}
          </span>
        </div>
      )}

      {mockMode && (
        <div className="flex items-start gap-2 px-4 py-3 bg-[#3d4f6e]/20 border border-[#3d4f6e]/40 rounded-xl">
          <AlertCircle size={13} className="text-[#6b7a99] flex-shrink-0 mt-0.5" />
          <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
            <p className="text-[12px] text-[#6b7a99]">
              <span className="font-semibold text-[#f8f8f7]">Mock extraction mode — </span>
              Showing Kaczmar Builders default intelligence as example. Set AI_PROVIDER=anthropic with a real key for live extraction.
            </p>
            <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3d4f6e]/40 text-[#6b7a99] border border-[#3d4f6e]/60 uppercase tracking-wider">Mock</span>
          </div>
        </div>
      )}

      {extractError && !extractSuccess && (
        <div className="flex items-start gap-2 px-4 py-3 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl">
          <AlertCircle size={13} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#6b7a99]">{extractError}</p>
        </div>
      )}

      {/* Onboarding Summary */}
      <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[#3d4f6e] uppercase tracking-wider">
            Onboarding Summary
          </label>
          <span className="text-[10px] text-[#3d4f6e]">{summaryText.length} chars</span>
        </div>

        {/* PDF Upload */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            onChange={handlePdfSelect}
            className="hidden"
          />
          <button
            onClick={() => {
              setPdfStage("idle");
              setPdfError(null);
              pdfInputRef.current?.click();
            }}
            disabled={pdfStage === "uploading" || pdfStage === "extracting" || pdfStage === "analyzing"}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] rounded-lg text-[11px] text-[#6b7a99] hover:text-[#f8f8f7] hover:border-[rgba(0,129,242,0.25)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pdfStage === "uploading" || pdfStage === "extracting" || pdfStage === "analyzing" ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Paperclip size={11} />
            )}
            {pdfStage === "uploading"
              ? "Uploading PDF…"
              : pdfStage === "extracting"
              ? "Extracting text…"
              : pdfStage === "analyzing"
              ? "Veronica is analyzing…"
              : "Upload PDF"}
          </button>
          {pdfFileName && pdfStage !== "idle" && (
            <span className="flex items-center gap-1 text-[11px] text-[#a78bfa]">
              <FileText size={10} />
              {pdfFileName}
            </span>
          )}
        </div>

        {/* PDF stage banners */}
        {pdfStage === "saved" && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-[#22c55e]/8 border border-[#22c55e]/25 rounded-lg">
            <CheckCircle2 size={12} className="text-[#22c55e] flex-shrink-0" />
            <p className="text-[11px] text-[#22c55e] font-semibold leading-snug">
              Saved to Client Intelligence — text extracted from {pdfFileName} and analyzed by Veronica.
            </p>
          </div>
        )}

        {(pdfStage === "error" || pdfStage === "scanned") && pdfError && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-[#ef4444]/8 border border-[#ef4444]/25 rounded-lg">
            <AlertCircle size={12} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#6b7a99] leading-snug">
              <span className="text-[#ef4444] font-semibold">PDF extraction failed. </span>
              {pdfError}
            </p>
          </div>
        )}

        {(pdfStage === "uploading" || pdfStage === "extracting" || pdfStage === "analyzing") && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0081f2]/8 border border-[#0081f2]/20 rounded-lg">
            <Loader2 size={12} className="text-[#0081f2] animate-spin flex-shrink-0" />
            <p className="text-[11px] text-[#0081f2] font-semibold leading-snug">
              {pdfStage === "uploading"
                ? "Uploading PDF to Supabase Storage…"
                : pdfStage === "extracting"
                ? "Extracting text from PDF…"
                : "Veronica is analyzing the onboarding summary…"}
            </p>
          </div>
        )}

        <textarea
          value={summaryText}
          onChange={(e) => setSummaryText(e.target.value)}
          placeholder="Paste the client's onboarding summary here. Include company profile, service area, target market, buyer psychology, competitors, KPIs, and campaign goals..."
          rows={10}
          className="w-full bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg px-3 py-2.5 text-[12px] text-[#f8f8f7] placeholder-[#3d4f6e] focus:outline-none focus:border-[#0081f2]/40 transition-colors leading-relaxed resize-y"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveSummary}
            disabled={!intel || summaryText === intel.onboardingSummary}
            className="px-3 py-1.5 text-[12px] font-medium text-[#6b7a99] border border-[rgba(0, 129, 242, 0.15)] rounded-lg hover:text-[#f8f8f7] hover:border-[rgba(0, 129, 242, 0.25)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Summary
          </button>
          <button
            onClick={handleExtract}
            disabled={isExtracting || !summaryText.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 vc-blue-gradient text-white text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExtracting ? (
              <><Loader2 size={12} className="animate-spin" />Extracting...</>
            ) : (
              <><Brain size={12} />Extract Intelligence</>
            )}
          </button>
          <span className="text-[11px] text-[#3d4f6e]">
            {intel ? "Updates all sections below" : "Creates intelligence from summary"}
          </span>
        </div>
      </div>

      {/* No intelligence yet */}
      {!intel && (
        <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] flex items-center justify-center mx-auto mb-3">
            <Brain size={16} className="text-[#3d4f6e]" />
          </div>
          <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">No intelligence extracted yet</div>
          <p className="text-[12px] text-[#6b7a99]">
            Paste an onboarding summary above and click Extract Intelligence to populate all sections.
          </p>
        </div>
      )}

      {/* Extracted sections */}
      {intel && (
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-[#3d4f6e] uppercase tracking-widest px-1">
            Extracted Intelligence Sections
          </div>

          <IntelCard title="Campaign Implications" icon={Lightbulb} color="#ff8400" defaultOpen>
            <div className="space-y-1 mt-2">
              <BulletField label="Best Campaign Angles" items={intel.campaignImplications.bestCampaignAngles} color="#ff8400" />
              <BulletField label="Services to Prioritize" items={intel.campaignImplications.servicesToPrioritize} color="#22c55e" />
              <BulletField label="Offers to Test" items={intel.campaignImplications.offersToTest} color="#0081f2" />
              <BulletField label="Creative Formats" items={intel.campaignImplications.creativeFormats} color="#a78bfa" />
              <BulletField label="Lead Form Questions" items={intel.campaignImplications.leadFormQuestions} color="#6b7a99" />
              <BulletField label="Follow-Up Strategy" items={intel.campaignImplications.followUpStrategy} color="#22c55e" />
              <BulletField label="What NOT to Say" items={intel.campaignImplications.whatNotToSay} color="#ef4444" />
            </div>
          </IntelCard>

          <IntelCard title="Buyer Profile & Psychology" icon={Users} color="#0081f2" defaultOpen>
            <div className="space-y-1 mt-2">
              <FieldRow label="Primary buyer" value={intel.buyerProfile.primaryBuyerType} />
              <FieldRow label="Homeowner profile" value={intel.buyerProfile.homeownerProfile} />
              <FieldRow label="Decision maker" value={intel.buyerProfile.decisionMaker} />
              <FieldRow label="Income notes" value={intel.buyerProfile.incomeNotes} />
              <BulletField label="Trust Triggers" items={intel.buyerProfile.trustTriggers} color="#22c55e" />
              <BulletField label="Urgency Triggers" items={intel.buyerProfile.urgencyTriggers} color="#ff8400" />
              <BulletField label="Common Objections" items={intel.buyerProfile.commonObjections} color="#ef4444" />
              <BulletField label="Common Fears" items={intel.buyerProfile.commonFears} color="#f59e0b" />
              <BulletField label="Buying Motivations" items={intel.buyerProfile.buyingMotivations} color="#0081f2" />
              <BulletField label="Why They Delay" items={intel.buyerProfile.reasonsTheyDelay} color="#6b7a99" />
              <BulletField label="Why They Choose You" items={intel.buyerProfile.whyTheyChoose} color="#22c55e" />
            </div>
          </IntelCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <IntelCard title="Company Profile" icon={Target} color="#a78bfa">
              <div className="mt-2 space-y-0">
                <FieldRow label="Owner" value={intel.companyProfile.ownerName} />
                <FieldRow label="Phone" value={intel.companyProfile.phone} />
                <FieldRow label="Email" value={intel.companyProfile.email} />
                <FieldRow label="Address" value={intel.companyProfile.officeAddress} />
                <FieldRow label="Avg ticket" value={intel.companyProfile.avgTicketValue} />
                <FieldRow label="Close rate" value={intel.companyProfile.currentCloseRate} />
                <FieldRow label="Capacity" value={intel.companyProfile.monthlyCapacity} />
                <FieldRow label="Bottleneck" value={intel.companyProfile.biggestBottleneck} />
                <FieldRow label="Financing" value={intel.companyProfile.financingOffered ? "Yes" : "No"} />
              </div>
            </IntelCard>

            <IntelCard title="KPI Baseline" icon={TrendingUp} color="#22c55e">
              <div className="mt-2 space-y-0">
                <FieldRow label="Monthly leads" value={String(intel.kpiBaseline.monthlyLeads)} />
                <FieldRow label="Appointments" value={String(intel.kpiBaseline.monthlyAppointments)} />
                <FieldRow label="Closes/mo" value={String(intel.kpiBaseline.monthlyCloses)} />
                <FieldRow label="Revenue/mo" value={intel.kpiBaseline.monthlyRevenue} />
                <FieldRow label="Avg job size" value={intel.kpiBaseline.avgJobSize} />
                <FieldRow label="Close rate" value={intel.kpiBaseline.closePercentage} />
                <FieldRow label="Cost per lead" value={intel.kpiBaseline.costPerLead} />
                <FieldRow label="Show rate" value={intel.kpiBaseline.showRate} />
                <FieldRow label="Ad spend" value={intel.kpiBaseline.currentAdSpend} />
                <BulletField label="Lead Sources" items={intel.kpiBaseline.currentLeadSources} color="#0081f2" />
              </div>
            </IntelCard>

            <IntelCard title="Service Area" icon={MapPin} color="#0081f2">
              <div className="mt-2 space-y-0">
                <FieldRow label="Region" value={intel.serviceArea.radius} />
                <FieldRow label="State" value={intel.serviceArea.state} />
                <BulletField label="Cities" items={intel.serviceArea.cities} color="#0081f2" />
                <BulletField label="Best Neighborhoods" items={intel.serviceArea.bestNeighborhoods} color="#22c55e" />
              </div>
            </IntelCard>

            <IntelCard title="Target Market" icon={Users} color="#ff8400">
              <div className="mt-2 space-y-0">
                <FieldRow label="Age range" value={intel.targetMarket.idealAgeRange} />
                <FieldRow label="HHI" value={intel.targetMarket.householdIncome} />
                <FieldRow label="Home ownership" value={intel.targetMarket.homeownership} />
                <FieldRow label="Location type" value={intel.targetMarket.locationType} />
                <FieldRow label="Top service" value={intel.targetMarket.highestMarginService} />
                <BulletField label="Occupations" items={intel.targetMarket.occupations} color="#ff8400" />
                <BulletField label="Preferred jobs" items={intel.targetMarket.preferredJobTypes} color="#22c55e" />
              </div>
            </IntelCard>
          </div>

          <IntelCard title="Market Research" icon={BarChart3} color="#a78bfa">
            <div className="mt-2 space-y-1">
              <FieldRow label="Primary market" value={intel.marketResearch.primaryMarket} />
              <FieldRow label="Local notes" value={intel.marketResearch.localMarketNotes} />
              <FieldRow label="Seasonality" value={intel.marketResearch.seasonality} />
              <FieldRow label="Storm relevance" value={intel.marketResearch.stormRelevance} />
              <BulletField label="Main Competitors" items={intel.marketResearch.mainCompetitors} color="#ef4444" />
              <BulletField label="Competitor Weaknesses" items={intel.marketResearch.competitorWeaknesses} color="#22c55e" />
              <BulletField label="Opportunities" items={intel.marketResearch.opportunities} color="#0081f2" />
              <BulletField label="Risks" items={intel.marketResearch.risks} color="#f59e0b" />
            </div>
          </IntelCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <IntelCard title="Offer Intelligence" icon={Zap} color="#22c55e">
              <div className="mt-2 space-y-0">
                <FieldRow label="Main offer" value={intel.offerIntelligence.mainOffer} />
                <FieldRow label="Avg job value" value={intel.offerIntelligence.avgJobValue} />
                <FieldRow label="Financing" value={intel.offerIntelligence.financingAvailable} />
                <FieldRow label="Insurance notes" value={intel.offerIntelligence.insuranceNotes} />
                <BulletField label="Guarantees" items={intel.offerIntelligence.guarantees} color="#22c55e" />
                <BulletField label="Proof Points" items={intel.offerIntelligence.proofPoints} color="#0081f2" />
                <BulletField label="Prioritize" items={intel.offerIntelligence.jobsTheyWantMore} color="#ff8400" />
              </div>
            </IntelCard>

            <IntelCard title="Sales Audit" icon={CheckSquare} color="#f59e0b">
              <div className="mt-2 space-y-0">
                <FieldRow label="Lead process" value={intel.salesAudit.leadProcess} />
                <FieldRow label="Response time" value={intel.salesAudit.avgResponseTime} />
                <FieldRow label="Who answers" value={intel.salesAudit.whoAnswersCalls} />
                <FieldRow label="Has script" value={intel.salesAudit.hasSalesScript ? "Yes" : "No — gap identified"} />
                <FieldRow label="Follow-up" value={intel.salesAudit.followUpCadence} />
                <FieldRow label="Lost lead recovery" value={intel.salesAudit.lostLeadRecovery || "None — critical gap"} />
                <FieldRow label="Fall-off point" value={intel.salesAudit.leadFallOffPoint} />
              </div>
            </IntelCard>
          </div>

          <IntelCard title="Brand Intelligence" icon={ShieldCheck} color="#0081f2">
            <div className="mt-2 space-y-1">
              <FieldRow label="Tone" value={intel.brandIntelligence.brandTone} />
              <FieldRow label="Positioning" value={intel.brandIntelligence.brandPositioning} />
              <FieldRow label="Founder story" value={intel.brandIntelligence.founderStory} />
              <FieldRow label="Unique mechanism" value={intel.brandIntelligence.uniqueMechanism} />
              <BulletField label="Why Customers Trust" items={intel.brandIntelligence.whyCustomersTrust} color="#22c55e" />
              <BulletField label="Do NOT Say" items={intel.brandIntelligence.whatNotToSay} color="#ef4444" />
              <BulletField label="Compliance Notes" items={intel.brandIntelligence.complianceNotes} color="#f59e0b" />
            </div>
          </IntelCard>

          <IntelCard title="Sales Intelligence" icon={Target} color="#ff8400">
            <div className="mt-2 space-y-1">
              <BulletField label="Best Sales Angles" items={intel.salesIntelligence.bestSalesAngles} color="#ff8400" />
              <BulletField label="Worst-Fit Leads" items={intel.salesIntelligence.worstFitLeads} color="#ef4444" />
              <BulletField label="Objection Responses" items={intel.salesIntelligence.objectionResponses} color="#22c55e" />
              <BulletField label="Testimonials" items={intel.salesIntelligence.testimonials} color="#0081f2" />
              <BulletField label="Review Highlights" items={intel.salesIntelligence.reviewHighlights} color="#a78bfa" />
            </div>
          </IntelCard>

          <IntelCard title="Content Planning" icon={ImageIcon} color="#a78bfa">
            <div className="mt-2 space-y-1">
              <FieldRow label="Owner on camera" value={intel.contentPlanning.ownerOnCamera ? "Yes — willing and outgoing" : "No"} />
              <FieldRow label="Owner personality" value={intel.contentPlanning.ownerPersonality} />
              <FieldRow label="Content tone" value={intel.contentPlanning.contentTone} />
              <FieldRow label="Testimonials" value={intel.contentPlanning.testimonialsAvailable ? "Available" : "Not yet"} />
              <FieldRow label="Crew filming" value={intel.contentPlanning.crewWillingToFilm ? "Willing to film" : "Not yet confirmed"} />
              <BulletField label="Best Selling Points" items={intel.contentPlanning.biggestSellingPoints} color="#ff8400" />
              <BulletField label="Content Themes" items={intel.contentPlanning.recommendedContentThemes} color="#a78bfa" />
            </div>
          </IntelCard>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const [activeTab, setActiveTab] = useState("overview");
  // Start with mock data (fast); fall back to data provider for Supabase-added clients
  const [client, setClient] = useState<Client | null>(getClient(clientId) ?? null);
  const [clientLoading, setClientLoading] = useState(!getClient(clientId));

  useEffect(() => {
    if (client) return; // already found in mock data
    getDataProvider()
      .getClient(clientId)
      .then((c) => { setClient(c); setClientLoading(false); })
      .catch(() => setClientLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (clientLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20 gap-2 text-[#6b7a99]">
        <Loader2 size={16} className="animate-spin" />
        Loading client…
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-[#6b7a99]">Client not found.</p>
        <Link href="/clients" className="text-[#0081f2] text-sm mt-2 inline-block hover:underline">
          ← Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link
          href="/clients"
          className="flex items-center gap-1 text-[11px] text-[#6b7a99] hover:text-[#0081f2] transition-colors mb-3"
        >
          <ChevronLeft size={12} />
          Back to Clients
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-bold text-[#f8f8f7] tracking-tight">{client.name}</h2>
              <Badge label={client.status} variant={clientStatusVariant[client.status]} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-[12px] text-[#6b7a99]">
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {client.market}
              </span>
              <span className="flex items-center gap-1">
                <Phone size={11} />
                {client.owner} · {client.phone}
              </span>
              <span className="flex items-center gap-1">
                <Globe size={11} />
                {client.website}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-[12px] font-medium text-[#6b7a99] border border-[rgba(0, 129, 242, 0.15)] rounded-lg hover:text-[#f8f8f7] hover:border-[rgba(0, 129, 242, 0.25)] transition-colors">
              Edit Client
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 vc-orange-gradient text-white text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity">
              <Bot size={13} />
              Build Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-[rgba(0, 129, 242, 0.15)] overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
              activeTab === id
                ? "text-[#0081f2] border-[#0081f2]"
                : "text-[#6b7a99] border-transparent hover:text-[#f8f8f7]"
            }`}
          >
            <Icon size={13} />
            {label}
            {id === "intelligence" && (
              <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/25 rounded-full">
                AI
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "Leads", value: client.stats.leads > 0 ? client.stats.leads : "—", color: "#0081f2" },
              { label: "Booked", value: client.stats.booked > 0 ? client.stats.booked : "—", color: "#22c55e" },
              { label: "CPL", value: client.stats.cpl, color: "#f8f8f7" },
              { label: "CPBA", value: client.stats.cpba, color: "#f8f8f7" },
              { label: "Show Rate", value: client.stats.showRate, color: "#ff8400" },
              { label: "Pipeline", value: client.stats.pipeline, color: "#a78bfa" },
              { label: "Revenue", value: client.stats.revenue, color: "#22c55e" },
            ].map((s) => (
              <div key={s.label} className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-3 text-center">
                <div className="text-[15px] font-bold tracking-tight" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="text-[10px] text-[#6b7a99] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-5 space-y-4">
              <h3 className="text-[13px] font-semibold text-[#f8f8f7]">Client Profile</h3>
              <div className="space-y-3 text-[12px]">
                {[
                  { label: "Owner", value: client.owner },
                  { label: "Email", value: client.email },
                  { label: "Phone", value: client.phone },
                  { label: "Website", value: client.website },
                  { label: "Market", value: client.market },
                  { label: "Services", value: client.services.join(", ") },
                  { label: "Avg. Job Value", value: client.avgJobValue },
                  { label: "Monthly Budget", value: client.monthlyBudget },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="text-[#3d4f6e] w-28 flex-shrink-0">{label}</span>
                    <span className="text-[#f8f8f7]">{value}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[rgba(0, 129, 242, 0.15)] pt-4">
                <div className="text-[11px] text-[#3d4f6e] mb-1.5 font-semibold uppercase tracking-wider">Offer</div>
                <p className="text-[12px] text-[#f8f8f7]">{client.offer}</p>
              </div>
              <div>
                <div className="text-[11px] text-[#3d4f6e] mb-1.5 font-semibold uppercase tracking-wider">Brand Tone</div>
                <p className="text-[12px] text-[#6b7a99] leading-relaxed">{client.brandTone}</p>
              </div>
              <div>
                <div className="text-[11px] text-[#3d4f6e] mb-1.5 font-semibold uppercase tracking-wider">Notes</div>
                <p className="text-[12px] text-[#6b7a99] leading-relaxed">{client.notes}</p>
              </div>
            </div>

            <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-5">
              <h3 className="text-[13px] font-semibold text-[#f8f8f7] mb-4">Platform Connections</h3>
              <div className="space-y-2.5 text-[12px]">
                {[
                  { label: "Meta Ad Account", value: client.metaAccountId, color: "#0081f2" },
                  { label: "Meta Pixel", value: client.pixelId, color: "#0081f2" },
                  { label: "Facebook Page", value: client.fbPageId, color: "#0081f2" },
                  { label: "Instagram", value: client.instagramId, color: "#0081f2" },
                  { label: "GHL Location ID", value: client.ghlLocationId, color: "#22c55e" },
                  { label: "GHL Pipeline ID", value: client.ghlPipelineId, color: "#22c55e" },
                ].map(({ label, value, color }) => {
                  const isPending = value.toLowerCase().startsWith("pending");
                  return (
                    <div key={label} className="flex items-center justify-between p-2.5 bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)]/60 rounded-lg">
                      <span className="text-[#6b7a99]">{label}</span>
                      <span className="font-mono text-[11px]" style={{ color: isPending ? "#6b7a99" : color }}>
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns tab */}
      {activeTab === "campaigns" && (
        <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0, 129, 242, 0.15)]">
            <div className="flex items-center gap-2">
              <Megaphone size={13} className="text-[#0081f2]" />
              <span className="text-[13px] font-semibold text-[#f8f8f7]">Meta Campaigns — {client.name}</span>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 vc-orange-gradient text-white text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity">
              <Bot size={12} />Build New Campaign
            </button>
          </div>
          {client.campaigns.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-[12px] text-[#6b7a99]">No campaigns yet — use Build with Veronica to get started.</p>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[rgba(0, 129, 242, 0.15)]">
                  {["Campaign", "Type", "Status", "Budget", "Spend", "Leads", "CPL", "Booked"].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-[9px] font-bold text-[#3d4f6e] uppercase tracking-widest ${h === "Campaign" || h === "Type" ? "text-left" : "text-right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {client.campaigns.map((c, i) => (
                  <tr key={c.id} className={`border-b border-[rgba(0, 129, 242, 0.15)]/60 hover:bg-[#0f1a28]/60 transition-colors ${i === client.campaigns.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-5 py-3.5 text-[#f8f8f7] font-medium">{c.name}</td>
                    <td className="px-5 py-3.5 text-[#6b7a99]">{c.type}</td>
                    <td className="px-5 py-3.5 text-right"><Badge label={c.status} variant={campaignStatusVariant[c.status]} /></td>
                    <td className="px-5 py-3.5 text-right text-[#f8f8f7]">{c.budget}</td>
                    <td className="px-5 py-3.5 text-right text-[#f8f8f7]">{c.spend}</td>
                    <td className="px-5 py-3.5 text-right text-[#0081f2] font-semibold">{c.leads > 0 ? c.leads : "—"}</td>
                    <td className="px-5 py-3.5 text-right text-[#f8f8f7]">{c.cpl}</td>
                    <td className="px-5 py-3.5 text-right text-[#22c55e] font-semibold">{c.booked > 0 ? c.booked : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Intelligence tab */}
      {activeTab === "intelligence" && <IntelligenceTab clientId={client.id} />}

      {/* Files tab */}
      {activeTab === "files" && <ClientFilesTab clientId={client.id} />}

      {/* Integrations tab */}
      {activeTab === "integrations" && <IntegrationsTab clientId={client.id} clientName={client.name} />}

      {/* Placeholder for other tabs */}
      {activeTab !== "overview" && activeTab !== "campaigns" && activeTab !== "intelligence" && activeTab !== "files" && activeTab !== "integrations" && (
        <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] flex items-center justify-center mx-auto mb-3">
            <Zap size={20} className="text-[#0081f2]" />
          </div>
          <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">
            {tabs.find((t) => t.id === activeTab)?.label} — Coming Soon
          </div>
          <p className="text-[12px] text-[#6b7a99]">This section is being built for {client.name}.</p>
        </div>
      )}
    </div>
  );
}

// ─── Integrations Tab ─────────────────────────────────────────

interface IntegrationStatus {
  connected: boolean;
  connectionStatus?: string;
  accountId?: string;
  accountName?: string;
  locationId?: string;
  locationName?: string;
  lastSyncedAt?: string;
  hasCredentials?: boolean;
  totals?: {
    spend: number;
    leads: number;
    impressions: number;
    clicks: number;
    cpl: number | null;
  };
  snapshot?: {
    contacts: number;
    appointments: number;
    booked_appointments: number;
    pipeline_value: number;
    closed_revenue: number;
    opportunities: number;
  };
  error?: string;
}

function IntegrationsTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [metaStatus, setMetaStatus] = useState<IntegrationStatus | null>(null);
  const [ghlStatus, setGhlStatus] = useState<IntegrationStatus | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [ghlLoading, setGhlLoading] = useState(false);
  const [metaSyncing, setMetaSyncing] = useState(false);
  const [ghlSyncing, setGhlSyncing] = useState(false);
  const [metaMsg, setMetaMsg] = useState<string | null>(null);
  const [ghlMsg, setGhlMsg] = useState<string | null>(null);

  // Load status on mount
  useEffect(() => {
    loadMetaStatus();
    loadGhlStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function loadMetaStatus() {
    setMetaLoading(true);
    try {
      const res = await fetch(`/api/integrations/meta/status?clientId=${clientId}`);
      const data = await res.json();
      setMetaStatus(data);
    } catch {
      setMetaStatus({ connected: false, error: "Failed to load status" });
    } finally {
      setMetaLoading(false);
    }
  }

  async function loadGhlStatus() {
    setGhlLoading(true);
    try {
      const res = await fetch(`/api/integrations/ghl/status?clientId=${clientId}`);
      const data = await res.json();
      setGhlStatus(data);
    } catch {
      setGhlStatus({ connected: false, error: "Failed to load status" });
    } finally {
      setGhlLoading(false);
    }
  }

  async function testMeta() {
    setMetaLoading(true);
    setMetaMsg(null);
    try {
      const res = await fetch("/api/integrations/meta/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (data.connected) {
        setMetaMsg(`✓ Connected to ${data.accountName ?? data.accountId}`);
      } else {
        setMetaMsg(`✗ ${data.error ?? "Connection failed"}`);
      }
      await loadMetaStatus();
    } catch {
      setMetaMsg("✗ Network error");
    } finally {
      setMetaLoading(false);
    }
  }

  async function syncMeta() {
    setMetaSyncing(true);
    setMetaMsg(null);
    try {
      const res = await fetch("/api/integrations/meta/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (data.success) {
        setMetaMsg(`✓ Synced ${data.campaignsSynced} campaigns · $${data.totalSpend.toFixed(2)} spend · ${data.totalLeads} leads`);
      } else {
        setMetaMsg(`✗ ${data.error ?? "Sync failed"}`);
      }
      await loadMetaStatus();
    } catch {
      setMetaMsg("✗ Network error");
    } finally {
      setMetaSyncing(false);
    }
  }

  async function testGHL() {
    setGhlLoading(true);
    setGhlMsg(null);
    try {
      const res = await fetch("/api/integrations/ghl/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (data.connected) {
        setGhlMsg(`✓ Connected to ${data.locationName ?? data.locationId}`);
      } else {
        setGhlMsg(`✗ ${data.error ?? "Connection failed"}`);
      }
      await loadGhlStatus();
    } catch {
      setGhlMsg("✗ Network error");
    } finally {
      setGhlLoading(false);
    }
  }

  async function syncGHL() {
    setGhlSyncing(true);
    setGhlMsg(null);
    try {
      const res = await fetch("/api/integrations/ghl/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (data.success) {
        setGhlMsg(`✓ Synced ${data.contacts} contacts · ${data.bookedAppointments} booked appts · $${data.pipelineValue.toFixed(0)} pipeline`);
      } else {
        setGhlMsg(`✗ ${data.error ?? "Sync failed"}`);
      }
      await loadGhlStatus();
    } catch {
      setGhlMsg("✗ Network error");
    } finally {
      setGhlSyncing(false);
    }
  }

  const cardCls = "bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl overflow-hidden";
  const btnCls = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors";

  function StatusBadge({ status }: { status: IntegrationStatus | null; }) {
    if (!status) return <span className="text-[10px] text-[#3d4f6e]">Loading…</span>;
    if (status.connected) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-[#22c55e]">
          <Wifi size={10} /> Connected
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#6b7a99]">
        <WifiOff size={10} /> Not Connected
      </span>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Link2 size={14} className="text-[#0081f2]" />
          <span className="text-[13px] font-semibold text-[#f8f8f7]">Integrations — {clientName}</span>
        </div>
        <p className="text-[11px] text-[#6b7a99] leading-snug">
          Connect Meta Ads and GoHighLevel to sync real performance data for this client.
          All connections are <strong className="text-[#f8f8f7]">read-only</strong> — Veronica never writes to Meta or GHL.
          Credentials are stored in Vercel environment variables and never exposed to the browser.
        </p>
      </div>

      {/* Meta Ads */}
      <div className={cardCls}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,129,242,0.15)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#1877f2]/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#1877f2]">M</span>
            </div>
            <span className="text-[12px] font-semibold text-[#f8f8f7]">Meta Ads</span>
            <span className="text-[10px] text-[#3d4f6e]">Read-only · Campaigns, Insights, Spend</span>
          </div>
          <StatusBadge status={metaStatus} />
        </div>

        <div className="p-4 space-y-3">
          {/* Credentials check */}
          {metaStatus && !metaStatus.hasCredentials && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#ff8400]/10 border border-[#ff8400]/30 rounded-lg">
              <AlertCircle size={12} className="text-[#ff8400] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-[#6b7a99] leading-snug">
                <span className="text-[#f8f8f7] font-semibold">Credentials not configured. </span>
                Add <code className="text-[#0081f2]">META_ACCESS_TOKEN</code>, <code className="text-[#0081f2]">META_APP_ID</code>, and <code className="text-[#0081f2]">META_APP_SECRET</code> to your Vercel environment variables.
              </div>
            </div>
          )}

          {/* Account info */}
          {metaStatus?.connected && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0f1a28] rounded-lg p-3">
                <div className="text-[10px] text-[#3d4f6e] mb-1">Ad Account</div>
                <div className="text-[12px] font-semibold text-[#f8f8f7]">{metaStatus.accountId ?? "—"}</div>
              </div>
              <div className="bg-[#0f1a28] rounded-lg p-3">
                <div className="text-[10px] text-[#3d4f6e] mb-1">Last Synced</div>
                <div className="text-[12px] font-semibold text-[#f8f8f7]">
                  {metaStatus.lastSyncedAt ? new Date(metaStatus.lastSyncedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
                </div>
              </div>
            </div>
          )}

          {/* Performance totals */}
          {metaStatus?.totals && (metaStatus.totals.spend > 0 || metaStatus.totals.leads > 0) && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Spend", value: `$${metaStatus.totals.spend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "#ff8400" },
                { label: "Leads", value: metaStatus.totals.leads.toLocaleString(), color: "#0081f2" },
                { label: "Impressions", value: metaStatus.totals.impressions.toLocaleString(), color: "#a78bfa" },
                { label: "CPL", value: metaStatus.totals.cpl != null ? `$${metaStatus.totals.cpl.toFixed(2)}` : "—", color: "#22c55e" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#0f1a28] rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-[#3d4f6e] mb-0.5">{label}</div>
                  <div className="text-[12px] font-bold" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Message */}
          {metaMsg && (
            <div className={`text-[11px] px-3 py-2 rounded-lg ${metaMsg.startsWith("✓") ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30" : "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30"}`}>
              {metaMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={testMeta}
              disabled={metaLoading}
              className={`${btnCls} bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] text-[#6b7a99] hover:text-[#f8f8f7] hover:border-[rgba(0,129,242,0.3)]`}
            >
              {metaLoading ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
              Test Connection
            </button>
            <button
              onClick={syncMeta}
              disabled={metaSyncing || !metaStatus?.hasCredentials}
              className={`${btnCls} bg-[#0081f2]/10 border border-[#0081f2]/30 text-[#0081f2] hover:bg-[#0081f2]/20 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {metaSyncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
              Sync Now
            </button>
            <button
              onClick={loadMetaStatus}
              className={`${btnCls} bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] text-[#3d4f6e] hover:text-[#6b7a99]`}
            >
              <RefreshCw size={10} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* GoHighLevel */}
      <div className={cardCls}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,129,242,0.15)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#22c55e]/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#22c55e]">G</span>
            </div>
            <span className="text-[12px] font-semibold text-[#f8f8f7]">GoHighLevel</span>
            <span className="text-[10px] text-[#3d4f6e]">Read-only · Contacts, Appointments, Pipeline</span>
          </div>
          <StatusBadge status={ghlStatus} />
        </div>

        <div className="p-4 space-y-3">
          {/* Credentials check */}
          {ghlStatus && !ghlStatus.hasCredentials && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#ff8400]/10 border border-[#ff8400]/30 rounded-lg">
              <AlertCircle size={12} className="text-[#ff8400] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-[#6b7a99] leading-snug">
                <span className="text-[#f8f8f7] font-semibold">Credentials not configured. </span>
                Add <code className="text-[#0081f2]">GHL_API_KEY</code> and <code className="text-[#0081f2]">GHL_LOCATION_ID</code> to your Vercel environment variables.
              </div>
            </div>
          )}

          {/* Location info */}
          {ghlStatus?.connected && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0f1a28] rounded-lg p-3">
                <div className="text-[10px] text-[#3d4f6e] mb-1">Location ID</div>
                <div className="text-[12px] font-semibold text-[#f8f8f7]">{ghlStatus.locationId ?? "—"}</div>
              </div>
              <div className="bg-[#0f1a28] rounded-lg p-3">
                <div className="text-[10px] text-[#3d4f6e] mb-1">Last Synced</div>
                <div className="text-[12px] font-semibold text-[#f8f8f7]">
                  {ghlStatus.lastSyncedAt ? new Date(ghlStatus.lastSyncedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
                </div>
              </div>
            </div>
          )}

          {/* Pipeline snapshot */}
          {ghlStatus?.snapshot && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Contacts", value: (ghlStatus.snapshot.contacts ?? 0).toLocaleString(), color: "#0081f2" },
                { label: "Appointments", value: (ghlStatus.snapshot.appointments ?? 0).toLocaleString(), color: "#a78bfa" },
                { label: "Booked", value: (ghlStatus.snapshot.booked_appointments ?? 0).toLocaleString(), color: "#22c55e" },
                { label: "Pipeline", value: `$${(ghlStatus.snapshot.pipeline_value ?? 0).toLocaleString()}`, color: "#ff8400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#0f1a28] rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-[#3d4f6e] mb-0.5">{label}</div>
                  <div className="text-[12px] font-bold" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Message */}
          {ghlMsg && (
            <div className={`text-[11px] px-3 py-2 rounded-lg ${ghlMsg.startsWith("✓") ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30" : "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30"}`}>
              {ghlMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={testGHL}
              disabled={ghlLoading}
              className={`${btnCls} bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] text-[#6b7a99] hover:text-[#f8f8f7] hover:border-[rgba(0,129,242,0.3)]`}
            >
              {ghlLoading ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
              Test Connection
            </button>
            <button
              onClick={syncGHL}
              disabled={ghlSyncing || !ghlStatus?.hasCredentials}
              className={`${btnCls} bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/20 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {ghlSyncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
              Sync Now
            </button>
            <button
              onClick={loadGhlStatus}
              className={`${btnCls} bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] text-[#3d4f6e] hover:text-[#6b7a99]`}
            >
              <RefreshCw size={10} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Setup instructions */}
      <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.08)] rounded-xl p-4">
        <div className="text-[11px] font-semibold text-[#3d4f6e] uppercase tracking-wider mb-2">Setup Instructions</div>
        <div className="space-y-2 text-[11px] text-[#6b7a99] leading-relaxed">
          <p><span className="text-[#f8f8f7] font-semibold">Meta Ads:</span> Add a Meta System User token with <code className="text-[#0081f2]">ads_read</code> permission. Set <code className="text-[#0081f2]">META_ACCESS_TOKEN</code>, <code className="text-[#0081f2]">META_APP_ID</code>, <code className="text-[#0081f2]">META_APP_SECRET</code> in Vercel. Then add this client&apos;s Ad Account ID in the client Overview tab under &quot;Meta Ad Account&quot;.</p>
          <p><span className="text-[#f8f8f7] font-semibold">GoHighLevel:</span> Create a GHL Private Integration App with read-only scopes. Set <code className="text-[#0081f2]">GHL_API_KEY</code> and <code className="text-[#0081f2]">GHL_LOCATION_ID</code> in Vercel. Then add this client&apos;s Location ID in the client Overview tab under &quot;GHL Location ID&quot;.</p>
          <p><span className="text-[#f8f8f7] font-semibold">Full setup guide:</span> See <code className="text-[#0081f2]">docs/integrations-setup.md</code> in the repository.</p>
        </div>
      </div>
    </div>
  );
}
