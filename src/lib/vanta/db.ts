// VANTA — data layer (server-side, V1). Mock-safe.
//
// In-memory store (starts EMPTY) when Supabase is unconfigured or vanta_* tables are
// absent; otherwise persists via the service-role client. Nothing here publishes,
// launches, uploads to external platforms, or contacts anyone. The vanta_agent_runs row
// is the audit trail for every analysis.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  VantaProject, VantaProjectInput, VantaAsset, VantaAssetInput, VantaTranscript,
  VantaAgentRun, VantaAnalysis, VantaMemoryRow, VantaIndustry, VantaObjective,
  VantaScene, VantaClip, VantaHook, VantaTranscriptSegment,
  VantaEditPlan, VantaCaption, VantaThumbnail, VantaColorGrade, VantaScore, VantaExport,
} from "./types";
import { VANTA_INDUSTRIES, VANTA_OBJECTIVES, VANTA_ASSET_KINDS, VANTA_JOB_TYPES as VANTA_ASSET_PIPELINE_ORDER } from "./types";
import type { VantaAssetKind } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseServerClient();
}

const mockProjects: VantaProject[] = [];
const mockAssets: VantaAsset[] = [];
const mockTranscripts: VantaTranscript[] = [];
const mockRuns: VantaAgentRun[] = [];
const mockMemory: VantaMemoryRow[] = [];
let mockScenes: VantaScene[] = [];
let mockClips: VantaClip[] = [];
let mockHooks: VantaHook[] = [];
let mockEditPlans: VantaEditPlan[] = [];
let mockCaptions: VantaCaption[] = [];
let mockThumbnails: VantaThumbnail[] = [];
let mockColorGrades: VantaColorGrade[] = [];
const mockScores: VantaScore[] = [];
let mockExports: VantaExport[] = [];

function uuid(prefix: string): string {
  try { return crypto.randomUUID(); } catch { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
}
const nowIso = () => new Date().toISOString();

// Cap + strip control chars on user-provided text. (No outbound risk here — Vanta stores
// plans — but inputs still get bounded.)
function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return t || null;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getVantaProjects(limit = 200): Promise<VantaProject[]> {
  const client = db();
  if (!client) return [...mockProjects];
  try {
    const { data, error } = await client.from("vanta_projects").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error || !data) return [...mockProjects];
    return data as VantaProject[];
  } catch { return [...mockProjects]; }
}

export async function getVantaProject(id: string): Promise<VantaProject | null> {
  const client = db();
  if (!client) return mockProjects.find((p) => p.id === id) ?? null;
  try {
    const { data, error } = await client.from("vanta_projects").select("*").eq("id", id).maybeSingle();
    if (error) return mockProjects.find((p) => p.id === id) ?? null;
    return (data as VantaProject) ?? null;
  } catch { return mockProjects.find((p) => p.id === id) ?? null; }
}

export async function createVantaProject(input: VantaProjectInput, createdBy: string | null): Promise<VantaProject | null> {
  const title = clean(input.title, 160);
  if (!title) return null;
  const industry = (VANTA_INDUSTRIES as readonly string[]).includes(input.industry ?? "") ? (input.industry as VantaIndustry) : "roofing";
  const objective = (VANTA_OBJECTIVES as readonly string[]).includes(input.objective ?? "") ? (input.objective as VantaObjective) : "lead_generation";
  const row: VantaProject = {
    id: uuid("vproj"),
    client_id: clean(input.client_id, 120),
    title,
    description: clean(input.description, 600),
    industry, objective,
    status: "intake",
    brand_kit: {}, strategy: {}, metadata: {},
    created_by: createdBy,
    created_at: nowIso(), updated_at: nowIso(),
  };
  const client = db();
  if (!client) { mockProjects.unshift(row); return row; }
  try {
    const { data, error } = await client.from("vanta_projects").insert(row).select("*").single();
    if (error || !data) { mockProjects.unshift(row); return row; }
    return data as VantaProject;
  } catch { mockProjects.unshift(row); return row; }
}

export async function updateVantaProject(id: string, patch: Partial<VantaProject>): Promise<VantaProject | null> {
  const next = { ...patch, updated_at: nowIso() };
  const client = db();
  if (!client) {
    const i = mockProjects.findIndex((p) => p.id === id);
    if (i < 0) return null;
    mockProjects[i] = { ...mockProjects[i], ...next } as VantaProject;
    return mockProjects[i];
  }
  try {
    const { data, error } = await client.from("vanta_projects").update(next).eq("id", id).select("*").single();
    if (error || !data) return null;
    return data as VantaProject;
  } catch { return null; }
}

// ── Assets + transcripts ─────────────────────────────────────────────────────

