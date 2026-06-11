// VANTA — media foundation: metadata extraction via ffprobe (server-side only).
// Real probe when ffprobe + a local file exist; deterministic mock built from the
// registered asset metadata otherwise. Never throws; never fetches URLs.

import { execBin, isFfprobeAvailable, resolveLocalMediaPath } from "./ffmpeg";
import type { VantaAsset, VantaProbeResult } from "../types";

const PROBE_TIMEOUT_MS = 20_000;

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  channels?: number;
  sample_rate?: string;
}

interface FfprobeOutput {
  format?: { duration?: string; size?: string; bit_rate?: string; format_name?: string };
  streams?: FfprobeStream[];
}

function parseFps(rate: string | undefined): number | null {
  if (!rate) return null;
  const [num, den] = rate.split("/").map(Number);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  const fps = num / den;
  return Number.isFinite(fps) && fps > 0 && fps < 1000 ? Math.round(fps * 100) / 100 : null;
}

function toInt(v: string | number | undefined): number | null {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Probe a local file. Returns null on any failure — caller falls back to mock. */
export async function probeLocalFile(localPath: string): Promise<VantaProbeResult | null> {
  if (!(await isFfprobeAvailable())) return null;
  const res = await execBin("ffprobe", [
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    localPath,
  ], PROBE_TIMEOUT_MS);
  if (!res.ok) return null;
  try {
    const data = JSON.parse(res.stdout) as FfprobeOutput;
    const video = data.streams?.find((s) => s.codec_type === "video");
    const audio = data.streams?.find((s) => s.codec_type === "audio");
    const durationS = data.format?.duration ? parseFloat(data.format.duration) : NaN;
    return {
      mock: false,
      duration_ms: Number.isFinite(durationS) && durationS > 0 ? Math.round(durationS * 1000) : null,
      width: toInt(video?.width),
      height: toInt(video?.height),
      fps: parseFps(video?.avg_frame_rate) ?? parseFps(video?.r_frame_rate),
      codec: video?.codec_name ?? null,
      audio_codec: audio?.codec_name ?? null,
      audio_channels: toInt(audio?.channels),
      sample_rate_hz: toInt(audio?.sample_rate),
      bit_rate: toInt(data.format?.bit_rate),
      size_bytes: toInt(data.format?.size),
      format_name: data.format?.format_name ?? null,
      notes: [],
    };
  } catch { return null; }
}

/** Deterministic mock probe from whatever was registered. App must work with no binaries. */
export function mockProbeResult(asset: Pick<VantaAsset, "duration_ms" | "file_name"> | null): VantaProbeResult {
  const name = asset?.file_name ?? "";
  const looksVertical = /(916|vert|reel|short|tiktok)/i.test(name);
  return {
    mock: true,
    duration_ms: asset?.duration_ms ?? null,
    width: looksVertical ? 1080 : 1920,
    height: looksVertical ? 1920 : 1080,
    fps: 29.97,
    codec: "h264 (mock)",
    audio_codec: "aac (mock)",
    audio_channels: 2,
    sample_rate_hz: 48000,
    bit_rate: null,
    size_bytes: null,
    format_name: "mov,mp4,m4a (mock)",
    notes: [
      "Mock probe — ffprobe or VANTA_MEDIA_ROOT unavailable in this environment.",
      "Real metadata lands when the Vanta Worker (or a media-capable box) runs this job.",
    ],
  };
}

/** Probe an asset: real when possible, mock otherwise. Never throws. */
export async function probeAsset(asset: VantaAsset): Promise<VantaProbeResult> {
  try {
    const local = resolveLocalMediaPath(asset.file_name);
    if (local) {
      const real = await probeLocalFile(local);
      if (real) return real;
    }
  } catch { /* fall through to mock */ }
  return mockProbeResult(asset);
}
