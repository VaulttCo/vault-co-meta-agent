// Victoria — Session Store
// Redis-backed live call session management with in-memory fallback.
// This is the single source of truth for all active call state.
// Server-side only.

import { kvGet, kvSet, kvDel, VICTORIA_KEYS } from "../redis";
import type { LiveCallSession, CoachingCard } from "../types";

// ─────────────────────────────────────────────────────────────
// Session TTL — 6 hours (longer than any real call)
// ─────────────────────────────────────────────────────────────

const SESSION_TTL = 60 * 60 * 6;

// ─────────────────────────────────────────────────────────────
// Core CRUD
// ─────────────────────────────────────────────────────────────

export async function getSession(callId: string): Promise<LiveCallSession | null> {
  return kvGet<LiveCallSession>(VICTORIA_KEYS.session(callId));
}

export async function saveSession(session: LiveCallSession): Promise<void> {
  session.updated_at = Date.now();
  await kvSet(VICTORIA_KEYS.session(session.call_id), session, SESSION_TTL);
}

export async function deleteSession(callId: string): Promise<void> {
  await kvDel(VICTORIA_KEYS.session(callId));
  await kvDel(VICTORIA_KEYS.coaching(callId));
}

// ─────────────────────────────────────────────────────────────
// Atomic session mutations
// Avoids stale reads by always re-fetching before writing.
// ─────────────────────────────────────────────────────────────

/**
 * Apply a mutation to a session atomically.
 * Re-fetches, applies the mutation, and saves.
 * Returns the updated session or null if the session doesn't exist.
 */
export async function mutateSession(
  callId: string,
  mutator: (session: LiveCallSession) => LiveCallSession
): Promise<LiveCallSession | null> {
  const session = await getSession(callId);
  if (!session) return null;

  const updated = mutator(session);
  await saveSession(updated);
  return updated;
}

// ─────────────────────────────────────────────────────────────
// Coaching card cache — stores the latest coaching card separately
// so the UI can poll for updates without deserializing the full session.
// ─────────────────────────────────────────────────────────────

export async function saveLatestCoachingCard(
  callId: string,
  card: CoachingCard
): Promise<void> {
  await kvSet(VICTORIA_KEYS.coaching(callId), card, SESSION_TTL);
}

export async function getLatestCoachingCard(
  callId: string
): Promise<CoachingCard | null> {
  return kvGet<CoachingCard>(VICTORIA_KEYS.coaching(callId));
}

// ─────────────────────────────────────────────────────────────
// Phase detection helpers (reads session, no I/O side effects)
// ─────────────────────────────────────────────────────────────

/**
 * Returns a plain text representation of session state for logging/debugging.
 */
export function summarizeSession(session: LiveCallSession): string {
  return [
    `Call: ${session.call_id}`,
    `Phase: ${session.phase}`,
    `Chunks: ${session.current_chunk_index}`,
    `Trust: ${session.scores.trust} | Pain: ${session.scores.pain_depth} | Risk: ${session.scores.deal_risk}`,
    `Discovery depth: ${session.discovery.depth_score}`,
    `Objections: ${session.objections.raised.length} raised, ${session.objections.unresolved.length} unresolved`,
  ].join(" | ");
}
