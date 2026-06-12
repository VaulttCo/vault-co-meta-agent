// VANTA — Auto Editor revision parser + memory encoding (server-side, V1.7). PURE.
//
// Turns a free-text operator instruction ("make it faster", "more luxury", "revise the
// hook") into bounded VantaRevisionDirectives — deterministic keyword matching, no AI
// call. Each accepted revision is also encoded as a vanta_memory pattern so future
// materializations start from the operator's learned preferences. Directives are
// embedded in the pattern behind a marker; rememberedDirectives() decodes them later.

import { MUSIC_CATEGORIES } from "./sound/taxonomy";
import type { VantaMemoryRow, VantaRevisionDirectives } from "./types";

const MEMORY_MARKER = "::directives=";
const MAX_PATTERN_LENGTH = 600; // encodeMemoryPattern cap — oversized rows are ignored

/** "don't make it faster" must not apply pace=faster — cheap negation lookbehind. */
const NEGATION = /\b(don'?t|do not|not|no|never|avoid|less|without|keep)\s+(?:\w+\s+){0,3}$/;
function matchIntent(text: string, re: RegExp): boolean {
  const m = re.exec(text);
  if (!m) return false;
  return !NEGATION.test(text.slice(Math.max(0, m.index - 28), m.index));
}

export interface ParsedRevision {
  directives: VantaRevisionDirectives;
  memory_kind: VantaMemoryRow["memory_kind"];
  /** Human-readable learned pattern (stored in vanta_memory, shown in the UI). */
  learned: string;
  /** What the revision will do — echoed back to the operator. */
  summary: string;
}

/** Deterministic instruction → directives. Null when nothing actionable matched. */
export function parseRevisionInstruction(raw: string): ParsedRevision | null {
  const text = raw.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 500);
  if (!text) return null;

  if (matchIntent(text, /(revise|change|new|different|swap|another).{0,20}hook|hook.{0,15}(weak|boring|different)/)) {
    return {
      directives: { hook_offset: 1 },
      memory_kind: "hook",
      learned: "Operator often rejects the top-ranked hook — surface alternates earlier",
      summary: "Swapped to the next-ranked hook candidate (opening beat, thumbnails re-ranked).",
    };
  }
  if (matchIntent(text, /(faster|quicker|tighter|too slow|speed.{0,8}up|shorter|punchier)/)) {
    return {
      directives: { pace: "faster" },
      memory_kind: "edit_style",
      learned: "Operator prefers faster pacing — tighter target duration, fewer/shorter clips",
      summary: "Tightened the cut: shorter target duration, top clips only, faster pacing notes.",
    };
  }
  if (matchIntent(text, /(more|extra|denser|bigger).{0,12}caption|caption.{0,15}(more|denser)/)) {
    return {
      directives: { captions_density: "more" },
      memory_kind: "caption",
      learned: "Operator prefers denser captions — fewer words per card, broader emphasis",
      summary: "Denser captions: 2 words/card and a broader emphasis map.",
    };
  }
  if (matchIntent(text, /(luxury|premium|high.?end|expensive|classy|cinematic)/)) {
    return {
      directives: { style: "luxury" },
      memory_kind: "color",
      learned: "Operator prefers the luxury treatment — Vault Signature grade + luxury music bed",
      summary: "Luxury treatment applied: Vault Signature color grade and a luxury music bed.",
    };
  }
  if (matchIntent(text, /(cut|remove|kill|trim).{0,15}(dead|silence|pause|air)/)) {
    return {
      directives: { cut_dead_space: true },
      memory_kind: "edit_style",
      learned: "Operator is strict on dead air — always cut silence gaps and low-density windows",
      summary: "Dead space confirmed cut: flagged silence gaps and low-density windows are excluded from the timeline.",
    };
  }
  const music = matchIntent(text, /(music|track|song|soundtrack|bed)/);
  if (music) {
    const named = MUSIC_CATEGORIES.find((m) => text.includes(m.key) || text.includes(m.label.toLowerCase()));
    return {
      directives: { music_category: named?.key ?? "__different__" },
      memory_kind: "sound",
      learned: named
        ? `Operator prefers ${named.label} music for this kind of content`
        : "Operator wanted a different music direction than the default pick",
      summary: named
        ? `Music brief switched to ${named.label}.`
        : "Music brief switched to a different category than the previous pick.",
    };
  }
  return null;
}

/** Encode a learned pattern row body (human text + machine-readable directives). */
export function encodeMemoryPattern(parsed: ParsedRevision): string {
  return `[auto-editor] ${parsed.learned} ${MEMORY_MARKER}${JSON.stringify(parsed.directives)}`.slice(0, 600);
}

/** Decode remembered directives from active human memory rows (oldest → newest so the
 *  most recent preference wins), capped to the known directive keys. */
export function rememberedDirectives(rows: VantaMemoryRow[]): VantaRevisionDirectives {
  const merged: VantaRevisionDirectives = {};
  const chronological = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const row of chronological) {
    if (!row.active || row.source !== "human") continue;
    if (row.pattern.length > MAX_PATTERN_LENGTH) continue; // oversized/crafted row — ignore
    const i = row.pattern.indexOf(MEMORY_MARKER);
    if (i < 0) continue;
    try {
      const d = JSON.parse(row.pattern.slice(i + MEMORY_MARKER.length, i + MEMORY_MARKER.length + MAX_PATTERN_LENGTH)) as VantaRevisionDirectives;
      if (typeof d.hook_offset === "number" && d.hook_offset >= 0 && d.hook_offset <= 8) merged.hook_offset = Math.round(d.hook_offset);
      if (d.pace === "faster") merged.pace = "faster";
      if (d.captions_density === "more") merged.captions_density = "more";
      if (d.style === "luxury") merged.style = "luxury";
      if (typeof d.music_category === "string" && d.music_category !== "__different__" &&
          MUSIC_CATEGORIES.some((m) => m.key === d.music_category)) merged.music_category = d.music_category;
      if (d.cut_dead_space === true) merged.cut_dead_space = true;
    } catch { /* malformed memory row — skip */ }
  }
  return merged;
}
