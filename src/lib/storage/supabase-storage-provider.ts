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

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { StorageProvider } from "./storage-provider";
import type { ClientFile, FileCategory } from "./types";
import { mimeToFileType } from "./types";

const ASSETS_BUCKET = "creative-assets";
const THUMBS_BUCKET = "creative-thumbnails";
const META_SEPARATOR = "\n__META__:";

// 1 year in seconds — long-lived signed URL for private video assets
const SIGNED_URL_TTL = 60 * 60 * 24 * 365;

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

// Check whether a URL looks like an expired Supabase signed URL
// (token= param is present but the URL is a signed URL, not a public URL)
function isSignedUrl(url: string): boolean {
  return url.includes("/sign/") || url.includes("token=");
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

  async saveFile(fileRecord: ClientFile & { _blob?: File }): Promise<ClientFile> {
    const supabase = this.db;
    if (!supabase) return fileRecord;

    let storageUrl = fileRecord.storageUrl;
    let thumbnailUrl = fileRecord.thumbnailUrl;

    // If a real browser File blob is attached, upload it to Supabase Storage
    const blob = fileRecord._blob;
    if (blob) {
      const isImage = fileRecord.mimeType.startsWith("image/");
      const isVideo = fileRecord.mimeType.startsWith("video/");

      if (isImage) {
        // ── Images: upload to public creative-thumbnails bucket ──────────────
        // Using the public bucket means the URL never expires and no signed URL
        // refresh is needed. We store the same URL in both storageUrl and thumbnailUrl.
        const thumbPath = storagePath(fileRecord.clientId, fileRecord.fileName);

        const { data: thumbUpload, error: thumbError } = await (supabase as any).storage
          .from(THUMBS_BUCKET)
          .upload(thumbPath, blob, {
            contentType: fileRecord.mimeType,
            upsert: true,
          });

        if (thumbError) {
          console.error("[SupabaseStorageProvider] thumbnail upload:", thumbError.message);
        } else {
          const { data: pubData } = (supabase as any).storage
            .from(THUMBS_BUCKET)
            .getPublicUrl(thumbUpload?.path ?? thumbPath);

          const publicUrl: string = pubData?.publicUrl ?? "";
          if (publicUrl) {
            storageUrl = publicUrl;
            thumbnailUrl = publicUrl;
          }
        }

        // Also upload original to private creative-assets bucket for archival
        const assetPath = storagePath(fileRecord.clientId, `original_${fileRecord.fileName}`);
        await (supabase as any).storage
          .from(ASSETS_BUCKET)
          .upload(assetPath, blob, {
            contentType: fileRecord.mimeType,
            upsert: true,
          });

      } else if (isVideo) {
        // ── Videos: upload to private creative-assets bucket, get long-lived signed URL ──
        const path = storagePath(fileRecord.clientId, fileRecord.fileName);

        const { data: uploadData, error: uploadError } = await (supabase as any).storage
          .from(ASSETS_BUCKET)
          .upload(path, blob, {
            contentType: fileRecord.mimeType,
            upsert: true,
          });

        if (uploadError) {
          console.error("[SupabaseStorageProvider] video upload:", uploadError.message);
        } else {
          // 1-year signed URL so video doesn't break after a week
          const { data: signed, error: signError } = await (supabase as any).storage
            .from(ASSETS_BUCKET)
            .createSignedUrl(uploadData?.path ?? path, SIGNED_URL_TTL);

          if (signError) {
            console.error("[SupabaseStorageProvider] createSignedUrl:", signError.message);
          } else {
            storageUrl = signed?.signedUrl ?? storageUrl;
          }
        }
      } else {
        // ── Other file types: upload to private bucket, get signed URL ────────
        const path = storagePath(fileRecord.clientId, fileRecord.fileName);

        const { data: uploadData, error: uploadError } = await (supabase as any).storage
          .from(ASSETS_BUCKET)
          .upload(path, blob, {
            contentType: fileRecord.mimeType,
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: signed } = await (supabase as any).storage
            .from(ASSETS_BUCKET)
            .createSignedUrl(uploadData.path, SIGNED_URL_TTL);
          storageUrl = signed?.signedUrl ?? storageUrl;
        }
      }
    }

    // Encode extra metadata into notes for backward compatibility with the
    // AI analysis persistence path (which reads/writes __META__ in notes).
    const encodedNotes = encodeNotes(fileRecord.notes ?? "", {
      mime_type: fileRecord.mimeType,
      file_size: fileRecord.fileSize,
      category: fileRecord.category,
      storage_url: storageUrl,
      thumbnail_url: thumbnailUrl,
      uploaded_by: fileRecord.uploadedBy,
    });

    // Persist metadata — write storage_url and thumbnail_url to real DB columns
    // (the table has these columns per database-schema.md and types.ts)
    const { error: dbError } = await (supabase as any)
      .from("creative_assets")
      .upsert({
        id: fileRecord.id,
        client_id: fileRecord.clientId,
        file_name: fileRecord.fileName,
        file_type: fileRecord.fileType === "image" || fileRecord.fileType === "video"
          ? fileRecord.fileType
          : "image",
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
    }

    return { ...fileRecord, storageUrl, thumbnailUrl };
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
