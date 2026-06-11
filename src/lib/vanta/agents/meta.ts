// VANTA — agent metadata (V1.1). CLIENT-SAFE display data only.
//
// This file is imported by client components (VantaHub) and therefore ships in the
// browser bundle. It must contain ONLY presentational metadata — never prompt text,
// system instructions, or the industry knowledge block. Real prompts live in
// ./registry.ts, which is server-only and must never be imported from a client file.
//
// Vanta's agents are LIBRARY-LEVEL AI roles (Victoria pattern) — NOT Vault Core runtime
// executives. The Vault Core roster stays exactly vega/veronica/valentina/valerie/
// vanessa/vivian; Vanta agents never run on the tick.

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
