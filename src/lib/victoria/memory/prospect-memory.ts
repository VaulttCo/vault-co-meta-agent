// Victoria — Prospect Memory
// Loads and formats prospect history for injection into agent prompts.
// Server-side only.

import {
  getProspect,
  getProspectCallHistory,
  getProspectLastSnapshot,
} from "../db";
import type { ProspectMemory, VictoriaProspectRow } from "../types";

// ─────────────────────────────────────────────────────────────
// Format prospect facts for prompt injection
// ─────────────────────────────────────────────────────────────

export function formatProspectMemoryForPrompt(memory: ProspectMemory): string {
  const { prospect, recent_calls_summary, last_call_snapshot } = memory;

  const sections: string[] = [];

  if (prospect.known_pain_points.length > 0) {
    sections.push(`Known pain points: ${prospect.known_pain_points.join("; ")}`);
  }
  if (prospect.known_objections.length > 0) {
    sections.push(`Known objections: ${prospect.known_objections.join("; ")}`);
  }
  if (prospect.personality_type) {
    sections.push(`Personality: ${prospect.personality_type}`);
  }
  if (prospect.communication_style) {
    sections.push(`Communication style: ${prospect.communication_style}`);
  }
  if (prospect.primary_fear) {
    sections.push(`Primary fear: ${prospect.primary_fear}`);
  }
  if (prospect.primary_desire) {
    sections.push(`Primary desire: ${prospect.primary_desire}`);
  }
  if (prospect.known_resistances.length > 0) {
    sections.push(`Known resistances: ${prospect.known_resistances.join("; ")}`);
  }
  if (prospect.known_triggers.length > 0) {
    sections.push(`Known engagement triggers: ${prospect.known_triggers.join("; ")}`);
  }
  sections.push(`Total prior calls: ${prospect.total_calls}`);
  sections.push(`Urgency level: ${prospect.urgency_level}`);
  sections.push(`Deal stage: ${prospect.deal_stage}`);

  if (recent_calls_summary) {
    sections.push(`\nPrior call context:\n${recent_calls_summary}`);
  }

  // Extract next_call_briefing from last snapshot if present
  const briefing = (last_call_snapshot as { next_call_briefing?: string } | null)?.next_call_briefing;
  if (briefing) {
    sections.push(`\nNext call briefing (from last call):\n${briefing}`);
  }

  return sections.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Build brief inline memory string for embedding in prompts
// ─────────────────────────────────────────────────────────────

export function buildProspectMemoryLine(prospect: VictoriaProspectRow): string {
  const parts: string[] = [];
  if (prospect.known_pain_points.length > 0) {
    parts.push(`Pain: ${prospect.known_pain_points.slice(0, 2).join(", ")}`);
  }
  if (prospect.known_objections.length > 0) {
    parts.push(`Past objections: ${prospect.known_objections.slice(0, 2).join(", ")}`);
  }
  if (prospect.personality_type) parts.push(`Type: ${prospect.personality_type}`);
  parts.push(`Calls: ${prospect.total_calls}`);
  return parts.join(" | ");
}

// ─────────────────────────────────────────────────────────────
// Main loader
// ─────────────────────────────────────────────────────────────

export async function loadProspectMemory(
  prospectId: string
): Promise<ProspectMemory | null> {
  const [prospect, callHistory, lastSnapshot] = await Promise.all([
    getProspect(prospectId),
    getProspectCallHistory(prospectId, 3),
    getProspectLastSnapshot(prospectId),
  ]);

  if (!prospect) return null;

  // Format recent calls into a brief narrative
  let recent_calls_summary = "";
  if (callHistory.length > 0) {
    const lines = callHistory.map((call, i) => {
      const durationMins = call.duration_seconds
        ? Math.round(call.duration_seconds / 60)
        : null;

      // Extract phase and coaching highlights from session state
      const state = call.session_state as {
        phase?: string;
        objections?: { raised?: { category?: string }[] };
        coaching_history?: { headline?: string }[];
      } | null;

      const phase = state?.phase ?? call.phase;
      const objections = state?.objections?.raised?.map((o) => o.category).filter(Boolean) ?? [];
      const cards = state?.coaching_history?.slice(-2).map((c) => c.headline).filter(Boolean) ?? [];

      let line = `Call ${i + 1} (${new Date(call.started_at).toLocaleDateString()}): ${call.status}, reached ${phase} phase`;
      if (durationMins !== null) line += `, ${durationMins}min`;
      if (objections.length > 0) line += `. Objections: ${objections.join(", ")}`;
      if (cards.length > 0) line += `. Key moments: ${cards.slice(0, 2).join(" / ")}`;
      return line;
    });
    recent_calls_summary = lines.join("\n");
  }

  return { prospect, recent_calls_summary, last_call_snapshot: lastSnapshot };
}
