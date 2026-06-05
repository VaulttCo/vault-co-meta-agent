// GET  /api/core/actions  — list actions (DTOs) + counts. Role-guarded.
// POST /api/core/actions  — create an action (admin / internal). Validated.
// Internal data only: no external calls, no raw payloads/credentials/PII returned.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getActions, getActionCounts, toActionDTO } from "@/lib/core/actions/db";
import { createAction } from "@/lib/core/actions/create-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const [actions, counts] = await Promise.all([getActions(500), getActionCounts()]);
    return NextResponse.json({ actions: actions.map(toActionDTO), counts });
  } catch (e) {
    console.error("[GET /api/core/actions]", (e as Error).message);
    return NextResponse.json({ actions: [], counts: null });
  }
}

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Manual action creation is internal — admin / integration-manager only.
  if (!(auth.role === "admin" || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    // Manual creation: attribute authorship to the human, never spoof an agent. The
    // action is filed under the dedicated `manual` lane regardless of any submitted
    // agent_id, so we inject it here — a manual create needs no throwaway agent id.
    const result = await createAction(
      { ...body, agent_id: "manual", source_type: "manual" },
      { origin: "manual", actor: auth.userId },
    );
    if (!result.created || !result.action) {
      return NextResponse.json({ error: result.reason ?? "Could not create action" }, { status: 400 });
    }
    return NextResponse.json({ action: toActionDTO(result.action) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/core/actions]", (e as Error).message);
    return NextResponse.json({ error: "Failed to create action" }, { status: 500 });
  }
}