export async function getVantaAssets(projectId?: string): Promise<VantaAsset[]> {
  const client = db();
  const fromMock = () => mockAssets.filter((a) => !projectId || a.project_id === projectId);
  if (!client) return fromMock();
  try {
    let q = client.from("vanta_assets").select("*").order("created_at", { ascending: false }).limit(500);
    if (projectId) q = q.eq("project_id", projectId);
    const { data, error } = await q;
    if (error || !data) return fromMock();
    return data as VantaAsset[];
  } catch { return fromMock(); }
}

export async function getVantaAsset(id: string): Promise<VantaAsset | null> {
  const client = db();
  if (!client) return mockAssets.find((a) => a.id === id) ?? null;
  try {
    const { data, error } = await client.from("vanta_assets").select("*").eq("id", id).maybeSingle();
    if (error) return mockAssets.find((a) => a.id === id) ?? null;
    return (data as VantaAsset) ?? null;
  } catch { return mockAssets.find((a) => a.id === id) ?? null; }
}

/** Register an asset (metadata + optional manual transcript). http(s) source URLs only. */
export async function registerVantaAsset(input: VantaAssetInput, createdBy: string | null): Promise<{ asset: VantaAsset; transcript: VantaTranscript | null } | null> {
  const fileName = clean(input.file_name, 200);
  if (!fileName || !input.project_id) return null;
  const sourceUrl = clean(input.source_url, 500);
  const safeUrl = sourceUrl && /^https?:\/\//i.test(sourceUrl) ? sourceUrl : null;

  const asset: VantaAsset = {
    id: uuid("vasset"),
    project_id: input.project_id,
    asset_kind: (VANTA_ASSET_KINDS as readonly string[]).includes(input.asset_kind ?? "")
      ? (input.asset_kind as VantaAssetKind) : "footage",
    file_name: fileName,
    storage_bucket: null, storage_path: null,
    source_url: safeUrl,
    mime_type: null, size_bytes: null,
    duration_ms: typeof input.duration_ms === "number" && input.duration_ms > 0 ? Math.min(input.duration_ms, 6 * 3600_000) : null,
    width: null, height: null, fps: null, codec: null,
    probe: {}, audio_analysis: {}, license: {},
    status: "registered",
    created_by: createdBy,
    created_at: nowIso(), updated_at: nowIso(),
  };

  let transcript: VantaTranscript | null = null;
  const text = typeof input.transcript_text === "string" ? input.transcript_text.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 100_000) : "";
  if (text) {
    transcript = {
      id: uuid("vtx"),
      asset_id: asset.id,
      language: "en", source: "manual",
      full_text: text,
      segments: [],
      word_count: text.split(/\s+/).length,
      filler_word_count: (text.match(/\b(um|uh|like|you know)\b/gi) ?? []).length,
      storage_path: null,
      created_at: nowIso(), updated_at: nowIso(),
    };
  }

  const client = db();
  if (!client) {
    mockAssets.unshift(asset);
    if (transcript) mockTranscripts.unshift(transcript);
    return { asset, transcript };
  }
  try {
    const { data, error } = await client.from("vanta_assets").insert(asset).select("*").single();
    const saved = (error || !data ? asset : (data as VantaAsset));
    if (error) mockAssets.unshift(asset);
    if (transcript) {
      transcript.asset_id = saved.id;
      const { error: te } = await client.from("vanta_transcripts").insert(transcript);
      if (te) mockTranscripts.unshift(transcript);
    }
    return { asset: saved, transcript };
  } catch {
    mockAssets.unshift(asset);
    if (transcript) mockTranscripts.unshift(transcript);
    return { asset, transcript };
  }
}

