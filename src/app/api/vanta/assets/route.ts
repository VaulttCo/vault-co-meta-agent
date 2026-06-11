// GET  /api/vanta/assets?project_id= — list assets. Role-guarded.
// POST /api/vanta/assets — register an asset (metadata + optional manual transcript).
// Registration stores metadata + sanitized text only. File bytes upload to Supabase
// Storage via the worker/signed-URL path (Phase 1.2) — this route never fetches the
// source URL and never uploads anywhere external.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaAssets, registerVantaAsset, getVantaProject } from "@/lib/vanta/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewCreatives")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const projectId = req.nextUrl.searchParams.get("project_id") ?? undefined;
  try {
    const assets = await getVantaAssets(projectId);
    return NextResponse.json({ assets });
  } catch (e) {
    console.error("[GET /api/vanta/assets]", (e as Error).message);
    return NextResponse.json({ assets: [] });
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
    if (typeof body.project_id !== "string") return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    const project = await getVantaProject(body.project_id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const result = await registerVantaAsset(body, auth.userId);
    if (!result) return NextResponse.json({ error: "file_name is required" }, { status: 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error("[POST /api/vanta/assets]", (e as Error).message);
    return NextResponse.json({ error: "Failed to register asset" }, { status: 500 });
  }
}
