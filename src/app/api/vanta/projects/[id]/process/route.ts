// POST /api/vanta/projects/[id]/process — enqueue the processing pipeline for one asset
// (body.asset_id) or every asset on the project. Enqueueing is vanta_agent_runs inserts
// only (idempotent per params_hash) — NO media work runs in this handler; jobs execute
// via /api/vanta/jobs/[id]/run (light ops) or the external Vanta Worker (heavy ops).
// Role-guarded. Mock-safe. Never fetches URLs, never publishes anything.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaProject, getVantaAssets, getVantaAsset, getVantaTranscript } from "@/lib/vanta/db";
import { enqueueAssetPipeline } from "@/lib/vanta/jobs";
import { getMediaCapabilities } from "@/lib/vanta/media/ffmpeg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canViewAiBuilder"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const project = await getVantaProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  try {
    const body = (await req.json().catch(() => ({}))) ?? {};
    let assets;
    if (body.asset_id !== undefined) {
      if (typeof body.asset_id !== "string") return NextResponse.json({ error: "asset_id must be a string" }, { status: 400 });
      const asset = await getVantaAsset(body.asset_id);
      if (!asset || asset.project_id !== project.id) {
        return NextResponse.json({ error: "Asset not found on this project" }, { status: 404 });
      }
      assets = [asset];
    } else {
      assets = await getVantaAssets(project.id);
    }
    if (assets.length === 0) return NextResponse.json({ error: "No assets registered on this project" }, { status: 400 });

    const jobs = [];
    for (const asset of assets) {
      const transcript = await getVantaTranscript(asset.id);
      const runs = await enqueueAssetPipeline(project.id, asset, { hasManualTranscript: !!transcript });
      jobs.push(...runs.map((j) => ({ id: j.id, asset_id: j.asset_id, job_type: j.job_type, status: j.status })));
    }
    const capabilities = await getMediaCapabilities();
    return NextResponse.json({ jobs, capabilities, mockMode: capabilities.mode === "mock" }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/vanta/projects/[id]/process]", (e as Error).message);
    return NextResponse.json({ error: "Failed to enqueue processing jobs" }, { status: 500 });
  }
}
