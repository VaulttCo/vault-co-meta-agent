// /api/victoria/prospects/[id]/memory-update
// POST: Trigger post-call memory extraction for a completed call
// Server-side only.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/victoria/memory/session-store";
import { extractPostCallMemory } from "@/lib/victoria/agents/prospect-memory";

// ─────────────────────────────────────────────────────────────
// POST /api/victoria/prospects/:id/memory-update
// Body: { call_id: string }
//
// Manually triggers post-call extraction for a given session.
// Normally this is triggered automatically in the PATCH /session route
// when status is set to "completed". Use this endpoint to re-run
// extraction or trigger it for sessions that completed before this
// feature was implemented.
// ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: prospectId } = await params;

  let body: { call_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.call_id) {
    return NextResponse.json({ error: "call_id is required" }, { status: 400 });
  }

  const session = await getSession(body.call_id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const extraction = await extractPostCallMemory(session, prospectId);
    return NextResponse.json({
      success: true,
      prospectId,
      call_id: body.call_id,
      extraction: {
        new_pain_points: extraction.new_pain_points,
        new_objections: extraction.new_objections,
        buying_signals_detected: extraction.buying_signals_detected,
        urgency_level: extraction.urgency_level,
        deal_stage: extraction.deal_stage,
        next_step: extraction.next_step,
        next_call_briefing: extraction.next_call_briefing,
      },
    });
  } catch (err) {
    console.error("[Victoria:MemoryUpdate] Extraction failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Memory extraction failed", detail: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
