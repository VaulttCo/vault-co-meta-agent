// Victoria — Proposal Strategy Builder
// Generates a proposal positioning summary based on what was discovered in the call.
// Pure rule-based — no AI, no I/O.
// Server-side only.

import type { LiveCallSession, FollowUpType } from "../../types";

// ─────────────────────────────────────────────────────────────
// Vertical-specific proposal angles
// ─────────────────────────────────────────────────────────────

const VERTICAL_PAIN_ANGLE: Record<string, { primary: string; secondary: string }> = {
  roofing: {
    primary: "Storm season lead capture and exclusive territory protection",
    secondary: "Insurance job pipeline and referral loop automation",
  },
  hvac: {
    primary: "Year-round lead flow that smooths seasonal revenue variance",
    secondary: "Service agreement upsell and emergency call capture",
  },
  landscaping: {
    primary: "Spring/summer client acquisition and route-density optimization",
    secondary: "High-value landscape design client targeting",
  },
  painting: {
    primary: "Consistent exterior and interior job pipeline through peak season",
    secondary: "Premium client filtering to increase average job value",
  },
  remodeling: {
    primary: "High-intent homeowner lead generation with strong qualification",
    secondary: "Q4 project pipeline building for next year",
  },
  plumbing: {
    primary: "Emergency call capture and preventative maintenance subscription leads",
    secondary: "Water heater, drain, and remodel upsell opportunities",
  },
  electrical: {
    primary: "Panel upgrade, EV charger, and inspection lead capture",
    secondary: "Whole-home electrical upgrade client targeting",
  },
  general_contracting: {
    primary: "Project lead generation with pre-qualification to protect your estimating time",
    secondary: "Referral amplification for commercial and residential clients",
  },
  home_services: {
    primary: "Multi-service household lead capture and cross-sell sequencing",
    secondary: "Membership and maintenance plan client acquisition",
  },
  other: {
    primary: "Predictable, qualified lead generation from your target market",
    secondary: "Revenue growth through consistent inbound pipeline",
  },
};

// ─────────────────────────────────────────────────────────────
// Objection-specific proposal framing
// ─────────────────────────────────────────────────────────────

const OBJECTION_FRAMING: Record<string, string> = {
  price:            "Frame the proposal around ROI, not cost. Lead with the revenue potential, not the investment number. Show the cost-per-lead math and compare to what they're currently spending on HomeAdvisor or referral chasing.",
  timing:           "Frame the proposal as a seasonal launch — position the start date as an advantage ('we'll have campaigns optimized before your busy season starts'). Don't ask them to commit to the full year — commit to the first 90 days.",
  authority:        "Prepare a summary document designed for the spouse/partner to review. Keep it visual, ROI-focused, and under 2 pages. Reference that you've helped other husband-wife contracting businesses make this decision together.",
  trust:            "Lead with the case study, not the pitch deck. Let another contractor's success story do the selling. Offer a direct reference call with a current client in the same vertical.",
  agency_skepticism:"Acknowledge the bad experience before anything else. Show your onboarding process, communication SLA, and reporting structure. Transparency is the product — not just the leads.",
  already_have_marketing: "Position as complementary, not competitive. Show exactly which channels you use that their current agency doesn't. Focus on the specific gap — likely lead quality or cost-per-job.",
  cash_flow:        "Offer a phased start: month one at minimum viable spend to prove ROI, scale in month two. Calculate their cost-per-lead target so they know exactly when the math works.",
  think_about_it:   "The proposal should answer the specific question they're thinking about. Ask them directly what would need to be true for this to be a clear yes. Build the proposal to answer that question.",
  send_info:        "Package the 'info' as a tailored proposal — not a generic brochure. Name it after their business, reference their specific market and pain point. Make it feel like it was built for them (because it was).",
  competitor:       "Show side-by-side comparison if possible. Focus on what they said the competitor lacks — likely reporting, exclusivity, or lead quality. Never disparage the competitor by name.",
  guarantee:        "Structure the proposal with a clear performance milestone: 'If we don't deliver X by day 60, here's what happens.' Specificity in the guarantee removes the risk objection.",
};