export async function getVantaTranscript(assetId: string): Promise<VantaTranscript | null> {
  const client = db();
  if (!client) return mockTranscripts.find((t) => t.asset_id === assetId) ?? null;
  try {
    const { data, error } = await client.from("vanta_transcripts").select("*").eq("asset_id", assetId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return mockTranscripts.find((t) => t.asset_id === assetId) ?? null;
    return (data as VantaTranscript) ?? null;
  } catch { return mockTranscripts.find((t) => t.asset_id === assetId) ?? null; }
}

/** Patch media metadata on an asset (probe results). Vanta tables only. */
export async function updateVantaAssetMedia(id: string, patch: Partial<Pick<VantaAsset, "duration_ms" | "width" | "height" | "fps" | "codec" | "mime_type" | "size_bytes" | "probe" | "audio_analysis" | "status">>): Promise<VantaAsset | null> {
  const next = { ...patch, updated_at: nowIso() };
  const apply = () => {
    const i = mockAssets.findIndex((a) => a.id === id);
    if (i < 0) return null;
    mockAssets[i] = { ...mockAssets[i], ...next } as VantaAsset;
    return mockAssets[i];
  };
  const client = db();
  if (!client) return apply();
  try {
    const { data, error } = await client.from("vanta_assets").update(next).eq("id", id).select("*").single();
    if (error || !data) return apply();
    return data as VantaAsset;
  } catch { return apply(); }
}

/** Patch a transcript (V1.3 — derived/whisper segments land here). Vanta tables only. */
export async function updateVantaTranscript(id: string, patch: Partial<Pick<VantaTranscript, "segments" | "full_text" | "word_count" | "source" | "language">>): Promise<VantaTranscript | null> {
  const next = { ...patch, updated_at: nowIso() };
  const apply = () => {
    const i = mockTranscripts.findIndex((t) => t.id === id);
    if (i < 0) return null;
    mockTranscripts[i] = { ...mockTranscripts[i], ...next } as VantaTranscript;
    return mockTranscripts[i];
  };
  const client = db();
  if (!client) return apply();
  try {
    const { data, error } = await client.from("vanta_transcripts").update(next).eq("id", id).select("*").single();
    if (error || !data) return apply();
    return data as VantaTranscript;
  } catch { return apply(); }
}

/** Create a transcript row (V1.3 — whisper output). Mock-safe. */
export async function createVantaTranscript(input: { asset_id: string; source: VantaTranscript["source"]; full_text: string; segments: VantaTranscriptSegment[]; language?: string }): Promise<VantaTranscript> {
  const row: VantaTranscript = {
    id: uuid("vtx"),
    asset_id: input.asset_id,
    language: input.language ?? "en",
    source: input.source,
    full_text: input.full_text.slice(0, 100_000),
    segments: input.segments.slice(0, 400),
    word_count: input.full_text.split(/\s+/).length,
    filler_word_count: (input.full_text.match(/\b(um|uh|like|you know)\b/gi) ?? []).length,
    storage_path: null,
    created_at: nowIso(), updated_at: nowIso(),
  };
  const client = db();
  if (!client) { mockTranscripts.unshift(row); return row; }
  try {
    const { data, error } = await client.from("vanta_transcripts").insert(row).select("*").single();
    if (error || !data) { mockTranscripts.unshift(row); return row; }
    return data as VantaTranscript;
  } catch { mockTranscripts.unshift(row); return row; }
}

// ── Scenes / clips / hooks (V1.3 — footage intelligence artifacts) ──────────
// Replace semantics: regeneration is idempotent — delete this asset's rows, insert the
// new set. Scoped strictly to vanta_* tables for the one asset.

export async function getVantaScenes(assetId: string): Promise<VantaScene[]> {
  const fromMock = () => mockScenes.filter((s) => s.asset_id === assetId).sort((a, b) => a.scene_index - b.scene_index);
  const client = db();
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from("vanta_scenes").select("*").eq("asset_id", assetId).order("scene_index").limit(200);
    if (error || !data) return fromMock();
    return data as VantaScene[];
  } catch { return fromMock(); }
}

export async function replaceVantaScenes(assetId: string, drafts: Omit<VantaScene, "id" | "created_at">[]): Promise<VantaScene[]> {
  // asset_id forced to the delete target — replace semantics stay self-contained.
  const rows: VantaScene[] = drafts.map((d) => ({ ...d, asset_id: assetId, id: uuid("vscene"), created_at: nowIso() }));
  const applyMock = () => { mockScenes = [...mockScenes.filter((s) => s.asset_id !== assetId), ...rows]; return rows; };
  const client = db();
  if (!client) return applyMock();
  try {
    await client.from("vanta_scenes").delete().eq("asset_id", assetId);
    const { data, error } = await client.from("vanta_scenes").insert(rows).select("*");
    if (error || !data) return applyMock();
    return data as VantaScene[];
  } catch { return applyMock(); }
}

export async function getVantaClips(assetId: string): Promise<VantaClip[]> {
  const fromMock = () => mockClips.filter((c) => c.asset_id === assetId).sort((a, b) => a.start_ms - b.start_ms);
  const client = db();
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from("vanta_clips").select("*").eq("asset_id", assetId).order("start_ms").limit(200);
    if (error || !data) return fromMock();
    return data as VantaClip[];
  } catch { return fromMock(); }
}

