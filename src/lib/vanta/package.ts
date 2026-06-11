// VANTA — measured creative package materialization (server-side, V1.6).
//
// When an asset has timestamped transcript segments AND detected/derived scenes, this
// module materializes the full review package into first-class Vanta tables —
// deterministically, from MEASURED data (no AI call, no media tools, no network):
//
//   vanta_clips + vanta_hooks   refreshed via the scoring rubric (scoring.ts)
//   vanta_edit_plans            one draft plan (timeline from top clips, cue sheet, music)
//   vanta_captions              real SRT payload from segments + style spec + emphasis map
//   vanta_thumbnails            concept rows from the top hooks
//   vanta_color_grades          preset recommendation with runnable recipes
//   vanta_scores                typed score events (clips, hooks, thumbnails, plan quality)
//   vanta_exports               one target='internal_review' row (Vault Core lane entry)
//
// PLANNING ONLY: nothing here renders, publishes, posts, or contacts anything. All
// writes go through the db.ts replace-per-asset helpers (Vanta tables only). Inputs are
// rows we previously validated; outputs are clamped/bounded here again regardless.

import {
  getVantaTranscript, getVantaScenes, replaceVantaClips, replaceVantaHooks,
  replaceVantaEditPlan, replaceVantaCaptions, replaceVantaThumbnails, replaceVantaColorGrade,
  appendVantaScores, replaceVantaExport, createVantaRun, patchVantaRun, updateVantaProject,
  getCreativePackageSummary,
} from "./db";
import type { VantaPackageSummary } from "./db";
import { generateClips } from "./scoring";
import { pickPreset } from "./color/presets";
import { buildCueSheet, pickMusic, LOUDNESS_TARGETS } from "./sound/taxonomy";
import { VANTA_FORMATS } from "./types";
import type {
  VantaProject, VantaAsset, VantaClip, VantaHook, VantaFormat,
  VantaTranscriptSegment, VantaEditPlan, VantaScore,
} from "./types";

