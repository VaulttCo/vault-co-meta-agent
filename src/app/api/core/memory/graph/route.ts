// GET /api/core/memory/graph — Vault Memory knowledge graph (nodes + edges).
// READ-ONLY. Role-guarded. Falls back to the seeded mock graph when the
// vault_* tables or Supabase env vars are absent.

import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getGraph, isCoreDbAvailable } from "@/lib/core/memory/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const graph = await getGraph();
    return NextResponse.json({ graph, live: isCoreDbAvailable() });
  } catch (e) {
    console.error("[GET /api/core/memory/graph]", (e as Error).message);
    // Even on unexpected error, return an empty graph rather than 500 so the UI renders.
    return NextResponse.json({ graph: { nodes: [], edges: [] }, live: false });
  }
}
