// POST /api/vanta/projects/[id]/revise — "Tell Vanta what to change." Body:
// { asset_id, instruction }. Deterministic keyword parsing (no AI call) maps the
// instruction to bounded revision directives, records the preference in vanta_memory
// (the learning loop), and re-materializes the draft with the directive applied.
// Unrecognized instructions return 422 with the supported revisions — never a 500.
// Role-guarded like materialization. Writes scoped to vanta_* tables only.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaProject, getVantaAsset, addVantaMemoryRow } from "@/lib/vanta/db";
import { parseRevisionInstruction, encodeMemoryPattern } from "@/lib/vanta/revise";
import { materializeCreativePackage } from "@/lib/vanta/package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED = [
  "revise the hook", "make it faster", "add more captions",
  "make it more luxury", "cut the dead space", "change the music direction (or name a category)",
];

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
    const instruction = typeof body.instruction === "string" ? body.instruction.trim().slice(0, 500) : "";
    if (!instruction) return NextResponse.json({ error: "instruction is required" }, { status: 400 });

    const parsed = parseRevisionInstruction(instruction);
    if (!parsed) {
      return NextResponse.json({
        error: "Vanta didn't recognize that revision yet",
        supported: SUPPORTED,
      }, { status: 422 });
    }

    const result = await materializeCreativePackage(project, asset, {
      format: typeof body.format === "string" ? (body.format as never) : undefined,
      actor: auth.userId,
      revision: parsed.directives,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, missing: result.missing }, { status: 409 });
    }

    // Learning loop: the preference is recorded only once the revised draft actually
    // materialized — a failed revision must not leave an orphaned preference behind.
    const memory = await addVantaMemoryRow({
      memory_kind: parsed.memory_kind,
      industry: project.industry,
      pattern: encodeMemoryPattern(parsed),
      evidence: [`operator instruction: "${instruction}"`, `asset: ${asset.file_name}`],
      source: "human",
    });

    return NextResponse.json({
      applied: parsed.summary,
      learned: { id: memory.id, kind: memory.memory_kind, note: parsed.learned, created_at: memory.created_at },
      draft: { summary: result.summary, counts: result.counts, plan: result.plan },
    }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/vanta/projects/[id]/revise]", (e as Error).message);
    return NextResponse.json({ error: "Revision failed" }, { status: 500 });
  }
}
