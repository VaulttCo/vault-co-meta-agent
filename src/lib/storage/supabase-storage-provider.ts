// Supabase Storage provider — active when NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
//
// Buckets used:
//   creative-assets — private, stores all uploaded files (images + videos)
//
// URL strategy:
//   Images  → storageUrl = thumbnailUrl = 1-year signed URL from creative-assets
//   Videos  → storageUrl = signed URL from creative-assets (1 year TTL)
//             thumbnailUrl = null (no thumbnail generated server-side)
//
// All metadata is saved via /api/creatives/save-metadata (service role, bypasses
// table RLS) so uploads succeed regardless of user_profiles configuration.
//
// Upload strategy:
//   Files ≤ LARGE_VIDEO_THRESHOLD (100 MB) → standard fetch-based upload
//   Files >  LARGE_VIDEO_THRESHOLD         → TUS resumable upload via tus-js-client
//
// Both storage_url and thumbnail_url are written to the real DB columns AND
// encoded in __META__ inside notes for backward compatibility.
//
// Error handling: saveFile() THROWS on upload failure so the caller (UploadModal)
// can catch and display the error to the user instead of silently swallowing it.
//
// Progress callback: pass onProgress(percent: number) in the options to receive
// upload progress updates (0–100). Used by UploadModal for the progress bar.

// Use the SSR browser client — same singleton as AuthProvider.
// createBrowserClient() from @supabase/ssr reads session from cookies,
// so getSession() always returns the active session even on first call.
import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-client";
import type { StorageProvider } from "./storage-provider";
import type { ClientFile, FileCategory } from "./types";
import { mimeToFileType } from "./types";

const ASSETS_BUCKET = "creative-assets";
const THUMBS_BUCKET = "creative-thumbnails";
const META_SEPARATOR = "\n__META__:";

// Files larger than this threshold use TUS resumable upload
const LARGE_VIDEO_THRESHOLD = 100 * 1024 * 1024; // 100 MB

