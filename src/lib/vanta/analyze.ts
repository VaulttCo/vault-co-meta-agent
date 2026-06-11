// VANTA — analysis orchestrator (server-side, V1).
//
// Runs the intelligence-plane creative package for one asset: a single composite
// structured call (strategist + footage + color + editor + caption + hook + thumbnail +
// sound + qa) with a DETERMINISTIC mock fallback so the app is fully functional with no
// API key and no database. Persists results via the db layer. Never publishes, launches,
// uploads, or contacts anything.

import { vantaToolCall, isVantaAiAvailable, type VantaToolSchema } from "./ai";
import { buildAnalysisSystemPrompt, buildAnalysisUserPrompt } from "./agents/registry";
import { pickPreset, getPreset, type FootageCondition } from "./color/presets";
import { buildCueSheet, pickMusic, LOUDNESS_TARGETS } from "./sound/taxonomy";
import type { VantaAnalysis, VantaProject, VantaAsset, VantaTranscript, VantaFormat } from "./types";

// ── Tool schema (kept permissive on nested shapes; DTO layer re-validates) ───

const num = { type: "number" } as const;
const str = { type: "string" } as const;
const strArr = { type: "array", items: { type: "string" } } as const;

const ANALYSIS_SCHEMA: VantaToolSchema = {
  type: "object",
  properties: {
    strategy: {
      type: "object",
      properties: {
        creative_brief: str, campaign_concepts: strArr, positioning_notes: strArr, hook_bank: strArr,
        content_plan: { type: "array", items: { type: "object", properties: { slot: str, concept: str, format: str }, required: ["slot", "concept", "format"] } },
      },
      required: ["creative_brief", "campaign_concepts", "content_plan", "hook_bank", "positioning_notes"],
    },
    clips: {
      type: "array",
      items: {
        type: "object",
        properties: {
          start_ms: num, end_ms: num, clip_score: num, is_hook: { type: "boolean" }, is_highlight: { type: "boolean" },
          is_dead_space: { type: "boolean" }, is_emotional: { type: "boolean" }, energy: str,
          transcript_excerpt: str, score_reasons: strArr, flags: strArr,
        },
        required: ["start_ms", "end_ms", "clip_score", "is_hook", "is_highlight", "is_dead_space", "is_emotional", "score_reasons", "flags"],
      },
    },
    hooks: {
      type: "array",
      items: { type: "object", properties: { hook_text: str, hook_type: str, three_sec_score: num, rationale: str }, required: ["hook_text", "hook_type", "three_sec_score", "rationale"] },
    },
    color: { type: "object", properties: { detected_condition: strArr, preset_key: str, notes: str }, required: ["detected_condition", "preset_key", "notes"] },
    edit_plan: {
      type: "object",
      properties: {
        title: str, format: str, target_duration_s: num,
        story_beats: { type: "array", items: { type: "object", properties: { beat: str, note: str }, required: ["beat", "note"] } },
        timeline: { type: "array", items: { type: "object", properties: { order: num, clip_ref: str, start_ms: num, end_ms: num, note: str, zoom: str, broll: str }, required: ["order", "clip_ref", "start_ms", "end_ms", "note"] } },
        pacing_notes: strArr,
        sound_design: { type: "array", items: { type: "object", properties: { at_ms: num, cue: str, category: str }, required: ["at_ms", "cue", "category"] } },
        music_brief: { type: "object", properties: { category: str, energy: str, tempo: str, mood: str }, required: ["category"] },
      },
      required: ["title", "format", "story_beats", "timeline", "pacing_notes", "sound_design", "music_brief"],
    },
    caption_style: {
      type: "object",
      properties: { font: str, base_color: str, emphasis_color: str, placement: str, words_per_card: num, emphasis_rules: strArr, burn_in_recipe: str },
      required: ["font", "base_color", "emphasis_color", "placement", "words_per_card", "emphasis_rules", "burn_in_recipe"],
    },
    thumbnails: {
      type: "array",
      items: { type: "object", properties: { concept: str, layout: str, text_options: strArr, ctr_rank: num, rationale: str }, required: ["concept", "layout", "text_options", "ctr_rank", "rationale"] },
    },
    sound_design: {
      type: "object",
      properties: {
        audio_flags: strArr, fixes: strArr,
        cue_sheet: { type: "array", items: { type: "object", properties: { at_ms: num, cue: str, category: str }, required: ["at_ms", "cue", "category"] } },
        music: { type: "object", properties: { category: str, energy: str, tempo: str, mood: str, rationale: str }, required: ["category", "energy", "tempo", "mood", "rationale"] },
        loudness_target: str,
      },
      required: ["audio_flags", "fixes", "cue_sheet", "music", "loudness_target"],
    },
    qa: {
      type: "object",
      properties: { quality_score: num, revision_notes: strArr, pacing_issues: strArr, audio_issues: strArr, caption_issues: strArr },
      required: ["quality_score", "revision_notes", "pacing_issues", "audio_issues", "caption_issues"],
    },
  },
  required: ["strategy", "clips", "hooks", "color", "edit_plan", "caption_style", "thumbnails", "sound_design", "qa"],
};

