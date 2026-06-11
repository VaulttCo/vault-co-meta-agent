// VANTA — media foundation: audio extraction + loudness analysis (server-side only).
// Audio extraction decodes the full file (heavy) — routes return the plan; the real
// extractAudio()/analyzeLoudness() run on the Vanta Worker (whisper feed + audio flags).
// Never throws; never fetches URLs.

import path from "node:path";
import { existsSync } from "node:fs";
import { execBin, isFfmpegAvailable, resolveLocalMediaPath, ensureWorkDir } from "./ffmpeg";
import type { VantaAsset, VantaMediaPlan } from "../types";

const AUDIO_TIMEOUT_MS = 5 * 60_000; // worker-side budget; routes never wait on this

function extractArgs(input: string, output: string): string[] {
  // 16 kHz mono PCM — exactly what faster-whisper wants.
  return ["-y", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", output];
}

function loudnessArgs(input: string): string[] {
  // EBU R128 pass; -14 LUFS social / -16 LUFS ads targets live in sound/taxonomy.ts.
  return ["-i", input, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"];
}

/** The worker plan for audio extraction + loudness analysis (what routes return). */
export function planAudioExtraction(asset: VantaAsset): VantaMediaPlan {
  const input = `{media_root}/${asset.file_name}`;
  const argv = [
    ["ffmpeg", ...extractArgs(input, `{work_dir}/audio-16k.wav`)],
    ["ffmpeg", ...loudnessArgs(input)],
  ];
  return {
    mock: true,
    planned: true,
    operation: "audio",
    argv,
    commands: argv.map((a) => a.join(" ")),
    outputs: [`${asset.id}/audio-16k.wav`, `${asset.id}/loudness.json`],
    notes: [
      "Planned — full-decode audio work runs on the Vanta Worker, never in a request handler.",
      "16kHz mono PCM feeds faster-whisper; loudnorm JSON feeds the Sound Design agent's audio flags.",
      "Execute argv (no shell); commands are display-only.",
    ],
  };
}

export interface AudioResult {
  mock: boolean;
  planned: boolean;
  outputs: string[];
  commands: string[];
  loudness: Record<string, unknown> | null;
  notes: string[];
}

/** WORKER-ONLY real audio extraction. Do not call from API routes. */
export async function extractAudio(asset: VantaAsset): Promise<AudioResult> {
  try {
    const local = resolveLocalMediaPath(asset.file_name);
    const workDir = ensureWorkDir(asset.id);
    if (local && workDir && (await isFfmpegAvailable())) {
      const out = path.join(workDir, "audio-16k.wav");
      const args = extractArgs(local, out);
      const res = await execBin("ffmpeg", args, AUDIO_TIMEOUT_MS);
      if (res.ok && existsSync(out)) {
        return {
          mock: false, planned: false,
          outputs: [`${asset.id}/audio-16k.wav`],
          commands: [["ffmpeg", ...args].join(" ")],
          loudness: await analyzeLoudness(local),
          notes: [`Audio written to ${out}`],
        };
      }
    }
  } catch { /* fall through to plan */ }
  const plan = planAudioExtraction(asset);
  return { mock: true, planned: true, outputs: plan.outputs, commands: plan.commands, loudness: null, notes: plan.notes };
}

/** WORKER-ONLY loudness measurement (EBU R128). Null on any failure. */
export async function analyzeLoudness(localPath: string): Promise<Record<string, unknown> | null> {
  try {
    if (!(await isFfmpegAvailable())) return null;
    const res = await execBin("ffmpeg", loudnessArgs(localPath), AUDIO_TIMEOUT_MS);
    // loudnorm prints its JSON block to stderr after the last '{'
    const text = res.stderr;
    const start = text.lastIndexOf("{");
    if (start < 0) return null;
    return JSON.parse(text.slice(start)) as Record<string, unknown>;
  } catch { return null; }
}
