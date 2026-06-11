// VANTA — Sound Design & Media Asset Engine: taxonomy + auto-sound-design rules (V1). PURE.
//
// The searchable SFX/music taxonomy, the music intelligence categories, and the
// deterministic cue-sheet rules the Sound Design Agent uses to score every edit plan.
// Actual audio files live in the asset library (vanta_assets, asset_kind: sfx|music) —
// this module is the knowledge layer, not storage.

import type { VantaSoundCue } from "../types";

// ── SFX taxonomy ──────────────────────────────────────────────────────────────

export interface SfxCategory {
  key: string;
  label: string;
  group: "ui" | "motion" | "social" | "business" | "construction";
  cues: string[];
}

export const SFX_TAXONOMY: SfxCategory[] = [
  { key: "ui_clicks", label: "Clicks & Presses", group: "ui", cues: ["Click 01", "Click Soft 02", "Button Press 03", "Toggle 04", "Switch 05"] },
  { key: "ui_feedback", label: "Notifications & Success", group: "ui", cues: ["Notification Pop 01", "Success Chime 02", "Loading Tick 03", "Confirm 04"] },
  { key: "motion_whoosh", label: "Whooshes & Swipes", group: "motion", cues: ["Whoosh Short 01", "Whoosh Deep 02", "Quick Swipe 03", "Air Swipe 04"] },
  { key: "motion_impact", label: "Impacts & Hits", group: "motion", cues: ["Impact Hit 01", "Impact Hit 04", "Sub Drop 02", "Punch Hit 03", "CTA Hit 05"] },
  { key: "motion_transition", label: "Transitions & Reveals", group: "motion", cues: ["Reveal Shimmer 01", "Transition Sweep 02", "Riser Subtle 03", "Riser Build 04"] },
  { key: "social_pop", label: "Pops & Ticks", group: "social", cues: ["Pop 01", "Tick 02", "Bounce 03", "Emphasis Ding 04", "Viral Zap 05"] },
  { key: "business_premium", label: "Premium Interface", group: "business", cues: ["Luxury Tap 01", "Dashboard Glide 02", "Tech Pulse 03", "Data Tick 04"] },
  { key: "construction_site", label: "Roofing & Site", group: "construction", cues: ["Hammer Hit 01", "Nail Gun Burst 02", "Drone Rise 03", "Drill 04", "Site Ambiance Bed 05"] },
];

// ── Music intelligence ────────────────────────────────────────────────────────

export interface MusicCategory {
  key: string;
  label: string;
  energy: "low" | "medium" | "high";
  tempo: string;
  mood: string;
  use_for: string[];
}

export const MUSIC_CATEGORIES: MusicCategory[] = [
  { key: "authority",    label: "Authority",    energy: "medium", tempo: "90–110 BPM",  mood: "confident, grounded",      use_for: ["educational", "owner videos", "expert breakdowns"] },
  { key: "luxury",       label: "Luxury",       energy: "low",    tempo: "70–90 BPM",   mood: "premium, spacious",        use_for: ["brand films", "high-end case studies"] },
  { key: "educational",  label: "Educational",  energy: "medium", tempo: "100–120 BPM", mood: "curious, forward",         use_for: ["how-to", "inspection walk-throughs"] },
  { key: "testimonial",  label: "Testimonial",  energy: "low",    tempo: "75–95 BPM",   mood: "warm, hopeful",            use_for: ["customer stories", "reviews"] },
  { key: "emotional",    label: "Emotional",    energy: "low",    tempo: "60–85 BPM",   mood: "sincere, cinematic",       use_for: ["storm recovery stories", "family outcomes"] },
  { key: "high_energy",  label: "High Energy",  energy: "high",   tempo: "120–150 BPM", mood: "urgent, driving",          use_for: ["Reels hooks", "ad variants", "promos"] },
  { key: "corporate",    label: "Corporate",    energy: "medium", tempo: "95–115 BPM",  mood: "clean, optimistic",        use_for: ["recruitment", "company updates"] },
  { key: "construction", label: "Construction", energy: "medium", tempo: "85–110 BPM",  mood: "gritty, capable",          use_for: ["crew b-roll", "build timelapses"] },
  { key: "roofing",      label: "Roofing",      energy: "medium", tempo: "90–115 BPM",  mood: "bold, dependable",         use_for: ["roof reveals", "drone passes", "before/after"] },
];

// ── Audio analysis flags (worker loudness/spectral pass; human-reported in MVP) ──

export const AUDIO_FLAGS = [
  "poor_microphone", "background_noise", "wind_noise", "echo", "clipping",
  "volume_inconsistent", "long_pauses", "dead_air",
] as const;
export type AudioFlag = (typeof AUDIO_FLAGS)[number];

export const AUDIO_FIXES: Record<AudioFlag, string> = {
  poor_microphone:    "Voice enhancement pass (EQ presence boost 2–4 kHz, high-pass 80 Hz)",
  background_noise:   "Noise reduction (spectral, −12 dB floor) before any EQ",
  wind_noise:         "High-pass 120 Hz + wind-specific denoise; re-shoot flag if severe",
  echo:               "De-reverb pass; tighten with gate; note room for future shoots",
  clipping:           "De-clip restoration; gain-stage future recordings at −12 dBFS peak",
  volume_inconsistent:"Compression 2.5:1 + automation pass to even speech levels",
  long_pauses:        "Mark for dead-space cuts in the edit plan (not an audio fix)",
  dead_air:           "Trim in edit; bed with low ambiance or music to avoid silence",
};

