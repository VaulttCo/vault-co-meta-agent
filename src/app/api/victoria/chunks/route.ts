// POST /api/victoria/chunks
// Receives transcript chunks from the live audio transcription layer.
// This is the real-time path — called every 5-15 seconds during a live call.
// Returns a coaching card immediately after processing.

import { NextRequest, NextResponse } from "next/server";
import { processTranscriptChunk } from "@/lib/victoria/agents/orchestrator";
import { getSession } from "@/lib/victoria/memory/session-store";
import type { SubmitChunkRequest } from "@/lib/victoria/types";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: SubmitChunkRequest;

  try {
    body = await req.json() as SubmitChunkRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { call_id, speaker, text } = body;

  if (!call_id || !speaker || !text) {
    return NextResponse.json(
      { error: "call_id, speaker, and text are required" },
      { status: 400 }
    );
  }

  if (!["rep", "prospect"].includes(speaker)) {
    return NextResponse.json(
      { error: "speaker must be 'rep' or 'prospect'" },
      { status: 400 }
    );
  }

  if (text.trim().length === 0) {
    return NextResponse.json({ coaching_card: null, skipped: true }, { status: 200 });
  }

  // Verify session exists
  const session = await getSession(call_id);
  if (!session) {
    return NextResponse.json({ error: `Session not found: ${call_id}` }, { status: 404 });
  }

  if (session.status !== "active") {
    return NextResponse.json(
      { error: `Session is ${session.status} — cannot submit chunks` },
      { status: 409 }
    );
  }

  try {
    const result = await processTranscriptChunk(body);

    return NextResponse.json({
      call_id: result.call_id,
      chunk_index: result.chunk_index,
      chunk_text: text,           // Echo back for client transcript feed
      chunk_speaker: speaker,     // Echo back for client transcript feed
      coaching_card: result.coaching_card,
      session_phase: result.session_phase,
      session_scores: result.session_scores,
      discovery_depth: result.agent_outputs.discovery?.depth_score ?? 0,
      deal_risk: result.agent_outputs.deal_risk ?? null,
      emotional_signals: result.agent_outputs.emotional_signals ?? null,
      rep_performance: result.agent_outputs.rep_performance ?? null,
      new_timeline_events: result.new_timeline_events ?? [],
      momentum: result.momentum ?? null,
      processing_time_ms: result.processing_time_ms,
    });
  } catch (err) {
    console.error("[Victoria:Chunks] Processing failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Failed to process transcript chunk", coaching_card: null },
      { status: 500 }
    );
  }
}
