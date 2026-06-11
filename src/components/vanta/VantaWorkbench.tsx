"use client";

// VANTA — project workbench (V1): register footage, run the creative analysis, review
// the full package (strategy, clip scoreboard, hooks, color, edit plan + cue sheet,
// captions, thumbnails, sound design, QA). Native Vault Core design.
//
// Read/plan only — the analysis is persisted as a vanta_agent_runs row; nothing is
// rendered, published, launched, or sent anywhere from this surface.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Clapperboard, ArrowLeft, Plus, Lock, Loader2, Sparkles, Film, Palette, Scissors,
  Music4, Type, ImageIcon, ShieldCheck, Gauge, Lightbulb, FileText, Cpu, Play,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { VCPageWrapper, VCPanel, VCPanelHeader, VCStatusBadge, VCChip, VCEmptyState, VCSkeleton, VCButton } from "@/components/ui/VaultUI";
import type {
  VantaProject, VantaAsset, VantaAnalysis, VantaFormat, VantaAgentRun, VantaMediaCapabilities,
  VantaScene, VantaClip, VantaHook, VantaTranscriptSegment,
} from "@/lib/vanta/types";
import { VANTA_FORMATS, VANTA_JOB_TYPES } from "@/lib/vanta/types";

const ORANGE = "#ff8400";

function titleCase(s: string) { return s.replace(/_/g, " "); }
function ts(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function scoreColor(n: number) { return n >= 80 ? "#22c55e" : n >= 60 ? "#f59e0b" : "#ef4444"; }

interface DetailPayload {
  project: VantaProject;
  assets: VantaAsset[];
  analyses: Record<string, VantaAnalysis>;
  transcripts: Record<string, { word_count: number; source: string; segment_count?: number; segments?: VantaTranscriptSegment[] } | null>;
  scenes?: Record<string, VantaScene[]>;
  clips?: Record<string, VantaClip[]>;
  hooks?: Record<string, VantaHook[]>;
}

interface JobsPayload {
  jobs: VantaAgentRun[];
  counts: { queued: number; claimed: number; running: number; succeeded: number; failed: number; stale?: number };
  staleJobIds?: string[];
  capabilities: VantaMediaCapabilities;
  mockMode: boolean;
}

const JOB_STATUS_COLOR: Record<string, string> = {
  queued: "#6b7a99", claimed: "#f59e0b", running: "#0081f2", succeeded: "#22c55e", failed: "#ef4444",
};

/** One-line artifact summary for a succeeded processing job's validated result. */
function jobResultSummary(job: VantaAgentRun): string | null {
  if (job.status !== "succeeded") return null;
  const r = job.result as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof r.segment_count === "number") parts.push(`${r.segment_count} segments`);
  if (typeof r.scene_count === "number") parts.push(`${r.scene_count} scenes`);
  if (typeof r.clip_count === "number") parts.push(`${r.clip_count} clips`);
  if (typeof r.hook_count === "number") parts.push(`${r.hook_count} hooks`);
  if (typeof r.width === "number" && typeof r.height === "number") parts.push(`${r.width}×${r.height}`);
  if (typeof r.codec === "string" && r.codec) parts.push(String(r.codec));
  if (Array.isArray(r.outputs) && r.outputs.length) parts.push(`${r.outputs.length} artifact${r.outputs.length > 1 ? "s" : ""}`);
  if (r.planned === true) parts.push("worker plan");
  if (parts.length === 0) return null;
  return `${titleCase(job.job_type)}: ${parts.join(" · ")}${r.mock === true ? " (mock)" : ""}`;
}

