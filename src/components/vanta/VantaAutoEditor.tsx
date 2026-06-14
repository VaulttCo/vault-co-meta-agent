"use client";

// VANTA — Auto Editor (V1.7). The one user-facing workflow: drop a video → Vanta runs
// the full pipeline (transcript, scenes, hooks, clip scoring, edit plan, captions,
// thumbnails, color, cue sheet, QA score) → one reviewable draft → revise in plain
// language → Vanta remembers the feedback. Color/Hook/Caption/Sound/Memory remain
// INTERNAL agents behind this surface — not separate labs. Native Vault Core design.
// Nothing here renders, publishes, posts, or uploads file bytes anywhere.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Clapperboard, UploadCloud, Loader2, Sparkles, Scissors, Music4, Type, ImageIcon,
  ShieldCheck, Lightbulb, Send, Brain, ArrowRight, FileVideo,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { VCPageWrapper, VCPanel, VCPanelHeader, VCStatusBadge, VCChip, VCButton } from "@/components/ui/VaultUI";

const ORANGE = "#ff8400";

function tsLabel(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function scoreColor(n: number) { return n >= 80 ? "#22c55e" : n >= 60 ? "#f59e0b" : "#ef4444"; }
function titleCase(s: string) { return s.replace(/_/g, " "); }

interface DraftPlan {
  id: string; title: string; format: string; target_duration_s: number | null;
  story_beats: Array<{ beat: string; note: string }>;
  timeline: Array<{ order: number; clip_ref: string; start_ms: number; end_ms: number; note: string; zoom?: string }>;
  pacing_notes: string[];
  music_brief: { category?: string; energy?: string; tempo?: string; mood?: string };
  sound_design: Array<{ at_ms: number; cue: string; category: string }>;
}
interface DraftBundle {
  summary: {
    edit_plan: { id: string; title: string; format: string; target_duration_s: number | null; status: string } | null;
    caption_formats: string[]; thumbnail_count: number; color_preset: string | null;
    export: { target: string; status: string } | null; quality_score: number | null;
  };
  counts: Record<string, number>;
  plan?: DraftPlan;
}
interface LearnedNote { id: string; kind: string; note: string; created_at: string }

const QUICK_REVISIONS = [
  "Revise the hook", "Make it faster", "Add more captions",
  "Make it more luxury", "Cut the dead space", "Change the music direction",
];

/** Browser-side duration read from the dropped file's metadata (no upload). */
function readDurationMs(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(v.duration) && v.duration > 0 ? Math.round(v.duration * 1000) : null); };
      v.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      v.src = url;
    } catch { resolve(null); }
  });
}