// 1 year in seconds — long-lived signed URL for private video assets
const SIGNED_URL_TTL = 60 * 60 * 24 * 365;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Normalise MIME type — MOV files from iOS often arrive as "" or "application/octet-stream"
function normaliseMime(mime: string, fileName: string): string {
  if (mime && mime !== "application/octet-stream") return mime;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const extMap: Record<string, string> = {
    mov: "video/quicktime",
    mp4: "video/mp4",
    webm: "video/webm",
    avi: "video/x-msvideo",
    m4v: "video/x-m4v",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return extMap[ext] ?? (ext ? `video/${ext}` : "application/octet-stream");
}

// Build a deterministic storage path: {clientId}/{timestamp}-{sanitisedFileName}
function storagePath(clientId: string, fileName: string): string {
  return `${clientId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

// Encode extra metadata into the notes field
function encodeNotes(userNotes: string, meta: Record<string, unknown>): string {
  return `${userNotes}${META_SEPARATOR}${JSON.stringify(meta)}`;
}

// Decode notes field — returns { notes, meta }
function decodeNotes(raw: string | null): { notes: string; meta: Record<string, unknown> } {
  if (!raw) return { notes: "", meta: {} };
  const idx = raw.indexOf(META_SEPARATOR);
  if (idx === -1) return { notes: raw, meta: {} };
  const userNotes = raw.substring(0, idx);
  try {
    const meta = JSON.parse(raw.substring(idx + META_SEPARATOR.length));
    return { notes: userNotes, meta: typeof meta === "object" && meta !== null ? meta : {} };
  } catch {
    return { notes: userNotes, meta: {} };
  }
}

function toFileCategory(val: unknown): FileCategory {
  const valid: FileCategory[] = [
    "onboarding_summary",
    "creative_asset",
    "contract",
    "report",
    "client_asset",
    "other",
  ];
  if (typeof val === "string" && valid.includes(val as FileCategory)) {
    return val as FileCategory;
  }
  return "creative_asset";
}

// TUS resumable upload — used for videos > LARGE_VIDEO_THRESHOLD
// Returns the storage path of the uploaded file.
async function tusUpload(
  blob: File,
  bucket: string,
  path: string,
  mimeType: string,
  supabaseUrl: string,
  accessToken: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  // Dynamic import so tus-js-client is only loaded when needed
  const tus = await import("tus-js-client");

  return new Promise<string>((resolve, reject) => {
    const upload = new tus.Upload(blob, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: mimeType,
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024, // 6 MB chunks (Supabase recommended)
      onError(error) {
        reject(new Error(`Resumable upload failed: ${error.message}`));
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (onProgress && bytesTotal > 0) {
          onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        }
      },
      onSuccess() {
        resolve(path);
      },
    });

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}

// ── Provider ──────────────────────────────────────────────────────────────────

export interface SaveFileOptions {
  /** Called with upload progress 0–100 during large video TUS uploads */
  onProgress?: (percent: number) => void;
  /**
   * Supabase JWT access token from the active session.
   * Pass this from the AuthProvider/useAuth context so the storage provider
   * does not need to call getSession() itself (which may return null on first
   * call in Safari / Next.js SSR environments).
   * If omitted, saveFile() falls back to getSession() then refreshSession().
   */
  accessToken?: string;
}

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase" as const;

  private get db() {
    return getSupabaseSSRBrowserClient();
  }

  // ── List files ────────────────────────────────────────────

  async getFiles(clientId?: string): Promise<ClientFile[]> {
    const supabase = this.db;
    if (!supabase) return [];

    let query = (supabase as any)
      .from("creative_assets")
      .select("*")
      .order("upload_date", { ascending: false });

    if (clientId) query = query.eq("client_id", clientId);

    const { data, error } = await query;
    if (error) {
      console.warn("[SupabaseStorageProvider] getFiles:", error.message);
      return [];
    }

    return (data ?? []).map((row: any): ClientFile => {
      const { notes, meta } = decodeNotes(row.notes);

      // Prefer real DB columns; fall back to __META__ for rows written before this fix
      const storageUrl: string = row.storage_url ?? (meta.storage_url as string) ?? "";
      const thumbnailUrl: string | null = row.thumbnail_url ?? (meta.thumbnail_url as string) ?? null;

      return {
        id: row.id,
        clientId: row.client_id,
        fileName: row.file_name,
        fileType: mimeToFileType((meta.mime_type as string) ?? ""),
        fileSize: (meta.file_size as number) ?? 0,
        mimeType: (meta.mime_type as string) ?? "",
        category: toFileCategory(meta.category),
        storageUrl,
        thumbnailUrl,
        uploadedBy: (meta.uploaded_by as string) ?? "Veronica",
        uploadedAt: row.upload_date ?? new Date().toISOString(),
        notes,
        status: row.status ?? "active",
      };
    });
  }

  // ── Get single file ───────────────────────────────────────

  async getFile(id: string): Promise<ClientFile | null> {
    const supabase = this.db;
    if (!supabase) return null;

    const { data, error } = await (supabase as any)
      .from("creative_assets")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;

    const { notes, meta } = decodeNotes(data.notes);
    const storageUrl: string = data.storage_url ?? (meta.storage_url as string) ?? "";
    const thumbnailUrl: string | null = data.thumbnail_url ?? (meta.thumbnail_url as string) ?? null;

    return {
      id: data.id,
      clientId: data.client_id,
      fileName: data.file_name,
      fileType: mimeToFileType((meta.mime_type as string) ?? ""),
      fileSize: (meta.file_size as number) ?? 0,
      mimeType: (meta.mime_type as string) ?? "",
      category: toFileCategory(meta.category),
      storageUrl,
      thumbnailUrl,
      uploadedBy: (meta.uploaded_by as string) ?? "Veronica",
      uploadedAt: data.upload_date ?? new Date().toISOString(),
      notes,
      status: data.status ?? "active",
    };
  }

  // ── Upload + save file ────────────────────────────────────
  // The `_blob` property on ClientFile is a transient browser File object
  // attached by the upload modal before calling saveFile.
  //
  // THROWS on upload failure so the caller can show an error to the user.
  //
  // For videos > 100 MB, uses TUS resumable upload with progress callback.

  async saveFile(
    fileRecord: ClientFile & { _blob?: File },
    options?: SaveFileOptions
  ): Promise<ClientFile> {
    const supabase = this.db;
    if (!supabase) {
      throw new Error("Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }

    // ── Auth: resolve access token ────────────────────────────────────────────
    // Primary source: token passed explicitly by the caller (UploadModal reads
    // it from the AuthProvider SSR client which always has the session).
    // Fallback: getSession() then refreshSession() for callers that don't pass it.
    let accessToken: string = options?.accessToken ?? "";
    if (!accessToken) {
      let { data: sessionData } = await (supabase as any).auth.getSession();
      if (!sessionData?.session) {
        const { data: refreshed } = await (supabase as any).auth.refreshSession();
        sessionData = refreshed;
      }
      accessToken = sessionData?.session?.access_token ?? "";
    }
    if (!accessToken) {
      throw new Error("Your session expired. Please log in again.");
    }

    // Normalise MIME type — handles MOV files from iOS with empty file.type
    const resolvedMime = normaliseMime(fileRecord.mimeType, fileRecord.fileName);

    let storageUrl = fileRecord.storageUrl;
    let thumbnailUrl = fileRecord.thumbnailUrl;

    // Track the uploaded storage path so we can clean up if the DB save fails
    let cleanupBucket: string | null = null;
    let cleanupPath: string | null = null;

    // If a real browser File blob is attached, upload it to Supabase Storage
    const blob = fileRecord._blob;
    if (blob) {
      const isImage = resolvedMime.startsWith("image/");
      const isVideo = resolvedMime.startsWith("video/");
      const isLargeVideo = isVideo && blob.size > LARGE_VIDEO_THRESHOLD;

      if (isImage) {
        // ── Images: upload to private creative-assets bucket ─────────────────
        // Avoids creative-thumbnails RLS (which blocks users without user_profiles rows).
        // A 1-year signed URL is used for both storageUrl and thumbnailUrl.
        const assetPath = storagePath(fileRecord.clientId, fileRecord.fileName);

        const { data: uploadData, error: uploadError } = await (supabase as any).storage
          .from(ASSETS_BUCKET)
          .upload(assetPath, blob, {
            contentType: resolvedMime,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        cleanupBucket = ASSETS_BUCKET;
        cleanupPath = uploadData?.path ?? assetPath;

        const { data: signed, error: signError } = await (supabase as any).storage
          .from(ASSETS_BUCKET)
          .createSignedUrl(uploadData?.path ?? assetPath, SIGNED_URL_TTL);

        if (signError) {
          throw new Error(`Failed to generate image URL: ${signError.message}`);
        }

        storageUrl = signed?.signedUrl ?? storageUrl;
        thumbnailUrl = storageUrl;

      } else if (isVideo) {
        // ── Videos: upload to private creative-assets bucket ─────────────────
        const path = storagePath(fileRecord.clientId, fileRecord.fileName);

        if (isLargeVideo) {
          // ── Large video (>100 MB): TUS resumable upload ───────────────────
          // accessToken already retrieved at top of saveFile()
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
          if (!supabaseUrl) {
            throw new Error("Supabase URL is not configured.");
          }

          // TUS upload — progress callback forwarded to UI
          await tusUpload(
            blob,
            ASSETS_BUCKET,
            path,
            resolvedMime,
            supabaseUrl,
            accessToken,
            options?.onProgress
          );
          cleanupBucket = ASSETS_BUCKET;
          cleanupPath = path;

        } else {
          // ── Standard video upload (≤100 MB) ──────────────────────────────
          const { data: uploadData, error: uploadError } = await (supabase as any).storage
            .from(ASSETS_BUCKET)
            .upload(path, blob, {
              contentType: resolvedMime,
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Video upload failed: ${uploadError.message}`);
          }

          cleanupBucket = ASSETS_BUCKET;
          cleanupPath = uploadData?.path ?? path;

          // Use uploadData.path for the signed URL
          const uploadedPath = uploadData?.path ?? path;
          const { data: signed, error: signError } = await (supabase as any).storage
            .from(ASSETS_BUCKET)
            .createSignedUrl(uploadedPath, SIGNED_URL_TTL);

          if (signError) {
            throw new Error(`Failed to generate video URL: ${signError.message}`);
          }

          storageUrl = signed?.signedUrl ?? storageUrl;
        }

        // For large video TUS uploads, generate signed URL after upload
        if (isLargeVideo) {
          const { data: signed, error: signError } = await (supabase as any).storage
            .from(ASSETS_BUCKET)
            .createSignedUrl(path, SIGNED_URL_TTL);

          if (signError) {
            throw new Error(`Failed to generate video URL after upload: ${signError.message}`);
          }
          storageUrl = signed?.signedUrl ?? storageUrl;
        }

      } else {
        // ── Other file types: upload to private bucket, get signed URL ────────
        const path = storagePath(fileRecord.clientId, fileRecord.fileName);

        const { data: uploadData, error: uploadError } = await (supabase as any).storage
          .from(ASSETS_BUCKET)
          .upload(path, blob, {
            contentType: resolvedMime,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        const { data: signed } = await (supabase as any).storage
          .from(ASSETS_BUCKET)
          .createSignedUrl(uploadData?.path ?? path, SIGNED_URL_TTL);
        storageUrl = signed?.signedUrl ?? storageUrl;
      }
    }

    // Encode extra metadata into notes for backward compatibility
    const encodedNotes = encodeNotes(fileRecord.notes ?? "", {
      mime_type: resolvedMime,
      file_size: fileRecord.fileSize,
      category: fileRecord.category,
      storage_url: storageUrl,
      thumbnail_url: thumbnailUrl,
      uploaded_by: fileRecord.uploadedBy,
    });

    // Persist metadata — write storage_url and thumbnail_url to real DB columns
    const resolvedFileType = resolvedMime.startsWith("image/")
      ? "image"
      : resolvedMime.startsWith("video/")
      ? "video"
      : "image"; // default for DB check constraint

    // Persist metadata via the server route — uses service role to bypass table RLS.
    const metaResponse = await fetch("/api/creatives/save-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: fileRecord.id,
        clientId: fileRecord.clientId,
        fileName: fileRecord.fileName,
        fileType: resolvedFileType,
        uploadDate: new Date().toISOString().split("T")[0],
        notes: encodedNotes,
        storageUrl: storageUrl || null,
        thumbnailUrl: thumbnailUrl || null,
      }),
    });

    if (!metaResponse.ok) {
      let errMsg = "Failed to save asset record";
      try {
        const errBody = await metaResponse.json();
        errMsg = (errBody as { error?: string }).error ?? errMsg;
      } catch { /* non-JSON body */ }
      if (cleanupBucket && cleanupPath) {
        (supabase as any).storage.from(cleanupBucket).remove([cleanupPath]).catch(() => {});
      }
      throw new Error(`Upload succeeded but failed to save asset record: ${errMsg}`);
    }

    return {
      ...fileRecord,
      mimeType: resolvedMime,
      fileType: mimeToFileType(resolvedMime),
      storageUrl,
      thumbnailUrl,
    };
  }

  // ── Delete file ───────────────────────────────────────────

  async deleteFile(id: string): Promise<void> {
    const supabase = this.db;
    if (!supabase) return;

    const file = await this.getFile(id);

    if (file?.storageUrl) {
      try {
        const url = new URL(file.storageUrl);
        if (url.pathname.includes(`/${ASSETS_BUCKET}/`)) {
          const pathParts = url.pathname.split(`/${ASSETS_BUCKET}/`);
          if (pathParts.length > 1) {
            await (supabase as any).storage.from(ASSETS_BUCKET).remove([pathParts[1].split("?")[0]]);
          }
        } else if (url.pathname.includes(`/${THUMBS_BUCKET}/`)) {
          const pathParts = url.pathname.split(`/${THUMBS_BUCKET}/`);
          if (pathParts.length > 1) {
            await (supabase as any).storage.from(THUMBS_BUCKET).remove([pathParts[1].split("?")[0]]);
          }
        }
      } catch {
        // URL parsing failed — skip storage deletion
      }
    }

    const { error } = await (supabase as any)
      .from("creative_assets")
      .delete()
      .eq("id", id);

    if (error) console.error("[SupabaseStorageProvider] deleteFile:", error.message);
  }

  // ── Update file status ────────────────────────────────────

  async updateFileStatus(id: string, status: ClientFile["status"]): Promise<void> {
    const supabase = this.db;
    if (!supabase) return;

    const { error } = await (supabase as any)
      .from("creative_assets")
      .update({ status })
      .eq("id", id);

    if (error) console.error("[SupabaseStorageProvider] updateFileStatus:", error.message);
  }
}
