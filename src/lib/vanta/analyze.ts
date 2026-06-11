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
import type { VantaAnalysis, VantaProject, VantaAsset, VantaTranscript, VantaFormat, VantaSoundCue } from "./types";
import { VANTA_FORMATS } from "./types";

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
//
// Deep-normalizes EVERY field the workbench renders: missing/null/mistyped nested values
// become safe fallbacks, arrays are validated element-by-element, scores clamp to 0–100,
// and enum-ish fields (format, hook_type, energy, preset_key) are whitelisted. Malformed
// model output must never be able to break VantaWorkbench.

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function clampScore(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : 0;
  return Math.max(0, Math.min(100, v));
}

function safeStr(v: unknown, fallback: string, max = 4000): string {
  return typeof v === "string" && v.trim() ? v.slice(0, max) : fallback;
}

function strOrNull(v: unknown, max = 2000): string | null {
  return typeof v === "string" && v.trim() ? v.slice(0, max) : null;
}

// Colors render into inline styles client-side — accept hex only, never arbitrary CSS.
function safeColor(v: unknown, fallback: string): string {
  return typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v.trim()) ? v.trim() : fallback;
}

function strList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.slice(0, 2000)).slice(0, max);
}

function objArr(v: unknown, max: number): Record<string, unknown>[] {
  return Array.isArray(v) ? v.filter(isObj).slice(0, max) : [];
}

function nonNegInt(v: unknown, fallback = 0): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.max(0, n);
}

function cueList(v: unknown, max: number): VantaSoundCue[] {
  return objArr(v, max)
    .map((c) => ({ at_ms: nonNegInt(c.at_ms), cue: safeStr(c.cue, "", 120), category: safeStr(c.category, "general", 60) }))
    .filter((c) => c.cue !== "");
}

