// Victoria — Follow-Up Generator
// Generates a fully personalized follow-up kit: email, SMS, Loom talking points,
// proposal positioning, objection recap, and next step recommendation.
// Uses Claude Sonnet for AI-powered personalization; falls back to rule-based templates.
// Server-side only.

import { callAnthropicTool, isAnthropicAvailable, VICTORIA_MODELS } from "../../anthropic";
import type { LiveCallSession, FollowUpType, FollowUpKit } from "../../types";
import { buildProposalStrategy } from "./proposal-strategy";

// ─────────────────────────────────────────────────────────────
// Follow-up type classification
// ─────────────────────────────────────────────────────────────

export function classifyFollowUpType(session: LiveCallSession): FollowUpType {
  const { scores, objections, phase, prospect } = session;
  const objCats = objections.raised.map((o) => o.category);

  // Explicit phase signals
  if (phase === "post_close") return "follow_up_booked";
  if (phase === "lost") return "ghosting_risk";

  // Objection-based classification (primary objection wins)
  if (objCats.includes("authority")) return "authority_issue";
  if (objCats.includes("price") || objCats.includes("cash_flow")) return "budget_issue";
  if (objCats.includes("timing") || objCats.includes("seasonal") || objCats.includes("not_ready")) return "timing_issue";
  if (objCats.includes("trust") || objCats.includes("agency_skepticism")) return "skeptical";

  // Score-based signals
  if (scores.close_readiness >= 60 && objections.unresolved.length === 0) return "hot_lead";
  if (scores.emotional_engagement < 30 && scores.urgency < 25 && scores.close_readiness < 25) return "ghosting_risk";
  if (prospect.emotional_state === "skeptical" || prospect.emotional_state === "defensive") return "skeptical";
  if (phase === "closing") return "proposal_sent";
  if (scores.close_readiness >= 30) return "nurture";

  return "nurture"; // Safe default
}

// ─────────────────────────────────────────────────────────────
// AI-powered follow-up generation
// ─────────────────────────────────────────────────────────────

const FOLLOWUP_SYSTEM_PROMPT = `You are Victoria — an elite AI sales coach generating a personalized post-call follow-up package for a Vault Co sales rep.

Vault Co is a Meta ads agency for home service contractors (roofers, HVAC, landscaping, remodeling, plumbing, painting, etc.).

EVERY output must be:
- Personalized to THIS specific prospect — not generic
- Written in the rep's voice (first person singular: "I", "me", "we")
- Based on what actually happened in the call — reference specific details
- Strategically designed to advance the sale, not just check a box

EMAIL RULES:
- Subject: specific, curious, non-clickbait. Reference the prospect or their situation.
- Body: 3–5 short paragraphs. No bullet points. Conversational but professional.
- Open with something personal/specific from the call
- Bridge to the value clearly but briefly
- ONE clear call to action at the end
- No generic phrases like "As per our conversation" or "I hope this finds you well"
- Max 200 words in the body

SMS RULES:
- Max 160 characters including the name
- Sound like a human text — not a marketing message
- Reference something specific from the call
- End with a question or clear next step

LOOM TALKING POINTS:
- 3–5 bullet points only
- Each is a short phrase (not a full sentence) for the rep to expand on
- In order of presentation

PROPOSAL POSITIONING:
- 2–3 sentences on how to frame/present the proposal for THIS specific prospect
- Based on their objection and emotional state

OBJECTION RECAP:
- 1–2 sentences on the specific objection and exactly how to address it in follow-up
- Tactical and specific — not generic advice

NEXT STEP:
- One specific, time-bound next action for the rep
- "Call by [time]" / "Send email within [hours]" / etc.`;