const clamp100 = (n: number) => Math.max(1, Math.min(100, Math.round(n)));
const ts = (ms: number) => {
  const t = Math.max(0, Math.round(ms));
  const h = Math.floor(t / 3_600_000), m = Math.floor((t % 3_600_000) / 60_000);
  const s = Math.floor((t % 60_000) / 1000), mm = t % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(mm, 3)}`;
};

const EMPHASIS = /(\$[\d,]+|\b\d{2,}\b|\b\d+%)|\b(stop|never|warning|mistake|free|insurance|adjuster|claim|damage|guarantee)\b/i;

export type MaterializeResult =
  | { ok: true; summary: VantaPackageSummary; counts: Record<string, number> }
  | { ok: false; error: string; missing: string[] };

// ── Builders (pure, deterministic, bounded) ──────────────────────────────────

function buildSrt(segments: VantaTranscriptSegment[]): string {
  // Newlines/control chars inside segment text would corrupt SRT block structure.
  const cleanText = (t: string) => t.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  return segments.slice(0, 400)
    .map((s, i) => `${i + 1}\n${ts(s.start_ms)} --> ${ts(s.end_ms)}\n${cleanText(s.text)}\n`)
    .join("\n");
}

function buildEmphasisMap(segments: VantaTranscriptSegment[]): Array<{ at_ms: number; text: string; reason: string }> {
  return segments
    .filter((s) => EMPHASIS.test(s.text))
    .slice(0, 30)
    .map((s) => ({ at_ms: s.start_ms, text: s.text.slice(0, 120), reason: /\$|\d/.test(s.text) ? "number/price — gold emphasis" : "power word — gold emphasis" }));
}

function buildEditPlanDraft(
  project: VantaProject, asset: VantaAsset, clips: VantaClip[], format: VantaFormat,
): Omit<VantaEditPlan, "id" | "created_at" | "updated_at"> {
  const usable = clips.filter((c) => !c.is_dead_space).sort((a, b) => b.clip_score - a.clip_score).slice(0, 6)
    .sort((a, b) => a.start_ms - b.start_ms);
  const totalS = Math.round(usable.reduce((sum, c) => sum + (c.end_ms - c.start_ms), 0) / 1000);
  const targetS = Math.min(format === "short_916" ? 60 : 90, Math.max(15, totalS));
  const hookClip = usable.find((c) => c.is_hook) ?? usable[0] ?? null;
  const highEnergy = clips.filter((c) => c.energy === "high").length >= 2;
  const music = pickMusic(project.objective, highEnergy ? "high" : "medium");
  const durMs = asset.duration_ms ?? (clips[clips.length - 1]?.end_ms ?? 60_000);
  const cueSheet = buildCueSheet(Math.round(durMs / 1000), [
    { at_ms: hookClip?.start_ms ?? 0, kind: "hook" },
    { at_ms: Math.round(durMs * 0.4), kind: "point" },
    { at_ms: Math.round(durMs * 0.7), kind: "reveal" },
    { at_ms: Math.max(0, durMs - 5000), kind: "cta" },
  ]);
  return {
    project_id: project.id,
    asset_id: asset.id,
    title: `Edit plan — ${asset.file_name} (measured)`,
    format,
    target_duration_s: targetS,
    story_beats: [
      { beat: "Hook", note: hookClip?.transcript_excerpt?.slice(0, 120) ?? "Strongest scored moment first — no logo" },
      { beat: "Proof", note: "Highest-density measured clips, chronological" },
      { beat: "CTA", note: "Verbal + on-screen, final 5s" },
    ],
    timeline: usable.map((c, i) => ({
      order: i + 1,
      clip_ref: c.id,
      start_ms: c.start_ms,
      end_ms: c.end_ms,
      note: (c.transcript_excerpt ?? c.score_reasons[0] ?? "scored clip").slice(0, 160),
      ...(c.is_hook ? { zoom: "punch in 110% on hook" } : {}),
    })),
    pacing_notes: [
      "Cut every 2–4s in the first 15s",
      `Dead space removed: ${clips.filter((c) => c.is_dead_space).length} flagged segment(s)`,
      ...(clips.some((c) => c.flags.includes("estimated_timestamps")) ? ["Timestamps estimated from manual transcript — confirm against footage before cutting"] : []),
    ],
    sound_design: cueSheet,
    music_brief: { category: music.key, energy: music.energy, tempo: music.tempo, mood: music.mood },
    export_spec: { deliverable: "internal_review", format, loudness_target: LOUDNESS_TARGETS.social },
    status: "draft",
  };
}

function thumbnailDrafts(hooks: VantaHook[]) {
  const LAYOUTS = [
    "face/subject right-third, bold text left two-thirds",
    "vertical before/after split, arrow overlay",
    "full-frame detail close-up, text banner lower-third",
  ];
  return hooks.slice(0, 3).map((h, i) => {
    const words = h.hook_text.replace(/[^\w\s$%]/g, "").split(/\s+/).filter(Boolean);
    const short = words.slice(0, 4).join(" ").toUpperCase().slice(0, 40);
    return {
      concept: `Hook frame: "${h.hook_text.slice(0, 100)}"`,
      layout_spec: { layout: LAYOUTS[i] ?? LAYOUTS[0], emphasis_color: "#c9a84c", base_color: "#FFFFFF" },
      text_options: [short, ...(words.length > 4 ? [words.slice(0, 2).join(" ").toUpperCase()] : [])].slice(0, 3),
      ctr_rank: i + 1,
      predicted_ctr_note: `Derived from 3s hook score ${h.three_sec_score}/100 (deterministic)`,
      image_path: null,
    };
  });
}

function qualityScore(clips: VantaClip[], hooks: VantaHook[], segments: VantaTranscriptSegment[], estimated: boolean): { score: number; reasons: string[] } {
  const usable = clips.filter((c) => !c.is_dead_space);
  const top3 = [...usable].sort((a, b) => b.clip_score - a.clip_score).slice(0, 3);
  const avgTop = top3.length ? top3.reduce((s, c) => s + c.clip_score, 0) / top3.length : 0;
  const bestHook = hooks[0]?.three_sec_score ?? 0;
  const deadRatio = clips.length ? clips.filter((c) => c.is_dead_space).length / clips.length : 0;
  const reasons: string[] = [
    `top-3 clip avg ${Math.round(avgTop)}`,
    `best hook ${bestHook}`,
    `${Math.round(deadRatio * 100)}% windows dead space`,
    `${segments.length} measured segments`,
  ];
  let score = 25 + avgTop * 0.45 + bestHook * 0.25 - deadRatio * 25;
  if (estimated) { score -= 8; reasons.push("timestamps estimated (-8)"); }
  return { score: clamp100(score), reasons };
}

// ── Entry ─────────────────────────────────────────────────────────────────────

export async function materializeCreativePackage(
  project: VantaProject,
  asset: VantaAsset,
  opts: { format?: VantaFormat; actor?: string | null } = {},
): Promise<MaterializeResult> {
  const format: VantaFormat = (VANTA_FORMATS as readonly string[]).includes(opts.format ?? "")
    ? (opts.format as VantaFormat) : "short_916";

  const [transcript, scenes] = await Promise.all([getVantaTranscript(asset.id), getVantaScenes(asset.id)]);
  const segments = transcript?.segments ?? [];
  const missing: string[] = [];
  if (segments.length === 0) missing.push("transcript segments (run the transcript job)");
  if (scenes.length === 0) missing.push("scenes (run the scenes job)");
  if (missing.length > 0) return { ok: false, error: "Asset is not ready for materialization", missing };

  const estimated = !transcript || transcript.source !== "whisper";

  // 1. Refresh clips + hooks from the measured rubric (same path as the clips job).
  const generated = generateClips({ segments, scenes, durationMs: asset.duration_ms, estimated });
  const [clips, hooks] = await Promise.all([
    replaceVantaClips(project.id, asset.id, generated.clips),
    replaceVantaHooks(project.id, asset.id, generated.hooks),
  ]);

  // 2. Edit plan (one draft per asset; prior drafts + their exports retired).
  const { plan, removedPlanIds } = await replaceVantaEditPlan(asset.id, buildEditPlanDraft(project, asset, clips, format));

  // 3. Captions — real SRT from measured segments + the Vault style spec.
  const captions = await replaceVantaCaptions(project.id, asset.id, [{
    format: "srt",
    payload: buildSrt(segments),
    style_spec: {
      font: "Rajdhani Bold (brand) / Inter ExtraBold fallback",
      base_color: "#FFFFFF", emphasis_color: "#c9a84c",
      placement: "lower-third center, safe for 9:16 UI", words_per_card: 3,
      burn_in_recipe: "ffmpeg subtitles= styled ASS, 64px, 4px shadow (worker)",
      source: transcript?.source ?? "unknown", estimated_timestamps: estimated,
    },
    emphasis_map: buildEmphasisMap(segments),
    storage_path: null,
  }]);

  // 4. Thumbnail concepts from the top hooks.
  const thumbnails = await replaceVantaThumbnails(project.id, asset.id, thumbnailDrafts(hooks));

  // 5. Color grade recommendation (preset + runnable recipes; worker verifies later).
  const preset = pickPreset(["ok"], project.objective);
  await replaceVantaColorGrade(project.id, asset.id, {
    detected_condition: ["unverified — worker histogram pass pending"],
    preset_key: preset.key,
    ffmpeg_recipe: preset.ffmpeg_recipe,
    resolve_recipe: preset.resolve_recipe,
    premiere_recipe: preset.premiere_recipe,
    lut_recommendation: preset.lut_recommendation,
    consistency_score: 0, // meaningful only once the worker compares assets project-wide
    before_path: null, after_path: null,
    notes: `${preset.name}: ${preset.look}`,
  });

  // 6. Score events (bounded append log).
  const quality = qualityScore(clips, hooks, segments, estimated);
  const events: Array<Omit<VantaScore, "id" | "created_at">> = [
    ...[...clips].filter((c) => !c.is_dead_space).sort((a, b) => b.clip_score - a.clip_score).slice(0, 10)
      .map((c) => ({ project_id: project.id, entity_type: "clip" as const, entity_id: c.id, score_kind: "clip_score" as const, score: clamp100(c.clip_score), reasons: c.score_reasons.slice(0, 6), scored_by: "vanta" as const })),
    ...hooks.slice(0, 8)
      .map((h) => ({ project_id: project.id, entity_type: "hook" as const, entity_id: h.id, score_kind: "hook_3s" as const, score: clamp100(h.three_sec_score), reasons: [h.rationale ?? "deterministic rubric"].slice(0, 3), scored_by: "vanta" as const })),
    ...thumbnails.map((t) => ({ project_id: project.id, entity_type: "thumbnail" as const, entity_id: t.id, score_kind: "ctr_rank" as const, score: t.ctr_rank, reasons: [t.predicted_ctr_note ?? "rank"], scored_by: "vanta" as const })),
    { project_id: project.id, entity_type: "edit_plan" as const, entity_id: plan.id, score_kind: "quality" as const, score: quality.score, reasons: quality.reasons, scored_by: "vanta" as const },
  ];
  await appendVantaScores(events);

  // 7. Internal-review export row — the package's entry into the existing approval lane.
  const exportRow = await replaceVantaExport(project.id, removedPlanIds, {
    edit_plan_id: plan.id,
    target: "internal_review",
    format,
    storage_path: null,
    status: "pending",
    linked_brief_id: null,
  });

  // 8. Audit trail + project status (review).
  const statusUpdated = !!(await updateVantaProject(project.id, { status: "review" }));
  const audit = await createVantaRun({
    project_id: project.id, asset_id: asset.id, agent: "editor", job_type: "package",
    params: { format, estimated }, params_hash: null,
  });
  await patchVantaRun(audit.id, {
    status: "succeeded", started_at: audit.created_at, finished_at: new Date().toISOString(),
    result: {
      mock: false, planned: false, operation: "package",
      clip_count: clips.length, hook_count: hooks.length, caption_rows: captions.length,
      thumbnail_count: thumbnails.length, color_preset: preset.key,
      edit_plan_id: plan.id, export_id: exportRow.id, quality_score: quality.score,
      estimated_timestamps: estimated, project_status_updated: statusUpdated,
    },
  });

  // 9. Persistence read-back. Reads prefer the configured DB, so a partial write
  // (delete landed, insert failed → in-memory fallback) shows up here as missing
  // pieces — surface that instead of a silent 201. A pure mock environment (no DB,
  // or vanta_* tables absent) reads back from the mock store and passes — the
  // mandatory mock-fallback invariant is preserved.
  const summary = await getCreativePackageSummary(asset.id);
  const incomplete: string[] = [];
  if (!summary.edit_plan) incomplete.push("edit plan");
  if (!summary.caption_formats.includes("srt")) incomplete.push("captions");
  if (summary.thumbnail_count === 0) incomplete.push("thumbnails");
  if (!summary.color_preset) incomplete.push("color grade");
  if (!summary.export) incomplete.push("export");
  if (incomplete.length > 0) {
    return { ok: false, error: `Package persistence incomplete (${incomplete.join(", ")}) — check vanta_* tables/DB health and re-materialize`, missing: incomplete };
  }
  return {
    ok: true,
    summary,
    counts: {
      clips: clips.length, hooks: hooks.length, captions: captions.length,
      thumbnails: thumbnails.length, scores: events.length, quality: quality.score,
    },
  };
}