export async function replaceVantaClips(
  projectId: string | null,
  assetId: string,
  drafts: Array<Pick<VantaClip, "start_ms" | "end_ms" | "clip_score" | "is_hook" | "is_highlight" | "is_dead_space" | "is_emotional" | "energy" | "transcript_excerpt" | "score_reasons" | "flags">>,
): Promise<VantaClip[]> {
  const rows: VantaClip[] = drafts.map((d) => ({
    ...d, id: uuid("vclip"), project_id: projectId, asset_id: assetId, scene_id: null, created_at: nowIso(),
  }));
  const applyMock = () => { mockClips = [...mockClips.filter((c) => c.asset_id !== assetId), ...rows]; return rows; };
  const client = db();
  if (!client) return applyMock();
  try {
    await client.from("vanta_clips").delete().eq("asset_id", assetId);
    const { data, error } = await client.from("vanta_clips").insert(rows).select("*");
    if (error || !data) return applyMock();
    return data as VantaClip[];
  } catch { return applyMock(); }
}

export async function getVantaHooksByAsset(assetId: string): Promise<VantaHook[]> {
  const fromMock = () => mockHooks.filter((h) => h.asset_id === assetId).sort((a, b) => b.three_sec_score - a.three_sec_score);
  const client = db();
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from("vanta_hooks").select("*").eq("asset_id", assetId).order("three_sec_score", { ascending: false }).limit(50);
    if (error || !data) return fromMock();
    return data as VantaHook[];
  } catch { return fromMock(); }
}

export async function replaceVantaHooks(
  projectId: string | null,
  assetId: string,
  drafts: Array<Pick<VantaHook, "hook_text" | "hook_type" | "three_sec_score" | "rationale">>,
): Promise<VantaHook[]> {
  const rows: VantaHook[] = drafts.map((d) => ({
    ...d, id: uuid("vhook"), project_id: projectId, asset_id: assetId, clip_id: null, created_at: nowIso(),
  }));
  const applyMock = () => { mockHooks = [...mockHooks.filter((h) => h.asset_id !== assetId), ...rows]; return rows; };
  const client = db();
  if (!client) return applyMock();
  try {
    await client.from("vanta_hooks").delete().eq("asset_id", assetId);
    const { data, error } = await client.from("vanta_hooks").insert(rows).select("*");
    if (error || !data) return applyMock();
    return data as VantaHook[];
  } catch { return applyMock(); }
}

// ── Creative package artifacts (V1.6 — edit plan, captions, thumbnails, color,
//    scores, exports). Replace-per-asset semantics; Vanta tables only. ─────────

export async function getLatestEditPlan(assetId: string): Promise<VantaEditPlan | null> {
  const fromMock = () => mockEditPlans.find((p) => p.asset_id === assetId) ?? null;
  const client = db();
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from("vanta_edit_plans").select("*").eq("asset_id", assetId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return fromMock();
    return (data as VantaEditPlan) ?? fromMock();
  } catch { return fromMock(); }
}

/** Replace this asset's DRAFT edit plans with one new draft. Exports referencing the
 *  retired drafts are deleted FIRST (vanta_exports.edit_plan_id FK would otherwise
 *  block the plan delete and leave duplicate drafts). */
export async function replaceVantaEditPlan(
  assetId: string,
  draft: Omit<VantaEditPlan, "id" | "created_at" | "updated_at">,
): Promise<{ plan: VantaEditPlan; removedPlanIds: string[] }> {
  const plan: VantaEditPlan = { ...draft, asset_id: assetId, id: uuid("vplan"), created_at: nowIso(), updated_at: nowIso() };
  const applyMock = () => {
    const removed = mockEditPlans.filter((p) => p.asset_id === assetId && p.status === "draft").map((p) => p.id);
    mockExports = mockExports.filter((e) => !e.edit_plan_id || !removed.includes(e.edit_plan_id));
    mockEditPlans = [plan, ...mockEditPlans.filter((p) => !(p.asset_id === assetId && p.status === "draft"))];
    return { plan, removedPlanIds: removed };
  };
  const client = db();
  if (!client) return applyMock();
  try {
    const { data: old } = await client.from("vanta_edit_plans").select("id").eq("asset_id", assetId).eq("status", "draft");
    const removedPlanIds: string[] = Array.isArray(old) ? old.map((r: { id: string }) => r.id) : [];
    if (removedPlanIds.length > 0) {
      await client.from("vanta_exports").delete().in("edit_plan_id", removedPlanIds); // FK order: exports first
    }
    await client.from("vanta_edit_plans").delete().eq("asset_id", assetId).eq("status", "draft");
    const { data, error } = await client.from("vanta_edit_plans").insert(plan).select("*").single();
    if (error || !data) return applyMock();
    return { plan: data as VantaEditPlan, removedPlanIds };
  } catch { return applyMock(); }
}

