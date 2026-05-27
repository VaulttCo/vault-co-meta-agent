// POST /api/victoria/test-call
// Manual transcript simulation — create a test session and/or submit transcript chunks.
// Used for brain validation before live audio is connected.
// This is a TEST endpoint — no auth required in dev. Production should gate this.

import { NextRequest, NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/victoria/memory/session-store";
import { processTranscriptChunk } from "@/lib/victoria/agents/orchestrator";
import { createDefaultSession } from "@/lib/victoria/types";
import { insertVictoriaCall, updateVictoriaCall } from "@/lib/victoria/db";
import type { StartCallRequest, SubmitChunkRequest } from "@/lib/victoria/types";

// ─────────────────────────────────────────────────────────────
// POST /api/victoria/test-call
// Accepts two action types:
//   { action: "start", prospect: {...} }         → creates a new test session
//   { action: "chunk", call_id, speaker, text }  → processes a transcript chunk
//   { action: "end", call_id }                   → ends the session
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action as string | undefined;

  // ── Start a new test call session ──────────────────────────

  if (action === "start") {
    const startReq = body as unknown as StartCallRequest & { action: string };

    if (!startReq.prospect?.name || !startReq.prospect?.company || !startReq.prospect?.vertical) {
      return NextResponse.json(
        { error: "prospect.name, prospect.company, and prospect.vertical are required" },
        { status: 400 }
      );
    }

    const call_id = `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const session = createDefaultSession(
      call_id,
      startReq.prospect,
      startReq.rep_id,
      true // is_test_call
    );

    // Save session to Redis (with in-memory fallback)
    await saveSession(session);

    // Create a record in Supabase (non-blocking)
    insertVictoriaCall({
      id: call_id,
      prospect_id: null,
      rep_id: startReq.rep_id ?? null,
      status: "active",
      phase: "rapport",
      is_test_call: true,
      outcome: null,
      close_probability_final: null,
      session_state: session as unknown as Record<string, unknown>,
      started_at: new Date().toISOString(),
      ended_at: null,
      duration_seconds: null,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      call_id,
      session: {
        phase: session.phase,
        prospect: session.prospect,
        scores: session.scores,
        discovery_depth: session.discovery.depth_score,
      },
      message: `Test call started. Use action: "chunk" to submit transcript chunks.`,
      example_chunk: {
        action: "chunk",
        call_id,
        speaker: "prospect",
        text: "Yeah honestly our leads have been really inconsistent this year. Some months are great, other months it's just dead.",
      },
    });
  }

  // ── Submit a transcript chunk ──────────────────────────────

  if (action === "chunk") {
    const chunkReq = body as { action: string; call_id?: string; speaker?: string; text?: string; started_at_seconds?: number };

    if (!chunkReq.call_id) {
      return NextResponse.json({ error: "call_id is required" }, { status: 400 });
    }
    if (!chunkReq.speaker || !["rep", "prospect"].includes(chunkReq.speaker)) {
      return NextResponse.json({ error: "speaker must be 'rep' or 'prospect'" }, { status: 400 });
    }
    if (!chunkReq.text || chunkReq.text.trim().length === 0) {
      return NextResponse.json({ error: "text is required and cannot be empty" }, { status: 400 });
    }

    // Check session exists
    const existing = await getSession(chunkReq.call_id);
    if (!existing) {
      return NextResponse.json(
        { error: `Session not found: ${chunkReq.call_id}. Start a session first with action: "start"` },
        { status: 404 }
      );
    }

    const request: SubmitChunkRequest = {
      call_id: chunkReq.call_id,
      speaker: chunkReq.speaker as "rep" | "prospect",
      text: chunkReq.text,
      started_at_seconds: chunkReq.started_at_seconds,
    };

    const start = Date.now();
    const result = await processTranscriptChunk(request);

    return NextResponse.json({
      success: true,
      call_id: result.call_id,
      chunk_index: result.chunk_index,
      coaching_card: result.coaching_card,
      agent_outputs: {
        discovery: result.agent_outputs.discovery
          ? {
              assessment: result.agent_outputs.discovery.assessment,
              next_best_question: result.agent_outputs.discovery.next_best_question,
              question_framework: result.agent_outputs.discovery.question_framework,
              depth_score: result.agent_outputs.discovery.depth_score,
              missing_areas: result.agent_outputs.discovery.missing_areas,
              warning: result.agent_outputs.discovery.warning ?? null,
              pain_summary: result.agent_outputs.discovery.pain_summary,
            }
          : null,
        objection_intel: result.agent_outputs.objection_intel
          ? {
              category: result.agent_outputs.objection_intel.category,
              hidden_meaning: result.agent_outputs.objection_intel.hidden_meaning,
              emotional_driver: result.agent_outputs.objection_intel.emotional_driver,
              reframe: result.agent_outputs.objection_intel.reframe_strategy.suggested_language,
              follow_up_question: result.agent_outputs.objection_intel.follow_up_question,
              what_not_to_say: result.agent_outputs.objection_intel.what_not_to_say,
            }
          : null,
      },
      session: {
        phase: result.session_phase,
        scores: result.session_scores,
        discovery_depth: result.agent_outputs.discovery?.depth_score ?? 0,
      },
      processing_time_ms: result.processing_time_ms,
    });
  }

  // ── End a session ──────────────────────────────────────────

  if (action === "end") {
    const endReq = body as { action: string; call_id?: string };
    if (!endReq.call_id) {
      return NextResponse.json({ error: "call_id is required" }, { status: 400 });
    }

    const session = await getSession(endReq.call_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    session.status = "completed";
    await saveSession(session);

    // Update Supabase record (non-blocking)
    const now = new Date().toISOString();
    const durationSecs = Math.round((Date.now() - session.started_at) / 1000);
    updateVictoriaCall(endReq.call_id, {
      status: "completed",
      ended_at: now,
      duration_seconds: durationSecs,
      session_state: session as unknown as Record<string, unknown>,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      call_id: endReq.call_id,
      summary: {
        total_chunks: session.current_chunk_index,
        coaching_cards_generated: session.coaching_history.length,
        final_discovery_depth: session.discovery.depth_score,
        final_phase: session.phase,
        objections_raised: session.objections.raised.length,
        scores: session.scores,
      },
    });
  }

  return NextResponse.json(
    { error: "action must be 'start', 'chunk', or 'end'" },
    { status: 400 }
  );
}

// ─────────────────────────────────────────────────────────────
// GET /api/victoria/test-call?call_id=xxx
// Retrieve current session state for debugging
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get("call_id");
  if (!callId) {
    return NextResponse.json({ error: "call_id query param required" }, { status: 400 });
  }

  const session = await getSession(callId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    call_id: session.call_id,
    phase: session.phase,
    status: session.status,
    chunk_count: session.current_chunk_index,
    scores: session.scores,
    discovery: session.discovery,
    objections: {
      raised_count: session.objections.raised.length,
      unresolved_count: session.objections.unresolved.length,
      raised: session.objections.raised,
    },
    prospect: session.prospect,
    current_coaching: session.current_coaching,
    coaching_history: session.coaching_history.slice(-5), // Last 5 cards
    transcript: session.transcript.slice(-3), // Last 3 chunks for debugging
  });
}
