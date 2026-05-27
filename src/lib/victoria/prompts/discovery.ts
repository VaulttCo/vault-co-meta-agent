// Victoria — Discovery Agent System Prompt + Tool Schema
// Server-side only. This is where the core discovery coaching intelligence lives.

import type { AnthropicTool } from "../anthropic";
import type { DiscoveryState, ContractorVertical, ConversationPhase } from "../types";

// ─────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────

export const DISCOVERY_SYSTEM_PROMPT = `
You are Victoria's Discovery Intelligence Engine — the most critical component of an elite AI sales coaching system built for Vault Co, a premium revenue system provider for roofing, construction, and home service businesses.

YOUR SINGULAR PURPOSE:
Ensure the sales rep conducts deep, complete, emotionally resonant discovery before positioning or pitching. Premature pitching is the #1 deal-killer. You prevent it.

VAULT CO CONTEXT:
- Vault Co installs a complete 60-Day Revenue System: ads, CRM, automations, follow-up, booked appointments, reporting, conversion systems
- Prospects are roofing, HVAC, remodeling, and home service business owners
- They measure success in BOOKED JOBS, not leads or clicks
- They are often skeptical of agencies due to past bad experiences
- Their core pain: inconsistent revenue, unpredictable lead flow, operational chaos
- Their emotional pain: stress, loss of control, fear of slow seasons, frustration with agencies
- Average client invests $3,000-$8,000/month — this is a significant commitment for them

FRAMEWORKS YOU APPLY (choose the best fit for the current moment):

NEPQ (Jeremy Miner):
1. Situation Questions — understand their current state (non-threatening)
2. Problem Awareness Questions — surface what isn't working
3. Consequence Questions — "If that keeps happening, what does that mean for you financially/personally?"
4. Solution Awareness — "If you could fix that, what would that mean for your business?"

SPIN Selling:
1. Situation — gather facts about current state
2. Problem — identify explicit pain points
3. Implication — expand the cost/impact of the problem ("So if leads are inconsistent, how does that affect...?")
4. Need-Payoff — get them to articulate the value of solving it

Gap Selling (Jim Keenan):
1. Current State — where they are now (with all its problems)
2. Problem → Impact — the business/emotional cost of the current state
3. Ideal Future State — what success looks like to THEM
4. Sell the gap — your solution bridges current state to desired state

DEPTH SCORING RULES:
- Score 0-25: Rep hasn't asked real discovery questions yet
- Score 26-50: Situation questions only, no pain depth
- Score 51-70: Pain stated but not felt — surface level
- Score 71-85: Pain stated, emotional impact expressed, financial impact implied
- Score 86-100: Deep pain, emotional impact confirmed, financial impact quantified, desired outcome stated

PHASE AWARENESS:
- rapport: Don't push yet. Build trust. Ask light situational questions.
- discovery: Main phase. Push hard for pain. Use NEPQ consequence questions.
- deep_discovery: Emotional impact, financial cost, urgency. Make the pain VIVID.
- handling/positioning: If asked for next question during objection territory, redirect to re-anchoring pain.

CRITICAL RULES:
1. NEVER recommend a pitch until depth_score >= 65
2. NEVER recommend moving to positioning until financial or emotional impact is confirmed
3. ALWAYS flag when the rep is pitching features before pain is established
4. ALWAYS recommend going one level deeper when pain is stated but not felt
5. If the prospect gives a surface answer, your job is to recommend the follow-up probe that goes deeper
6. The rep should be talking LESS than the prospect during discovery — flag overtalking

OUTPUT: You must output valid JSON matching the tool schema. Never add explanatory text outside the JSON.
`.trim();

// ─────────────────────────────────────────────────────────────
// Tool schema
// ─────────────────────────────────────────────────────────────

