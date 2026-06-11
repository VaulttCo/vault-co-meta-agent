// VANTA — media foundation: binary detection + safe local execution (server-side only).
//
// Hard rules (Phase F):
// - Binaries run via execFile with argv arrays — never a shell, never interpolated strings.
// - Inputs are LOCAL files resolved strictly under VANTA_MEDIA_ROOT; this module never
//   fetches URLs, never reads outside the media root, and never writes outside its own
//   work directory ({VANTA_MEDIA_ROOT}/.vanta/{asset_id}/).
// - Every helper degrades to a mock-safe response when a binary or file is unavailable.
//   Nothing here may throw out of a route handler.

import { execFile } from "node:child_process";
import { existsSync, statSync, mkdirSync, realpathSync } from "node:fs";
import path from "node:path";
import type { VantaMediaCapabilities } from "../types";

const DETECT_TIMEOUT_MS = 5_000;
const DEFAULT_EXEC_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024; // ffprobe JSON on long files can be large

export interface VantaExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  error: string | null;
}

type MediaBinary = "ffmpeg" | "ffprobe" | "whisper" | "scenedetect";

const availability: Partial<Record<MediaBinary, boolean>> = {};

/** Detection probe per binary — whisper/scenedetect don't support -version. */
const DETECT_ARGS: Record<MediaBinary, string[]> = {
  ffmpeg: ["-version"],
  ffprobe: ["-version"],
  whisper: ["--help"],
  scenedetect: ["version"],
};

/** Run a media binary with a fixed argv array. Never throws; never uses a shell. */
export function execBin(bin: MediaBinary, args: string[], timeoutMs = DEFAULT_EXEC_TIMEOUT_MS): Promise<VantaExecResult> {
  return new Promise((resolve) => {
    try {
      execFile(bin, args, { timeout: timeoutMs, maxBuffer: MAX_OUTPUT_BYTES, shell: false }, (err, stdout, stderr) => {
        if (err) {
          resolve({ ok: false, stdout: stdout ?? "", stderr: stderr ?? "", error: err.message.slice(0, 500) });
        } else {
          resolve({ ok: true, stdout: stdout ?? "", stderr: stderr ?? "", error: null });
        }
      });
    } catch (e) {
      resolve({ ok: false, stdout: "", stderr: "", error: (e as Error).message.slice(0, 500) });
    }
  });
}

async function detectBinary(bin: MediaBinary): Promise<boolean> {
  if (availability[bin] !== undefined) return availability[bin]!;
  const res = await execBin(bin, DETECT_ARGS[bin], DETECT_TIMEOUT_MS);
  availability[bin] = res.ok;
  return res.ok;
}

export function isFfmpegAvailable(): Promise<boolean> { return detectBinary("ffmpeg"); }
export function isFfprobeAvailable(): Promise<boolean> { return detectBinary("ffprobe"); }
export function isWhisperAvailable(): Promise<boolean> { return detectBinary("whisper"); }
export function isSceneDetectAvailable(): Promise<boolean> { return detectBinary("scenedetect"); }

/** Local footage root (worker box / dev machine). Null when unset or missing → mock mode. */
export function getMediaRoot(): string | null {
  const root = process.env.VANTA_MEDIA_ROOT?.trim();
  if (!root) return null;
  try {
    // turbopackIgnore: runtime-configured directory — not a build-time asset
    const abs = path.resolve(/*turbopackIgnore: true*/ root);
    if (!existsSync(abs)) return null;
    const real = realpathSync(abs); // resolve symlinks — containment checks compare real paths
    return statSync(real).isDirectory() ? real : null;
  } catch { return null; }
}

/**
 * Resolve a registered asset's file inside the media root. Returns null unless the file
 * exists strictly under the root (basename only — no traversal, no absolute paths).
 */
export function resolveLocalMediaPath(fileName: string): string | null {
  const root = getMediaRoot();
  if (!root || typeof fileName !== "string" || !fileName.trim()) return null;
  const base = path.basename(fileName.trim());
  if (!base || base === "." || base === ".." || base.startsWith(".")) return null;
  const candidate = path.join(/*turbopackIgnore: true*/ root, base);
  if (!candidate.startsWith(root + path.sep)) return null;
  try {
    if (!existsSync(candidate)) return null;
    // Symlink-safe: the REAL path (after following links) must also live under the root.
    const real = realpathSync(candidate);
    if (real !== candidate && !real.startsWith(root + path.sep)) return null;
    return statSync(real).isFile() ? real : null;
  } catch { return null; }
}

/** Per-asset artifact directory under the media root. Null in mock mode. */
export function ensureWorkDir(assetId: string): string | null {
  const root = getMediaRoot();
  if (!root) return null;
  const safeId = assetId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) return null;
  const dir = path.join(/*turbopackIgnore: true*/ root, ".vanta", safeId);
  if (!dir.startsWith(root + path.sep)) return null;
  try {
    mkdirSync(dir, { recursive: true });
    // Symlink-safe: artifacts must land under the REAL media root, not through a link.
    const real = realpathSync(dir);
    return real === dir || real.startsWith(root + path.sep) ? real : null;
  } catch { return null; }
}

/** Capability snapshot for routes/UI — drives the MOCK MODE labels. */
export async function getMediaCapabilities(): Promise<VantaMediaCapabilities> {
  const [ffmpeg, ffprobe, whisper, scenedetect] = await Promise.all([
    isFfmpegAvailable(), isFfprobeAvailable(), isWhisperAvailable(), isSceneDetectAvailable(),
  ]);
  const mediaRoot = getMediaRoot();
  return {
    ffmpeg,
    ffprobe,
    whisper,
    scenedetect,
    mediaRoot,
    mode: ffmpeg && ffprobe && mediaRoot ? "real" : "mock",
  };
}
