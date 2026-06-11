// POST /api/vanta/projects/[id]/analyze — run the Vanta intelligence-plane analysis for
// one asset of this project. Real Anthropic structured call when ANTHROPIC_API_KEY is
// present; deterministic mock fallback otherwise (the app must always function).
//
// PLANNING ONLY: produces strategy/clips/hooks/color/edit-plan/captions/thumbnails/
// sound-design/QA artifacts and persists them as a succeeded vanta_agent_runs row.
// Nothing is rendered, published, launched, uploaded, or sent anywhere.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaProject, getVantaAsset, getVantaTranscript, persistVantaAnalysis, getMemoryWinners } from "@/lib/vanta/db";
import { runVantaAnalysis } from "@/lib/vanta/analyze";
import { isVantaAiAvailable } from "@/lib/vanta/ai";
import { VANTA_FORMATS, type VantaFormat } from "@/lib/vanta/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90; // the composite creative call can take ~60s

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

  const body = await req.json().catch(() => ({}));
  const assetId = typeof body.asset_id === "string" ? body.asset_id : null;
  if (!assetId) return NextResponse.json({ error: "asset_id is required" }, { status: 400 });

  const asset = await getVantaAsset(assetId);
  if (!asset || asset.project_id !== project.id) {
    return NextResponse.json({ error: "Asset not found on this project" }, { status: 404 });
  }

  const format: VantaFormat = (VANTA_FORMATS as readonly string[]).includes(body.format) ? body.format : "short_916";
  const humanNotes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : null;

  try {
    const [transcript, memoryWinners] = await Promise.all([
      getVantaTranscript(asset.id),
      getMemoryWinners(project.industry),
    ]);
    const analysis = await runVantaAnalysis(project, asset, transcript, { format, humanNotes, memoryWinners });
    const run = await persistVantaAnalysis(project, asset.id, analysis, auth.userId);
    return NextResponse.json({
      analysis,
      runId: run.id,
      provider: analysis.mock ? "mock" : "anthropic",
      aiAvailable: isVantaAiAvailable(),
    });
  } catch (e) {
    console.error("[POST /api/vanta/projects/[id]/analyze]", (e as Error).message);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
