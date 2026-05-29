// Victoria — Urgency Reinforcement Strategy Builder
// Generates the urgency reinforcement approach for post-call follow-up.
// Pure rule-based — no AI, no I/O. Personalized by vertical + objection + emotional state.
// Server-side only.

import type { LiveCallSession, UrgencyStrategy, UrgencyApproach } from "../../types";

// ─────────────────────────────────────────────────────────────
// Vertical-specific urgency templates
// ─────────────────────────────────────────────────────────────

const VERTICAL_SEASON_CONTEXT: Record<string, string> = {
  roofing:             "storm season and insurance claim season",
  hvac:                "summer cooling season / winter heating demand",
  landscaping:         "spring/summer growth season",
  painting:            "warm weather window before rain season",
  remodeling:          "Q4 project backlog before year-end budgets close",
  plumbing:            "freeze season preparation",
  electrical:          "inspection and permit windows",
  general_contracting: "permit and build season",
  home_services:       "pre-summer demand surge",
  other:               "peak demand season",
};

const VERTICAL_COMPETITOR_CONTEXT: Record<string, string> = {
  roofing:             "roofing companies in your service area are already running storm-season ads",
  hvac:                "competing HVAC contractors are locking up cooling-season leads now",
  landscaping:         "landscaping companies in your market are booking spring clients through paid search",
  painting:            "painting contractors are filling their summer schedules through targeted ads",
  remodeling:          "remodelers in your area are running aggressive referral + paid campaigns heading into Q4",
  plumbing:            "plumbing companies are running urgency-based seasonal campaigns",
  electrical:          "electrical contractors are capturing inspection-driven leads in your area",
  general_contracting: "GCs in your market are booking project leads for next quarter",
  home_services:       "home service companies in your zip codes are running multi-channel ad campaigns",
  other:               "your competitors are actively advertising in your service area",
};

const VERTICAL_COST_OF_INACTION: Record<string, string> = {
  roofing:             "Every week without a predictable lead system during storm season is 3–5 missed insurance jobs — each worth $8,000–$25,000.",
  hvac:                "Without consistent leads this cooling season, you're leaving service agreement and install revenue on the table through the summer.",
  landscaping:         "Spring booked without a lead system means you're spending the whole season chasing referrals instead of choosing your best clients.",
  painting:            "The warm weather window is your highest-revenue quarter — going in without paid leads is betting the season on word of mouth.",
  remodeling:          "Q4 homeowners with budget to spend are searching right now. Without a visible presence, that revenue goes to competitors.",
  plumbing:            "Emergency calls and seasonal maintenance jobs go to whoever is visible online first — that's not organic.",
  electrical:          "Homeowners needing panels, EV chargers, and inspections are searching daily. Organic alone can't capture this volume.",
  general_contracting: "Project leads with real budgets are decided before they call. Without visibility, you're not on the shortlist.",
  home_services:       "Home service searches spike before any major purchase decision. Without ads, you're invisible at the most important moment.",
  other:               "Every month without a consistent lead system is a month where revenue depends on luck rather than strategy.",
};

// ─────────────────────────────────────────────────────────────
// Approach selector
// ─────────────────────────────────────────────────────────────

function selectApproach(session: LiveCallSession): UrgencyApproach {
  const { prospect, scores, objections } = session;
  const vertical = prospect.vertical;

  // Seasonal objection was raised — acknowledge and reframe around season
  if (objections.raised.some((o) => o.category === "timing" || o.category === "seasonal" || o.category === "busy")) {
    return "seasonal_deadline";
  }

  // Urgency was very low — need to create it through consequence
  if (scores.urgency < 25) {
    return "cost_of_inaction";
  }

  // High-competition verticals where territorial scarcity is real
  if (["roofing", "hvac", "remodeling"].includes(vertical) && scores.trust >= 45) {
    return "competitor_threat";
  }

  // Good trust foundation — social proof is most effective
  if (scores.trust >= 55 && scores.close_readiness >= 30) {
    return "social_proof";
  }

  // Low close readiness but urgency is present — milestone approach
  if (scores.close_readiness < 30 && scores.urgency >= 30) {
    return "milestone_based";
  }

  // Default: cost of inaction works across all profiles
  return "cost_of_inaction";
}

// ─────────────────────────────────────────────────────────────
// Strategy builders per approach
// ─────────────────────────────────────────────────────────────

