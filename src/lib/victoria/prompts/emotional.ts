// Victoria — Emotional Signal Agent Prompts
// Server-side only. Haiku model — fast classification, runs every chunk.

import type { AnthropicTool } from "../anthropic";
import type { LiveCallSession, EmotionalState } from "../types";
import { buildRecentTranscriptContext } from "../signals/chunk-preprocessor";

// ─────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────

export const EMOTIONAL_SYSTEM_PROMPT = `You are the Emotional Signal Agent for Victoria AI Sales Coach.

Your job: classify the prospect's current emotional state and detect any meaningful shift, so the rep can adapt their approach in real-time.

This is shown ONLY to the rep — never the prospect.

## Emotional states

- open_engaged: Curious, answering fully, asking their own questions — ideal state
- hesitant: Qualified answers ("maybe", "I'm not sure"), slow to commit, noncommittal language
- skeptical: Challenging assumptions ("how do I know?"), demanding proof, questioning claims
- frustrated: Short or irritated answers, "I've tried this before", edge in their language
- confused: Asking for clarification, "what do you mean?", unclear on what's being asked
- excited: Forward-thinking statements, energy in language, "that sounds interesting / that could work"
- defensive: Deflecting questions, guarding information, "why do you need to know that"
- hopeful: "That would be nice", imagining the solution, positive future-thinking language
- resigned: Defeat language ("I've tried everything", "nothing works"), low energy, going through motions
- urgent: "I need this soon", "we're falling behind", "busy season is coming", time pressure in language

## Detection rules

1. Analyze ONLY the last 2–3 prospect utterances — emotional state shifts quickly
2. Ignore rep speech entirely — you're classifying the PROSPECT only
3. detected_shift = true only if state has clearly changed from the previously known state
4. direction: "improving" = moving toward engagement/close | "stable" = no meaningful change | "declining" = moving away from the rep
5. intensity: "low" = slight signal | "medium" = clear signal | "high" = unmistakable signal
6. signal_evidence: Quote or paraphrase the specific language that drove your classification
7. rep_recommendation: One specific behavioral instruction for the rep — what to do RIGHT NOW given this emotional state

## Alert logic (only when action is immediately required)
- emotional_spike: Sudden high-intensity shift (either direction) — rep must acknowledge before proceeding
- shutdown: Prospect is closing off, disengaging, or shutting down — conversation at risk
- breakthrough: Prospect has emotionally connected with the pain — prime moment to go deeper before moving on

Only set alert when intensity = "high" AND the rep needs to respond differently RIGHT NOW.
For most turns, no alert is needed.`;

// ─────────────────────────────────────────────────────────────
// Tool schema
// ─────────────────────────────────────────────────────────────

export const EMOTIONAL_TOOL: AnthropicTool = {
  name: "classify_emotional_state",
  description: "Classify the prospect's current emotional state and detect any meaningful shift in the last 2-3 utterances.",
  input_schema: {
    type: "object",
    properties: {
      detected_shift: {
        type: "boolean",
        description: "True if emotional state has meaningfully changed from the previously known state.",
      },
      emotional_state: {
        type: "string",
        enum: [
          "open_engaged", "hesitant", "skeptical", "frustrated", "confused",
          "excited", "defensive", "hopeful", "resigned", "urgent",
        ],
      },
      intensity: {
        type: "string",
        enum: ["low", "medium", "high"],
      },
      direction: {
        type: "string",
        enum: ["improving", "stable", "declining"],
        description: "Direction of emotional movement relative to closing the deal.",
      },
      signal_evidence: {
        type: "string",
        description: "Specific language from the prospect that drives this classification.",
      },
      rep_recommendation: {
        type: "string",
        description: "One concrete behavioral instruction for the rep given this emotional state.",
      },
      alert: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["emotional_spike", "shutdown", "breakthrough"] },
          urgency: { type: "string", enum: ["immediate", "soon"] },
          action: { type: "string", description: "Exact action the rep must take right now." },
        },
        required: ["type", "urgency", "action"],
        description: "Only present when high-intensity state requires immediate rep action.",
      },
    },
    required: [
      "detected_shift",
      "emotional_state",
      "intensity",
      "direction",
      "signal_evidence",
      "rep_recommendation",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// User message builder
// ─────────────────────────────────────────────────────────────

export function buildEmotionalUserMessage(
  session: LiveCallSession,
  previousEmotionalState: EmotionalState
): string {
  const { prospect } = session;

  // Only send the last 4 exchanges — emotional classification needs recency not breadth
  const recentContext = buildRecentTranscriptContext(session.transcript, 4);

  // Last 3 prospect utterances only for direct analysis
  const prospectUtterances = session.transcript
    .filter(c => c.speaker === "prospect")
    .slice(-3)
    .map(c => `"${c.text}"`)
    .join("\n");

  return `## Prospect Profile
Name: ${prospect.name} | Company: ${prospect.company} | Industry: ${prospect.vertical}
Previously known emotional state: ${previousEmotionalState}
Known resistances: ${prospect.known_resistances.join(", ") || "none"}
Known triggers: ${prospect.known_triggers.join(", ") || "none"}

## Last 3 Prospect Utterances (classify these)
${prospectUtterances || "No prospect speech yet."}

## Full Recent Context (last 4 exchanges for background)
${recentContext}

Classify the prospect's current emotional state. Be precise — your classification directly affects rep behavior.`;
}
