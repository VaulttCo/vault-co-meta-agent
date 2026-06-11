// VANTA — processing job queue over vanta_agent_runs (server-side, V1.2).
//
// The job contract from docs/vanta-master-plan.md: queued → claimed → running →
// succeeded|failed, idempotent per (asset_id, job_type, params_hash). The control plane
// enqueues and executes only LIGHT work inline (probe, seeked thumbnails, placeholders);
// heavy work (proxy transcode, audio decode, whisper, scene detection) is returned as a
// PLAN for the Vanta Worker. Mock-safe everywhere — no binaries, no DB, no problem.
// Nothing here publishes, launches, uploads externally, or fetches URLs.

import { createHash } from "node:crypto";
import {
  createVantaRun, findActiveVantaRun, claimVantaRun, patchVantaRun,
  getVantaTranscript, updateVantaAssetMedia, updateVantaTranscript, createVantaTranscript,
  getVantaScenes, replaceVantaScenes, replaceVantaClips, replaceVantaHooks,
} from "./db";
import { getMediaCapabilities } from "./media/ffmpeg";
import { probeAsset } from "./media/ffprobe";
import { extractThumbnails } from "./media/thumbnails";
import { planProxy } from "./media/proxies";
import { planAudioExtraction } from "./media/audio";
import { planWaveform } from "./media/waveform";
import { transcribeLocalFile, segmentizeTranscript, planTranscription } from "./media/transcribe";
import { detectScenesLocal, deriveScenesMock } from "./media/scenes";
import { generateClips } from "./scoring";
import { VANTA_JOB_TYPES } from "./types";
import type { VantaAgentRun, VantaAsset, VantaJobType } from "./types";

const nowIso = () => new Date().toISOString();

/** Agent attribution per job type (master-plan roster). */
const JOB_AGENT: Record<VantaJobType, string> = {
  probe: "footage",
  proxy: "footage",
  thumbnail: "thumbnail",
  audio: "sound",
  transcript: "caption",
  scenes: "footage",
  clips: "footage",
};

export function isVantaJobType(v: unknown): v is VantaJobType {
  return typeof v === "string" && (VANTA_JOB_TYPES as readonly string[]).includes(v);
}

/** Recursive key-sorted stringify — stable across nested param shapes. */
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const obj = v as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** Stable hash over (asset, job_type, canonicalized params) — the dedupe key. */
export function computeParamsHash(assetId: string, jobType: VantaJobType, params: Record<string, unknown>): string {
  return createHash("sha256").update(`${assetId}:${jobType}:${stableStringify(params)}`).digest("hex").slice(0, 40);
}

// ── Queue primitives ──────────────────────────────────────────────────────────

export async function enqueueJob(input: {
  projectId: string | null;
  assetId: string;
  jobType: VantaJobType;
  params?: Record<string, unknown>;
}): Promise<{ run: VantaAgentRun; deduped: boolean }> {
  const params = input.params ?? {};
  const paramsHash = computeParamsHash(input.assetId, input.jobType, params);
  const existing = await findActiveVantaRun(input.assetId, input.jobType, paramsHash);
  if (existing) return { run: existing, deduped: true };
  const run = await createVantaRun({
    project_id: input.projectId,
    asset_id: input.assetId,
    agent: JOB_AGENT[input.jobType],
    job_type: input.jobType,
    params,
    params_hash: paramsHash,
  });
  return { run, deduped: false };
}

/** CAS claim (queued → claimed). Null when already claimed/finished. */
export function claimJob(id: string, claimedBy: string): Promise<VantaAgentRun | null> {
  return claimVantaRun(id, claimedBy);
}

export function completeJob(id: string, result: Record<string, unknown>): Promise<VantaAgentRun | null> {
  return patchVantaRun(id, { status: "succeeded", result, error: null, finished_at: nowIso() });
}

export function failJob(id: string, error: string): Promise<VantaAgentRun | null> {
  return patchVantaRun(id, { status: "failed", error: error.slice(0, 500), finished_at: nowIso() });
}

/** Finalize success with a failure fallback so a run never stays `running` from this path. */
async function finalizeSuccess(id: string, result: Record<string, unknown>): Promise<VantaAgentRun | null> {
  const done = await completeJob(id, result);
  if (done) return done;
  return failJob(id, "Job executed but the success result could not be persisted");
}

// ── Asset pipeline (Phase C) ──────────────────────────────────────────────────

/**
 * Enqueue the standard processing pipeline for one asset:
 * probe → thumbnail → proxy → audio → transcript (placeholder) → scenes (placeholder).
 * Enqueueing is row inserts only — no media work happens in the request handler.
 */
export async function enqueueAssetPipeline(
  projectId: string | null,
  asset: VantaAsset,
  opts: { hasManualTranscript?: boolean } = {},
): Promise<VantaAgentRun[]> {
  const jobs: VantaAgentRun[] = [];
  for (const jobType of VANTA_JOB_TYPES) {
    const params: Record<string, unknown> =
      jobType === "transcript" ? { source_preference: opts.hasManualTranscript ? "manual" : "whisper" } : {};
    try {
      const { run } = await enqueueJob({ projectId, assetId: asset.id, jobType, params });
      jobs.push(run);
    } catch (e) {
      console.error(`[vanta:jobs] enqueue ${jobType} failed`, (e as Error).message);
    }
  }
  return jobs;
}

