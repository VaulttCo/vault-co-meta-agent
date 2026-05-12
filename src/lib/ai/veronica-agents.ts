// Server-side only — never import in client components.
// All 19 Veronica 2.0 agents. Pure deterministic analysis, no API calls, no DB writes.
// Approval-gated operator mode: agents draft and recommend — humans approve and act.
// No live Meta/GHL actions. No SMS/email. No contact or pipeline modifications.

import type {
  ClientBrain,
  VeronicaPortalContext,
} from "@/lib/ai/veronica";
import type { Approval } from "@/lib/data";
import type { CampaignDraft } from "@/lib/planStore";
import type { PersistedReport } from "@/lib/data/data-provider";

// ── Agent ID ──────────────────────────────────────────────────────────────────

export type AgentId =
  | "client_health"
  | "launch_readiness"
  | "client_intelligence"
  | "media_buyer"
  | "ghl_followup"
  | "sales_conversion"
  | "creative_strategist"
  | "offer_messaging"
  | "reporting"
  | "operator_priority"
  | "client_retention"
  | "upsell_opportunity"
  | "capacity_scaling"
  | "data_quality"
  | "compliance_risk"
  | "landing_page_cro"
  | "appointment_setter"
  | "client_communication"
  | "ghl_workflow_builder";

export const AGENT_DISPLAY_NAMES: Record<AgentId, string> = {
  client_health: "Client Health",
  launch_readiness: "Launch Readiness",
  client_intelligence: "Client Intelligence",
  media_buyer: "Media Buyer",
  ghl_followup: "GHL Follow-Up",
  sales_conversion: "Sales Conversion",
  creative_strategist: "Creative Strategist",
  offer_messaging: "Offer & Messaging",
  reporting: "Reporting",
  operator_priority: "Operator Priority",
  client_retention: "Client Retention",
  upsell_opportunity: "Upsell Opportunity",
  capacity_scaling: "Capacity & Scaling",
  data_quality: "Data Quality",
  compliance_risk: "Compliance & Risk",
  landing_page_cro: "Landing Page CRO",
  appointment_setter: "Appointment Setter Coaching",
  client_communication: "Client Communication",
  ghl_workflow_builder: "GHL Workflow Builder",
};

// ── Shared internal helper ────────────────────────────────────────────────────

function isPending(v: string | null | undefined): boolean {
  if (!v) return true;
  const l = v.toLowerCase();
  return l === "pending" || l.startsWith("pending") || l === "" || l === "—";
}

// ── Output type interfaces ────────────────────────────────────────────────────

