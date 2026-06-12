// POST /api/vanta/projects/[id]/package — materialize the measured creative package for
// one asset (body: { asset_id, format? }). Requires transcript segments + scenes; when
// either is missing returns a clean 409 listing what to run first (never a 500).
// Deterministic, no AI/media tools/network — writes scoped to vanta_* tables only.
// Nothing is rendered, published, posted, or sent anywhere. Role-guarded like analyze.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaProject, getVantaAsset } from "@/lib/vanta/db";
import { materializeCreativePackage } from "@/lib/vanta/package";

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
    if (typeof body.asset_id !== "string") return NextResponse.json({ error: "asset_id is required" }, { status: 400 });
    const asset = await getVantaAsset(body.asset_id);
    if (!asset || asset.project_id !== project.id) {
      return NextResponse.json({ error: "Asset not found on this project" }, { status: 404 });
    }

    const result = await materializeCreativePackage(project, asset, {
      format: typeof body.format === "string" ? (body.format as never) : undefined,
      actor: auth.userId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, missing: result.missing }, { status: 409 });
    }
    return NextResponse.json({ summary: result.summary, counts: result.counts, plan: result.plan }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/vanta/projects/[id]/package]", (e as Error).message);
    return NextResponse.json({ error: "Materialization failed" }, { status: 500 });
  }
}
