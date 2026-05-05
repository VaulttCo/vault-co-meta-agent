// Supabase Storage provider — active when NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
//
// Buckets used:
//   creative-assets   — private, stores original uploaded files
//   creative-thumbnails — public, stores thumbnail/preview images
//
// File metadata is persisted to the `creative_assets` table via the data
// provider so that all file records survive page refreshes.

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { StorageProvider } from "./storage-provider";
import type { ClientFile } from "./types";
import { mimeToFileType } from "./types";

const ASSETS_BUCKET = "creative-assets";
const THUMBS_BUCKET = "creative-thumbnails";

// Build a deterministic storage path: {clientId}/{timestamp}-{fileName}
function storagePath(clientId: string, fileName: string): string {
  return `${clientId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
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

    // We store file metadata in the creative_assets table.
    // Filter by client if requested.
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

    return (data ?? []).map((row: any): ClientFile => ({
      id: row.id,
      clientId: row.client_id,
      fileName: row.file_name,
      fileType: mimeToFileType(row.mime_type ?? ""),
      fileSize: row.file_size ?? 0,
      mimeType: row.mime_type ?? "",
      category: row.category ?? "creative_asset",
      storageUrl: row.storage_url ?? "",
      thumbnailUrl: row.thumbnail_url ?? null,
      uploadedBy: row.uploaded_by ?? "Veronica",
      uploadedAt: row.upload_date ?? new Date().toISOString(),
      notes: row.notes ?? "",
      status: row.status ?? "active",
    }));
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

    return {
      id: data.id,
      clientId: data.client_id,
      fileName: data.file_name,
      fileType: mimeToFileType(data.mime_type ?? ""),
      fileSize: data.file_size ?? 0,
      mimeType: data.mime_type ?? "",
      category: data.category ?? "creative_asset",
      storageUrl: data.storage_url ?? "",
      thumbnailUrl: data.thumbnail_url ?? null,
      uploadedBy: data.uploaded_by ?? "Veronica",
      uploadedAt: data.upload_date ?? new Date().toISOString(),
      notes: data.notes ?? "",
      status: data.status ?? "active",
    };
  }

  // ── Upload + save file ────────────────────────────────────
  // The `file` property on ClientFile is a transient browser File object
  // attached by the upload modal before calling saveFile.

  async saveFile(fileRecord: ClientFile & { _blob?: File }): Promise<ClientFile> {
    const supabase = this.db;
    if (!supabase) return fileRecord;

    let storageUrl = fileRecord.storageUrl;
    let thumbnailUrl = fileRecord.thumbnailUrl;

    // If a real browser File blob is attached, upload it to Supabase Storage
    const blob = fileRecord._blob;
    if (blob) {
      const path = storagePath(fileRecord.clientId, fileRecord.fileName);

      const { data: uploadData, error: uploadError } = await (supabase as any).storage
        .from(ASSETS_BUCKET)
        .upload(path, blob, {
          contentType: fileRecord.mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error("[SupabaseStorageProvider] upload:", uploadError.message);
        // Fall through — still save metadata with a placeholder URL
      } else {
        // Get a signed URL valid for 7 days (private bucket)
        const { data: signed } = await (supabase as any).storage
          .from(ASSETS_BUCKET)
          .createSignedUrl(uploadData.path, 60 * 60 * 24 * 7);

        storageUrl = signed?.signedUrl ?? storageUrl;

        // For images, also store in the public thumbnails bucket
        if (fileRecord.mimeType.startsWith("image/")) {
          const thumbPath = storagePath(fileRecord.clientId, `thumb_${fileRecord.fileName}`);
          await (supabase as any).storage
            .from(THUMBS_BUCKET)
            .upload(thumbPath, blob, {
              contentType: fileRecord.mimeType,
              upsert: false,
            });

          const { data: pubData } = (supabase as any).storage
            .from(THUMBS_BUCKET)
            .getPublicUrl(thumbPath);

          thumbnailUrl = pubData?.publicUrl ?? null;
        }
      }
    }

    // Persist metadata to creative_assets table
    const { error: dbError } = await (supabase as any)
      .from("creative_assets")
      .upsert({
        id: fileRecord.id,
        client_id: fileRecord.clientId,
        file_name: fileRecord.fileName,
        file_type: fileRecord.fileType,
        asset_type: "image", // default; UI can override
        mime_type: fileRecord.mimeType,
        file_size: fileRecord.fileSize,
        category: fileRecord.category,
        storage_url: storageUrl,
        thumbnail_url: thumbnailUrl,
        uploaded_by: fileRecord.uploadedBy,
        upload_date: fileRecord.uploadedAt,
        notes: fileRecord.notes,
        status: fileRecord.status,
        tags: [],
        approved_for_ads: false,
      });

    if (dbError) console.error("[SupabaseStorageProvider] saveFile metadata:", dbError.message);

    return { ...fileRecord, storageUrl, thumbnailUrl };
  }

  // ── Delete file ───────────────────────────────────────────

  async deleteFile(id: string): Promise<void> {
    const supabase = this.db;
    if (!supabase) return;

    // Get the record first to find the storage path
    const file = await this.getFile(id);

    if (file?.storageUrl) {
      // Extract path from signed URL or direct path
      try {
        const url = new URL(file.storageUrl);
        const pathParts = url.pathname.split(`/${ASSETS_BUCKET}/`);
        if (pathParts.length > 1) {
          await (supabase as any).storage.from(ASSETS_BUCKET).remove([pathParts[1]]);
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
