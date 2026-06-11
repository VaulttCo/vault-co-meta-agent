// VANTA — media foundation: transcription (server-side only, V1.3).
//
// Three tiers, always mock-safe:
// 1. REAL — local `whisper` CLI against footage under VANTA_MEDIA_ROOT (JSON output).
// 2. DERIVED — a manual transcript exists with no timestamps: estimate word-proportional
//    timestamped segments deterministically (segmentizeTranscript). No binaries needed.
// 3. PLANNED — no transcript at all and no whisper: return the faster-whisper worker
//    contract. Never throws; never fetches URLs.

import path from "node:path";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execBin, isWhisperAvailable, resolveLocalMediaPath, ensureWorkDir } from "./ffmpeg";

const MAX_ARTIFACT_BYTES = 10 * 1024 * 1024;

/** Newest artifact matching `suffix`, written after `sinceMs`, under the size cap.
 *  Guards against stale/planted files in the shared work dir. */
export function findFreshArtifact(workDir: string, suffix: string, sinceMs: number): string | null {
  try {
    const candidates = readdirSync(workDir)
      .filter((f) => f.toLowerCase().endsWith(suffix))
      .map((f) => ({ f, stat: statSync(path.join(workDir, f)) }))
      .filter((c) => c.stat.isFile() && c.stat.mtimeMs >= sinceMs - 1000 && c.stat.size <= MAX_ARTIFACT_BYTES)
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
    return candidates[0] ? path.join(workDir, candidates[0].f) : null;
  } catch { return null; }
}
import type { VantaAsset, VantaMediaPlan, VantaTranscriptSegment } from "../types";

const WHISPER_TIMEOUT_MS = 10 * 60_000; // worker-side budget; inline use is opt-in via /run
const MAX_SEGMENTS = 400;

export interface TranscriptionResult {
  full_text: string;
  segments: VantaTranscriptSegment[];
  language: string;
  engine: string;
}

/** The worker plan: faster-whisper over the 16kHz feed from the audio job. */
export function planTranscription(asset: VantaAsset): VantaMediaPlan {
  const argv = [[
    "whisper", `{media_root}/${asset.file_name}`,
    "--model", "base", "--task", "transcribe",
    "--output_format", "json", "--output_dir", "{work_dir}",
  ]];
  return {
    mock: true,
    planned: true,
    operation: "transcript",
    argv,
    commands: argv.map((a) => a.join(" ")),
    outputs: [`${asset.id}/transcript.json`, `${asset.id}/transcript.srt`],
    notes: [
      "Planned — transcription runs on the Vanta Worker (faster-whisper int8/fp16; the whisper CLI argv above is the interchangeable local form).",
      "Execute argv (no shell); commands are display-only.",
    ],
  };
}

interface WhisperJsonSegment { start?: number; end?: number; text?: string }
interface WhisperJson { text?: string; language?: string; segments?: WhisperJsonSegment[] }

/** REAL transcription via the local whisper CLI. Null on any failure — callers fall back. */
export async function transcribeLocalFile(asset: VantaAsset): Promise<TranscriptionResult | null> {
  try {
    if (!(await isWhisperAvailable())) return null;
    const local = resolveLocalMediaPath(asset.file_name);
    const workDir = ensureWorkDir(asset.id);
    if (!local || !workDir) return null;
    const startedAt = Date.now();
    const res = await execBin("whisper", [
      local, "--model", "base", "--task", "transcribe",
      "--output_format", "json", "--output_dir", workDir,
    ], WHISPER_TIMEOUT_MS);
    if (!res.ok) return null;
    const jsonFile = findFreshArtifact(workDir, ".json", startedAt);
    if (!jsonFile) return null;
    const data = JSON.parse(readFileSync(jsonFile, "utf8")) as WhisperJson;
    const segments: VantaTranscriptSegment[] = (data.segments ?? [])
      .filter((s) => typeof s.start === "number" && typeof s.end === "number" && typeof s.text === "string")
      .slice(0, MAX_SEGMENTS)
      .map((s) => ({ start_ms: Math.round(s.start! * 1000), end_ms: Math.round(s.end! * 1000), text: s.text!.trim() }))
      .filter((s) => s.text.length > 0 && s.end_ms > s.start_ms);
    if (segments.length === 0) return null;
    return {
      full_text: (data.text ?? segments.map((s) => s.text).join(" ")).trim(),
      segments,
      language: typeof data.language === "string" ? data.language : "en",
      engine: "whisper-cli (local)",
    };
  } catch { return null; }
}

/**
 * DERIVED segmentation: split a manual transcript into sentences and allocate time
 * proportionally to word count across the asset duration. Deterministic; clearly an
 * estimate — downstream clip scoring flags these as estimated timestamps.
 */
export function segmentizeTranscript(fullText: string, durationMs: number | null): VantaTranscriptSegment[] {
  const text = fullText.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const sentences = (text.match(/[^.!?]+[.!?]*/g) ?? [text]).map((s) => s.trim()).filter(Boolean).slice(0, MAX_SEGMENTS);
  const totalWords = text.split(" ").length;
  // No duration registered → assume a ~150wpm speaking rate.
  const durMs = durationMs && durationMs > 0 ? durationMs : Math.round((totalWords / 2.5) * 1000);
  const segments: VantaTranscriptSegment[] = [];
  let cursor = 0;
  for (const sentence of sentences) {
    const words = sentence.split(" ").length;
    const lengthMs = Math.max(800, Math.round((words / totalWords) * durMs));
    const end = Math.min(cursor + lengthMs, durMs);
    if (end <= cursor) break;
    segments.push({ start_ms: cursor, end_ms: end, text: sentence });
    cursor = end;
  }
  return segments;
}
