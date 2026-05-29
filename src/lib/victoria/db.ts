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
  VictoriaProspectRow,
  VictoriaKBEntryRow,
  KBSearchResult,
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

// ─────────────────────────────────────────────────────────────
// Knowledge Base
// ─────────────────────────────────────────────────────────────

export async function insertKBEntry(
  data: Omit<VictoriaKBEntryRow, "id" | "created_at" | "updated_at">
): Promise<string | null> {
  const db = getVictoriaDb();
  if (!db) return null;
  const { data: row, error } = await db
    .from("victoria_knowledge_base")
    .insert({
      domain: data.domain,
      category: data.category ?? null,
      tags: data.tags ?? [],
      title: data.title,
      content: data.content,
      vertical_relevance: data.vertical_relevance ?? [],
      objection_type: data.objection_type ?? null,
      call_phase: data.call_phase ?? [],
      is_active: data.is_active ?? true,
    })
    .select("id")
    .single();
  if (error) { console.error("[Victoria:DB] insertKBEntry:", error.message); return null; }
  return (row as { id: string } | null)?.id ?? null;
}

export async function deleteKBEntry(id: string): Promise<void> {
  const db = getVictoriaDb();
  if (!db) return;
  const { error } = await db.from("victoria_knowledge_base").delete().eq("id", id);
  if (error) console.error("[Victoria:DB] deleteKBEntry:", error.message);
}

export async function listKBEntries(
  domain?: string,
  limit = 50
): Promise<KBSearchResult[]> {
  const db = getVictoriaDb();
  if (!db) return [];
  let q = db
    .from("victoria_knowledge_base")
    .select("id,domain,category,title,content,tags,vertical_relevance,call_phase")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (domain) q = q.eq("domain", domain);
  const { data, error } = await q;
  if (error) { console.error("[Victoria:DB] listKBEntries:", error.message); return []; }
  return (data ?? []) as KBSearchResult[];
}

export async function searchKBText(
  query: string,
  options: { domain?: string; vertical?: string; limit?: number } = {}
): Promise<KBSearchResult[]> {
  const db = getVictoriaDb();
  if (!db || !query.trim()) return [];
  const { domain, vertical, limit = 5 } = options;

  // Build query — ilike across title + content, plus array contains for vertical
  let q = db
    .from("victoria_knowledge_base")
    .select("id,domain,category,title,content,tags,vertical_relevance,call_phase")
    .eq("is_active", true)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .limit(limit);

  if (domain) q = q.eq("domain", domain);
  if (vertical) q = q.contains("vertical_relevance", [vertical]);

  const { data, error } = await q;
  if (error) { console.error("[Victoria:DB] searchKBText:", error.message); return []; }
  return (data ?? []) as KBSearchResult[];
}

// ─────────────────────────────────────────────────────────────
// Prospects
// ─────────────────────────────────────────────────────────────

export async function insertProspect(
  data: Omit<VictoriaProspectRow, "id" | "created_at" | "updated_at" | "total_calls">
): Promise<string | null> {
  const db = getVictoriaDb();
  if (!db) return null;
  const { data: row, error } = await db
    .from("victoria_prospects")
    .insert({
      name: data.name,
      company: data.company ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      vertical: data.vertical ?? null,
      location_city: data.location_city ?? null,
      location_state: data.location_state ?? null,
      business_size: data.business_size ?? null,
      years_in_business: data.years_in_business ?? null,
      personality_type: data.personality_type ?? null,
      communication_style: data.communication_style ?? null,
      known_pain_points: data.known_pain_points ?? [],
      known_objections: data.known_objections ?? [],
      known_triggers: data.known_triggers ?? [],
      known_resistances: data.known_resistances ?? [],
      primary_fear: data.primary_fear ?? null,
      primary_desire: data.primary_desire ?? null,
      deal_stage: data.deal_stage ?? "prospect",
      last_contact: data.last_contact ?? null,
      next_step: data.next_step ?? null,
      urgency_level: data.urgency_level ?? "low",
    })
    .select("id")
    .single();
  if (error) { console.error("[Victoria:DB] insertProspect:", error.message); return null; }
  return (row as { id: string } | null)?.id ?? null;
}

