// Victoria — AI Call Replay Generator
// Curates a highlight reel of the call: best moments, worst moments, missed moments,
// objection moments, and buying signals. Rule-based. No AI, no I/O.
// Server-side only.

import type {
  LiveCallSession,
  MissedOpportunity,
  TurningPoint,
  ReplayMoment,
  ReplayCategory,
  TimelineEvent,
  TranscriptChunk,
} from "../../types";

let _momentId = 0;
function makeId(category: ReplayCategory): string {
  return `replay_${category}_${++_momentId}`;
}

// ─────────────────────────────────────────────────────────────
// Coaching notes per category + turning point type
// ─────────────────────────────────────────────────────────────

const BEST_COACHING_NOTES: Record<string, string> = {
  buying_signal: "You created the conditions for this buying signal. Study what you did in the 2–3 turns before this moment and replicate it.",
  emotional_breakthrough: "This breakthrough happened because you slowed down and listened. This is what elite selling looks like.",
  close_signal: "The prospect was ready. Lead with this energy on the next call.",
  trust_building: "Trust built here because you acknowledged before you advised. Keep this pattern.",
  discovery_improved: "Great discovery moment — you went deeper when most reps would have moved on.",
  urgency_detected: "You surfaced real urgency here. Build on this in the follow-up.",
};

const WORST_COACHING_NOTES: Record<string, string> = {
  emotional_shutdown: "The prospect shut down here. Ask yourself: what did you say right before this? That's what to avoid next time.",
  premature_pitch: "Pitching this early is the most common mistake. No amount of great features fixes talking to someone who hasn't felt the pain yet.",
  rep_lost_control: "When you're doing most of the talking, you're not selling — you're presenting. Present to a wall; sell to a human.",
  trust_collapsed: "Trust broke here. Study the 2 turns before this and identify the exact phrase that triggered the shutdown.",
  momentum_declining: "Momentum slipped here. In real time, this is the moment to pivot: 'I want to pause — what's going through your mind right now?'",
};

const MISSED_COACHING_NOTES: Record<string, string> = {
  emotional_cue_ignored: "The prospect gave you the golden key here — their emotional pain — and you walked past it. Next time: stop, mirror, and go deeper.",
  buying_signal_ignored: "This was your green light. Instead of adding more paint, you should have asked: 'Sounds like you see how this could work — what would getting started look like?'",
  objection_not_isolated: "Always isolate before you handle. 'Besides that, is there anything else that would prevent you from moving forward?' is the most important sentence in sales.",
  failed_close: "When a prospect says 'think about it,' they're telling you there's an objection you haven't uncovered yet. Never retreat — get curious.",
  premature_pitching: "Discovery was not deep enough here. Features solve problems, but you hadn't made the problem feel real yet.",
  overexplaining: "Every extra sentence is a risk. After 60 words, ask a question. Always.",
  trust_breaking: "One phrase can undo 20 minutes of rapport. Review this moment and identify exactly what shifted.",
  shallow_probing: "Closed questions get closed answers. 'Tell me what that looks like for you' opens the conversation; 'Is that a problem?' closes it.",
};

// ─────────────────────────────────────────────────────────────
// Extract transcript text near a chunk index
// ─────────────────────────────────────────────────────────────

function getTranscriptExcerpt(session: LiveCallSession, chunkIndex: number, speakerFilter?: "rep" | "prospect"): string {
  const nearby = session.transcript.filter(
    (c) => Math.abs(c.chunk_index - chunkIndex) <= 1 && (speakerFilter ? c.speaker === speakerFilter : true)
  );
  if (nearby.length === 0) {
    // Try exact match
    const exact = session.transcript.find((c) => c.chunk_index === chunkIndex);
    if (!exact) return "";
    return exact.text.slice(0, 120);
  }
  return nearby
    .map((c) => `${c.speaker === "rep" ? "Rep" : "Prospect"}: ${c.text.slice(0, 80)}`)
    .join(" / ")
    .slice(0, 150);
}

// ─────────────────────────────────────────────────────────────
// Generate moments from timeline events
// ─────────────────────────────────────────────────────────────

