// Victoria — Typed Supabase DB helpers
// Server-side only. Keeps Victoria table operations isolated from the main
// Database type so they don't conflict when lib/supabase/types.ts is regenerated.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  VictoriaCallRow,
  VictoriaTranscriptChunkRow,
  VictoriaCoachingEventRow,
  VictoriaObjectionEventRow,
  VictoriaAgentOutputRow,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Victoria DB client — typed escape hatch for Victoria tables
// Uses the same service-role Supabase client; just bypasses the shared
// Database generic with explicit row types so Victoria tables are safe to use
// before schema generation is re-run.
// ─────────────────────────────────────────────────────────────

function getVictoriaDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseServerClient() as any;
}

// ─────────────────────────────────────────────────────────────
// Calls
// ─────────────────────────────────────────────────────────────

export async function insertVictoriaCall(
  data: Omit<VictoriaCallRow, "created_at">
): Promise<void> {
  const db = getVictoriaDb();
  if (!db) return;
  const { error } = await db.from("victoria_calls").insert({
    id: data.id,
    prospect_id: data.prospect_id,
    rep_id: data.rep_id,
    status: data.status,
    phase: data.phase,
    is_test_call: data.is_test_call,
    outcome: data.outcome,
    session_state: data.session_state,
    started_at: data.started_at,
  });
  if (error) console.error("[Victoria:DB] insertVictoriaCall:", error.message);
}

export async function updateVictoriaCall(
  callId: string,
  data: Partial<Pick<VictoriaCallRow, "status" | "phase" | "outcome" | "session_state" | "ended_at" | "duration_seconds">>
): Promise<void> {
  const db = getVictoriaDb();
  if (!db) return;
  const { error } = await db.from("victoria_calls").update(data).eq("id", callId);
  if (error) console.error("[Victoria:DB] updateVictoriaCall:", error.message);
}

// ─────────────────────────────────────────────────────────────
// Transcript chunks
// ─────────────────────────────────────────────────────────────

export async function insertTranscriptChunk(
  data: Omit<VictoriaTranscriptChunkRow, "id" | "created_at">
): Promise<void> {
  const db = getVictoriaDb();
  if (!db) return;
  const { error } = await db.from("victoria_transcript_chunks").insert({
    call_id: data.call_id,
    chunk_index: data.chunk_index,
    speaker: data.speaker,
    text: data.text,
    started_at_seconds: data.started_at_seconds,
    ended_at_seconds: data.ended_at_seconds,
    contains_objection: data.contains_objection,
    contains_buying_signal: data.contains_buying_signal,
    contains_emotional_shift: data.contains_emotional_shift,
  });
  if (error) console.error("[Victoria:DB] insertTranscriptChunk:", error.message);
}

// ─────────────────────────────────────────────────────────────
// Coaching events
// ─────────────────────────────────────────────────────────────

export async function insertCoachingEvent(
  data: Omit<VictoriaCoachingEventRow, "id" | "created_at" | "acknowledged" | "rep_rating">
): Promise<void> {
  const db = getVictoriaDb();
  if (!db) return;
  const { error } = await db.from("victoria_coaching_events").insert({
    call_id: data.call_id,
    chunk_index: data.chunk_index,
    coaching_type: data.coaching_type,
    priority: data.priority,
    headline: data.headline,
    primary_action: data.primary_action,
    why: data.why,
    suggested_language: data.suggested_language,
    what_not_to_do: data.what_not_to_do,
    context_tags: data.context_tags,
    confidence: data.confidence,
    source_agent: data.source_agent,
  });
  if (error) console.error("[Victoria:DB] insertCoachingEvent:", error.message);
}

// ─────────────────────────────────────────────────────────────
// Objection events
// ─────────────────────────────────────────────────────────────

export async function insertObjectionEvent(
  data: Omit<VictoriaObjectionEventRow, "id" | "created_at">
): Promise<void> {
  const db = getVictoriaDb();
  if (!db) return;
  const { error } = await db.from("victoria_objection_events").insert({
    call_id: data.call_id,
    prospect_id: data.prospect_id,
    chunk_index: data.chunk_index,
    raw_text: data.raw_text,
    category: data.category,
    hidden_meaning: data.hidden_meaning,
    emotional_driver: data.emotional_driver,
    reframe_recommended: data.reframe_recommended,
    follow_up_question: data.follow_up_question,
    resolution: data.resolution,
  });
  if (error) console.error("[Victoria:DB] insertObjectionEvent:", error.message);
}

// ─────────────────────────────────────────────────────────────
// Agent outputs
// ─────────────────────────────────────────────────────────────

export async function insertAgentOutput(
  data: Omit<VictoriaAgentOutputRow, "id" | "created_at">
): Promise<void> {
  const db = getVictoriaDb();
  if (!db) return;
  const { error } = await db.from("victoria_agent_outputs").insert({
    call_id: data.call_id,
    agent_name: data.agent_name,
    chunk_index: data.chunk_index,
    input_tokens: data.input_tokens,
    output_tokens: data.output_tokens,
    latency_ms: data.latency_ms,
    model_used: data.model_used,
    output: data.output,
  });
  if (error) console.error("[Victoria:DB] insertAgentOutput:", error.message);
}
