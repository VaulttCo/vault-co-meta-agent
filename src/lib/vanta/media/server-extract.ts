// VANTA — server-side audio extraction (server-only, V1.10).
//
// Extracts a 16kHz mono WAV from an uploaded video/audio buffer using ffmpeg — the
// system binary when present (media boxes), the bundled @ffmpeg-installer binary
// otherwise (Vercel). @ffmpeg-installer ships the per-OS binary INSIDE its package (no
// install-time download, no pnpm build-approval), so the correct Linux binary is present
// on Vercel; `serverExternalPackages` (next.config.ts) keeps the package un-bundled so
// its `__dirname`-relative binary resolution still works inside the serverless function,
// and `outputFileTracingIncludes` bundles the binary into the function.
//
// `-vn` skips video decoding entirely, so extraction is demux + audio decode: fast and
// memory-light even for 4K H.265 sources. Everything is bounded: input size is capped by
// the caller, extraction has a hard timeout + duration cap, the output WAV is size-capped,
// and ALL temp files are deleted in `finally`. Never logs bytes, keys, or audio content.

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

/**
 * Resolve a runnable ffmpeg: system binary first (media boxes), then the bundled
 * @ffmpeg-installer platform binary. On the failure path it logs a single bounded
 * diagnostic (platform/arch/resolved-path/exists) so a Vercel-vs-local resolution gap is
 * visible in production logs without exposing anything sensitive.
 */
export async function resolveFfmpegBinary(): Promise<string | null> {
  if (await isFfmpegAvailable()) return "ffmpeg";
  try {
    const mod = await import("@ffmpeg-installer/ffmpeg");
    const installer = ((mod as { default?: { path?: string } }).default ?? mod) as { path?: string };
    const bin = typeof installer.path === "string" ? installer.path : null;
    if (bin && existsSync(bin)) return bin;
    console.error("[vanta:ffmpeg] binary not found " + JSON.stringify({
      platform: process.platform, arch: process.arch, resolved: bin, exists: bin ? existsSync(bin) : false,
    }));
    return null;
  } catch (e) {
    console.error("[vanta:ffmpeg] resolution error " + JSON.stringify({
      platform: process.platform, arch: process.arch, message: (e as Error).message.slice(0, 120),
    }));
    return null;
  }
}

export async function isServerExtractionAvailable(): Promise<boolean> {
  return (await resolveFfmpegBinary()) !== null;
}

export type ExtractOutcome =
  | { ok: true; wav: Buffer }
  | { ok: false; reason: string; cause: "no_audio_stream" | "unsupported_codec" | "extraction_failed" | "no_ffmpeg" };

interface StreamInfo {
  hasAudio: boolean;
  hasVideo: boolean;
  audioCodec: string | null;
  sampleRate: number | null;
  channels: string | null;
}

/**
 * Probe the file's streams via `ffmpeg -i` (no ffprobe needed — ffmpeg dumps stream
 * info to stderr and exits non-zero, which is expected). Returns parsed stream details,
 * or null when the dump can't be obtained/parsed (caller proceeds to extraction).
 */
