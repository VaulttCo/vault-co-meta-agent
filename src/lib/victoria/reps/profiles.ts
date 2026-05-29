// Victoria — Rep Profile DB Operations
// Server-side only. CRUD for victoria_rep_profiles and victoria_rep_call_logs.

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { RepProfile, RepCallLog, RepCallStatsUpdate } from "./types";

// ─────────────────────────────────────────────────────────────
// DB client
// ─────────────────────────────────────────────────────────────

function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseServerClient() as any;
}

// ─────────────────────────────────────────────────────────────
// Pre-seeded rep profiles for Vault Co team
// Used to initialize the DB if empty
// ─────────────────────────────────────────────────────────────

export const VAULT_CO_REPS: Omit<RepProfile, "id" | "created_at" | "updated_at">[] = [
  {
    name: "Nick",
    email: "nick@anuagency.info",
    avatar_initials: "NM",
    fathom_speaker_names: ["Nick Moore", "Nick"],
    total_calls: 0,
    avg_overall_score: 0,
    avg_talk_ratio_rep: 0,
    avg_discovery_depth: 0,
    avg_close_readiness: 0,
    skill_talk_ratio: 70,
    skill_question_quality: 75,
    skill_emotional_intelligence: 72,
    skill_objection_handling: 70,
    skill_closing: 68,
    skill_discovery_depth: 74,
    interruption_tendency: "low",
    overtalking_tendency: "low",
    strengths: ["Discovery depth", "Building rapport"],
    weaknesses: [],
  },
  {
    name: "Jaxon",
    email: null,
    avatar_initials: "JB",
    fathom_speaker_names: ["Jaxon", "Jaxon B"],
    total_calls: 0,
    avg_overall_score: 0,
    avg_talk_ratio_rep: 0,
    avg_discovery_depth: 0,
    avg_close_readiness: 0,
    skill_talk_ratio: 68,
    skill_question_quality: 72,
    skill_emotional_intelligence: 70,
    skill_objection_handling: 73,
    skill_closing: 71,
    skill_discovery_depth: 69,
    interruption_tendency: "low",
    overtalking_tendency: "low",
    strengths: ["Objection handling", "Closing"],
    weaknesses: [],
  },
];

// ─────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────

export async function listRepProfiles(): Promise<RepProfile[]> {
  const db = getDb();
  if (!db) return buildMockProfiles();

  const { data, error } = await db
    .from("victoria_rep_profiles")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[Victoria:Reps] listRepProfiles:", error.message);
    return buildMockProfiles();
  }

  const rows = (data ?? []) as RepProfile[];
  // If table is empty, return mock so the UI always has reps available
  return rows.length > 0 ? rows : buildMockProfiles();
}

export async function getRepProfile(repId: string): Promise<RepProfile | null> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db
    .from("victoria_rep_profiles")
    .select("*")
    .eq("id", repId)
    .single();

  if (error) {
    console.error("[Victoria:Reps] getRepProfile:", error.message);
    return null;
  }

  return data as RepProfile | null;
}

export async function getRepProfileByName(name: string): Promise<RepProfile | null> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db
    .from("victoria_rep_profiles")
    .select("*")
    .ilike("name", `%${name}%`)
    .limit(1)
    .single();

  if (error) return null;
  return data as RepProfile | null;
}

// ─────────────────────────────────────────────────────────────
// Create / Seed
// ─────────────────────────────────────────────────────────────

export async function seedRepProfilesIfEmpty(): Promise<void> {
  const db = getDb();
  if (!db) return;

  const { count } = await db
    .from("victoria_rep_profiles")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) > 0) return; // Already seeded

  for (const rep of VAULT_CO_REPS) {
    const { error } = await db.from("victoria_rep_profiles").insert(rep);
    if (error) console.error("[Victoria:Reps] seed error:", error.message);
  }
}

export async function insertRepProfile(
  data: Omit<RepProfile, "id" | "created_at" | "updated_at">
): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const { data: row, error } = await db
    .from("victoria_rep_profiles")
    .insert(data)
    .select("id")
    .single();

  if (error) {
    console.error("[Victoria:Reps] insertRepProfile:", error.message);
    return null;
  }

  return (row as { id: string } | null)?.id ?? null;
}

// ─────────────────────────────────────────────────────────────
// Update — partial field update (settings, fathom names, etc.)
// ─────────────────────────────────────────────────────────────

export async function updateRepProfile(
  repId: string,
  data: Partial<Omit<RepProfile, "id" | "created_at">>
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const { error } = await db
    .from("victoria_rep_profiles")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", repId);

  if (error) console.error("[Victoria:Reps] updateRepProfile:", error.message);
}

