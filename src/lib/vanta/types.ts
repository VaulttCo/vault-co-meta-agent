// VANTA — Creative Intelligence module, core types (V1).
//
// Vanta is a PRODUCT SURFACE (Victoria pattern): its agents are library-level AI roles,
// NOT Vault Core runtime executives. Vanta never launches ads, never posts/publishes
// content, never contacts clients — finished assets flow into the EXISTING Vault Core
// creative-brief / meta-campaign-draft approval lanes. Media processing (ffmpeg/whisper/
// scenes) runs on the external Vanta Worker via the vanta_agent_runs job queue; the app
// itself performs orchestration + AI reasoning only.

export const VANTA_PROJECT_STATUSES = [
  "intake", "analyzing", "review", "editing", "qa", "exported", "archived",
] as const;
export type VantaProjectStatus = (typeof VANTA_PROJECT_STATUSES)[number];

export const VANTA_INDUSTRIES = [
  "roofing", "remodeling", "construction", "home_services", "agency",
] as const;
export type VantaIndustry = (typeof VANTA_INDUSTRIES)[number];

export const VANTA_OBJECTIVES = [
  "lead_generation", "brand_authority", "testimonial", "educational", "recruitment", "case_study",
] as const;
export type VantaObjective = (typeof VANTA_OBJECTIVES)[number];

export const VANTA_ASSET_KINDS = [
  "footage", "audio", "image", "music", "sfx", "lut", "motion_template", "broll", "drone", "stock", "brand",
] as const;
export type VantaAssetKind = (typeof VANTA_ASSET_KINDS)[number];

export const VANTA_FORMATS = ["short_916", "wide_169", "square_11"] as const;
export type VantaFormat = (typeof VANTA_FORMATS)[number];

// ── Media processing (V1.2) ──────────────────────────────────────────────────

export const VANTA_JOB_TYPES = ["probe", "proxy", "thumbnail", "audio", "transcript", "scenes", "clips"] as const;
export type VantaJobType = (typeof VANTA_JOB_TYPES)[number];

export type VantaTranscriptSegment = { start_ms: number; end_ms: number; text: string; speaker?: string };

