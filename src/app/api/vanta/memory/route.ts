// GET /api/vanta/memory — active learned patterns ("What Vanta learned"). Read-only,
// role-guarded. The machine-readable directive suffix is stripped before display.

import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaMemory } from "@/lib/vanta/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewCreatives")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await getVantaMemory(undefined, 50);
    return NextResponse.json({
      memory: rows.map((m) => ({
        id: m.id,
        kind: m.memory_kind,
        industry: m.industry,
        note: m.pattern.split("::directives=")[0].replace(/^\[auto-editor\]\s*/, "").trim(),
        source: m.source,
        confidence: m.confidence,
        created_at: m.created_at,
      })),
    });
  } catch (e) {
    console.error("[GET /api/vanta/memory]", (e as Error).message);
    return NextResponse.json({ memory: [] });
  }
}
