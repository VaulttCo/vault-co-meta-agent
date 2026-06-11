// VANTA — Color Grading Agent: signature presets + detection heuristics (V1). PURE.
//
// Five signature Vault Co looks. Each preset carries a real, runnable ffmpeg filter
// recipe (executed by the Vanta Worker — never by a Vercel route), plus Resolve and
// Premiere translations for the finishing bay. Detection heuristics map probe/histogram
// stats (worker) or human description (MVP) to footage conditions, and conditions to the
// right starting preset.

export interface VantaColorPreset {
  key: string;
  name: string;
  look: string;
  use_for: string[];
  ffmpeg_recipe: string;          // -vf chain, worker-executed
  resolve_recipe: Record<string, string>;
  premiere_recipe: Record<string, string>;
  lut_recommendation: string;
  notes: string;
}

export const VANTA_COLOR_PRESETS: VantaColorPreset[] = [
  {
    key: "vault_signature",
    name: "Vault Signature",
    look: "Luxury commercial — deep contrast, controlled highlights, gold-warm mids, clean blacks.",
    use_for: ["brand films", "owner videos", "premium case studies"],
    ffmpeg_recipe:
      "eq=contrast=1.08:saturation=1.06:gamma=0.98,curves=master='0/0 0.25/0.22 0.75/0.78 1/1',colorbalance=mh=0.04:sh=-0.02,unsharp=5:5:0.4",
    resolve_recipe: {
      lift: "-0.02 master, +0.01 blue (cool clean blacks)",
      gamma: "+0.03 red/yellow (gold-warm mids)",
      gain: "0.97 master (protect highlights)",
      saturation: "56 (from 50)",
      contrast: "1.08 pivot 0.435",
      node_2: "skin-tone qualifier, +5 sat, smooth",
    },
    premiere_recipe: {
      lumetri_basic: "Contrast +12, Highlights -8, Shadows -4, Whites -5, Blacks +2",
      lumetri_creative: "Sharpen 12, Vibrance +8",
      color_wheels: "Midtones toward gold (35°, 6%)",
    },
    lut_recommendation: "Vault_Signature_Rec709_v1.cube (build from this recipe in Resolve, export 33-pt)",
    notes: "The default for anything brand-level. Skin first, style second.",
  },
  {
    key: "roofing_authority",
    name: "Roofing Authority",
    look: "Bright confident skies, high contrast, enhanced roof texture/detail, crisp daylight.",
    use_for: ["roof inspections", "drone reveals", "before/after", "storm damage"],
    ffmpeg_recipe:
      "eq=contrast=1.12:saturation=1.1:brightness=0.02,curves=blue='0/0 0.5/0.52 1/1',unsharp=7:7:0.8,hqdn3d=2:1:2:2",
    resolve_recipe: {
      gain: "+0.04 blue in highlights (sky pop)",
      contrast: "1.12 pivot 0.42",
      saturation: "58, blue channel +6",
      sharpen: "Detail node: midtone detail +10 on roof texture qualifier",
      sky: "Sky qualifier — sat +8, lum -3 (deeper blue, no cyan drift)",
    },
    premiere_recipe: {
      lumetri_basic: "Contrast +18, Highlights -10, Whites +4, Clarity +15",
      lumetri_hsl: "Blues: sat +10, lum -5",
      sharpen: "Unsharp Mask 60/1.2",
    },
    lut_recommendation: "Roofing_Authority_Daylight_v1.cube",
    notes: "Roofs must read texture at feed size. Never let skies clip.",
  },
  {
    key: "testimonial_premium",
    name: "Testimonial Premium",
    look: "Warm, trustworthy, professional — soft contrast, flattering skin, gentle vignette.",
    use_for: ["customer testimonials", "owner trust pieces", "review compilations"],
    ffmpeg_recipe:
      "eq=contrast=1.04:saturation=1.03:gamma_r=1.02,colorbalance=mh=0.05:ms=0.02,vignette=PI/5:mode=backward:eval=init",
    resolve_recipe: {
      gamma: "+0.04 warm (red/yellow)",
      contrast: "1.04 pivot 0.445 (soft)",
      skin: "Skin qualifier — hue to 25°, sat +4, soften 2",
      vignette: "Circular window, -0.06 gain outside, 35 soft",
    },
    premiere_recipe: {
      lumetri_basic: "Contrast +6, Shadows +5, Temperature +8",
      lumetri_creative: "Faded film 10, Vignette -0.5",
    },
    lut_recommendation: "Testimonial_Warm_Skin_v1.cube",
    notes: "Comfort over punch. The person is the product.",
  },
  {
    key: "social_viral",
    name: "Social Viral",
    look: "Reels-optimized — punchy saturation, lifted shadows for small screens, crisp.",
    use_for: ["Reels", "Shorts", "TikTok", "paid social hooks"],
    ffmpeg_recipe:
      "eq=contrast=1.1:saturation=1.18:brightness=0.03,curves=master='0/0.02 0.5/0.55 1/1',unsharp=5:5:0.6",
    resolve_recipe: {
      lift: "+0.02 master (phone-screen shadows)",
      saturation: "62",
      contrast: "1.10 pivot 0.40",
      highlight_rolloff: "Soft clip 0.95 (HDR-screen safety)",
    },
    premiere_recipe: {
      lumetri_basic: "Contrast +14, Shadows +12, Saturation +18",
      sharpen: "Unsharp Mask 50/1.0",
    },
    lut_recommendation: "Social_Viral_Punch_v1.cube",
    notes: "Graded for a 6-inch screen at 60% brightness on a bus.",
  },
  {
    key: "raw_rescue",
    name: "Raw Rescue",
    look: "Repair pass — normalizes terrible footage (phone log, mixed WB, under/overexposed) to neutral Rec709 before any look.",
    use_for: ["client phone footage", "mixed-source projects", "salvage jobs"],
    ffmpeg_recipe:
      "normalize=blackpt=black:whitept=white:smoothing=30,eq=saturation=1.05,hqdn3d=3:2:3:3,unsharp=5:5:0.3",
    resolve_recipe: {
      step_1: "Color Space Transform (detected input → Rec709/2.4)",
      step_2: "Auto balance white from gray reference, else temp/tint by eye on skin",
      step_3: "Lift/gain to legal range, then hand off to a signature preset",
    },
    premiere_recipe: {
      lumetri_basic: "Auto, then WB eyedropper on neutral; Exposure to skin ~70 IRE",
      denoise: "Neat Video / Lumetri noise floor pass",
    },
    lut_recommendation: "none — rescue is corrective, LUT comes from the follow-up preset",
    notes: "Always rescue → THEN apply a signature look. Never stack a look on broken footage.",
  },
];