// ── Deterministic mock (no key / failure path — app must always function) ────

function mockAnalysis(project: VantaProject, asset: VantaAsset, transcript: VantaTranscript | null, format: VantaFormat): VantaAnalysis {
  const durMs = asset.duration_ms ?? 90_000;
  const preset = pickPreset(["ok"] as FootageCondition[], project.objective);
  const music = pickMusic(project.objective, "medium");
  const hookText = transcript?.full_text
    ? transcript.full_text.split(/[.!?]/)[0]?.trim().slice(0, 90) || "Open on the strongest claim"
    : `What every ${project.industry} owner gets wrong`;
  const cueSheet = buildCueSheet(Math.round(durMs / 1000), [
    { at_ms: 0, kind: "hook" },
    { at_ms: Math.round(durMs * 0.4), kind: "point" },
    { at_ms: Math.round(durMs * 0.7), kind: "reveal" },
    { at_ms: Math.max(0, durMs - 5000), kind: "cta" },
  ]);
  return {
    strategy: {
      creative_brief: `Mock strategy for "${project.title}" (${project.industry}, ${project.objective}). Connect an AI provider key for the full Vanta creative package; this deterministic plan demonstrates the structure.`,
      campaign_concepts: ["Owner-on-camera authority piece", "Before/after proof reel", "Customer story cut"],
      content_plan: [
        { slot: "Hook video", concept: "Strongest claim first 3s", format },
        { slot: "Proof video", concept: "Before/after with process beats", format },
      ],
      hook_bank: [hookText, "Here's what your insurance adjuster won't tell you", "This roof looked fine from the street"],
      positioning_notes: ["Trust over polish", "Real crew, real homes"],
    },
    clips: [
      { start_ms: 0, end_ms: Math.min(15000, durMs), clip_score: 74, is_hook: true, is_highlight: true, is_dead_space: false, is_emotional: false, energy: "medium", transcript_excerpt: hookText, score_reasons: ["opening statement (estimate — no scene data yet)"], flags: [] },
      { start_ms: Math.round(durMs * 0.45), end_ms: Math.round(durMs * 0.6), clip_score: 61, is_hook: false, is_highlight: true, is_dead_space: false, is_emotional: false, energy: "medium", transcript_excerpt: null, score_reasons: ["mid-content beat (estimate)"], flags: [] },
    ],
    hooks: [
      { hook_text: hookText, hook_type: "spoken", three_sec_score: 68, rationale: "First-sentence claim; needs a tighter visual interrupt (mock score)." },
      { hook_text: "Stop. Look at this roof before you sign anything.", hook_type: "text_overlay", three_sec_score: 72, rationale: "Command + curiosity gap (mock)." },
    ],
    color: { detected_condition: ["ok"], preset_key: preset.key, notes: `${preset.name}: ${preset.look}` },
    edit_plan: {
      title: `Edit plan — ${asset.file_name}`,
      format,
      target_duration_s: Math.min(60, Math.round(durMs / 1000)),
      story_beats: [
        { beat: "Hook", note: "Claim in first 3s, no logo" },
        { beat: "Proof", note: "Show, don't say — site footage" },
        { beat: "CTA", note: "Verbal + on-screen, final 5s" },
      ],
      timeline: [
        { order: 1, clip_ref: "clip-1", start_ms: 0, end_ms: 4000, note: "Hook — punch in 110%" },
        { order: 2, clip_ref: "clip-2", start_ms: Math.round(durMs * 0.45), end_ms: Math.round(durMs * 0.55), note: "Proof beat — overlay stat", broll: "roof detail close-up" },
      ],
      pacing_notes: ["Cut every 2–4s in the first 15s", "Pattern interrupt by 0:20"],
      sound_design: cueSheet,
      music_brief: { category: music.key, energy: music.energy, tempo: music.tempo, mood: music.mood },
    },
    caption_style: {
      font: "Rajdhani Bold (brand) / Inter ExtraBold fallback",
      base_color: "#FFFFFF",
      emphasis_color: "#c9a84c",
      placement: "lower-third center, safe for 9:16 UI",
      words_per_card: 3,
      emphasis_rules: ["Emphasize numbers and outcomes", "Gold on the payoff word only"],
      burn_in_recipe: "ffmpeg subtitles= styled ASS, 64px, 4px shadow (worker)",
    },
    thumbnails: [
      { concept: "Owner pointing at damaged shingle, shocked face", layout: "face right-third, text left two-thirds", text_options: ["DON'T SIGN YET", "$12K MISTAKE"], ctr_rank: 1, rationale: "Face + loss aversion (mock)" },
      { concept: "Split before/after roof", layout: "vertical split, arrow overlay", text_options: ["3 DAYS LATER"], ctr_rank: 2, rationale: "Transformation proof (mock)" },
    ],
    sound_design: {
      audio_flags: [],
      fixes: ["Loudness normalize to social target"],
      cue_sheet: cueSheet,
      music: { category: music.key, energy: music.energy, tempo: music.tempo, mood: music.mood, rationale: `Default ${music.label} bed for ${project.objective} (mock)` },
      loudness_target: LOUDNESS_TARGETS.social,
    },
    qa: {
      quality_score: 60,
      revision_notes: ["Mock package — connect ANTHROPIC_API_KEY for full analysis", "Confirm transcript before trusting clip timestamps"],
      pacing_issues: [], audio_issues: [], caption_issues: [],
    },
    mock: true,
  };
}

