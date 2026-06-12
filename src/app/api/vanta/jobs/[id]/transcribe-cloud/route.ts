// POST /api/vanta/jobs/[id]/transcribe-cloud — V1.9 Cloud Transcription Bridge step 2.
// Claims the queued transcript job, downloads the asset's PRIVATE stored audio
// server-side, transcribes it with hosted OpenAI (whisper-1, verbose_json), persists
// sanitized timestamped segments into vanta_transcripts, and completes the run. 409
// when cloud transcription is not configured (client falls through to local whisper /
// worker / manual paste). Role-guarded. No audio bytes, signed URLs, secrets, or raw
// provider responses in logs or responses.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaRun, getVantaAsset } from "@/lib/vanta/db";
import { claimJob, executeCloudTranscriptionJob } from "@/lib/vanta/jobs";
import { isCloudTranscriptionAvailable } from "@/lib/vanta/cloud-transcribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // download + provider call on ~12min audio

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
  if (run.job_type !== "transcript") return NextResponse.json({ error: "Not a transcript job" }, { status: 400 });
  if (run.status !== "queued") {
    return NextResponse.json({ error: `Job is ${run.status}, not queued`, job: run }, { status: 409 });
  }
  const asset = run.asset_id ? await getVantaAsset(run.asset_id) : null;
  if (!asset) return NextResponse.json({ error: "Asset not found for this job" }, { status: 404 });

  if (!isCloudTranscriptionAvailable()) {
    return NextResponse.json({
      error: "Cloud transcription unavailable",
      detail: "Requires VANTA_TRANSCRIPTION_PROVIDER=openai, OPENAI_API_KEY, and Supabase Storage — use local whisper, the worker, or paste the transcript.",
    }, { status: 409 });
  }

  try {
    const claimed = await claimJob(run.id, `app:cloud-transcribe:${auth.userId ?? "operator"}`);
    if (!claimed) return NextResponse.json({ error: "Job was claimed by another runner" }, { status: 409 });
    const finished = await executeCloudTranscriptionJob(claimed, asset);
    if (!finished) return NextResponse.json({ error: "Cloud transcription did not record a result" }, { status: 500 });
    if (finished.status === "queued") {
      // Cloud tier failed and the job was REQUEUED so local whisper / the worker can
      // still claim it — the client should cascade, not retry cloud.
      const reason = (finished.result as { last_cloud_error?: string })?.last_cloud_error ?? "Cloud transcription failed";
      return NextResponse.json({ error: reason, requeued: true, job: finished }, { status: 422 });
    }
    return NextResponse.json({ job: finished });
  } catch (e) {
    console.error("[POST /api/vanta/jobs/[id]/transcribe-cloud]", (e as Error).message);
    return NextResponse.json({ error: "Cloud transcription failed" }, { status: 500 });
  }
}