const FOLLOWUP_TOOL = {
  name: "generate_followup_kit",
  description: "Generate a complete personalized follow-up kit for the sales rep",
  input_schema: {
    type: "object" as const,
    properties: {
      email: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Email subject line. Specific, not generic. Max 70 chars." },
          body:    { type: "string", description: "Email body. 3–5 paragraphs. Conversational. ONE CTA. Max 200 words." },
          send_timing: { type: "string", description: "When to send: e.g. 'within 2 hours', 'first thing tomorrow morning'" },
        },
        required: ["subject", "body", "send_timing"],
      },
      sms: {
        type: "object",
        properties: {
          body:        { type: "string", description: "SMS text. Max 160 chars. Sounds like a human text. References something specific." },
          send_timing: { type: "string", description: "When to send: e.g. 'within 30 minutes', 'this afternoon'" },
        },
        required: ["body", "send_timing"],
      },
      loom_talking_points: {
        type: "array",
        items: { type: "string" },
        description: "3–5 talking point phrases for a 2–3 minute Loom video. In order of presentation.",
      },
      proposal_positioning: {
        type: "string",
        description: "2–3 sentences on how to frame/present the proposal for this specific prospect.",
      },
      objection_specific_recap: {
        type: "string",
        description: "1–2 sentences: what the objection was and exactly how to address it in the follow-up.",
      },
      next_step_recommendation: {
        type: "string",
        description: "One specific, time-bound next action for the rep.",
      },
    },
    required: ["email", "sms", "loom_talking_points", "proposal_positioning", "objection_specific_recap", "next_step_recommendation"],
  },
};

function buildFollowupUserMessage(session: LiveCallSession, followUpType: FollowUpType): string {
  const { prospect, scores, objections, discovery, transcript } = session;

  const firstName = prospect.name.split(" ")[0];
  const primaryObj = objections.raised[0];
  const recentTranscript = transcript
    .slice(-12)
    .map((c) => `${c.speaker === "rep" ? "Rep" : "Prospect"}: ${c.text}`)
    .join("\n");

  const repChunks = transcript.filter((c) => c.speaker === "rep");
  const prospectChunks = transcript.filter((c) => c.speaker === "prospect");
  const repWords = repChunks.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0);
  const totalWords = repWords + prospectChunks.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0);
  const repTalkPercent = totalWords > 0 ? Math.round((repWords / totalWords) * 100) : 50;

  return `PROSPECT: ${prospect.name} (${firstName}) · ${prospect.company} · ${prospect.vertical}
FOLLOW-UP TYPE: ${followUpType.replace(/_/g, " ").toUpperCase()}
EMOTIONAL STATE AT END OF CALL: ${prospect.emotional_state}

CALL SCORES:
- Trust: ${scores.trust}/100
- Urgency: ${scores.urgency}/100
- Close Readiness: ${scores.close_readiness}/100
- Pain Depth: ${scores.pain_depth}/100
- Rep Talk Ratio: ${repTalkPercent}%

DISCOVERY:
- Pain stated: ${discovery.main_pain_stated ? `Yes (${discovery.pain_specificity})` : "No — pain was not fully surfaced"}
- Financial impact quantified: ${discovery.financial_impact_quantified ? "Yes" : "No"}
- Emotional impact expressed: ${discovery.emotional_impact_expressed ? "Yes" : "No"}
- Timeline urgency: ${discovery.timeline_urgency_present ? "Yes" : "No"}

PRIMARY OBJECTION: ${primaryObj ? `${primaryObj.category.replace(/_/g, " ")} — "${primaryObj.raw_text.slice(0, 100)}"` : "None raised"}
UNRESOLVED OBJECTIONS: ${objections.unresolved.length > 0 ? objections.unresolved.join(", ") : "None"}

CURRENT MARKETING: ${prospect.current_marketing ?? "Unknown"}

RECENT TRANSCRIPT (last 12 chunks):
${recentTranscript}

Generate a personalized, specific follow-up kit for this call. Every piece of content must reference something real from this conversation.`;
}

// ─────────────────────────────────────────────────────────────
// Rule-based fallback templates (when AI unavailable)
// ─────────────────────────────────────────────────────────────