function sanitize(raw: unknown, project: VantaProject, fallbackFormat: VantaFormat): VantaAnalysis {
  const a = isObj(raw) ? raw : {};
  const strategy = isObj(a.strategy) ? a.strategy : {};
  const color = isObj(a.color) ? a.color : {};
  const editPlan = isObj(a.edit_plan) ? a.edit_plan : {};
  const captions = isObj(a.caption_style) ? a.caption_style : {};
  const sound = isObj(a.sound_design) ? a.sound_design : {};
  const music = isObj(sound.music) ? sound.music : {};
  const musicBrief = isObj(editPlan.music_brief) ? editPlan.music_brief : {};
  const qa = isObj(a.qa) ? a.qa : {};

  const preset = getPreset(safeStr(color.preset_key, "", 60)) ?? pickPreset(["ok"], project.objective);
  const defaultMusic = pickMusic(project.objective, "medium");
  const format = (VANTA_FORMATS as readonly string[]).includes(editPlan.format as string)
    ? (editPlan.format as VantaFormat) : fallbackFormat;

  const tds = editPlan.target_duration_s;
  return {
    strategy: {
      creative_brief: safeStr(strategy.creative_brief, "Creative brief unavailable — re-run the analysis."),
      campaign_concepts: strList(strategy.campaign_concepts, 12),
      content_plan: objArr(strategy.content_plan, 12).map((p) => ({
        slot: safeStr(p.slot, "Video", 120),
        concept: safeStr(p.concept, "Concept unavailable", 300),
        format: (VANTA_FORMATS as readonly string[]).includes(p.format as string) ? (p.format as VantaFormat) : format,
      })),
      hook_bank: strList(strategy.hook_bank, 20),
      positioning_notes: strList(strategy.positioning_notes, 12),
    },
    clips: objArr(a.clips, 30).map((c) => {
      const start = nonNegInt(c.start_ms);
      return {
        start_ms: start,
        end_ms: Math.max(start, nonNegInt(c.end_ms)),
        clip_score: clampScore(c.clip_score),
        is_hook: c.is_hook === true,
        is_highlight: c.is_highlight === true,
        is_dead_space: c.is_dead_space === true,
        is_emotional: c.is_emotional === true,
        energy: c.energy === "low" || c.energy === "medium" || c.energy === "high" ? c.energy : null,
        transcript_excerpt: strOrNull(c.transcript_excerpt, 500),
        score_reasons: strList(c.score_reasons, 8),
        flags: strList(c.flags, 8),
      };
    }),
    hooks: objArr(a.hooks, 12)
      .map((h) => ({
        hook_text: safeStr(h.hook_text, "", 300),
        hook_type: (["spoken", "text_overlay", "visual", "pattern_interrupt"] as const).find((t) => t === h.hook_type) ?? "spoken",
        three_sec_score: clampScore(h.three_sec_score),
        rationale: strOrNull(h.rationale, 600),
      }))
      .filter((h) => h.hook_text !== ""),
    color: {
      detected_condition: strList(color.detected_condition, 8),
      preset_key: preset.key,
      notes: safeStr(color.notes, `${preset.name}: ${preset.look}`, 1200),
    },
    edit_plan: {
      title: safeStr(editPlan.title, "Edit plan", 200),
      format,
      target_duration_s: typeof tds === "number" && Number.isFinite(tds) && tds > 0 ? Math.round(tds) : null,
      story_beats: objArr(editPlan.story_beats, 12).map((b) => ({
        beat: safeStr(b.beat, "Beat", 120),
        note: safeStr(b.note, "", 400),
      })),
      timeline: objArr(editPlan.timeline, 60).map((t, i) => {
        const start = nonNegInt(t.start_ms);
        return {
          order: nonNegInt(t.order, i + 1),
          clip_ref: safeStr(t.clip_ref, `clip-${i + 1}`, 80),
          start_ms: start,
          end_ms: Math.max(start, nonNegInt(t.end_ms)),
          note: safeStr(t.note, "", 400),
          ...(strOrNull(t.zoom, 120) ? { zoom: strOrNull(t.zoom, 120)! } : {}),
          ...(strOrNull(t.broll, 200) ? { broll: strOrNull(t.broll, 200)! } : {}),
        };
      }),
      pacing_notes: strList(editPlan.pacing_notes, 20),
      sound_design: cueList(editPlan.sound_design, 60),
      music_brief: {
        category: safeStr(musicBrief.category, defaultMusic.key, 60),
        energy: safeStr(musicBrief.energy, defaultMusic.energy, 30),
        tempo: safeStr(musicBrief.tempo, defaultMusic.tempo, 60),
        mood: safeStr(musicBrief.mood, defaultMusic.mood, 120),
      },
    },
    caption_style: {
      font: safeStr(captions.font, "Rajdhani Bold (brand) / Inter ExtraBold fallback", 120),
      base_color: safeColor(captions.base_color, "#FFFFFF"),
      emphasis_color: safeColor(captions.emphasis_color, "#c9a84c"),
      placement: safeStr(captions.placement, "lower-third center, safe for 9:16 UI", 200),
      words_per_card: Math.min(8, Math.max(1, nonNegInt(captions.words_per_card, 3) || 3)),
      emphasis_rules: strList(captions.emphasis_rules, 12),
      burn_in_recipe: safeStr(captions.burn_in_recipe, "ffmpeg subtitles= styled ASS (worker)", 400),
    },
    thumbnails: objArr(a.thumbnails, 8).map((t, i) => ({
      concept: safeStr(t.concept, `Thumbnail concept ${i + 1}`, 300),
      layout: safeStr(t.layout, "", 300),
      text_options: strList(t.text_options, 6),
      ctr_rank: clampScore(t.ctr_rank) || i + 1,
      rationale: safeStr(t.rationale, "", 600),
    })),
    sound_design: {
      audio_flags: strList(sound.audio_flags, 12),
      fixes: strList(sound.fixes, 12),
      cue_sheet: cueList(sound.cue_sheet, 60),
      music: {
        category: safeStr(music.category, defaultMusic.key, 60),
        energy: safeStr(music.energy, defaultMusic.energy, 30),
        tempo: safeStr(music.tempo, defaultMusic.tempo, 60),
        mood: safeStr(music.mood, defaultMusic.mood, 120),
        rationale: safeStr(music.rationale, `${defaultMusic.label} bed for ${project.objective}`, 400),
      },
      loudness_target: safeStr(sound.loudness_target, LOUDNESS_TARGETS.social, 80),
    },
    qa: {
      quality_score: clampScore(qa.quality_score),
      revision_notes: strList(qa.revision_notes, 20),
      pacing_issues: strList(qa.pacing_issues, 20),
      audio_issues: strList(qa.audio_issues, 20),
      caption_issues: strList(qa.caption_issues, 20),
    },
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
