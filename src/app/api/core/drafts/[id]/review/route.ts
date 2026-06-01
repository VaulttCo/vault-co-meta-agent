// POST /api/core/drafts/[id]/review — approve / edit / reject a draft message.
// Role-guarded (canViewApprovals). Mock-safe.
//
// SAFETY (hard rule): this NEVER sends the message, replies to the lead, or
// touches GHL/CRM/workflows. Approving a draft only marks it approved INTERNALLY.
// Outbound delivery is intentionally NOT implemented in Phase 6.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { reviewDraft, type DraftAction } from "@/lib/core/agents/veronica/drafts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS: DraftAction[] = ["approve", "edit", "reject"];

interface RouteParams {
  params: Promise<{ id: string }>;
}
interface ReviewBody {
  action?: string;
  notes?: string;
  body?: string;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) {
    return NextResponse.json(
      { error: "Forbidden — operator role required to review drafts" },
      { status: 403 }
    );
  }
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  let body: ReviewBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const action = body.action as DraftAction;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: `Invalid action. One of: ${ACTIONS.join(", ")}` }, { status: 400 });
  }
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) || null : null;
  const newBody = typeof body.body === "string" ? body.body.slice(0, 2000) : null;

  try {
    const result = await reviewDraft(id, action, auth.userId, { notes, body: newBody });
    if (!result.ok) return NextResponse.json({ error: "Failed to apply review" }, { status: 500 });
    // Explicitly signal that approval does NOT send anything.
    return NextResponse.json({ ...result, sent: false });
  } catch (e) {
    console.error("[POST /api/core/drafts/[id]/review]", (e as Error).message);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