export async function replaceVantaCaptions(
  projectId: string | null,
  assetId: string,
  drafts: Array<Omit<VantaCaption, "id" | "project_id" | "asset_id" | "created_at">>,
): Promise<VantaCaption[]> {
  const rows: VantaCaption[] = drafts.map((d) => ({ ...d, id: uuid("vcap"), project_id: projectId, asset_id: assetId, created_at: nowIso() }));
  const applyMock = () => { mockCaptions = [...rows, ...mockCaptions.filter((c) => c.asset_id !== assetId)]; return rows; };
  const client = db();
  if (!client) return applyMock();
  try {
    await client.from("vanta_captions").delete().eq("asset_id", assetId);
    const { data, error } = await client.from("vanta_captions").insert(rows).select("*");
    if (error || !data) return applyMock();
    return data as VantaCaption[];
  } catch { return applyMock(); }
}

export async function replaceVantaThumbnails(
  projectId: string | null,
  assetId: string,
  drafts: Array<Omit<VantaThumbnail, "id" | "project_id" | "asset_id" | "created_at">>,
): Promise<VantaThumbnail[]> {
  const rows: VantaThumbnail[] = drafts.map((d) => ({ ...d, id: uuid("vthumb"), project_id: projectId, asset_id: assetId, created_at: nowIso() }));
  const applyMock = () => { mockThumbnails = [...rows, ...mockThumbnails.filter((t) => t.asset_id !== assetId)]; return rows; };
  const client = db();
  if (!client) return applyMock();
  try {
    await client.from("vanta_thumbnails").delete().eq("asset_id", assetId);
    const { data, error } = await client.from("vanta_thumbnails").insert(rows).select("*");
    if (error || !data) return applyMock();
    return data as VantaThumbnail[];
  } catch { return applyMock(); }
}

export async function replaceVantaColorGrade(
  projectId: string | null,
  assetId: string,
  draft: Omit<VantaColorGrade, "id" | "project_id" | "asset_id" | "created_at">,
): Promise<VantaColorGrade> {
  const row: VantaColorGrade = { ...draft, id: uuid("vgrade"), project_id: projectId, asset_id: assetId, created_at: nowIso() };
  const applyMock = () => { mockColorGrades = [row, ...mockColorGrades.filter((g) => g.asset_id !== assetId)]; return row; };
  const client = db();
  if (!client) return applyMock();
  try {
    await client.from("vanta_color_grades").delete().eq("asset_id", assetId);
    const { data, error } = await client.from("vanta_color_grades").insert(row).select("*").single();
    if (error || !data) return applyMock();
    return data as VantaColorGrade;
  } catch { return applyMock(); }
}

/** Append score events (event log — bounded by the caller per materialization). */
export async function appendVantaScores(events: Array<Omit<VantaScore, "id" | "created_at">>): Promise<VantaScore[]> {
  const rows: VantaScore[] = events.slice(0, 40).map((e) => ({ ...e, id: uuid("vscore"), created_at: nowIso() }));
  const applyMock = () => { mockScores.unshift(...rows); return rows; };
  const client = db();
  if (!client) return applyMock();
  try {
    const { data, error } = await client.from("vanta_scores").insert(rows).select("*");
    if (error || !data) return applyMock();
    return data as VantaScore[];
  } catch { return applyMock(); }
}

/** Retire exports tied to replaced edit plans, then create the new internal-review row. */
export async function replaceVantaExport(
  projectId: string | null,
  removedPlanIds: string[],
  draft: Omit<VantaExport, "id" | "project_id" | "created_at" | "updated_at">,
): Promise<VantaExport> {
  const row: VantaExport = { ...draft, id: uuid("vexp"), project_id: projectId, created_at: nowIso(), updated_at: nowIso() };
  const applyMock = () => {
    mockExports = [row, ...mockExports.filter((e) => !e.edit_plan_id || !removedPlanIds.includes(e.edit_plan_id))];
    return row;
  };
  const client = db();
  if (!client) return applyMock();
  try {
    if (removedPlanIds.length > 0) await client.from("vanta_exports").delete().in("edit_plan_id", removedPlanIds);
    const { data, error } = await client.from("vanta_exports").insert(row).select("*").single();
    if (error || !data) return applyMock();
    return data as VantaExport;
  } catch { return applyMock(); }
}

/** Compact per-asset package status for the workbench. */
export interface VantaPackageSummary {
  edit_plan: Pick<VantaEditPlan, "id" | "title" | "format" | "target_duration_s" | "status" | "updated_at"> | null;
  caption_formats: string[];
  thumbnail_count: number;
  color_preset: string | null;
  export: Pick<VantaExport, "id" | "target" | "status"> | null;
  quality_score: number | null;
}

