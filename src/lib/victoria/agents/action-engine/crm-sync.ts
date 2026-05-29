// Victoria — CRM Sync Layer
// Generates a CRM-ready intelligence object from a completed session.
// Pure rule-based — no AI, no I/O.
// Server-side only.

import type {
  LiveCallSession, CRMSyncObject, DealHealth, FollowUpType,
} from "../../types";

// ─────────────────────────────────────────────────────────────
// Deal stage mapping
// ─────────────────────────────────────────────────────────────

const PHASE_TO_DEAL_STAGE: Record<string, string> = {
  rapport:       "New Lead",
  discovery:     "Discovery",
  deep_discovery:"Qualified Lead",
  positioning:   "Opportunity",
  handling:      "Negotiation",
  closing:       "Proposal",
  post_close:    "Closed Won",
  lost:          "Closed Lost",
};

// ─────────────────────────────────────────────────────────────
// Deal health computation
// ─────────────────────────────────────────────────────────────

function computeDealHealth(
  session: LiveCallSession,
  closeProbability: number
): DealHealth {
  if (session.phase === "lost") return "lost";
  if (session.scores.deal_risk >= 75) return "at_risk";
  if (closeProbability >= 60) return "hot";
  if (closeProbability >= 40) return "warm";
  return "cold";
}

// ─────────────────────────────────────────────────────────────
// Close probability estimation
// ─────────────────────────────────────────────────────────────

export function estimateCloseProbability(session: LiveCallSession): number {
  const { scores } = session;
  const unresolvedObjPenalty = session.objections.unresolved.length * 8;

  const base = Math.round(
    scores.close_readiness * 0.35 +
    scores.trust          * 0.25 +
    scores.urgency        * 0.20 +
    scores.pain_depth     * 0.15 +
    (100 - scores.deal_risk) * 0.05
  ) - unresolvedObjPenalty;

  return Math.max(5, Math.min(95, Math.round(base / 5) * 5)); // Clamp 5–95, round to nearest 5
}

// ─────────────────────────────────────────────────────────────
// Follow-up timing in minutes (relative to call end)
// ─────────────────────────────────────────────────────────────

const FOLLOWUP_OFFSET_MINUTES: Record<FollowUpType, number> = {
  hot_lead:        120,   // 2 hours
  nurture:         1440,  // 24 hours
  skeptical:       1440,  // 24 hours
  authority_issue: 1440,  // 24 hours
  budget_issue:    1440,  // 24 hours
  timing_issue:    7 * 24 * 60, // 1 week
  ghosting_risk:   60,    // 1 hour
  proposal_sent:   1440,  // 24 hours
  follow_up_booked: 1440, // 24 hours
};

// ─────────────────────────────────────────────────────────────
// Owner action recommendations
// ─────────────────────────────────────────────────────────────

const OWNER_ACTIONS: Record<FollowUpType, string> = {
  hot_lead:        "Send personalized follow-up SMS within 30 minutes. Call back today. Prepare proposal for delivery within 24 hours.",
  nurture:         "Send follow-up email within 24 hours referencing specific pain from call. Schedule next call within 72 hours.",
  skeptical:       "Lead with a case study in follow-up email. Offer a reference call with an existing client in the same vertical.",
  authority_issue: "Request a follow-up meeting that includes the decision maker. Prepare a shareable summary document.",
  budget_issue:    "Prepare ROI breakdown showing cost-per-lead vs. current lead cost. Offer phased entry option.",
  timing_issue:    "Set a 2-week reminder. Send light nurture email now. Identify the exact date their season starts.",
  ghosting_risk:   "Text immediately, then call within 1 hour. If no response in 24 hours, send the breakup message.",
  proposal_sent:   "Send proposal confirmation with clear deadline and next step. Call to review within 48 hours.",
  follow_up_booked:"Send calendar invite confirmation. Deliver proposal as pre-read before the next call.",
};

// ─────────────────────────────────────────────────────────────
// Primary objection extraction
// ─────────────────────────────────────────────────────────────

function extractPrimaryObjection(session: LiveCallSession): string {
  if (session.objections.raised.length === 0) return "None raised";
  const primary = session.objections.raised[0];
  return `${primary.category.replace(/_/g, " ")} — "${primary.raw_text.slice(0, 60)}"`;
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export function buildCRMSyncObject(
  session: LiveCallSession,
  followUpType: FollowUpType
): CRMSyncObject {
  const closeProbability = estimateCloseProbability(session);
  const dealHealth = computeDealHealth(session, closeProbability);
  const dealStage = PHASE_TO_DEAL_STAGE[session.phase] ?? "New Lead";
  const primaryObjection = extractPrimaryObjection(session);

  const offsetMinutes = FOLLOWUP_OFFSET_MINUTES[followUpType] ?? 1440;
  const followupDue = new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString();

  const probabilityBand: CRMSyncObject["probability_band"] =
    closeProbability >= 55 ? "high" : closeProbability >= 30 ? "medium" : "low";

  // Next step based on session state
  const nextStep = session.objections.unresolved.length > 0
    ? `Address unresolved objection (${session.objections.unresolved[0] ?? "unknown"}) on next call`
    : session.discovery.depth_score < 50
      ? "Deepen discovery — pain not vivid enough to close"
      : closeProbability >= 60
        ? "Send proposal and schedule close call within 48 hours"
        : "Follow-up call to continue discovery and build urgency";

  return {
    deal_stage: dealStage,
    deal_health: dealHealth,
    trust_score: session.scores.trust,
    urgency_score: session.scores.urgency,
    close_probability: closeProbability,
    primary_objection: primaryObjection,
    next_step: nextStep,
    followup_due: followupDue,
    recommended_owner_action: OWNER_ACTIONS[followUpType],
    probability_band: probabilityBand,
  };
}
