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

// OpenAI's transcription cap is 25 MB; 16kHz mono 16-bit WAV ≈ 1.92 MB/min.
export const MAX_CLOUD_AUDIO_BYTES = 24 * 1024 * 1024;          // ~12.5 min of WAV
export const MAX_CLOUD_AUDIO_DURATION_MS = 12 * 60_000;          // enforced browser-side too

const SAFE_ID = /^[a-zA-Z0-9-]{8,80}$/;

export function audioObjectPath(projectId: string, assetId: string): string | null {
  if (!SAFE_ID.test(projectId) || !SAFE_ID.test(assetId)) return null;
  return `${projectId}/${assetId}/audio-16k.wav`;
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

/** Create a signed upload URL for this asset's audio artifact. Null → storage unavailable. */
export async function createAudioUploadTarget(projectId: string, assetId: string): Promise<AudioUploadTarget | null> {
  const client = getSupabaseServerClient();
  const path = audioObjectPath(projectId, assetId);
  if (!client || !path) return null;
  try {
    const { data, error } = await client.storage.from(VANTA_AUDIO_BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (error || !data?.signedUrl || !data.token) return null;
    return { bucket: VANTA_AUDIO_BUCKET, path, signed_url: data.signedUrl, token: data.token };
  } catch { return null; }
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
