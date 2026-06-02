// /api/victoria/kb/search
// GET: Full-text search over the knowledge base
// Server-side only.

import { NextRequest, NextResponse } from "next/server";
import { searchKBText } from "@/lib/victoria/db";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

// ─────────────────────────────────────────────────────────────
// GET /api/victoria/kb/search?q=roofing+objection&domain=objection_handling&vertical=roofing&limit=5
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const domain = req.nextUrl.searchParams.get("domain") ?? undefined;
  const vertical = req.nextUrl.searchParams.get("vertical") ?? undefined;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 5), 20);

  if (!q) {
    return NextResponse.json({ error: "q query parameter is required" }, { status: 400 });
  }

  const results = await searchKBText(q, { domain, vertical, limit });
  return NextResponse.json({ results, count: results.length, query: q });
}
