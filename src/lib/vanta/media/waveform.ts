// VANTA — media foundation: waveform generation planning (server-side only).
// Waveform rendering decodes the full audio track — routes return the plan; the real
// generateWaveformImage() runs on the Vanta Worker (UI scrubber + dead-air detection).
// Never throws; never fetches URLs.

import path from "node:path";
import { existsSync } from "node:fs";
import { execBin, isFfmpegAvailable, resolveLocalMediaPath, ensureWorkDir } from "./ffmpeg";
import type { VantaAsset, VantaMediaPlan } from "../types";

const WAVEFORM_TIMEOUT_MS = 5 * 60_000; // worker-side budget; routes never wait on this

function waveformArgs(input: string, output: string, width = 1200, height = 160): string[] {
  return ["-y", "-i", input, "-filter_complex", `showwavespic=s=${width}x${height}:colors=#ff8400`, "-frames:v", "1", output];
}

/** The worker plan for the waveform PNG (what routes return). */
export function planWaveform(asset: VantaAsset): VantaMediaPlan {
  const argv = [["ffmpeg", ...waveformArgs(`{media_root}/${asset.file_name}`, `{work_dir}/waveform.png`)]];
  return {
    mock: true,
    planned: true,
    operation: "waveform",
    argv,
    commands: argv.map((a) => a.join(" ")),
    outputs: [`${asset.id}/waveform.png`],
    notes: [
      "Planned — waveform render runs on the Vanta Worker, never in a request handler.",
      "Feeds the timeline scrubber and the Footage agent's dead-air detection.",
      "Execute argv (no shell); commands are display-only.",
    ],
  };
}

export interface WaveformResult {
  mock: boolean;
  planned: boolean;
  outputs: string[];
  commands: string[];
  notes: string[];
}

/** WORKER-ONLY real waveform render. Do not call from API routes. */
export async function generateWaveformImage(asset: VantaAsset): Promise<WaveformResult> {
  try {
    const local = resolveLocalMediaPath(asset.file_name);
    const workDir = ensureWorkDir(asset.id);
    if (local && workDir && (await isFfmpegAvailable())) {
      const out = path.join(workDir, "waveform.png");
      const args = waveformArgs(local, out);
      const res = await execBin("ffmpeg", args, WAVEFORM_TIMEOUT_MS);
      if (res.ok && existsSync(out)) {
        return {
          mock: false, planned: false,
          outputs: [`${asset.id}/waveform.png`],
          commands: [["ffmpeg", ...args].join(" ")],
          notes: [`Waveform written to ${out}`],
        };
      }
    }
  } catch { /* fall through to plan */ }
  const plan = planWaveform(asset);
  return { mock: true, planned: true, outputs: plan.outputs, commands: plan.commands, notes: plan.notes };
}
