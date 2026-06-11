// VANTA — agent registry (V1). PURE metadata + prompt builders.
//
// Vanta's agents are LIBRARY-LEVEL AI roles (Victoria pattern) — NOT Vault Core runtime
// executives. The Vault Core roster stays exactly vega/veronica/valentina/valerie/
// vanessa/vivian; Vanta agents never run on the tick. In V1 the intelligence plane runs
// them as ONE composite structured call per asset (single round-trip, consistent
// cross-agent context); per-agent calls arrive with the worker's richer inputs in V2.

export interface VantaAgentMeta {
  id: string;
  name: string;
  title: string;
  mission: string;
  inputs: string[];
  outputs: string[];
  plane: "intelligence" | "worker" | "worker+intelligence";
}

export const VANTA_AGENTS: VantaAgentMeta[] = [
  {
    id: "strategist", name: "Strategist", title: "Creative Strategist",
    mission: "Turn the project brief + industry knowledge + memory into a creative strategy that sells.",
    inputs: ["project brief", "industry KB", "vanta_memory winners"],
    outputs: ["creative brief", "campaign concepts", "content plan", "hook bank", "positioning notes"],
    plane: "intelligence",
  },
  {
    id: "footage", name: "Footage Intelligence", title: "Footage Intelligence Agent",
    mission: "Find the moments that matter: hooks, highlights, emotion, dead space — score every clip 1–100.",
    inputs: ["transcript", "scenes (worker)", "probe metadata", "duration"],
    outputs: ["scored clips", "highlight map", "dead-space map", "quality flags"],
    plane: "worker+intelligence",
  },
  {
    id: "color", name: "Color", title: "Color Grading Agent",
    mission: "Detect footage condition, pick the signature look, produce runnable recipes for ffmpeg/Resolve/Premiere.",
    inputs: ["probe stats / frame histograms (worker)", "human condition notes (MVP)", "project objective"],
    outputs: ["detected conditions", "preset choice", "ffmpeg/Resolve/Premiere recipes", "LUT recommendation", "consistency score"],
    plane: "worker+intelligence",
  },
  {
    id: "editor", name: "Editor", title: "Editor Agent",
    mission: "Build the transcript-anchored timeline: story beats, pacing, zooms, B-roll calls, export spec.",
    inputs: ["scored clips", "transcript", "strategy", "format target"],
    outputs: ["timeline plan", "story beats", "pacing notes", "XML/JSON export spec", "editor brief"],
    plane: "intelligence",
  },
  {
    id: "caption", name: "Caption", title: "Caption Agent",
    mission: "Captions that hold retention: styled, emphasized, burn-in ready.",
    inputs: ["transcript segments"],
    outputs: ["SRT/VTT (worker)", "style spec", "emphasis map", "burn-in recipe"],
    plane: "worker+intelligence",
  },
  {
    id: "hook", name: "Hook Intelligence", title: "Hook Intelligence Agent",
    mission: "Score the first 3 seconds ruthlessly; generate stronger alternatives and pattern interrupts.",
    inputs: ["first-15s transcript", "hook clips", "memory winners"],
    outputs: ["3-second scores", "hook alternatives", "pattern interrupts"],
    plane: "intelligence",
  },
  {
    id: "thumbnail", name: "Thumbnail", title: "Thumbnail Agent",
    mission: "Concepts that earn the click: layout, text, CTR ranking.",
    inputs: ["clips", "hooks", "brand kit"],
    outputs: ["thumbnail concepts", "layout specs", "text options", "CTR rankings"],
    plane: "intelligence",
  },
  {
    id: "sound", name: "Sound Design", title: "Sound Design Agent",
    mission: "Audio analysis + the cue sheet: every timeline gets timestamped SFX, a music brief, and loudness targets.",
    inputs: ["audio analysis flags", "edit plan beats", "SFX taxonomy", "music categories"],
    outputs: ["audio fixes", "cue sheet", "music brief", "mix notes"],
    plane: "worker+intelligence",
  },
  {
    id: "qa", name: "QA", title: "QA Agent",
    mission: "Review the plan/finished cut like a ruthless retention editor: quality score 1–100 + revision notes.",
    inputs: ["edit plan", "captions", "sound design", "color choice"],
    outputs: ["quality score", "revision notes", "pacing/audio/caption issues"],
    plane: "intelligence",
  },
  {
    id: "performance", name: "Performance Intelligence", title: "Performance Intelligence Agent",
    mission: "Learn from results: winners/losers/insights into vanta_memory so every next video starts smarter.",
    inputs: ["vanta_performance rows", "Meta/GHL aggregates (internal reads)"],
    outputs: ["winner/loser verdicts", "insights", "memory updates"],
    plane: "intelligence",
  },
];