export const LOUDNESS_TARGETS = {
  social: "-14 LUFS integrated, -1 dBTP ceiling",
  ads: "-16 LUFS integrated, -1 dBTP ceiling",
  voice_bed_duck: "music ducks -12 dB under speech",
} as const;

// ── Auto sound design — deterministic cue-sheet rules ────────────────────────
//
// Every edit plan gets a timestamped cue sheet. Rules (distilled from top short-form
// teams): hook gets an attention hit inside 0.5s; pattern interrupts every 15–30s;
// CTA always lands with an impact; risers precede reveals; never two big hits <2s apart.

export function buildCueSheet(durationS: number, beats: Array<{ at_ms: number; kind: "hook" | "point" | "reveal" | "cta" }>): VantaSoundCue[] {
  const cues: VantaSoundCue[] = [{ at_ms: 0, cue: "Click 01", category: "ui_clicks" }];
  for (const b of beats) {
    switch (b.kind) {
      case "hook":   cues.push({ at_ms: b.at_ms, cue: "Impact Hit 04", category: "motion_impact" }); break;
      case "point":  cues.push({ at_ms: b.at_ms, cue: "Pop 01", category: "social_pop" }); break;
      case "reveal": cues.push({ at_ms: Math.max(0, b.at_ms - 1500), cue: "Riser Subtle 03", category: "motion_transition" },
                                { at_ms: b.at_ms, cue: "Whoosh Short 01", category: "motion_whoosh" }); break;
      case "cta":    cues.push({ at_ms: b.at_ms, cue: "CTA Hit 05", category: "motion_impact" }); break;
    }
  }
  // Pattern-interrupt safety net: a subtle cue at least every 20s if beats are sparse.
  const last = (ms: number) => cues.some((c) => Math.abs(c.at_ms - ms) < 8000);
  for (let t = 20000; t < durationS * 1000; t += 20000) {
    if (!last(t)) cues.push({ at_ms: t, cue: "Tick 02", category: "social_pop" });
  }
  // De-dupe collisions <2s apart, keep the stronger (earlier-listed) cue.
  const sorted = cues.sort((a, b) => a.at_ms - b.at_ms);
  return sorted.filter((c, i) => i === 0 || c.at_ms - sorted[i - 1].at_ms >= 2000);
}

/** Pick a music category for a project objective + energy read. PURE. */
export function pickMusic(objective: string, energy: "low" | "medium" | "high"): MusicCategory {
  if (objective === "testimonial") return MUSIC_CATEGORIES.find((m) => m.key === "testimonial")!;
  if (objective === "educational") return MUSIC_CATEGORIES.find((m) => m.key === "educational")!;
  if (objective === "recruitment") return MUSIC_CATEGORIES.find((m) => m.key === "corporate")!;
  if (energy === "high") return MUSIC_CATEGORIES.find((m) => m.key === "high_energy")!;
  if (objective === "brand_authority" || objective === "case_study") return MUSIC_CATEGORIES.find((m) => m.key === "authority")!;
  return MUSIC_CATEGORIES.find((m) => m.key === "roofing")!;
}

// ── Content packs ─────────────────────────────────────────────────────────────

export interface ContentPack {
  key: string;
  name: string;
  includes: string[];
  default_preset: string; // color preset key
  default_music: string;  // music category key
  sfx_groups: string[];
}

export const CONTENT_PACKS: ContentPack[] = [
  {
    key: "roofing_pack", name: "Roofing Pack",
    includes: ["Roofing transitions", "Roofing SFX", "Roofing lower thirds", "Roofing CTA animations", "Roofing Authority LUT"],
    default_preset: "roofing_authority", default_music: "roofing",
    sfx_groups: ["construction_site", "motion_impact", "motion_whoosh"],
  },
  {
    key: "testimonial_pack", name: "Testimonial Pack",
    includes: ["Testimonial graphics", "Testimonial transitions", "Trust-building animations"],
    default_preset: "testimonial_premium", default_music: "testimonial",
    sfx_groups: ["ui_feedback", "motion_transition"],
  },
  {
    key: "authority_pack", name: "Authority Pack",
    includes: ["Educational overlays", "Statistic graphics", "Expert callouts"],
    default_preset: "vault_signature", default_music: "authority",
    sfx_groups: ["business_premium", "social_pop"],
  },
  {
    key: "viral_reel_pack", name: "Viral Reel Pack",
    includes: ["Fast cuts", "Viral transitions", "Social media SFX", "Trend-based motion graphics"],
    default_preset: "social_viral", default_music: "high_energy",
    sfx_groups: ["social_pop", "motion_whoosh", "motion_impact"],
  },
];

export function getContentPack(key: string): ContentPack | undefined {
  return CONTENT_PACKS.find((p) => p.key === key);
}