export async function getCreativePackageSummary(assetId: string): Promise<VantaPackageSummary> {
  const plan = await getLatestEditPlan(assetId);
  const client = db();
  const summary: VantaPackageSummary = {
    edit_plan: plan ? { id: plan.id, title: plan.title, format: plan.format, target_duration_s: plan.target_duration_s, status: plan.status, updated_at: plan.updated_at } : null,
    caption_formats: [], thumbnail_count: 0, color_preset: null, export: null, quality_score: null,
  };
  const fromMock = () => {
    summary.caption_formats = mockCaptions.filter((c) => c.asset_id === assetId).map((c) => c.format);
    summary.thumbnail_count = mockThumbnails.filter((t) => t.asset_id === assetId).length;
    summary.color_preset = mockColorGrades.find((g) => g.asset_id === assetId)?.preset_key ?? null;
    const exp = plan ? mockExports.find((e) => e.edit_plan_id === plan.id) : null;
    summary.export = exp ? { id: exp.id, target: exp.target, status: exp.status } : null;
    const q = plan ? mockScores.find((s) => s.entity_type === "edit_plan" && s.entity_id === plan.id && s.score_kind === "quality") : null;
    summary.quality_score = q?.score ?? null;
    return summary;
  };
  if (!client) return fromMock();
  try {
    const [caps, thumbs, grade, exp, q] = await Promise.all([
      client.from("vanta_captions").select("format").eq("asset_id", assetId).limit(10),
      client.from("vanta_thumbnails").select("id").eq("asset_id", assetId).limit(20),
      client.from("vanta_color_grades").select("preset_key").eq("asset_id", assetId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      plan ? client.from("vanta_exports").select("id,target,status").eq("edit_plan_id", plan.id).order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
      plan ? client.from("vanta_scores").select("score").eq("entity_type", "edit_plan").eq("entity_id", plan.id).eq("score_kind", "quality").order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    if (caps.error || thumbs.error) return fromMock();
    summary.caption_formats = (caps.data ?? []).map((c: { format: string }) => c.format);
    summary.thumbnail_count = (thumbs.data ?? []).length;
    summary.color_preset = (grade.data as { preset_key?: string } | null)?.preset_key ?? null;
    summary.export = (exp.data as VantaPackageSummary["export"]) ?? null;
    summary.quality_score = (q.data as { score?: number } | null)?.score ?? null;
    return summary;
  } catch { return fromMock(); }
}

// ── Agent runs (queue + audit) ───────────────────────────────────────────────

export async function getVantaRuns(projectId?: string, limit = 100): Promise<VantaAgentRun[]> {
  const client = db();
  const fromMock = () => mockRuns.filter((r) => !projectId || r.project_id === projectId).slice(0, limit);
  if (!client) return fromMock();
  try {
    let q = client.from("vanta_agent_runs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (projectId) q = q.eq("project_id", projectId);
    const { data, error } = await q;
    if (error || !data) return fromMock();
    return data as VantaAgentRun[];
  } catch { return fromMock(); }
}

export async function getVantaRun(id: string): Promise<VantaAgentRun | null> {
  const client = db();
  const fromMock = () => mockRuns.find((r) => r.id === id) ?? null;
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from("vanta_agent_runs").select("*").eq("id", id).maybeSingle();
    if (error) return fromMock();
    return (data as VantaAgentRun) ?? fromMock();
  } catch { return fromMock(); }
}

/** Insert a new (queued) run row. Mock-safe. */
export async function createVantaRun(input: Pick<VantaAgentRun, "project_id" | "asset_id" | "agent" | "job_type" | "params" | "params_hash">): Promise<VantaAgentRun> {
  const now = nowIso();
  const run: VantaAgentRun = {
    id: uuid("vrun"),
    project_id: input.project_id,
    asset_id: input.asset_id,
    agent: input.agent,
    job_type: input.job_type,
    status: "queued",
    params: input.params,
    params_hash: input.params_hash,
    result: {},
    error: null,
    claimed_by: null,
    started_at: null, finished_at: null,
    created_at: now, updated_at: now,
  };
  const client = db();
  if (!client) { mockRuns.unshift(run); return run; }
  try {
    const { data, error } = await client.from("vanta_agent_runs").insert(run).select("*").single();
    if (error || !data) {
      // Unique-index race (uq_vanta_runs_dedupe): a concurrent enqueue won — return the
      // persisted active row instead of a phantom in-memory one.
      if (input.params_hash && input.asset_id) {
        const existing = await findActiveVantaRun(input.asset_id, input.job_type, input.params_hash);
        if (existing) return existing;
      }
      mockRuns.unshift(run); return run;
    }
    return data as VantaAgentRun;
  } catch { mockRuns.unshift(run); return run; }
}

/** Active (queued/claimed/running) run for (asset, job_type, params_hash) — idempotency probe. */
export async function findActiveVantaRun(assetId: string, jobType: string, paramsHash: string): Promise<VantaAgentRun | null> {
  const fromMock = () => mockRuns.find((r) =>
    r.asset_id === assetId && r.job_type === jobType && r.params_hash === paramsHash &&
    (r.status === "queued" || r.status === "claimed" || r.status === "running")) ?? null;
  const client = db();
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from("vanta_agent_runs").select("*")
      .eq("asset_id", assetId).eq("job_type", jobType).eq("params_hash", paramsHash)
      .in("status", ["queued", "claimed", "running"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return fromMock();
    return (data as VantaAgentRun) ?? fromMock();
  } catch { return fromMock(); }
}

/** Compare-and-set claim: queued → claimed. Returns null when the job was not claimable. */
export async function claimVantaRun(id: string, claimedBy: string): Promise<VantaAgentRun | null> {
  const now = nowIso();
  const fromMock = () => {
    const i = mockRuns.findIndex((r) => r.id === id);
    if (i < 0 || mockRuns[i].status !== "queued") return null;
    mockRuns[i] = { ...mockRuns[i], status: "claimed", claimed_by: claimedBy, updated_at: now };
    return mockRuns[i];
  };
  const client = db();
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from("vanta_agent_runs")
      .update({ status: "claimed", claimed_by: claimedBy, updated_at: now })
      .eq("id", id).eq("status", "queued")
      .select("*").maybeSingle();
    if (error) return fromMock();
    return (data as VantaAgentRun) ?? fromMock();
  } catch { return fromMock(); }
}

/** Next queued runs of the given types, oldest first (claim candidates), optionally
 *  scoped to one project (fixture workers stay inside throwaway projects). Same-timestamp
 *  ties (one enqueueAssetPipeline burst) break on pipeline order: probe before the rest. */
export async function listQueuedRuns(jobTypes: string[], limit = 5, projectId?: string | null): Promise<VantaAgentRun[]> {
  const pipelineRank = (t: string) => { const i = (VANTA_ASSET_PIPELINE_ORDER as readonly string[]).indexOf(t); return i < 0 ? 99 : i; };
  const fromMock = () => mockRuns
    .filter((r) => r.status === "queued" && jobTypes.includes(r.job_type) && (!projectId || r.project_id === projectId))
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || pipelineRank(a.job_type) - pipelineRank(b.job_type))
    .slice(0, limit);
  const client = db();
  if (!client) return fromMock();
  try {
    let q = client.from("vanta_agent_runs").select("*")
      .eq("status", "queued").in("job_type", jobTypes)
      .order("created_at", { ascending: true }).limit(limit);
    if (projectId) q = q.eq("project_id", projectId);
    const { data, error } = await q;
    if (error || !data) return fromMock();
    return data as VantaAgentRun[];
  } catch { return fromMock(); }
}

/** Heartbeat from the claim owner: claimed → running (sets started_at), running → touch
 *  updated_at. CAS on (id, claimed_by, active status) — wrong owner/state returns null. */
export async function heartbeatVantaRun(id: string, claimedBy: string): Promise<VantaAgentRun | null> {
  const now = nowIso();
  const fromMock = () => {
    const i = mockRuns.findIndex((r) => r.id === id);
    if (i < 0) return null;
    const r = mockRuns[i];
    if (r.claimed_by !== claimedBy || (r.status !== "claimed" && r.status !== "running")) return null;
    mockRuns[i] = { ...r, status: "running", started_at: r.started_at ?? now, updated_at: now };
    return mockRuns[i];
  };
  const client = db();
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from("vanta_agent_runs")
      .update({ status: "running", updated_at: now })
      .eq("id", id).eq("claimed_by", claimedBy).in("status", ["claimed", "running"])
      .select("*").maybeSingle();
    if (error) return fromMock();
    if (!data) return fromMock();
    const run = data as VantaAgentRun;
    if (!run.started_at) {
      // Same CAS guards as the primary update — a concurrent finish must not get
      // started_at patched after reaching a terminal state.
      const { data: d2 } = await client.from("vanta_agent_runs").update({ started_at: now })
        .eq("id", id).eq("claimed_by", claimedBy).in("status", ["claimed", "running"])
        .select("*").maybeSingle();
      return (d2 as VantaAgentRun) ?? run;
    }
    return run;
  } catch { return fromMock(); }
}

/** Finish (succeed/fail) guarded by claim ownership — only the claimer may finalize. */
export async function finishVantaRun(
  id: string,
  claimedBy: string,
  patch: { status: "succeeded" | "failed"; result?: Record<string, unknown>; error?: string | null },
): Promise<VantaAgentRun | null> {
  const now = nowIso();
  const next = { status: patch.status, result: patch.result ?? {}, error: patch.error ?? null, finished_at: now, updated_at: now };
  const fromMock = () => {
    const i = mockRuns.findIndex((r) => r.id === id);
    if (i < 0) return null;
    const r = mockRuns[i];
    if (r.claimed_by !== claimedBy || (r.status !== "claimed" && r.status !== "running")) return null;
    mockRuns[i] = { ...r, ...next };
    return mockRuns[i];
  };
  const client = db();
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from("vanta_agent_runs")
      .update(next)
      .eq("id", id).eq("claimed_by", claimedBy).in("status", ["claimed", "running"])
      .select("*").maybeSingle();
    if (error) return fromMock();
    return (data as VantaAgentRun) ?? fromMock();
  } catch { return fromMock(); }
}