export function VantaWorkbench({ projectId }: { projectId: string }) {
  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [acting, setActing] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [format, setFormat] = useState<VantaFormat>("short_916");
  const [assetForm, setAssetForm] = useState({ file_name: "", duration_min: "", transcript_text: "", notes: "" });

  const [jobsData, setJobsData] = useState<JobsPayload | null>(null);
  const [jobActing, setJobActing] = useState<string | null>(null); // asset_id (process) or job id (run)

  const load = useCallback(async () => {
    const res = await fetch(`/api/vanta/projects/${projectId}`).catch(() => null);
    if (!res) { setLoading(false); return; }
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) setForbidden(true);
      if (res.status === 404) setNotFound(true);
      setLoading(false); return;
    }
    const d = await res.json().catch(() => null);
    if (d?.project) setData(d as DetailPayload);
    setLoading(false);
  }, [projectId]);

  const loadJobs = useCallback(async () => {
    const res = await fetch(`/api/vanta/projects/${projectId}/jobs`).catch(() => null);
    if (!res?.ok) return;
    const d = await res.json().catch(() => null);
    if (d?.jobs) setJobsData(d as JobsPayload);
  }, [projectId]);

  useEffect(() => { load(); loadJobs(); }, [load, loadJobs]);

  const processAsset = useCallback(async (assetId: string) => {
    setJobActing(assetId); setNotice(null);
    try {
      const res = await fetch(`/api/vanta/projects/${projectId}/process`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice(d.error ?? "Could not enqueue processing jobs"); return; }
      await loadJobs();
    } finally { setJobActing(null); }
  }, [projectId, loadJobs]);

  const runJob = useCallback(async (jobId: string) => {
    setJobActing(jobId); setNotice(null);
    try {
      const res = await fetch(`/api/vanta/jobs/${jobId}/run`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice(d.error ?? "Job run failed"); }
      await Promise.all([loadJobs(), load()]); // probe results update asset metadata
    } finally { setJobActing(null); }
  }, [loadJobs, load]);

  const registerAsset = useCallback(async () => {
    setActing(true); setNotice(null);
    try {
      const durMin = parseFloat(assetForm.duration_min);
      const res = await fetch("/api/vanta/assets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          file_name: assetForm.file_name,
          duration_ms: Number.isFinite(durMin) && durMin > 0 ? Math.round(durMin * 60_000) : null,
          transcript_text: assetForm.transcript_text || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Could not register asset"); return; }
      setShowAssetForm(false);
      setAssetForm({ file_name: "", duration_min: "", transcript_text: "", notes: "" });
      await Promise.all([load(), loadJobs()]); // registration auto-enqueues the pipeline
    } finally { setActing(false); }
  }, [assetForm, projectId, load, loadJobs]);

  const analyze = useCallback(async (assetId: string) => {
    setAnalyzing(assetId); setNotice(null);
    try {
      const res = await fetch(`/api/vanta/projects/${projectId}/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId, format, notes: assetForm.notes || null }),
      });
      const d = await res.json();
      if (!res.ok) { setNotice(d.error ?? "Analysis failed"); return; }
      setNotice(d.provider === "mock"
        ? "Analysis complete (deterministic mock — add ANTHROPIC_API_KEY for the full Vanta package)."
        : "Vanta creative package generated.");
      setSelectedAssetId(assetId);
      await load();
    } finally { setAnalyzing(null); }
  }, [projectId, format, assetForm.notes, load]);

  if (forbidden) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vanta" title="Workbench" />
        <VCPanel><VCEmptyState icon={Lock} title="Access restricted" description="You don't have access to Vanta." /></VCPanel>
      </VCPageWrapper>
    );
  }
  if (notFound) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vanta" title="Workbench" />
        <VCPanel><VCEmptyState icon={Clapperboard} title="Project not found" description="It may have been archived." /></VCPanel>
      </VCPageWrapper>
    );
  }
  if (loading || !data) {
    return (
      <VCPageWrapper className="!max-w-none">
        <PageHeader sectionLabel="Vanta · Creative Intelligence" title="Workbench" />
        <VCPanel><div className="px-4 py-4"><VCSkeleton rows={4} /></div></VCPanel>
      </VCPageWrapper>
    );
  }

  const { project, assets, analyses, transcripts } = data;
  const selected = selectedAssetId ?? assets.find((a) => analyses[a.id])?.id ?? assets[0]?.id ?? null;
  const analysis = selected ? analyses[selected] ?? null : null;

  return (
    <VCPageWrapper className="!max-w-none">
      <Link href="/vanta/projects" className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "rgba(255,132,0,0.75)" }}>
        <ArrowLeft size={12} /> All projects
      </Link>
      <PageHeader
        sectionLabel={`Vanta · ${titleCase(project.industry)} · ${titleCase(project.objective)}`}
        title={project.title}
        description={project.description ?? undefined}
        badge={<VCStatusBadge label={titleCase(project.status)} variant="orange" dot />}
      />

      {/* Footage / assets */}
      <VCPanel accent="orange">
        <VCPanelHeader icon={Film} iconColor={ORANGE} label="Upload Center" title="Footage & Assets"
          action={<VCButton onClick={() => setShowAssetForm((v) => !v)} disabled={acting}><span className="inline-flex items-center gap-1.5"><Plus size={12} /> Register footage</span></VCButton>} />
        <div className="px-4 py-3 space-y-2.5">
          {showAssetForm && (
            <div className="px-3.5 py-3 rounded-xl space-y-2.5" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input value={assetForm.file_name} onChange={(e) => setAssetForm({ ...assetForm, file_name: e.target.value })} placeholder="File name (e.g. roof-inspection-A012.mp4)"
                  className="px-3 py-2 rounded-lg text-[12.5px] outline-none" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
                <input value={assetForm.duration_min} onChange={(e) => setAssetForm({ ...assetForm, duration_min: e.target.value })} placeholder="Duration (minutes, e.g. 12.5)"
                  className="px-3 py-2 rounded-lg text-[12.5px] outline-none" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
              </div>
              <textarea value={assetForm.transcript_text} onChange={(e) => setAssetForm({ ...assetForm, transcript_text: e.target.value })} rows={4}
                placeholder="Paste the transcript here (optional but strongly recommended — clip and hook timestamps anchor to it). The Vanta Worker will auto-transcribe in Phase 1.2."
                className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none resize-y" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
              <textarea value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} rows={2}
                placeholder="Footage condition notes for the Color agent (e.g. 'shot in S-Log3, slightly underexposed, mixed indoor/outdoor WB')…"
                className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none resize-none" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
              <div className="flex gap-2">
                <VCButton onClick={registerAsset} disabled={acting || !assetForm.file_name.trim()}>
                  {acting ? <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Saving…</span> : "Register"}
                </VCButton>
                <button onClick={() => setShowAssetForm(false)} disabled={acting} className="px-3 py-2 text-[12px] font-semibold disabled:opacity-50" style={{ color: "var(--t-muted)" }}>Cancel</button>
              </div>
            </div>
          )}

          {assets.length === 0 && !showAssetForm && (
            <VCEmptyState icon={Film} title="No footage registered" description="Register the shoot's footage (file name + duration + transcript) and run the creative analysis." />
          )}

          {assets.map((a) => {
            const tx = transcripts[a.id];
            const hasAnalysis = !!analyses[a.id];
            const isSel = selected === a.id;
            return (
              <div key={a.id} className="px-3.5 py-2.5 rounded-xl" style={{ background: isSel ? "rgba(255,132,0,0.05)" : "var(--t-surface-2)", border: `1px solid ${isSel ? "rgba(255,132,0,0.3)" : "var(--t-border-subtle)"}` }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button onClick={() => setSelectedAssetId(a.id)} className="min-w-0 text-left">
                    <p className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}>
                      <Film size={13} style={{ color: ORANGE }} /> {a.file_name}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--t-dim)" }}>
                      {a.duration_ms ? `${Math.round(a.duration_ms / 60000)}m` : "duration unknown"}
                      {" · "}{tx ? `transcript ${tx.word_count} words (${tx.source})` : "no transcript"}
                      {hasAnalysis ? " · analyzed" : ""}
                    </p>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select value={format} onChange={(e) => setFormat(e.target.value as VantaFormat)}
                      className="px-2 py-1.5 rounded-lg text-[11.5px] outline-none" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
                      {VANTA_FORMATS.map((f) => <option key={f} value={f}>{titleCase(f)}</option>)}
                    </select>
                    <VCButton onClick={() => analyze(a.id)} disabled={analyzing !== null}>
                      {analyzing === a.id
                        ? <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Vanta is working…</span>
                        : <span className="inline-flex items-center gap-1.5"><Sparkles size={12} /> {hasAnalysis ? "Re-run analysis" : "Run Vanta analysis"}</span>}
                    </VCButton>
                  </div>
                </div>
              </div>
            );
          })}

          {notice && <p className="text-[11.5px] px-3 py-2 rounded-lg" style={{ background: "rgba(255,132,0,0.08)", border: "1px solid rgba(255,132,0,0.2)", color: ORANGE }}>{notice}</p>}
        </div>
      </VCPanel>

      {/* Processing pipeline (V1.2 — media plane) */}
      {assets.length > 0 && jobsData && (
        <VCPanel>
          <VCPanelHeader icon={Cpu} iconColor={ORANGE} label="Media plane" title="Processing Status"
            action={jobsData.mockMode
              ? <VCStatusBadge label="MOCK MODE" variant="neutral" dot />
              : <VCStatusBadge label="Media tools live" variant="success" dot />} />
          <div className="px-4 py-3 space-y-3">
            {jobsData.mockMode && (
              <p className="text-[11.5px] px-3 py-2 rounded-lg" style={{ background: "rgba(107,122,153,0.08)", border: "1px solid rgba(107,122,153,0.2)", color: "var(--t-muted)" }}>
                MOCK MODE — {jobsData.capabilities.ffmpeg ? "" : "ffmpeg unavailable. "}{jobsData.capabilities.ffprobe ? "" : "ffprobe unavailable. "}
                {jobsData.capabilities.mediaRoot ? "" : "VANTA_MEDIA_ROOT not configured. "}
                Jobs complete with deterministic mock results / worker plans; real media processing runs on a media-capable box or the Vanta Worker.
              </p>
            )}

            {/* Queue summary */}
            <div className="flex flex-wrap gap-1.5">
              {(["queued", "running", "succeeded", "failed"] as const).map((s) => (
                <VCChip key={s} label={`${s}: ${s === "running" ? jobsData.counts.running + jobsData.counts.claimed : jobsData.counts[s]}`} color={JOB_STATUS_COLOR[s]} />
              ))}
              {(jobsData.counts.stale ?? 0) > 0 && <VCChip label={`stale (no heartbeat >10m): ${jobsData.counts.stale}`} color="#ef4444" />}
            </div>

            {/* Per-asset pipeline */}
            {assets.map((a) => {
              const assetJobs = jobsData.jobs.filter((j) => j.asset_id === a.id && (VANTA_JOB_TYPES as readonly string[]).includes(j.job_type));
              const latestByType = new Map<string, VantaAgentRun>();
              for (const j of assetJobs) if (!latestByType.has(j.job_type)) latestByType.set(j.job_type, j); // jobs arrive newest-first
              return (
                <div key={a.id} className="px-3.5 py-2.5 rounded-xl space-y-2" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[12.5px] font-semibold" style={{ color: "var(--t-text)" }}>{a.file_name}</p>
                    {latestByType.size === 0 && (
                      <VCButton onClick={() => processAsset(a.id)} disabled={jobActing !== null}>
                        {jobActing === a.id
                          ? <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Queueing…</span>
                          : <span className="inline-flex items-center gap-1.5"><Cpu size={12} /> Queue processing</span>}
                      </VCButton>
                    )}
                  </div>
                  {/* Probed metadata */}
                  <div className="flex flex-wrap gap-1.5">
                    <VCChip label={a.duration_ms ? `${Math.round(a.duration_ms / 1000)}s` : "duration —"} color="#6b7a99" />
                    <VCChip label={a.width && a.height ? `${a.width}×${a.height}` : "resolution —"} color="#6b7a99" />
                    <VCChip label={a.fps ? `${a.fps} fps` : "fps —"} color="#6b7a99" />
                    <VCChip label={a.codec ?? "codec —"} color="#6b7a99" />
                    <VCChip label={titleCase(a.status)} color={a.status === "probed" ? "#22c55e" : "#6b7a99"} />
                    {(a.probe as { mock?: boolean })?.mock === true && <VCChip label="MOCK metadata" color="#f59e0b" />}
                  </div>
                  {/* Job rail */}
                  {latestByType.size > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {VANTA_JOB_TYPES.map((t) => {
                        const j = latestByType.get(t);
                        if (!j) return <VCChip key={t} label={`${titleCase(t)}: —`} color="#3a4158" />;
                        const isMock = (j.result as { mock?: boolean })?.mock === true;
                        const isWorker = (j.claimed_by ?? "").startsWith("worker:");
                        const isStale = jobsData.staleJobIds?.includes(j.id) ?? false;
                        const suffix = j.status === "succeeded" && isMock ? " (mock)" : isStale ? " (stale)" : isWorker && (j.status === "claimed" || j.status === "running") ? " (worker)" : "";
                        return (
                          <span key={t} className="inline-flex items-center gap-1" title={j.claimed_by ?? undefined}>
                            <VCChip label={`${titleCase(t)}: ${j.status}${suffix}`} color={isStale ? "#ef4444" : JOB_STATUS_COLOR[j.status] ?? "#6b7a99"} />
                            {j.status === "queued" && (
                              <button onClick={() => runJob(j.id)} disabled={jobActing !== null} title={`Run ${t} now`}
                                className="inline-flex items-center justify-center w-5 h-5 rounded disabled:opacity-40"
                                style={{ background: "rgba(255,132,0,0.12)", border: "1px solid rgba(255,132,0,0.24)" }}>
                                {jobActing === j.id ? <Loader2 size={10} className="animate-spin" style={{ color: ORANGE }} /> : <Play size={10} style={{ color: ORANGE }} />}
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {/* Completed artifact summaries */}
                  {(() => {
                    const summaries = [...latestByType.values()].map(jobResultSummary).filter((s): s is string => !!s);
                    return summaries.length > 0
                      ? <p className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>{summaries.join("  ·  ")}</p>
                      : null;
                  })()}
                  {/* Failures */}
                  {[...latestByType.values()].filter((j) => j.status === "failed" && j.error).map((j) => (
                    <p key={j.id} className="text-[11px]" style={{ color: "#ef4444" }}>{titleCase(j.job_type)}: {j.error}</p>
                  ))}
                </div>
              );
            })}
          </div>
        </VCPanel>
      )}

      {/* Footage intelligence (V1.3 — transcript · scenes · clips · hooks, deterministic) */}
      {selected && (() => {
        const tx = data.transcripts[selected];
        const segs = tx?.segments ?? [];
        const assetScenes = data.scenes?.[selected] ?? [];
        const assetClips = data.clips?.[selected] ?? [];
        const assetHooks = data.hooks?.[selected] ?? [];
        if (segs.length === 0 && assetScenes.length === 0 && assetClips.length === 0 && assetHooks.length === 0) return null;
        const estimated = assetClips.some((c) => c.flags.includes("estimated_timestamps")) || assetScenes.some((s) => (s.detector ?? "").includes("mock"));
        return (
          <VCPanel>
            <VCPanelHeader icon={FileText} iconColor={ORANGE} label="Footage Intelligence — deterministic (pre-AI)" title="Transcript · Scenes · Clips"
              action={estimated ? <VCStatusBadge label="ESTIMATED / MOCK timing" variant="neutral" dot /> : <VCStatusBadge label="Measured timing" variant="success" dot />} />
            <div className="px-4 py-3 space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Transcript segments */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <VCChip label={tx ? `transcript: ${tx.source}` : "no transcript"} color={tx ? "#22c55e" : "#6b7a99"} />
                    {tx && <VCChip label={`${tx.word_count} words`} color="#6b7a99" />}
                    {tx && <VCChip label={`${tx.segment_count ?? segs.length} segments`} color="#0081f2" />}
                  </div>
                  {segs.slice(0, 8).map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11.5px]">
                      <span className="tabular-nums font-semibold w-10 flex-shrink-0" style={{ color: ORANGE }}>{ts(s.start_ms)}</span>
                      <span className="line-clamp-2" style={{ color: "var(--t-text-body)" }}>{s.text}</span>
                    </div>
                  ))}
                  {segs.length > 8 && <p className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>+ {segs.length - 8} more segments</p>}
                  {segs.length === 0 && <p className="text-[11.5px]" style={{ color: "var(--t-muted)" }}>Run the transcript job to generate timestamped segments.</p>}
                </div>
                {/* Hook candidates */}
                <div className="space-y-2">
                  <p className="vc-label">Hook candidates — first strong spoken moments</p>
                  {assetHooks.map((h) => (
                    <div key={h.id} className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>&ldquo;{h.hook_text}&rdquo;</p>
                        <span className="text-[13px] font-bold tabular-nums flex-shrink-0" style={{ color: scoreColor(h.three_sec_score), fontFamily: "var(--font-rajdhani), sans-serif" }}>{h.three_sec_score}</span>
                      </div>
                      {h.rationale && <p className="text-[10.5px] mt-0.5" style={{ color: "var(--t-dim)" }}>{h.rationale}</p>}
                    </div>
                  ))}
                  {assetHooks.length === 0 && <p className="text-[11.5px]" style={{ color: "var(--t-muted)" }}>Run the clips job to surface hook candidates.</p>}
                </div>
              </div>

              {/* Scenes rail */}
              {assetScenes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="vc-label">Scenes ({assetScenes.length}) · {assetScenes[0]?.detector}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {assetScenes.slice(0, 16).map((s) => (
                      <VCChip key={s.id} label={`#${s.scene_index + 1} ${ts(s.start_ms)}–${ts(s.end_ms)}${s.kind !== "unknown" ? ` · ${titleCase(s.kind)}` : ""}`} color="#22d3ee" />
                    ))}
                    {assetScenes.length > 16 && <VCChip label={`+${assetScenes.length - 16} more`} color="#6b7a99" />}
                  </div>
                </div>
              )}

              {/* Generated clips */}
              {assetClips.length > 0 && (
                <div className="space-y-1.5">
                  <p className="vc-label">Scored clips ({assetClips.length}) — deterministic rubric</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {[...assetClips].sort((a, b) => b.clip_score - a.clip_score).slice(0, 10).map((c) => (
                      <div key={c.id} className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11.5px] font-semibold tabular-nums" style={{ color: "var(--t-text)" }}>{ts(c.start_ms)}–{ts(c.end_ms)}</span>
                          <span className="text-[13px] font-bold tabular-nums" style={{ color: scoreColor(c.clip_score), fontFamily: "var(--font-rajdhani), sans-serif" }}>{c.clip_score}</span>
                        </div>
                        {c.transcript_excerpt && <p className="text-[10.5px] mt-0.5 line-clamp-1" style={{ color: "var(--t-muted)" }}>&ldquo;{c.transcript_excerpt}&rdquo;</p>}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.is_hook && <VCChip label="hook" color="#22c55e" />}
                          {c.is_highlight && <VCChip label="highlight" color="#0081f2" />}
                          {c.is_emotional && <VCChip label="emotional" color="#a78bfa" />}
                          {c.is_dead_space && <VCChip label="dead space" color="#ef4444" />}
                          {c.energy && <VCChip label={c.energy} color="#6b7a99" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  {assetClips.some((c) => c.is_dead_space) && (
                    <p className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>
                      Dead space: {assetClips.filter((c) => c.is_dead_space).length} segment(s) flagged from silence gaps / low speech density — cut these first.
                    </p>
                  )}
                </div>
              )}
            </div>
          </VCPanel>
        );
      })()}

      {/* The creative package */}
      {analysis && (
        <>
          {analysis.mock && (
            <div className="px-4 py-2.5 rounded-xl text-[11.5px]" style={{ background: "rgba(107,122,153,0.08)", border: "1px solid rgba(107,122,153,0.2)", color: "var(--t-muted)" }}>
              Deterministic mock package (no AI key configured). Structure is identical to the live output.
            </div>
          )}

          {/* Creative scorecard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <Stat label="QA quality score" value={analysis.qa.quality_score} suffix="/100" color={scoreColor(analysis.qa.quality_score)} />
            <Stat label="Best clip score" value={Math.max(0, ...analysis.clips.map((c) => c.clip_score))} suffix="/100" color={scoreColor(Math.max(0, ...analysis.clips.map((c) => c.clip_score)))} />
            <Stat label="Best hook (3s)" value={Math.max(0, ...analysis.hooks.map((h) => h.three_sec_score))} suffix="/100" color={scoreColor(Math.max(0, ...analysis.hooks.map((h) => h.three_sec_score)))} />
            <Stat label="Sound cues" value={analysis.sound_design.cue_sheet.length} suffix="" color="#22d3ee" />
          </div>

          {/* Strategy */}
          <VCPanel>
            <VCPanelHeader icon={Lightbulb} iconColor={ORANGE} label="Creative Strategist" title="Strategy & Creative Brief" />
            <div className="px-4 py-3 space-y-3">
              <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>{analysis.strategy.creative_brief}</p>
              <div className="flex flex-wrap gap-1.5">{analysis.strategy.campaign_concepts.map((c, i) => <VCChip key={i} label={c} color="#a78bfa" />)}</div>
              <div>
                <p className="vc-label mb-1.5">Hook bank</p>
                <ul className="space-y-1 text-[12px]" style={{ color: "var(--t-text-body)" }}>
                  {analysis.strategy.hook_bank.map((h, i) => <li key={i}>· {h}</li>)}
                </ul>
              </div>
            </div>
          </VCPanel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Clip scoreboard */}
            <VCPanel>
              <VCPanelHeader icon={Gauge} iconColor={ORANGE} label="Footage Intelligence" title="Clip Scoreboard" />
              <div className="px-4 py-3 space-y-2">
                {analysis.clips.map((c, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>{ts(c.start_ms)}–{ts(c.end_ms)}</span>
                      <span className="text-[14px] font-bold tabular-nums" style={{ color: scoreColor(c.clip_score), fontFamily: "var(--font-rajdhani), sans-serif" }}>{c.clip_score}</span>
                    </div>
                    {c.transcript_excerpt && <p className="text-[11.5px] mt-0.5 line-clamp-2" style={{ color: "var(--t-muted)" }}>&ldquo;{c.transcript_excerpt}&rdquo;</p>}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.is_hook && <VCChip label="hook" color="#22c55e" />}
                      {c.is_highlight && <VCChip label="highlight" color="#0081f2" />}
                      {c.is_emotional && <VCChip label="emotional" color="#a78bfa" />}
                      {c.is_dead_space && <VCChip label="dead space" color="#ef4444" />}
                      {c.energy && <VCChip label={c.energy} color="#6b7a99" />}
                      {c.flags.map((f) => <VCChip key={f} label={f} color="#f59e0b" />)}
                    </div>
                  </div>
                ))}
              </div>
            </VCPanel>

            {/* Hook lab */}
            <VCPanel>
              <VCPanelHeader icon={Sparkles} iconColor={ORANGE} label="Hook Intelligence" title="Hook Lab" />
              <div className="px-4 py-3 space-y-2">
                {analysis.hooks.map((h, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12.5px] font-semibold" style={{ color: "var(--t-text)" }}>&ldquo;{h.hook_text}&rdquo;</p>
                      <span className="text-[14px] font-bold tabular-nums flex-shrink-0" style={{ color: scoreColor(h.three_sec_score), fontFamily: "var(--font-rajdhani), sans-serif" }}>{h.three_sec_score}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <VCChip label={titleCase(h.hook_type)} color="#22d3ee" />
                    </div>
                    {h.rationale && <p className="text-[11px] mt-1" style={{ color: "var(--t-dim)" }}>{h.rationale}</p>}
                  </div>
                ))}
              </div>
            </VCPanel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Color lab */}
            <VCPanel>
              <VCPanelHeader icon={Palette} iconColor={ORANGE} label="Color Grading Agent" title="Color Lab" />
              <div className="px-4 py-3 space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  <VCChip label={`preset: ${titleCase(analysis.color.preset_key)}`} color="#22c55e" />
                  {analysis.color.detected_condition.map((c) => <VCChip key={c} label={titleCase(c)} color="#f59e0b" />)}
                </div>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>{analysis.color.notes}</p>
                <p className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>Runnable ffmpeg / Resolve / Premiere recipes for this preset live in the Vanta color library; the worker applies the ffmpeg pass to proxies in Phase 1.2.</p>
              </div>
            </VCPanel>

            {/* Sound design */}
            <VCPanel>
              <VCPanelHeader icon={Music4} iconColor={ORANGE} label="Sound Design Agent" title="Cue Sheet & Music" />
              <div className="px-4 py-3 space-y-2.5">
                <div className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                  <p className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
                    Music: {titleCase(analysis.sound_design.music.category)} · {analysis.sound_design.music.tempo} · {analysis.sound_design.music.mood}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-dim)" }}>{analysis.sound_design.music.rationale} · Loudness: {analysis.sound_design.loudness_target}</p>
                </div>
                <div className="space-y-1">
                  {analysis.sound_design.cue_sheet.slice(0, 12).map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      <span className="tabular-nums font-semibold w-10" style={{ color: ORANGE }}>{ts(c.at_ms)}</span>
                      <span style={{ color: "var(--t-text-body)" }}>{c.cue}</span>
                      <VCChip label={titleCase(c.category)} color="#6b7a99" />
                    </div>
                  ))}
                </div>
                {analysis.sound_design.audio_flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">{analysis.sound_design.audio_flags.map((f) => <VCChip key={f} label={f} color="#ef4444" />)}</div>
                )}
              </div>
            </VCPanel>
          </div>

          {/* Edit plan */}
          <VCPanel>
            <VCPanelHeader icon={Scissors} iconColor={ORANGE} label="Editor Agent" title={`Edit Plan — ${titleCase(analysis.edit_plan.format)}${analysis.edit_plan.target_duration_s ? ` · target ${analysis.edit_plan.target_duration_s}s` : ""}`} />
            <div className="px-4 py-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {analysis.edit_plan.story_beats.map((b, i) => <VCChip key={i} label={`${b.beat}: ${b.note}`} color="#0081f2" />)}
              </div>
              <div className="space-y-1.5">
                {analysis.edit_plan.timeline.map((t) => (
                  <div key={t.order} className="flex items-start gap-2.5 px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                    <span className="text-[11px] font-bold w-5 flex-shrink-0 mt-0.5" style={{ color: ORANGE }}>{t.order}</span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>{ts(t.start_ms)}–{ts(t.end_ms)} · {t.note}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {t.zoom && <VCChip label={`zoom: ${t.zoom}`} color="#22d3ee" />}
                        {t.broll && <VCChip label={`b-roll: ${t.broll}`} color="#a78bfa" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {analysis.edit_plan.pacing_notes.length > 0 && (
                <ul className="space-y-1 text-[11.5px]" style={{ color: "var(--t-muted)" }}>
                  {analysis.edit_plan.pacing_notes.map((p, i) => <li key={i}>· {p}</li>)}
                </ul>
              )}
            </div>
          </VCPanel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Caption style */}
            <VCPanel>
              <VCPanelHeader icon={Type} iconColor={ORANGE} label="Caption Agent" title="Caption System" />
              <div className="px-4 py-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <VCChip label={analysis.caption_style.font} color="#0081f2" />
                  <VCChip label={`${analysis.caption_style.words_per_card} words/card`} color="#22d3ee" />
                  <VCChip label={analysis.caption_style.placement} color="#6b7a99" />
                  <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--t-muted)" }}>
                    emphasis <span className="w-3 h-3 rounded-sm inline-block" style={{ background: analysis.caption_style.emphasis_color }} />
                  </span>
                </div>
                <ul className="space-y-1 text-[11.5px]" style={{ color: "var(--t-text-body)" }}>
                  {analysis.caption_style.emphasis_rules.map((r, i) => <li key={i}>· {r}</li>)}
                </ul>
                <p className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>Burn-in: {analysis.caption_style.burn_in_recipe}</p>
              </div>
            </VCPanel>

            {/* Thumbnails */}
            <VCPanel>
              <VCPanelHeader icon={ImageIcon} iconColor={ORANGE} label="Thumbnail Agent" title="Thumbnail Concepts" />
              <div className="px-4 py-3 space-y-2">
                {analysis.thumbnails.map((t, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12.5px] font-semibold" style={{ color: "var(--t-text)" }}>#{t.ctr_rank} · {t.concept}</p>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>{t.layout}</p>
                    <div className="flex flex-wrap gap-1 mt-1">{t.text_options.map((o, j) => <VCChip key={j} label={o} color={ORANGE} />)}</div>
                  </div>
                ))}
              </div>
            </VCPanel>
          </div>

          {/* QA */}
          <VCPanel>
            <VCPanelHeader icon={ShieldCheck} iconColor={ORANGE} label="QA Agent" title="Quality Review" />
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[26px] font-bold tabular-nums" style={{ color: scoreColor(analysis.qa.quality_score), fontFamily: "var(--font-rajdhani), sans-serif" }}>
                  {analysis.qa.quality_score}<span className="text-[13px]" style={{ color: "var(--t-dim)" }}>/100</span>
                </span>
                <VCStatusBadge label={analysis.qa.quality_score >= 80 ? "Ship-ready plan" : analysis.qa.quality_score >= 60 ? "Needs revision" : "Rework"} variant={analysis.qa.quality_score >= 80 ? "success" : analysis.qa.quality_score >= 60 ? "orange" : "danger"} />
              </div>
              {analysis.qa.revision_notes.length > 0 && (
                <div>
                  <p className="vc-label mb-1 flex items-center gap-1.5"><FileText size={11} /> Revision notes</p>
                  <ul className="space-y-1 text-[12px]" style={{ color: "var(--t-text-body)" }}>
                    {analysis.qa.revision_notes.map((n, i) => <li key={i}>· {n}</li>)}
                  </ul>
                </div>
              )}
              {[...analysis.qa.pacing_issues, ...analysis.qa.audio_issues, ...analysis.qa.caption_issues].length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.qa.pacing_issues.map((x, i) => <VCChip key={`p${i}`} label={`pacing: ${x}`} color="#f59e0b" />)}
                  {analysis.qa.audio_issues.map((x, i) => <VCChip key={`a${i}`} label={`audio: ${x}`} color="#ef4444" />)}
                  {analysis.qa.caption_issues.map((x, i) => <VCChip key={`c${i}`} label={`captions: ${x}`} color="#a78bfa" />)}
                </div>
              )}
            </div>
          </VCPanel>
        </>
      )}

      {!analysis && assets.length > 0 && (
        <VCPanel>
          <div className="px-4 py-4">
            <VCEmptyState icon={Sparkles} title="No analysis yet" description="Run the Vanta analysis on a registered asset to generate the full creative package — strategy, clip scores, hooks, color, edit plan, cue sheet, captions, thumbnails, and QA." />
          </div>
        </VCPanel>
      )}
    </VCPageWrapper>
  );
}

function Stat({ label, value, suffix, color }: { label: string; value: number; suffix: string; color: string }) {
  return (
    <div className="px-3 py-2.5 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
      <div className="text-[22px] font-bold leading-none tabular-nums" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color }}>{value}<span className="text-[11px]" style={{ color: "var(--t-dim)" }}>{suffix}</span></div>
      <div className="text-[10px] mt-1" style={{ color: "var(--t-dim)" }}>{label}</div>
    </div>
  );
}
