// VANTA — worker completion contract (server-side, V1.4).
//
// Validates and applies the result payload an external worker submits for a finished
// job. NEVER trust the payload: every field is type-checked, clamped, and capped before
// any Vanta row is mutated; unknown fields are dropped (never stored). Writes touch
// vanta_* tables only. Payload schemas are documented in docs/vanta-worker-spec.md.

import {
  updateVantaAssetMedia, getVantaTranscript, createVantaTranscript, updateVantaTranscript,
  replaceVantaScenes,
} from "./db";
import type { VantaSceneDraft } from "./media/scenes";
import type { VantaAgentRun, VantaAsset, VantaTranscriptSegment } from "./types";

const MAX_OUTPUTS = 12;
const MAX_NOTES = 8;
const MAX_SEGMENTS = 400;
const MAX_SCENES = 60;
const MAX_FULL_TEXT = 100_000;
const SAFE_MAX_MS = 6 * 3600_000;

export interface WorkerApplyOutcome {
  ok: boolean;
  error?: string;
  /** Bounded, whitelisted result JSON to persist on the run. */
  result: Record<string, unknown>;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function posInt(v: unknown, max = SAFE_MAX_MS): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.min(Math.round(v), max) : null;
}

function ms(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), SAFE_MAX_MS) : null;
}

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

function strList(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, maxLen)).slice(0, maxItems);
}

// ── Per-job-type validators ───────────────────────────────────────────────────

async function applyProbe(asset: VantaAsset, p: Record<string, unknown>): Promise<WorkerApplyOutcome> {
  const probe = {
    mock: false,
    duration_ms: posInt(p.duration_ms),
    width: posInt(p.width, 16_000),
    height: posInt(p.height, 16_000),
    fps: typeof p.fps === "number" && Number.isFinite(p.fps) && p.fps > 0 && p.fps < 1000 ? Math.round(p.fps * 100) / 100 : null,
    codec: str(p.codec, 60),
    audio_codec: str(p.audio_codec, 60),
    audio_channels: posInt(p.audio_channels, 64),
    sample_rate_hz: posInt(p.sample_rate_hz, 384_000),
    bit_rate: posInt(p.bit_rate, 2_000_000_000),
    size_bytes: posInt(p.size_bytes, 1_000_000_000_000),
    format_name: str(p.format_name, 120),
    notes: strList(p.notes, MAX_NOTES, 300),
  };
  await updateVantaAssetMedia(asset.id, {
    duration_ms: probe.duration_ms ?? asset.duration_ms,
    width: probe.width ?? asset.width,
    height: probe.height ?? asset.height,
    fps: probe.fps ?? asset.fps,
    codec: probe.codec ?? asset.codec,
    size_bytes: probe.size_bytes ?? asset.size_bytes,
    probe: probe as unknown as Record<string, unknown>,
    status: "probed",
  });
  return { ok: true, result: { ...probe, source: "worker" } };
}

function applyArtifactList(operation: string, p: Record<string, unknown>): WorkerApplyOutcome {
  const outputs = strList(p.outputs, MAX_OUTPUTS, 300);
  if (outputs.length === 0) return { ok: false, error: "outputs[] is required (relative artifact paths)", result: {} };
  return {
    ok: true,
    result: {
      mock: false, planned: false, operation,
      outputs,
      storage_bucket: str(p.storage_bucket, 80),
      notes: strList(p.notes, MAX_NOTES, 300),
      source: "worker",
    },
  };
}

async function applyTranscript(asset: VantaAsset, p: Record<string, unknown>): Promise<WorkerApplyOutcome> {
  const fullText = str(p.full_text, MAX_FULL_TEXT);
  const rawSegments = Array.isArray(p.segments) ? p.segments : [];
  const segments: VantaTranscriptSegment[] = rawSegments
    .filter(isObj)
    .map((s) => ({
      start_ms: ms(s.start_ms) ?? -1,
      end_ms: ms(s.end_ms) ?? -1,
      text: str(s.text, 1000) ?? "",
      ...(str(s.speaker, 60) ? { speaker: str(s.speaker, 60)! } : {}),
    }))
    .filter((s) => s.start_ms >= 0 && s.end_ms > s.start_ms && s.text.length > 0)
    .slice(0, MAX_SEGMENTS);
  if (!fullText || segments.length === 0) {
    return { ok: false, error: "transcript requires full_text and at least one valid segment", result: {} };
  }
  const language = str(p.language, 16) ?? "en";
  const existing = await getVantaTranscript(asset.id);
  const tx = existing
    ? await updateVantaTranscript(existing.id, { full_text: fullText, segments, source: "whisper", language, word_count: fullText.split(/\s+/).length })
    : await createVantaTranscript({ asset_id: asset.id, source: "whisper", full_text: fullText, segments, language });
  return {
    ok: true,
    result: { mock: false, planned: false, source: "whisper", transcript_id: tx?.id ?? null, segment_count: segments.length, word_count: fullText.split(/\s+/).length, engine: str(p.engine, 80) ?? "faster-whisper (worker)" },
  };
}

async function applyScenes(asset: VantaAsset, p: Record<string, unknown>): Promise<WorkerApplyOutcome> {
  const raw = Array.isArray(p.scenes) ? p.scenes : [];
  const KINDS = ["talking_head", "b_roll", "drone", "site", "unknown"];
  const drafts: VantaSceneDraft[] = raw
    .filter(isObj)
    .map((s, i) => ({
      asset_id: asset.id,
      scene_index: i,
      start_ms: ms(s.start_ms) ?? -1,
      end_ms: ms(s.end_ms) ?? -1,
      kind: KINDS.includes(s.kind as string) ? (s.kind as string) : "unknown",
      detector: str(s.detector, 120) ?? "pyscenedetect (worker)",
      thumb_path: str(s.thumb_path, 300),
      metadata: {},
    }))
    .filter((s) => s.start_ms >= 0 && s.end_ms > s.start_ms)
    .slice(0, MAX_SCENES);
  if (drafts.length === 0) return { ok: false, error: "scenes requires at least one valid {start_ms,end_ms} entry", result: {} };
  const scenes = await replaceVantaScenes(asset.id, drafts);
  return { ok: true, result: { mock: false, planned: false, scene_count: scenes.length, detector: scenes[0]?.detector ?? null, source: "worker" } };
}

// ── Entry ─────────────────────────────────────────────────────────────────────

/**
 * Validate a worker completion payload for this run and apply its artifacts.
 * `clips` is rejected: clips/hooks are control-plane generated from transcript × scenes
 * (re-queue processing after transcript/scenes land instead).
 */
export async function applyWorkerResult(run: VantaAgentRun, asset: VantaAsset | null, payload: unknown): Promise<WorkerApplyOutcome> {
  const p = isObj(payload) ? payload : {};
  if (!asset) return { ok: false, error: "Asset not found for this run", result: {} };
  switch (run.job_type) {
    case "probe": return applyProbe(asset, p);
    case "thumbnail": return applyArtifactList("thumbnail", p);
    case "proxy": return applyArtifactList("proxy", p);
    case "audio": return applyArtifactList("audio", p);
    case "transcript": return applyTranscript(asset, p);
    case "scenes": return applyScenes(asset, p);
    case "clips": return { ok: false, error: "clips is control-plane generated — complete transcript/scenes, then enqueue processing", result: {} };
    default: return { ok: false, error: `Unknown job_type '${run.job_type}' for worker completion`, result: {} };
  }
}
