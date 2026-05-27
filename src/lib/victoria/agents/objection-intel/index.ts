// Victoria — Objection Intelligence Agent
// Triggered reactively when objection keywords are detected.
// Deep psychological analysis of contractor sales resistance.
// Server-side only.

import { callAnthropicTool, isAnthropicAvailable, VICTORIA_MODELS } from "../../anthropic";
import {
  OBJECTION_INTEL_SYSTEM_PROMPT,
  OBJECTION_INTEL_TOOL,
  buildObjectionUserMessage,
} from "../../prompts/objection-intel";
import { buildRecentTranscriptContext } from "../../signals/chunk-preprocessor";
import type {
  LiveCallSession,
  ObjectionOutput,
  ObjectionCategory,
} from "../../types";

// ─────────────────────────────────────────────────────────────
// Objection-specific mock responses
// Pre-built for common patterns — accurate enough for testing
// ─────────────────────────────────────────────────────────────

const MOCK_OBJECTION_RESPONSES: Partial<Record<ObjectionCategory, ObjectionOutput>> = {
  price: {
    detected_objection: "That's too expensive",
    category: "price",
    surface_meaning: "The prospect feels the price is too high",
    hidden_meaning: "They don't see enough ROI yet — the value hasn't been established relative to the investment",
    emotional_driver: "Fear of wasting money, especially after past bad experiences with agencies",
    what_not_to_say: [
      "Think of it as an investment",
      "We have payment plans",
      "Compare that to what you'd spend on a hire",
      "Can you afford NOT to fix this?",
    ],
    what_not_to_do: "Do not defend the price or justify it with features — that signals you believe it's too expensive too",
    reframe_strategy: {
      approach: "Anchor the price to the cost of inaction, not the cost of the service. The question isn't whether $X is expensive — it's whether doing nothing is more expensive.",
      rationale: "Contractors respond to ROI math. Make the math concrete and specific to their numbers.",
      suggested_language: "What's a bad month cost you right now — just in jobs you didn't book? Because that number is probably bigger than this.",
    },
    follow_up_question: "What would it mean for your business if you had predictable revenue coming in every month?",
    is_real_objection: false,
    real_issue_if_smokescreen: "Value hasn't been established — discovery was likely incomplete. The pain isn't vivid enough yet.",
  },
  think_about_it: {
    detected_objection: "Let me think about it",
    category: "think_about_it",
    surface_meaning: "Prospect wants more time before deciding",
    hidden_meaning: "Something is unresolved — either they don't trust the outcome, they have a question they didn't ask, or they're using this as an escape",
    emotional_driver: "Risk aversion — they've been burned before and don't want to make the wrong decision again",
    what_not_to_say: [
      "OK, take your time",
      "I'll follow up in a few days",
      "Here's my card",
      "No pressure",
    ],
    what_not_to_do: "Do not end the call or agree to follow up without understanding what they're thinking about",
    reframe_strategy: {
      approach: "Name it directly and find out what the real question is. Most think-about-its are smokescreens for an unspoken concern.",
      rationale: "Contractors respect directness. Asking directly what's holding them back is more effective than giving them space.",
      suggested_language: "Totally fair — but help me understand what specifically is making you hesitate. Is it the investment, timing, or something about whether this would actually work for you?",
    },
    follow_up_question: "What would need to be true for this to be a clear yes for you?",
    is_real_objection: false,
    real_issue_if_smokescreen: "Likely a trust gap or unsolved question about results/risk",
  },
  agency_skepticism: {
    detected_objection: "I've been burned by agencies before",
    category: "agency_skepticism",
    surface_meaning: "Prospect had a bad experience with a previous marketing agency",
    hidden_meaning: "Deep distrust — they've spent money, gotten little or nothing back, and feel foolish for it. This is real pain.",
    emotional_driver: "Wounded pride, financial loss, and fear of repeating a mistake they feel they should have avoided",
    what_not_to_say: [
      "We're different",
      "That won't happen with us",
      "Those agencies don't know what they're doing",
      "Let me tell you what makes us unique",
    ],
    what_not_to_do: "Do not rush past this to pitch your differentiation — that's exactly what the bad agency did",
    reframe_strategy: {
      approach: "Validate the experience fully before moving. They need to feel heard before they'll listen to anything else. Then ask about what specifically went wrong — because understanding the failure opens the door to showing how Vault Co is structurally different.",
      rationale: "Contractors who've been burned need to see that you understand WHAT went wrong, not just hear that you're better",
      suggested_language: "That's real — and honestly, most agencies deserve to be fired. What happened? Was it the leads, the communication, the results — what let you down the most?",
    },
    follow_up_question: "When you think about what a vendor would need to do to earn your trust at this point — what would that look like?",
    is_real_objection: true,
  },
  send_info: {
    detected_objection: "Just send me some information",
    category: "send_info",
    surface_meaning: "Prospect is asking for written materials to review",
    hidden_meaning: "This is almost always a polite way to end the conversation without conflict — they're not interested right now",
    emotional_driver: "Conflict avoidance — it's easier to say 'send info' than 'I'm not sold'",
    what_not_to_say: [
      "Absolutely, I'll send that right over",
      "I'll email you our deck",
      "Check your inbox in 5 minutes",
    ],
    what_not_to_do: "Do not send generic information and follow up 3 days later — you will never hear from them again",
    reframe_strategy: {
      approach: "Name it honestly and find out what's really going on. If they're genuinely interested, ask what specific question the information would answer — then answer it now.",
      rationale: "Being direct builds respect. If they're not ready, better to find out now than chase a dead lead",
      suggested_language: "I can do that — but honestly the PDF won't answer the real question, which is whether this would work for your market. What specifically would you want to know that we haven't covered?",
    },
    follow_up_question: "Is there something specific holding you back right now that we should just address directly?",
    is_real_objection: false,
    real_issue_if_smokescreen: "Either discovery didn't go deep enough, or trust/ROI concerns weren't resolved",
  },
};

