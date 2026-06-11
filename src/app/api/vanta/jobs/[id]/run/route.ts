// POST /api/vanta/jobs/[id]/run — claim (CAS) and execute one queued processing job
// inline. LIGHT jobs only run for real (probe, seeked thumbnail grabs, transcript/scene
// placeholders); HEAVY jobs (proxy transcode, audio decode) always complete with the
// worker plan — no heavy processing ever runs in this handler. Mock-safe: with no
// ffmpeg/ffprobe/VANTA_MEDIA_ROOT every job completes with a clearly-labeled mock result.
// Role-guarded. Never fetches URLs, never publishes anything.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaRun, getVantaAsset } from "@/lib/vanta/db";
import { claimJob, executeProcessingJob, isVantaJobType } from "@/lib/vanta/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  if (!isVantaJobType(run.job_type)) {
    return NextResponse.json({ error: `Job type '${run.job_type}' is not inline-runnable` }, { status: 400 });
  }
  if (run.status !== "queued") {
    return NextResponse.json({ error: `Job is ${run.status}, not queued`, job: run }, { status: 409 });
  }

  try {
    // `app:` namespace — inline smoke claims can never collide with `worker:` identities.
    const claimed = await claimJob(run.id, `app:${auth.userId ?? "operator"}`);
    if (!claimed) return NextResponse.json({ error: "Job was claimed by another runner" }, { status: 409 });

    const asset = claimed.asset_id ? await getVantaAsset(claimed.asset_id) : null;
    // Heavy local media work (whisper/scenedetect) is worker-owned; inline execution
    // of it is dev-box opt-in only.
    const finished = await executeProcessingJob(claimed, asset, {
      allowLocalHeavy: process.env.VANTA_ALLOW_INLINE_HEAVY === "true",
    });
    if (!finished) return NextResponse.json({ error: "Job execution did not record a result" }, { status: 500 });

    const mock = (finished.result as { mock?: boolean })?.mock === true;
    return NextResponse.json({ job: finished, mock });
  } catch (e) {
    console.error("[POST /api/vanta/jobs/[id]/run]", (e as Error).message);
    return NextResponse.json({ error: "Job execution failed" }, { status: 500 });
  }
}
