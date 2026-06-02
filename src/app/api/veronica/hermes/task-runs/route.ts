// Server-side only — returns the latest Hermes runs linked to a specific operator task.
// Read-only. Used by the Operator Queue task card history panel.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const taskId = url.searchParams.get("task_id")?.trim();

  if (
    !taskId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)
  ) {
    return NextResponse.json({ runs: [] });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseServerClient() as any;
    if (!db) return NextResponse.json({ runs: [] });

    const { data, error } = await db
      .from("veronica_hermes_runs")
      .select("id, prompt, output, status, created_at, auto_skill_created")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) return NextResponse.json({ runs: [] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runs = (data ?? []).map((row: any) => ({
      id: row.id as string,
      prompt: typeof row.prompt === "string" ? row.prompt.slice(0, 120) : "",
      status: row.status as string,
      created_at: row.created_at as string,
      auto_skill_created: row.auto_skill_created === true,
      has_output: typeof row.output === "string" && row.output.length > 0,
    }));

    return NextResponse.json({ runs });
  } catch {
    return NextResponse.json({ runs: [] });
  }
}
