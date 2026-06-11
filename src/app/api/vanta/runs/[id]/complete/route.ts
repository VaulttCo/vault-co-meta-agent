// POST /api/vanta/runs/[id]/complete — WORKER-ONLY (Bearer VANTA_WORKER_SECRET; fail
// closed). Body: { claimed_by, claim_token, result }.
//
// Ordering matters: the run is FIRST finalized via CAS on the full claim identity
// (winning exclusive ownership of the finish), and only THEN are artifacts applied —
// a losing/duplicate completion can never leave side effects behind. The result
// payload is validated per job_type (worker-contract.ts): fields type-checked, clamped,
// capped; unknown fields dropped. Invalid payloads mark the run failed and return 422.

import { NextRequest, NextResponse } from "next/server";
import { requireWorkerAuth, workerBodyTooLarge, claimIdentityFrom, redactClaimedBy } from "@/lib/vanta/worker-auth";
import { getVantaRun, getVantaAsset, finishVantaRun, patchVantaRun } from "@/lib/vanta/db";
import { applyWorkerResult } from "@/lib/vanta/worker-contract";

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

    const run = await getVantaRun(id);
    if (!run) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Exclusive finish gate BEFORE any side effect: CAS (id, identity, active status)
    // → succeeded with a pending placeholder. Losers get 409 and mutate nothing.
    const gate = await finishVantaRun(id, identity, { status: "succeeded", result: { pending: true } });
    if (!gate) return NextResponse.json({ error: "Job not yours or not active" }, { status: 409 });

    try {
      const asset = run.asset_id ? await getVantaAsset(run.asset_id) : null;
      const outcome = await applyWorkerResult(run, asset, body.result);
      if (!outcome.ok) {
        const failed = await patchVantaRun(id, { status: "failed", error: `Invalid completion payload: ${outcome.error}`, result: {} });
        return NextResponse.json({ error: outcome.error, job: failed ? { ...failed, claimed_by: redactClaimedBy(failed.claimed_by) } : null }, { status: 422 });
      }
      const job = await patchVantaRun(id, { result: outcome.result });
      return NextResponse.json({ job: job ? { ...job, claimed_by: redactClaimedBy(job.claimed_by) } : null });
    } catch (inner) {
      await patchVantaRun(id, { status: "failed", error: `Completion processing failed: ${(inner as Error).message.slice(0, 400)}`, result: {} });
      throw inner;
    }
  } catch (e) {
    console.error("[POST /api/vanta/runs/[id]/complete]", (e as Error).message);
    return NextResponse.json({ error: "Completion failed" }, { status: 500 });
  }
}
