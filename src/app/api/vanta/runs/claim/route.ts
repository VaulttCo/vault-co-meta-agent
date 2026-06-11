// POST /api/vanta/runs/claim — WORKER-ONLY (Bearer VANTA_WORKER_SECRET; fail closed).
// Claims the next queued processing job (oldest first) via compare-and-set. Body:
// { claimed_by: string, job_types?: string[] }. Returns { job, asset, claim_token } —
// the claim token is server-issued per claim and REQUIRED on heartbeat/complete/fail,
// so one worker (or a leaked secret) can never finalize another worker's run. `clips`
// is never handed out (control-plane generated). No media work runs here.

import { NextRequest, NextResponse } from "next/server";
import { requireWorkerAuth, workerBodyTooLarge, newClaimIdentity, redactClaimedBy } from "@/lib/vanta/worker-auth";
import { claimNextJob } from "@/lib/vanta/jobs";
import { getVantaAsset } from "@/lib/vanta/db";
import { VANTA_JOB_TYPES, type VantaJobType } from "@/lib/vanta/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = requireWorkerAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (workerBodyTooLarge(req)) return NextResponse.json({ error: "Body too large" }, { status: 413 });

  try {
    const body = (await req.json().catch(() => ({}))) ?? {};
    const name = typeof body.claimed_by === "string" && body.claimed_by.trim() ? body.claimed_by.trim() : null;
    if (!name) return NextResponse.json({ error: "claimed_by is required" }, { status: 400 });
    const jobTypes = Array.isArray(body.job_types)
      ? (body.job_types.filter((t: unknown) => (VANTA_JOB_TYPES as readonly string[]).includes(t as string)) as VantaJobType[])
      : undefined;
    const projectId = typeof body.project_id === "string" && body.project_id.trim()
      ? body.project_id.trim().slice(0, 120)
      : null;

    const identity = newClaimIdentity(name);
    const job = await claimNextJob(identity.claimedBy, jobTypes, projectId);
    if (!job) return NextResponse.json({ job: null });
    const asset = job.asset_id ? await getVantaAsset(job.asset_id) : null;
    return NextResponse.json({
      job: { ...job, claimed_by: redactClaimedBy(job.claimed_by) },
      asset,
      claim_token: identity.claimToken,
    });
  } catch (e) {
    console.error("[POST /api/vanta/runs/claim]", (e as Error).message);
    return NextResponse.json({ error: "Claim failed" }, { status: 500 });
  }
}