export async function updateProspect(
  id: string,
  data: Partial<Omit<VictoriaProspectRow, "id" | "created_at" | "updated_at">>
): Promise<void> {
  const db = getVictoriaDb();
  if (!db) return;
  const { error } = await db
    .from("victoria_prospects")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("[Victoria:DB] updateProspect:", error.message);
}

export async function getProspect(id: string): Promise<VictoriaProspectRow | null> {
  const db = getVictoriaDb();
  if (!db) return null;
  const { data, error } = await db
    .from("victoria_prospects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) { console.error("[Victoria:DB] getProspect:", error.message); return null; }
  return data as VictoriaProspectRow | null;
}

export async function listProspects(
  search?: string,
  limit = 30
): Promise<VictoriaProspectRow[]> {
  const db = getVictoriaDb();
  if (!db) return [];
  let q = db
    .from("victoria_prospects")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (search?.trim()) {
    q = q.or(`name.ilike.%${search}%,company.ilike.%${search}%`);
  }
  const { data, error } = await q;
  if (error) { console.error("[Victoria:DB] listProspects:", error.message); return []; }
  return (data ?? []) as VictoriaProspectRow[];
}

export async function getProspectCallHistory(
  prospectId: string,
  limit = 5
): Promise<{ id: string; phase: string; status: string; started_at: string; duration_seconds: number | null; session_state: Record<string, unknown> | null }[]> {
  const db = getVictoriaDb();
  if (!db) return [];
  const { data, error } = await db
    .from("victoria_calls")
    .select("id,phase,status,started_at,duration_seconds,session_state")
    .eq("prospect_id", prospectId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("[Victoria:DB] getProspectCallHistory:", error.message); return []; }
  return (data ?? []) as { id: string; phase: string; status: string; started_at: string; duration_seconds: number | null; session_state: Record<string, unknown> | null }[];
}

export async function insertProspectMemorySnapshot(
  prospectId: string,
  callId: string,
  snapshot: Record<string, unknown>
): Promise<void> {
  const db = getVictoriaDb();
  if (!db) return;
  const { error } = await db.from("victoria_prospect_memory_snapshots").insert({
    prospect_id: prospectId,
    call_id: callId,
    snapshot,
  });
  if (error) console.error("[Victoria:DB] insertProspectMemorySnapshot:", error.message);
}

export async function getProspectLastSnapshot(
  prospectId: string
): Promise<Record<string, unknown> | null> {
  const db = getVictoriaDb();
  if (!db) return null;
  const { data, error } = await db
    .from("victoria_prospect_memory_snapshots")
    .select("snapshot")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return (data as { snapshot: Record<string, unknown> } | null)?.snapshot ?? null;
}

// ─────────────────────────────────────────────────────────────
// Fathom Ingestions
// ─────────────────────────────────────────────────────────────

export async function upsertFathomIngestion(
  data: Omit<import("./types").VictoriaFathomIngestionRow, "id">
): Promise<string | null> {
  const db = getVictoriaDb();
  if (!db) return null;

  const { data: row, error } = await db
    .from("victoria_fathom_ingestions")
    .upsert(
      {
        call_id: data.call_id,
        fathom_recording_id: data.fathom_recording_id,
        recording_url: data.recording_url ?? null,
        share_url: data.share_url ?? null,
        duration_seconds: data.duration_seconds ?? null,
        title: data.title ?? null,
        speakers: data.speakers,
        segments: data.segments,
        summary: data.summary ?? "",
        action_items: data.action_items ?? [],
        speaker_metrics: data.speaker_metrics ?? null,
        reconciliation: data.reconciliation ?? null,
        ingested_at: data.ingested_at,
      },
      { onConflict: "call_id" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("[Victoria:DB] upsertFathomIngestion:", error.message);
    return null;
  }
  return (row as { id: string } | null)?.id ?? null;
}

export async function getFathomIngestion(
  callId: string
): Promise<import("./types").VictoriaFathomIngestionRow | null> {
  const db = getVictoriaDb();
  if (!db) return null;

  const { data, error } = await db
    .from("victoria_fathom_ingestions")
    .select("*")
    .eq("call_id", callId)
    .single();

  if (error) return null;
  return data as import("./types").VictoriaFathomIngestionRow | null;
}
