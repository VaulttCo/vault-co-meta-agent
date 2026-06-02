// POST /api/victoria/session/[call_id]/review
// Generates a comprehensive post-call review for a completed Victoria session.
// Called by the client immediately after handleEndCall. No latency SLA — can take 10–30s.
// Server-side only.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/victoria/memory/session-store";
import { runPostCallReview } from "@/lib/victoria/agents/post-call-review";
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

  if (session.transcript.length === 0) {
    return NextResponse.json(
      { error: "Cannot generate review — no transcript data recorded" },
      { status: 422 }
    );
  }

  try {
    const review = await runPostCallReview(session);

    return NextResponse.json({
      review,
      meta: {
        processing_time_ms: review.processing_time_ms,
        model: review.model,
        mock_mode: review.mock_mode,
      },
    });
  } catch (err) {
    console.error(
      "[Victoria:Review] Post-call review failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "Failed to generate post-call review" },
      { status: 500 }
    );
  }
}