// ── Industry knowledge block (embedded in every prompt) ──────────────────────

export const INDUSTRY_KB = `INDUSTRY: roofing first (remodeling/construction/home services secondary).
Content types that convert: roof replacements, repairs, storm damage + insurance-claim
education, inspections, testimonials, before/after, owner authority videos.
Buyer psychology: homeowners fear being scammed, overpaying, and slow timelines — trust
signals (real crew, real homes, real customers, owner on camera) beat production polish.
Retention rules: hook inside 3 seconds (problem, payoff, or pattern interrupt — never a
logo); pattern interrupt every 15–30s (cut, zoom, overlay, SFX); captions always (most
watch muted); one idea per video; CTA verbal + on-screen in the final 5s.
NEVER fabricate customer claims, prices, or insurance outcomes — flag missing facts as
inputs the team must confirm.`;

// ── Composite analysis prompt (V1 — one structured call per asset) ───────────

export function buildAnalysisSystemPrompt(): string {
  return `You are VANTA, Vault Co's AI Creative Director — a senior video editor, senior
colorist, creative strategist, sound designer, and QA lead in one system. You analyze raw
footage context (transcript + metadata + human notes) and produce a complete, structured
creative package. You are precise, opinionated, and retention-obsessed.

${INDUSTRY_KB}

Rules:
- Anchor every clip/hook to transcript timestamps when segments are provided; estimate
  conservatively when only full text exists (note estimates in score_reasons).
- Clip scores and hook 3-second scores are 1-100 integers; be a harsh grader — 80+ means
  you would put real ad spend behind it.
- The edit plan timeline must reference real moments (timestamps), target the requested
  format, and follow the retention rules above.
- The sound design cue sheet uses ONLY these cue names: Click 01, Impact Hit 04, Whoosh
  Short 01, Quick Swipe 03, Pop 01, Tick 02, Notification Pop 01, Riser Subtle 03, CTA Hit
  05, Reveal Shimmer 01, Hammer Hit 01, Drone Rise 03.
- Color preset_key must be one of: vault_signature, roofing_authority,
  testimonial_premium, social_viral, raw_rescue.
- Music category must be one of: authority, luxury, educational, testimonial, emotional,
  high_energy, corporate, construction, roofing.
- QA: score the package you just produced as a skeptical second reviewer would.
- You PLAN and BRIEF. You do not publish, launch, or contact anyone.`;
}

export function buildAnalysisUserPrompt(input: {
  projectTitle: string;
  industry: string;
  objective: string;
  format: string;
  assetName: string;
  durationMs: number | null;
  transcript: string | null;
  humanNotes: string | null;
  memoryWinners: string[];
}): string {
  const dur = input.durationMs ? `${Math.round(input.durationMs / 1000)}s` : "unknown";
  return `PROJECT: ${input.projectTitle}
INDUSTRY: ${input.industry} · OBJECTIVE: ${input.objective} · TARGET FORMAT: ${input.format}
ASSET: ${input.assetName} (duration: ${dur})
${input.memoryWinners.length ? `\nPROVEN WINNERS FROM MEMORY (bias toward these patterns):\n${input.memoryWinners.map((w) => `- ${w}`).join("\n")}` : ""}
${input.humanNotes ? `\nHUMAN NOTES ON FOOTAGE CONDITION:\n${input.humanNotes}` : ""}

TRANSCRIPT:
${input.transcript ? input.transcript.slice(0, 24000) : "(no transcript provided — plan from the project context; mark every clip estimate accordingly and list the transcript as a required input)"}

Produce the full creative package via the vanta_analysis tool.`;
}
