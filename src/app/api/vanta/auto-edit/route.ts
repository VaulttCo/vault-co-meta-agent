// POST /api/vanta/auto-edit — the Auto Editor's single action: "drop a video, get an
// edited draft." One request runs the EXISTING pipeline end-to-end:
//   create project → register asset → enqueue processing jobs → execute the light/
//   deterministic jobs inline (probe, thumbnail/proxy/audio plans, transcript, scenes,
//   clips) → materialize the measured creative package (edit plan, captions, thumbnails,
//   color, cue sheet, scores, internal_review export).
// Heavy media work still belongs to the worker (plans ship in job results); with no
// binaries everything degrades to the deterministic mock tiers. Nothing is rendered,
// published, posted, or sent anywhere. Role-guarded like asset registration.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { createVantaProject, registerVantaAsset } from "@/lib/vanta/db";
import { enqueueAssetPipeline, claimJob, executeProcessingJob } from "@/lib/vanta/jobs";
import { materializeCreativePackage } from "@/lib/vanta/package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canViewAiBuilder"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) ?? {};
    if (typeof body.file_name !== "string" || !body.file_name.trim()) {
      return NextResponse.json({ error: "file_name is required" }, { status: 400 });
    }

    const project = await createVantaProject({
      title: `Auto Editor — ${body.file_name.trim().slice(0, 120)}`,
      description: "Created by the Vanta Auto Editor (drop-to-draft flow).",
    }, auth.userId);
    if (!project) return NextResponse.json({ error: "Could not create project" }, { status: 500 });

    const registered = await registerVantaAsset({
      project_id: project.id,
      file_name: body.file_name,
      duration_ms: typeof body.duration_ms === "number" ? body.duration_ms : null,
      transcript_text: typeof body.transcript_text === "string" ? body.transcript_text : null,
    }, auth.userId);
    if (!registered) return NextResponse.json({ error: "file_name is required" }, { status: 400 });
    const asset = registered.asset;

    // Execute the pipeline inline — every job here is light/deterministic (heavy work
    // resolves to worker plans by design; see jobs.ts).
    const jobs = await enqueueAssetPipeline(project.id, asset, { hasManualTranscript: !!registered.transcript });
    const jobResults: Array<{ job_type: string; status: string }> = [];
    for (const job of jobs) {
      const claimed = await claimJob(job.id, `app:auto-editor:${auth.userId ?? "operator"}`);
      if (!claimed) { jobResults.push({ job_type: job.job_type, status: job.status }); continue; }
      const done = await executeProcessingJob(claimed, asset);
      jobResults.push({ job_type: job.job_type, status: done?.status ?? "failed" });
    }

    const draft = await materializeCreativePackage(project, asset, {
      format: typeof body.format === "string" ? (body.format as never) : undefined,
      actor: auth.userId,
    });
    if (!draft.ok) {
      // Transcript missing (no paste, no whisper on this box) → tell the operator what
      // the draft still needs instead of failing the whole flow.
      return NextResponse.json({
        project_id: project.id, asset_id: asset.id, jobs: jobResults,
        draft: null, needs: draft.missing, error: draft.error,
      }, { status: 202 });
    }
    return NextResponse.json({
      project_id: project.id, asset_id: asset.id, jobs: jobResults,
      draft: { summary: draft.summary, counts: draft.counts, plan: draft.plan },
    }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/vanta/auto-edit]", (e as Error).message);
    return NextResponse.json({ error: "Auto-edit failed" }, { status: 500 });
  }
}
