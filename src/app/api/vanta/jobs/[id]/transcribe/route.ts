// POST /api/vanta/jobs/[id]/transcribe — V1.8 auto-transcription. Claims a queued
// transcript job and runs it locally: ffmpeg audio extract → whisper → timestamped
// segments into vanta_transcripts. Stage progress is patched into the run result
// ("extracting_audio" → "transcribing") for the Auto Editor's status display.
//
// This is the ONE sanctioned inline-heavy route: single-purpose, availability-gated
// (409 "Transcription worker required" when whisper or the local file is absent — the
// external Vanta Worker then owns the job), file access confined to VANTA_MEDIA_ROOT,
// no third-party upload. Role-guarded like the other mutating Vanta routes.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaRun, getVantaAsset } from "@/lib/vanta/db";
import { claimJob, executeTranscriptionJob, isLocalTranscriptionAvailable } from "@/lib/vanta/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // whisper on real footage takes minutes

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canViewAiBuilder"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const run = await getVantaRun(id);
  if (!run) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (run.job_type !== "transcript") {
    return NextResponse.json({ error: "Not a transcript job" }, { status: 400 });
  }
  if (run.status !== "queued") {
    return NextResponse.json({ error: `Job is ${run.status}, not queued`, job: run }, { status: 409 });
  }
  const asset = run.asset_id ? await getVantaAsset(run.asset_id) : null;
  if (!asset) return NextResponse.json({ error: "Asset not found for this job" }, { status: 404 });

  if (!(await isLocalTranscriptionAvailable(asset))) {
    return NextResponse.json({
      error: "Transcription worker required",
      detail: "whisper (or the source file under VANTA_MEDIA_ROOT) is not available on this box — start scripts/vanta-worker.mjs on a media box, or paste the transcript manually.",
      worker_required: true,
    }, { status: 409 });
  }

  try {
    const claimed = await claimJob(run.id, `app:transcribe:${auth.userId ?? "operator"}`);
    if (!claimed) return NextResponse.json({ error: "Job was claimed by another runner" }, { status: 409 });
    const finished = await executeTranscriptionJob(claimed, asset);
    if (!finished) return NextResponse.json({ error: "Transcription did not record a result" }, { status: 500 });
    if (finished.status === "failed") {
      return NextResponse.json({ error: finished.error ?? "Transcription failed", job: finished }, { status: 422 });
    }
    return NextResponse.json({ job: finished });
  } catch (e) {
    console.error("[POST /api/vanta/jobs/[id]/transcribe]", (e as Error).message);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
