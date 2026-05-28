// Server-side only — Hermes skills library endpoint.
// GET: returns saved skills. Default limit 5; pass ?limit=N (max 100) for more.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Number(limitParam) || 5, 100);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseServerClient() as any;
    if (!db) return NextResponse.json({ skills: [] });
    const { data, error } = await db
      .from("veronica_hermes_skills")
      .select("id, name, description, category, instructions, source_run_id, created_at, created_by, last_used_at, usage_count, auto_created")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return NextResponse.json({ skills: [] });
    return NextResponse.json({ skills: data ?? [] });
  } catch {
    return NextResponse.json({ skills: [] });
  }
}
