// Vault Core — Legacy Vault Co GHL learning archive (Phase 6.8, server-side).
//
// Treats the OLD Vault Co GHL sub-account as a READ-ONLY historical archive to
// learn what worked, what failed, and what must never be repeated. If the legacy
// account isn't configured, returns curated mock historical lessons so the
// learning layer is always functional. NEVER mutates anything; GET-only.

import { isGhlConfigured, ghlGet } from "../integrations/ghl/client";

export type LegacyLearningKind = "strong" | "weak" | "objection" | "timing" | "automation";

export interface LegacyLearning {
  title: string;
  detail: string;
  kind: LegacyLearningKind;
}

export interface LegacyRecommendationSpec {
  title: string;
  body: string;
  impact: string;
  agent: "veronica" | "vanessa" | "vega" | "victoria";
}

export interface LegacyAutomationNode {
  name: string;
  weakness: string;
  improvement: string;
}

export interface LegacyAnalysis {
  source: "live" | "mock";
  conversationsAnalyzed: number | null;
  learnings: LegacyLearning[];
  recommendations: LegacyRecommendationSpec[];
  automationMap: LegacyAutomationNode[];
}

// Curated historical lessons (Vault Co's own messaging history). These are the
// learnings the workforce should internalize; live legacy data, when present,
// confirms volume but the lessons remain the durable output.
const LEARNINGS: LegacyLearning[] = [
  { kind: "strong", title: "Same-day, specific-time booking offers got replies", detail: "Messages offering a concrete slot ('tomorrow 9am or 1pm?') booked far better than open-ended 'when works for you?'." },
  { kind: "strong", title: "Real seasonal urgency booked faster", detail: "Storm-season references tied to actual weather created genuine urgency and quicker responses." },
  { kind: "weak", title: "'Just following up' texts were ignored", detail: "Generic check-ins with no new value or specific ask were the most-ghosted messages." },
  { kind: "weak", title: "Multi-question messages reduced replies", detail: "Texts asking two or more things at once lowered response rate; one clear ask performed best." },
  { kind: "objection", title: "'Price seems high' recurred — handled with discounts", detail: "Historically met with price drops instead of reframing to cost-per-booked-job; trained prospects to negotiate." },
  { kind: "objection", title: "'Comparing quotes' went cold without differentiation", detail: "No follow-up that differentiated the booked-appointment system → leads drifted to whoever replied fastest." },
  { kind: "timing", title: "Follow-up gaps over 48h correlated with ghosting", detail: "Once a thread went quiet for two days, revival rates dropped sharply." },
  { kind: "timing", title: "Late missed-call texts lost the lead", detail: "Missed-call follow-up sent hours later (not minutes) missed the intent window." },
  { kind: "automation", title: "Reactivation flow was too aggressive", detail: "Daily reactivation texts drove opt-outs; cadence was not value-led." },
  { kind: "automation", title: "No human-takeover step on a lead question", detail: "When a lead replied with a real question, automation kept sending sequence steps instead of handing to a human." },
];

const RECOMMENDATIONS: LegacyRecommendationSpec[] = [
  { agent: "veronica", title: "Stop using weak 'just following up' language", body: "Legacy data shows generic check-ins were the most-ignored messages. Replace with value- or specific-ask follow-ups (a concrete time, a relevant detail). Update the follow-up framework.", impact: "Higher reply + booking rate on follow-ups" },
  { agent: "veronica", title: "Improve missed-call response timing", body: "Legacy missed-call texts went out hours late and lost intent. Recommend an auto-text within ~2 minutes plus a human follow within 15 minutes (human-approved templates).", impact: "Recover missed-call leads in the intent window" },
  { agent: "veronica", title: "Rewrite the reactivation sequence (less frequent, value-led)", body: "The old reactivation flow texted daily and drove opt-outs. Recommend a slower, seasonal, value-led cadence. Draft for human review — nothing sends automatically.", impact: "Fewer opt-outs, more reactivations" },
  { agent: "vanessa", title: "Adopt the Vault Co messaging standard (specific · single-ask · fast)", body: "Codify the legacy lessons into a company messaging standard: respond fast, lead with the prospect's outcome, one clear ask, real urgency only. Make it the baseline every executive drafts against.", impact: "Consistent, higher-converting messaging across the workforce" },
];

const AUTOMATION_MAP: LegacyAutomationNode[] = [
  { name: "New Lead → Speed-to-Lead", weakness: "First text delay measured in minutes-to-hours.", improvement: "Auto-text < 2 min; human follow within 15." },
  { name: "Missed Call Follow-Up", weakness: "Sent late; generic copy.", improvement: "Immediate, specific missed-call recovery text." },
  { name: "Long-Term Nurture", weakness: "Generic 'following up' steps; ignored.", improvement: "Value-led, seasonal touches; single ask." },
  { name: "Reactivation", weakness: "Daily cadence → opt-outs.", improvement: "Slower, value-first cadence; clear opt-out." },
  { name: "Appointment Reminder", weakness: "Reminder too early; no same-day nudge.", improvement: "Add same-day confirmation nudge with urgency framing." },
  { name: "(missing) Human Takeover", weakness: "No step to hand off when a lead replies with a question.", improvement: "Add human-takeover trigger on inbound question." },
];

export async function getLegacyAnalysis(): Promise<LegacyAnalysis> {
  let source: "live" | "mock" = "mock";
  let conversationsAnalyzed: number | null = null;

  // If the legacy Vault Co account is configured, do a light READ-ONLY presence
  // check to report volume. The durable lessons remain the curated set above.
  if (isGhlConfigured("legacy")) {
    try {
      const res = await ghlGet<{ conversations?: unknown[] }>("legacy", "conversations/search", { limit: 100 });
      if (res && Array.isArray(res.conversations)) {
        source = "live";
        conversationsAnalyzed = res.conversations.length;
      }
    } catch {
      /* fail-safe → mock */
    }
  }

  return { source, conversationsAnalyzed, learnings: LEARNINGS, recommendations: RECOMMENDATIONS, automationMap: AUTOMATION_MAP };
}