/** Status/result patch for a run (running/succeeded/failed transitions). Mock-safe. */
export async function patchVantaRun(id: string, patch: Partial<Pick<VantaAgentRun, "status" | "result" | "error" | "started_at" | "finished_at">>): Promise<VantaAgentRun | null> {
  const next = { ...patch, updated_at: nowIso() };
  const fromMock = () => {
    const i = mockRuns.findIndex((r) => r.id === id);
    if (i < 0) return null;
    mockRuns[i] = { ...mockRuns[i], ...next } as VantaAgentRun;
    return mockRuns[i];
  };
  const client = db();
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from("vanta_agent_runs").update(next).eq("id", id).select("*").maybeSingle();
    if (error || !data) return fromMock();
    return data as VantaAgentRun;
  } catch { return fromMock(); }
}

/** Persist a completed intelligence-plane analysis as a succeeded run + project update. */
export async function persistVantaAnalysis(
  project: VantaProject,
  assetId: string,
  analysis: VantaAnalysis,
  actor: string | null,
): Promise<VantaAgentRun> {
  const now = nowIso();
  const run: VantaAgentRun = {
    id: uuid("vrun"),
    project_id: project.id,
    asset_id: assetId,
    agent: "vanta_composite",
    job_type: "analyze",
    status: "succeeded",
    params: { format: analysis.edit_plan.format, mock: analysis.mock },
    params_hash: null,
    result: analysis as unknown as Record<string, unknown>,
    error: null,
    claimed_by: actor ?? "app",
    started_at: now, finished_at: now,
    created_at: now, updated_at: now,
  };
  const client = db();
  if (!client) {
    mockRuns.unshift(run);
  } else {
    try {
      const { error } = await client.from("vanta_agent_runs").insert(run);
      if (error) mockRuns.unshift(run);
    } catch { mockRuns.unshift(run); }
  }
  await updateVantaProject(project.id, { strategy: analysis.strategy, status: "review" });
  return run;
}

