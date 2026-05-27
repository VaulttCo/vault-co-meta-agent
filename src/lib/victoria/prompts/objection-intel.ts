// Victoria — Objection Intelligence Agent System Prompt + Tool Schema
// Server-side only. Deep psychological analysis of sales resistance.

import type { AnthropicTool } from "../anthropic";
import type { ObjectionCategory, ContractorVertical } from "../types";

// ─────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────

export const OBJECTION_INTEL_SYSTEM_PROMPT = `
You are Victoria's Objection Intelligence Engine — the psychological analysis layer of an elite AI sales coaching system for Vault Co.

YOUR PURPOSE:
When a contractor raises an objection, your job is to identify WHAT IS REALLY HAPPENING beneath the surface — the hidden meaning, emotional driver, and best path forward. You are not a generic objection-handling script. You are a deep psychological analyst of contractor sales resistance.

VAULT CO CONTEXT:
- Vault Co is NOT a marketing agency. It installs a complete 60-Day Revenue System.
- Clients invest $3,000-$8,000/month for ads, CRM, automations, follow-up, and full conversion systems.
- The competition is: doing nothing, cheap agencies, HomeAdvisor/Angi, Google Ads alone, internal staff.
- Vault Co differentiators: complete system (not just ads), booked jobs not leads, speed-to-lead automation, one client per market, 60-day revenue system.

CONTRACTOR PSYCHOLOGY — CRITICAL CONTEXT:
Roofing and construction owners are:
- Highly skeptical of agencies (most have been burned — empty promises, no results, disappearing)
- Ego-driven and results-focused (they built their business with their hands)
- Cash-flow sensitive (revenue is often seasonal and lumpy)
- Operationally overwhelmed (they run the crew AND do sales AND admin)
- Communication style: direct, blunt, skeptical of "marketing speak"
- Trust is earned through specificity, proof, and industry knowledge — NOT through enthusiasm
- They respond to: ROI math, peer success stories (especially same vertical, same market), specific numbers, ownership/control, and not being "sold to"
- They shut down when: reps are pushy, vague on results, make guarantees without data, or don't understand their business

OBJECTION INTELLIGENCE RULES:
1. The stated objection is almost NEVER the real objection. Go deeper.
2. "Need to think about it" = something is unresolved that the prospect won't say directly
3. "Too expensive" = they don't see enough ROI yet, not that they can't afford it
4. "Already have someone" = they're not satisfied but feel locked in or embarrassed to admit failure
5. "Send me info" = polite rejection — they are NOT going to read your email
6. "Need to talk to my wife/partner" = authority uncertainty OR an escape hatch
7. "Burned before" = this is REAL and must be honored fully before ANY pivoting
8. Guarantee requests = trust gap and fear of loss
9. Timing objections = urgency hasn't been established, pain isn't vivid enough

REFRAME STRATEGY RULES:
1. Never fight an objection directly — validate first, then redirect
2. Never apologize for your price
3. Never say "I understand" as the first response (sounds scripted)
4. The best reframe often comes from a question, not a statement
5. After a reframe, ALWAYS ask a follow-up question to check understanding
6. What NOT to say is as important as what TO say

WHAT_NOT_TO_SAY GUIDANCE (common rep mistakes by objection):
- Price: Never say "it's an investment" (cliché). Never defend the price without ROI math.
- Think about it: Never say "OK, I'll give you some time." Never let the call end without a next step.
- Burned before: Never say "we're different" immediately. Never minimize their experience.
- Authority: Never say "would she be available to join the call?" unless you've built strong pain.
- Send info: Never send a generic PDF and follow up 3 days later.

OUTPUT: Strict JSON matching the tool schema. No prose outside the JSON.
`.trim();

// ─────────────────────────────────────────────────────────────
// Tool schema
// ─────────────────────────────────────────────────────────────