// ─────────────────────────────────────────────────────────────
// Follow-up type framing
// ─────────────────────────────────────────────────────────────

const FOLLOW_UP_TYPE_FRAMING: Record<FollowUpType, string> = {
  hot_lead:       "The proposal should be a confirmation of what you already discussed — not a new presentation. Reference their exact words and pain. This is the offer they were moving toward. Make it easy to say yes.",
  nurture:        "The proposal should be low-friction and informative. It's not asking for a yes today — it's building the case for the yes that's coming. Include relevant case study and clear pricing tiers.",
  skeptical:      "Lead with credibility, not features. The proposal should open with proof: a case study, a reference, or a result. Build the product second, trust first.",
  authority_issue:"Build a shareable version — a 1-page summary the rep can forward to their spouse or partner. The proposal email should be addressed to both: 'Hi [Name] and [Partner Name], as we discussed...'",
  budget_issue:   "Show the minimum viable entry — not the full package. The goal is to get them started, prove ROI, then expand. Include cost-per-lead math prominently.",
  timing_issue:   "Frame the proposal as a future commitment with a concrete start date. 'If we kick off on [date], here's what your first 30 days look like.' Make waiting feel like the riskier choice.",
  ghosting_risk:  "Keep the proposal extremely short — max 1 page. One problem, one solution, one number, one next step. Don't overwhelm. The goal is a response, not a decision.",
  proposal_sent:  "The next touchpoint is about the proposal already sent. Prepare specific answers to their likely questions and a clear path to a signed agreement.",
  follow_up_booked: "The proposal should arrive before the next call as pre-read. Frame it as 'here's what we'll be reviewing together on [date].' Creates accountability and investment.",
};

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export function buildProposalStrategy(
  session: LiveCallSession,
  followUpType: FollowUpType
): string {
  const { prospect, objections, discovery } = session;
  const vertical = prospect.vertical;
  const verticalAngle = VERTICAL_PAIN_ANGLE[vertical] ?? VERTICAL_PAIN_ANGLE["other"];

  // Get primary objection framing
  const primaryObjCat = objections.raised.length > 0 ? objections.raised[0].category : null;
  const objectionFrame = primaryObjCat && OBJECTION_FRAMING[primaryObjCat]
    ? OBJECTION_FRAMING[primaryObjCat]
    : "Frame the proposal around the specific pain points uncovered in the call.";

  const typeFrame = FOLLOW_UP_TYPE_FRAMING[followUpType];

  // Build pain-specific positioning
  const painStatement = discovery.main_pain_stated
    ? `The proposal should anchor on the pain they expressed: ${discovery.pain_specificity === "vivid" ? "their pain is vivid — they know the cost" : discovery.pain_specificity === "specific" ? "pain is specific but impact needs reinforcing" : "pain is vague — restate it clearly and ask for confirmation"}.`
    : "Pain was not fully established on this call — the proposal should restate the problem clearly before presenting the solution.";

  const urgencyLine = discovery.timeline_urgency_present
    ? "Timeline urgency was present — reference it explicitly to make the proposal time-sensitive."
    : "No urgency was established — the proposal needs to create timeline context through seasonal or competitive framing.";

  return [
    `PRIMARY ANGLE: ${verticalAngle.primary}.`,
    `SECONDARY VALUE: ${verticalAngle.secondary}.`,
    "",
    `PROPOSAL FRAMING: ${typeFrame}`,
    "",
    `OBJECTION HANDLING IN PROPOSAL: ${objectionFrame}`,
    "",
    `PAIN ANCHORING: ${painStatement}`,
    urgencyLine,
  ].join("\n");
}
