// Server-side only — Hermes skills library endpoint.
// GET: returns latest 5 saved skills for the Veronica overview page.

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseServerClient() as any;
    if (!db) return NextResponse.json({ skills: [] });
    const { data, error } = await db
      .from("veronica_hermes_skills")
      .select("id, name, description, category, instructions, source_run_id, created_at, created_by, last_used_at, usage_count, auto_created")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) return NextResponse.json({ skills: [] });
    return NextResponse.json({ skills: data ?? [] });
  } catch {
    return NextResponse.json({ skills: [] });
  }
}
