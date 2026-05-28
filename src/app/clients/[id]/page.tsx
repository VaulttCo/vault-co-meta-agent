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
  Eye,
  EyeOff,
  KeyRound,
  Save,
  Lock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { getClient, clientStatusVariant, campaignStatusVariant } from "@/lib/data";
import type { Client, ClientStatus } from "@/lib/data";
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
  { id: "ghl", label: "GHL Pipeline", icon: Settings },
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
    <div className="vc-panel">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
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
        <div className="vc-panel">
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
        setPdfStage("scanned");
        setPdfError(
          extractJson.error ??
            "PDF text could not be extracted automatically. You can paste the onboarding summary manually, or try exporting the PDF as a text-based PDF."
        );
        return;
      }

      extractedText = extractJson.text ?? "";
      if (!extractedText.trim()) {
        setPdfStage("scanned");
        setPdfError(
          "PDF text could not be extracted automatically. You can paste the onboarding summary manually, or try exporting the PDF as a text-based PDF."
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

// ─── Edit Client Modal ────────────────────────────────────────

interface EditFormState {
  name: string;
  owner: string;
  email: string;
  phone: string;
  website: string;
  market: string;
  notes: string;
  // Integration ID backfill — stored in clients table only, no API writes
  ghlPipelineId: string;
  metaAccountId: string;
  pixelId: string;
  fbPageId: string;
}

function EditClientModal({
  clientId,
  client,
  onClose,
  onSaved,
}: {
  clientId: string;
  client: Client;
  onClose: () => void;
  onSaved: (updates: Partial<Client>) => void;
}) {
  const [form, setForm] = useState<EditFormState>({
    name: client.name,
    owner: client.owner,
    email: client.email,
    phone: client.phone,
    website: client.website,
    market: client.market,
    notes: client.notes,
    ghlPipelineId: client.ghlPipelineId ?? "",
    metaAccountId: client.metaAccountId ?? "",
    pixelId: client.pixelId ?? "",
    fbPageId: client.fbPageId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function field(key: keyof EditFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed. Please try again.");
        return;
      }
      setSaved(true);
      onSaved({
        name: form.name,
        owner: form.owner,
        email: form.email,
        phone: form.phone,
        website: form.website,
        market: form.market,
        notes: form.notes,
        ghlPipelineId: form.ghlPipelineId,
        metaAccountId: form.metaAccountId,
        pixelId: form.pixelId,
        fbPageId: form.fbPageId,
      });
      setTimeout(() => onClose(), 800);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 text-[12px] bg-[#0d0e12] border border-[rgba(0,129,242,0.2)] rounded-lg text-[#f8f8f7] placeholder-[#3d4f6e] focus:outline-none focus:border-[rgba(0,129,242,0.45)] transition-colors";
  const labelCls = "block text-[11px] font-semibold text-[#6b7a99] uppercase tracking-wider mb-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg bg-[#13151c] border border-[rgba(0,129,242,0.18)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,129,242,0.12)]">
          <div>
            <h3 className="text-[14px] font-bold text-[#f8f8f7]">Edit Client</h3>
            <p className="text-[11px] text-[#6b7a99] mt-0.5">{client.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1a1d27] transition-colors text-[#6b7a99] hover:text-[#f8f8f7]"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Company Name</label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => field("name", e.target.value)}
                placeholder="Company name"
              />
            </div>
            <div>
              <label className={labelCls}>Owner Name</label>
              <input
                className={inputCls}
                value={form.owner}
                onChange={(e) => field("owner", e.target.value)}
                placeholder="Owner name"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) => field("email", e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                className={inputCls}
                value={form.phone}
                onChange={(e) => field("phone", e.target.value)}
                placeholder="(555) 000-0000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Website</label>
              <input
                className={inputCls}
                value={form.website}
                onChange={(e) => field("website", e.target.value)}
                placeholder="example.com"
              />
            </div>
            <div>
              <label className={labelCls}>Market / Service Area</label>
              <input
                className={inputCls}
                value={form.market}
                onChange={(e) => field("market", e.target.value)}
                placeholder="City, State"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={form.notes}
              onChange={(e) => field("notes", e.target.value)}
              placeholder="Internal notes about this client…"
            />
          </div>
          {/* Integration ID backfill — reference fields only, no API writes */}
          <div className="border-t border-[rgba(0,129,242,0.08)] pt-4">
            <p className="text-[10px] font-semibold text-[#6b7a99] uppercase tracking-wider mb-3">Platform ID Backfill</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Meta Ad Account ID</label>
                <input
                  className={inputCls}
                  value={form.metaAccountId}
                  onChange={(e) => field("metaAccountId", e.target.value)}
                  placeholder="act_123456789"
                />
              </div>
              <div>
                <label className={labelCls}>Meta Pixel ID</label>
                <input
                  className={inputCls}
                  value={form.pixelId}
                  onChange={(e) => field("pixelId", e.target.value)}
                  placeholder="123456789012345"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelCls}>Facebook Page ID</label>
                <input
                  className={inputCls}
                  value={form.fbPageId}
                  onChange={(e) => field("fbPageId", e.target.value)}
                  placeholder="YourPageName"
                />
              </div>
              <div>
                <label className={labelCls}>GHL Pipeline ID</label>
                <input
                  className={inputCls}
                  value={form.ghlPipelineId}
                  onChange={(e) => field("ghlPipelineId", e.target.value)}
                  placeholder="pipeline-id"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[rgba(0,129,242,0.12)] flex items-center justify-between">
          <div className="text-[11px]">
            {error && (
              <span className="flex items-center gap-1.5 text-[#f87171]">
                <AlertCircle size={11} />
                {error}
              </span>
            )}
            {saved && (
              <span className="flex items-center gap-1.5 text-[#4ade80]">
                <CheckCircle2 size={11} />
                Saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-medium text-[#6b7a99] hover:text-[#f8f8f7] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "rgba(0,129,242,0.18)", border: "1px solid rgba(0,129,242,0.3)", color: "#60b4ff" }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? "Saving…" : saved ? "Saved" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Client Status Control ────────────────────────────────────

const ALL_STATUSES: ClientStatus[] = ["onboarding", "setup", "active", "paused", "archived"];

const STATUS_LABELS: Record<ClientStatus, string> = {
  onboarding: "Onboarding",
  setup: "Setup",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

function ClientStatusControl({
  clientId,
  initialStatus,
  canEdit,
}: {
  clientId: string;
  initialStatus: ClientStatus;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState<ClientStatus>(initialStatus);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<"success" | "error" | null>(null);

  async function handleChange(next: ClientStatus) {
    if (next === status) return;
    setSaving(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus(next);
      setFlash("success");
    } catch {
      setFlash("error");
    } finally {
      setSaving(false);
      setTimeout(() => setFlash(null), 2500);
    }
  }

  if (!canEdit) {
    return <Badge label={status} variant={clientStatusVariant[status]} />;
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <select
          value={status}
          onChange={(e) => handleChange(e.target.value as ClientStatus)}
          disabled={saving}
          className="appearance-none pl-2.5 pr-6 py-0.5 text-[11px] font-semibold rounded-full border cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none transition-colors"
          style={{
            background:
              status === "active" ? "rgba(34,197,94,0.12)"
              : status === "paused" ? "rgba(234,179,8,0.12)"
              : status === "archived" ? "rgba(107,122,153,0.12)"
              : status === "setup" ? "rgba(0,129,242,0.12)"
              : "rgba(255,132,0,0.12)",
            color:
              status === "active" ? "#4ade80"
              : status === "paused" ? "#facc15"
              : status === "archived" ? "#7b82a0"
              : status === "setup" ? "#60b4ff"
              : "#ff8400",
            borderColor:
              status === "active" ? "rgba(74,222,128,0.3)"
              : status === "paused" ? "rgba(250,204,21,0.3)"
              : status === "archived" ? "rgba(107,122,153,0.25)"
              : status === "setup" ? "rgba(96,180,255,0.3)"
              : "rgba(255,132,0,0.3)",
          }}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s} style={{ background: "#13151c", color: "#e8eaf0" }}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <ChevronDown
          size={10}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "inherit", opacity: 0.7 }}
        />
      </div>
      {saving && <Loader2 size={11} className="animate-spin text-[#6b7a99]" />}
      {flash === "success" && <CheckCircle2 size={11} className="text-[#4ade80]" />}
      {flash === "error" && <AlertCircle size={11} className="text-[#f87171]" />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

interface MetaSnapshotItem {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  status: string | null;
  objective: string | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpm: number | null;
  leads: number | null;
  cpl: number | null;
  date_start: string;
  date_end: string;
  synced_at: string;
}

interface MetaSnapshotAggregated {
  totalSpend: number;
  totalLeads: number;
  totalImpressions: number;
  totalClicks: number;
  avgCpl: number | null;
  avgCtr: number | null;
  avgCpm: number | null;
  lastSyncedAt: string | null;
  dateRange: { since: string; until: string } | null;
}

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const { can } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  // Start with mock data (fast); fall back to data provider for Supabase-added clients
  const [client, setClient] = useState<Client | null>(getClient(clientId) ?? null);
  const [clientLoading, setClientLoading] = useState(!getClient(clientId));

  // Meta campaign snapshots (live synced data from meta_campaign_snapshots)
  const [metaSnapshots, setMetaSnapshots] = useState<MetaSnapshotItem[]>([]);
  const [metaSnapshotAgg, setMetaSnapshotAgg] = useState<MetaSnapshotAggregated | null>(null);
  const [metaSnapshotsLoading, setMetaSnapshotsLoading] = useState(false);

  useEffect(() => {
    // Always fetch from server — gets current Supabase data even for mock-seeded clients.
    // This ensures edits persist visually after refresh.
    fetch(`/api/clients/${clientId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.client) setClient(data.client); })
      .catch(() => {}) // keep existing mock data on error
      .finally(() => setClientLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    if (activeTab !== "campaigns") return;
    setMetaSnapshotsLoading(true);
    fetch(`/api/integrations/meta/snapshots?clientId=${clientId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.snapshots) setMetaSnapshots(data.snapshots);
        if (data?.aggregated) setMetaSnapshotAgg(data.aggregated);
      })
      .catch(() => {})
      .finally(() => setMetaSnapshotsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, clientId]);

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
              <ClientStatusControl
                clientId={clientId}
                initialStatus={client.status}
                canEdit={can("canEditClients")}
              />
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
            {can("canEditClients") && (
              <button
                onClick={() => setEditOpen(true)}
                className="px-3 py-1.5 text-[12px] font-medium text-[#6b7a99] border border-[rgba(0,129,242,0.15)] rounded-lg hover:text-[#f8f8f7] hover:border-[rgba(0,129,242,0.25)] transition-colors"
              >
                Edit Client
              </button>
            )}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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

      {/* Campaigns tab — live Meta snapshot data */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          {/* Header card */}
          <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,129,242,0.15)]">
              <div className="flex items-center gap-2">
                <Megaphone size={13} className="text-[#0081f2]" />
                <span className="text-[13px] font-semibold text-[#f8f8f7]">Meta Campaigns — {client.name}</span>
                {metaSnapshotAgg?.lastSyncedAt && (
                  <span className="text-[11px] text-[#6b7a99] ml-1">
                    · synced {new Date(metaSnapshotAgg.lastSyncedAt).toLocaleDateString()}
                    {metaSnapshotAgg.dateRange && ` · ${metaSnapshotAgg.dateRange.since} → ${metaSnapshotAgg.dateRange.until}`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMetaSnapshotsLoading(true);
                    fetch(`/api/integrations/meta/snapshots?clientId=${clientId}`)
                      .then((r) => r.ok ? r.json() : null)
                      .then((data) => {
                        if (data?.snapshots) setMetaSnapshots(data.snapshots);
                        if (data?.aggregated) setMetaSnapshotAgg(data.aggregated);
                      })
                      .catch(() => {})
                      .finally(() => setMetaSnapshotsLoading(false));
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#6b7a99] border border-[rgba(0,129,242,0.15)] rounded-lg hover:text-[#f8f8f7] hover:border-[rgba(0,129,242,0.25)] transition-colors"
                >
                  <RefreshCw size={12} className={metaSnapshotsLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
                <Link href="/ai-agent" className="flex items-center gap-1.5 px-3 py-1.5 vc-orange-gradient text-white text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity">
                  <Bot size={12} />Build New Campaign
                </Link>
              </div>
            </div>

            {/* Aggregated totals row */}
            {metaSnapshotAgg && (
              <div className="grid grid-cols-5 divide-x divide-[rgba(0,129,242,0.1)] border-b border-[rgba(0,129,242,0.15)]">
                {[
                  { label: "Total Spend", value: `$${metaSnapshotAgg.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                  { label: "Leads", value: metaSnapshotAgg.totalLeads.toLocaleString() },
                  { label: "Avg CPL", value: metaSnapshotAgg.avgCpl != null ? `$${metaSnapshotAgg.avgCpl.toFixed(0)}` : "—" },
                  { label: "Impressions", value: metaSnapshotAgg.totalImpressions.toLocaleString() },
                  { label: "Clicks", value: metaSnapshotAgg.totalClicks.toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="px-5 py-3 text-center">
                    <div className="text-[9px] font-bold text-[#3d4f6e] uppercase tracking-widest mb-1">{label}</div>
                    <div className="text-[15px] font-bold text-[#f8f8f7]">{value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Campaign rows */}
            {metaSnapshotsLoading ? (
              <div className="p-10 text-center flex items-center justify-center gap-2 text-[#6b7a99]">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-[12px]">Loading synced campaigns…</span>
              </div>
            ) : metaSnapshots.length > 0 ? (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[rgba(0,129,242,0.15)]">
                    {["Campaign", "Status", "Spend", "Impressions", "Clicks", "CTR", "CPM", "Leads", "CPL"].map((h) => (
                      <th key={h} className={`px-4 py-3 text-[9px] font-bold text-[#3d4f6e] uppercase tracking-widest ${h === "Campaign" ? "text-left" : "text-right"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metaSnapshots.map((sn, i) => (
                    <tr key={sn.id} className={`border-b border-[rgba(0,129,242,0.15)]/60 hover:bg-[#0f1a28]/60 transition-colors ${i === metaSnapshots.length - 1 ? "border-b-0" : ""}`}>
                      <td className="px-4 py-3 text-[#f8f8f7] font-medium max-w-[200px] truncate">{sn.campaign_name ?? sn.campaign_id}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sn.status === "ACTIVE" ? "bg-[#22c55e]/15 text-[#22c55e]" : "bg-[#6b7a99]/15 text-[#6b7a99]"}`}>
                          {sn.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[#f8f8f7]">{sn.spend != null ? `$${Number(sn.spend).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}</td>
                      <td className="px-4 py-3 text-right text-[#6b7a99]">{sn.impressions != null ? Number(sn.impressions).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-right text-[#6b7a99]">{sn.clicks != null ? Number(sn.clicks).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-right text-[#6b7a99]">{sn.ctr != null ? `${Number(sn.ctr).toFixed(2)}%` : "—"}</td>
                      <td className="px-4 py-3 text-right text-[#6b7a99]">{sn.cpm != null ? `$${Number(sn.cpm).toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 text-right text-[#0081f2] font-semibold">{sn.leads != null && Number(sn.leads) > 0 ? Number(sn.leads) : "—"}</td>
                      <td className="px-4 py-3 text-right text-[#f8f8f7]">{sn.cpl != null ? `$${Number(sn.cpl).toFixed(0)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-10 text-center space-y-2">
                <p className="text-[12px] text-[#6b7a99]">No synced campaigns yet.</p>
                <p className="text-[11px] text-[#3d4f6e]">
                  Save Meta credentials in the{" "}
                  <button onClick={() => setActiveTab("integrations")} className="text-[#0081f2] hover:underline">
                    Integrations tab
                  </button>
                  , then click Sync to pull live campaign data.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Intelligence tab */}
      {activeTab === "intelligence" && <IntelligenceTab clientId={client.id} />}

      {/* Files tab */}
      {activeTab === "files" && <ClientFilesTab clientId={client.id} />}

      {/* Integrations tab */}
      {activeTab === "integrations" && <IntegrationsTab clientId={client.id} clientName={client.name} />}

      {/* GHL Pipeline tab */}
      {activeTab === "ghl" && <GhlPipelineTab clientId={client.id} clientName={client.name} />}

      {/* Tabs that redirect to global pages */}
      {(activeTab === "ai-builder" || activeTab === "reports" || activeTab === "approvals") && (() => {
        const map: Record<string, { label: string; detail: string; href: string; cta: string }> = {
          "ai-builder": {
            label: "Build with Veronica",
            detail: `Generate a full campaign draft for ${client.name} in the AI Campaign Builder.`,
            href: "/ai-agent",
            cta: "Open AI Campaign Builder",
          },
          "reports": {
            label: "Reports",
            detail: `View and generate weekly performance reports for ${client.name}.`,
            href: "/reports",
            cta: "Open Reports",
          },
          "approvals": {
            label: "Approvals",
            detail: "Review and approve campaign drafts submitted for this client.",
            href: "/approvals",
            cta: "Open Approvals Queue",
          },
        };
        const info = map[activeTab];
        return (
          <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] flex items-center justify-center mx-auto mb-3">
              <Zap size={20} className="text-[#0081f2]" />
            </div>
            <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">{info.label}</div>
            <p className="text-[12px] text-[#6b7a99] mb-4 max-w-sm mx-auto">{info.detail}</p>
            <Link href={info.href} className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-lg transition-opacity hover:opacity-90" style={{ backgroundColor: "rgba(0, 129, 242, 0.12)", border: "1px solid rgba(0, 129, 242, 0.28)", color: "#0081f2" }}>
              {info.cta} →
            </Link>
          </div>
        );
      })()}

      {/* Tabs still being built */}
      {activeTab !== "overview" && activeTab !== "campaigns" && activeTab !== "intelligence" && activeTab !== "files" && activeTab !== "integrations" && activeTab !== "ghl" && activeTab !== "ai-builder" && activeTab !== "reports" && activeTab !== "approvals" && (
        <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] flex items-center justify-center mx-auto mb-3">
            <Zap size={20} className="text-[#0081f2]" />
          </div>
          <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">
            {tabs.find((t) => t.id === activeTab)?.label} — In Progress
          </div>
          <p className="text-[12px] text-[#6b7a99]">This section is being built. Check back soon.</p>
        </div>
      )}

      {/* Edit Client modal */}
      {editOpen && (
        <EditClientModal
          clientId={clientId}
          client={client}
          onClose={() => setEditOpen(false)}
          onSaved={(updates) => setClient((prev) => prev ? { ...prev, ...updates } : prev)}
        />
      )}
    </div>
  );
}

// ─── Integrations Tab ───────────────────────────────────────────

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

interface CredentialSaveStatus {
  meta: { saved: boolean; accountId: string | null; accountLabel: string | null; updatedAt: string | null };
  ghl: { saved: boolean; accountId: string | null; accountLabel: string | null; updatedAt: string | null };
}

function IntegrationsTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { can } = useAuth();
  const isAdmin = can("canConnectIntegrations");

  const [metaStatus, setMetaStatus] = useState<IntegrationStatus | null>(null);
  const [ghlStatus, setGhlStatus] = useState<IntegrationStatus | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [ghlLoading, setGhlLoading] = useState(false);
  const [metaSyncing, setMetaSyncing] = useState(false);
  const [ghlSyncing, setGhlSyncing] = useState(false);
  const [metaMsg, setMetaMsg] = useState<string | null>(null);
  const [ghlMsg, setGhlMsg] = useState<string | null>(null);

  // Credential save status (metadata only — no raw values)
  const [credStatus, setCredStatus] = useState<CredentialSaveStatus | null>(null);

  // Meta credential form
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaAdAccountId, setMetaAdAccountId] = useState("");
  const [metaAccountLabel, setMetaAccountLabel] = useState("");
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaDeleting, setMetaDeleting] = useState(false);

  // GHL credential form
  const [showGhlForm, setShowGhlForm] = useState(false);
  const [ghlApiKey, setGhlApiKey] = useState("");
  const [ghlLocationId, setGhlLocationId] = useState("");
  const [ghlAccountLabel, setGhlAccountLabel] = useState("");
  const [showGhlKey, setShowGhlKey] = useState(false);
  const [ghlSaving, setGhlSaving] = useState(false);
  const [ghlDeleting, setGhlDeleting] = useState(false);

  // Load status on mount
  useEffect(() => {
    loadMetaStatus();
    loadGhlStatus();
    loadCredStatus();
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

  async function loadCredStatus() {
    try {
      const res = await fetch(`/api/integrations/credentials/status?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setCredStatus(data);
      }
    } catch {
      // ignore
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

  async function saveMetaCredentials() {
    if (!metaAccessToken.trim() || !metaAdAccountId.trim()) {
      setMetaMsg("✗ Access Token and Ad Account ID are required.");
      return;
    }
    setMetaSaving(true);
    setMetaMsg(null);
    try {
      const res = await fetch("/api/integrations/credentials/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          provider: "meta",
          credentials: {
            accessToken: metaAccessToken.trim(),
            adAccountId: metaAdAccountId.trim(),
          },
          accountLabel: metaAccountLabel.trim() || `Meta · ${metaAdAccountId.trim()}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMetaMsg(`✓ Meta credentials saved and encrypted for ${data.accountId}`);
        setMetaAccessToken("");
        setMetaAdAccountId("");
        setMetaAccountLabel("");
        setShowMetaForm(false);
        await Promise.all([loadMetaStatus(), loadCredStatus()]);
      } else {
        setMetaMsg(`✗ ${data.error ?? "Save failed"}`);
      }
    } catch {
      setMetaMsg("✗ Network error saving credentials");
    } finally {
      setMetaSaving(false);
    }
  }

  async function deleteMetaCredentials() {
    if (!confirm("Remove per-client Meta credentials? The global env var fallback will be used if configured.")) return;
    setMetaDeleting(true);
    setMetaMsg(null);
    try {
      const res = await fetch("/api/integrations/credentials/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, provider: "meta" }),
      });
      const data = await res.json();
      if (data.success) {
        setMetaMsg("✓ Per-client Meta credentials removed.");
        await Promise.all([loadMetaStatus(), loadCredStatus()]);
      } else {
        setMetaMsg(`✗ ${data.error ?? "Delete failed"}`);
      }
    } catch {
      setMetaMsg("✗ Network error");
    } finally {
      setMetaDeleting(false);
    }
  }

  async function saveGhlCredentials() {
    if (!ghlApiKey.trim() || !ghlLocationId.trim()) {
      setGhlMsg("✗ API Key and Location ID are required.");
      return;
    }
    setGhlSaving(true);
    setGhlMsg(null);
    try {
      const res = await fetch("/api/integrations/credentials/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          provider: "ghl",
          credentials: {
            apiKey: ghlApiKey.trim(),
            locationId: ghlLocationId.trim(),
          },
          accountLabel: ghlAccountLabel.trim() || `GHL · ${ghlLocationId.trim()}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGhlMsg(`✓ GHL credentials saved and encrypted for ${data.accountId}`);
        setGhlApiKey("");
        setGhlLocationId("");
        setGhlAccountLabel("");
        setShowGhlForm(false);
        await Promise.all([loadGhlStatus(), loadCredStatus()]);
      } else {
        setGhlMsg(`✗ ${data.error ?? "Save failed"}`);
      }
    } catch {
      setGhlMsg("✗ Network error saving credentials");
    } finally {
      setGhlSaving(false);
    }
  }

  async function deleteGhlCredentials() {
    if (!confirm("Remove per-client GHL credentials? The global env var fallback will be used if configured.")) return;
    setGhlDeleting(true);
    setGhlMsg(null);
    try {
      const res = await fetch("/api/integrations/credentials/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, provider: "ghl" }),
      });
      const data = await res.json();
      if (data.success) {
        setGhlMsg("✓ Per-client GHL credentials removed.");
        await Promise.all([loadGhlStatus(), loadCredStatus()]);
      } else {
        setGhlMsg(`✗ ${data.error ?? "Delete failed"}`);
      }
    } catch {
      setGhlMsg("✗ Network error");
    } finally {
      setGhlDeleting(false);
    }
  }

  const cardCls = "vc-panel";
  const btnCls = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors";
  const inputCls = "w-full bg-[#0f1a28] border border-[rgba(0,129,242,0.2)] rounded-lg px-3 py-2 text-[12px] text-[#f8f8f7] placeholder-[#3d4f6e] focus:outline-none focus:border-[#0081f2] transition-colors";

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

  function CredSourceBadge({ source }: { source: "per-client" | "global-env" | null }) {
    if (!source) return null;
    if (source === "per-client") {
      return (
        <span className="flex items-center gap-1 text-[9px] font-semibold text-[#a78bfa] bg-[#a78bfa]/10 border border-[#a78bfa]/30 px-1.5 py-0.5 rounded">
          <KeyRound size={8} /> Per-client
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[9px] font-semibold text-[#3d4f6e] bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] px-1.5 py-0.5 rounded">
        <Lock size={8} /> Global env
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
          {!isAdmin && (
            <span className="flex items-center gap-1 text-[9px] font-semibold text-[#6b7a99] bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] px-1.5 py-0.5 rounded">
              <Lock size={8} /> View only
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#6b7a99] leading-snug">
          Connect Meta Ads and GoHighLevel to sync real performance data for this client.
          All connections are <strong className="text-[#f8f8f7]">read-only</strong> — Veronica never writes to Meta or GHL.
          {isAdmin
            ? " Per-client credentials are encrypted with AES-256-GCM and stored server-side only."
            : " Credential management requires Admin access."}
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
            {credStatus?.meta.saved && <CredSourceBadge source="per-client" />}
            {!credStatus?.meta.saved && metaStatus?.hasCredentials && <CredSourceBadge source="global-env" />}
          </div>
          <StatusBadge status={metaStatus} />
        </div>

        <div className="p-4 space-y-3">
          {/* Saved credential info (masked) */}
          {credStatus?.meta.saved && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-[#a78bfa]/10 border border-[#a78bfa]/30 rounded-lg">
              <div className="flex items-center gap-2">
                <KeyRound size={11} className="text-[#a78bfa]" />
                <div>
                  <div className="text-[11px] font-semibold text-[#f8f8f7]">{credStatus.meta.accountLabel ?? credStatus.meta.accountId}</div>
                  <div className="text-[10px] text-[#6b7a99]">Per-client credential · Token: ••••••••••••••••••••••••••••••••</div>
                  {credStatus.meta.updatedAt && (
                    <div className="text-[9px] text-[#3d4f6e]">Saved {new Date(credStatus.meta.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  )}
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={deleteMetaCredentials}
                  disabled={metaDeleting}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors"
                >
                  {metaDeleting ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
                  Remove
                </button>
              )}
            </div>
          )}

          {/* No credentials warning */}
          {metaStatus && !metaStatus.hasCredentials && !credStatus?.meta.saved && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#ff8400]/10 border border-[#ff8400]/30 rounded-lg">
              <AlertCircle size={12} className="text-[#ff8400] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-[#6b7a99] leading-snug">
                <span className="text-[#f8f8f7] font-semibold">No credentials configured. </span>
                {isAdmin ? "Use the form below to add per-client credentials, or set global env vars in Vercel." : "Contact your Admin to configure credentials."}
              </div>
            </div>
          )}

          {/* Admin: Add/Update credentials form */}
          {isAdmin && (
            <div>
              <button
                onClick={() => setShowMetaForm(!showMetaForm)}
                className={`${btnCls} bg-[#0f1a28] border border-[rgba(0,129,242,0.2)] text-[#6b7a99] hover:text-[#f8f8f7] hover:border-[rgba(0,129,242,0.4)]`}
              >
                <KeyRound size={10} />
                {credStatus?.meta.saved ? "Update Credentials" : "Add Credentials"}
                {showMetaForm ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>

              {showMetaForm && (
                <div className="mt-3 space-y-2.5 p-3 bg-[#0a1018] border border-[rgba(0,129,242,0.15)] rounded-lg">
                  <div className="text-[10px] font-semibold text-[#3d4f6e] uppercase tracking-wider flex items-center gap-1">
                    <Lock size={9} /> Credentials are encrypted AES-256-GCM before storage. Never exposed to frontend.
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#6b7a99] mb-1">Meta Access Token <span className="text-[#ef4444]">*</span></label>
                    <div className="relative">
                      <input
                        type={showMetaToken ? "text" : "password"}
                        value={metaAccessToken}
                        onChange={(e) => setMetaAccessToken(e.target.value)}
                        placeholder="EAAd..."
                        className={inputCls}
                        autoComplete="off"
                        data-1p-ignore
                      />
                      <button
                        type="button"
                        onClick={() => setShowMetaToken(!showMetaToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3d4f6e] hover:text-[#6b7a99]"
                      >
                        {showMetaToken ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#6b7a99] mb-1">Ad Account ID <span className="text-[#ef4444]">*</span></label>
                    <input
                      type="text"
                      value={metaAdAccountId}
                      onChange={(e) => setMetaAdAccountId(e.target.value)}
                      placeholder="1896960880964810"
                      className={inputCls}
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#6b7a99] mb-1">Account Label (optional)</label>
                    <input
                      type="text"
                      value={metaAccountLabel}
                      onChange={(e) => setMetaAccountLabel(e.target.value)}
                      placeholder="e.g. Kaczmar Builders — Meta"
                      className={inputCls}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={saveMetaCredentials}
                      disabled={metaSaving || !metaAccessToken.trim() || !metaAdAccountId.trim()}
                      className={`${btnCls} bg-[#0081f2]/10 border border-[#0081f2]/30 text-[#0081f2] hover:bg-[#0081f2]/20 disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {metaSaving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                      Save Encrypted
                    </button>
                    <button
                      onClick={() => { setShowMetaForm(false); setMetaAccessToken(""); setMetaAdAccountId(""); setMetaAccountLabel(""); }}
                      className={`${btnCls} bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] text-[#3d4f6e] hover:text-[#6b7a99]`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
            {credStatus?.ghl.saved && <CredSourceBadge source="per-client" />}
            {!credStatus?.ghl.saved && ghlStatus?.hasCredentials && <CredSourceBadge source="global-env" />}
          </div>
          <StatusBadge status={ghlStatus} />
        </div>

        <div className="p-4 space-y-3">
          {/* Saved credential info (masked) */}
          {credStatus?.ghl.saved && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-[#a78bfa]/10 border border-[#a78bfa]/30 rounded-lg">
              <div className="flex items-center gap-2">
                <KeyRound size={11} className="text-[#a78bfa]" />
                <div>
                  <div className="text-[11px] font-semibold text-[#f8f8f7]">{credStatus.ghl.accountLabel ?? credStatus.ghl.accountId}</div>
                  <div className="text-[10px] text-[#6b7a99]">Per-client credential · API Key: ••••••••••••••••••••••••••••••••</div>
                  {credStatus.ghl.updatedAt && (
                    <div className="text-[9px] text-[#3d4f6e]">Saved {new Date(credStatus.ghl.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  )}
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={deleteGhlCredentials}
                  disabled={ghlDeleting}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors"
                >
                  {ghlDeleting ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
                  Remove
                </button>
              )}
            </div>
          )}

          {/* No credentials warning */}
          {ghlStatus && !ghlStatus.hasCredentials && !credStatus?.ghl.saved && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#ff8400]/10 border border-[#ff8400]/30 rounded-lg">
              <AlertCircle size={12} className="text-[#ff8400] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-[#6b7a99] leading-snug">
                <span className="text-[#f8f8f7] font-semibold">No credentials configured. </span>
                {isAdmin ? "Use the form below to add per-client credentials, or set global env vars in Vercel." : "Contact your Admin to configure credentials."}
              </div>
            </div>
          )}

          {/* Admin: Add/Update credentials form */}
          {isAdmin && (
            <div>
              <button
                onClick={() => setShowGhlForm(!showGhlForm)}
                className={`${btnCls} bg-[#0f1a28] border border-[rgba(0,129,242,0.2)] text-[#6b7a99] hover:text-[#f8f8f7] hover:border-[rgba(0,129,242,0.4)]`}
              >
                <KeyRound size={10} />
                {credStatus?.ghl.saved ? "Update Credentials" : "Add Credentials"}
                {showGhlForm ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>

              {showGhlForm && (
                <div className="mt-3 space-y-2.5 p-3 bg-[#0a1018] border border-[rgba(0,129,242,0.15)] rounded-lg">
                  <div className="text-[10px] font-semibold text-[#3d4f6e] uppercase tracking-wider flex items-center gap-1">
                    <Lock size={9} /> Credentials are encrypted AES-256-GCM before storage. Never exposed to frontend.
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#6b7a99] mb-1">GHL API Key <span className="text-[#ef4444]">*</span></label>
                    <div className="relative">
                      <input
                        type={showGhlKey ? "text" : "password"}
                        value={ghlApiKey}
                        onChange={(e) => setGhlApiKey(e.target.value)}
                        placeholder="eyJhbGci..."
                        className={inputCls}
                        autoComplete="off"
                        data-1p-ignore
                      />
                      <button
                        type="button"
                        onClick={() => setShowGhlKey(!showGhlKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3d4f6e] hover:text-[#6b7a99]"
                      >
                        {showGhlKey ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#6b7a99] mb-1">Location ID <span className="text-[#ef4444]">*</span></label>
                    <input
                      type="text"
                      value={ghlLocationId}
                      onChange={(e) => setGhlLocationId(e.target.value)}
                      placeholder="0yQx5JFob31GRnLGkGI2"
                      className={inputCls}
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#6b7a99] mb-1">Account Label (optional)</label>
                    <input
                      type="text"
                      value={ghlAccountLabel}
                      onChange={(e) => setGhlAccountLabel(e.target.value)}
                      placeholder="e.g. Kaczmar Builders — GHL"
                      className={inputCls}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={saveGhlCredentials}
                      disabled={ghlSaving || !ghlApiKey.trim() || !ghlLocationId.trim()}
                      className={`${btnCls} bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/20 disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {ghlSaving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                      Save Encrypted
                    </button>
                    <button
                      onClick={() => { setShowGhlForm(false); setGhlApiKey(""); setGhlLocationId(""); setGhlAccountLabel(""); }}
                      className={`${btnCls} bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] text-[#3d4f6e] hover:text-[#6b7a99]`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
        <div className="text-[11px] font-semibold text-[#3d4f6e] uppercase tracking-wider mb-2">Credential Priority</div>
        <div className="space-y-2 text-[11px] text-[#6b7a99] leading-relaxed">
          <p><span className="text-[#a78bfa] font-semibold">1. Per-client (highest priority):</span> Credentials saved via the form above. Encrypted with AES-256-GCM, stored in Supabase, decrypted server-side only. Use this for clients with their own Meta/GHL accounts.</p>
          <p><span className="text-[#3d4f6e] font-semibold">2. Global env vars (fallback):</span> <code className="text-[#0081f2]">META_ACCESS_TOKEN</code> + <code className="text-[#0081f2]">META_AD_ACCOUNT_ID</code> and <code className="text-[#0081f2]">GHL_API_KEY</code> + <code className="text-[#0081f2]">GHL_LOCATION_ID</code> in Vercel. Applied to all clients without per-client credentials.</p>
          <p><span className="text-[#f8f8f7] font-semibold">Security:</span> Raw credential values are never returned to the browser, never logged, and never included in API responses. Only non-sensitive metadata (account ID, label, save date) is displayed.</p>
        </div>
      </div>
    </div>
  );
}

// ─── GHL Pipeline Tab ────────────────────────────────────────────

interface GHLOpportunitySnapshot {
  id: string;
  opportunity_id: string;
  opportunity_name: string | null;
  contact_name: string | null;
  pipeline_stage_name: string | null;
  status: string | null;
  monetary_value: number | null;
  assigned_user: string | null;
  last_activity_at: string | null;
  updated_at_ghl: string | null;
  appointment_status: string | null;
  synced_at: string;
  created_at_ghl: string | null;
  source: string | null;
}

function GhlPipelineTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [snapshots, setSnapshots] = useState<GHLOpportunitySnapshot[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSnapshots();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function loadSnapshots() {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/ghl/opportunities?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots ?? []);
        setLastSyncedAt(data.lastSyncedAt ?? null);
      }
    } catch {
      // silently skip
    } finally {
      setLoading(false);
    }
  }

  async function syncOpportunities() {
    setSyncing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/integrations/ghl/sync-opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(`✓ Synced ${data.upserted} opportunities from GHL.`);
        await loadSnapshots();
      } else {
        setMsg(`✗ Sync failed: ${data.error ?? "Unknown error"}`);
      }
    } catch {
      setMsg("✗ Network error during sync.");
    } finally {
      setSyncing(false);
    }
  }

  const STALE_DAYS = 7;
  const now = Date.now();
  function isStale(opp: GHLOpportunitySnapshot): boolean {
    const ref = opp.last_activity_at ?? opp.updated_at_ghl;
    if (!ref) return true;
    return (now - new Date(ref).getTime()) / 86400000 > STALE_DAYS;
  }

  const staleCount = snapshots.filter((o) => o.status !== "won" && o.status !== "lost" && isStale(o)).length;
  const totalValue = snapshots.reduce((sum, o) => sum + Number(o.monetary_value ?? 0), 0);
  const byStatus: Record<string, number> = {};
  for (const o of snapshots) {
    const s = o.status ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  const statusColor: Record<string, string> = {
    open: "#0081f2",
    won: "#22c55e",
    lost: "#ef4444",
    abandoned: "#6b7a99",
    unknown: "#6b7a99",
  };

  const btnCls = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-semibold text-[#f8f8f7]">GHL Pipeline — {clientName}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={syncOpportunities}
              disabled={syncing}
              className={`${btnCls} bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/20 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {syncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
              Sync Opportunities
            </button>
            <button
              onClick={loadSnapshots}
              disabled={loading}
              className={`${btnCls} bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] text-[#3d4f6e] hover:text-[#6b7a99] disabled:opacity-40`}
            >
              <RefreshCw size={10} />
              Refresh
            </button>
          </div>
        </div>
        <div className="text-[11px] text-[#3d4f6e]">
          Read-only · Opportunity-level pipeline snapshots from GHL. Never writes to GHL.
        </div>
        {lastSyncedAt && (
          <div className="text-[10px] text-[#3d4f6e] mt-1">
            Last synced: {new Date(lastSyncedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
        {msg && (
          <div className={`mt-2 text-[11px] px-3 py-2 rounded-lg ${msg.startsWith("✓") ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30" : "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30"}`}>
            {msg}
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-8 text-center">
          <Loader2 size={20} className="animate-spin text-[#0081f2] mx-auto mb-2" />
          <div className="text-[12px] text-[#6b7a99]">Loading pipeline data…</div>
        </div>
      ) : snapshots.length === 0 ? (
        <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] flex items-center justify-center mx-auto mb-3">
            <Settings size={20} className="text-[#3d4f6e]" />
          </div>
          <div className="text-[13px] font-semibold text-[#f8f8f7] mb-1">No pipeline data synced yet</div>
          <p className="text-[12px] text-[#6b7a99] mb-4 max-w-sm mx-auto">
            GHL is connected, but opportunity-level pipeline data has not been synced yet. Click &ldquo;Sync Opportunities&rdquo; to pull the latest pipeline data from GHL.
          </p>
          <button
            onClick={syncOpportunities}
            disabled={syncing}
            className={`${btnCls} mx-auto bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/20 disabled:opacity-40`}
          >
            {syncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            Sync Opportunities Now
          </button>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-3 text-center">
              <div className="text-[10px] text-[#3d4f6e] mb-0.5">Total Opportunities</div>
              <div className="text-[16px] font-bold text-[#0081f2]">{snapshots.length}</div>
            </div>
            <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-3 text-center">
              <div className="text-[10px] text-[#3d4f6e] mb-0.5">Pipeline Value</div>
              <div className="text-[16px] font-bold text-[#ff8400]">${totalValue.toLocaleString()}</div>
            </div>
            <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-3 text-center">
              <div className="text-[10px] text-[#3d4f6e] mb-0.5">Stale Leads</div>
              <div className={`text-[16px] font-bold ${staleCount > 0 ? "text-[#ef4444]" : "text-[#22c55e]"}`}>{staleCount}</div>
              <div className="text-[9px] text-[#3d4f6e]">No activity 7+ days</div>
            </div>
            <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-3 text-center">
              <div className="text-[10px] text-[#3d4f6e] mb-0.5">Won</div>
              <div className="text-[16px] font-bold text-[#22c55e]">{byStatus["won"] ?? 0}</div>
            </div>
          </div>

          {/* Status breakdown */}
          {Object.keys(byStatus).length > 0 && (
            <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-4">
              <div className="text-[11px] font-semibold text-[#6b7a99] uppercase tracking-wider mb-3">Status Breakdown</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-1.5 bg-[#0f1a28] rounded-lg px-3 py-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor[status] ?? "#6b7a99" }} />
                    <span className="text-[11px] font-semibold capitalize" style={{ color: statusColor[status] ?? "#6b7a99" }}>{status}</span>
                    <span className="text-[11px] text-[#6b7a99]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opportunity table */}
          <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(0,129,242,0.08)]">
              <span className="text-[11px] font-semibold text-[#6b7a99] uppercase tracking-wider">Opportunities</span>
            </div>
            <div className="divide-y divide-[rgba(0,129,242,0.06)]">
              {snapshots.map((opp) => {
                const stale = opp.status !== "won" && opp.status !== "lost" && isStale(opp);
                const lastActivity = opp.last_activity_at ?? opp.updated_at_ghl;
                const daysSince = lastActivity
                  ? Math.round((now - new Date(lastActivity).getTime()) / 86400000)
                  : null;
                return (
                  <div key={opp.id} className={`px-4 py-3 ${stale ? "bg-[#ef4444]/3" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[12px] font-semibold text-[#f8f8f7] truncate">
                            {opp.opportunity_name ?? opp.contact_name ?? "Unnamed Lead"}
                          </span>
                          {stale && (
                            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/25">
                              STALE
                            </span>
                          )}
                        </div>
                        {opp.contact_name && opp.opportunity_name && opp.contact_name !== opp.opportunity_name && (
                          <div className="text-[11px] text-[#6b7a99] mb-1">{opp.contact_name}</div>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-[#3d4f6e]">
                          {opp.pipeline_stage_name && (
                            <span className="text-[#a78bfa]">{opp.pipeline_stage_name}</span>
                          )}
                          {opp.assigned_user && (
                            <span>Assigned: {opp.assigned_user.length > 20 ? opp.assigned_user.slice(0, 16) + "…" : opp.assigned_user}</span>
                          )}
                          {daysSince !== null && (
                            <span className={daysSince > STALE_DAYS ? "text-[#ef4444]" : "text-[#3d4f6e]"}>
                              {daysSince === 0 ? "Active today" : `${daysSince}d ago`}
                            </span>
                          )}
                          {opp.appointment_status && (
                            <span className="text-[#22c55e]">Appt: {opp.appointment_status}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-[12px] font-semibold" style={{ color: statusColor[opp.status ?? "unknown"] ?? "#6b7a99" }}>
                          {opp.monetary_value != null ? `$${Number(opp.monetary_value).toLocaleString()}` : "—"}
                        </div>
                        <div className="mt-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded capitalize"
                            style={{
                              backgroundColor: `${statusColor[opp.status ?? "unknown"] ?? "#6b7a99"}18`,
                              color: statusColor[opp.status ?? "unknown"] ?? "#6b7a99",
                            }}
                          >
                            {opp.status ?? "unknown"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stale lead warning */}
          {staleCount > 0 && (
            <div className="bg-[#ef4444]/08 border border-[#ef4444]/25 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[12px] font-semibold text-[#ef4444] mb-1">
                    {staleCount} Stale Lead{staleCount !== 1 ? "s" : ""} — Follow-Up Required
                  </div>
                  <p className="text-[11px] text-[#6b7a99]">
                    These opportunities have had no activity in 7+ days. In home services, delay reduces close probability significantly. Review and re-engage or mark lost.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
