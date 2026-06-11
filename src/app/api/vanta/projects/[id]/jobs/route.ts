// GET /api/vanta/projects/[id]/jobs — processing job queue for a project: runs, status
// counts, and the media-capability snapshot (drives MOCK MODE labels in the UI).
// Role-guarded. Read-only composition — nothing external is touched.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaProject, getVantaRuns } from "@/lib/vanta/db";
import { getMediaCapabilities } from "@/lib/vanta/media/ffmpeg";

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
    const [runs, capabilities] = await Promise.all([getVantaRuns(project.id, 200), getMediaCapabilities()]);
    const counts = { queued: 0, claimed: 0, running: 0, succeeded: 0, failed: 0 };
    for (const r of runs) if (r.status in counts) counts[r.status as keyof typeof counts]++;
    return NextResponse.json({ jobs: runs, counts, capabilities, mockMode: capabilities.mode === "mock" });
  } catch (e) {
    console.error("[GET /api/vanta/projects/[id]/jobs]", (e as Error).message);
    const capabilities = { ffmpeg: false, ffprobe: false, mediaRoot: null, mode: "mock" as const };
    return NextResponse.json({ jobs: [], counts: { queued: 0, claimed: 0, running: 0, succeeded: 0, failed: 0 }, capabilities, mockMode: true });
  }
}