export function VantaAutoEditor() {
  const [file, setFile] = useState<{ name: string; duration_ms: number | null } | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [showManualTranscript, setShowManualTranscript] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<"draft" | "revise" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftBundle | null>(null);
  const [needs, setNeeds] = useState<string[] | null>(null);
  const [instruction, setInstruction] = useState("");
  const [learned, setLearned] = useState<LearnedNote[]>([]);
  const [lastApplied, setLastApplied] = useState<string | null>(null);
  // V1.8/V1.9 auto-transcription pipeline stage (drives the status rail)
  const [phase, setPhase] = useState<"registering" | "extracting" | "uploading" | "transcribing" | "waiting_worker" | "building" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const rawFileRef = useRef<File | null>(null); // retained for browser audio extraction (V1.9)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);
  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    fetch("/api/vanta/memory").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.memory) setLearned(d.memory.map((m: LearnedNote & { note: string }) => ({ id: m.id, kind: m.kind, note: m.note, created_at: m.created_at })));
    }).catch(() => {});
  }, []);

  const acceptFile = useCallback(async (f: File) => {
    setNotice(null);
    rawFileRef.current = f;
    const duration_ms = await readDurationMs(f);
    setFile({ name: f.name, duration_ms });
  }, []);

  /** After the transcript lands: run queued scenes + clips inline, then materialize. */
  const buildDraftFromTranscript = useCallback(async (pid: string, aid: string, jobIds: Record<string, string>) => {
    setPhase("building");
    try {
      for (const t of ["scenes", "clips"] as const) {
        if (jobIds[t]) await fetch(`/api/vanta/jobs/${jobIds[t]}/run`, { method: "POST" }).catch(() => null); // 409 = worker already did it
      }
      const res = await fetch(`/api/vanta/projects/${pid}/package`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: aid, format: "short_916" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice(d.error ?? "Could not build the draft"); return; }
      setDraft({ summary: d.summary, counts: d.counts, plan: d.plan });
      setLastApplied(null); setNeeds(null);
    } finally { setPhase(null); setBusy(null); }
  }, []);

  /** Poll the transcript job for stage/status (drives the rail; covers the worker path). */
  const watchTranscription = useCallback((pid: string, aid: string, transcriptJobId: string, jobIds: Record<string, string>) => {
    stopPolling();
    let ticks = 0;
    let inFlight = false;  // overlapping polls must not stack
    let advanced = false;  // succeeded must trigger exactly one build
    pollRef.current = setInterval(async () => {
      if (inFlight || advanced) return;
      inFlight = true;
      try {
        if (++ticks > 150) { stopPolling(); setBusy(null); setPhase(null); setNotice("Transcription is taking a while — leave the worker running and re-open this draft from Projects."); return; }
        const r = await fetch(`/api/vanta/projects/${pid}/jobs`).catch(() => null);
        const d = r?.ok ? await r.json().catch(() => null) : null;
        const tj = d?.jobs?.find((j: { id: string }) => j.id === transcriptJobId);
        if (!tj) return;
        if (tj.status === "running" || tj.status === "claimed") {
          setPhase(tj.result?.stage === "extracting_audio" ? "extracting" : "transcribing");
        } else if (tj.status === "succeeded") {
          advanced = true;
          stopPolling();
          await buildDraftFromTranscript(pid, aid, jobIds);
        } else if (tj.status === "failed") {
          advanced = true;
          stopPolling(); setBusy(null); setPhase(null);
          setNotice(tj.error ?? "Transcription failed — paste the transcript manually and create the draft again.");
          setShowManualTranscript(true);
        }
      } finally { inFlight = false; }
    }, 4000);
  }, [stopPolling, buildDraftFromTranscript]);

  const createDraft = useCallback(async () => {
    if (!file) return;
    setBusy("draft"); setNotice(null); setNeeds(null); setPhase("registering");
    try {
      // A pasted transcript only applies while the override is visible — collapsing it
      // returns to the auto-transcription default.
      const manualTranscript = showManualTranscript && transcriptText.trim() ? transcriptText : null;
      const res = await fetch("/api/vanta/auto-edit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: file.name, duration_ms: file.duration_ms, transcript_text: manualTranscript, format: "short_916" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) { setNotice(d.error ?? "Could not create the draft"); setBusy(null); setPhase(null); return; }
      setProjectId(d.project_id ?? null); setAssetId(d.asset_id ?? null);
      const jobIds: Record<string, string> = {};
      for (const j of d.jobs ?? []) jobIds[j.job_type] = j.id;

      // Manual transcript (or already complete) → draft came back directly.
      if (res.status === 201 && d.draft) { setDraft(d.draft); setLastApplied(null); setBusy(null); setPhase(null); return; }

      if (d.stage === "needs_transcription" && d.transcript_job_id) {
        // V1.9 cascade: cloud → local whisper → external worker → manual paste.
        const fallThrough = (reason?: string) => {
          if (reason) setNotice(reason);
          if (d.capabilities?.local) {
            setPhase("extracting");
            watchTranscription(d.project_id, d.asset_id, d.transcript_job_id, jobIds);
            fetch(`/api/vanta/jobs/${d.transcript_job_id}/transcribe`, { method: "POST" }).catch(() => null);
          } else {
            setPhase("waiting_worker");
            setNotice((reason ? `${reason} — ` : "") + (d.notice ?? "Transcription worker required — start scripts/vanta-worker.mjs on a media box, or paste the transcript manually."));
            setShowManualTranscript(true);
            watchTranscription(d.project_id, d.asset_id, d.transcript_job_id, jobIds);
          }
        };

        if (d.transcription === "cloud_available" && rawFileRef.current) {
          // Tier 1 — cloud (V1.10): upload the ORIGINAL file to private storage; the
          // server extracts audio with ffmpeg (any common codec — no browser decoding)
          // and transcribes. Any failure cascades down to local/worker/paste.
          const raw = rawFileRef.current;
          const maxBytes = d.caps?.max_bytes ?? 300 * 1024 * 1024;
          const maxDur = d.caps?.max_duration_ms ?? 12 * 60_000;
          if (raw.size > maxBytes) { fallThrough(`File is ${Math.round(raw.size / 1024 / 1024)}MB — over the ${Math.round(maxBytes / 1024 / 1024)}MB cloud cap`); return; }
          if (file.duration_ms && file.duration_ms > maxDur) { fallThrough(`Footage is ${Math.round(file.duration_ms / 60_000)} min — over the ${Math.round(maxDur / 60_000)}-minute cloud cap`); return; }

          const targetRes = await fetch(`/api/vanta/assets/${d.asset_id}/video-upload`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_name: raw.name, mime_type: raw.type || null, size_bytes: raw.size, duration_ms: file.duration_ms }),
          });
          const target = await targetRes.json().catch(() => ({}));
          if (!targetRes.ok || !target.upload?.signed_url) { fallThrough(target.error ?? "Could not create the video upload target"); return; }

          setPhase("uploading");
          const put = await fetch(target.upload.signed_url, {
            method: "PUT",
            headers: { "Content-Type": target.content_type ?? raw.type ?? "video/mp4", "x-upsert": "true" },
            body: raw,
          }).catch(() => null);
          if (!put?.ok) { fallThrough("Video upload failed (storage)"); return; }

          setPhase("extracting");
          watchTranscription(d.project_id, d.asset_id, d.transcript_job_id, jobIds); // advances on success
          const cloudRes = await fetch(`/api/vanta/jobs/${d.transcript_job_id}/transcribe-cloud`, { method: "POST" }).catch(() => null);
          if (!cloudRes || !cloudRes.ok) {
            // Cloud tier failed (409 unavailable / 422 requeued / network) — the job is
            // back in (or still in) the queue, so cascade to local/worker immediately
            // instead of polling a job nothing is processing.
            const err = cloudRes ? await cloudRes.json().catch(() => ({})) : {};
            fallThrough(err?.error ?? "Cloud transcription failed");
          }
          return; // busy stays on; the watcher/builder clears it
        }

        fallThrough();
        return; // busy stays on; the watcher/builder clears it
      }

      // 202 without a transcription handle (e.g. paste was present but materialization
      // reported missing pieces) — surface what's needed.
      setNeeds(Array.isArray(d.needs) ? d.needs : []);
      setNotice(d.error ?? "The draft needs more inputs.");
      setBusy(null); setPhase(null);
    } catch {
      setBusy(null); setPhase(null); setNotice("Could not create the draft");
    }
  }, [file, transcriptText, showManualTranscript, watchTranscription]);

  const revise = useCallback(async (text: string) => {
    if (!projectId || !assetId || !text.trim()) return;
    setBusy("revise"); setNotice(null);
    try {
      const res = await fetch(`/api/vanta/projects/${projectId}/revise`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId, instruction: text.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 422) { setNotice(`Vanta didn't recognize that yet. Try: ${(d.supported ?? QUICK_REVISIONS).join(" · ")}`); return; }
      if (!res.ok) { setNotice(d.error ?? "Revision failed"); return; }
      setDraft(d.draft); setInstruction(""); setLastApplied(d.applied ?? null);
      if (d.learned) setLearned((prev) => [{ id: d.learned.id, kind: d.learned.kind, note: d.learned.note, created_at: d.learned.created_at }, ...prev].slice(0, 20));
    } finally { setBusy(null); }
  }, [projectId, assetId]);

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vanta · Auto Editor"
        title="Drop a video. Get an edited draft."
        description="Vanta transcribes, finds the hooks, scores every moment, cuts the dead space, and hands you a reviewable edit — captions, thumbnails, color, and sound included. Tell it what to change in plain language; it remembers."
        badge={<VCStatusBadge label="Plans & briefs only — never publishes" variant="orange" dot />}
      />

      {/* 1 · Drop zone */}
      <VCPanel accent="orange">
        <VCPanelHeader icon={UploadCloud} iconColor={ORANGE} label="Step 1" title="Drop a video to create an edited draft" />
        <div className="px-4 py-4 space-y-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) acceptFile(f); }}
            onClick={() => fileInput.current?.click()}
            className="flex flex-col items-center justify-center gap-2 px-6 py-10 rounded-2xl cursor-pointer transition-all text-center"
            style={{
              border: `2px dashed ${dragOver ? ORANGE : "var(--t-border)"}`,
              background: dragOver ? "rgba(255,132,0,0.06)" : "var(--t-surface-2)",
            }}>
            <input ref={fileInput} type="file" accept="video/*,audio/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = ""; }} />
            {file ? (
              <>
                <FileVideo size={28} style={{ color: ORANGE }} />
                <p className="text-[14px] font-semibold" style={{ color: "var(--t-text)" }}>{file.name}</p>
                <p className="text-[11.5px]" style={{ color: "var(--t-muted)" }}>
                  {file.duration_ms ? `${Math.round(file.duration_ms / 1000)}s detected from file metadata` : "duration unknown"} · iPhone, DSLR, drone, GoPro, H.264/H.265, MOV/MP4/M4V — the server normalizes the codec
                </p>
              </>
            ) : (
              <>
                <UploadCloud size={30} style={{ color: dragOver ? ORANGE : "var(--t-dim)" }} />
                <p className="text-[14px] font-semibold" style={{ color: "var(--t-text)" }}>Drag a video here, or click to browse</p>
                <p className="text-[11.5px]" style={{ color: "var(--t-muted)" }}>mp4 / mov / audio — Vanta auto-transcribes and builds the draft; the video itself never uploads</p>
              </>
            )}
          </div>

          {/* Manual override only — auto-transcription is the default path (V1.8) */}
          <button onClick={() => setShowManualTranscript((v) => !v)}
            className="text-[11px] font-semibold hover:underline" style={{ color: "var(--t-dim)" }}>
            {showManualTranscript ? "− Hide manual transcript override" : "+ Manual override: paste a transcript instead of auto-transcribing"}
          </button>
          {showManualTranscript && (
            <textarea
              value={transcriptText} onChange={(e) => setTranscriptText(e.target.value)} rows={3}
              placeholder="Paste the transcript here to skip auto-transcription (fallback when no whisper/worker is available)…"
              className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none resize-y"
              style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <VCButton onClick={createDraft} disabled={!file || busy !== null}>
              {busy === "draft"
                ? <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Vanta is editing…</span>
                : <span className="inline-flex items-center gap-1.5"><Sparkles size={12} /> Create edited draft</span>}
            </VCButton>
            {needs && <VCChip label={`waiting on: ${needs.join(", ")}`} color="#f59e0b" />}
          </div>
          <p className="text-[10px]" style={{ color: "var(--t-dim)" }}>
            When cloud transcription is enabled, your video is uploaded to private storage and its audio is sent to
            the configured transcription provider. Footage may contain spoken personal details.
          </p>

          {/* Pipeline status rail (V1.8) */}
          {phase && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                ["registering", "Register footage"],
                ["uploading", "Upload video"],
                ["extracting", "Extract audio"],
                ["transcribing", "Transcribe"],
                ["building", "Build draft"],
              ] as const).map(([key, label]) => {
                const order = ["registering", "uploading", "extracting", "transcribing", "building"];
                const activeIdx = order.indexOf(phase === "waiting_worker" ? "transcribing" : phase);
                const myIdx = order.indexOf(key);
                const state = myIdx < activeIdx ? "done" : myIdx === activeIdx ? "active" : "pending";
                return (
                  <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                    style={{
                      background: state === "active" ? "rgba(255,132,0,0.1)" : "var(--t-surface-2)",
                      border: `1px solid ${state === "active" ? "rgba(255,132,0,0.3)" : "var(--t-border-subtle)"}`,
                      color: state === "done" ? "#22c55e" : state === "active" ? ORANGE : "var(--t-dim)",
                    }}>
                    {state === "done" ? "✓" : state === "active" ? <Loader2 size={10} className="animate-spin" /> : "·"} {label}
                    {key === "transcribing" && phase === "waiting_worker" && " (waiting for worker)"}
                  </span>
                );
              })}
            </div>
          )}
          {notice && <p className="text-[11.5px] px-3 py-2 rounded-lg" style={{ background: "rgba(255,132,0,0.08)", border: "1px solid rgba(255,132,0,0.2)", color: ORANGE }}>{notice}</p>}
        </div>
      </VCPanel>

      {/* 2 · Draft review */}
      {draft && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            <Stat label="QA quality" value={`${draft.summary.quality_score ?? "—"}`} suffix="/100" color={scoreColor(draft.summary.quality_score ?? 0)} />
            <Stat label="Clips scored" value={`${draft.counts.clips ?? 0}`} suffix="" color="#0081f2" />
            <Stat label="Hooks found" value={`${draft.counts.hooks ?? 0}`} suffix="" color="#22c55e" />
            <Stat label="Thumbnails" value={`${draft.summary.thumbnail_count}`} suffix="" color="#a78bfa" />
            <Stat label="Captions" value={draft.summary.caption_formats.join(", ").toUpperCase() || "—"} suffix="" color="#22d3ee" />
          </div>

          <VCPanel>
            <VCPanelHeader icon={Scissors} iconColor={ORANGE} label="Step 2 — review the draft"
              title={`${draft.plan?.title ?? "Draft"} · ${titleCase(draft.plan?.format ?? "")} · target ${draft.plan?.target_duration_s ?? "—"}s`}
              action={projectId
                ? <Link href={`/vanta/projects/${projectId}`} className="inline-flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: ORANGE }}>Full workbench <ArrowRight size={11} /></Link>
                : undefined} />
            <div className="px-4 py-3 space-y-3">
              {lastApplied && (
                <p className="text-[11.5px] px-3 py-2 rounded-lg" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
                  ✓ {lastApplied}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {draft.plan?.story_beats.map((b, i) => <VCChip key={i} label={`${b.beat}: ${b.note.slice(0, 60)}`} color="#0081f2" />)}
              </div>

              {/* Draft timeline */}
              <div className="space-y-1.5">
                {draft.plan?.timeline.map((t) => (
                  <div key={t.order} className="flex items-start gap-2.5 px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                    <span className="text-[11px] font-bold w-5 flex-shrink-0 mt-0.5" style={{ color: ORANGE }}>{t.order}</span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>{tsLabel(t.start_ms)}–{tsLabel(t.end_ms)} · {t.note}</p>
                      {t.zoom && <VCChip label={t.zoom} color="#22d3ee" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                  <p className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Music4 size={11} style={{ color: ORANGE }} /> Sound</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                    {titleCase(draft.plan?.music_brief.category ?? "—")} · {draft.plan?.music_brief.tempo ?? ""} · {draft.plan?.music_brief.mood ?? ""}
                  </p>
                  <p className="text-[10.5px] mt-1" style={{ color: "var(--t-dim)" }}>
                    {draft.plan?.sound_design.slice(0, 5).map((c) => `${tsLabel(c.at_ms)} ${c.cue}`).join(" · ")}
                  </p>
                </div>
                <div className="px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                  <p className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><ImageIcon size={11} style={{ color: ORANGE }} /> Look</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                    Grade: {titleCase(draft.summary.color_preset ?? "—")} · Captions: {draft.summary.caption_formats.join(", ") || "—"}
                  </p>
                  <p className="text-[10.5px] mt-1" style={{ color: "var(--t-dim)" }}>
                    {draft.plan?.pacing_notes[0] ?? ""}
                  </p>
                </div>
              </div>

              {draft.summary.export && (
                <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--t-muted)" }}>
                  <ShieldCheck size={12} style={{ color: "#22c55e" }} />
                  Draft filed for {titleCase(draft.summary.export.target)} ({draft.summary.export.status}) — human approval gates everything downstream.
                </div>
              )}
            </div>
          </VCPanel>

          {/* 3 · Revision chat */}
          <VCPanel accent="orange">
            <VCPanelHeader icon={Type} iconColor={ORANGE} label="Step 3 — revise in plain language" title="Tell Vanta what to change" />
            <div className="px-4 py-3 space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REVISIONS.map((q) => (
                  <button key={q} onClick={() => revise(q)} disabled={busy !== null}
                    className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all disabled:opacity-40"
                    style={{ background: "rgba(255,132,0,0.08)", border: "1px solid rgba(255,132,0,0.22)", color: ORANGE }}>
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={instruction} onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") revise(instruction); }}
                  placeholder='e.g. "make it faster" or "switch the music to testimonial"…'
                  className="flex-1 px-3 py-2 rounded-lg text-[12.5px] outline-none"
                  style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
                <VCButton onClick={() => revise(instruction)} disabled={busy !== null || !instruction.trim()}>
                  {busy === "revise"
                    ? <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Revising…</span>
                    : <span className="inline-flex items-center gap-1.5"><Send size={12} /> Revise</span>}
                </VCButton>
              </div>
            </div>
          </VCPanel>
        </>
      )}

      {/* 4 · Learning notes */}
      {learned.length > 0 && (
        <VCPanel>
          <VCPanelHeader icon={Brain} iconColor={ORANGE} label="The learning loop" title="What Vanta learned from your revisions" />
          <div className="px-4 py-3 space-y-1.5">
            {learned.slice(0, 8).map((l) => (
              <div key={l.id} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                <Lightbulb size={12} className="flex-shrink-0 mt-0.5" style={{ color: ORANGE }} />
                <div className="min-w-0">
                  <p className="text-[11.5px]" style={{ color: "var(--t-text-body)" }}>{l.note}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--t-dim)" }}>{titleCase(l.kind)} · applies to every future draft</p>
                </div>
              </div>
            ))}
          </div>
        </VCPanel>
      )}

      {/* Soft footer to the advanced surfaces */}
      <div className="flex flex-wrap gap-4 text-[11.5px]" style={{ color: "var(--t-dim)" }}>
        <Link href="/vanta/projects" className="inline-flex items-center gap-1 hover:underline"><Clapperboard size={11} /> All drafts & projects</Link>
        <Link href="/vanta/studio" className="inline-flex items-center gap-1 hover:underline"><Sparkles size={11} /> Studio view — agents, looks & packs (advanced)</Link>
      </div>
    </VCPageWrapper>
  );
}

function Stat({ label, value, suffix, color }: { label: string; value: string; suffix: string; color: string }) {
  return (
    <div className="px-3 py-2.5 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
      <div className="text-[20px] font-bold leading-none" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color }}>{value}<span className="text-[11px]" style={{ color: "var(--t-dim)" }}>{suffix}</span></div>
      <div className="text-[10px] mt-1" style={{ color: "var(--t-dim)" }}>{label}</div>
    </div>
  );
}