/** Mirror of vanta_scenes (docs/vanta-schema.sql §3). */
export interface VantaScene {
  id: string;
  asset_id: string | null;
  scene_index: number;
  start_ms: number;
  end_ms: number;
  kind: string;          // talking_head | b_roll | drone | site | unknown
  detector: string | null;
  thumb_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** What media tooling is available where this process runs (control plane vs worker). */
export interface VantaMediaCapabilities {
  ffmpeg: boolean;
  ffprobe: boolean;
  whisper: boolean;
  scenedetect: boolean;
  mediaRoot: string | null;
  /** real = ffmpeg+ffprobe+media root. whisper/scenedetect upgrade individual jobs. */
  mode: "real" | "mock";
}

/** Normalized ffprobe output (or its deterministic mock equivalent). */
export interface VantaProbeResult {
  mock: boolean;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  codec: string | null;
  audio_codec: string | null;
  audio_channels: number | null;
  sample_rate_hz: number | null;
  bit_rate: number | null;
  size_bytes: number | null;
  format_name: string | null;
  notes: string[];
}

/** A planned (not yet executed) media operation — the worker contract payload. */
export interface VantaMediaPlan {
  mock: boolean;
  planned: true;
  operation: string;
  argv: string[][];     // EXECUTABLE contract: argv arrays (binary first) — worker must
                        // spawn these without a shell; file names are single argv tokens
  commands: string[];   // DISPLAY ONLY: human-readable join of argv — never execute these
  outputs: string[];    // relative artifact paths ({asset_id}/{artifact})
  notes: string[];
}

// ── Entities (mirror docs/vanta-schema.sql) ──────────────────────────────────

export interface VantaProject {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  industry: VantaIndustry;
  objective: VantaObjective;
  status: VantaProjectStatus;
  brand_kit: Record<string, unknown>;
  strategy: VantaStrategy | Record<string, never>;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VantaAsset {
  id: string;
  project_id: string | null;
  asset_kind: VantaAssetKind;
  file_name: string;
  storage_bucket: string | null;
  storage_path: string | null;
  source_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  codec: string | null;
  probe: Record<string, unknown>;
  audio_analysis: Record<string, unknown>;
  license: Record<string, unknown>;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VantaTranscript {
  id: string;
  asset_id: string | null;
  language: string;
  source: "manual" | "whisper" | "import";
  full_text: string | null;
  segments: VantaTranscriptSegment[];
  word_count: number;
  filler_word_count: number;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface VantaClip {
  id: string;
  project_id: string | null;
  asset_id: string | null;
  scene_id: string | null;
  start_ms: number;
  end_ms: number;
  clip_score: number; // 1..100
  is_hook: boolean;
  is_highlight: boolean;
  is_dead_space: boolean;
  is_emotional: boolean;
  energy: "low" | "medium" | "high" | null;
  transcript_excerpt: string | null;
  score_reasons: string[];
  flags: string[];
  created_at: string;
}

export interface VantaHook {
  id: string;
  project_id: string | null;
  asset_id: string | null;
  clip_id: string | null;
  hook_text: string;
  hook_type: "spoken" | "text_overlay" | "visual" | "pattern_interrupt";
  three_sec_score: number; // 1..100
  rationale: string | null;
  created_at: string;
}

export interface VantaColorGrade {
  id: string;
  asset_id: string | null;
  project_id: string | null;
  detected_condition: string[];
  preset_key: string;
  ffmpeg_recipe: string | null;
  resolve_recipe: Record<string, unknown>;
  premiere_recipe: Record<string, unknown>;
  lut_recommendation: string | null;
  consistency_score: number;
  before_path: string | null;
  after_path: string | null;
  notes: string | null;
  created_at: string;
}

export interface VantaSoundCue {
  at_ms: number;
  cue: string;       // e.g. "Impact Hit 04"
  category: string;  // taxonomy category key
}

export interface VantaEditPlan {
  id: string;
  project_id: string | null;
  asset_id: string | null;
  title: string;
  format: VantaFormat;
  target_duration_s: number | null;
  story_beats: Array<{ beat: string; note: string }>;
  timeline: Array<{ order: number; clip_ref: string; start_ms: number; end_ms: number; note: string; zoom?: string; broll?: string }>;
  pacing_notes: string[];
  sound_design: VantaSoundCue[];
  music_brief: { category?: string; energy?: string; tempo?: string; mood?: string };
  export_spec: Record<string, unknown>;
  status: "draft" | "approved_internal" | "rendered" | "archived";
  created_at: string;
  updated_at: string;
}

export interface VantaQAReview {
  quality_score: number; // 1..100
  revision_notes: string[];
  pacing_issues: string[];
  audio_issues: string[];
  caption_issues: string[];
}

export interface VantaMemoryRow {
  id: string;
  memory_kind: "hook" | "caption" | "thumbnail" | "transition" | "edit_style" | "color" | "cta" | "sound";
  industry: VantaIndustry;
  pattern: string;
  evidence: string[];
  win_count: number;
  loss_count: number;
  confidence: number;
  source: "performance" | "human" | "seed";
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VantaAgentRun {
  id: string;
  project_id: string | null;
  asset_id: string | null;
  agent: string;
  job_type: string;
  status: "queued" | "claimed" | "running" | "succeeded" | "failed";
  params: Record<string, unknown>;
  params_hash: string | null;
  result: Record<string, unknown>;
  error: string | null;
  claimed_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Agent output shapes (Intelligence plane — structured tool-call JSON) ─────

export interface VantaStrategy {
  creative_brief: string;
  campaign_concepts: string[];
  content_plan: Array<{ slot: string; concept: string; format: VantaFormat }>;
  hook_bank: string[];
  positioning_notes: string[];
}

export interface VantaThumbnailConcept {
  concept: string;
  layout: string;
  text_options: string[];
  ctr_rank: number;
  rationale: string;
}

export interface VantaCaptionStyle {
  font: string;
  base_color: string;
  emphasis_color: string;
  placement: string;
  words_per_card: number;
  emphasis_rules: string[];
  burn_in_recipe: string;
}

export interface VantaSoundDesignPlan {
  audio_flags: string[];
  fixes: string[];
  cue_sheet: VantaSoundCue[];
  music: { category: string; energy: string; tempo: string; mood: string; rationale: string };
  loudness_target: string;
}

/** The full analysis result the intelligence plane produces for one asset. */
export interface VantaAnalysis {
  strategy: VantaStrategy;
  clips: Array<Pick<VantaClip, "start_ms" | "end_ms" | "clip_score" | "is_hook" | "is_highlight" | "is_dead_space" | "is_emotional" | "energy" | "transcript_excerpt" | "score_reasons" | "flags">>;
  hooks: Array<Pick<VantaHook, "hook_text" | "hook_type" | "three_sec_score" | "rationale">>;
  color: { detected_condition: string[]; preset_key: string; notes: string };
  edit_plan: Pick<VantaEditPlan, "title" | "format" | "target_duration_s" | "story_beats" | "timeline" | "pacing_notes" | "sound_design" | "music_brief">;
  caption_style: VantaCaptionStyle;
  thumbnails: VantaThumbnailConcept[];
  sound_design: VantaSoundDesignPlan;
  qa: VantaQAReview;
  mock: boolean; // true when produced by the deterministic fallback
}

// ── DTO inputs ────────────────────────────────────────────────────────────────

export interface VantaProjectInput {
  client_id?: string | null;
  title: string;
  description?: string | null;
  industry?: VantaIndustry;
  objective?: VantaObjective;
}

export interface VantaAssetInput {
  project_id: string;
  file_name: string;
  asset_kind?: VantaAssetKind;
  source_url?: string | null;
  duration_ms?: number | null;
  notes?: string | null;
  transcript_text?: string | null; // manual transcript paste (MVP path before the worker)
}