const FOLLOWUP_TYPE_EMAIL_SUBJECTS: Record<FollowUpType, string> = {
  hot_lead:        "Quick recap + next step",
  nurture:         "Following up on our conversation",
  skeptical:       "Something I thought you'd want to see",
  authority_issue: "For you and [Partner] — recap + next step",
  budget_issue:    "The numbers we talked through — quick breakdown",
  timing_issue:    "What the season timing looks like for your market",
  ghosting_risk:   "Wanted to reach out one more time",
  proposal_sent:   "Your Vault Co proposal — any questions?",
  follow_up_booked:"Looking forward to [Next Call Date] — here's a quick recap",
};

const FOLLOWUP_TYPE_SMS: Record<FollowUpType, (name: string) => string> = {
  hot_lead:        (n) => `Hey ${n} — great talking today. Sending over the summary now. Let me know if you want to chat before EOD.`,
  nurture:         (n) => `Hey ${n} — appreciate the time today. Sending something over that I think will be helpful. Talk soon.`,
  skeptical:       (n) => `Hey ${n} — thinking about what you said. Want to send you something that might change the picture a bit. Ok if I do?`,
  authority_issue: (n) => `Hey ${n} — sending over a quick summary for you and your partner to look at. Happy to do a call with both of you.`,
  budget_issue:    (n) => `Hey ${n} — put together a quick breakdown of the numbers. Sending it over now. Worth a look.`,
  timing_issue:    (n) => `Hey ${n} — totally understand on timing. Sending something that might be useful when you're ready.`,
  ghosting_risk:   (n) => `Hey ${n} — one thing I forgot to mention from our call. Worth 2 mins if you have it?`,
  proposal_sent:   (n) => `Hey ${n} — just sent over the proposal. Let me know if you have questions or want to set up a call to review.`,
  follow_up_booked:(n) => `Hey ${n} — confirmed for [Date/Time]. Sending a quick recap beforehand so we hit the ground running.`,
};

const LOOM_TALKING_POINTS_BY_TYPE: Record<FollowUpType, string[]> = {
  hot_lead:        ["Quick recap of what we discussed", "Your specific situation and what stood out", "How Vault Co solves the exact problem you described", "What the first 30 days looks like", "The one thing I need from you to move forward"],
  nurture:         ["What I heard on the call that stuck with me", "Why I think this is the right time for you", "What other [vertical] contractors have seen in month one", "Exactly what getting started looks like", "My recommendation for your next step"],
  skeptical:       ["I want to address the agency experience you mentioned", "What makes Vault Co different and why it matters for your situation", "A real result from a contractor in your vertical", "How the accountability works — what you can expect from us", "What I'd ask you to do before deciding"],
  authority_issue: ["Quick recap for you and your partner", "The problem we identified and why it matters now", "How Vault Co solves it — specifically for your business", "The ROI math we talked through", "What the decision looks like and what I need from you both"],
  budget_issue:    ["What you're currently spending vs. what you'd get", "The cost-per-lead math — here's what it looks like at scale", "The phased entry option — how to start small and prove it", "What month 3 typically looks like for contractors in your vertical", "The one number that tells you when this works for you"],
  timing_issue:    ["Why timing matters more than most contractors think", "What the season window actually looks like for your market", "The lead time needed to be ready when your season hits", "What contractors who waited have experienced", "My recommendation on the timeline"],
  ghosting_risk:   ["I only have 2 minutes — here's the one thing I want you to think about", "Your specific situation and why I think this is worth a second look", "What I'd do differently if we talked again", "One ask"],
  proposal_sent:   ["A quick walk-through of what I sent you", "The specific section I want to highlight for your situation", "The ROI section — here's how to read it", "What your onboarding looks like if you move forward", "The one question I need you to answer"],
  follow_up_booked:["Recap of what we discussed and what we'll cover next", "The case study I'm bringing to our call", "What a yes looks like and what happens after", "My ask before we talk again"],
};