async function probeStreams(bin: string, input: string): Promise<StreamInfo | null> {
  let stderr = "";
  try {
    await pExecFile(bin, ["-hide_banner", "-i", input], { timeout: 30_000, maxBuffer: 4 * 1024 * 1024, shell: false });
  } catch (e) {
    stderr = String((e as { stderr?: string }).stderr ?? "");
  }
  if (!stderr) return null;
  const lines = stderr.split("\n");
  const audioLine = lines.find((l) => /Stream #\d+:\d+.*: Audio:/.test(l));
  const hasVideo = lines.some((l) => /Stream #\d+:\d+.*: Video:/.test(l));
  if (!audioLine) return { hasAudio: false, hasVideo, audioCodec: null, sampleRate: null, channels: null };
  return {
    hasAudio: true,
    hasVideo,
    audioCodec: audioLine.match(/Audio:\s*(\w+)/)?.[1] ?? null,
    sampleRate: audioLine.match(/(\d+)\s*Hz/) ? parseInt(audioLine.match(/(\d+)\s*Hz/)![1], 10) : null,
    channels: audioLine.match(/Hz,\s*(mono|stereo|quad|5\.1|7\.1|[\d.]+\s*channels?)/)?.[1] ?? null,
  };
}

/** Pull the most informative ffmpeg error line out of stderr, with temp paths redacted.
 *  Surfacing ffmpeg's actual words beats guessing the cause from a broad keyword match. */
function pickFfmpegError(stderr: string): string {
  const lines = stderr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const meaningful = [...lines].reverse().find((l) =>
    /(invalid data|error while|could not|cannot|not found|no such|denied|unsupported|does not contain|conversion failed|moov atom)/i.test(l));
  return (meaningful ?? lines[lines.length - 1] ?? "ffmpeg exited with an error")
    .replace(/\/\S*vanta-extract-\S+/g, "<file>")  // redact temp paths
    .replace(/\s+@\s+0x[0-9a-f]+/gi, "")           // drop ffmpeg context addresses
    .slice(0, 160);
}

/**
 * videoBytes → 16kHz mono PCM16 WAV. ffmpeg normalizes any common container/codec
 * (H.264, H.265/HEVC, MOV, MP4, M4V, MKV, GoPro/DJI/DSLR exports). Bounded + cleaned up.
 */
export async function extractWavFromVideo(videoBytes: Buffer, ext: string): Promise<ExtractOutcome> {
  const bin = await resolveFfmpegBinary();
  if (!bin) return { ok: false, reason: "Audio extraction is unavailable on this server", cause: "no_ffmpeg" };
  const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "mp4";
  let dir: string | null = null;
  try {
    dir = mkdtempSync(path.join(tmpdir(), "vanta-extract-"));
    const input = path.join(dir, `source.${safeExt}`);
    const output = path.join(dir, "audio-16k.wav");
    writeFileSync(input, videoBytes);

    // 1. Probe streams up front — distinguishes "no audio track" from a decode failure,
    //    and logs the stream details (codec/sample-rate/channels) for production triage.
    const streams = await probeStreams(bin, input);
    console.error("[vanta:ffmpeg] probe " + JSON.stringify({
      ext: safeExt,
      hasAudio: streams?.hasAudio ?? "unknown",
      hasVideo: streams?.hasVideo ?? "unknown",
      audioCodec: streams?.audioCodec ?? null,
      sampleRate: streams?.sampleRate ?? null,
      channels: streams?.channels ?? null,
    }));
    if (streams && !streams.hasAudio) {
      // No audio AND no video parsed → the file couldn't be read (corrupt / unsupported
      // container), which is distinct from a valid video that simply has no audio track.
      if (!streams.hasVideo) {
        return {
          ok: false,
          cause: "extraction_failed",
          reason: "This file couldn't be read as a video — it may be corrupted or an unsupported format. Re-export it, use the worker, or paste a transcript manually.",
        };
      }
      return {
        ok: false,
        cause: "no_audio_stream",
        reason: "This video has no audio track to transcribe (e.g. a time-lapse or a clip recorded muted). Paste a transcript manually to build a draft.",
      };
    }

    // 2. Extract. `-analyzeduration`/`-probesize` (input options, before -i) make ffmpeg
    //    fully analyze the stream before decoding — this resolves the common-on-older-builds
    //    "Invalid data found" / codec-parameter failures on real-world phone footage that the
    //    demuxer (probe) tolerates. `-t` bounds the OUTPUT to the duration cap so a low-bitrate
    //    file can't expand past budget or fill /tmp.
    try {
      await pExecFile(bin, [
        "-y", "-analyzeduration", "200M", "-probesize", "200M",
        "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-t", String(MAX_OUTPUT_SECONDS),
        "-c:a", "pcm_s16le", output,
      ], { timeout: EXTRACT_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, shell: false });
    } catch (e) {
      const err = e as { code?: string | number; killed?: boolean; stderr?: string };
      // Binary-launch problem (wrong arch / not executable) — distinct from a media issue.
      if (err.code === "ENOEXEC" || err.code === "EACCES" || err.code === "ENOENT") {
        console.error("[vanta:ffmpeg] launch failed " + JSON.stringify({ platform: process.platform, arch: process.arch, code: err.code }));
        return { ok: false, reason: "Audio extraction is unavailable on this server", cause: "no_ffmpeg" };
      }
      const stderr = String(err.stderr ?? "");
      const detail = pickFfmpegError(stderr);
      // Log the FULL stderr (bounded) — the real ffmpeg error, not a keyword guess.
      console.error("[vanta:ffmpeg] extract failed " + JSON.stringify({ code: err.code, killed: err.killed ?? false, audioCodec: streams?.audioCodec ?? null, detail, stderr: stderr.slice(-1500) }));
      if (/does not contain any stream/i.test(stderr)) {
        return { ok: false, reason: "This file has no usable audio track to transcribe. Paste a transcript manually to build a draft.", cause: "no_audio_stream" };
      }
      // ONLY a genuine missing-decoder error is a codec-support problem. Generic errors
      // ("Invalid data found", timestamp/parse issues) are NOT — surface ffmpeg's real words.
      if (/Decoder \(codec [^)]*\) not found|Unknown decoder|Could not find a decoder|Decoder not found/i.test(stderr)) {
        return { ok: false, cause: "unsupported_codec", reason: `The audio track${streams?.audioCodec ? ` (${streams.audioCodec})` : ""} couldn't be decoded on this server (ffmpeg: ${detail}). Use the worker, or paste a transcript manually.` };
      }
      if (err.killed) {
        return { ok: false, reason: "Audio extraction timed out — the file is too long for the cloud path; use the worker, or paste a transcript.", cause: "extraction_failed" };
      }
      return { ok: false, reason: `Audio extraction failed (ffmpeg: ${detail}). Use the worker, or paste a transcript manually.`, cause: "extraction_failed" };
    }

    if (!existsSync(output)) return { ok: false, reason: "This file has no usable audio track to transcribe. Paste a transcript manually to build a draft.", cause: "no_audio_stream" };
    const size = statSync(output).size;
    if (size > MAX_CLOUD_AUDIO_BYTES) {
      return { ok: false, reason: `Extracted audio is ${Math.round(size / 1024 / 1024)}MB — footage is longer than the cloud cap (use the worker path)`, cause: "extraction_failed" };
    }
    if (size <= 44) return { ok: false, reason: "This file contains no decodable audio. Paste a transcript manually to build a draft.", cause: "no_audio_stream" };
    return { ok: true, wav: readFileSync(output) };
  } catch (e) {
    console.error("[vanta:server-extract]", (e as Error).message.slice(0, 200));
    return { ok: false, reason: "Audio extraction failed on the server — try the worker, or paste a transcript manually.", cause: "extraction_failed" };
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true }); // temp artifacts always deleted
  }
}
