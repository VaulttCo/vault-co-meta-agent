// VANTA — media foundation: review-proxy generation (server-side only).
// Proxy transcodes are HEAVY (full decode/encode) and are NEVER run inside a request
// handler — routes return the plan; generateProxy() exists for the Vanta Worker loop.
// Never throws; never fetches URLs.

import path from "node:path";
import { existsSync } from "node:fs";
import { execBin, isFfmpegAvailable, resolveLocalMediaPath, ensureWorkDir } from "./ffmpeg";
import type { VantaAsset, VantaMediaPlan } from "../types";

const PROXY_TIMEOUT_MS = 10 * 60_000; // worker-side budget; routes never wait on this

function proxyArgs(input: string, output: string): string[] {
  // 720p h264 review proxy (master plan §6): cheap to seek, safe to stream in the UI.
  return [
    "-y", "-i", input,
    "-vf", "scale=-2:720",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    output,
  ];
}

/** The worker plan for the 720p review proxy (always what routes return). */
export function planProxy(asset: VantaAsset): VantaMediaPlan {
  const argv = [["ffmpeg", ...proxyArgs(`{media_root}/${asset.file_name}`, `{work_dir}/proxy-720.mp4`)]];
  return {
    mock: true,
    planned: true,
    operation: "proxy",
    argv,
    commands: argv.map((a) => a.join(" ")),
    outputs: [`${asset.id}/proxy-720.mp4`],
    notes: [
      "Planned — proxy transcode is heavy and runs on the Vanta Worker, never in a request handler.",
      "Target: 720p h264 crf23 + aac 128k, faststart (vanta-proxies bucket convention).",
      "Execute argv (no shell); commands are display-only.",
    ],
  };
}

export interface ProxyResult {
  mock: boolean;
  planned: boolean;
  outputs: string[];
  commands: string[];
  notes: string[];
}

/** WORKER-ONLY real proxy generation. Do not call from API routes. */
export async function generateProxy(asset: VantaAsset): Promise<ProxyResult> {
  try {
    const local = resolveLocalMediaPath(asset.file_name);
    const workDir = ensureWorkDir(asset.id);
    if (local && workDir && (await isFfmpegAvailable())) {
      const out = path.join(workDir, "proxy-720.mp4");
      const args = proxyArgs(local, out);
      const res = await execBin("ffmpeg", args, PROXY_TIMEOUT_MS);
      if (res.ok && existsSync(out)) {
        return {
          mock: false, planned: false,
          outputs: [`${asset.id}/proxy-720.mp4`],
          commands: [["ffmpeg", ...args].join(" ")],
          notes: [`Proxy written to ${out}`],
        };
      }
    }
  } catch { /* fall through to plan */ }
  const plan = planProxy(asset);
  return { mock: true, planned: true, outputs: plan.outputs, commands: plan.commands, notes: plan.notes };
}
