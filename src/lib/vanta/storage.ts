// VANTA — private Supabase Storage helper (server-side only, V1.9).
//
// Signed-URL audio upload for the Cloud Transcription Bridge: the browser extracts a
// bounded 16kHz mono WAV and PUTs it DIRECTLY to private storage (bytes never pass
// through a Vercel JSON route); the server later downloads the object with the
// service-role client for transcription. Bucket is PRIVATE — playback/processing access
// is always server-side. Mock-safe: every helper returns null/unavailable when Supabase
// (or the bucket) is absent, and callers fall back to local whisper / worker / paste.
// Never log signed URLs, tokens, or object bytes.

import { getSupabaseServerClient } from "@/lib/supabase/server";

export const VANTA_AUDIO_BUCKET = "vanta-transcripts";
export const VANTA_VIDEO_BUCKET = "vanta-raw-footage";

// OpenAI's transcription cap is 25 MB; 16kHz mono 16-bit WAV ≈ 1.92 MB/min.
export const MAX_CLOUD_AUDIO_BYTES = 24 * 1024 * 1024;          // ~12.5 min of WAV
export const MAX_CLOUD_AUDIO_DURATION_MS = 12 * 60_000;          // duration cap (all tiers)

// V1.10 — original-video upload caps. Bounded by Vercel /tmp (512MB) and function
// memory: server extraction downloads the object to /tmp before ffmpeg runs.
export const MAX_CLOUD_VIDEO_BYTES = 300 * 1024 * 1024;          // 300 MB

/** Containers/codecs the cloud path accepts — ffmpeg normalizes everything inside. */
export const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "mkv", "webm", "avi", "mp3", "m4a", "wav", "aac"] as const;

export function isAllowedUploadType(fileName: string, mimeType?: string | null): { ok: boolean; ext: string } {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  const extOk = (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
  const mimeOk = !mimeType || /^(video|audio)\//.test(mimeType);
  return { ok: extOk && mimeOk, ext };
}

const SAFE_ID = /^[a-zA-Z0-9-]{8,80}$/;

export function audioObjectPath(projectId: string, assetId: string): string | null {
  if (!SAFE_ID.test(projectId) || !SAFE_ID.test(assetId)) return null;
  return `${projectId}/${assetId}/audio-16k.wav`;
}

export function videoObjectPath(projectId: string, assetId: string, ext: string): string | null {
  if (!SAFE_ID.test(projectId) || !SAFE_ID.test(assetId)) return null;
  if (!(ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext)) return null;
  return `${projectId}/${assetId}/source.${ext}`;
}

export function isVantaStorageConfigured(): boolean {
  return getSupabaseServerClient() !== null;
}

export interface AudioUploadTarget {
  bucket: string;
  path: string;
  /** Short-lived signed PUT target — hand to the requesting client only; never persist or log. */
  signed_url: string;
  token: string;
}

async function createUploadTarget(bucket: string, path: string): Promise<AudioUploadTarget | null> {
  const client = getSupabaseServerClient();
  if (!client) return null;
  try {
    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path, { upsert: true });
    if (error || !data?.signedUrl || !data.token) return null;
    return { bucket, path, signed_url: data.signedUrl, token: data.token };
  } catch { return null; }
}

/** Create a signed upload URL for this asset's audio artifact. Null → storage unavailable. */
export async function createAudioUploadTarget(projectId: string, assetId: string): Promise<AudioUploadTarget | null> {
  const path = audioObjectPath(projectId, assetId);
  return path ? createUploadTarget(VANTA_AUDIO_BUCKET, path) : null;
}

/** V1.10 — signed upload URL for the ORIGINAL video/audio file (private bucket). */
export async function createVideoUploadTarget(projectId: string, assetId: string, ext: string): Promise<AudioUploadTarget | null> {
  const path = videoObjectPath(projectId, assetId, ext);
  return path ? createUploadTarget(VANTA_VIDEO_BUCKET, path) : null;
}

/** Stored object size from storage metadata, WITHOUT downloading the bytes. Null when
 *  the object is absent. Used as the pre-download cap backstop against lying clients. */
async function storedObjectSize(client: NonNullable<ReturnType<typeof getSupabaseServerClient>>, folder: string, name: string): Promise<number | null> {
  try {
    const { data, error } = await client.storage.from(VANTA_VIDEO_BUCKET).list(folder, { search: name, limit: 1 });
    if (error || !data?.length) return null;
    const size = (data[0] as { metadata?: { size?: number } })?.metadata?.size;
    return typeof size === "number" ? size : null;
  } catch { return null; }
}

/** V1.10 — download the asset's uploaded source video. The size cap is enforced BEFORE
 *  the bytes are pulled into memory (storage metadata pre-flight), so a client that
 *  uploaded multi-GB content past the signed PUT can't OOM the function — oversized
 *  objects are deleted instead. Tries each allowed extension. */
export async function downloadVideo(projectId: string, assetId: string): Promise<{ bytes: Buffer; path: string; size: number; ext: string } | null> {
  const client = getSupabaseServerClient();
  if (!client) return null;
  const folder = `${projectId}/${assetId}`;
  for (const ext of ALLOWED_VIDEO_EXTENSIONS) {
    const path = videoObjectPath(projectId, assetId, ext);
    if (!path) return null;
    // Pre-flight: reject (and delete) oversized objects before downloading them.
    const declared = await storedObjectSize(client, folder, `source.${ext}`);
    if (declared !== null && declared > MAX_CLOUD_VIDEO_BYTES) {
      await client.storage.from(VANTA_VIDEO_BUCKET).remove([path]).catch(() => null);
      return null;
    }
    if (declared === null) continue; // object with this ext not present
    try {
      const { data, error } = await client.storage.from(VANTA_VIDEO_BUCKET).download(path);
      if (error || !data) continue;
      if (data.size > MAX_CLOUD_VIDEO_BYTES) { // defense in depth vs metadata mismatch
        await client.storage.from(VANTA_VIDEO_BUCKET).remove([path]).catch(() => null);
        return null;
      }
      const bytes = Buffer.from(await data.arrayBuffer());
      return { bytes, path, size: bytes.byteLength, ext };
    } catch { continue; }
  }
  return null;
}

/** Download the asset's uploaded audio (size-capped). Oversized objects (the declared
 *  size can be a lie — the signed PUT itself is unbounded) are DELETED so abuse can't
 *  park large blobs in the private bucket. Null → missing/oversized/unavailable. */
export async function downloadAudio(projectId: string, assetId: string): Promise<{ bytes: Buffer; path: string; size: number } | null> {
  const client = getSupabaseServerClient();
  const path = audioObjectPath(projectId, assetId);
  if (!client || !path) return null;
  try {
    const { data, error } = await client.storage.from(VANTA_AUDIO_BUCKET).download(path);
    if (error || !data) return null;
    if (data.size > MAX_CLOUD_AUDIO_BYTES) {
      await client.storage.from(VANTA_AUDIO_BUCKET).remove([path]).catch(() => null);
      return null;
    }
    const bytes = Buffer.from(await data.arrayBuffer());
    return { bytes, path, size: bytes.byteLength };
  } catch { return null; }
}
