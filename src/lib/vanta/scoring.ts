// VANTA — deterministic clip/hook scoring rubrics (V1.3). PURE functions, no I/O.
//
// Turns timestamped transcript segments + scenes into scored vanta_clips rows, hook
// candidates (first strong spoken moments), and dead-space flags (silence gaps + low
// transcript density). This is the deterministic floor under the AI Footage agent:
// it works identically in mock mode and never fabricates customer claims — it only
// scores what was actually said. Retention rules per the marketing knowledge base:
// hook inside 3s, one idea per clip, dead air is the enemy.

import type { VantaClip, VantaHook, VantaScene, VantaTranscriptSegment } from "./types";

export type VantaClipDraft = Pick<VantaClip,
  "start_ms" | "end_ms" | "clip_score" | "is_hook" | "is_highlight" | "is_dead_space" |
  "is_emotional" | "energy" | "transcript_excerpt" | "score_reasons" | "flags">;

export type VantaHookDraft = Pick<VantaHook, "hook_text" | "hook_type" | "three_sec_score" | "rationale">;

const MAX_CLIPS = 40;
const MAX_HOOKS = 8;
const HOOK_WINDOW_MS = 20_000;
const DEAD_GAP_MS = 2_500;
const LOW_DENSITY_WPS = 0.6; // words/second below this = dead air / filler footage

// Buyer-psychology power words (roofing/home-services KB): fear-of-scam, money, urgency.
const POWER_WORDS = /\b(stop|never|warning|mistake|secret|scam|wrong|free|save|cost|insurance|adjuster|claim|damage|leak|storm|before|after|proof|guarantee|won'?t tell|don'?t sign)\b/gi;
const EMOTIONAL_WORDS = /\b(family|home|scared|worried|stress|relief|proud|finally|trust|honest|peace of mind|nightmare)\b/gi;
const NUMBERS = /(\$[\d,]+|\b\d{2,}\b|\b\d+%|\b\d+ (?:days?|years?|hours?))/g;

const clamp = (n: number) => Math.max(1, Math.min(100, Math.round(n)));
const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;

// ── Hook detection — first strong spoken moments ─────────────────────────────

export function scoreHookCandidates(segments: VantaTranscriptSegment[], estimated: boolean): VantaHookDraft[] {
  const early = segments.filter((s) => s.start_ms < HOOK_WINDOW_MS).slice(0, 10);
  const drafts = early.map((s, i) => {
    const text = s.text.trim();
    const words = text.split(/\s+/).length;
    const reasons: string[] = [];
    let score = 45;
    if (i === 0) { score += 10; reasons.push("opens the video"); }
    if (/\?/.test(text)) { score += 12; reasons.push("question hook"); }
    const nums = count(text, NUMBERS);
    if (nums > 0) { score += 10; reasons.push("specific number/price"); }
    const power = Math.min(3, count(text, POWER_WORDS));
    if (power > 0) { score += power * 7; reasons.push(`${power} power word${power > 1 ? "s" : ""}`); }
    if (words <= 14) { score += 6; reasons.push("punchy length"); }
    if (words > 30) { score -= 8; reasons.push("too long for a 3s hook"); }
    return {
      hook_text: text.slice(0, 300),
      hook_type: "spoken" as const,
      three_sec_score: clamp(score),
      rationale: `${reasons.join(", ")}${estimated ? " (estimated timestamps)" : ""} — deterministic rubric`,
    };
  });
  return drafts
    .filter((h) => h.three_sec_score >= 50)
    .sort((a, b) => b.three_sec_score - a.three_sec_score)
    .slice(0, MAX_HOOKS);
}

// ── Clip generation — transcript × scenes ────────────────────────────────────

function segmentsInRange(segments: VantaTranscriptSegment[], start: number, end: number): VantaTranscriptSegment[] {
  return segments.filter((s) => s.end_ms > start && s.start_ms < end);
}