// ── Sanitization of AI output (defense in depth — never trust model output) ──

function clampScore(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : 0;
  return Math.max(0, Math.min(100, v));
}

function sanitize(a: VantaAnalysis, project: VantaProject, fallbackFormat: VantaFormat): VantaAnalysis {
  // Whitelist preset + music keys; clamp all scores; cap list sizes.
  const preset = getPreset(a.color?.preset_key) ?? pickPreset(["ok"], project.objective);
  const cap = <T,>(arr: T[] | undefined, n: number): T[] => (Array.isArray(arr) ? arr.slice(0, n) : []);
  return {
    ...a,
    clips: cap(a.clips, 30).map((c) => ({ ...c, clip_score: clampScore(c.clip_score) })),
    hooks: cap(a.hooks, 12).map((h) => ({ ...h, three_sec_score: clampScore(h.three_sec_score) })),
    color: { ...a.color, preset_key: preset.key, detected_condition: cap(a.color?.detected_condition, 8) },
    thumbnails: cap(a.thumbnails, 8).map((t) => ({ ...t, ctr_rank: clampScore(t.ctr_rank) })),
    edit_plan: { ...a.edit_plan, format: (["short_916", "wide_169", "square_11"].includes(a.edit_plan?.format) ? a.edit_plan.format : fallbackFormat) as VantaFormat, timeline: cap(a.edit_plan?.timeline, 60), sound_design: cap(a.edit_plan?.sound_design, 60) },
    sound_design: { ...a.sound_design, cue_sheet: cap(a.sound_design?.cue_sheet, 60) },
    qa: { ...a.qa, quality_score: clampScore(a.qa?.quality_score) },
    mock: false,
  };
}

// ── Public entry ──────────────────────────────────────────────────────────────

export async function runVantaAnalysis(
  project: VantaProject,
  asset: VantaAsset,
  transcript: VantaTranscript | null,
  opts: { format?: VantaFormat; humanNotes?: string | null; memoryWinners?: string[] } = {},
): Promise<VantaAnalysis> {
  const format = opts.format ?? "short_916";
  if (!isVantaAiAvailable()) return mockAnalysis(project, asset, transcript, format);

  const result = await vantaToolCall<VantaAnalysis>({
    system: buildAnalysisSystemPrompt(),
    user: buildAnalysisUserPrompt({
      projectTitle: project.title,
      industry: project.industry,
      objective: project.objective,
      format,
      assetName: asset.file_name,
      durationMs: asset.duration_ms,
      transcript: transcript?.full_text ?? null,
      humanNotes: opts.humanNotes ?? null,
      memoryWinners: opts.memoryWinners ?? [],
    }),
    toolName: "vanta_analysis",
    toolDescription: "Submit the complete Vanta creative package for this asset.",
    schema: ANALYSIS_SCHEMA,
  });

  if (!result) return mockAnalysis(project, asset, transcript, format);
  return sanitize(result, project, format);
}
