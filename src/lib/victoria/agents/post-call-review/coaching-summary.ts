// Victoria — AI Coaching Summary Generator
// Uses Claude Opus (DEBRIEF model) to produce a comprehensive post-call coaching debrief.
// No latency pressure — this runs after the call ends.
// Falls back to rule-based output if AI is unavailable.
// Server-side only.

import { callAnthropicTool, isAnthropicAvailable, VICTORIA_MODELS } from "../../anthropic";
import type {
  LiveCallSession,
  MissedOpportunity,
  TurningPoint,
  RepScorecard,
  CloseProbabilityAssessment,
} from "../../types";

// ─────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────

const COACHING_SUMMARY_SYSTEM_PROMPT = `You are Victoria — an elite AI sales director and coach for Vault Co, a Meta ads agency serving home service contractors (roofers, HVAC, landscaping, etc.).

You are reviewing a completed sales call. Your job is to provide the most honest, actionable, and commercially useful coaching debrief possible.

VICTORIA'S COACHING PHILOSOPHY:
- Sales is a skill that compounds. Every call is training data.
- Prospects don't buy features — they buy solutions to painful, urgent problems.
- Trust is built through acknowledgment, not through talking more.
- The rep's job is to surface pain, not explain value.
- "Think about it" is almost always a smokescreen for an unhandled objection.
- Silence after a question is the most powerful sales tool.
- A rep who talks more than 45% of the time is telling, not selling.

YOUR OUTPUT STANDARDS:
- Be direct. No sugarcoating. Reps improve when they get honest feedback.
- Be specific. Reference what actually happened in the call.
- Be actionable. Every piece of feedback must have a "here's what to do differently."
- Be encouraging where deserved. Reinforce what worked.
- Score harshly but fairly. A 70/100 is a solid call.`;

// ─────────────────────────────────────────────────────────────
// Tool definition
// ─────────────────────────────────────────────────────────────

