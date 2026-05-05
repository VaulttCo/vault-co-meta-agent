export type FileCategory =
  | "onboarding_summary"
  | "creative_asset"
  | "contract"
  | "report"
  | "client_asset"
  | "other";

export type FileType = "pdf" | "image" | "video" | "thumbnail" | "document" | "other";

export interface ClientFile {
  id: string;
  clientId: string;
  fileName: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  category: FileCategory;
  storageUrl: string;
  thumbnailUrl: string | null;
  uploadedBy: string;
  uploadedAt: string;
  notes: string;
  status: "pending" | "active" | "archived";
}

export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  onboarding_summary: "Onboarding Summary",
  creative_asset: "Creative Asset",
  contract: "Contract / Agreement",
  report: "Report",
  client_asset: "Client Asset",
  other: "Other",
};

export const FILE_CATEGORY_COLORS: Record<FileCategory, string> = {
  onboarding_summary: "#a78bfa",
  creative_asset: "#18b8f0",
  contract: "#22c55e",
  report: "#f07820",
  client_asset: "#c9a84c",
  other: "#5a6278",
};

export const ALL_FILE_CATEGORIES: FileCategory[] = [
  "onboarding_summary",
  "creative_asset",
  "contract",
  "report",
  "client_asset",
  "other",
];

export function mimeToFileType(mime: string): FileType {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.includes("document") || mime.includes("word") || mime.startsWith("text/")) return "document";
  return "other";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