// ── Inline executor (Phase D — POST /api/vanta/jobs/[id]/run) ────────────────
//
// Light jobs run for real when binaries + local footage exist; heavy jobs ALWAYS
// resolve to their worker plan. Every branch completes or fails the run — a job
// never gets stuck in `running` from this path.

export async function executeProcessingJob(run: VantaAgentRun, asset: VantaAsset | null): Promise<VantaAgentRun | null> {
  if (!isVantaJobType(run.job_type)) {
    return failJob(run.id, `Unsupported job_type for inline execution: ${run.job_type}`);
  }
  if (!asset) return failJob(run.id, "Asset not found for this job");

  await patchVantaRun(run.id, { status: "running", started_at: nowIso() });
  const caps = await getMediaCapabilities();

  try {
    switch (run.job_type) {
      case "probe": {
        const probe = await probeAsset(asset);
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
        return finalizeSuccess(run.id, { ...probe, capabilities: caps });
      }
      case "thumbnail": {
        const thumbs = await extractThumbnails(asset);
        return finalizeSuccess(run.id, { ...thumbs, capabilities: caps });
      }
      case "proxy": {
        // Heavy: never transcode in a request handler — hand the worker its plan.
        return finalizeSuccess(run.id, { ...planProxy(asset), capabilities: caps });
      }
      case "audio": {
        // Heavy: full decode — plan only. Waveform plan rides along for the worker.
        return finalizeSuccess(run.id, { ...planAudioExtraction(asset), waveform: planWaveform(asset), capabilities: caps });
      }
      case "transcript": {
        const existing = await getVantaTranscript(asset.id);
        // Already timestamped (whisper or prior derivation) — nothing to do.
        if (existing && existing.segments.length > 0) {
          return finalizeSuccess(run.id, {
            mock: false, planned: false, source: existing.source, transcript_id: existing.id,
            segment_count: existing.segments.length, word_count: existing.word_count,
            notes: ["Timestamped transcript already present."],
          });
        }
        // Manual transcript without timestamps → deterministic word-proportional segments.
        if (existing?.full_text) {
          const segments = segmentizeTranscript(existing.full_text, asset.duration_ms);
          await updateVantaTranscript(existing.id, { segments });
          return finalizeSuccess(run.id, {
            mock: false, planned: false, derived: true, source: existing.source,
            transcript_id: existing.id, segment_count: segments.length,
            notes: ["Segments estimated from the manual transcript (word-proportional timing). Whisper (worker) replaces these with measured timestamps."],
          });
        }
        // No transcript → real whisper if this box has it, worker plan otherwise.
        const real = await transcribeLocalFile(asset);
        if (real) {
          const tx = await createVantaTranscript({
            asset_id: asset.id, source: "whisper", full_text: real.full_text,
            segments: real.segments, language: real.language,
          });
          return finalizeSuccess(run.id, {
            mock: false, planned: false, source: "whisper", engine: real.engine,
            transcript_id: tx.id, segment_count: tx.segments.length, word_count: tx.word_count,
            notes: ["Transcribed locally via whisper CLI."],
          });
        }
        return finalizeSuccess(run.id, { ...planTranscription(asset), capabilities: caps });
      }
      case "scenes": {
        const real = await detectScenesLocal(asset);
        let drafts = real;
        if (!drafts) {
          const tx = await getVantaTranscript(asset.id);
          drafts = deriveScenesMock(asset, tx?.segments ?? [], asset.duration_ms);
        }
        const scenes = await replaceVantaScenes(asset.id, drafts);
        return finalizeSuccess(run.id, {
          mock: !real, planned: false, scene_count: scenes.length,
          detector: scenes[0]?.detector ?? null,
          notes: real
            ? ["Detected locally via PySceneDetect ContentDetector."]
            : ["Derived scenes (mock) — transcript-pause cuts when segments exist, fixed intervals otherwise. PySceneDetect (worker) replaces these."],
        });
      }
      case "clips": {
        const [tx, scenes] = await Promise.all([getVantaTranscript(asset.id), getVantaScenes(asset.id)]);
        const segments = tx?.segments ?? [];
        if (segments.length === 0 && scenes.length === 0) {
          return finalizeSuccess(run.id, {
            mock: true, planned: true, clip_count: 0, hook_count: 0,
            notes: ["No transcript segments or scenes yet — run the transcript and scenes jobs first, then queue processing again."],
          });
        }
        const estimated = !tx || tx.source !== "whisper";
        const out = generateClips({ segments, scenes, durationMs: asset.duration_ms, estimated });
        const [clips, hooks] = await Promise.all([
          replaceVantaClips(run.project_id, asset.id, out.clips),
          replaceVantaHooks(run.project_id, asset.id, out.hooks),
        ]);
        return finalizeSuccess(run.id, {
          mock: false, planned: false,
          clip_count: clips.length, hook_count: hooks.length,
          dead_space_clips: clips.filter((c) => c.is_dead_space).length,
          dead_space_ms: out.deadSpaceMs,
          estimated_timestamps: estimated,
          notes: ["Deterministic scoring rubric (scoring.ts) over transcript segments × scenes — hooks from first strong spoken moments, dead space from silence gaps + low speech density."],
        });
      }
    }
  } catch (e) {
    return failJob(run.id, (e as Error).message);
  }
}