const COACHING_SUMMARY_TOOL = {
  name: "generate_post_call_review",
  description: "Generate a comprehensive post-call coaching debrief for the sales rep",
  input_schema: {
    type: "object" as const,
    properties: {
      executive_summary: {
        type: "string",
        description: "2–3 sentence overview: what happened, the call outcome, and the overall quality. Be direct.",
      },
      rep_performance_review: {
        type: "string",
        description: "3–5 sentences of honest narrative coaching. What did the rep do well? Where did they lose the deal? What's the single most important skill to work on?",
      },
      objection_analysis: {
        type: "string",
        description: "How were objections handled? Were they isolated? Reframed? What slipped through? 2–3 sentences.",
      },
      close_probability: {
        type: "object",
        properties: {
          probability: { type: "number", description: "0–100. How likely is this prospect to close on the next call or with proper follow-up?" },
          reasoning: { type: "string", description: "1–2 sentences explaining the probability score." },
          blockers: { type: "array", items: { type: "string" }, description: "2–4 specific blockers preventing the close." },
          accelerators: { type: "array", items: { type: "string" }, description: "2–3 things that could accelerate the close on the next interaction." },
        },
        required: ["probability", "reasoning", "blockers", "accelerators"],
      },
      next_call_strategy: {
        type: "string",
        description: "Specific strategy for the next call. What needs to happen? What questions must be asked? What must NOT be done? 3–4 sentences.",
      },
      follow_up_recommendations: {
        type: "array",
        items: { type: "string" },
        description: "3–5 specific, actionable follow-up steps. Include timing and channel (text, call, email, etc.).",
      },
      rep_scorecard: {
        type: "object",
        properties: {
          overall_score: { type: "number", description: "0–100 overall call score. 70+ is solid. 85+ is excellent." },
          grade: { type: "string", enum: ["A", "B", "C", "D", "F"], description: "Letter grade: A=90+, B=80+, C=70+, D=60+, F=<60" },
          talk_ratio_score: { type: "number", description: "0–100. Did rep stay below 45% talk time?" },
          question_quality_score: { type: "number", description: "0–100. Did rep ask deep, open-ended questions that revealed real pain?" },
          emotional_intelligence_score: { type: "number", description: "0–100. Did rep read and respond to prospect emotions effectively?" },
          discovery_score: { type: "number", description: "0–100. Did rep uncover real pain, financial impact, and buying motivation?" },
          objection_handling_score: { type: "number", description: "0–100. Did rep isolate, reframe, and handle objections professionally?" },
          closing_skill_score: { type: "number", description: "0–100. Did rep use trial closes, commit next steps, and not retreat under pressure?" },
          areas_of_strength: {
            type: "array",
            items: { type: "string" },
            description: "2–3 specific things the rep did well. Be specific — not generic praise.",
          },
          areas_for_improvement: {
            type: "array",
            items: { type: "string" },
            description: "2–3 specific, prioritized improvement areas. Lead with the most impactful fix.",
          },
        },
        required: [
          "overall_score", "grade", "talk_ratio_score", "question_quality_score",
          "emotional_intelligence_score", "discovery_score", "objection_handling_score",
          "closing_skill_score", "areas_of_strength", "areas_for_improvement",
        ],
      },
      ai_coaching_summary: {
        type: "string",
        description: "Victoria's personal coaching message to the rep. Speak directly to them. Acknowledge what worked, name the critical mistake, and give one specific drill to fix it. 4–6 sentences. Be a coach — honest, supportive, specific.",
      },
    },
    required: [
      "executive_summary", "rep_performance_review", "objection_analysis",
      "close_probability", "next_call_strategy", "follow_up_recommendations",
      "rep_scorecard", "ai_coaching_summary",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// User message builder
// ─────────────────────────────────────────────────────────────

function buildUserMessage(
  session: LiveCallSession,
  missed: MissedOpportunity[],
  turningPoints: TurningPoint[]
): string {
  const { prospect, scores, discovery, objections, transcript, timeline } = session;

  const durationChunks = transcript.length;
  const repChunks = transcript.filter((c) => c.speaker === "rep");
  const prospectChunks = transcript.filter((c) => c.speaker === "prospect");
  const repWords = repChunks.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0);
  const prospectWords = prospectChunks.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0);
  const totalWords = repWords + prospectWords;
  const repTalkPercent = totalWords > 0 ? Math.round((repWords / totalWords) * 100) : 50;

  // Transcript: include up to 25 most recent chunks with full context
  const transcriptSample = transcript
    .slice(-25)
    .map((c) => `${c.speaker.toUpperCase()}: ${c.text}`)
    .join("\n");

  // Key timeline moments (high-severity only)
  const keyEvents = timeline
    .filter((e) => e.severity === "critical" || e.severity === "high")
    .slice(0, 8)
    .map((e) => `[Chunk ${e.chunk_index}] ${e.event_type.toUpperCase()}: ${e.title} — ${e.description}`)
    .join("\n");

  // Missed opportunities summary
  const missedSummary = missed
    .slice(0, 6)
    .map((m, i) => `${i + 1}. [${m.severity.toUpperCase()}] ${m.type.replace(/_/g, " ")}: ${m.what_happened}`)
    .join("\n");

  // Turning points summary
  const turningPointsSummary = turningPoints
    .slice(0, 6)
    .map((tp, i) => `${i + 1}. [${tp.direction.toUpperCase()}] ${tp.title}: ${tp.description}`)
    .join("\n");

  // Objections
  const objectionsSummary = objections.raised
    .map((o) => `- ${o.category}: "${o.raw_text.slice(0, 60)}"`)
    .join("\n") || "None detected";

  return `PROSPECT: ${prospect.name} · ${prospect.company} · ${prospect.vertical}
CALL DURATION: ${durationChunks} chunks processed
PHASE AT END: ${session.phase}

FINAL SESSION SCORES:
- Trust: ${scores.trust}/100
- Pain Depth: ${scores.pain_depth}/100
- Urgency: ${scores.urgency}/100
- Close Readiness: ${scores.close_readiness}/100
- Emotional Engagement: ${scores.emotional_engagement}/100
- Deal Risk: ${scores.deal_risk}/100 (high = risky)

DISCOVERY:
- Depth score: ${discovery.depth_score}/100 (${discovery.depth_rating})
- Pain stated: ${discovery.main_pain_stated ? "Yes" : "No"} (${discovery.pain_specificity})
- Financial impact quantified: ${discovery.financial_impact_quantified ? "Yes" : "No"}
- Emotional impact expressed: ${discovery.emotional_impact_expressed ? "Yes" : "No"}
- Timeline urgency present: ${discovery.timeline_urgency_present ? "Yes" : "No"}

TALK RATIO: Rep ${repTalkPercent}% · Prospect ${100 - repTalkPercent}%

OBJECTIONS RAISED:
${objectionsSummary}
Unresolved: ${objections.unresolved.length > 0 ? objections.unresolved.join(", ") : "None"}

KEY TIMELINE EVENTS:
${keyEvents || "No significant events detected"}

MISSED OPPORTUNITIES DETECTED:
${missedSummary || "None detected"}

TURNING POINTS:
${turningPointsSummary || "No clear turning points detected"}

TRANSCRIPT (last 25 chunks):
${transcriptSample}

Based on this call, generate your complete post-call coaching debrief.`;
}

// ─────────────────────────────────────────────────────────────
// Rule-based fallback (when AI is unavailable)
// ─────────────────────────────────────────────────────────────

interface CoachingSummaryOutput {
  executive_summary: string;
  rep_performance_review: string;
  objection_analysis: string;
  close_probability: CloseProbabilityAssessment;
  next_call_strategy: string;
  follow_up_recommendations: string[];
  rep_scorecard: RepScorecard;
  ai_coaching_summary: string;
}

function buildRuleBasedSummary(
  session: LiveCallSession,
  missed: MissedOpportunity[],
  turningPoints: TurningPoint[]
): CoachingSummaryOutput {
  const { scores, discovery, objections, transcript, prospect } = session;

  // Compute talk ratio
  const repChunks = transcript.filter((c) => c.speaker === "rep");
  const prospectChunks = transcript.filter((c) => c.speaker === "prospect");
  const repWords = repChunks.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0);
  const totalWords = repWords + prospectChunks.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0);
  const repPercent = totalWords > 0 ? Math.round((repWords / totalWords) * 100) : 50;

  // Scorecard
  const talkRatioScore = repPercent <= 35 ? 95 : repPercent <= 45 ? 85 : repPercent <= 55 ? 70 : repPercent <= 65 ? 50 : 25;
  const questionScore = discovery.depth_score >= 60 ? 80 : discovery.depth_score >= 40 ? 65 : 45;
  const emotionScore = missed.filter((m) => m.type === "emotional_cue_ignored").length === 0 ? 85 : 45;
  const discoveryScore = discovery.depth_score;
  const objHandlingScore = objections.raised.length > 0
    ? Math.round((1 - objections.unresolved.length / objections.raised.length) * 80)
    : 70;
  const closingScore = scores.close_readiness >= 50 ? 70 : scores.close_readiness >= 30 ? 55 : 40;
  const overall = Math.round(
    (talkRatioScore + questionScore + emotionScore + discoveryScore + objHandlingScore + closingScore) / 6
  );

  const grade: RepScorecard["grade"] =
    overall >= 90 ? "A" : overall >= 80 ? "B" : overall >= 70 ? "C" : overall >= 60 ? "D" : "F";

  const criticalMissed = missed.filter((m) => m.severity === "critical");
  const closeProbability = Math.min(
    85,
    Math.max(10, scores.close_readiness + (criticalMissed.length > 2 ? -15 : 0))
  );

  const blockers: string[] = [];
  if (scores.trust < 50) blockers.push("Trust not fully established — prospect not open enough to commit");
  if (scores.pain_depth < 40) blockers.push("Pain not made vivid — prospect doesn't feel the urgency to change");
  if (objections.unresolved.length > 0) blockers.push(`Unresolved objections: ${objections.unresolved.join(", ")}`);
  if (scores.urgency < 30) blockers.push("No clear timeline or urgency created");

  return {
    executive_summary: `${prospect.name} from ${prospect.company} — ${transcript.length}-chunk call ending in ${session.phase} phase. Discovery reached ${discovery.depth_score}/100. ${criticalMissed.length > 0 ? `${criticalMissed.length} critical missed opportunities detected.` : "Rep showed solid fundamentals."} Close probability: ${closeProbability}%.`,

    rep_performance_review: `Rep achieved a discovery depth of ${discovery.depth_score}/100 with talk ratio at ${repPercent}%. ${repPercent > 55 ? "Rep dominated the conversation — this is the primary barrier to deeper prospect engagement." : "Talk ratio was within an acceptable range."} ${missed.length > 0 ? `${missed.length} missed opportunities were detected, including ${missed.slice(0, 2).map((m) => m.type.replace(/_/g, " ")).join(" and ")}.` : "No significant missed opportunities were flagged."}`,

    objection_analysis: objections.raised.length > 0
      ? `${objections.raised.length} objection(s) were raised (${objections.raised.map((o) => o.category).join(", ")}). ${objections.unresolved.length > 0 ? `${objections.unresolved.length} remain unresolved going into the next call.` : "All were addressed."} The most common failure is handling objections without isolating them first.`
      : "No objections were detected in this call. This could mean the rep is pitching before the prospect is ready to engage with objections — or the discovery was too shallow to surface real concerns.",

    close_probability: {
      probability: closeProbability,
      reasoning: `Based on close readiness score (${scores.close_readiness}/100), trust (${scores.trust}/100), and ${missed.length} missed opportunities.`,
      blockers: blockers.length > 0 ? blockers : ["Insufficient pain vividness to drive urgency"],
      accelerators: [
        "Send a personalized follow-up referencing their specific pain point within 24 hours",
        "Prepare a case study from a similar contractor in their vertical",
        "Open next call by asking what they've thought about since your conversation",
      ],
    },

    next_call_strategy: `Open by asking what ${prospect.name} thought about since your last conversation. Don't recap — let them tell you. Then drill deeper into the financial impact of their pain point. Do NOT pitch until discovery hits 60/100. Your job on this call is to make their problem feel more painful and more urgent, then present Vault Co as the precise solution.`,

    follow_up_recommendations: [
      `Text ${prospect.name} within 2 hours: "Great speaking with you — I pulled a quick look at what we're seeing for [vertical] contractors in your area. Mind if I share it?"`,
      `Send a case study of a similar contractor (same vertical) who solved a similar problem with Vault Co within 24 hours`,
      "Schedule the next call within 72 hours — longer gaps allow deals to go cold",
      "Prepare one specific question that will deepen the pain: focus on the financial and emotional impact",
      "Review the objections raised and prepare your isolation + reframe script before the next call",
    ],

    rep_scorecard: {
      overall_score: overall,
      grade,
      talk_ratio_score: talkRatioScore,
      question_quality_score: questionScore,
      emotional_intelligence_score: emotionScore,
      discovery_score: discoveryScore,
      objection_handling_score: objHandlingScore,
      closing_skill_score: closingScore,
      areas_of_strength: [
        scores.trust >= 55 ? "Built solid initial rapport and trust" : "Maintained professional tone throughout",
        discovery.main_pain_stated ? "Successfully surfaced the prospect's core pain point" : "Kept conversation moving forward",
      ].filter(Boolean),
      areas_for_improvement: [
        repPercent > 55 ? `Talk ratio at ${repPercent}% — target under 45%. Ask a question, then listen fully` : null,
        discovery.depth_score < 50 ? "Discovery too shallow — dig into financial and emotional impact before pitching" : null,
        criticalMissed.length > 0 ? `${criticalMissed.length} critical opportunity missed — review the replay timeline` : null,
        objections.unresolved.length > 0 ? "Isolate every objection before handling: \"Besides that, is there anything else?\"" : null,
      ].filter(Boolean) as string[],
    },

    ai_coaching_summary: `${prospect.name} was a ${closeProbability >= 50 ? "live" : "cold"} deal — the right conditions ${closeProbability >= 50 ? "are there" : "weren't quite there yet"}. ${repPercent > 55 ? `Your talk ratio at ${repPercent}% is your #1 issue to fix — every extra minute you talk is a minute the prospect isn't telling you why they need to buy.` : `Talk ratio was solid at ${repPercent}% — you gave them room to think.`} ${criticalMissed.length > 0 ? `The ${criticalMissed[0].type.replace(/_/g, " ")} at chunk ${criticalMissed[0].chunk_index} was the pivotal mistake — that's where you lost their momentum.` : "No critical mistakes — solid execution."} For the next call: do not pitch until you've quantified their financial pain. One drill: record yourself and count how many times you asked a follow-up question vs. moved on. That number tells you everything.`,
  };
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export interface CoachingSummaryResult extends CoachingSummaryOutput {
  latency_ms: number;
  model: string;
  mock_mode: boolean;
}

export async function generateCoachingSummary(
  session: LiveCallSession,
  missed: MissedOpportunity[],
  turningPoints: TurningPoint[]
): Promise<CoachingSummaryResult> {
  const start = Date.now();

  if (!isAnthropicAvailable() || session.transcript.length < 3) {
    return {
      ...buildRuleBasedSummary(session, missed, turningPoints),
      latency_ms: Date.now() - start,
      model: "rule-based",
      mock_mode: true,
    };
  }

  try {
    const result = await callAnthropicTool<CoachingSummaryOutput>({
      model: VICTORIA_MODELS.DEBRIEF,
      system: COACHING_SUMMARY_SYSTEM_PROMPT,
      userMessage: buildUserMessage(session, missed, turningPoints),
      tool: COACHING_SUMMARY_TOOL,
      maxTokens: 3000,
    });

    return {
      ...result.output,
      latency_ms: result.latency_ms,
      model: result.model,
      mock_mode: false,
    };
  } catch (err) {
    console.error(
      "[Victoria:CoachingSummary] AI generation failed — using rule-based fallback:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      ...buildRuleBasedSummary(session, missed, turningPoints),
      latency_ms: Date.now() - start,
      model: "rule-based-fallback",
      mock_mode: true,
    };
  }
}
