// POST /api/victoria/session/[call_id]/action-plan
// Generates a complete action plan (follow-up kit, CRM sync, tasks, urgency strategy)
// for a completed Victoria session. Called by the client in parallel with review generation.
// Server-side only.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/victoria/memory/session-store";
import { runActionEngine } from "@/lib/victoria/agents/action-engine";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ call_id: string }> }
) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { call_id } = await params;

  if (!call_id) {
    return NextResponse.json({ error: "call_id is required" }, { status: 400 });
  }

  const session = await getSession(call_id);
  if (!session) {
    return NextResponse.json({ error: `Session not found: ${call_id}` }, { status: 404 });
  }

  try {
    const action_plan = await runActionEngine(session);

    return NextResponse.json({
      action_plan,
      meta: {
        processing_time_ms: action_plan.processing_time_ms,
        model: action_plan.model,
        mock_mode: action_plan.mock_mode,
        follow_up_type: action_plan.follow_up_type,
        deal_health: action_plan.deal_health,
      },
    });
  } catch (err) {
    console.error(
      "[Victoria:ActionPlan] Action engine failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "Failed to generate action plan" },
      { status: 500 }
    );
  }
}
