// POST /api/core/proposals/[id]/review — apply a human review to a system proposal.
// Role-guarded (canViewApprovals). Mock-safe.
//
// SAFETY: a review only updates the proposal's status in Vault Memory. Approving
// a proposal does NOT build anything — it signals intent for a human/engineer to
// act. Nothing executes automatically.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { reviewProposal } from "@/lib/core/collab/db";
import type { ReviewAction } from "@/lib/core/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS: ReviewAction[] = ["approve", "reject", "archive", "implement", "request_revision"];

interface RouteParams {
  params: Promise<{ id: string }>;
}
interface ReviewBody {
  action?: string;
  notes?: string;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewApprovals")) {
    return NextResponse.json(
      { error: "Forbidden — operator role required to review proposals" },
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
  const action = body.action as ReviewAction;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: `Invalid action. One of: ${ACTIONS.join(", ")}` }, { status: 400 });
  }

  // ── Action-level governance ───────────────────────────────────────────────
  // approve needs approval authority; implement (acting on a system proposal) is
  // admin-only. reject/archive/request_revision stay at canViewApprovals.
  if (action === "approve" && !(auth.role === "admin" || can(auth.role, "canApproveCampaigns"))) {
    return NextResponse.json(
      { error: "Forbidden — approval authority required to approve" },
      { status: 403 }
    );
  }
  if (action === "implement" && auth.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admin role required to implement" },
      { status: 403 }
    );
  }

  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) || null : null;

  try {
    const result = await reviewProposal(id, action, auth.userId, notes);
    if (!result.ok) return NextResponse.json({ error: "Failed to apply review" }, { status: 500 });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[POST /api/core/proposals/[id]/review]", (e as Error).message);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
