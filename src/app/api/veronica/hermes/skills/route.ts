// Server-side only — Hermes skills library endpoint.
// GET: returns saved skills. Default limit 5; pass ?limit=N (max 100) for more.
// POST: manually save a skill (auto_created: false).

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

export async function POST(req: NextRequest) {
  let body: { name?: string; category?: string; description?: string; instructions?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = body.name?.trim().slice(0, 100);
  const instructions = body.instructions?.trim();
  if (!name || !instructions) {
    return NextResponse.json({ error: "name and instructions are required" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseServerClient() as any;
    if (!db) return NextResponse.json({ success: true, mockMode: true, id: `mock-${Date.now()}` });

    const { data, error } = await db
      .from("veronica_hermes_skills")
      .insert({
        name,
        category: body.category?.trim() || "Operator Playbook",
        description: body.description?.trim().slice(0, 300) || null,
        instructions,
        created_by: "operator",
        auto_created: false,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: "Failed to save skill" }, { status: 500 });
    return NextResponse.json({ success: true, id: (data as { id: string }).id });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