// ─────────────────────────────────────────────────────────────
// Stats update — called after each post-call review completes
// Recomputes rolling averages from the new call stats.
// ─────────────────────────────────────────────────────────────

export async function updateRepProfileStats(
  repId: string,
  callId: string,
  stats: RepCallStatsUpdate
): Promise<void> {
  const db = getDb();
  if (!db) return;

  // Fetch current profile
  const current = await getRepProfile(repId);
  if (!current) return;

  const n = current.total_calls; // calls BEFORE this one

  // Incremental rolling average: new_avg = (old_avg * n + new_value) / (n + 1)
  const roll = (old: number, value: number) =>
    n === 0 ? value : Math.round(((old * n + value) / (n + 1)) * 10) / 10;

  // Update skill scores (rolling average of scorecard dimensions)
  const updatedProfile: Partial<RepProfile> = {
    total_calls: n + 1,
    avg_overall_score: roll(current.avg_overall_score, stats.overall_score),
    avg_talk_ratio_rep: stats.fathom_talk_ratio_rep !== null
      ? roll(current.avg_talk_ratio_rep, stats.fathom_talk_ratio_rep)
      : current.avg_talk_ratio_rep,
    skill_talk_ratio: roll(current.skill_talk_ratio, stats.talk_ratio_score),
    skill_question_quality: roll(current.skill_question_quality, stats.question_quality_score),
    skill_emotional_intelligence: roll(current.skill_emotional_intelligence, stats.emotional_intelligence_score),
    skill_objection_handling: roll(current.skill_objection_handling, stats.objection_handling_score),
    skill_closing: roll(current.skill_closing, stats.closing_skill_score),
    skill_discovery_depth: roll(current.skill_discovery_depth, stats.discovery_score),
  };

  // Update behavioral tendencies from interruption pattern
  if (stats.fathom_interruption_count !== null) {
    const interruptions = stats.fathom_interruption_count;
    updatedProfile.interruption_tendency =
      interruptions >= 5 ? "high" : interruptions >= 2 ? "medium" : "low";
  }

  // Merge strengths / weaknesses (deduplicate; cap at 5 each)
  if (stats.areas_of_strength.length > 0) {
    const existing = new Set(current.strengths);
    const merged = [...current.strengths, ...stats.areas_of_strength.filter((s) => !existing.has(s))];
    updatedProfile.strengths = merged.slice(0, 5);
  }
  if (stats.areas_for_improvement.length > 0) {
    const existing = new Set(current.weaknesses);
    const merged = [...current.weaknesses, ...stats.areas_for_improvement.filter((s) => !existing.has(s))];
    updatedProfile.weaknesses = merged.slice(0, 5);
  }

  await updateRepProfile(repId, updatedProfile);

  // Log the individual call stat record (non-blocking)
  const callLog: Omit<RepCallLog, "id"> = {
    rep_id: repId,
    call_id: callId,
    overall_score: stats.overall_score,
    grade: scoreToGrade(stats.overall_score),
    talk_ratio_score: stats.talk_ratio_score,
    question_quality_score: stats.question_quality_score,
    emotional_intelligence_score: stats.emotional_intelligence_score,
    discovery_score: stats.discovery_score,
    objection_handling_score: stats.objection_handling_score,
    closing_skill_score: stats.closing_skill_score,
    fathom_talk_ratio_rep: stats.fathom_talk_ratio_rep,
    fathom_interruption_count: stats.fathom_interruption_count,
    recorded_at: new Date().toISOString(),
  };

  db.from("victoria_rep_call_logs")
    .insert(callLog)
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.error("[Victoria:Reps] insertRepCallLog:", error.message);
    });
}

// ─────────────────────────────────────────────────────────────
// Rep call history
// ─────────────────────────────────────────────────────────────

export async function getRepCallLogs(
  repId: string,
  limit = 10
): Promise<RepCallLog[]> {
  const db = getDb();
  if (!db) return [];

  const { data, error } = await db
    .from("victoria_rep_call_logs")
    .select("*")
    .eq("rep_id", repId)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Victoria:Reps] getRepCallLogs:", error.message);
    return [];
  }

  return (data ?? []) as RepCallLog[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function buildMockProfiles(): RepProfile[] {
  const now = new Date().toISOString();
  return VAULT_CO_REPS.map((rep, i) => ({
    ...rep,
    id: `mock_rep_${i + 1}`,
    created_at: now,
    updated_at: now,
  }));
}