function scoreWindow(start: number, end: number, segs: VantaTranscriptSegment[], estimated: boolean): VantaClipDraft {
  const durS = Math.max(0.001, (end - start) / 1000);
  const text = segs.map((s) => s.text).join(" ").trim();
  const words = text ? text.split(/\s+/).length : 0;
  const density = words / durS;
  const reasons: string[] = [];
  const flags: string[] = [];
  if (estimated) flags.push("estimated_timestamps");

  if (density < LOW_DENSITY_WPS) {
    return {
      start_ms: start, end_ms: end, clip_score: clamp(12 + density * 10),
      is_hook: false, is_highlight: false, is_dead_space: true, is_emotional: false,
      energy: "low", transcript_excerpt: text ? text.slice(0, 200) : null,
      score_reasons: [`low speech density (${density.toFixed(1)} w/s)`], flags: [...flags, "dead_space"],
    };
  }

  let score = 40;
  score += Math.min(18, density * 6); reasons.push(`speech density ${density.toFixed(1)} w/s`);
  const power = count(text, POWER_WORDS);
  if (power > 0) { score += Math.min(15, power * 5); reasons.push(`${power} power word(s)`); }
  const nums = count(text, NUMBERS);
  if (nums > 0) { score += 6; reasons.push("specific numbers"); }
  if (/\?/.test(text)) { score += 5; reasons.push("question raised"); }
  if (/!/.test(text)) { score += 4; reasons.push("exclamation energy"); }
  const emotional = count(text, EMOTIONAL_WORDS) > 0;
  if (emotional) { score += 8; reasons.push("emotional language"); }
  if (start < HOOK_WINDOW_MS) { score += 5; reasons.push("early position"); }
  if (estimated) reasons.push("timestamps estimated from manual transcript");

  const energy: VantaClip["energy"] = power >= 2 || /!/.test(text) ? "high" : density >= 1.8 ? "medium" : "low";
  const clip_score = clamp(score);
  return {
    start_ms: start, end_ms: end, clip_score,
    is_hook: false, // set by caller against hook candidates
    is_highlight: clip_score >= 65,
    is_dead_space: false,
    is_emotional: emotional,
    energy,
    transcript_excerpt: text.slice(0, 200) || null,
    score_reasons: reasons, flags,
  };
}

export interface GenerateClipsInput {
  segments: VantaTranscriptSegment[];
  scenes: Pick<VantaScene, "start_ms" | "end_ms">[];
  durationMs: number | null;
  /** True when segment timestamps were derived (manual transcript), not measured. */
  estimated: boolean;
}

export interface GenerateClipsOutput {
  clips: VantaClipDraft[];
  hooks: VantaHookDraft[];
  deadSpaceMs: number;
}

const SAFE_MAX_MS = 6 * 3600_000; // matches the registration duration cap

export function generateClips(input: GenerateClipsInput): GenerateClipsOutput {
  const { segments, scenes, estimated } = input;
  const durMs = Math.min(SAFE_MAX_MS, input.durationMs && input.durationMs > 0
    ? input.durationMs
    : Math.max(segments[segments.length - 1]?.end_ms ?? 0, scenes[scenes.length - 1]?.end_ms ?? 0, 1000));

  // Windows: scenes when available (long scenes subdivided into ~15s beats so one
  // uncut talking-head take still yields granular clips), full duration otherwise.
  // Every window is clamped into [0, durMs] and generation stops at MAX_CLIPS so a
  // malformed scene row can never explode the loop.
  const rawWindows: Array<{ start: number; end: number }> = scenes.length > 0
    ? scenes.map((s) => ({ start: Math.max(0, Math.min(s.start_ms, durMs)), end: Math.max(0, Math.min(s.end_ms, durMs)) }))
    : [{ start: 0, end: durMs }];
  const windows: Array<{ start: number; end: number }> = [];
  for (const w of rawWindows) {
    if (windows.length >= MAX_CLIPS) break;
    if (w.end <= w.start) continue;
    if (w.end - w.start <= 25_000) { windows.push(w); continue; }
    for (let start = w.start; start < w.end && windows.length < MAX_CLIPS; start += 15_000) {
      windows.push({ start, end: Math.min(start + 15_000, w.end) });
    }
  }

  const hooks = scoreHookCandidates(segments, estimated);
  const hookTexts = new Set(hooks.map((h) => h.hook_text));

  const clips: VantaClipDraft[] = windows.map((w) => {
    const segs = segmentsInRange(segments, w.start, w.end);
    const clip = scoreWindow(w.start, w.end, segs, estimated);
    if (segs.some((s) => s.start_ms < HOOK_WINDOW_MS && hookTexts.has(s.text.trim().slice(0, 300)))) {
      clip.is_hook = true;
      clip.score_reasons = [...clip.score_reasons, "contains hook candidate"];
    }
    return clip;
  });

  // Silence gaps between segments → explicit dead-space clips (not covered by windows).
  let deadSpaceMs = clips.filter((c) => c.is_dead_space).reduce((sum, c) => sum + (c.end_ms - c.start_ms), 0);
  for (let i = 0; i < segments.length - 1 && clips.length < MAX_CLIPS; i++) {
    const gap = segments[i + 1].start_ms - segments[i].end_ms;
    if (gap > DEAD_GAP_MS) {
      deadSpaceMs += gap;
      clips.push({
        start_ms: segments[i].end_ms, end_ms: segments[i + 1].start_ms, clip_score: 8,
        is_hook: false, is_highlight: false, is_dead_space: true, is_emotional: false,
        energy: "low", transcript_excerpt: null,
        score_reasons: [`silence gap ${(gap / 1000).toFixed(1)}s`], flags: ["dead_space", "silence"],
      });
    }
  }

  clips.sort((a, b) => a.start_ms - b.start_ms);
  return { clips, hooks, deadSpaceMs };
}