export interface ClientHealthOutput {
  healthScore: number;
  status: "healthy" | "watch" | "at_risk" | "blocked";
  riskReasons: string[];
  topBlocker: string | null;
  nextBestAction: string;
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface LaunchReadinessOutput {
  launchReadinessScore: number;
  maxScore: number;
  status: "ready" | "almost_ready" | "blocked" | "incomplete";
  missingItems: string[];
  blockingItems: string[];
  recommendedLaunchSequence: string[];
  whatNotToDoYet: string;
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface ClientIntelligenceOutput {
  clientPositioning: string;
  idealCustomerSummary: string;
  keyObjections: string[];
  salesProcessRisks: string[];
  bestOfferAngles: string[];
  recommendedMessaging: string[];
  importantClientNotes: string[];
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface MediaBuyerOutput {
  adBottleneck: string;
  scalingReadiness: "yes" | "no" | "caution";
  budgetRecommendation: string;
  whatNotToDoYet: string;
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface GhlFollowUpOutput {
  ghlConnected: boolean;
  ghlSynced: boolean;
  ghlStaleDays: number | null;
  followUpBottleneck: string;
  bookingIssue: string | null;
  pipelineIssue: string | null;
  recommendedFollowUpAudit: string[];
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface SalesConversionOutput {
  conversionBottleneck: string;
  salesScriptNeeded: boolean;
  followUpFixes: string[];
  appointmentBookingRisk: string;
  closeRateRisk: string;
  recommendedSalesAction: string;
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface CreativeStrategistOutput {
  creativeReadiness: "strong" | "adequate" | "weak" | "missing";
  recommendedAssets: string[];
  missingCreativeTypes: string[];
  nextShootRecommendation: string;
  bestAnglesToTest: string[];
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface OfferMessagingOutput {
  bestHooks: string[];
  bestAngles: string[];
  offerRecommendations: string[];
  adCopyDirection: string;
  landingPageMessage: string;
  whatToAvoidSaying: string[];
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface ReportingOutput {
  reportStatus: "current" | "stale" | "missing";
  staleReports: string[];
  missingReports: string[];
  recommendedReportAction: string;
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface OperatorPriorityOutput {
  criticalToday: string[];
  thisWeek: string[];
  monitor: string[];
  canWait: string[];
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface ClientRetentionOutput {
  retentionRisk: "low" | "medium" | "high";
  cancellationRiskReasons: string[];
  savePlan: string[];
  recommendedClientMessage: string;
  urgentConversationNeeded: boolean;
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface UpsellOpportunityOutput {
  upsellOpportunity: "none" | "low" | "medium" | "high";
  bestUpsell: string;
  timing: string;
  reason: string;
  suggestedPitch: string;
  expectedClientBenefit: string;
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface CapacityScalingOutput {
  canScale: "yes" | "no" | "caution";
  scaleLimit: string;
  operationalRisk: string;
  recommendedSpendCeiling: string;
  whatMustImproveBeforeScaling: string[];
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface DataQualityOutput {
  dataConfidence: "high" | "medium" | "low";
  missingData: string[];
  conflictingData: string[];
  unreliableMetrics: string[];
  requiredFixBeforeDecision: string[];
  safeAssumptions: string[];
  approvalRequired: boolean;
}

export interface ComplianceRiskOutput {
  riskLevel: "low" | "medium" | "high";
  riskFlags: string[];
  whatToReword: string[];
  approvalNeeded: boolean;
  safeAlternativeCopy: string[];
  whatNotToSay: string[];
  dataConfidence: "high" | "medium" | "low";
  approvalRequired: boolean;
}

export interface LandingPageCROOutput {
  conversionIssues: string[];
  headlineRecommendation: string;
  ctaRecommendation: string;
  formFixes: string[];
  trustElementsNeeded: string[];
  landingPagePriorityFixes: string[];
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface AppointmentSetterOutput {
  setterScore: number;
  setterBottleneck: string;
  scriptFix: string[];
  followUpFix: string[];
  objectionReframe: string[];
  recommendedCallFlow: string[];
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface ClientCommunicationOutput {
  clientMessage: string;
  tone: "reassuring" | "urgent" | "celebratory" | "neutral";
  talkingPoints: string[];
  riskWarnings: string[];
  whatNotToSay: string[];
  nextConversation: string;
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export interface GhlWorkflowBuilderOutput {
  workflowName: string;
  workflowGoal: string;
  trigger: string;
  conditions: string[];
  actions: string[];
  waitSteps: string[];
  smsCopy: string[];
  internalNotificationCopy: string;
  assignedUserRole: string;
  stopConditions: string[];
  complianceNotes: string[];
  requiredCustomFields: string[];
  testingChecklist: string[];
  whatNotToAutomate: string[];
  approvalRequired: boolean;
  dataConfidence: "high" | "medium" | "low";
}

export type AnyAgentOutput =
  | ClientHealthOutput | LaunchReadinessOutput | ClientIntelligenceOutput
  | MediaBuyerOutput | GhlFollowUpOutput | SalesConversionOutput
  | CreativeStrategistOutput | OfferMessagingOutput | ReportingOutput
  | OperatorPriorityOutput | ClientRetentionOutput | UpsellOpportunityOutput
  | CapacityScalingOutput | DataQualityOutput | ComplianceRiskOutput
  | LandingPageCROOutput | AppointmentSetterOutput | ClientCommunicationOutput
  | GhlWorkflowBuilderOutput;

export interface AgentOutputBundle {
  agentId: AgentId;
  clientId: string | null;
  output: AnyAgentOutput;
}

// ── Agent functions ───────────────────────────────────────────────────────────

// 1. Client Health Agent
export function runClientHealthAgent(brain: ClientBrain): ClientHealthOutput {
  const { healthScore: hs, performance: p, integrations: i } = brain;
  const hasPerf = p.leads > 0 || parseFloat(p.spend.replace(/[^0-9.]/g, "")) > 0;
  // "low" only when we cannot determine integration status or trust any data source
  const dataConf: "high" | "medium" | "low" =
    brain.intelligence && hasPerf ? "high"
    : hasPerf || i.metaConnected || i.ghlConnected ? "medium"
    : "low";
  return {
    healthScore: hs.score,
    status: hs.status,
    riskReasons: hs.riskReasons,
    topBlocker: hs.topBlocker,
    nextBestAction: hs.nextBestAction,
    approvalRequired: hs.status === "at_risk" || hs.status === "blocked",
    dataConfidence: dataConf,
  };
}

// 2. Launch Readiness Agent
export function runLaunchReadinessAgent(brain: ClientBrain): LaunchReadinessOutput {
  const { launchReadiness: lr, integrations: i } = brain;
  // Exclude "Campaign draft approved or ready" from the external-blocker list —
  // Veronica can prepare the draft now; it is a launch requirement, not a drafting blocker.
  const externalBlockers = lr.blockingItems.filter(
    (item) => item !== "Campaign draft approved or ready"
  );
  const whatNotToDoYet = lr.blockingItems.length > 0
    ? `Veronica can prepare an approval-ready campaign draft now. Launch, activation, and Meta submission remain blocked until external setup and human approval are complete${externalBlockers.length > 0 ? `: ${externalBlockers.join(", ")}` : ""}.`
    : lr.missing.length > 0
    ? `Drafting and strategy work can proceed. Do not assume full launch readiness — ${lr.missing.length} non-blocking item(s) still outstanding.`
    : "Ready for launch consideration. Do not increase ad spend before confirming baseline reporting is in place.";
  const dataConf: "high" | "medium" | "low" =
    i.metaConnected || i.ghlConnected ? "high" : "medium";
  return {
    launchReadinessScore: lr.score,
    maxScore: lr.maxScore,
    status: lr.launchStatus,
    missingItems: lr.missing,
    blockingItems: lr.blockingItems,
    recommendedLaunchSequence: lr.recommendedLaunchSequence,
    whatNotToDoYet,
    approvalRequired: !lr.isReady,
    dataConfidence: dataConf,
  };
}

// 3. Client Intelligence Agent
export function runClientIntelligenceAgent(brain: ClientBrain): ClientIntelligenceOutput {
  const intel = brain.intelligence;
  if (!intel) {
    return {
      clientPositioning: "No client intelligence extracted. Upload the onboarding summary and run intelligence extraction from the client record.",
      idealCustomerSummary: "Unknown — intelligence extraction required.",
      keyObjections: ["Intelligence extraction required before assessing objections."],
      salesProcessRisks: ["Cannot assess sales risk without extracted intelligence."],
      bestOfferAngles: ["Extract intelligence first to identify validated offer angles."],
      recommendedMessaging: ["Extract intelligence first."],
      importantClientNotes: ["Client intelligence has not been extracted for this client."],
      approvalRequired: false,
      dataConfidence: "low",
    };
  }
  const bp = intel.buyerProfile;
  const oi = intel.offerIntelligence;
  const si = intel.salesIntelligence;
  const bi = intel.brandIntelligence;
  const sa = intel.salesAudit;
  const cp = intel.companyProfile;

  const salesRisks: string[] = [];
  if (sa?.avgResponseTime && !sa.avgResponseTime.toLowerCase().includes("minute")) {
    salesRisks.push(`Response time: "${sa.avgResponseTime}" — target is within 5 minutes.`);
  }
  if (!sa?.hasSalesScript) salesRisks.push("No sales script on file — inconsistent call handling risk.");
  if (!sa?.lostLeadRecovery || sa.lostLeadRecovery.toLowerCase().includes("none") || sa.lostLeadRecovery.toLowerCase().includes("no ")) {
    salesRisks.push("No lost lead recovery process — leads that don't book are left behind.");
  }
  if (cp?.biggestBottleneck) salesRisks.push(`Owner-stated bottleneck: ${cp.biggestBottleneck}`);

  return {
    clientPositioning: bi?.brandPositioning ?? oi?.mainOffer ?? "Not defined.",
    idealCustomerSummary: `${bp?.primaryBuyerType ?? "Homeowner"} — ${bp?.homeownerProfile ?? intel.targetMarket?.householdIncome ?? "demographic not extracted"}`,
    keyObjections: (bp?.commonObjections ?? si?.commonObjections ?? []).slice(0, 5),
    salesProcessRisks: salesRisks,
    bestOfferAngles: (si?.bestSalesAngles ?? []).slice(0, 4),
    recommendedMessaging: (bi?.whyCustomersTrust ?? si?.bestSalesAngles ?? []).slice(0, 4),
    importantClientNotes: [
      ...(oi?.insuranceNotes ? [`Insurance note: ${oi.insuranceNotes}`] : []),
      ...(oi?.financingAvailable ? [`Financing: ${oi.financingAvailable}`] : []),
      ...(bi?.whatNotToSay?.slice(0, 2) ?? []),
    ],
    approvalRequired: false,
    dataConfidence: "high",
  };
}

// 4. Media Buyer Agent
export function runMediaBuyerAgent(brain: ClientBrain): MediaBuyerOutput {
  const { performance: p, integrations: i, approvedAssets, bottleneck: bn } = brain;
  const spendNum = parseFloat(p.spend.replace(/[^0-9.]/g, "")) || 0;
  const hasSpendData = spendNum > 0;

  let adBottleneck = "No active ad performance bottleneck detected.";
  if (!i.metaConnected) adBottleneck = "Meta Ad Account not connected — no campaigns running.";
  else if (p.leads === 0 && i.hasActiveMetaCampaigns) adBottleneck = "0 leads despite active campaigns — creative angle or targeting not converting.";
  else if (p.cplStatus === "above_target") adBottleneck = `CPL ${p.cpl} above $${p.cplBenchmark} target — ad performance below benchmark.`;
  else if (bn.type === "ad") adBottleneck = bn.proofData;

  const isScalingReady =
    p.cplStatus === "ok" && p.bookingStatus === "ok" && i.metaConnected && p.leads > 10;
  const isScalingBlocked =
    !i.metaConnected || p.cplStatus === "above_target" || p.bookingStatus === "below_target" || p.leads === 0;

  const scalingReadiness: "yes" | "no" | "caution" = isScalingReady ? "yes" : isScalingBlocked ? "no" : "caution";

  const budgetRec = scalingReadiness === "yes"
    ? `CPL and booking rate are both on target with ${p.leads} leads. A budget increase draft can be prepared for human approval if metrics hold another 2 weeks.`
    : scalingReadiness === "no"
    ? `Do not increase budget while the primary issue exists: ${adBottleneck} Scaling spend now amplifies waste, not results.`
    : `Metrics are mixed. Hold current budget and monitor for 14 days. Prepare a budget review draft for human approval — do not activate any changes.`;

  const assetAge = approvedAssets.some((a) => {
    const days = (Date.now() - new Date(a.uploadDate).getTime()) / 86400000;
    return days > 30;
  });
  if (assetAge && scalingReadiness !== "no") adBottleneck = `${adBottleneck} Creative fatigue risk — approved assets are 30+ days old.`;

  return {
    adBottleneck,
    scalingReadiness,
    budgetRecommendation: budgetRec,
    whatNotToDoYet: "Do not pause campaigns, change budgets, or modify targeting without human approval. Any budget change requires explicit operator sign-off before activation.",
    approvalRequired: true,
    // "not connected" is a known state — not missing data. Only "low" if Meta is connected but truly has no data.
    dataConfidence: hasSpendData && p.leads > 5 ? "high"
      : hasSpendData || p.leads > 0 ? "medium"
      : !i.metaConnected ? "medium"
      : "low",
  };
}

// 5. GHL Follow-Up Agent
export function runGhlFollowUpAgent(brain: ClientBrain): GhlFollowUpOutput {
  const { performance: p, integrations: i, intelligence: intel } = brain;
  const sa = intel?.salesAudit;

  let followUpBottleneck = "No follow-up bottleneck detected.";
  let bookingIssue: string | null = null;
  let pipelineIssue: string | null = null;

  // GHL state classification — 4 possible states
  const ghlConnected = i.ghlConnected;
  const ghlSynced = !!i.ghlLastSynced;
  const ghlStaleDays = i.ghlLastSynced
    ? Math.round((Date.now() - new Date(i.ghlLastSynced).getTime()) / 86400000)
    : null;
  const ghlStale = ghlStaleDays !== null && ghlStaleDays > 3;

  if (!ghlConnected) {
    followUpBottleneck = "GHL Location not connected — follow-up system cannot be audited.";
  } else if (!ghlSynced) {
    // Connected but no sync has run yet
    followUpBottleneck = "GHL is connected but pipeline data has not synced yet. Workflow auditing will be available once the first sync completes.";
    bookingIssue = "GHL connected — waiting for first sync. Pipeline and contact data will populate after sync runs.";
  } else if (ghlStale) {
    followUpBottleneck = `GHL is connected but last sync was ${ghlStaleDays} days ago — data may be stale. Open the client profile → Integrations tab to trigger a fresh sync.`;
  } else if (p.leads > 5 && p.booked === 0) {
    followUpBottleneck = `${p.leads} leads entered the system with zero appointments booked. Speed-to-lead failure or workflow not triggering.`;
    bookingIssue = "GHL follow-up workflow may not be active or setter tasks are not being created.";
  } else if (p.bookingStatus === "below_target") {
    followUpBottleneck = `Booking rate ${p.bookingRate}% (${p.booked}/${p.leads} leads) — below 30% target. Follow-up system is active but underperforming.`;
    bookingIssue = `Booking rate ${p.bookingRate}% vs 30% target.`;
  }

  if (sa?.followUpCadence && sa.followUpCadence.toLowerCase().includes("day")) {
    pipelineIssue = `Follow-up cadence is days-based ("${sa.followUpCadence}") — home services requires contact within 5 minutes of form submission.`;
  }

  const audit: string[] = [
    "Verify immediate SMS fires within 60 seconds of form submission.",
    "Verify setter task is created within 1 minute of lead entry.",
    "Verify first call is placed within 5 minutes.",
    "Verify AI voice triggers at the 10-minute mark if no call is logged.",
    "Confirm GHL pipeline stage updates when lead is contacted and appointment is booked.",
  ];
  if (!sa?.hasSalesScript) audit.push("Prepare a call script and load it into the setter notification workflow.");
  if (sa?.followUpCadence) audit.push(`Review follow-up cadence — current: "${sa.followUpCadence}".`);

  return {
    ghlConnected,
    ghlSynced,
    ghlStaleDays,
    followUpBottleneck,
    bookingIssue,
    pipelineIssue,
    recommendedFollowUpAudit: audit,
    approvalRequired: false,
    dataConfidence: i.ghlConnected && p.leads > 5 ? "high"
      : i.ghlConnected && i.ghlLastSynced ? "medium"
      : i.ghlConnected ? "medium"   // connected but no sync yet — still medium, not low
      : "low",
  };
}

// 6. Sales Conversion Agent
export function runSalesConversionAgent(brain: ClientBrain): SalesConversionOutput {
  const { performance: p, intelligence: intel, bottleneck: bn } = brain;
  const sa = intel?.salesAudit;
  const showRateNum = parseFloat(p.showRate.replace(/[^0-9.]/g, "")) || 0;

  let conversionBottleneck = "Insufficient data to classify conversion bottleneck.";
  if (p.booked > 0 && showRateNum > 0 && showRateNum < 65) {
    conversionBottleneck = `Show rate ${p.showRate} (target 65%+). Appointments booking but not appearing — post-booking commitment failing.`;
  } else if (p.leads > 0 && p.booked === 0) {
    conversionBottleneck = `${p.leads} leads with zero appointments booked — conversion failing at first contact or booking stage.`;
  } else if (p.bookingStatus === "below_target") {
    conversionBottleneck = `Booking rate ${p.bookingRate}% below 30% target (${p.booked}/${p.leads} leads).`;
  } else if (bn.type === "sales_show") {
    conversionBottleneck = bn.proofData;
  } else if (p.leads > 5 && p.booked > 0 && p.bookingStatus === "ok") {
    conversionBottleneck = "No critical conversion bottleneck detected — booking rate is on target.";
  }

  const fixes: string[] = [];
  if (!sa?.hasSalesScript) fixes.push("Prepare and implement a call script for initial lead handling.");
  if (sa?.avgResponseTime && !sa.avgResponseTime.toLowerCase().includes("minute")) {
    fixes.push(`Reduce response time from "${sa.avgResponseTime}" to under 5 minutes.`);
  }
  if (!sa?.lostLeadRecovery || sa.lostLeadRecovery.toLowerCase().includes("none")) {
    fixes.push("Build a lost lead re-engagement sequence (3–5 touchpoints over 2 weeks).");
  }
  if (showRateNum > 0 && showRateNum < 65) {
    fixes.push("Add appointment confirmation SMS the day before and a reminder 2 hours before the appointment.");
    fixes.push("Coach setters to build verbal commitment on every booking call.");
  }

  const bookingRisk = p.leads > 0 && p.booked === 0 ? "HIGH" : p.bookingStatus === "below_target" ? "MEDIUM" : "LOW";
  const closeRisk = showRateNum > 0 && showRateNum < 50 ? "HIGH" : showRateNum > 0 && showRateNum < 65 ? "MEDIUM" : "LOW";

  return {
    conversionBottleneck,
    salesScriptNeeded: !sa?.hasSalesScript,
    followUpFixes: fixes,
    appointmentBookingRisk: bookingRisk,
    closeRateRisk: closeRisk,
    recommendedSalesAction: fixes.length > 0 ? fixes[0] : "Monitor conversion metrics for 30 days.",
    approvalRequired: fixes.length > 0,
    dataConfidence: sa ? "high" : p.leads > 5 ? "medium" : "low",
  };
}

// 7. Creative Strategist Agent
export function runCreativeStrategistAgent(brain: ClientBrain): CreativeStrategistOutput {
  const { approvedAssets, pendingAssets, intelligence: intel } = brain;
  const cp = intel?.contentPlanning;
  const isRoofing = brain.profile.services.some((s) => s.toLowerCase().includes("roof"));

  const approvedCount = approvedAssets.length;
  const creativeReadiness: "strong" | "adequate" | "weak" | "missing" =
    approvedCount >= 4 ? "strong" : approvedCount >= 2 ? "adequate" : approvedCount === 1 ? "weak" : "missing";

  const assetTypes = approvedAssets.map((a) => a.assetType?.toLowerCase() ?? "");
  const hasVideo = assetTypes.some((t) => t.includes("video"));
  const hasImage = assetTypes.some((t) => t.includes("image") || t.includes("photo"));
  const hasOwnerCamera = assetTypes.some((t) => t.includes("owner") || t.includes("testimonial"));

  const missing: string[] = [];
  if (!hasVideo) missing.push("Video creative (owner-on-camera or before/after)");
  if (!hasImage) missing.push("Static image ad");
  if (!hasOwnerCamera && cp?.ownerOnCamera) missing.push("Owner-on-camera video — client is willing to film");
  if (approvedCount === 0) missing.push("Any approved creative — cannot run Meta campaigns without at least one");
  if (pendingAssets.length > 0) missing.push(`${pendingAssets.length} asset(s) pending review — approve these to unblock campaigns`);

  const allOld = approvedAssets.length > 0 && approvedAssets.every((a) => {
    return (Date.now() - new Date(a.uploadDate).getTime()) / 86400000 > 30;
  });

  const recommended: string[] = cp?.recommendedContentThemes?.slice(0, 3) ?? [];
  if (allOld) recommended.unshift("Refresh creative — all approved assets are 30+ days old (fatigue risk)");
  if (cp?.testimonialsAvailable) recommended.push("Customer testimonial video — trust signal for colder audiences");

  const angles: string[] = cp?.biggestSellingPoints?.slice(0, 3) ?? [];
  if (isRoofing) {
    if (!angles.length) {
      angles.push("Owner-on-camera roof inspection walkthrough", "Before/after storm damage repair", "Warranty explanation (trust signal)");
    }
  } else {
    if (!angles.length) {
      angles.push("Before/after project reveal", "Owner on camera explaining process", "Client testimonial walkthrough");
    }
  }

  return {
    creativeReadiness,
    recommendedAssets: recommended,
    missingCreativeTypes: missing,
    nextShootRecommendation: cp?.ownerOnCamera
      ? `Schedule an owner-on-camera shoot. Recommended themes: ${(cp.recommendedContentThemes ?? []).slice(0, 2).join(", ") || "inspection walkthrough, warranty explainer"}.`
      : `Capture job site content. Focus on: ${isRoofing ? "before/after, damage documentation, finished installation" : "project transformation, materials close-ups, homeowner reaction"}.`,
    bestAnglesToTest: angles,
    approvalRequired: pendingAssets.length > 0,
    dataConfidence: intel ? "high" : approvedCount > 0 ? "medium" : "low",
  };
}

// 8. Offer & Messaging Agent
export function runOfferMessagingAgent(brain: ClientBrain): OfferMessagingOutput {
  const intel = brain.intelligence;
  const isRoofing = brain.profile.services.some((s) => s.toLowerCase().includes("roof"));

  if (!intel) {
    const genericHooks = isRoofing
      ? ["Free roof inspection — find out if your roof qualifies for replacement", "Most homeowners don't know their roof is failing until it's too late"]
      : ["Free in-home estimate — no obligation, no pressure", "See what your home could look like — before we touch a single thing"];
    return {
      bestHooks: genericHooks,
      bestAngles: ["Free inspection/estimate offer", "Local credibility", "Quality guarantee"],
      offerRecommendations: ["Lead with the free inspection/consultation offer", "Include a risk-reversal (free, no obligation)"],
      adCopyDirection: "Without client intelligence, use generic home services positioning. Extract intelligence to enable client-specific copy.",
      landingPageMessage: "Headline should lead with the free offer + local service area. CTA: schedule your free inspection.",
      whatToAvoidSaying: ["Guaranteed results", "Cheapest prices", "Insurance fraud language"],
      approvalRequired: true,
      dataConfidence: "low",
    };
  }

  const oi = intel.offerIntelligence;
  const si = intel.salesIntelligence;
  const bp = intel.buyerProfile;
  const bi = intel.brandIntelligence;
  const ci = intel.campaignImplications;

  const hooks: string[] = [];
  (si?.bestSalesAngles ?? []).slice(0, 2).forEach((a) => hooks.push(a));
  (bp?.urgencyTriggers ?? []).slice(0, 2).forEach((t) => hooks.push(t));
  if (!hooks.length) hooks.push(oi?.mainOffer ?? "Free consultation — learn what's possible for your home");

  return {
    bestHooks: hooks.slice(0, 4),
    bestAngles: (ci?.bestCampaignAngles ?? si?.bestSalesAngles ?? []).slice(0, 4),
    offerRecommendations: (ci?.offersToTest ?? []).slice(0, 3),
    adCopyDirection: `Lead with: ${oi?.mainOffer ?? "free consultation"}. Emphasize: ${(bi?.whyCustomersTrust ?? []).slice(0, 2).join(" + ") || "local experience and quality"}. Address: ${(bp?.commonObjections ?? []).slice(0, 2).join(", ") || "price and trust concerns"}.`,
    landingPageMessage: `Headline: ${(ci?.offersToTest ?? [])[0] ?? oi?.mainOffer ?? "Schedule your free consultation today"}. Trust signals: ${(oi?.guarantees ?? []).slice(0, 2).join(", ") || "satisfaction guarantee"}. CTA: ${(ci?.offersToTest ?? [])[0] ?? "Get your free estimate"}.`,
    whatToAvoidSaying: [
      ...(bi?.whatNotToSay ?? []).slice(0, 3),
      ...(bi?.complianceNotes ?? []).slice(0, 2),
    ],
    approvalRequired: true,
    dataConfidence: "high",
  };
}

// 9. Reporting Agent
export function runReportingAgent(brain: ClientBrain): ReportingOutput {
  const { recentReports, profile } = brain;
  const isActive = profile.status === "active";

  if (!isActive) {
    return {
      reportStatus: "missing",
      staleReports: [],
      missingReports: [`${profile.name} is not active — reporting not yet required.`],
      recommendedReportAction: "Begin reporting once this client goes active.",
      approvalRequired: false,
      dataConfidence: "high",
    };
  }

  if (recentReports.length === 0) {
    return {
      reportStatus: "missing",
      staleReports: [],
      missingReports: [`${profile.name} — no reports on file for active client.`],
      recommendedReportAction: `Generate a weekly performance report draft for ${profile.name} and prepare it for human review before client delivery.`,
      approvalRequired: true,
      dataConfidence: "high",
    };
  }

  const latestReport = [...recentReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const daysSince = (Date.now() - new Date(latestReport.createdAt).getTime()) / 86400000;
  const isStale = daysSince > 10;

  return {
    reportStatus: isStale ? "stale" : "current",
    staleReports: isStale ? [`${profile.name} — last report: ${latestReport.reportPeriod ?? "unknown period"} (${Math.round(daysSince)} days ago)`] : [],
    missingReports: [],
    recommendedReportAction: isStale
      ? `Generate a new weekly report draft for ${profile.name}. Prepare for human review before client delivery.`
      : `Report is current (${latestReport.reportPeriod}). Next report due in ${Math.max(0, 7 - Math.round(daysSince))} days.`,
    approvalRequired: isStale,
    dataConfidence: "high",
  };
}

// 10. Operator Priority Agent (portfolio-level)
export function runOperatorPriorityAgent(
  allBrains: ClientBrain[],
  allApprovals: Approval[],
  allDrafts: CampaignDraft[]
): OperatorPriorityOutput {
  const criticalToday: string[] = [];
  const thisWeek: string[] = [];
  const monitor: string[] = [];
  const canWait: string[] = [];

  const pendingDrafts = allDrafts.filter((d) => d.status === "needs_review" || d.approvalStatus === "needs_review");
  const highPriorityApprovals = allApprovals.filter((a) => a.priority === "high");

  for (const b of allBrains) {
    const { profile: pr, performance: p, diagnostics, recentReports } = b;
    const cplNum = parseFloat(p.cpl.replace(/[^0-9.]/g, "")) || 0;
    const showRateNum = parseFloat(p.showRate.replace(/[^0-9.]/g, "")) || 0;

    if (pr.status === "active" && p.leads > 0 && p.booked === 0) {
      criticalToday.push(`${pr.name}: ${p.leads} leads, 0 booked — speed-to-lead or GHL failure`);
    }
    if (pr.status === "active" && p.cplStatus === "above_target" && cplNum > p.cplBenchmark * 2) {
      criticalToday.push(`${pr.name}: CPL ${p.cpl} — above 2× $${p.cplBenchmark} threshold`);
    }
    if (pr.status === "active" && showRateNum > 0 && showRateNum < 50) {
      criticalToday.push(`${pr.name}: Show rate ${p.showRate} — below 50% critical threshold`);
    }

    if (pr.status === "active" && p.bookingStatus === "below_target" && p.booked > 0) {
      thisWeek.push(`${pr.name}: Booking rate ${p.bookingRate}% below 30% target — audit GHL follow-up speed`);
    }
    if (pr.status === "active" && recentReports.length === 0) {
      thisWeek.push(`${pr.name}: No reports on file — generate weekly report draft for human review`);
    }
    if (b.launchReadiness.launchStatus === "blocked" && pr.status !== "active") {
      thisWeek.push(`${pr.name}: Launch blocked — missing ${b.launchReadiness.blockingItems.slice(0, 2).join(", ")}`);
    }

    const warnings = diagnostics.filter((d) => d.severity === "warning");
    warnings.slice(0, 1).forEach((d) => monitor.push(`${pr.name}: ${d.signal}`));
    if (!b.intelligence && pr.status !== "active") {
      monitor.push(`${pr.name}: Client intelligence not extracted`);
    }

    const infos = diagnostics.filter((d) => d.severity === "info");
    infos.slice(0, 1).forEach((d) => canWait.push(`${pr.name}: ${d.signal}`));
    if (b.launchReadiness.launchStatus === "almost_ready" && pr.status !== "active") {
      canWait.push(`${pr.name}: Almost launch-ready — missing ${b.launchReadiness.missing.slice(0, 2).join(", ")}`);
    }
  }

  if (highPriorityApprovals.length > 0) {
    criticalToday.push(`${highPriorityApprovals.length} high-priority approval(s) pending: ${highPriorityApprovals.slice(0, 2).map((a) => `${a.item} (${a.clientName})`).join(", ")}`);
  }
  if (pendingDrafts.length > 0) {
    thisWeek.push(`Review ${pendingDrafts.length} campaign draft(s) awaiting approval: ${pendingDrafts.slice(0, 2).map((d) => `${d.campaignName}`).join(", ")}`);
  }

  const hasData = allBrains.some((b) => b.performance.leads > 0 || b.integrations.metaConnected);

  return {
    criticalToday: [...new Set(criticalToday)],
    thisWeek: [...new Set(thisWeek)],
    monitor: [...new Set(monitor)].slice(0, 6),
    canWait: [...new Set(canWait)].slice(0, 6),
    approvalRequired: pendingDrafts.length > 0 || highPriorityApprovals.length > 0,
    dataConfidence: hasData ? "high" : allBrains.length > 0 ? "medium" : "low",
  };
}

// 11. Client Retention Agent
export function runClientRetentionAgent(brain: ClientBrain): ClientRetentionOutput {
  const { healthScore: hs, performance: p, recentReports, profile: pr, integrations: i } = brain;
  const reasons: string[] = [];

  if (hs.status === "at_risk" || hs.status === "blocked") reasons.push(`Health score ${hs.score}/100 [${hs.status.toUpperCase()}]`);
  if (pr.status === "active" && recentReports.length === 0) reasons.push("No reports delivered — client has no visibility into results");
  if (p.cplStatus === "above_target") reasons.push(`CPL ${p.cpl} above $${p.cplBenchmark} target — results below expectations`);
  if (p.leads > 5 && p.booked === 0) reasons.push("Leads not converting to appointments — client may question ad effectiveness");
  if (!i.metaConnected && pr.status === "active") reasons.push("Meta not connected despite active status — billing without campaigns");

  const retentionRisk: "low" | "medium" | "high" =
    reasons.length >= 3 || (reasons.length >= 2 && pr.status === "active") ? "high" :
    reasons.length >= 1 ? "medium" : "low";

  const savePlan: string[] = [];
  if (recentReports.length === 0) savePlan.push("Prepare and deliver a performance report draft this week — human must review before sending.");
  if (p.cplStatus === "above_target") savePlan.push("Schedule a proactive check-in to explain CPL context and the optimization plan.");
  if (p.leads > 0 && p.booked === 0) savePlan.push("Audit GHL immediately and report findings to the client with a clear fix timeline.");
  if (hs.score < 50) savePlan.push("Schedule an account health review call within the next 5 business days.");

  const tone = retentionRisk === "high" ? "urgent" : retentionRisk === "medium" ? "reassuring" : "celebratory";
  const clientMsg = retentionRisk === "high"
    ? `Hi [Client Name], I wanted to proactively reach out about your account. We're seeing [specific issue] and have a clear plan to address it. Can we connect this week to walk through it?`
    : retentionRisk === "medium"
    ? `Hi [Client Name], quick update on your account — [positive note + one item being worked on]. We'll have a full update in your next report.`
    : `Hi [Client Name], great news — your campaign is performing well. [Key metric]. Here's what we're focused on next to keep the momentum going.`;

  return {
    retentionRisk,
    cancellationRiskReasons: reasons,
    savePlan,
    recommendedClientMessage: clientMsg,
    urgentConversationNeeded: retentionRisk === "high",
    approvalRequired: true,
    dataConfidence: pr.status === "active" && (p.leads > 0 || i.metaConnected) ? "medium" : "low",
  };
}

// 12. Upsell Opportunity Agent
export function runUpsellOpportunityAgent(brain: ClientBrain): UpsellOpportunityOutput {
  const { healthScore: hs, performance: p, approvedAssets, integrations: i, intelligence: intel, profile: pr } = brain;

  const isHealthy = hs.status === "healthy";
  const metricsGood = p.cplStatus === "ok" && p.bookingStatus === "ok";
  const cp = intel?.companyProfile;

  let opportunity: "none" | "low" | "medium" | "high" = "none";
  let bestUpsell = "No upsell opportunity identified at this time.";
  let timing = "Not applicable.";
  let reason = "Client health or metrics do not yet support an upsell conversation.";
  let pitch = "";
  let benefit = "";

  if (isHealthy && metricsGood && p.leads > 10) {
    opportunity = "high";
    const hasRetargeting = brain.drafts.some((d) => d.campaignName?.toLowerCase().includes("retarget"));
    if (!hasRetargeting) {
      bestUpsell = "Add a Meta retargeting campaign to convert website visitors and past leads.";
      timing = "Now — metrics are strong and there's a warm audience to retarget.";
      reason = "CPL and booking rate are both on target. Retargeting is the highest-ROI next campaign layer.";
      pitch = `Your prospecting campaign is performing well — ${p.leads} leads at ${p.cpl} CPL. A retargeting campaign layered on top typically reduces CPL by 30–50% for warm audiences. We can prepare a campaign draft for your review.`;
      benefit = "Lower cost per booked appointment from already-warm traffic, without increasing prospecting budget.";
    } else if (approvedAssets.length < 3) {
      bestUpsell = "Content shoot and creative refresh to sustain performance and expand angles.";
      timing = "Next 30 days — before creative fatigue sets in.";
      reason = "Strong metrics create the right environment to test new creative angles.";
      pitch = "Your ads are working. To keep them working and test new audiences, we recommend a creative refresh shoot. We can prepare a creative brief for your review.";
      benefit = "Sustained CPL and prevent performance decay from creative fatigue.";
    } else {
      bestUpsell = "Scale ad spend — metrics support a 15–20% budget increase.";
      timing = "Now if metrics hold for another 2 weeks.";
      reason = "All KPIs are on target. More spend should produce proportional lead increases.";
      pitch = "Based on current CPL and booking rate, increasing your ad spend by 15–20% should produce a proportional increase in booked appointments. We'll prepare a budget recommendation for your sign-off.";
      benefit = "More booked appointments at the same efficiency.";
    }
  } else if (hs.status === "watch" && metricsGood) {
    opportunity = "low";
    bestUpsell = "Optimize current campaign before adding spend or new channels.";
    timing = "After 30 days of stable performance.";
    reason = "Metrics are adequate but not yet consistently strong enough to justify scaling.";
    pitch = "Let's get your current metrics consistently on target first, then we can discuss scaling options.";
    benefit = "Avoid scaling problems by building on a solid foundation.";
  } else {
    opportunity = "none";
    reason = `Health score ${hs.score}/100 [${hs.status}] — address current issues before upsell.`;
  }

  return {
    upsellOpportunity: opportunity,
    bestUpsell,
    timing,
    reason,
    suggestedPitch: pitch,
    expectedClientBenefit: benefit,
    approvalRequired: opportunity === "high",
    dataConfidence: intel && p.leads > 5 ? "high" : p.leads > 0 ? "medium" : "low",
  };
}

// 13. Capacity & Scaling Agent
export function runCapacityScalingAgent(brain: ClientBrain): CapacityScalingOutput {
  const { intelligence: intel, performance: p, integrations: i } = brain;
  const cp = intel?.companyProfile;

  if (!cp?.monthlyCapacity) {
    return {
      canScale: "caution",
      scaleLimit: "Unknown — capacity data not extracted.",
      operationalRisk: "Cannot assess capacity without client intelligence. Extract intelligence from the onboarding summary first.",
      recommendedSpendCeiling: "Hold current spend until capacity is verified.",
      whatMustImproveBeforeScaling: [
        "Extract client intelligence to confirm monthly capacity.",
        p.cplStatus !== "ok" ? `Reduce CPL from ${p.cpl} to under $${p.cplBenchmark} target.` : "",
        p.bookingStatus !== "ok" ? `Improve booking rate from ${p.bookingRate}% to 30%+.` : "",
      ].filter(Boolean),
      approvalRequired: true,
      dataConfidence: "low",
    };
  }

  const capacityStr = cp.monthlyCapacity;
  const capacityNum = parseInt(capacityStr.replace(/[^0-9]/g, "")) || 0;
  const crewCount = cp.crewCount || 1;
  const bookedNum = p.booked || 0;
  const showRateNum = parseFloat(p.showRate.replace(/[^0-9.]/g, "")) || 70;
  const estimatedJobs = Math.round(bookedNum * (showRateNum / 100));

  const capacityUsed = capacityNum > 0 ? Math.round((estimatedJobs / capacityNum) * 100) : 0;
  const canScale: "yes" | "no" | "caution" =
    !i.metaConnected || p.cplStatus !== "ok" || p.bookingStatus !== "ok" ? "no" :
    capacityUsed > 80 ? "caution" :
    capacityUsed < 60 && p.cplStatus === "ok" ? "yes" : "caution";

  const mustImprove: string[] = [];
  if (p.cplStatus !== "ok") mustImprove.push(`Reduce CPL to under $${p.cplBenchmark} (currently ${p.cpl})`);
  if (p.bookingStatus !== "ok") mustImprove.push(`Improve booking rate to 30%+ (currently ${p.bookingRate}%)`);
  if (capacityUsed > 80) mustImprove.push(`Hire additional crew — current capacity estimated ${capacityUsed}% utilized`);
  if (!p.booked) mustImprove.push("Establish consistent booking flow before scaling spend");

  return {
    canScale,
    scaleLimit: capacityNum > 0 ? `Approximately ${capacityNum} jobs/month (${crewCount} crew${crewCount > 1 ? "s" : ""})` : "Unknown",
    operationalRisk: capacityUsed > 80
      ? `Capacity utilization estimated at ${capacityUsed}% — scaling spend risks overloading crews and hurting fulfillment quality.`
      : capacityUsed > 60
      ? `Moderate capacity available. Monitor job load before increasing spend significantly.`
      : "Capacity appears available. Risk is low if ad metrics continue to perform.",
    recommendedSpendCeiling: canScale === "yes"
      ? `Current spend can be increased by 15–20% safely. Prepare a budget increase draft for human approval.`
      : canScale === "caution"
      ? `Hold current spend. Resolve ${mustImprove[0] ?? "operational constraints"} before increasing.`
      : `Do not increase spend. Fix metrics and capacity issues first.`,
    whatMustImproveBeforeScaling: mustImprove,
    approvalRequired: true,
    dataConfidence: cp.monthlyCapacity && p.leads > 5 ? "high" : cp.monthlyCapacity ? "medium" : "low",
  };
}

// 14. Data Quality Agent
export function runDataQualityAgent(brain: ClientBrain | null, allBrains: ClientBrain[]): DataQualityOutput {
  const brains = brain ? [brain] : allBrains;
  const missing: string[] = [];
  const conflicting: string[] = [];
  const unreliable: string[] = [];
  const required: string[] = [];
  const safe: string[] = [];

  for (const b of brains) {
    const pr = b.profile;
    const p = b.performance;
    const i = b.integrations;
    // Only critical-severity data conflicts tank confidence — warning/info mismatches go to required fixes
    const conflictDiags = b.diagnostics.filter(
      (d) => d.signal.toLowerCase().includes("data mismatch") && d.severity === "critical"
    );
    const warnConflictDiags = b.diagnostics.filter(
      (d) => d.signal.toLowerCase().includes("data mismatch") && d.severity !== "critical"
    );
    conflictDiags.forEach((d) => conflicting.push(`${pr.name}: ${d.signal}`));
    warnConflictDiags.forEach((d) => required.push(`${pr.name}: ${d.signal}`));

    if (!b.intelligence) missing.push(`${pr.name}: Client intelligence not extracted`);
    if (!i.metaConnected && pr.status === "active") missing.push(`${pr.name}: Meta Ad Account not connected (active client)`);
    if (!i.ghlConnected && pr.status === "active") missing.push(`${pr.name}: GHL Location not connected (active client)`);
    if (pr.status === "active" && p.leads === 0 && i.metaConnected) {
      unreliable.push(`${pr.name}: Meta connected + active status but 0 leads — sync may be stale or campaigns not running`);
    }
    if (p.cpl === "$0.00" && p.leads > 0) unreliable.push(`${pr.name}: CPL shows $0.00 with ${p.leads} leads — calculation error`);

    if (conflictDiags.length > 0) required.push(`${pr.name}: Reconcile integration IDs before making campaign decisions`);
    if (!b.intelligence && pr.status === "active") required.push(`${pr.name}: Extract client intelligence before optimizing campaigns`);

    if (i.metaConnected && p.leads > 5) safe.push(`${pr.name}: Lead count and CPL are reliable (Meta connected, ${p.leads}+ leads recorded)`);
    if (b.recentReports.length > 0) safe.push(`${pr.name}: Report data provides a verified baseline`);
  }

  const hasSeriousIssues = conflicting.length > 0 || unreliable.length > 0;
  const hasMissingData = missing.length > 0;
  const dataConf: "high" | "medium" | "low" =
    hasSeriousIssues ? "low" : hasMissingData ? "medium" : "high";

  return {
    dataConfidence: dataConf,
    missingData: [...new Set(missing)],
    conflictingData: [...new Set(conflicting)],
    unreliableMetrics: [...new Set(unreliable)],
    requiredFixBeforeDecision: [...new Set(required)],
    safeAssumptions: [...new Set(safe)].slice(0, 4),
    approvalRequired: false,
  };
}

// 15. Compliance & Risk Agent
export function runComplianceRiskAgent(brain: ClientBrain, drafts: CampaignDraft[]): ComplianceRiskOutput {
  const intel = brain.intelligence;
  const bi = intel?.brandIntelligence;
  const oi = intel?.offerIntelligence;
  const services = brain.profile.services.map((s) => s.toLowerCase());
  const isRoofing = services.some((s) => s.includes("roof"));
  const hasStormDamage = services.some((s) => s.includes("storm") || s.includes("hail") || s.includes("damage"));

  const riskFlags: string[] = [];
  const whatToReword: string[] = [];
  const avoidSaying: string[] = [];
  const safeAlternatives: string[] = [];

  if (hasStormDamage) {
    riskFlags.push("Storm damage service — insurance claim language risk in ad copy");
    whatToReword.push("Avoid: 'file an insurance claim' or 'get your roof paid for by insurance'");
    avoidSaying.push("We'll work your insurance claim", "Insurance-covered replacement", "File your claim today");
    safeAlternatives.push("Storm-related roof damage may be covered by your homeowner policy — ask us what to look for");
  }

  if (oi?.insuranceNotes && (oi.insuranceNotes.toLowerCase().includes("free") || oi.insuranceNotes.toLowerCase().includes("guarantee"))) {
    riskFlags.push("Insurance note references potential guarantee — verify compliance language");
    avoidSaying.push("Guaranteed insurance coverage", "We guarantee your claim is approved");
  }

  const clientDrafts = drafts.filter((d) => d.clientId === brain.profile.id);
  for (const draft of clientDrafts) {
    const copyText = JSON.stringify(draft.adCopy ?? "").toLowerCase();
    if (copyText.includes("guaranteed") && copyText.includes("lead")) {
      riskFlags.push(`Campaign draft "${draft.campaignName}": contains guaranteed lead volume claim`);
      whatToReword.push("Replace guaranteed lead counts with 'our proven process consistently delivers' language");
    }
    if (copyText.includes("cheapest") || copyText.includes("lowest price")) {
      riskFlags.push(`Campaign draft "${draft.campaignName}": contains lowest-price claim — avoid in Meta policies`);
      avoidSaying.push("Cheapest", "Lowest price in [city]");
      safeAlternatives.push("Competitive pricing with financing available");
    }
  }

  if (bi?.complianceNotes?.length) {
    bi.complianceNotes.forEach((note) => {
      if (!riskFlags.includes(note)) riskFlags.push(note);
    });
  }

  if (bi?.whatNotToSay?.length) {
    bi.whatNotToSay.forEach((item) => {
      if (!avoidSaying.includes(item)) avoidSaying.push(item);
    });
  }

  const riskLevel: "low" | "medium" | "high" =
    riskFlags.length >= 3 ? "high" : riskFlags.length >= 1 ? "medium" : "low";

  return {
    riskLevel,
    riskFlags,
    whatToReword,
    approvalNeeded: riskLevel !== "low",
    safeAlternativeCopy: safeAlternatives.length > 0 ? safeAlternatives : ["Use factual, provable claims only — avoid guarantees, superlatives, and insurance language"],
    whatNotToSay: avoidSaying.slice(0, 6),
    dataConfidence: intel ? "high" : "medium",
    approvalRequired: riskLevel !== "low",
  };
}

// 16. Landing Page CRO Agent
export function runLandingPageCROAgent(brain: ClientBrain): LandingPageCROOutput {
  const intel = brain.intelligence;
  const oi = intel?.offerIntelligence;
  const bp = intel?.buyerProfile;
  const ci = intel?.campaignImplications;

  if (!intel) {
    return {
      conversionIssues: ["Client intelligence not extracted — CRO recommendations require intelligence data."],
      headlineRecommendation: "Extract client intelligence first to identify the strongest headline angle.",
      ctaRecommendation: "Use a clear, low-friction call to action: 'Get Your Free Estimate' or 'Schedule Your Free Inspection'.",
      formFixes: ["Keep form fields to 3–4 maximum: Name, Phone, Address, and one qualifying question."],
      trustElementsNeeded: ["Add customer reviews", "Add licensing/certifications", "Add a guarantee statement"],
      landingPagePriorityFixes: ["Extract client intelligence to enable specific CRO recommendations."],
      approvalRequired: true,
      dataConfidence: "low",
    };
  }

  const issues: string[] = [];
  const formFixes: string[] = [];
  const trustNeeded: string[] = [];

  if (!oi?.guarantees?.length) issues.push("No guarantee or risk-reversal visible — buyers need a reason to feel safe");
  if (!oi?.financingAvailable) issues.push("Financing not surfaced — many homeowners delay without a payment option");
  if (bp?.commonFears?.length) {
    issues.push(`Address buyer fears on page: ${bp.commonFears.slice(0, 2).join(", ")}`);
  }

  formFixes.push("Limit form to 3–4 fields — each additional field reduces conversion by ~10%");
  if (ci?.leadFormQuestions?.length) {
    formFixes.push(`Best qualifying questions: ${ci.leadFormQuestions.slice(0, 2).join(", ")}`);
  }
  formFixes.push("Add form headline above the form: 'Get your free estimate — no obligation'");

  if (!intel.salesIntelligence?.testimonials?.length) trustNeeded.push("Add customer testimonials (minimum 2–3 specific quotes)");
  if (oi?.guarantees?.length) {
    trustNeeded.push(`Feature guarantee prominently: ${oi.guarantees[0]}`);
  } else {
    trustNeeded.push("Add a satisfaction guarantee or risk-reversal statement");
  }
  if (intel.marketResearch?.mainCompetitors?.length) {
    trustNeeded.push("Add 'Why us vs. others' comparison or proof point");
  }

  const headline = `${oi?.mainOffer ?? "Get your free estimate"} — ${(intel.brandIntelligence?.whyCustomersTrust ?? ["trusted local contractor"])[0]}`;
  const cta = (ci?.offersToTest ?? [])[0] ?? oi?.mainOffer ?? "Schedule Your Free Estimate";

  return {
    conversionIssues: issues,
    headlineRecommendation: headline,
    ctaRecommendation: cta,
    formFixes,
    trustElementsNeeded: trustNeeded,
    landingPagePriorityFixes: [
      ...issues.slice(0, 2),
      ...formFixes.slice(0, 1),
      ...trustNeeded.slice(0, 1),
    ],
    approvalRequired: true,
    dataConfidence: "high",
  };
}

// 17. Appointment Setter Coaching Agent
export function runAppointmentSetterAgent(brain: ClientBrain): AppointmentSetterOutput {
  const { performance: p, intelligence: intel } = brain;
  const sa = intel?.salesAudit;

  if (!sa) {
    return {
      setterScore: 50,
      setterBottleneck: "Sales audit not available — cannot assess setter process without intelligence data.",
      scriptFix: ["Extract client intelligence from the onboarding summary to enable setter coaching."],
      followUpFix: [`Booking rate: ${p.bookingRate}% — ${p.bookingStatus === "below_target" ? "below 30% target, setter coaching recommended" : "on target"}.`],
      objectionReframe: [],
      recommendedCallFlow: ["Answer within 5 minutes", "Qualify with 2–3 questions", "Book the appointment before ending the call"],
      approvalRequired: false,
      dataConfidence: "low",
    };
  }

  let score = 100;
  const bottlenecks: string[] = [];
  const scriptFix: string[] = [];
  const followUpFix: string[] = [];
  const objectionReframe: string[] = [];

  if (!sa.hasSalesScript) { score -= 25; bottlenecks.push("No sales script — calls handled inconsistently"); scriptFix.push("Prepare a call script: intro, qualifying questions, appointment booking close, objection responses."); }
  if (sa.avgResponseTime && !sa.avgResponseTime.toLowerCase().includes("minute")) { score -= 20; bottlenecks.push(`Response time: "${sa.avgResponseTime}" — target is under 5 minutes`); followUpFix.push("Reduce first contact time to under 5 minutes from form submission."); }
  if (!sa.lostLeadRecovery || sa.lostLeadRecovery.toLowerCase().includes("none")) { score -= 15; bottlenecks.push("No lost lead recovery — unconverted leads are abandoned"); followUpFix.push("Add a 5-touch re-engagement sequence for leads that don't book on first contact."); }
  if (sa.leadFallOffPoint) { score -= 10; bottlenecks.push(`Leads fall off at: ${sa.leadFallOffPoint}`); }

  const showRateNum = parseFloat(p.showRate.replace(/[^0-9.]/g, "")) || 0;
  if (showRateNum > 0 && showRateNum < 65) {
    score -= 15;
    bottlenecks.push(`Show rate ${p.showRate} — setter not building commitment on booking call`);
    scriptFix.push("End every booking call with: confirmed date/time, property address, and verbal re-commitment from homeowner.");
  }

  const objections = intel?.salesIntelligence?.objectionResponses ?? intel?.buyerProfile?.commonObjections ?? [];
  if (objections.length > 0) {
    objectionReframe.push(...objections.slice(0, 3));
  } else {
    objectionReframe.push("I need to talk to my spouse — 'Of course. What time works for both of you this week?'");
    objectionReframe.push("We're getting other quotes — 'Absolutely. When you compare, ask them about their warranty and insurance.'");
  }

  return {
    setterScore: Math.max(score, 0),
    setterBottleneck: bottlenecks.length > 0 ? bottlenecks[0] : "No critical setter bottleneck detected.",
    scriptFix,
    followUpFix,
    objectionReframe,
    recommendedCallFlow: [
      "Answer or return call within 5 minutes.",
      `Introduce yourself and reference: "${brain.profile.name}"`,
      "Qualify with 2–3 questions (address, home type, urgency level).",
      "Present the offer clearly: " + (intel?.offerIntelligence?.mainOffer ?? "free inspection/estimate"),
      "Handle objections using prepared responses.",
      "Book the appointment — confirm date, time, and address before ending the call.",
      "Send immediate confirmation SMS with appointment details.",
    ],
    approvalRequired: scriptFix.length > 0,
    dataConfidence: sa ? "high" : "low",
  };
}

// 18. Client Communication Agent
export function runClientCommunicationAgent(
  brain: ClientBrain,
  retentionOutput: ClientRetentionOutput,
  reportingOutput: ReportingOutput
): ClientCommunicationOutput {
  const { healthScore: hs, performance: p, profile: pr } = brain;

  let tone: "reassuring" | "urgent" | "celebratory" | "neutral" = "neutral";
  if (retentionOutput.retentionRisk === "high") tone = "urgent";
  else if (hs.status === "healthy" && p.bookingStatus === "ok") tone = "celebratory";
  else if (retentionOutput.retentionRisk === "medium") tone = "reassuring";

  const talkingPoints: string[] = [];
  if (p.leads > 0) talkingPoints.push(`${p.leads} leads generated${p.booked > 0 ? `, ${p.booked} appointments booked` : ""}`);
  if (p.cplStatus === "ok") talkingPoints.push(`CPL ${p.cpl} — on target vs $${p.cplBenchmark} benchmark`);
  if (p.cplStatus === "above_target") talkingPoints.push(`CPL ${p.cpl} — working on optimization to bring cost down`);
  if (reportingOutput.reportStatus === "missing") talkingPoints.push("Full performance report being prepared — will share shortly");

  const riskWarnings: string[] = [];
  if (retentionOutput.urgentConversationNeeded) riskWarnings.push("Client may have questions about results — be proactive, not reactive");
  if (p.leads > 0 && p.booked === 0) riskWarnings.push("Zero bookings may cause client frustration — address the follow-up fix timeline directly");

  const avoidSaying: string[] = [
    "Don't worry about it",
    "These things take time",
    "The algorithm is figuring things out",
    "We guarantee [specific result]",
  ];

  const clientMessage = tone === "celebratory"
    ? `Hi ${pr.owner}, wanted to share a quick update — things are going well. We've generated ${p.leads} leads at ${p.cpl} CPL and ${p.booked} appointments are booked. Momentum is strong. [Add specific next step or ask for new creative].`
    : tone === "urgent"
    ? `Hi ${pr.owner}, I wanted to reach out proactively. ${retentionOutput.cancellationRiskReasons[0] ?? "We have an update on your account"}. I have a clear plan to address this. Can we connect this week? [Add specific fix timeline].`
    : `Hi ${pr.owner}, quick account update: ${talkingPoints[0] ?? "campaign is running"}. ${reportingOutput.reportStatus === "missing" ? "Full report coming shortly." : "Your latest report is attached."} Let me know if you have questions.`;

  return {
    clientMessage,
    tone,
    talkingPoints,
    riskWarnings,
    whatNotToSay: avoidSaying,
    nextConversation: retentionOutput.urgentConversationNeeded
      ? "Schedule a call within 5 business days — do not send this update via email only."
      : "Send this update, then follow up with the full report once generated and reviewed.",
    approvalRequired: true,
    dataConfidence: p.leads > 0 || brain.recentReports.length > 0 ? "medium" : "low",
  };
}

// 19. GHL Workflow Builder Agent
export function runGhlWorkflowBuilderAgent(brain: ClientBrain): GhlWorkflowBuilderOutput {
  const intel = brain.intelligence;
  const sa = intel?.salesAudit;
  const ci = intel?.campaignImplications;
  const oi = intel?.offerIntelligence;
  const clientName = brain.profile.name;
  const service = brain.profile.services[0] ?? "home service";
  const hasIntel = !!intel;

  const sms1 = oi?.mainOffer
    ? `Hi [First Name], this is [Setter Name] from ${clientName}. You requested information about ${service}. Are you still looking to [${oi.mainOffer}]? Reply YES or call us back: [Phone]`
    : `Hi [First Name], this is [Setter Name] from ${clientName}. You submitted a request — are you available for a quick call? [Phone]`;

  const sms2 = `Hi [First Name], just following up on your request for a ${service} consultation. We have openings this week. Want to grab a time? [Booking Link or Phone]`;
  const sms3 = `Hi [First Name], last follow-up from ${clientName}. If you're still interested, reply or call [Phone]. We'd love to help.`;

  const followUpSteps = ci?.followUpStrategy?.length
    ? ci.followUpStrategy.slice(0, 4)
    : ["Immediate SMS within 60 seconds", "Setter call within 5 minutes", "AI voice at 10 minutes if no call", "Follow-up SMS at 24 hours"];

  const actions: string[] = [
    "Create contact with all form fields (First Name, Last Name, Phone, Address)",
    "Add tag: [service]-new-lead",
    "Move contact to pipeline stage: New Lead",
    "Send SMS #1 immediately (within 60 seconds)",
    "Create task for setter: 'Call [First Name] within 5 minutes' — due now",
    "Send internal notification to setter via email/Slack",
    "If no call logged after 10 minutes: trigger AI voice call",
    "If no response after 24 hours: send SMS #2",
    "If no response after 72 hours: send SMS #3",
    "If no response after 7 days: move to 'Long-term Nurture' pipeline stage",
  ];

  return {
    workflowName: `${clientName} — Speed-to-Lead Follow-Up Workflow`,
    workflowGoal: `Convert new ${service} leads to booked appointments within the first 10 minutes of form submission.`,
    trigger: "Form submitted via Meta Lead Ad or website contact form",
    conditions: [
      "Lead source = Meta Ads OR Website form",
      "Contact does not already exist in pipeline (deduplication check)",
      `Service type = ${service}`,
    ],
    actions,
    waitSteps: [
      "Wait 10 minutes: check if setter logged a call — if not, trigger AI voice",
      "Wait 24 hours: check if appointment booked — if not, send SMS #2",
      "Wait 72 hours: check if appointment booked — if not, send SMS #3",
      "Wait 7 days: if still no booking, move to Long-term Nurture",
    ],
    smsCopy: [sms1, sms2, sms3],
    internalNotificationCopy: `NEW LEAD — ${clientName}\nName: {{contact.first_name}} {{contact.last_name}}\nPhone: {{contact.phone}}\nAddress: {{contact.address}}\nSource: Meta Lead Ad\nTime submitted: {{contact.date_added}}\n\n⚡ CALL WITHIN 5 MINUTES`,
    assignedUserRole: "Setter / Inside Sales Rep",
    stopConditions: [
      "Appointment booked — stop all follow-up SMS",
      "Contact replies STOP — remove from all automated sequences (A2P compliance)",
      "Contact marked as 'Not Interested' — move to DNC list",
    ],
    complianceNotes: [
      "All SMS must honor STOP opt-outs immediately (A2P 10DLC compliance).",
      "Do not include insurance claim language in SMS copy.",
      "Ensure A2P 10DLC registration is active for this number before sending.",
      "Do not send SMS between 9PM and 8AM local time.",
    ],
    requiredCustomFields: [
      "Lead Source (Meta Ads, Website, Referral)",
      "Service Requested",
      "Property Address",
      "Appointment Date/Time",
    ],
    testingChecklist: [
      "Submit a test lead and verify SMS fires within 60 seconds.",
      "Verify setter task is created with correct due date.",
      "Verify internal notification delivers to the correct user.",
      "Confirm AI voice triggers at the 10-minute mark when no call is logged.",
      "Test STOP opt-out — confirm contact is removed from sequences.",
      "Verify pipeline stage moves correctly on each step.",
      "Test duplicate contact handling — submit the same phone number twice.",
    ],
    whatNotToAutomate: [
      "Do not automatically change GHL pipeline stages externally via API in this build — human must confirm.",
      "Do not send email campaigns without A2P-compliant consent verification.",
      "Do not trigger this workflow without proper lead source tagging.",
      "This is an approval-ready blueprint — human must build and activate this workflow in GHL directly.",
    ],
    approvalRequired: true,
    dataConfidence: hasIntel && brain.integrations.ghlConnected ? "high" : hasIntel ? "medium" : "low",
  };
}