/** Latest succeeded analysis for an asset (what the workbench renders). */
export async function getLatestAnalysis(assetId: string): Promise<VantaAnalysis | null> {
  const client = db();
  const fromMock = () => {
    const r = mockRuns.find((x) => x.asset_id === assetId && x.job_type === "analyze" && x.status === "succeeded");
    return r ? (r.result as unknown as VantaAnalysis) : null;
  };
  if (!client) return fromMock();
  try {
    const { data, error } = await client.from("vanta_agent_runs").select("*")
      .eq("asset_id", assetId).eq("job_type", "analyze").eq("status", "succeeded")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !data) return fromMock();
    return ((data as VantaAgentRun).result as unknown as VantaAnalysis) ?? null;
  } catch { return fromMock(); }
}

// ── Memory ────────────────────────────────────────────────────────────────────

export async function getVantaMemory(industry?: string, limit = 100): Promise<VantaMemoryRow[]> {
  const client = db();
  const fromMock = () => mockMemory.filter((m) => m.active && (!industry || m.industry === industry)).slice(0, limit);
  if (!client) return fromMock();
  try {
    let q = client.from("vanta_memory").select("*").eq("active", true).order("confidence", { ascending: false }).limit(limit);
    if (industry) q = q.eq("industry", industry);
    const { data, error } = await q;
    if (error || !data) return fromMock();
    return data as VantaMemoryRow[];
  } catch { return fromMock(); }
}

/** Top winning patterns to bias new analyses (fed into the prompt). */
export async function getMemoryWinners(industry: string, limit = 8): Promise<string[]> {
  const rows = await getVantaMemory(industry, limit);
  return rows.map((m) => `[${m.memory_kind}] ${m.pattern}`).slice(0, limit);
}