export const DISCOVERY_TOOL: AnthropicTool = {
  name: "generate_discovery_coaching",
  description:
    "Analyze the current discovery state of a sales call and generate actionable coaching for the sales rep. Focus on what question to ask next, what's missing, and whether discovery is deep enough.",
  input_schema: {
    type: "object",
    properties: {
      assessment: {
        type: "string" as const,
        enum: ["incomplete", "shallow", "adequate", "deep"],
        description: "Overall assessment of how complete and deep the discovery is so far",
      },
      next_best_question: {
        type: "string" as const,
        description:
          "The single most important question the rep should ask RIGHT NOW. Must be specific, open-ended, and designed to deepen pain or uncover missing information. Max 30 words.",
      },
      question_framework: {
        type: "string" as const,
        enum: ["NEPQ", "SPIN", "Gap", "Challenger"],
        description: "Which sales framework this question draws from",
      },
      why_this_question: {
        type: "string" as const,
        description:
          "Brief rationale for why THIS question is the most important right now. Max 20 words.",
      },
      missing_areas: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            area: { type: "string" as const, description: "What discovery area is missing" },
            importance: {
              type: "string" as const,
              enum: ["critical", "high", "medium"],
              description: "How important is this missing area to closing the deal",
            },
            suggested_probe: {
              type: "string" as const,
              description: "Specific question to address this missing area",
            },
          },
          required: ["area", "importance", "suggested_probe"],
        },
        description: "Up to 3 critical missing discovery areas, ordered by importance",
        maxItems: 3,
      },
      warning: {
        type: "object" as const,
        properties: {
          type: {
            type: "string" as const,
            enum: [
              "pitching_too_early",
              "surface_discovery",
              "skipping_pain",
              "rep_overtalking",
            ],
          },
          message: {
            type: "string" as const,
            description: "Clear, direct warning to the rep. Max 25 words.",
          },
          redirect: {
            type: "string" as const,
            description: "Exactly what the rep should do instead. Max 25 words.",
          },
        },
        required: ["type", "message", "redirect"],
        description:
          "Include ONLY if there is a serious discovery problem happening right now. Omit if not needed.",
      },
      pain_summary: {
        type: "string" as const,
        description:
          "Brief summary of what we know about the prospect's pain so far. Used for context tracking. Max 40 words.",
      },
      depth_score: {
        type: "number" as const,
        description:
          "Discovery depth score from 0-100. 0 = no discovery done. 100 = deep emotional/financial impact fully quantified.",
        minimum: 0,
        maximum: 100,
      },
    },
    required: [
      "assessment",
      "next_best_question",
      "question_framework",
      "why_this_question",
      "missing_areas",
      "pain_summary",
      "depth_score",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// User message builder — assembles context for the Discovery Agent
// ─────────────────────────────────────────────────────────────

export function buildDiscoveryUserMessage(params: {
  prospect_name: string;
  prospect_company: string;
  prospect_vertical: ContractorVertical;
  current_phase: ConversationPhase;
  transcript_context: string; // Built by buildFullTranscriptContext()
  discovery_state: DiscoveryState;
}): string {
  const { prospect_name, prospect_company, prospect_vertical, current_phase, transcript_context, discovery_state } = params;

  const discoveredFacts = [
    discovery_state.current_marketing_spend_known && "Current marketing spend: known",
    discovery_state.current_lead_sources_known && "Lead sources: known",
    discovery_state.main_pain_stated && `Main pain stated (specificity: ${discovery_state.pain_specificity})`,
    discovery_state.financial_impact_quantified && "Financial impact: quantified",
    discovery_state.emotional_impact_expressed && "Emotional impact: expressed",
    discovery_state.ideal_outcome_stated && "Ideal outcome: stated",
    discovery_state.timeline_urgency_present && "Timeline/urgency: present",
  ].filter(Boolean);

  const notYetDiscovered = [
    !discovery_state.main_pain_stated && "Main pain point (CRITICAL)",
    !discovery_state.financial_impact_quantified && "Financial cost of the problem",
    !discovery_state.emotional_impact_expressed && "Emotional/personal impact",
    !discovery_state.ideal_outcome_stated && "What success looks like to them",
    !discovery_state.timeline_urgency_present && "Timeline and urgency",
    !discovery_state.decision_process_known && "Decision-making process",
    !discovery_state.current_lead_sources_known && "Current lead sources",
  ].filter(Boolean);

  return `
CALL CONTEXT:
Prospect: ${prospect_name} at ${prospect_company}
Industry: ${prospect_vertical}
Conversation Phase: ${current_phase}
Discovery Depth Score: ${discovery_state.depth_score}/100

WHAT WE KNOW SO FAR:
${discoveredFacts.length > 0 ? discoveredFacts.join("\n") : "Very little — discovery has barely started"}

WHAT WE DON'T KNOW YET:
${notYetDiscovered.length > 0 ? notYetDiscovered.join("\n") : "Discovery appears reasonably complete"}

TRANSCRIPT:
${transcript_context}

TASK: Analyze the conversation above. What is the single best question the rep should ask next? Is discovery deep enough? What's missing?
`.trim();
}
