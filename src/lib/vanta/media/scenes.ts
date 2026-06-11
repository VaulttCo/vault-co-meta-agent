// VANTA — media foundation: scene detection (server-side only, V1.3).
//
// Two tiers, always mock-safe:
// 1. REAL — local PySceneDetect CLI (`scenedetect detect-content list-scenes`) against
//    footage under VANTA_MEDIA_ROOT, parsed from its scenes CSV.
// 2. DERIVED — deterministic mock: cut boundaries from transcript pauses (gaps > 1.5s)
//    when segments exist, fixed 8s intervals otherwise. Clearly labeled in `detector`.
// Never throws; never fetches URLs.

import { readFileSync } from "node:fs";
import { execBin, isSceneDetectAvailable, resolveLocalMediaPath, ensureWorkDir } from "./ffmpeg";
import { findFreshArtifact } from "./transcribe";
import type { VantaAsset, VantaMediaPlan, VantaScene, VantaTranscriptSegment } from "../types";

const SCENES_TIMEOUT_MS = 10 * 60_000; // worker-side budget; inline use is opt-in via /run
const MAX_SCENES = 60;
const PAUSE_CUT_MS = 1500;
const INTERVAL_MS = 8000;

export type VantaSceneDraft = Omit<VantaScene, "id" | "created_at">;

/** The worker plan: PySceneDetect ContentDetector. */
export function planSceneDetection(asset: VantaAsset): VantaMediaPlan {
  const argv = [[
    "scenedetect", "-i", `{media_root}/${asset.file_name}`, "-o", "{work_dir}",
    "detect-content", "list-scenes",
  ]];
  return {
    mock: true,
    planned: true,
    operation: "scenes",
    argv,
    commands: argv.map((a) => a.join(" ")),
    outputs: [`${asset.id}/scenes.csv`],
    notes: [
      "Planned — scene detection runs on the Vanta Worker (PySceneDetect ContentDetector).",
      "Execute argv (no shell); commands are display-only.",
    ],
  };
}

/** REAL detection via the local scenedetect CLI. Null on any failure — callers fall back. */
export async function detectScenesLocal(asset: VantaAsset): Promise<VantaSceneDraft[] | null> {
  try {
    if (!(await isSceneDetectAvailable())) return null;
    const local = resolveLocalMediaPath(asset.file_name);
    const workDir = ensureWorkDir(asset.id);
    if (!local || !workDir) return null;
    const startedAt = Date.now();
    const res = await execBin("scenedetect", ["-i", local, "-o", workDir, "detect-content", "list-scenes"], SCENES_TIMEOUT_MS);
    if (!res.ok) return null;
    const csvFile = findFreshArtifact(workDir, "-scenes.csv", startedAt);
    if (!csvFile) return null;
    const lines = readFileSync(csvFile, "utf8").split(/\r?\n/);
    const header = lines.findIndex((l) => l.toLowerCase().includes("scene number"));
    if (header < 0) return null;
    const cols = lines[header].split(",").map((c) => c.trim().toLowerCase());
    const startIdx = cols.findIndex((c) => c.includes("start time (seconds)"));
    const endIdx = cols.findIndex((c) => c.includes("end time (seconds)"));
    if (startIdx < 0 || endIdx < 0) return null;
    const drafts: VantaSceneDraft[] = [];
    for (const line of lines.slice(header + 1)) {
      const parts = line.split(",");
      const startS = parseFloat(parts[startIdx]);
      const endS = parseFloat(parts[endIdx]);
      if (!Number.isFinite(startS) || !Number.isFinite(endS) || endS <= startS) continue;
      drafts.push({
        asset_id: asset.id,
        scene_index: drafts.length,
        start_ms: Math.round(startS * 1000),
        end_ms: Math.round(endS * 1000),
        kind: "unknown",
        detector: "pyscenedetect ContentDetector (local)",
        thumb_path: null,
        metadata: {},
      });
      if (drafts.length >= MAX_SCENES) break;
    }
    return drafts.length > 0 ? drafts : null;
  } catch { return null; }
}

/**
 * DERIVED scenes (deterministic mock): cut at transcript pauses when segments exist
 * (a >1.5s silence usually means a take/shot change in talking-head footage),
 * fixed 8s intervals otherwise.
 */
export function deriveScenesMock(asset: VantaAsset, segments: VantaTranscriptSegment[], durationMs: number | null): VantaSceneDraft[] {
  const durMs = durationMs && durationMs > 0 ? durationMs : (segments.length ? segments[segments.length - 1].end_ms : 60_000);
  const drafts: VantaSceneDraft[] = [];
  const push = (start: number, end: number, kind: string, detector: string) => {
    if (end - start < 500 || drafts.length >= MAX_SCENES) return;
    drafts.push({ asset_id: asset.id, scene_index: drafts.length, start_ms: start, end_ms: end, kind, detector, thumb_path: null, metadata: {} });
  };
  if (segments.length > 0) {
    let sceneStart = 0;
    for (let i = 0; i < segments.length; i++) {
      const gapToNext = i + 1 < segments.length ? segments[i + 1].start_ms - segments[i].end_ms : durMs - segments[i].end_ms;
      if (gapToNext > PAUSE_CUT_MS || i === segments.length - 1) {
        push(sceneStart, Math.min(segments[i].end_ms + Math.min(gapToNext, PAUSE_CUT_MS), durMs), "talking_head", "transcript_pause_derived (mock)");
        sceneStart = i + 1 < segments.length ? segments[i + 1].start_ms : durMs;
      }
    }
    if (sceneStart < durMs) push(sceneStart, durMs, "unknown", "transcript_pause_derived (mock)");
  } else {
    for (let start = 0; start < durMs; start += INTERVAL_MS) {
      push(start, Math.min(start + INTERVAL_MS, durMs), "unknown", "fixed_interval (mock)");
    }
  }
  return drafts;
}