function momentsFromTimeline(session: LiveCallSession): ReplayMoment[] {
  const moments: ReplayMoment[] = [];

  const BEST_EVENT_TYPES = new Set(["buying_signal", "emotional_breakthrough", "close_signal", "trust_building", "discovery_improved", "urgency_detected"]);
  const WORST_EVENT_TYPES = new Set(["emotional_shutdown", "premature_pitch", "rep_interrupted", "rep_buying_signal_ignored", "trust_declining", "momentum_declining"]);
  const OBJ_EVENT_TYPES = new Set(["objection_detected", "objection_not_isolated"]);

  for (const evt of session.timeline) {
    if (BEST_EVENT_TYPES.has(evt.event_type) && evt.severity !== "info") {
      const excerpt = getTranscriptExcerpt(session, evt.chunk_index, "prospect");
      if (!excerpt) continue;
      moments.push({
        id: makeId("best"),
        chunk_index: evt.chunk_index,
        category: "best",
        label: evt.title,
        transcript_excerpt: excerpt,
        coaching_note: BEST_COACHING_NOTES[evt.event_type] ?? "Strong moment — study what led here.",
        speaker: "prospect",
      });
    } else if (WORST_EVENT_TYPES.has(evt.event_type)) {
      const excerpt = getTranscriptExcerpt(session, evt.chunk_index);
      if (!excerpt) continue;
      moments.push({
        id: makeId("worst"),
        chunk_index: evt.chunk_index,
        category: "worst",
        label: evt.title,
        transcript_excerpt: excerpt,
        coaching_note: WORST_COACHING_NOTES[evt.event_type] ?? "Critical moment — identify the exact trigger.",
        speaker: "both",
      });
    } else if (OBJ_EVENT_TYPES.has(evt.event_type)) {
      const prospectChunk = session.transcript.find(
        (c) => c.chunk_index === evt.chunk_index && c.speaker === "prospect"
      ) ?? session.transcript.find((c) => Math.abs(c.chunk_index - evt.chunk_index) <= 1 && c.speaker === "prospect");
      if (!prospectChunk) continue;
      moments.push({
        id: makeId("objection"),
        chunk_index: evt.chunk_index,
        category: "objection",
        label: `Objection: ${evt.title}`,
        transcript_excerpt: `Prospect: "${prospectChunk.text.slice(0, 100)}"`,
        coaching_note: "Objections are doors, not walls. Isolate first: 'Besides that, is there anything else?' Then acknowledge, question, and reframe.",
        speaker: "prospect",
      });
    }
  }

  return moments;
}

// ─────────────────────────────────────────────────────────────
// Generate moments from missed opportunities
// ─────────────────────────────────────────────────────────────

function momentsFromMissed(session: LiveCallSession, missed: MissedOpportunity[]): ReplayMoment[] {
  return missed
    .filter((m) => m.severity === "critical" || m.severity === "high")
    .slice(0, 5)
    .map((m) => {
      const excerptChunk = session.transcript.find(
        (c) => c.chunk_index === m.chunk_index
      );
      const excerpt = excerptChunk
        ? `${excerptChunk.speaker === "rep" ? "Rep" : "Prospect"}: "${excerptChunk.text.slice(0, 100)}"`
        : m.evidence.slice(0, 120);

      return {
        id: makeId("missed"),
        chunk_index: m.chunk_index,
        category: "missed" as ReplayCategory,
        label: `Missed: ${m.type.replace(/_/g, " ")}`,
        transcript_excerpt: excerpt,
        coaching_note: MISSED_COACHING_NOTES[m.type] ?? m.what_should_have_happened,
        speaker: excerptChunk?.speaker === "rep" ? "rep" : "prospect",
      };
    });
}

// ─────────────────────────────────────────────────────────────
// Generate moments from turning points
// ─────────────────────────────────────────────────────────────

function momentsFromTurningPoints(session: LiveCallSession, turningPoints: TurningPoint[]): ReplayMoment[] {
  return turningPoints
    .filter((tp) => tp.impact === "high")
    .slice(0, 3)
    .map((tp) => {
      const excerpt = getTranscriptExcerpt(session, tp.chunk_index);
      const category: ReplayCategory = tp.direction === "positive" ? "best" : "worst";

      return {
        id: makeId(category),
        chunk_index: tp.chunk_index,
        category,
        label: tp.title,
        transcript_excerpt: excerpt || tp.evidence,
        coaching_note: tp.direction === "positive"
          ? "This was a positive turning point. Study what created it."
          : `${tp.description} — this is where the deal direction shifted.`,
        speaker: "both",
      };
    });
}

// ─────────────────────────────────────────────────────────────
// Add buying signal moments explicitly
// ─────────────────────────────────────────────────────────────

function buyingSignalMoments(session: LiveCallSession): ReplayMoment[] {
  return session.transcript
    .filter((c) => c.speaker === "prospect" && c.contains_buying_signal)
    .slice(0, 3)
    .map((c) => ({
      id: makeId("buying_signal"),
      chunk_index: c.chunk_index,
      category: "buying_signal" as ReplayCategory,
      label: "Buying Signal",
      transcript_excerpt: `Prospect: "${c.text.slice(0, 120)}"`,
      coaching_note: "The prospect showed interest here. The next rep turn should always be a trial close, not more features.",
      speaker: "prospect" as const,
    }));
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export function generateReplayTimeline(
  session: LiveCallSession,
  missed: MissedOpportunity[],
  turningPoints: TurningPoint[]
): ReplayMoment[] {
  _momentId = 0; // Reset per run

  const allMoments: ReplayMoment[] = [
    ...momentsFromTimeline(session),
    ...momentsFromMissed(session, missed),
    ...momentsFromTurningPoints(session, turningPoints),
    ...buyingSignalMoments(session),
  ];

  // De-duplicate by chunk_index + category
  const seen = new Set<string>();
  const deduped = allMoments.filter((m) => {
    const key = `${m.chunk_index}_${m.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort chronologically
  return deduped
    .sort((a, b) => a.chunk_index - b.chunk_index)
    .slice(0, 20); // Max 20 replay moments — curated, not exhaustive
}
