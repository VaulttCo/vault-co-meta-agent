// GET  /api/vanta/projects — list Vanta projects (+ asset counts). Role-guarded.
// POST /api/vanta/projects — create a project.
// Vanta plans and briefs only — nothing here publishes, launches, uploads, or contacts
// anyone. Mock-safe (in-memory when Supabase is unconfigured).

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaProjects, createVantaProject, getVantaAssets } from "@/lib/vanta/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewCreatives")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [projects, assets] = await Promise.all([getVantaProjects(200), getVantaAssets()]);
    const assetCounts: Record<string, number> = {};
    for (const a of assets) if (a.project_id) assetCounts[a.project_id] = (assetCounts[a.project_id] ?? 0) + 1;
    return NextResponse.json({ projects, assetCounts });
  } catch (e) {
    console.error("[GET /api/vanta/projects]", (e as Error).message);
    return NextResponse.json({ projects: [], assetCounts: {} });
  }
}

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canViewAiBuilder"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const project = await createVantaProject(body, auth.userId);
    if (!project) return NextResponse.json({ error: "title is required" }, { status: 400 });
    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/vanta/projects]", (e as Error).message);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
