// VANTA — media foundation: thumbnail extraction (server-side only).
// Real frame pulls when ffmpeg + a local file exist (fast seeked single-frame grabs);
// otherwise returns the exact worker plan. Never throws; never fetches URLs.

import path from "node:path";
import { existsSync } from "node:fs";
import { execBin, isFfmpegAvailable, resolveLocalMediaPath, ensureWorkDir } from "./ffmpeg";
import type { VantaAsset, VantaMediaPlan } from "../types";

const THUMB_TIMEOUT_MS = 20_000;
const DEFAULT_COUNT = 3;
const DEFAULT_WIDTH = 640;

export interface ThumbnailResult {
  mock: boolean;
  planned: boolean;
  outputs: string[];   // relative artifact paths ({asset_id}/thumb-N.jpg)
  commands: string[];
  notes: string[];
}

/** Seek points spread across the asset (skip the very start/end). */
function seekPointsS(durationMs: number | null, count: number): number[] {
  const durS = durationMs && durationMs > 0 ? durationMs / 1000 : 60;
  return Array.from({ length: count }, (_, i) => Math.max(0, Math.round(durS * (0.1 + (0.8 * i) / Math.max(1, count - 1)))));
}

function thumbCommand(input: string, atS: number, width: number, output: string): string[] {
  return ["-y", "-ss", String(atS), "-i", input, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-q:v", "3", output];
}

/** The worker plan (also returned as the mock result). */
export function planThumbnails(asset: VantaAsset, count = DEFAULT_COUNT, width = DEFAULT_WIDTH): VantaMediaPlan {
  const points = seekPointsS(asset.duration_ms, count);
  const argv = points.map((atS, i) =>
    ["ffmpeg", ...thumbCommand(`{media_root}/${asset.file_name}`, atS, width, `{work_dir}/thumb-${i + 1}.jpg`)]);
  return {
    mock: true,
    planned: true,
    operation: "thumbnail",
    argv,
    commands: argv.map((a) => a.join(" ")),
    outputs: points.map((_, i) => `${asset.id}/thumb-${i + 1}.jpg`),
    notes: ["Planned — executed by the Vanta Worker (or any media-capable box) against local footage. Execute argv (no shell); commands are display-only."],
  };
}

/** Extract thumbnails for an asset: real when possible, plan otherwise. Never throws. */
export async function extractThumbnails(asset: VantaAsset, count = DEFAULT_COUNT, width = DEFAULT_WIDTH): Promise<ThumbnailResult> {
  try {
    const local = resolveLocalMediaPath(asset.file_name);
    const workDir = ensureWorkDir(asset.id);
    if (local && workDir && (await isFfmpegAvailable())) {
      const points = seekPointsS(asset.duration_ms, count);
      const outputs: string[] = [];
      const commands: string[] = [];
      for (let i = 0; i < points.length; i++) {
        const out = path.join(workDir, `thumb-${i + 1}.jpg`);
        const args = thumbCommand(local, points[i], width, out);
        commands.push(["ffmpeg", ...args].join(" "));
        const res = await execBin("ffmpeg", args, THUMB_TIMEOUT_MS);
        if (res.ok && existsSync(out)) outputs.push(`${asset.id}/thumb-${i + 1}.jpg`);
      }
      if (outputs.length > 0) {
        return { mock: false, planned: false, outputs, commands, notes: [`Extracted ${outputs.length}/${points.length} frames to ${workDir}`] };
      }
    }
  } catch { /* fall through to plan */ }
  const plan = planThumbnails(asset, count, width);
  return { mock: true, planned: true, outputs: plan.outputs, commands: plan.commands, notes: plan.notes };
}