export const OBJECTION_INTEL_TOOL: AnthropicTool = {
  name: "analyze_objection",
  description:
    "Deep psychological analysis of a sales objection from a contractor prospect. Identify the hidden meaning, emotional driver, and best reframe strategy.",
  input_schema: {
    type: "object",
    properties: {
      detected_objection: {
        type: "string" as const,
        description: "The exact words the prospect used to raise the objection (quoted from transcript)",
      },
      category: {
        type: "string" as const,
        enum: [
          "price",
          "timing",
          "authority",
          "trust",
          "agency_skepticism",
          "already_have_marketing",
          "cash_flow",
          "think_about_it",
          "send_info",
          "guarantee",
          "competitor",
          "busy",
          "seasonal",
          "not_ready",
          "unknown",
        ] as ObjectionCategory[],
        description: "The objection category",
      },
      surface_meaning: {
        type: "string" as const,
        description: "What they literally said — the surface-level objection in one sentence",
      },
      hidden_meaning: {
        type: "string" as const,
        description:
          "What this objection REALLY means psychologically — what they're not saying. Be specific and direct. Max 30 words.",
      },
      emotional_driver: {
        type: "string" as const,
        description:
          "The primary emotion behind this objection (fear, ego, past hurt, uncertainty, etc.) and what's driving it for this specific prospect. Max 20 words.",
      },
      what_not_to_say: {
        type: "array" as const,
        items: {
          type: "string" as const,
          description: "A specific phrase or approach the rep must NOT use right now",
        },
        description: "2-4 specific things the rep must NOT say in response to this objection",
        maxItems: 4,
      },
      what_not_to_do: {
        type: "string" as const,
        description:
          "The behavioral mistake the rep is most likely to make right now. Be specific. Max 25 words.",
      },
      reframe_strategy: {
        type: "object" as const,
        properties: {
          approach: {
            type: "string" as const,
            description: "The strategic approach for handling this objection (2-3 sentences)",
          },
          rationale: {
            type: "string" as const,
            description:
              "Why this approach works with this type of contractor. Max 25 words.",
          },
          suggested_language: {
            type: "string" as const,
            description:
              "Specific words or a question the rep can use RIGHT NOW. Should feel natural, not scripted. Max 40 words.",
          },
        },
        required: ["approach", "rationale", "suggested_language"],
        description: "Complete reframe strategy with specific language",
      },
      follow_up_question: {
        type: "string" as const,
        description:
          "The follow-up question to ask AFTER the reframe — to check understanding and keep the conversation moving. Max 25 words.",
      },
      is_real_objection: {
        type: "boolean" as const,
        description:
          "Is this a real objection or a smokescreen? True = real concern. False = masking another issue.",
      },
      real_issue_if_smokescreen: {
        type: "string" as const,
        description:
          "If is_real_objection is false, what is the REAL underlying issue? Omit if it is a genuine objection. Max 25 words.",
      },
    },
    required: [
      "detected_objection",
      "category",
      "surface_meaning",
      "hidden_meaning",
      "emotional_driver",
      "what_not_to_say",
      "what_not_to_do",
      "reframe_strategy",
      "follow_up_question",
      "is_real_objection",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// User message builder
// ─────────────────────────────────────────────────────────────

export function buildObjectionUserMessage(params: {
  prospect_name: string;
  prospect_vertical: ContractorVertical;
  objection_text: string;
  transcript_context: string;
  prior_objections: string[];
  kb_context?: string;      // Vault Co-specific objection handling knowledge
  prospect_memory?: string; // Prior objection history for this prospect
}): string {
  const { prospect_name, prospect_vertical, objection_text, transcript_context, prior_objections, kb_context, prospect_memory } = params;

  return `
PROSPECT: ${prospect_name} — ${prospect_vertical} business owner
PRIOR OBJECTIONS IN THIS CALL: ${prior_objections.length > 0 ? prior_objections.join("; ") : "None"}
${prospect_memory ? `PRIOR OBJECTION HISTORY (from previous calls): ${prospect_memory}` : ""}

OBJECTION JUST RAISED:
"${objection_text}"

CALL CONTEXT (recent transcript):
${transcript_context}
${kb_context ? `\nRELEVANT VAULT CO OBJECTION HANDLING KNOWLEDGE:\n${kb_context}` : ""}

TASK: Analyze this objection. What does it REALLY mean? What is the emotional driver? What should the rep say (and NOT say) right now?
`.trim();
}
