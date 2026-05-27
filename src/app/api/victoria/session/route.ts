// /api/victoria/session
// POST: Create a new live call session (used by live audio mode)
// GET:  Retrieve session state by call_id
// PATCH: End a session (status: completed | abandoned)

import { NextRequest, NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/victoria/memory/session-store";
import { createDefaultSession } from "@/lib/victoria/types";
import { insertVictoriaCall, updateVictoriaCall } from "@/lib/victoria/db";
import { getProspectContextForSession } from "@/lib/victoria/agents/prospect-memory";
import { extractPostCallMemory } from "@/lib/victoria/agents/prospect-memory";
import type { StartCallRequest } from "@/lib/victoria/types";

// ─────────────────────────────────────────────────────────────
// POST /api/victoria/session — create a new session
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: StartCallRequest;

  try {
    body = await req.json() as StartCallRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.prospect?.name || !body.prospect?.company || !body.prospect?.vertical) {
    return NextResponse.json(
      { error: "prospect.name, prospect.company, and prospect.vertical are required" },
      { status: 400 }
    );
  }

  const call_id = `vc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session = createDefaultSession(
    call_id,
    body.prospect,
    body.rep_id,
    body.is_test_call ?? false
  );

  // Link prospect and pre-load memory context if prospect_id provided
  if (body.prospect_id) {
    session.prospect_id = body.prospect_id;

    // Load prior call context into prospect state (non-blocking on failure)
    try {
      const priorContext = await getProspectContextForSession(body.prospect_id);
      if (priorContext) {
        session.prospect.prior_call_summary = priorContext;
      }
    } catch (e) {
      console.error("[Victoria:Session] Prospect memory load failed:", e instanceof Error ? e.message : e);
    }
  }

  await saveSession(session);

  // Persist to Supabase (non-blocking — Redis is live source of truth)
  insertVictoriaCall({
    id: call_id,
    prospect_id: body.prospect_id ?? null,
    rep_id: body.rep_id ?? null,
    status: "active",
    phase: "rapport",
    is_test_call: body.is_test_call ?? false,
    outcome: null,
    close_probability_final: null,
    session_state: session as unknown as Record<string, unknown>,
    started_at: new Date().toISOString(),
    ended_at: null,
    duration_seconds: null,
  }).catch((e: unknown) => {
    console.error("[Victoria:Session] Supabase insert failed:", e instanceof Error ? e.message : e);
  });

  return NextResponse.json({
    call_id,
    session: {
      phase: session.phase,
      prospect: session.prospect,
      scores: session.scores,
      started_at: session.started_at,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// GET /api/victoria/session?call_id=xxx — retrieve session state
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get("call_id");

  if (!callId) {
    return NextResponse.json({ error: "call_id query param is required" }, { status: 400 });
  }

  const session = await getSession(callId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    call_id: session.call_id,
    status: session.status,
    phase: session.phase,
    chunk_count: session.current_chunk_index,
    scores: session.scores,
    discovery: {
      depth_score: session.discovery.depth_score,
      depth_rating: session.discovery.depth_rating,
      main_pain_stated: session.discovery.main_pain_stated,
      financial_impact_quantified: session.discovery.financial_impact_quantified,
      emotional_impact_expressed: session.discovery.emotional_impact_expressed,
      missing_areas: session.discovery.missing_areas,
    },
    objections: {
      raised_count: session.objections.raised.length,
      unresolved_count: session.objections.unresolved.length,
    },
    prospect: session.prospect,
    current_coaching: session.current_coaching,
    last_5_cards: session.coaching_history.slice(-5),
    updated_at: session.updated_at,
  });
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/victoria/session — end a session or update status
// ─────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  let body: { call_id: string; status: "completed" | "abandoned" };

  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.call_id || !body.status) {
    return NextResponse.json({ error: "call_id and status are required" }, { status: 400 });
  }

  const session = await getSession(body.call_id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  session.status = body.status;
  await saveSession(session);

  const now = new Date().toISOString();
  const durationSecs = Math.round((Date.now() - session.started_at) / 1000);
  updateVictoriaCall(body.call_id, {
    status: body.status,
    ended_at: now,
    duration_seconds: durationSecs,
    session_state: session as unknown as Record<string, unknown>,
  }).catch(console.error);

  // Trigger post-call memory extraction non-blocking when call completes
  if (body.status === "completed" && session.prospect_id) {
    extractPostCallMemory(session, session.prospect_id).catch((e: unknown) => {
      console.error("[Victoria:Session] Post-call extraction failed:", e instanceof Error ? e.message : e);
    });
  }

  return NextResponse.json({ success: true, call_id: body.call_id, status: body.status });
}
