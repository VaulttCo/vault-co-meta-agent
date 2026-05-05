// Supabase Storage provider — active when NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
//
// Buckets used:
//   creative-assets   — private, stores original uploaded files
//   creative-thumbnails — public, stores thumbnail/preview images
//
// File metadata is persisted to the `creative_assets` table via the data
// provider so that all file records survive page refreshes.
//
// Schema note: The original creative_assets table only has these columns:
//   id, client_id, file_name, file_type, asset_type, upload_date, notes,
//   status, tags (text[]), approved_for_ads, created_at, updated_at
//
// Extra fields (mime_type, file_size, category, storage_url, thumbnail_url,
// uploaded_by) are encoded as a JSON suffix appended to the notes column:
//   "User notes here\n__META__:{...json...}"
// This avoids schema-cache issues with newly added columns.

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { StorageProvider } from "./storage-provider";
import type { ClientFile } from "./types";
import { mimeToFileType } from "./types";

const ASSETS_BUCKET = "creative-assets";
const THUMBS_BUCKET = "creative-thumbnails";
const META_SEPARATOR = "\n__META__:";

// Build a deterministic storage path: {clientId}/{timestamp}-{fileName}
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
      return {
        id: row.id,
        clientId: row.client_id,
        fileName: row.file_name,
        fileType: mimeToFileType((meta.mime_type as string) ?? ""),
        fileSize: (meta.file_size as number) ?? 0,
        mimeType: (meta.mime_type as string) ?? "",
        category: (meta.category as string) ?? "creative_asset",
        storageUrl: (meta.storage_url as string) ?? "",
        thumbnailUrl: (meta.thumbnail_url as string) ?? null,
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
    return {
      id: data.id,
      clientId: data.client_id,
      fileName: data.file_name,
      fileType: mimeToFileType((meta.mime_type as string) ?? ""),
      fileSize: (meta.file_size as number) ?? 0,
      mimeType: (meta.mime_type as string) ?? "",
      category: (meta.category as string) ?? "creative_asset",
      storageUrl: (meta.storage_url as string) ?? "",
      thumbnailUrl: (meta.thumbnail_url as string) ?? null,
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

    // Encode extra metadata into the notes column to avoid schema-cache issues
    const encodedNotes = encodeNotes(fileRecord.notes ?? "", {
      mime_type: fileRecord.mimeType,
      file_size: fileRecord.fileSize,
      category: fileRecord.category,
      storage_url: storageUrl,
      thumbnail_url: thumbnailUrl,
      uploaded_by: fileRecord.uploadedBy,
    });

    // Persist metadata — only write columns that exist in the original schema
    const { error: dbError } = await (supabase as any)
      .from("creative_assets")
      .upsert({
        id: fileRecord.id,
        client_id: fileRecord.clientId,
        file_name: fileRecord.fileName,
        file_type: fileRecord.fileType,
        asset_type: "image",
        upload_date: fileRecord.uploadedAt,
        notes: encodedNotes,
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
