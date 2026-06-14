// VANTA — server-side audio extraction (server-only, V1.10).
//
// Extracts a 16kHz mono WAV from an uploaded video/audio buffer using ffmpeg — the
// system binary when present (media boxes), the bundled ffmpeg-static binary otherwise
// (Vercel). `-vn` skips video decoding entirely, so extraction is demux + audio decode:
// fast and memory-light even for 4K H.265 sources. Everything is bounded: input size is
// capped by the caller, extraction has a hard timeout, the output WAV is size-capped,
// and ALL temp files are deleted in `finally`. Never logs bytes or paths beyond basenames.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isFfmpegAvailable } from "./ffmpeg";
import { MAX_CLOUD_AUDIO_BYTES, MAX_CLOUD_AUDIO_DURATION_MS } from "../storage";

const pExecFile = promisify(execFile);
const EXTRACT_TIMEOUT_MS = 120_000; // bounded — audio-only decode of a ≤300MB source
const MAX_OUTPUT_SECONDS = Math.round(MAX_CLOUD_AUDIO_DURATION_MS / 1000); // hard duration cap

/** Resolve a runnable ffmpeg: system binary first, bundled ffmpeg-static otherwise. */
export async function resolveFfmpegBinary(): Promise<string | null> {
  if (await isFfmpegAvailable()) return "ffmpeg";
  try {
    const mod = await import("ffmpeg-static");
    const bin = (mod.default ?? mod) as unknown as string | null;
    return typeof bin === "string" && existsSync(bin) ? bin : null;
  } catch { return null; }
}

export async function isServerExtractionAvailable(): Promise<boolean> {
  return (await resolveFfmpegBinary()) !== null;
}

export type ExtractOutcome =
  | { ok: true; wav: Buffer }
  | { ok: false; reason: string };

/**
 * videoBytes → 16kHz mono PCM16 WAV. ffmpeg normalizes any common container/codec
 * (H.264, H.265/HEVC, MOV, MP4, M4V, MKV, GoPro/DJI/DSLR exports). Bounded + cleaned up.
 */
export async function extractWavFromVideo(videoBytes: Buffer, ext: string): Promise<ExtractOutcome> {
  const bin = await resolveFfmpegBinary();
  if (!bin) return { ok: false, reason: "ffmpeg unavailable on this server" };
  const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "mp4";
  let dir: string | null = null;
  try {
    dir = mkdtempSync(path.join(tmpdir(), "vanta-extract-"));
    const input = path.join(dir, `source.${safeExt}`);
    const output = path.join(dir, "audio-16k.wav");
    writeFileSync(input, videoBytes);
    try {
      // -t bounds the OUTPUT to the duration cap regardless of source length/bitrate, so
      // a low-bitrate or crafted file cannot expand the WAV past budget or fill /tmp.
      // 720s × 16kHz × 2 bytes mono ≈ 23MB, under MAX_CLOUD_AUDIO_BYTES.
      await pExecFile(bin, ["-y", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-t", String(MAX_OUTPUT_SECONDS), "-c:a", "pcm_s16le", output],
        { timeout: EXTRACT_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, shell: false });
    } catch {
      return { ok: false, reason: "Audio extraction failed — the file may be corrupted or contain no audio track" };
    }
    if (!existsSync(output)) return { ok: false, reason: "Audio extraction produced no output — the file may contain no audio track" };
    const size = statSync(output).size;
    if (size > MAX_CLOUD_AUDIO_BYTES) {
      return { ok: false, reason: `Extracted audio is ${Math.round(size / 1024 / 1024)}MB — footage is longer than the cloud cap (use the worker path)` };
    }
    if (size <= 44) return { ok: false, reason: "The file contains no decodable audio" };
    return { ok: true, wav: readFileSync(output) };
  } catch (e) {
    console.error("[vanta:server-extract]", (e as Error).message.slice(0, 200));
    return { ok: false, reason: "Audio extraction failed on the server" };
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true }); // temp artifacts always deleted
  }
}
