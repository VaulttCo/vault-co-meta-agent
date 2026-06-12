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
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/vanta/memory").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.memory) setLearned(d.memory.map((m: LearnedNote & { note: string }) => ({ id: m.id, kind: m.kind, note: m.note, created_at: m.created_at })));
    }).catch(() => {});
  }, []);

  const acceptFile = useCallback(async (f: File) => {
    setNotice(null);
    const duration_ms = await readDurationMs(f);
    setFile({ name: f.name, duration_ms });
  }, []);

  const createDraft = useCallback(async () => {
    if (!file) return;
    setBusy("draft"); setNotice(null); setNeeds(null);
    try {
      const res = await fetch("/api/vanta/auto-edit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: file.name, duration_ms: file.duration_ms, transcript_text: transcriptText || null, format: "short_916" }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 202) {
        setProjectId(d.project_id ?? null); setAssetId(d.asset_id ?? null);
        setNeeds(Array.isArray(d.needs) ? d.needs : []);
        setNotice("Footage registered — the draft still needs a transcript. Paste it above and create the draft again (the worker's whisper pass automates this).");
        return;
      }
      if (!res.ok) { setNotice(d.error ?? "Could not create the draft"); return; }
      setProjectId(d.project_id); setAssetId(d.asset_id); setDraft(d.draft); setLastApplied(null);
    } finally { setBusy(null); }
  }, [file, transcriptText]);

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
                  {file.duration_ms ? `${Math.round(file.duration_ms / 1000)}s detected from file metadata` : "duration unknown"} · file bytes stay on your machine — Vanta plans from metadata + transcript
                </p>
              </>
            ) : (
              <>
                <UploadCloud size={30} style={{ color: dragOver ? ORANGE : "var(--t-dim)" }} />
                <p className="text-[14px] font-semibold" style={{ color: "var(--t-text)" }}>Drag a video here, or click to browse</p>
                <p className="text-[11.5px]" style={{ color: "var(--t-muted)" }}>mp4 / mov / audio — Vanta reads the duration locally and builds the draft from the transcript</p>
              </>
            )}
          </div>

          <textarea
            value={transcriptText} onChange={(e) => setTranscriptText(e.target.value)} rows={3}
            placeholder="Paste the transcript (strongly recommended — Vanta cuts by what's said; the worker's whisper pass automates this in production)…"
            className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none resize-y"
            style={{ background: "var(--t-bg)", border: `1px solid ${needs ? "rgba(255,132,0,0.5)" : "var(--t-border)"}`, color: "var(--t-text)" }} />

          <div className="flex items-center gap-3 flex-wrap">
            <VCButton onClick={createDraft} disabled={!file || busy !== null}>
              {busy === "draft"
                ? <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Vanta is editing…</span>
                : <span className="inline-flex items-center gap-1.5"><Sparkles size={12} /> Create edited draft</span>}
            </VCButton>
            {needs && <VCChip label={`waiting on: ${needs.join(", ")}`} color="#f59e0b" />}
          </div>
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