// Footage conditions Vanta detects (worker histogram/probe stats, or human description in MVP).
export const FOOTAGE_CONDITIONS = [
  "log", "flat", "gray", "underexposed", "overexposed", "bad_white_balance",
  "poor_skin_tones", "mixed_sources", "noisy", "ok",
] as const;
export type FootageCondition = (typeof FOOTAGE_CONDITIONS)[number];

/** Map detected conditions + project objective to the right starting preset. PURE. */
export function pickPreset(conditions: FootageCondition[], objective: string): VantaColorPreset {
  const bad = conditions.some((c) => ["log", "flat", "gray", "underexposed", "overexposed", "bad_white_balance", "mixed_sources", "noisy"].includes(c));
  if (bad) return VANTA_COLOR_PRESETS.find((p) => p.key === "raw_rescue")!;
  if (objective === "testimonial") return VANTA_COLOR_PRESETS.find((p) => p.key === "testimonial_premium")!;
  if (objective === "lead_generation") return VANTA_COLOR_PRESETS.find((p) => p.key === "social_viral")!;
  if (objective === "brand_authority" || objective === "case_study") return VANTA_COLOR_PRESETS.find((p) => p.key === "vault_signature")!;
  return VANTA_COLOR_PRESETS.find((p) => p.key === "roofing_authority")!;
}

export function getPreset(key: string): VantaColorPreset | undefined {
  return VANTA_COLOR_PRESETS.find((p) => p.key === key);
}