function buildSeasonalDeadlineStrategy(session: LiveCallSession): UrgencyStrategy {
  const seasonCtx = VERTICAL_SEASON_CONTEXT[session.prospect.vertical] ?? "peak demand season";
  const name = session.prospect.name.split(" ")[0];

  return {
    approach: "seasonal_deadline",
    headline: `The window to get ahead of ${seasonCtx} closes in the next 4–6 weeks`,
    key_messages: [
      `Campaigns need 2–3 weeks to optimize before peak — starting now means you're capturing revenue from week one of your busy season`,
      `Every contractor who waits until the season starts is chasing leads instead of choosing them`,
      `${name} — the contractors who win this ${seasonCtx} started their lead systems last month`,
    ],
    timing: "Reference in your first follow-up within 2 hours. Create calendar urgency without false deadlines.",
    what_to_avoid: "Don't invent a fake deadline. Don't pressure with urgency that isn't real. Use the actual season as the timeline.",
  };
}

function buildCostOfInactionStrategy(session: LiveCallSession): UrgencyStrategy {
  const costCtx = VERTICAL_COST_OF_INACTION[session.prospect.vertical] ?? VERTICAL_COST_OF_INACTION["other"];

  return {
    approach: "cost_of_inaction",
    headline: "The cost of waiting is not zero — it compounds every week",
    key_messages: [
      costCtx,
      "The real question isn't whether this is a good investment — it's how much the status quo is already costing",
      "Referral-dependent businesses don't scale — they survive. Sustainable growth needs a controllable lead channel",
    ],
    timing: "Use in follow-up email. Not for SMS — too heavy. Best for the second or third touchpoint.",
    what_to_avoid: "Don't use numbers you can't back up. Don't assume you know their exact revenue loss. Frame it as a question: 'What does a slow month cost you?'",
  };
}

function buildCompetitorThreatStrategy(session: LiveCallSession): UrgencyStrategy {
  const competitorCtx = VERTICAL_COMPETITOR_CONTEXT[session.prospect.vertical] ?? VERTICAL_COMPETITOR_CONTEXT["other"];
  const name = session.prospect.name.split(" ")[0];

  return {
    approach: "competitor_threat",
    headline: "The market doesn't wait — your competitors are moving while you're deciding",
    key_messages: [
      `Right now, ${competitorCtx}`,
      "We only work with one contractor per market area to avoid competing for the same leads — that exclusivity only holds while you're in conversation",
      `${name} — market position is easier to establish than to recover once a competitor occupies your zip codes`,
    ],
    timing: "Reference casually — don't weaponize it. Best as a third touchpoint or before silence on a hot lead.",
    what_to_avoid: "Don't fabricate competitor data. Don't create false scarcity. The exclusivity angle must be genuine policy, not a tactic.",
  };
}

function buildSocialProofStrategy(session: LiveCallSession): UrgencyStrategy {
  const vertical = session.prospect.vertical;
  const name = session.prospect.name.split(" ")[0];

  return {
    approach: "social_proof",
    headline: "What other contractors in your vertical saw in their first 60 days",
    key_messages: [
      `We're working with several ${vertical} contractors right now — the ones who moved quickly in month one are already seeing consistent inbound leads`,
      `${name} — I'd like to share a specific case study from a ${vertical} contractor in a comparable market so you can see the exact results and timeline`,
      "The contractors who get the most out of this program make one decision quickly and then execute relentlessly",
    ],
    timing: "Lead with this in the follow-up — it builds trust while maintaining momentum. Pair with a real case study or result.",
    what_to_avoid: "Don't use vague or inflated results. Never say 'contractors just like you' — be specific about vertical and market type.",
  };
}

function buildMilestoneStrategy(session: LiveCallSession): UrgencyStrategy {
  const name = session.prospect.name.split(" ")[0];

  return {
    approach: "milestone_based",
    headline: "Let's start small — prove the system, then scale it",
    key_messages: [
      `${name}, I hear you — the smartest move is to start with a specific milestone: let's get you 5 qualified leads in 30 days and measure from there`,
      "You don't have to bet everything upfront. Start with one campaign, one market, one month",
      "The rep who earns trust proves value first. That's the deal I'm offering",
    ],
    timing: "Use with hesitant prospects. Reduces perceived risk and lowers the activation energy for a yes.",
    what_to_avoid: "Don't create a trial that doesn't have clear success metrics. Define exactly what 'winning' looks like in 30 days before making this offer.",
  };
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export function buildUrgencyStrategy(session: LiveCallSession): UrgencyStrategy {
  const approach = selectApproach(session);

  switch (approach) {
    case "seasonal_deadline":   return buildSeasonalDeadlineStrategy(session);
    case "cost_of_inaction":    return buildCostOfInactionStrategy(session);
    case "competitor_threat":   return buildCompetitorThreatStrategy(session);
    case "social_proof":        return buildSocialProofStrategy(session);
    case "milestone_based":     return buildMilestoneStrategy(session);
    default:                    return buildCostOfInactionStrategy(session);
  }
}