function generateMockObjectionOutput(
  objectionText: string,
  categories: ObjectionCategory[]
): ObjectionOutput {
  const primaryCategory = categories[0] ?? "unknown";
  const mock = MOCK_OBJECTION_RESPONSES[primaryCategory as keyof typeof MOCK_OBJECTION_RESPONSES];

  if (mock) {
    return { ...mock, detected_objection: objectionText };
  }

  // Generic fallback
  return {
    detected_objection: objectionText,
    category: "unknown",
    surface_meaning: "Prospect is expressing resistance or concern",
    hidden_meaning: "The real concern hasn't been surfaced yet — more discovery needed",
    emotional_driver: "Uncertainty and risk aversion — typical for high-ticket decisions",
    what_not_to_say: ["Let me address that", "That's a great point but...", "Everyone says that at first"],
    what_not_to_do: "Do not immediately pivot to pitch mode — ask a question first",
    reframe_strategy: {
      approach: "Ask a clarifying question to understand what's really behind the resistance before attempting any reframe",
      rationale: "Premature reframing signals you weren't listening — always understand before responding",
      suggested_language: "Help me understand what you mean by that — what specifically are you concerned about?",
    },
    follow_up_question: "What would need to be true for this to be a clear yes for you?",
    is_real_objection: true,
  };
}

// ─────────────────────────────────────────────────────────────
// Main Objection Intelligence Agent runner
// ─────────────────────────────────────────────────────────────

export interface ObjectionAgentResult {
  output: ObjectionOutput;
  latency_ms: number;
  model: string;
  mock_mode: boolean;
  input_tokens?: number;
  output_tokens?: number;
}

export async function runObjectionIntelAgent(
  session: LiveCallSession,
  triggering_chunk_text: string,
  detected_categories: ObjectionCategory[],
  options: { kb_context?: string; prospect_memory?: string } = {}
): Promise<ObjectionAgentResult> {
  const start = Date.now();

  if (!isAnthropicAvailable()) {
    return {
      output: generateMockObjectionOutput(triggering_chunk_text, detected_categories),
      latency_ms: Date.now() - start,
      model: "mock",
      mock_mode: true,
    };
  }

  const transcriptContext = buildRecentTranscriptContext(session.transcript, 4);
  const priorObjections = session.objections.raised.map((o) => o.raw_text);

  const userMessage = buildObjectionUserMessage({
    prospect_name: session.prospect.name,
    prospect_vertical: session.prospect.vertical,
    objection_text: triggering_chunk_text,
    transcript_context: transcriptContext,
    prior_objections: priorObjections,
    kb_context: options.kb_context,
    prospect_memory: options.prospect_memory,
  });

  try {
    const result = await callAnthropicTool<ObjectionOutput>({
      model: VICTORIA_MODELS.OBJECTION_INTEL,
      system: OBJECTION_INTEL_SYSTEM_PROMPT,
      userMessage,
      tool: OBJECTION_INTEL_TOOL,
      maxTokens: 1400,
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
    console.error("[Victoria:ObjectionIntel] Agent failed — using mock fallback:", err instanceof Error ? err.message : String(err));
    return {
      output: generateMockObjectionOutput(triggering_chunk_text, detected_categories),
      latency_ms: Date.now() - start,
      model: "mock-fallback",
      mock_mode: true,
    };
  }
}
