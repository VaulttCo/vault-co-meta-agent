// POST /api/vanta/runs/[id]/fail — WORKER-ONLY (Bearer VANTA_WORKER_SECRET; fail
// closed). Body: { claimed_by, claim_token, error }. Marks the run failed with bounded
// error text. CAS on the full claim identity — only the claiming worker may fail it.

import { NextRequest, NextResponse } from "next/server";
import { requireWorkerAuth, workerBodyTooLarge, claimIdentityFrom, redactClaimedBy } from "@/lib/vanta/worker-auth";
import { finishVantaRun } from "@/lib/vanta/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = requireWorkerAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (workerBodyTooLarge(req)) return NextResponse.json({ error: "Body too large" }, { status: 413 });

  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) ?? {};
    const identity = claimIdentityFrom(body.claimed_by, body.claim_token);
    if (!identity) return NextResponse.json({ error: "claimed_by and claim_token are required" }, { status: 400 });
    const message = typeof body.error === "string" && body.error.trim()
      ? body.error.trim().slice(0, 500)
      : "Worker reported failure (no detail)";

    const job = await finishVantaRun(id, identity, { status: "failed", error: message });
    if (!job) return NextResponse.json({ error: "Job not found, not yours, or not active" }, { status: 409 });
    return NextResponse.json({ job: { ...job, claimed_by: redactClaimedBy(job.claimed_by) } });
  } catch (e) {
    console.error("[POST /api/vanta/runs/[id]/fail]", (e as Error).message);
    return NextResponse.json({ error: "Fail-report failed" }, { status: 500 });
  }
}