function buildRuleBasedFollowup(session: LiveCallSession, followUpType: FollowUpType): Omit<FollowUpKit, "follow_up_type"> {
  const { prospect, scores, objections } = session;
  const firstName = prospect.name.split(" ")[0];
  const primaryObj = objections.raised[0];

  const emailSubject = FOLLOWUP_TYPE_EMAIL_SUBJECTS[followUpType] ?? "Following up";
  const smsBody = FOLLOWUP_TYPE_SMS[followUpType]?.(firstName) ?? `Hey ${firstName} — great talking today. Sending something over now.`;
  const loomPoints = LOOM_TALKING_POINTS_BY_TYPE[followUpType] ?? ["Recap of our call", "Why this matters for your business", "Recommended next step"];

  const emailBody = `Hi ${firstName},

Really enjoyed our conversation today. I've been thinking about what you mentioned about [pain point] — that stuck with me.

Based on what you shared, I think there's a real opportunity here for ${prospect.company}. The [vertical] contractors we're working with in your situation are typically seeing [specific result] within the first 60 days.

I've put together a quick recap and next step for you below. I'd love to connect again this week to walk through it.

[Your name at Vault Co]`;

  const proposalPositioning = buildProposalStrategy(session, followUpType);

  const objectionRecap = primaryObj
    ? `Their primary concern was "${primaryObj.category.replace(/_/g, " ")}". In follow-up, acknowledge it first before presenting any value — "I wanted to address what you mentioned about ${primaryObj.category.replace(/_/g, " ")} directly…"`
    : "No specific objection to address — focus on reinforcing the pain and the next step.";

  const nextStepRecommendation = followUpType === "hot_lead"
    ? `Send SMS within 30 minutes, email within 2 hours, call back to close today or tomorrow.`
    : followUpType === "ghosting_risk"
      ? `Text ${firstName} now. If no response in 2 hours, call and leave a voicemail.`
      : `Send follow-up email within 24 hours. Schedule the next call within 72 hours.`;

  return {
    email: {
      subject: emailSubject,
      body: emailBody,
      send_timing: followUpType === "hot_lead" ? "within 2 hours" : followUpType === "ghosting_risk" ? "within 30 minutes" : "within 24 hours",
    },
    sms: {
      body: smsBody.slice(0, 160),
      send_timing: followUpType === "hot_lead" ? "within 30 minutes" : followUpType === "ghosting_risk" ? "now" : "within 2 hours",
    },
    loom_talking_points: loomPoints,
    proposal_positioning: proposalPositioning,
    objection_specific_recap: objectionRecap,
    next_step_recommendation: nextStepRecommendation,
  };
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export interface FollowupGeneratorResult {
  follow_up_kit: FollowUpKit;
  latency_ms: number;
  model: string;
  mock_mode: boolean;
}

export async function generateFollowUp(session: LiveCallSession): Promise<FollowupGeneratorResult> {
  const start = Date.now();
  const followUpType = classifyFollowUpType(session);

  if (!isAnthropicAvailable() || session.transcript.length < 3) {
    return {
      follow_up_kit: { follow_up_type: followUpType, ...buildRuleBasedFollowup(session, followUpType) },
      latency_ms: Date.now() - start,
      model: "rule-based",
      mock_mode: true,
    };
  }

  try {
    const result = await callAnthropicTool<Omit<FollowUpKit, "follow_up_type">>({
      model: VICTORIA_MODELS.ORCHESTRATOR, // Sonnet — quality + speed balance
      system: FOLLOWUP_SYSTEM_PROMPT,
      userMessage: buildFollowupUserMessage(session, followUpType),
      tool: FOLLOWUP_TOOL,
      maxTokens: 2000,
    });

    return {
      follow_up_kit: { follow_up_type: followUpType, ...result.output },
      latency_ms: result.latency_ms,
      model: result.model,
      mock_mode: false,
    };
  } catch (err) {
    console.error(
      "[Victoria:FollowupGenerator] AI generation failed — using rule-based fallback:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      follow_up_kit: { follow_up_type: followUpType, ...buildRuleBasedFollowup(session, followUpType) },
      latency_ms: Date.now() - start,
      model: "rule-based-fallback",
      mock_mode: true,
    };
  }
}
