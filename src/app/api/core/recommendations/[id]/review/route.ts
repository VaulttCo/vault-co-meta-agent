// POST /api/core/recommendations/[id]/review — apply a human review action.
// Role-guarded (canViewApprovals = operators). Mock-safe.
//
// SAFETY: this NEVER executes anything. A review only updates the
// recommendation's status in Vault Memory and appends an audit record.
// Approving a recommendation does not launch, send, publish, edit, or delete
// anything on any client/external system.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { reviewRecommendation } from "@/lib/core/memory/db";
import type { ReviewAction } from "@/lib/core/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS: ReviewAction[] = [
  "approve",
  "reject",
  "archive",
  "implement",
  "request_revision",
];

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
      { error: "Forbidden — operator role required to review recommendations" },
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
    return NextResponse.json(
      { error: `Invalid action. One of: ${ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  // ── Action-level governance ───────────────────────────────────────────────
  // canViewApprovals (admin + media_buyer) gates the route, but the privileged
  // actions are restricted further: approve needs approval authority, implement
  // is admin-only. reject/archive/request_revision stay at canViewApprovals.
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
    const result = await reviewRecommendation(id, action, auth.userId, notes);
    if (!result.ok) {
      return NextResponse.json({ error: "Failed to apply review" }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("[POST /api/core/recommendations/[id]/review]", (e as Error).message);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
