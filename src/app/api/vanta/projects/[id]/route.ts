// GET /api/vanta/projects/[id] — project detail: assets, runs, latest analysis per asset,
// plus the V1.3 footage-intelligence artifacts (transcript segments, scenes, clips, hooks).
// Role-guarded. Read composition only — nothing external is touched.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import {
  getVantaProject, getVantaAssets, getVantaRuns, getLatestAnalysis, getVantaTranscript,
  getVantaScenes, getVantaClips, getVantaHooksByAsset,
} from "@/lib/vanta/db";
import { redactClaimedBy } from "@/lib/vanta/worker-auth";

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
    const transcripts: Record<string, { word_count: number; source: string; segment_count: number; segments: unknown[] } | null> = {};
    const scenes: Record<string, unknown[]> = {};
    const clips: Record<string, unknown[]> = {};
    const hooks: Record<string, unknown[]> = {};
    await Promise.all(assets.map(async (a) => {
      const [an, tx, sc, cl, hk] = await Promise.all([
        getLatestAnalysis(a.id), getVantaTranscript(a.id),
        getVantaScenes(a.id), getVantaClips(a.id), getVantaHooksByAsset(a.id),
      ]);
      if (an) analyses[a.id] = an;
      // Trimmed DTOs — bounded text per item so a 100k-char manual transcript can't
      // balloon the payload.
      transcripts[a.id] = tx
        ? {
            word_count: tx.word_count, source: tx.source, segment_count: tx.segments.length,
            segments: tx.segments.slice(0, 60).map((s) => ({ start_ms: s.start_ms, end_ms: s.end_ms, text: String(s.text ?? "").slice(0, 300) })),
          }
        : null;
      scenes[a.id] = sc.slice(0, 60);
      clips[a.id] = cl.slice(0, 60).map((c) => ({ ...c, transcript_excerpt: c.transcript_excerpt?.slice(0, 200) ?? null }));
      hooks[a.id] = hk.slice(0, 10).map((h) => ({ ...h, hook_text: h.hook_text.slice(0, 300), rationale: h.rationale?.slice(0, 600) ?? null }));
    }));
    return NextResponse.json({
      project, assets,
      runs: runs.map((r) => ({ ...r, claimed_by: redactClaimedBy(r.claimed_by) })),
      analyses, transcripts, scenes, clips, hooks,
    });
  } catch (e) {
    console.error("[GET /api/vanta/projects/[id]]", (e as Error).message);
    return NextResponse.json({ project, assets: [], runs: [], analyses: {}, transcripts: {}, scenes: {}, clips: {}, hooks: {} });
  }
}
