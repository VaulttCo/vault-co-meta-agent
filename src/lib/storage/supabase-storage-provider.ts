// Supabase Storage provider — active when NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
//
// Buckets used:
//   creative-assets     — private, stores original uploaded files (images + videos)
//   creative-thumbnails — public,  stores thumbnail/preview images (images only)
//
// URL strategy:
//   Images  → thumbnailUrl = public URL from creative-thumbnails (permanent, never expires)
//             storageUrl   = public URL from creative-thumbnails (same, for full-size view)
//   Videos  → storageUrl   = signed URL from creative-assets (1 year TTL)
//             thumbnailUrl = null (no thumbnail generated server-side)
//
// Both storage_url and thumbnail_url are written to the real DB columns AND
// encoded in __META__ inside notes for backward compatibility with the
// AI analysis persistence path.
//
// Schema: creative_assets table has real storage_url text and thumbnail_url text columns.
//
// Error handling: saveFile() THROWS on upload failure so the caller (UploadModal)
// can catch and display the error to the user instead of silently swallowing it.

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { StorageProvider } from "./storage-provider";
import type { ClientFile, FileCategory } from "./types";
import { mimeToFileType } from "./types";

const ASSETS_BUCKET = "creative-assets";
const THUMBS_BUCKET = "creative-thumbnails";
const META_SEPARATOR = "\n__META__:";

// 1 year in seconds — long-lived signed URL for private video assets
const SIGNED_URL_TTL = 60 * 60 * 24 * 365;

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

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase" as const;

  private get db() {
    return getSupabaseBrowserClient();
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

  async saveFile(fileRecord: ClientFile & { _blob?: File }): Promise<ClientFile> {
    const supabase = this.db;
    if (!supabase) {
      throw new Error("Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }

    // Normalise MIME type — handles MOV files from iOS with empty file.type
    const resolvedMime = normaliseMime(fileRecord.mimeType, fileRecord.fileName);

    let storageUrl = fileRecord.storageUrl;
    let thumbnailUrl = fileRecord.thumbnailUrl;

    // If a real browser File blob is attached, upload it to Supabase Storage
    const blob = fileRecord._blob;
    if (blob) {
      const isImage = resolvedMime.startsWith("image/");
      const isVideo = resolvedMime.startsWith("video/");

      if (isImage) {
        // ── Images: upload to public creative-thumbnails bucket ──────────────
        // Using the public bucket means the URL never expires and no signed URL
        // refresh is needed. We store the same URL in both storageUrl and thumbnailUrl.
        const thumbPath = storagePath(fileRecord.clientId, fileRecord.fileName);

        const { data: thumbUpload, error: thumbError } = await (supabase as any).storage
          .from(THUMBS_BUCKET)
          .upload(thumbPath, blob, {
            contentType: resolvedMime,
            upsert: true,
          });

        if (thumbError) {
          // Throw so the modal shows the error instead of silently failing
          throw new Error(`Image upload failed: ${thumbError.message}`);
        }

        const { data: pubData } = (supabase as any).storage
          .from(THUMBS_BUCKET)
          .getPublicUrl(thumbUpload?.path ?? thumbPath);

        const publicUrl: string = pubData?.publicUrl ?? "";
        if (publicUrl) {
          storageUrl = publicUrl;
          thumbnailUrl = publicUrl;
        } else {
          // Bucket may be private — fall back to signed URL
          const { data: signed } = await (supabase as any).storage
            .from(THUMBS_BUCKET)
            .createSignedUrl(thumbUpload?.path ?? thumbPath, SIGNED_URL_TTL);
          storageUrl = signed?.signedUrl ?? storageUrl;
          thumbnailUrl = storageUrl;
        }

        // Also upload original to private creative-assets bucket for archival (non-blocking)
        const assetPath = storagePath(fileRecord.clientId, `original_${fileRecord.fileName}`);
        (supabase as any).storage
          .from(ASSETS_BUCKET)
          .upload(assetPath, blob, { contentType: resolvedMime, upsert: true })
          .catch((e: Error) => console.warn("[SupabaseStorageProvider] archival upload:", e.message));

      } else if (isVideo) {
        // ── Videos: upload to private creative-assets bucket, get long-lived signed URL ──
        const path = storagePath(fileRecord.clientId, fileRecord.fileName);

        const { data: uploadData, error: uploadError } = await (supabase as any).storage
          .from(ASSETS_BUCKET)
          .upload(path, blob, {
            contentType: resolvedMime,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Video upload failed: ${uploadError.message}`);
        }

        // 1-year signed URL so video doesn't break after a week
        const { data: signed, error: signError } = await (supabase as any).storage
          .from(ASSETS_BUCKET)
          .createSignedUrl(uploadData?.path ?? path, SIGNED_URL_TTL);

        if (signError) {
          throw new Error(`Failed to generate video URL: ${signError.message}`);
        }

        storageUrl = signed?.signedUrl ?? storageUrl;

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

    // Encode extra metadata into notes for backward compatibility with the
    // AI analysis persistence path (which reads/writes __META__ in notes).
    const encodedNotes = encodeNotes(fileRecord.notes ?? "", {
      mime_type: resolvedMime,
      file_size: fileRecord.fileSize,
      category: fileRecord.category,
      storage_url: storageUrl,
      thumbnail_url: thumbnailUrl,
      uploaded_by: fileRecord.uploadedBy,
    });

    // Persist metadata — write storage_url and thumbnail_url to real DB columns
    // (the table has these columns per database-schema.md and types.ts)
    const resolvedFileType = resolvedMime.startsWith("image/")
      ? "image"
      : resolvedMime.startsWith("video/")
      ? "video"
      : "image"; // default for DB check constraint

    const { error: dbError } = await (supabase as any)
      .from("creative_assets")
      .upsert({
        id: fileRecord.id,
        client_id: fileRecord.clientId,
        file_name: fileRecord.fileName,
        file_type: resolvedFileType,
        asset_type: "image",
        upload_date: fileRecord.uploadedAt,
        notes: encodedNotes,
        status: fileRecord.status,
        // Write to real columns — this is the primary fix
        storage_url: storageUrl || null,
        thumbnail_url: thumbnailUrl || null,
        tags: [],
        approved_for_ads: false,
      });

    if (dbError) {
      console.error("[SupabaseStorageProvider] saveFile metadata:", dbError.message);
      // Don't throw here — the file is already uploaded; a metadata write failure
      // is recoverable on next load via the backfill effect.
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

    // Get the record first to find the storage path
    const file = await this.getFile(id);

    if (file?.storageUrl) {
      try {
        const url = new URL(file.storageUrl);
        // Determine which bucket from the URL path
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
        // URL parsing failed — skip storage deletion, still remove metadata
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
