// Victoria — Emotional Signal Agent
// Classifies prospect emotional state on every chunk with prospect speech.
// Uses Haiku for speed. Server-side only.

import { callAnthropicTool, isAnthropicAvailable, VICTORIA_MODELS } from "../../anthropic";
import {
  EMOTIONAL_SYSTEM_PROMPT,
  EMOTIONAL_TOOL,
  buildEmotionalUserMessage,
} from "../../prompts/emotional";
import type { LiveCallSession, EmotionalOutput, EmotionalState } from "../../types";

// ─────────────────────────────────────────────────────────────
// Agent result type
// ─────────────────────────────────────────────────────────────

export interface EmotionalAgentResult {
  output: EmotionalOutput;
  latency_ms: number;
  model: string;
  mock_mode: boolean;
  input_tokens?: number;
  output_tokens?: number;
}

// ─────────────────────────────────────────────────────────────
// Mock output — used when Anthropic is not configured
// ─────────────────────────────────────────────────────────────

const MOCK_EMOTIONAL_ADVICE: Record<EmotionalState, string> = {
  open_engaged: "Keep the momentum — ask your next discovery question without hesitation.",
  hesitant: "Don't push. Ask: 'What's making you unsure about that?' — give them space to voice the real concern.",
  skeptical: "Don't defend. Acknowledge with: 'That's a fair concern — a lot of contractors feel that way at first. What specifically would you need to see?'",
  frustrated: "Slow down and acknowledge: 'It sounds like you've been dealing with this for a while — that's frustrating.' Let them vent before redirecting.",
  confused: "Simplify your last point. Ask: 'Let me ask it differently — [simpler version of previous question].'",
  excited: "Validate but don't pitch yet. Ask: 'What specifically sounds interesting to you about that?'",
  defensive: "Back off and reframe as curiosity: 'I'm just trying to understand your situation better so I can give you useful information.'",
  hopeful: "This is your moment to deepen the vision. Ask: 'If we could make that happen — what would change in your business?'",
  resigned: "Acknowledge the history: 'It sounds like you've tried a few things that didn't pan out. What happened with those?' — let them tell the story.",
  urgent: "Match the urgency: 'Given your timeline, let me make sure I understand exactly what you need.' — don't slow them down.",
};

function generateMockEmotional(session: LiveCallSession): EmotionalOutput {
  const current = session.prospect.emotional_state;
  const prevState = session.transcript.length > 2
    ? session.prospect.emotional_state
    : "open_engaged" as EmotionalState;

  const lastProspectChunks = session.transcript
    .filter(c => c.speaker === "prospect")
    .slice(-2);

  const lastText = lastProspectChunks.map(c => c.text).join(" ").toLowerCase();

  // Simple pattern-based shift detection for mock mode
  let detected: EmotionalState = current;
  let detected_shift = false;

  if (/burn(ed)?|scam|waste|useless|doesn'?t work/i.test(lastText)) {
    detected = "skeptical"; detected_shift = detected !== prevState;
  } else if (/when.*start|how long|how soon|set.?up/i.test(lastText)) {
    detected = "excited"; detected_shift = detected !== prevState;
  } else if (/stressed?|overwhelm|tired|fed up|can'?t keep/i.test(lastText)) {
    detected = "frustrated"; detected_shift = detected !== prevState;
  } else if (/not sure|maybe|i guess|i don'?t know/i.test(lastText)) {
    detected = "hesitant"; detected_shift = detected !== prevState;
  } else if (/hope|would be nice|if only|wish/i.test(lastText)) {
    detected = "hopeful"; detected_shift = detected !== prevState;
  }

  const hasShutdownSignal = /just send|email me|i'?ll think|call me later|not interested/i.test(lastText);

  return {
    detected_shift,
    emotional_state: detected,
    intensity: hasShutdownSignal ? "high" : detected_shift ? "medium" : "low",
    direction: hasShutdownSignal ? "declining"
      : detected === "excited" || detected === "hopeful" ? "improving"
      : detected === "skeptical" || detected === "frustrated" ? "declining"
      : "stable",
    signal_evidence: lastProspectChunks.length > 0
      ? `"${lastProspectChunks[lastProspectChunks.length - 1].text.slice(0, 100)}"`
      : "Insufficient prospect speech to classify",
    rep_recommendation: MOCK_EMOTIONAL_ADVICE[detected],
    alert: hasShutdownSignal ? {
      type: "shutdown" as const,
      urgency: "immediate" as const,
      action: "Stop whatever you're doing. Say: 'Before I let you go — I want to make sure I actually understand what you're dealing with. Can I ask you one quick question?'",
    } : (detected === "hopeful" && detected_shift ? {
      type: "breakthrough" as const,
      urgency: "soon" as const,
      action: "They just connected emotionally. Deepen it: 'It sounds like that would mean a lot — tell me more about what that would change.'",
    } : undefined),
  };
}

// ─────────────────────────────────────────────────────────────
// Main agent runner
// ─────────────────────────────────────────────────────────────

export async function runEmotionalAgent(
  session: LiveCallSession
): Promise<EmotionalAgentResult> {
  const start = Date.now();

  const previousState = session.prospect.emotional_state;

  if (!isAnthropicAvailable()) {
    return {
      output: generateMockEmotional(session),
      latency_ms: Date.now() - start,
      model: "mock",
      mock_mode: true,
    };
  }

  const userMessage = buildEmotionalUserMessage(session, previousState);

  try {
    const result = await callAnthropicTool<EmotionalOutput>({
      model: VICTORIA_MODELS.EMOTIONAL,
      system: EMOTIONAL_SYSTEM_PROMPT,
      userMessage,
      tool: EMOTIONAL_TOOL,
      maxTokens: 600,
    });

    return {
      output: result.output,
      latency_ms: result.latency_ms,
      model: result.model,
      mock_mode: false,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
    };
  } catch (err) {
    console.error("[Victoria:Emotional] Agent failed — using mock fallback:", err instanceof Error ? err.message : String(err));
    return {
      output: generateMockEmotional(session),
      latency_ms: Date.now() - start,
      model: "mock-fallback",
      mock_mode: true,
    };
  }
}
