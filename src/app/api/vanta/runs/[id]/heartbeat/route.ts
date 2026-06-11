// POST /api/vanta/runs/[id]/heartbeat — WORKER-ONLY (Bearer VANTA_WORKER_SECRET; fail
// closed). Body: { claimed_by, claim_token }. Marks the claim alive: claimed → running
// (sets started_at), running → touches updated_at. CAS on the full claim identity
// (name + server-issued token) — wrong owner/token/state → 409.

import { NextRequest, NextResponse } from "next/server";
import { requireWorkerAuth, workerBodyTooLarge, claimIdentityFrom, redactClaimedBy } from "@/lib/vanta/worker-auth";
import { heartbeatVantaRun } from "@/lib/vanta/db";

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

    const job = await heartbeatVantaRun(id, identity);
    if (!job) return NextResponse.json({ error: "Job not found, not yours, or not active" }, { status: 409 });
    return NextResponse.json({ job: { ...job, claimed_by: redactClaimedBy(job.claimed_by) } });
  } catch (e) {
    console.error("[POST /api/vanta/runs/[id]/heartbeat]", (e as Error).message);
    return NextResponse.json({ error: "Heartbeat failed" }, { status: 500 });
  }
}
