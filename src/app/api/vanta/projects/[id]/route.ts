// GET /api/vanta/projects/[id] — project detail: assets, runs, latest analysis per asset.
// Role-guarded. Read composition only — nothing external is touched.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaProject, getVantaAssets, getVantaRuns, getLatestAnalysis, getVantaTranscript } from "@/lib/vanta/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewCreatives")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const project = await getVantaProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const [assets, runs] = await Promise.all([getVantaAssets(id), getVantaRuns(id, 50)]);
    const analyses: Record<string, unknown> = {};
    const transcripts: Record<string, { word_count: number; source: string } | null> = {};
    await Promise.all(assets.map(async (a) => {
      const [an, tx] = await Promise.all([getLatestAnalysis(a.id), getVantaTranscript(a.id)]);
      if (an) analyses[a.id] = an;
      transcripts[a.id] = tx ? { word_count: tx.word_count, source: tx.source } : null;
    }));
    return NextResponse.json({ project, assets, runs, analyses, transcripts });
  } catch (e) {
    console.error("[GET /api/vanta/projects/[id]]", (e as Error).message);
    return NextResponse.json({ project, assets: [], runs: [], analyses: {}, transcripts: {} });
  }
}
