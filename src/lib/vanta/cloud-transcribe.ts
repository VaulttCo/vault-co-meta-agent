// VANTA — hosted cloud transcription (server-side only, V1.9).
//
// Sends the asset's PRIVATE stored audio artifact (extracted/downsampled in the
// browser, never the raw video) to OpenAI's transcription API and returns sanitized,
// timestamped segments. Enabled ONLY when VANTA_TRANSCRIPTION_PROVIDER=openai,
// OPENAI_API_KEY is set, and Supabase Storage is configured — otherwise callers fall
// through the existing tiers (local whisper → external worker → manual paste).
// NOTE: deliberately NOT keyed off AI_PROVIDER — that env var belongs to the Veronica
// campaign-builder module and selects its reasoning provider, not Vanta transcription.
//
// Privacy rules: never log API keys, signed URLs, audio bytes, or raw provider
// responses; errors surface as bounded generic messages. Segment output is capped and
// truncated before it touches a Vanta table.

import OpenAI from "openai";
import { downloadAudio, downloadVideo, MAX_CLOUD_AUDIO_BYTES, MAX_CLOUD_VIDEO_BYTES } from "./storage";
import { isVantaStorageConfigured } from "./storage";
import { extractWavFromVideo } from "./media/server-extract";
import type { VantaTranscriptSegment } from "./types";
import type { TranscriptionResult } from "./media/transcribe";

const MAX_SEGMENTS = 400;
const REQUEST_TIMEOUT_MS = 240_000;

export function isCloudTranscriptionAvailable(): boolean {
  return (
    (process.env.VANTA_TRANSCRIPTION_PROVIDER ?? "").trim() === "openai" &&
    !!process.env.OPENAI_API_KEY?.trim() &&
    isVantaStorageConfigured()
  );
}

interface VerboseSegment { start?: number; end?: number; text?: string }

type CloudOutcome =
  | { ok: true; result: TranscriptionResult; audio_bytes: number; storage_path: string }
  | { ok: false; reason: string };

/**
 * V1.10 primary path: transcribe the asset's stored ORIGINAL video — download from the
 * private bucket, extract 16kHz mono WAV server-side (ffmpeg normalizes any common
 * codec), send the audio to the provider. Falls back to a previously-uploaded audio
 * object (V1.9 path) when no video exists.
 */
export async function transcribeStoredVideo(
  projectId: string,
  assetId: string,
  onStage?: (stage: "extracting_audio" | "transcribing") => void | Promise<void>,
): Promise<CloudOutcome> {
  if (!isCloudTranscriptionAvailable()) {
    return { ok: false, reason: "Cloud transcription is not configured (VANTA_TRANSCRIPTION_PROVIDER=openai + OPENAI_API_KEY + Supabase required)" };
  }
  await onStage?.("extracting_audio");
  const video = await downloadVideo(projectId, assetId);
  if (!video) {
    // No stored video — V1.9 audio-object path keeps working as the inner fallback.
    await onStage?.("transcribing");
    return transcribeStoredAudio(projectId, assetId);
  }
  if (video.size > MAX_CLOUD_VIDEO_BYTES) {
    return { ok: false, reason: `Video is over the ${Math.round(MAX_CLOUD_VIDEO_BYTES / 1024 / 1024)}MB cloud cap — use the worker path` };
  }
  const extracted = await extractWavFromVideo(video.bytes, video.ext);
  if (!extracted.ok) return { ok: false, reason: extracted.reason };
  await onStage?.("transcribing");
  return transcribeWav(extracted.wav, video.path);
}

/**
 * Transcribe the stored audio for (project, asset). Returns sanitized segments or a
 * bounded failure reason — never throws, never leaks provider details.
 */
export async function transcribeStoredAudio(
  projectId: string,
  assetId: string,
): Promise<CloudOutcome> {
  if (!isCloudTranscriptionAvailable()) {
    return { ok: false, reason: "Cloud transcription is not configured (VANTA_TRANSCRIPTION_PROVIDER=openai + OPENAI_API_KEY + Supabase required)" };
  }
  const audio = await downloadAudio(projectId, assetId);
  if (!audio) {
    return { ok: false, reason: `Uploaded media not found or over the ${Math.round(MAX_CLOUD_AUDIO_BYTES / 1024 / 1024)}MB cap — re-upload or use the worker/manual path` };
  }
  return transcribeWav(audio.bytes, audio.path);
}

/** Shared provider call — bounded, sanitized, never leaks provider details. */
async function transcribeWav(wav: Buffer, storagePath: string): Promise<CloudOutcome> {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
    // whisper-1 is the segment-timestamped (verbose_json) transcription model.
    const response = await client.audio.transcriptions.create({
      file: new File([new Uint8Array(wav)], "audio-16k.wav", { type: "audio/wav" }),
      model: "whisper-1",
      response_format: "verbose_json",
    });
    const raw = response as unknown as { text?: string; language?: string; segments?: VerboseSegment[] };
    const MAX_TS_MS = 6 * 3600_000;
    const okNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n * 1000 <= MAX_TS_MS;
    const segments: VantaTranscriptSegment[] = (raw.segments ?? [])
      .filter((s) => okNum(s.start) && okNum(s.end) && typeof s.text === "string")
      .slice(0, MAX_SEGMENTS)
      .map((s) => ({ start_ms: Math.round(s.start! * 1000), end_ms: Math.round(s.end! * 1000), text: s.text!.trim().slice(0, 1000) }))
      .filter((s) => s.text.length > 0 && s.end_ms > s.start_ms);
    if (segments.length === 0) {
      return { ok: false, reason: "Cloud transcription returned no usable segments — try the worker or paste the transcript" };
    }
    return {
      ok: true,
      result: {
        full_text: (typeof raw.text === "string" && raw.text.trim() ? raw.text.trim() : segments.map((s) => s.text).join(" ")).slice(0, 100_000),
        segments,
        language: typeof raw.language === "string" ? raw.language.slice(0, 16) : "en",
        engine: "openai whisper-1 (cloud)",
      },
      audio_bytes: wav.byteLength,
      storage_path: storagePath,
    };
  } catch (e) {
    // Bounded, provider-detail-free error (no response bodies, no keys).
    const status = (e as { status?: number })?.status;
    console.error("[vanta:cloud-transcribe] provider error", typeof status === "number" ? status : "unknown");
    return { ok: false, reason: "Cloud transcription failed (provider/quota error) — retry, use the worker, or paste the transcript" };
  }
}
