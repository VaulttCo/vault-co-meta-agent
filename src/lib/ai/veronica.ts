// Server-side console intelligence — never import this in client components.
// Builds system prompts and data-aware mock responses for the Veronica Console.

import type { Client, Approval } from "@/lib/data";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import type { CreativeAsset } from "@/lib/creativeAssets";
import type { CampaignDraft } from "@/lib/planStore";
import type { PersistedReport } from "@/lib/data/data-provider";
import type { MetaCampaignSnapshotRow, GHLOpportunitySnapshotRow } from "@/lib/supabase/types";
import {
  type AgentId,
  type AgentOutputBundle,
  AGENT_DISPLAY_NAMES,
  runClientHealthAgent,
  runLaunchReadinessAgent,
  runClientIntelligenceAgent,
  runMediaBuyerAgent,
  runGhlFollowUpAgent,
  runSalesConversionAgent,
  runCreativeStrategistAgent,
  runOfferMessagingAgent,
  runReportingAgent,
  runOperatorPriorityAgent,
  runClientRetentionAgent,
  runUpsellOpportunityAgent,
  runCapacityScalingAgent,
  runDataQualityAgent,
  runComplianceRiskAgent,
  runLandingPageCROAgent,
  runAppointmentSetterAgent,
  runClientCommunicationAgent,
  runGhlWorkflowBuilderAgent,
} from "@/lib/ai/veronica-agents";

// ─────────────────────────────────────────────────────────────
// Public response types
// ─────────────────────────────────────────────────────────────

export interface VeronicaRelatedLink {
  label: string;
  href: string;
}

export type OperatorTaskType =
  | "integration" | "creative" | "campaign" | "ghl_workflow"
  | "client_message" | "reporting" | "follow_up" | "sales_process"
  | "data_cleanup" | "internal_admin";

export interface OperatorTaskSuggestion {
  title: string;
  description: string;
  taskType: OperatorTaskType;
  priority: "urgent" | "high" | "medium" | "low";
  clientId?: string | null;
  sourceAgent?: string;
}

export interface VeronicaConsoleResponse {
  reply: string;
  dataSources: string[];
  relatedLinks?: VeronicaRelatedLink[];
  actionSuggested?: {
    label: string;
    href: string;
  };
  mockMode: boolean;
  provider: string;
  // Veronica 2.0 multi-agent fields
  agentsUsed?: AgentId[];
  approvalRequired?: boolean;
  suggestedApprovalDestination?: string;
  whatVeronicaCanDoNow?: string[];
  whatRequiresHumanApproval?: string[];
  whatIsBlocked?: string[];
  dataConfidence?: "high" | "medium" | "low";
  // Client detected from the message — used by Save Draft to attribute the draft to a client.
  // detectedClientName is the official saved name from Supabase — always use this over the
  // user's typed spelling, which may be a misspelling caught by fuzzy matching.
  detectedClientId?: string;
  detectedClientName?: string;
  // Deterministic operator task suggestions derived from structured agent outputs
  operatorTaskSuggestions?: OperatorTaskSuggestion[];
}

export interface IntegrationConnection {
  clientId: string;
  provider: string;
  status: string;
  lastSyncedAt: string | null;
}

export interface VeronicaPortalContext {
  userRole: string;
  clients: Client[];
  approvals: Approval[];
  campaignDrafts: CampaignDraft[];
  reports: PersistedReport[];
  clientIntelligence?: ClientIntelligence | null;
  creativeAssets?: CreativeAsset[];
  integrationConnections?: IntegrationConnection[];
  metaSnapshots?: MetaCampaignSnapshotRow[];
  ghlOpportunitySnapshots?: GHLOpportunitySnapshotRow[];
}

// ─────────────────────────────────────────────────────────────
// Client Brain — per-client intelligence layer
// ─────────────────────────────────────────────────────────────

export interface DiagnosticFinding {
  clientId: string;
  clientName: string;
  signal: string;
  severity: "critical" | "warning" | "info";
  likelyCause: string;
  recommendation: string;
  blocked: string;
  relatedAction?: { label: string; href: string };
}

// ─────────────────────────────────────────────────────────────
// Part 2 — Bottleneck type classification
// ─────────────────────────────────────────────────────────────

export type BottleneckType =
  | "setup"
  | "ad"
  | "followup"
  | "sales_show"
  | "reporting_data"
  | "none";

export interface BottleneckDiagnosis {
  type: BottleneckType;
  label: string;
  proofData: string;
  likelyMeaning: string;
  nextAction: string;
  notToDo: string;
  dataConfidence: "high" | "medium" | "low";
}

// ─────────────────────────────────────────────────────────────
// Part 1 — Client health score
// ─────────────────────────────────────────────────────────────

export interface ClientHealthScore {
  score: number;
  status: "healthy" | "watch" | "at_risk" | "blocked";
  topBlocker: string | null;
  nextBestAction: string;
  riskReasons: string[];
}

export interface LaunchReadinessCheck {
  clientId: string;
  clientName: string;
  score: number;
  maxScore: number;
  isReady: boolean;
  complete: string[];
  missing: string[];
  // Part 4 extensions
  launchStatus: "ready" | "almost_ready" | "blocked" | "incomplete";
  blockingItems: string[];
  recommendedLaunchSequence: string[];
}

export interface GHLOpportunitySummary {
  hasData: boolean;
  total: number;
  byStatus: Record<string, number>;
  byStage: Record<string, number>;
  staleCount: number;
  totalValue: number;
  lastSyncedAt: string | null;
}

export interface ClientBrain {
  profile: {
    id: string;
    name: string;
    owner: string;
    status: string;
    market: string;
    services: string[];
    budget: string;
    avgJobValue: string;
    offer: string;
    notes: string;
  };
  integrations: {
    metaConnected: boolean;
    metaLastSynced: string | null;
    pixelInstalled: boolean;
    fbPageConnected: boolean;
    ghlConnected: boolean;
    ghlLastSynced: string | null;
    hasActiveMetaCampaigns: boolean;
    activeCampaignCount: number;
  };
  ghlOpportunities: GHLOpportunitySummary;
  performance: {
    leads: number;
    booked: number;
    bookingRate: number;
    cpl: string;
    cpba: string;
    showRate: string;
    spend: string;
    pipeline: string;
    revenue: string;
    cplBenchmark: number;
    cplStatus: "ok" | "above_target" | "unknown";
    bookingStatus: "ok" | "below_target" | "unknown";
    showRateStatus: "ok" | "below_target" | "unknown";
  };
  intelligence: ClientIntelligence | null;
  approvedAssets: CreativeAsset[];
  pendingAssets: CreativeAsset[];
  drafts: CampaignDraft[];
  pendingApprovals: Approval[];
  recentReports: PersistedReport[];
  launchReadiness: LaunchReadinessCheck;
  diagnostics: DiagnosticFinding[];
  healthScore: ClientHealthScore;
  bottleneck: BottleneckDiagnosis;
}

// ─────────────────────────────────────────────────────────────
// Launch readiness — 7-point checklist
// ─────────────────────────────────────────────────────────────

function isValuePending(v: string | null | undefined): boolean {
  if (!v) return true;
  const lower = v.toLowerCase();
  return lower === "pending" || lower.startsWith("pending") || lower === "" || lower === "—";
}

function checkLaunchReadiness(
  client: Client,
  approvedAssets: CreativeAsset[],
  drafts: CampaignDraft[],
  intelligence: ClientIntelligence | null,
  pendingApprovals: Approval[],
  integrationConnections: IntegrationConnection[],
  recentReports: PersistedReport[],
  hasDataConflicts: boolean
): LaunchReadinessCheck {
  const clientConns = integrationConnections.filter((ic) => ic.clientId === client.id);
  // integration_connections is authoritative for live connection status
  const ghlConnectedLive = clientConns.some((ic) => ic.provider === "ghl" && ic.status === "connected");
  const ghlSynced = clientConns.some((ic) => ic.provider === "ghl" && !!ic.lastSyncedAt);
  const ghlConnectedFinal = ghlConnectedLive || (!!client.ghlLocationId && !isValuePending(client.ghlLocationId));

  // Blocking checks — must all pass to launch
  const blocking: Array<{ label: string; pass: boolean }> = [
    { label: "Meta Ad Account connected", pass: !!client.metaAccountId && !isValuePending(client.metaAccountId) },
    { label: "Meta Pixel installed", pass: !!client.pixelId && !isValuePending(client.pixelId) },
    { label: "Facebook Page connected", pass: !!client.fbPageId && !isValuePending(client.fbPageId) },
    { label: "GHL Location connected", pass: ghlConnectedFinal },
    { label: "GHL sync confirmed", pass: ghlSynced },
    { label: "Approved creative asset", pass: approvedAssets.length > 0 },
    {
      label: "Campaign draft approved or ready",
      pass: drafts.some((d) => d.status === "ready_for_meta" || d.status === "approved"),
    },
  ];

  // Non-blocking checks — important but don't gate launch
  const nonBlocking: Array<{ label: string; pass: boolean }> = [
    { label: "Client intelligence extracted", pass: !!intelligence },
    {
      label: "No high-priority approvals blocking",
      pass: !pendingApprovals.some((a) => a.priority === "high"),
    },
    {
      label: "Report baseline on file",
      pass: client.status !== "active" || recentReports.length > 0,
    },
    { label: "No data conflicts detected", pass: !hasDataConflicts },
  ];

  const allChecks = [...blocking, ...nonBlocking];
  const passed = allChecks.filter((c) => c.pass);
  const failed = allChecks.filter((c) => !c.pass);
  const failedBlocking = blocking.filter((c) => !c.pass);
  const failedNonBlocking = nonBlocking.filter((c) => !c.pass);

  // launchStatus
  let launchStatus: LaunchReadinessCheck["launchStatus"];
  if (failed.length === 0) launchStatus = "ready";
  else if (failedBlocking.length === 0 && failedNonBlocking.length <= 2) launchStatus = "almost_ready";
  else if (failedBlocking.length > 0 && failed.length >= 3) launchStatus = "incomplete";
  else launchStatus = "blocked";

  const blockingItems = failedBlocking.map((c) => c.label);

  // Recommended sequence: fix blockers first, then non-blockers
  const blockingOrder = [
    "Meta Ad Account connected",
    "Meta Pixel installed",
    "Facebook Page connected",
    "GHL Location connected",
    "GHL sync confirmed",
    "Approved creative asset",
    "Campaign draft approved or ready",
  ];
  const nonBlockingOrder = [
    "Client intelligence extracted",
    "No high-priority approvals blocking",
    "Report baseline on file",
    "No data conflicts detected",
  ];
  const recommendedLaunchSequence = [
    ...blockingOrder.filter((l) => failedBlocking.some((c) => c.label === l)),
    ...nonBlockingOrder.filter((l) => failedNonBlocking.some((c) => c.label === l)),
  ];

  return {
    clientId: client.id,
    clientName: client.name,
    score: passed.length,
    maxScore: allChecks.length,
    isReady: failed.length === 0,
    complete: passed.map((c) => c.label),
    missing: failed.map((c) => c.label),
    launchStatus,
    blockingItems,
    recommendedLaunchSequence,
  };
}

// ─────────────────────────────────────────────────────────────
// Diagnostic rules engine — applies all 14 rules to one client
// ─────────────────────────────────────────────────────────────

function runDiagnosticsForClient(
  client: Client,
  perf: ClientBrain["performance"],
  data: {
    approvedAssets: CreativeAsset[];
    pendingAssets: CreativeAsset[];
    drafts: CampaignDraft[];
    pendingApprovals: Approval[];
    recentReports: PersistedReport[];
    intelligence: ClientIntelligence | null;
    hasActiveMetaCampaigns: boolean;
    isRoofing: boolean;
    integrationConnections?: IntegrationConnection[];
  }
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  const {
    approvedAssets,
    pendingAssets,
    drafts,
    pendingApprovals,
    recentReports,
    intelligence,
    hasActiveMetaCampaigns,
    isRoofing,
    integrationConnections,
  } = data;
  const { leads, booked, bookingRate, cplStatus, bookingStatus, showRateStatus, showRate, cplBenchmark } = perf;
  const cplNum = parseFloat(perf.cpl.replace(/[^0-9.]/g, "")) || 0;
  const showRateNum = parseFloat(showRate.replace(/[^0-9.]/g, "")) || 0;

  // Rule 1 — High CPL
  if (cplStatus === "above_target") {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: `CPL ${perf.cpl} exceeds $${cplBenchmark} ${isRoofing ? "roofing" : "remodeling"} benchmark`,
      severity: cplNum > cplBenchmark * 2 ? "critical" : "warning",
      likelyCause:
        "Ad creative not resonating with the target audience, or targeting has decayed after running too long. Could also indicate weak hook, wrong campaign angle, or ad fatigue.",
      recommendation:
        "Review active creatives for this client. Test a new hook angle. Check if the same creative has been running 30+ days. Consider generating a new campaign draft with a different angle.",
      blocked: "Do not pause campaigns or change budgets — those actions require human approval.",
      relatedAction: { label: "Campaign Builder", href: "/ai-agent" },
    });
  }

  // Rule 2 — Low CPL but low booking rate
  if (cplStatus === "ok" && bookingStatus === "below_target" && leads > 0) {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: `CPL is on target (${perf.cpl}) but booking rate is ${bookingRate}% — below the 30% target`,
      severity: "warning",
      likelyCause:
        "GHL follow-up speed is likely the issue. Leads are coming in but are not being contacted fast enough. CPL is healthy, so the ads are working — the conversion funnel is the problem.",
      recommendation:
        "Audit when the first SMS fires after lead submission (should be under 60 seconds). Verify setter calls within 5 minutes. Check if AI voice trigger is active at the 10-minute window.",
      blocked: "Do not change ad targeting or pause the campaign — CPL is on target.",
      relatedAction: { label: "Client Profile → Integrations", href: `/clients/${client.id}` },
    });
  }

  // Rule 3 — Leads exist, zero bookings
  if (leads > 5 && booked === 0) {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: `${leads} leads recorded but 0 booked appointments`,
      severity: "critical",
      likelyCause:
        "GHL workflow may not be active, or pipeline stages are not mapped. Could also mean the setter is not receiving notifications, or bookings exist in GHL but are not syncing to the portal.",
      recommendation:
        "Verify the GHL location ID is correct and the pipeline is configured. Check if the immediate SMS and setter task are triggering. Confirm leads are appearing in the GHL pipeline.",
      blocked: "Do not stop ad campaigns until the follow-up breakdown is identified.",
      relatedAction: { label: "Client Profile → Integrations", href: `/clients/${client.id}` },
    });
  }

  // Rule 4 — Low show rate
  if (showRateNum > 0 && showRateNum < 65 && booked > 0) {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: `Show rate is ${showRate} — below the 65% target`,
      severity: showRateNum < 50 ? "critical" : "warning",
      likelyCause:
        "Appointments are booking but not showing. This usually means a weak confirmation sequence, too much time between booking and appointment, or the setter did not build commitment on the call.",
      recommendation:
        "Review the appointment confirmation SMS sequence in GHL. Check the average time from booking to appointment — flag if over 3 days. Setter coaching: end every booking call with confirmed time, address, and verbal commitment.",
      blocked:
        "Do not change ad targeting or creative — the issue is post-booking, not lead quality.",
    });
  }

  // Rule 5 — Meta connected, no active campaigns
  if (!isValuePending(client.metaAccountId) && !!client.metaAccountId && !hasActiveMetaCampaigns) {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: "Meta account is connected but no active campaigns are running",
      severity: "warning",
      likelyCause:
        "Campaign drafts may be awaiting approval, all campaigns may be paused, or an account has been set up but no campaign has been generated yet.",
      recommendation:
        "Check the approval queue for pending campaign drafts. If none exist, generate a new draft from the Campaign Builder.",
      blocked: "Do not activate campaigns — all launches require human approval.",
      relatedAction: { label: "Campaign Builder", href: "/ai-agent" },
    });
  }

  // Rule 6 — GHL connected, leads exist, no bookings
  if (!isValuePending(client.ghlLocationId) && !!client.ghlLocationId && leads > 0 && booked === 0) {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: "GHL is connected and leads exist, but no booked appointments are recorded",
      severity: "critical",
      likelyCause:
        "The follow-up workflow may not be active, the setter is not reaching leads, or pipeline stages are not being updated in GHL.",
      recommendation:
        "Verify the GHL location is active and the pipeline is configured. Check if the immediate SMS and setter task trigger are firing when leads come in.",
      blocked: "Do not modify GHL workflows directly — flag for the operations team.",
      relatedAction: { label: "Client Profile → Integrations", href: `/clients/${client.id}` },
    });
  }

  // Rule 7 — Missing onboarding intelligence
  if (!intelligence) {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: "No client intelligence extracted for this client",
      severity: client.status === "active" ? "warning" : "info",
      likelyCause:
        "Onboarding summary has not been uploaded or the intelligence extraction has not been run.",
      recommendation:
        "Complete the onboarding intake and upload the summary. Run intelligence extraction from the client record. Without it, campaigns use generic angles instead of client-specific positioning, offer language, and buyer psychology.",
      blocked:
        "Campaigns generated without intelligence will be less targeted and less effective.",
      relatedAction: { label: `View ${client.name}`, href: `/clients/${client.id}` },
    });
  }

  // Rule 8 — Missing approved creatives
  if (approvedAssets.length === 0) {
    const examples = isRoofing
      ? "owner-on-camera, before/after, storm damage footage"
      : "before/after, owner on camera, project reveal";
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: `No approved creative assets for this client${pendingAssets.length > 0 ? ` (${pendingAssets.length} pending review)` : ""}`,
      severity: client.status === "active" ? "warning" : "info",
      likelyCause:
        "No creatives have been uploaded, or uploaded creatives have not been approved for ads.",
      recommendation: `Upload creative assets (${examples}) and submit for approval.${
        pendingAssets.length > 0
          ? ` There are ${pendingAssets.length} asset(s) pending review — approve these first.`
          : ""
      }`,
      blocked: "Cannot submit campaigns to Meta without at least one approved creative.",
      relatedAction: { label: "Creative Library", href: "/creatives" },
    });
  }

  // Rule 9 — Pending approvals blocking launch
  if (pendingApprovals.length > 0) {
    const highPriority = pendingApprovals.filter((a) => a.priority === "high");
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: `${pendingApprovals.length} pending approval(s) for this client${
        highPriority.length > 0 ? ` — ${highPriority.length} high priority` : ""
      }`,
      severity: highPriority.length > 0 ? "critical" : "warning",
      likelyCause: "Items have been submitted for review but not yet approved by the team.",
      recommendation: `Review and approve: ${pendingApprovals
        .slice(0, 3)
        .map((a) => a.item)
        .join(", ")}`,
      blocked: "Cannot launch campaigns until blocking approvals are cleared.",
      relatedAction: { label: "Open Approvals Queue", href: "/approvals" },
    });
  }

  // Rule 10 — Stale / missing reports
  if (recentReports.length === 0 && client.status === "active") {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: "No reports on file for this active client",
      severity: "info",
      likelyCause: "Weekly reporting has not been set up or the first report has not been generated.",
      recommendation:
        "Generate a weekly performance report draft for this client. Active clients should receive weekly reporting.",
      blocked: "Reports require human review before delivery to clients.",
      relatedAction: { label: "Reports", href: "/reports" },
    });
  }

  // Rule 11 — Integration status (non-active clients only)
  // Source of truth hierarchy:
  //   1. integration_connections.status === "connected" (live, authoritative)
  //   2. Client profile ID fields (secondary/backfill only)
  // When live integration says connected but profile field is missing → info note (not a blocker).
  const missingProfileFields: string[] = [];
  if (!client.metaAccountId || isValuePending(client.metaAccountId)) missingProfileFields.push("Meta Ad Account");
  if (!client.pixelId || isValuePending(client.pixelId)) missingProfileFields.push("Meta Pixel");
  if (!client.fbPageId || isValuePending(client.fbPageId)) missingProfileFields.push("Facebook Page");
  if (!client.ghlLocationId || isValuePending(client.ghlLocationId)) missingProfileFields.push("GHL Location");

  if (missingProfileFields.length > 0 && client.status !== "active") {
    const rule11Conns = (integrationConnections ?? []).filter((ic) => ic.clientId === client.id);
    const ghlLiveConn = rule11Conns.some((ic) => ic.provider === "ghl" && ic.status === "connected");
    const metaLiveConn = rule11Conns.some((ic) => ic.provider === "meta" && ic.status === "connected");

    // Classify each field: live-connected (backfill needed) vs. genuinely missing
    const backfillNeeded: string[] = [];
    const genuinelyMissing: string[] = [];
    for (const field of missingProfileFields) {
      const isGhl = field.includes("GHL");
      const isMeta = field.includes("Meta") || field.includes("Facebook") || field.includes("Pixel");
      if (isGhl && ghlLiveConn) backfillNeeded.push(field);
      else if (isMeta && metaLiveConn) backfillNeeded.push(field);
      else genuinelyMissing.push(field);
    }

    // State D: Live connection active but profile field missing → cleanup info note (never a blocker)
    if (backfillNeeded.length > 0) {
      findings.push({
        clientId: client.id,
        clientName: client.name,
        signal: `${backfillNeeded.join(", ")} — live integration is connected. Client profile ID should be backfilled.`,
        severity: "info",
        likelyCause:
          "The live integration connection is active and confirmed via integration_connections. The client profile ID field has not been backfilled yet — this is a cleanup item, not a connection issue.",
        recommendation: `Open the client profile → Integrations tab to verify and save the ID(s) for: ${backfillNeeded.join(", ")}. The integration itself is operational.`,
        blocked: "",
        relatedAction: { label: "Client Profile", href: `/clients/${client.id}` },
      });
    }

    // State C: No live connection and no profile field → genuinely not connected
    if (genuinelyMissing.length > 0) {
      findings.push({
        clientId: client.id,
        clientName: client.name,
        signal: `Missing integrations: ${genuinelyMissing.join(", ")}`,
        severity: genuinelyMissing.length >= 3 ? "critical" : "warning",
        likelyCause:
          "Client onboarding has not been completed. Credentials have not been entered or the client has not yet granted account access.",
        recommendation: `Complete integration setup for: ${genuinelyMissing.join(", ")}. Open the client profile → Integrations tab.`,
        blocked:
          "Cannot run Meta ads without Meta Ad Account, Pixel, and Page. Cannot run GHL workflows without a connected GHL Location.",
        relatedAction: { label: "Client Profile", href: `/clients/${client.id}` },
      });
    }
  }

  // Rule 12 — Poor speed-to-lead
  if (leads > 10 && bookingRate < 15 && !isValuePending(client.ghlLocationId) && !!client.ghlLocationId) {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: `${leads} leads with only ${bookingRate}% booking rate despite GHL being connected — likely speed-to-lead failure`,
      severity: "critical",
      likelyCause:
        "First contact is not happening within 5 minutes of form submission. In home services, every minute of delay reduces booking probability. Leads that wait 30+ minutes rarely book.",
      recommendation:
        "Audit the exact time between form submission and first SMS/call in GHL. Verify the immediate SMS fires within 60 seconds. Verify setter calls within 5 minutes. Verify AI voice triggers at 10 minutes if no call is logged.",
      blocked:
        "Do not change ad targeting or increase budget until speed-to-lead is fixed.",
    });
  }

  // Rule 13 — Creative fatigue (no new assets uploaded recently)
  if (approvedAssets.length > 0 && client.status === "active") {
    const allOld = approvedAssets.every((a) => {
      const uploadDate = new Date(a.uploadDate);
      const daysSince = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 30;
    });
    if (allOld) {
      findings.push({
        clientId: client.id,
        clientName: client.name,
        signal: "All approved creatives are 30+ days old — potential creative fatigue",
        severity: "info",
        likelyCause:
          "Same creative assets running continuously causes audience fatigue. CTR typically declines after 3–4 weeks with the same creative.",
        recommendation: `Upload a new creative variation. ${
          isRoofing
            ? "Rotate angle: if owner-on-camera is primary, add a before/after or storm damage clip."
            : "Rotate angle: if before/after is primary, add a homeowner testimonial or project reveal."
        }`,
        blocked: "Do not increase budget to compensate for declining creative performance.",
        relatedAction: { label: "Creative Library", href: "/creatives" },
      });
    }
  }

  return findings;
}

// ─────────────────────────────────────────────────────────────
// Part 5 — Data conflict detection
// ─────────────────────────────────────────────────────────────

function detectAdditionalDataConflicts(
  client: Client,
  drafts: CampaignDraft[],
  reports: PersistedReport[],
  assets: CreativeAsset[],
  integrationConnections: IntegrationConnection[]
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  const approvedAssets = assets.filter((a) => a.approvedForAds);
  const clientConns = integrationConnections.filter((ic) => ic.clientId === client.id);

  // Conflict 1: Draft approved/ready but no approved creative
  const hasReadyDraft = drafts.some(
    (d) => d.status === "ready_for_meta" || d.status === "approved"
  );
  if (hasReadyDraft && approvedAssets.length === 0) {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal:
        "This is a data mismatch, not a performance issue. Campaign draft is approved/ready but no creative assets are approved for Meta ads.",
      severity: "critical",
      likelyCause:
        "The campaign draft was approved before creative assets were reviewed, or creatives were unapproved after the draft was approved.",
      recommendation:
        "Go to Creative Library and approve at least one creative asset for this client before submitting the campaign to Meta.",
      blocked:
        "Do not submit this campaign to Meta. Fix the creative first.",
      relatedAction: { label: "Creative Library", href: "/creatives" },
    });
  }

  // Conflict 2: Report shows leads but live stats show 0 leads with active Meta sync
  const reportWithLeads = reports.find((r) => r.leads > 0);
  const hasMetaSync = clientConns.some(
    (ic) => ic.provider === "meta" && ic.lastSyncedAt
  );
  if (reportWithLeads && client.stats.leads === 0 && hasMetaSync) {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: `This is a data mismatch, not a performance issue. Report "${reportWithLeads.reportPeriod}" shows ${reportWithLeads.leads} leads but live stats show 0 leads despite active Meta sync.`,
      severity: "warning",
      likelyCause:
        "The report was generated from a different period or the Meta sync reset the stats counter. Live stats and report data are out of sync.",
      recommendation:
        "Trigger a fresh Meta sync from the client profile → Integrations tab and compare the current period to the report period before drawing conclusions.",
      blocked:
        "Do not assume lead volume is zero. Verify the sync window matches the reporting period.",
      relatedAction: { label: "Client Profile", href: `/clients/${client.id}` },
    });
  }

  // Conflict 3: GHL sync active but GHL Pipeline ID missing/pending
  const hasGhlSync = clientConns.some(
    (ic) => ic.provider === "ghl" && ic.lastSyncedAt
  );
  if (hasGhlSync && (!client.ghlPipelineId || isValuePending(client.ghlPipelineId))) {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal:
        "GHL is connected and synced. The missing GHL Pipeline ID is a configuration cleanup item that limits workflow routing/pipeline auditing until backfilled.",
      severity: "warning",
      likelyCause:
        "GHL location is connected but the pipeline ID was not saved to the client profile after setup. This does not affect the GHL connection — it limits pipeline stage tracking and workflow routing audit until the ID is backfilled.",
      recommendation:
        "Find the pipeline ID in GHL and save it to the client profile → Integrations tab. Confirm the correct pipeline is mapped for this client.",
      blocked:
        "Do not flag GHL as disconnected or non-operational. The missing pipeline ID is a configuration cleanup item — not a connection failure.",
      relatedAction: { label: "Client Profile", href: `/clients/${client.id}` },
    });
  }

  // Conflict 4: Assets with "Approved" status but approvedForAds = false
  const approvedStatusNotForAds = assets.filter(
    (a) => a.status === "Approved" && !a.approvedForAds
  );
  if (approvedStatusNotForAds.length > 0) {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: `This is a data mismatch, not a performance issue. ${approvedStatusNotForAds.length} creative asset(s) have "Approved" status but are not flagged for Meta ads.`,
      severity: "info",
      likelyCause:
        "Assets were approved in the Creative Library but the 'Approved for Ads' flag was not toggled. These assets do not count toward campaign readiness.",
      recommendation:
        "Review these assets in Creative Library and enable 'Approved for Ads' if they are ready for Meta.",
      blocked:
        "These assets cannot be used in Meta submissions until approvedForAds is enabled.",
      relatedAction: { label: "Creative Library", href: "/creatives" },
    });
  }

  return findings;
}

// ─────────────────────────────────────────────────────────────
// Part 1 — Compute client health score (0–100)
// ─────────────────────────────────────────────────────────────

function computeClientHealthScore(data: {
  integrations: ClientBrain["integrations"];
  performance: ClientBrain["performance"];
  intelligence: ClientIntelligence | null;
  approvedAssets: CreativeAsset[];
  drafts: CampaignDraft[];
  pendingApprovals: Approval[];
  recentReports: PersistedReport[];
  diagnostics: DiagnosticFinding[];
  clientStatus: string;
}): ClientHealthScore {
  const {
    integrations,
    performance,
    intelligence,
    approvedAssets,
    drafts,
    pendingApprovals,
    recentReports,
    diagnostics,
    clientStatus,
  } = data;
  let score = 0;
  const riskReasons: string[] = [];

  // Integration readiness — 30 pts
  if (integrations.metaConnected) score += 8;
  else riskReasons.push("Meta Ad Account not connected (-8)");
  if (integrations.pixelInstalled) score += 7;
  else riskReasons.push("Meta Pixel not installed (-7)");
  if (integrations.fbPageConnected) score += 7;
  else riskReasons.push("Facebook Page not connected (-7)");
  if (integrations.ghlConnected) score += 8;
  else riskReasons.push("GHL Location not connected (-8)");

  // Performance KPIs — 30 pts
  // Unknown = half credit (no data yet, not a failure)
  if (performance.cplStatus === "ok") score += 12;
  else if (performance.cplStatus === "above_target") {
    score += 4;
    riskReasons.push(`CPL ${performance.cpl} above $${performance.cplBenchmark} target (-8)`);
  } else {
    score += 6;
  }
  if (performance.bookingStatus === "ok") score += 12;
  else if (performance.bookingStatus === "below_target") {
    score += 4;
    riskReasons.push(`Booking rate ${performance.bookingRate}% below 30% target (-8)`);
  } else {
    score += 6;
  }
  if (performance.showRateStatus === "ok") score += 6;
  else if (performance.showRateStatus === "below_target") {
    score += 2;
    riskReasons.push(`Show rate ${performance.showRate} below 65% target (-4)`);
  } else {
    score += 3;
  }

  // Intelligence — 10 pts
  if (intelligence) score += 10;
  else riskReasons.push("Client intelligence not extracted (-10)");

  // Creative readiness — 10 pts
  if (approvedAssets.length > 0) score += 10;
  else riskReasons.push("No approved creative assets (-10)");

  // Campaign / approval readiness — 10 pts
  const hasDraftReady = drafts.some(
    (d) => d.status === "ready_for_meta" || d.status === "approved"
  );
  if (hasDraftReady) score += 5;
  else riskReasons.push("No approved campaign draft (-5)");
  const highPriorityApprovals = pendingApprovals.filter((a) => a.priority === "high");
  if (highPriorityApprovals.length === 0) score += 5;
  else riskReasons.push(`${highPriorityApprovals.length} high-priority approval(s) pending (-5)`);

  // Report freshness — 10 pts (only penalizes active clients)
  if (clientStatus === "active") {
    if (recentReports.length > 0) score += 10;
    else riskReasons.push("No reports on file for active client (-10)");
  } else {
    score += 10; // Not applicable for non-active clients
  }

  // Status thresholds
  let status: ClientHealthScore["status"];
  if (score >= 80) status = "healthy";
  else if (score >= 60) status = "watch";
  else if (score >= 40) status = "at_risk";
  else status = "blocked";

  // Top blocker: prefer highest-severity diagnostic signal
  const criticals = diagnostics.filter((d) => d.severity === "critical");
  const topBlockerStr =
    criticals.length > 0
      ? criticals[0].signal
      : riskReasons.length > 0
      ? riskReasons[0].replace(/ \(-\d+\)$/, "")
      : null;

  // Next best action
  const nextBestAction =
    criticals.length > 0
      ? criticals[0].recommendation
      : !integrations.metaConnected
      ? "Connect Meta Ad Account — open the client profile → Integrations tab"
      : !integrations.ghlConnected
      ? "Connect GHL Location — open the client profile → Integrations tab"
      : approvedAssets.length === 0
      ? "Upload and approve creative assets in Creative Library"
      : !hasDraftReady
      ? "Generate and approve a campaign draft in Campaign Builder"
      : !intelligence
      ? "Extract client intelligence from the client record"
      : "Review active diagnostics and performance metrics";

  return { score, status, topBlocker: topBlockerStr, nextBestAction, riskReasons };
}

// ─────────────────────────────────────────────────────────────
// Part 2 — Classify the primary bottleneck for one client
// ─────────────────────────────────────────────────────────────

function classifyBottleneck(data: {
  integrations: ClientBrain["integrations"];
  performance: ClientBrain["performance"];
  intelligence: ClientIntelligence | null;
  approvedAssets: CreativeAsset[];
  diagnostics: DiagnosticFinding[];
  launchReadiness: LaunchReadinessCheck;
}): BottleneckDiagnosis {
  const { integrations, performance, intelligence, approvedAssets, diagnostics, launchReadiness } =
    data;

  // Priority 1 — Setup bottleneck
  // For clients already running active campaigns, asset/intelligence gaps are data-load
  // artifacts (per-client data not fetched in global queries) — not true setup blockers.
  const activelyRunning = integrations.hasActiveMetaCampaigns || integrations.activeCampaignCount > 0;
  const setupGaps: string[] = [];
  if (!integrations.metaConnected) setupGaps.push("Meta Ad Account");
  if (!integrations.pixelInstalled) setupGaps.push("Meta Pixel");
  if (!integrations.fbPageConnected) setupGaps.push("Facebook Page");
  if (!integrations.ghlConnected) setupGaps.push("GHL Location");
  if (approvedAssets.length === 0 && !activelyRunning) setupGaps.push("approved creative");
  if (!intelligence && !activelyRunning) setupGaps.push("client intelligence");

  if (setupGaps.length > 0) {
    return {
      type: "setup",
      label: "Setup Bottleneck",
      proofData: `Missing: ${setupGaps.join(", ")}. Launch readiness: ${launchReadiness.score}/${launchReadiness.maxScore}.`,
      likelyMeaning:
        "Client onboarding is incomplete. Ads cannot run effectively — or at all — without these items in place.",
      nextAction: `Complete setup for: ${setupGaps.slice(0, 2).join(" and ")}. Open the client profile → Integrations tab for credentials; Creative Library for assets.`,
      notToDo:
        "Do not launch, activate, or submit campaigns to Meta until integrations are connected and an approved creative is in place. Veronica can prepare campaign drafts and strategy now.",
      dataConfidence: "high",
    };
  }

  // Priority 2 — Ad bottleneck
  const hasCreativeFatigue = diagnostics.some((d) =>
    d.signal.includes("30+ days old")
  );
  const isAdBottleneck =
    performance.cplStatus === "above_target" ||
    (integrations.hasActiveMetaCampaigns &&
      performance.leads === 0 &&
      performance.cplStatus === "unknown") ||
    hasCreativeFatigue;

  if (isAdBottleneck) {
    const cplNote =
      performance.cplStatus === "above_target"
        ? `CPL ${performance.cpl} vs $${performance.cplBenchmark} target.`
        : "";
    const leadsNote =
      performance.leads === 0
        ? "0 leads despite active campaigns."
        : `${performance.leads} leads recorded.`;
    return {
      type: "ad",
      label: "Ad Performance Bottleneck",
      proofData: `${cplNote} ${leadsNote} Active campaigns: ${integrations.activeCampaignCount}. Approved creatives: ${approvedAssets.length}.`.trim(),
      likelyMeaning:
        "The ads themselves are the weak point. Creative may be fatigued, targeting may have decayed, or the campaign angle is not converting the right audience.",
      nextAction:
        "Review active creatives for hook strength and run duration. Generate a new campaign draft with a different angle. Flag for creative refresh if all assets are 30+ days old.",
      notToDo:
        "Do not pause campaigns or change budgets without human approval. Do not increase spend while CPL is above target.",
      dataConfidence: performance.leads > 10 ? "high" : "medium",
    };
  }

  // Priority 3 — Follow-up bottleneck
  const isFollowupBottleneck =
    (performance.leads > 0 && performance.booked === 0) ||
    (performance.bookingStatus === "below_target" &&
      performance.bookingRate < 30 &&
      integrations.ghlConnected);

  if (isFollowupBottleneck) {
    const proofData =
      performance.leads > 0 && performance.booked === 0
        ? `${performance.leads} leads, 0 booked appointments. GHL: ${integrations.ghlConnected ? "connected" : "not connected"}.`
        : `${performance.leads} leads, ${performance.booked} booked (${performance.bookingRate}% — below 30% target). GHL: connected.`;
    return {
      type: "followup",
      label: "Follow-Up Bottleneck",
      proofData,
      likelyMeaning:
        "Leads are entering the system but not converting to appointments. First contact within 5 minutes is the most critical conversion variable in home services.",
      nextAction:
        "Audit GHL workflow: verify immediate SMS fires within 60 seconds, setter task created within 1 minute, first call placed within 5 minutes, AI voice triggers at 10 minutes if no call logged.",
      notToDo:
        "Do not change ad targeting or pause campaigns — the problem is post-lead. Do not increase ad spend while this issue exists.",
      dataConfidence: performance.leads > 5 ? "high" : "medium",
    };
  }

  // Priority 4 — Sales/Show bottleneck
  const showRateNum = parseFloat(performance.showRate.replace(/[^0-9.]/g, "")) || 0;
  if (performance.booked > 0 && showRateNum > 0 && showRateNum < 65) {
    return {
      type: "sales_show",
      label: "Sales / Show Rate Bottleneck",
      proofData: `${performance.booked} appointments booked. Show rate: ${performance.showRate} (target: 65%+). Pipeline: ${performance.pipeline}.`,
      likelyMeaning:
        "Appointments are booking but not showing up. Likely a weak confirmation sequence, too much time between booking and appointment, or the setter did not build commitment on the call.",
      nextAction:
        "Review the appointment confirmation SMS/email sequence in GHL. Check average days from booking to appointment — flag if over 3 days. Flag for setter coaching on commitment-building.",
      notToDo:
        "Do not change ad targeting or creative — the issue is post-booking, not lead quality.",
      dataConfidence: performance.booked > 3 ? "high" : "medium",
    };
  }

  // Priority 5 — Reporting/Data bottleneck
  const hasDataConflictDiag = diagnostics.some((d) =>
    d.signal.includes("data mismatch")
  );
  const hasNoReportDiag = diagnostics.some((d) =>
    d.signal.includes("No reports on file")
  );

  if (hasDataConflictDiag || hasNoReportDiag) {
    const conflictNote = hasDataConflictDiag
      ? "Data mismatch detected between integration connections and client profile. "
      : "";
    const reportNote = hasNoReportDiag
      ? "No reports on file for active client. "
      : "";
    return {
      type: "reporting_data",
      label: "Reporting / Data Bottleneck",
      proofData: `${conflictNote}${reportNote}Active diagnostics: ${diagnostics.filter((d) => d.severity !== "info").length}.`,
      likelyMeaning:
        "Visibility is limited. Missing or conflicting data makes accurate diagnosis and reliable optimization decisions impossible.",
      nextAction: hasDataConflictDiag
        ? "Verify integration credentials in the client profile → Integrations tab. Reconcile any mismatched IDs before assuming the data is correct."
        : "Generate a weekly report draft to establish a performance baseline for this client.",
      notToDo:
        "Do not make ad performance decisions based on conflicting or missing data.",
      dataConfidence: "low",
    };
  }

  // No bottleneck
  return {
    type: "none",
    label: "No Bottleneck Detected",
    proofData: `Launch readiness: ${launchReadiness.score}/${launchReadiness.maxScore}. Active diagnostics: ${diagnostics.filter((d) => d.severity !== "info").length}.`,
    likelyMeaning:
      "No critical bottleneck detected based on available data. Client appears to be operating within acceptable parameters.",
    nextAction: launchReadiness.isReady
      ? "Monitor performance metrics. Look for optimization opportunities — creative refresh, audience expansion, or report updates."
      : `Complete remaining launch requirements: ${launchReadiness.missing.slice(0, 2).join(", ")}.`,
    notToDo:
      "Do not scale ad spend without consistent 30+ day performance data showing CPL and booking rate on target.",
    dataConfidence:
      performance.leads > 20 ? "high" : performance.leads > 5 ? "medium" : "low",
  };
}

// ─────────────────────────────────────────────────────────────
// Build a full brain for one client using available ctx data
// ─────────────────────────────────────────────────────────────

export function buildClientBrain(
  client: Client,
  ctx: VeronicaPortalContext
): ClientBrain {
  const {
    approvals,
    campaignDrafts,
    reports,
    clientIntelligence,
    creativeAssets,
  } = ctx;

  const assets = (creativeAssets ?? []).filter((a) => a.clientId === client.id);
  const approvedAssets = assets.filter((a) => a.approvedForAds);
  const pendingAssets = assets.filter((a) => a.status === "Needs Review");

  const drafts = campaignDrafts.filter((d) => d.clientId === client.id);
  const pendingApprovals = approvals.filter((a) => a.clientId === client.id);
  const recentReports = reports.filter((r) => r.clientId === client.id).slice(0, 5);

  const activeCampaigns = (client.campaigns ?? []).filter((c) => c.status === "active");
  const hasActiveMetaCampaigns = activeCampaigns.length > 0;

  const s = client.stats;
  const isRoofing = client.services.some((sv) => sv.toLowerCase().includes("roof"));
  const cplBenchmark = isRoofing ? 75 : 150;

  // Build GHL opportunity summary from stored snapshots (read-only, no GHL API call)
  const clientGhlOpps = (ctx.ghlOpportunitySnapshots ?? []).filter((sn) => sn.client_id === client.id);
  const ghlOppLastSync = clientGhlOpps.length > 0 ? clientGhlOpps[0].synced_at : null;
  const STALE_DAYS = 7;
  const staleThreshold = Date.now() - STALE_DAYS * 86400000;
  const byStatus: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  let ghlTotalValue = 0;
  let staleCount = 0;
  for (const opp of clientGhlOpps) {
    const status = opp.status ?? "unknown";
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    const stage = opp.pipeline_stage_name ?? "Unknown Stage";
    byStage[stage] = (byStage[stage] ?? 0) + 1;
    ghlTotalValue += Number(opp.monetary_value ?? 0);
    const lastActivity = opp.last_activity_at ?? opp.updated_at_ghl;
    if (lastActivity && new Date(lastActivity).getTime() < staleThreshold) staleCount++;
    else if (!lastActivity) staleCount++;
  }
  const ghlOpportunities: GHLOpportunitySummary = {
    hasData: clientGhlOpps.length > 0,
    total: clientGhlOpps.length,
    byStatus,
    byStage,
    staleCount,
    totalValue: ghlTotalValue,
    lastSyncedAt: ghlOppLastSync,
  };

  // Override stats with live Meta snapshot data when available.
  // client.stats holds zeros for server-fetched clients; real numbers come from meta_campaign_snapshots.
  const clientSnapshots = (ctx.metaSnapshots ?? []).filter((sn) => sn.client_id === client.id);
  let liveLeads = s.leads;
  let liveSpend = s.spend;
  let liveCpl = s.cpl;
  if (clientSnapshots.length > 0) {
    const snapSpend = clientSnapshots.reduce((sum, sn) => sum + Number(sn.spend ?? 0), 0);
    const snapLeads = clientSnapshots.reduce((sum, sn) => sum + Number(sn.leads ?? 0), 0);
    liveLeads = snapLeads;
    liveSpend = `$${snapSpend.toFixed(0)}`;
    if (snapLeads > 0) liveCpl = `$${(snapSpend / snapLeads).toFixed(0)}`;
  }

  const cplNum = parseFloat(liveCpl.replace(/[^0-9.]/g, "")) || 0;
  const bookingRate = liveLeads > 0 ? Math.round((s.booked / liveLeads) * 100) : 0;
  const showRateNum = parseFloat(s.showRate.replace(/[^0-9.]/g, "")) || 0;

  const cplStatus =
    cplNum === 0
      ? ("unknown" as const)
      : cplNum <= cplBenchmark
      ? ("ok" as const)
      : ("above_target" as const);

  const bookingStatus =
    liveLeads === 0 && bookingRate === 0
      ? ("unknown" as const)
      : bookingRate >= 30
      ? ("ok" as const)
      : ("below_target" as const);

  const showRateStatus =
    showRateNum === 0
      ? ("unknown" as const)
      : showRateNum >= 65
      ? ("ok" as const)
      : ("below_target" as const);

  const performance = {
    leads: liveLeads,
    booked: s.booked,
    bookingRate,
    cpl: liveCpl,
    cpba: s.cpba,
    showRate: s.showRate,
    spend: liveSpend,
    pipeline: s.pipeline,
    revenue: s.revenue,
    cplBenchmark,
    cplStatus,
    bookingStatus,
    showRateStatus,
  };

  const intelligence = clientIntelligence ?? null;

  // Check integration_connections for live status — this is the same source the UI uses.
  // Client profile fields (ghlLocationId etc.) may still be "Pending" even after a successful
  // sync, so we OR the DB-sourced connected flag in as the authoritative check.
  const clientConnsLive = (ctx.integrationConnections ?? []).filter((ic) => ic.clientId === client.id);
  const ghlConnFromDb = clientConnsLive.some((ic) => ic.provider === "ghl" && ic.status === "connected");
  const ghlLastSynced = clientConnsLive.find((ic) => ic.provider === "ghl")?.lastSyncedAt ?? null;
  const metaConnFromDb = clientConnsLive.some((ic) => ic.provider === "meta" && ic.status === "connected");
  const metaLastSynced = clientConnsLive.find((ic) => ic.provider === "meta")?.lastSyncedAt ?? null;

  const integrations = {
    metaConnected: (!!client.metaAccountId && !isValuePending(client.metaAccountId)) || metaConnFromDb,
    metaLastSynced,
    pixelInstalled: !!client.pixelId && !isValuePending(client.pixelId),
    fbPageConnected: !!client.fbPageId && !isValuePending(client.fbPageId),
    ghlConnected: (!!client.ghlLocationId && !isValuePending(client.ghlLocationId)) || ghlConnFromDb,
    ghlLastSynced,
    hasActiveMetaCampaigns,
    activeCampaignCount: activeCampaigns.length,
  };

  // Detect data conflicts before computing launch readiness (feeds hasDataConflicts)
  const conflictFindings = detectAdditionalDataConflicts(
    client,
    drafts,
    recentReports,
    assets,
    ctx.integrationConnections ?? []
  );
  const hasDataConflicts = conflictFindings.length > 0;

  const launchReadiness = checkLaunchReadiness(
    client,
    approvedAssets,
    drafts,
    intelligence,
    pendingApprovals,
    ctx.integrationConnections ?? [],
    recentReports,
    hasDataConflicts
  );

  const baseDiagnostics = runDiagnosticsForClient(client, performance, {
    approvedAssets,
    pendingAssets,
    drafts,
    pendingApprovals,
    recentReports,
    intelligence,
    hasActiveMetaCampaigns,
    isRoofing,
    integrationConnections: ctx.integrationConnections,
  });

  const diagnostics = [...baseDiagnostics, ...conflictFindings];

  const healthScore = computeClientHealthScore({
    integrations,
    performance,
    intelligence,
    approvedAssets,
    drafts,
    pendingApprovals,
    recentReports,
    diagnostics,
    clientStatus: client.status,
  });

  const bottleneck = classifyBottleneck({
    integrations,
    performance,
    intelligence,
    approvedAssets,
    diagnostics,
    launchReadiness,
  });

  return {
    profile: {
      id: client.id,
      name: client.name,
      owner: client.owner,
      status: client.status,
      market: client.market,
      services: client.services,
      budget: client.monthlyBudget,
      avgJobValue: client.avgJobValue,
      offer: client.offer,
      notes: client.notes,
    },
    integrations,
    ghlOpportunities,
    performance,
    intelligence,
    approvedAssets,
    pendingAssets,
    drafts,
    pendingApprovals,
    recentReports,
    launchReadiness,
    diagnostics,
    healthScore,
    bottleneck,
  };
}

// ─────────────────────────────────────────────────────────────
// Veronica 2.0 — Agent routing and orchestration
// ─────────────────────────────────────────────────────────────

// ── Fuzzy client name detection ───────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

const GENERIC_NAME_WORDS = new Set([
  "group", "roofing", "construction", "builders", "remodeling",
  "forge", "home", "services", "company", "inc", "llc",
]);

export function clientMatchesMessage(client: Client, msg: string): boolean {
  const m = msg.toLowerCase();

  // Exact substring: full name or id
  if (m.includes(client.name.toLowerCase())) return true;
  if (m.includes(client.id.toLowerCase())) return true;

  // Owner first/last name partial match (4+ char words)
  const ownerParts = client.owner.toLowerCase().split(" ");
  if (ownerParts.some((w) => w.length >= 4 && m.includes(w))) return true;

  // Significant name parts — exact substring
  const nameParts = client.name.toLowerCase().split(/[\s\-_]+/).filter(
    (w) => w.length >= 4 && !GENERIC_NAME_WORDS.has(w)
  );
  if (nameParts.some((w) => m.includes(w))) return true;

  // Fuzzy match: each significant name part against each message word (length-gated)
  const msgWords = m.split(/\s+/);
  for (const namePart of nameParts) {
    for (const msgWord of msgWords) {
      // Only compare words of similar length to avoid false positives
      if (Math.abs(namePart.length - msgWord.length) > 2) continue;
      if (msgWord.length < 4) continue;
      const threshold = namePart.length >= 7 ? 2 : 1;
      if (levenshtein(namePart, msgWord) <= threshold) return true;
    }
  }

  return false;
}

export interface AgentRoutingResult {
  agentIds: AgentId[];
  detectedClientId: string | null;
  routingReason: string;
}

export function routeToAgents(
  message: string,
  clients: Client[]
): AgentRoutingResult {
  const msg = message.toLowerCase();
  const agents: AgentId[] = [];

  const detectedClient = clients.find((c) => clientMatchesMessage(c, msg));
  const detectedClientId = detectedClient?.id ?? null;

  if (
    msg.includes("priority") || msg.includes("this week") || msg.includes("next week") ||
    msg.includes("what should i") || msg.includes("focus") ||
    msg.includes("operator") || msg.includes("overview") || msg.includes("portfolio") ||
    (!detectedClientId && (
      msg.includes("today") || msg.includes("all clients") || msg.includes("which client")
    ))
  ) agents.push("operator_priority");

  if (
    msg.includes("data quality") || msg.includes("data conflict") || msg.includes("missing data") ||
    msg.includes("mismatch") || msg.includes("unreliable") ||
    msg.includes("trust") || msg.includes("reliable") || msg.includes("accurate")
  ) agents.push("data_quality");

  if (
    msg.includes("health") || msg.includes("score") || msg.includes("at risk") ||
    msg.includes("blocked") || msg.includes("status")
  ) agents.push("client_health");

  if (
    msg.includes("launch") || msg.includes("ready") || msg.includes("setup") ||
    msg.includes("missing") || msg.includes("complete") || msg.includes("onboarding") ||
    msg.includes("not ready") || msg.includes("draft") || msg.includes("campaign") ||
    msg.includes("generate")
  ) agents.push("launch_readiness");

  if (
    msg.includes("intelligence") || msg.includes("buyer") || msg.includes("objection") ||
    msg.includes("positioning") || msg.includes("intake") || msg.includes(" ads")
  ) agents.push("client_intelligence");

  if (
    msg.includes("cpl") || msg.includes("ad performance") || msg.includes("campaign performance") ||
    msg.includes("meta") || msg.includes("budget") || msg.includes("spend") ||
    msg.includes("scale") || msg.includes("increase")
  ) agents.push("media_buyer");

  if (
    msg.includes("ghl") || msg.includes("follow-up") || msg.includes("follow up") ||
    msg.includes("followup") || msg.includes("pipeline") || msg.includes("workflow")
  ) agents.push("ghl_followup");

  // Integration status queries — "Is X connected?", "GHL status", "integration status"
  if (
    msg.includes("connected") || msg.includes("not connected") ||
    msg.includes("integration status") || msg.includes("integration") ||
    msg.includes("ghl status") || msg.includes("meta status")
  ) {
    if (!agents.includes("launch_readiness")) agents.push("launch_readiness");
    if (!agents.includes("client_health")) agents.push("client_health");
    if (msg.includes("integration status") || msg.includes("integration")) {
      if (!agents.includes("data_quality")) agents.push("data_quality");
    }
  }

  if (
    msg.includes("booking") || msg.includes("convert") || msg.includes("close") ||
    msg.includes("leads") || msg.includes("contact") || msg.includes("appointment") ||
    msg.includes("not booking") || msg.includes("no booking")
  ) agents.push("sales_conversion");

  if (
    msg.includes("creative") || msg.includes("asset") || msg.includes("video") ||
    msg.includes("image") || msg.includes("photo") || msg.includes("shoot")
  ) agents.push("creative_strategist");

  if (
    msg.includes("hook") || msg.includes("copy") || msg.includes("messaging") ||
    msg.includes("offer") || msg.includes("angle") || msg.includes("headline") ||
    msg.includes("ad copy") || msg.includes("draft") || msg.includes("campaign") ||
    msg.includes(" ads") || msg.includes("say in") || msg.includes("tell them") ||
    msg.includes("what to write") || msg.includes("what to say")
  ) agents.push("offer_messaging");

  if (msg.includes("report") || msg.includes("reporting") || msg.includes("weekly")) {
    agents.push("reporting");
  }

  if (
    msg.includes("retention") || msg.includes("churn") || msg.includes("cancel") ||
    msg.includes("losing client") || msg.includes("unhappy")
  ) agents.push("client_retention");

  if (
    msg.includes("upsell") || msg.includes("expand") || msg.includes("opportunity") ||
    msg.includes("upgrade") || msg.includes("more services")
  ) agents.push("upsell_opportunity");

  if (
    msg.includes("capacity") || msg.includes("crew") || msg.includes("scaling") ||
    msg.includes("can we scale") || msg.includes("maximum")
  ) agents.push("capacity_scaling");

  if (
    msg.includes("compliance") || msg.includes("risk") || msg.includes("insurance language") ||
    msg.includes("guarantee") || msg.includes("legal") || msg.includes("policy")
  ) agents.push("compliance_risk");

  if (
    msg.includes("landing page") || msg.includes("cro") || msg.includes("conversion rate") ||
    msg.includes("form") || msg.includes("website")
  ) agents.push("landing_page_cro");

  if (
    msg.includes("setter") || msg.includes("appointment setter") || msg.includes("sales call") ||
    msg.includes("show rate") || msg.includes("no show")
  ) agents.push("appointment_setter");

  if (
    msg.includes("client message") || msg.includes("client communication") ||
    msg.includes("what to say") || msg.includes("client update") || msg.includes("draft message") ||
    msg.includes("tell") || msg.includes("say to") || msg.includes("communicate") ||
    msg.includes("message to client") || msg.includes("client message")
  ) agents.push("client_communication");

  if (
    (msg.includes("build") && msg.includes("workflow")) || msg.includes("ghl workflow") ||
    msg.includes("automation") || msg.includes("trigger") || msg.includes("speed-to-lead")
  ) agents.push("ghl_workflow_builder");

  if (
    msg.includes("bottleneck") || msg.includes("problem") || msg.includes("issue") ||
    msg.includes("diagnose") || msg.includes("what is wrong") || msg.includes("what's wrong")
  ) {
    if (!agents.includes("client_health")) agents.push("client_health");
    if (!agents.includes("media_buyer")) agents.push("media_buyer");
    if (!agents.includes("sales_conversion")) agents.push("sales_conversion");
    if (!agents.includes("ghl_followup")) agents.push("ghl_followup");
  }

  if (agents.length === 0) agents.push("client_health", "operator_priority");

  const uniqueAgents = [...new Set(agents)] as AgentId[];
  const routingReason = `Matched ${uniqueAgents.length} agent(s): ${uniqueAgents.join(", ")}${detectedClient ? ` (client: ${detectedClient.name})` : ""}`;

  return { agentIds: uniqueAgents, detectedClientId, routingReason };
}

export function runSelectedAgents(
  routing: AgentRoutingResult,
  ctx: VeronicaPortalContext
): AgentOutputBundle[] {
  const { agentIds, detectedClientId } = routing;
  const { clients, approvals, campaignDrafts } = ctx;
  const bundles: AgentOutputBundle[] = [];

  const targetClient = detectedClientId ? clients.find((c) => c.id === detectedClientId) ?? null : null;
  const targetBrain = targetClient ? buildClientBrain(targetClient, ctx) : null;

  const needsAllBrains = agentIds.some((id) => id === "operator_priority" || id === "data_quality");
  const allBrains = needsAllBrains ? clients.map((c) => buildClientBrain(c, ctx)) : [];

  for (const agentId of agentIds) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let output: any = null;

      switch (agentId) {
        case "client_health":
          if (targetBrain) { output = runClientHealthAgent(targetBrain); break; }
          if (clients.length > 0) {
            const brains = allBrains.length > 0 ? allBrains : clients.map((c) => buildClientBrain(c, ctx));
            const lowest = [...brains].sort((a, b) => a.healthScore.score - b.healthScore.score)[0];
            if (lowest) output = runClientHealthAgent(lowest);
          }
          break;
        case "launch_readiness":
          if (targetBrain) output = runLaunchReadinessAgent(targetBrain);
          break;
        case "client_intelligence":
          if (targetBrain) output = runClientIntelligenceAgent(targetBrain);
          break;
        case "media_buyer":
          if (targetBrain) output = runMediaBuyerAgent(targetBrain);
          break;
        case "ghl_followup":
          if (targetBrain) output = runGhlFollowUpAgent(targetBrain);
          break;
        case "sales_conversion":
          if (targetBrain) output = runSalesConversionAgent(targetBrain);
          break;
        case "creative_strategist":
          if (targetBrain) output = runCreativeStrategistAgent(targetBrain);
          break;
        case "offer_messaging":
          if (targetBrain) output = runOfferMessagingAgent(targetBrain);
          break;
        case "reporting":
          if (targetBrain) output = runReportingAgent(targetBrain);
          break;
        case "operator_priority": {
          const brains = allBrains.length > 0 ? allBrains : clients.map((c) => buildClientBrain(c, ctx));
          output = runOperatorPriorityAgent(brains, approvals, campaignDrafts);
          break;
        }
        case "client_retention":
          if (targetBrain) output = runClientRetentionAgent(targetBrain);
          break;
        case "upsell_opportunity":
          if (targetBrain) output = runUpsellOpportunityAgent(targetBrain);
          break;
        case "capacity_scaling":
          if (targetBrain) output = runCapacityScalingAgent(targetBrain);
          break;
        case "data_quality": {
          const brains = allBrains.length > 0 ? allBrains : clients.map((c) => buildClientBrain(c, ctx));
          output = runDataQualityAgent(targetBrain, brains);
          break;
        }
        case "compliance_risk":
          if (targetBrain) output = runComplianceRiskAgent(targetBrain, campaignDrafts);
          break;
        case "landing_page_cro":
          if (targetBrain) output = runLandingPageCROAgent(targetBrain);
          break;
        case "appointment_setter":
          if (targetBrain) output = runAppointmentSetterAgent(targetBrain);
          break;
        case "client_communication": {
          if (targetBrain) {
            const retentionOut = runClientRetentionAgent(targetBrain);
            const reportingOut = runReportingAgent(targetBrain);
            output = runClientCommunicationAgent(targetBrain, retentionOut, reportingOut);
          }
          break;
        }
        case "ghl_workflow_builder":
          if (targetBrain) output = runGhlWorkflowBuilderAgent(targetBrain);
          break;
      }

      if (output) bundles.push({ agentId, clientId: detectedClientId, output });
    } catch {
      // Silent fail — one agent crashing should not break the whole response
    }
  }

  return bundles;
}

export function assembleApprovalGating(bundles: AgentOutputBundle[]): {
  approvalRequired: boolean;
  suggestedApprovalDestination: string | undefined;
  whatVeronicaCanDoNow: string[];
  whatRequiresHumanApproval: string[];
  whatIsBlocked: string[];
} {
  const approvalRequired = bundles.some((b) => {
    const o = b.output as unknown as Record<string, unknown>;
    return o.approvalRequired === true || o.approvalNeeded === true;
  });

  const canDoNow: string[] = [];
  const requiresApproval: string[] = [];
  const blocked: string[] = [];

  for (const bundle of bundles) {
    const o = bundle.output as unknown as Record<string, unknown>;
    const name = AGENT_DISPLAY_NAMES[bundle.agentId];
    canDoNow.push(`${name}: analysis and recommendations available in this response`);

    if (o.approvalRequired || o.approvalNeeded) {
      if (bundle.agentId === "ghl_workflow_builder") {
        requiresApproval.push("Build and activate GHL workflow — human must implement in GHL directly");
      } else if (bundle.agentId === "media_buyer") {
        requiresApproval.push("Budget change or campaign modification — operator sign-off required before activation");
      } else if (bundle.agentId === "offer_messaging" || bundle.agentId === "creative_strategist") {
        requiresApproval.push("Ad copy and creative direction — human must review before Meta submission");
      } else if (bundle.agentId === "client_communication" || bundle.agentId === "client_retention") {
        requiresApproval.push("Client message draft — human must review and send directly");
      } else if (bundle.agentId === "reporting") {
        requiresApproval.push("Report draft — human must review before client delivery");
      } else {
        requiresApproval.push(`${name} output — human review recommended before acting`);
      }
    }

    const launchOut = o as { blockingItems?: string[] };
    if (launchOut.blockingItems?.length) {
      blocked.push(...launchOut.blockingItems.map((item) => `Blocked: ${item}`));
    }
  }

  const agentIds = bundles.map((b) => b.agentId);
  let suggestedApprovalDestination: string | undefined;
  if (agentIds.includes("ghl_workflow_builder")) suggestedApprovalDestination = "/approvals";
  else if (agentIds.includes("media_buyer") || agentIds.includes("launch_readiness")) suggestedApprovalDestination = "/approvals";
  else if (agentIds.includes("reporting")) suggestedApprovalDestination = "/reports";
  else if (agentIds.includes("creative_strategist")) suggestedApprovalDestination = "/creatives";
  else if (approvalRequired) suggestedApprovalDestination = "/approvals";

  return {
    approvalRequired,
    suggestedApprovalDestination,
    whatVeronicaCanDoNow: [...new Set(canDoNow)],
    whatRequiresHumanApproval: [...new Set(requiresApproval)],
    whatIsBlocked: [...new Set(blocked)].slice(0, 5),
  };
}

export function aggregateDataConfidence(bundles: AgentOutputBundle[]): "high" | "medium" | "low" {
  if (bundles.length === 0) return "low";
  const confidences = bundles
    .map((b) => (b.output as unknown as Record<string, unknown>).dataConfidence as "high" | "medium" | "low" | undefined)
    .filter(Boolean) as Array<"high" | "medium" | "low">;
  if (confidences.includes("low")) return "low";
  if (confidences.includes("medium")) return "medium";
  return "high";
}

// ─────────────────────────────────────────────────────────────
// Operator task suggestions — deterministic, from structured agent outputs
// Never touches Meta/GHL/SMS/email. Creating a task != work was performed externally.
// ─────────────────────────────────────────────────────────────

export function buildOperatorTaskSuggestions(
  bundles: AgentOutputBundle[],
  clientName?: string | null,
  clientId?: string | null
): OperatorTaskSuggestion[] {
  const seen = new Set<string>();
  const suggestions: OperatorTaskSuggestion[] = [];
  const sfx = clientName ? ` for ${clientName}` : "";

  function add(
    title: string,
    taskType: OperatorTaskType,
    priority: OperatorTaskSuggestion["priority"],
    description: string,
    sourceAgent: string
  ) {
    if (seen.has(title)) return;
    seen.add(title);
    suggestions.push({ title, description, taskType, priority, clientId: clientId ?? null, sourceAgent });
  }

  const tail = " Internal task only. No external action has been performed.";

  // Map a blocking item label or risk reason string → task suggestion.
  // Uses simple includes() checks on the lowercased string — no regex, no synthesis text parsing.
  // Descriptions use hardcoded negative-form wording so the task clearly states what is MISSING,
  // not the check label (which is written as a passing condition and would be misleading if echoed).
  function mapLabel(label: string, sourceAgent: string) {
    const low = label.toLowerCase();
    if (low.includes("meta ad account")) {
      add(`Connect Meta Ad Account${sfx}`, "integration", "urgent",
        `Launch blocker: Meta Ad Account not connected.${tail}`, sourceAgent);
    } else if (low.includes("meta pixel") || low.includes("pixel installed") || low.includes("pixel not installed")) {
      add(`Install Meta Pixel${sfx}`, "integration", "urgent",
        `Launch blocker: Meta Pixel not installed.${tail}`, sourceAgent);
    } else if (low.includes("facebook page")) {
      add(`Connect Facebook Page${sfx}`, "integration", "high",
        `Launch blocker: Facebook Page not connected.${tail}`, sourceAgent);
    } else if (low.includes("ghl location")) {
      add(`Connect GHL Location${sfx}`, "integration", "urgent",
        `Launch blocker: GHL Location not connected.${tail}`, sourceAgent);
    } else if (low.includes("ghl sync") || (low.includes("sync") && low.includes("confirmed"))) {
      add(`Trigger fresh GHL sync${sfx}`, "data_cleanup", "medium",
        `Launch blocker: GHL sync has not been confirmed. Trigger an initial sync from the client profile → Integrations tab.${tail}`, sourceAgent);
    } else if (low.includes("approved creative") || low.includes("creative asset")) {
      add(`Upload and approve creative assets${sfx}`, "creative", "high",
        `Launch blocker: No approved creative assets on file.${tail}`, sourceAgent);
    } else if (low.includes("campaign draft")) {
      add(`Prepare approval-ready campaign draft${sfx}`, "campaign", "high",
        `Launch blocker: No approved campaign draft on file.${tail}`, sourceAgent);
    }
  }

  for (const bundle of bundles) {
    const { agentId, output } = bundle;

    if (agentId === "launch_readiness") {
      const lr = output as { blockingItems?: string[] };
      for (const item of lr.blockingItems ?? []) {
        mapLabel(item, agentId);
      }
    }

    if (agentId === "client_health") {
      const ch = output as { riskReasons?: string[] };
      for (const reason of ch.riskReasons ?? []) {
        // Strip scoring suffix like " (-8)" before routing
        mapLabel(reason.replace(/ \(-\d+\)$/, ""), agentId);
      }
    }

    if (agentId === "ghl_followup") {
      const ghl = output as { ghlStaleDays?: number | null; pipelineIssue?: string | null };
      if (typeof ghl.ghlStaleDays === "number" && ghl.ghlStaleDays > 3) {
        add(
          `Trigger fresh GHL sync${sfx}`,
          "data_cleanup", "medium",
          `Data cleanup: GHL sync is stale and should be refreshed from the client profile Integrations tab.${tail}`,
          agentId
        );
      }
    }

    if (agentId === "data_quality") {
      const dq = output as { requiredFixBeforeDecision?: string[]; conflictingData?: string[] };
      const allItems = [...(dq.requiredFixBeforeDecision ?? []), ...(dq.conflictingData ?? [])];
      for (const item of allItems) {
        const low = item.toLowerCase();
        if (low.includes("pipeline id") || (low.includes("pipeline") && low.includes("backfill"))) {
          add(`Backfill GHL Pipeline ID${sfx}`, "data_cleanup", "medium",
            `Configuration cleanup: GHL Pipeline ID needs to be backfilled.${tail}`,
            agentId);
        }
      }
    }
  }

  return suggestions;
}

export function buildSynthesisPrompt(
  message: string,
  routing: AgentRoutingResult,
  bundles: AgentOutputBundle[],
  ctx: VeronicaPortalContext
): string {
  const agentOutputsJson = JSON.stringify(
    bundles.map((b) => ({
      agent: AGENT_DISPLAY_NAMES[b.agentId],
      agentId: b.agentId,
      clientId: b.clientId,
      output: b.output,
    })),
    null,
    2
  );

  const clientNames = ctx.clients.map((c) => `${c.name} (${c.status}, ${c.market})`).join(", ");

  return `You are Veronica, Vault Co's internal AI Growth Operator. You are an approval-gated operator — you analyze, diagnose, draft recommendations, and prepare approval-ready outputs. You never activate campaigns, send messages, or make live external changes. All output requiring external action must be framed as requiring human approval.

## Operator Question
${message}

## Agent Routing
${routing.routingReason}

## Pre-Computed Agent Analysis
The following agents have analyzed the portal data. Use their output as your primary evidence. Do not contradict it. Synthesize and connect findings across agents.

${agentOutputsJson}

## Portal Context
Clients: ${clientNames}
Total: ${ctx.clients.length} clients | ${ctx.approvals.length} approvals pending | ${ctx.campaignDrafts.length} drafts | ${ctx.reports.length} reports

## Absolute Safety Rules
- Never publish, activate, pause, or modify any live campaign or ad
- Never change ad budgets, spend caps, or bid strategies
- Never send SMS, email, or push GHL workflows or sequences
- Never expose API keys, tokens, or credentials
- Never guarantee ROI, lead volume, or insurance outcomes
- All output is recommendations and approval-ready drafts — humans approve and act

## Vault Co Benchmarks
- CPL: under $75 roofing, under $150 remodeling
- Booking rate: 30%+ target | Show rate: 65%+ target
- Speed-to-lead: first contact within 5 minutes

## Response Format — CRITICAL
Respond ONLY with a valid JSON object. No text before or after. No markdown code fences.
{
  "reply": "Synthesized answer using agent outputs above. Reference specific agent findings by name. Plain text with newlines. Use - for bullets. Never fabricate data.",
  "dataSources": ["clients", "reports"],
  "relatedLinks": [{ "label": "View Client", "href": "/clients/id" }],
  "actionSuggested": { "label": "Next Action", "href": "/approvals" }
}
Rules:
- dataSources: only sources actually used — clients, reports, campaign_drafts, approvals, client_intelligence, creative_assets, integration_connections, ghl_opportunity_snapshots
- relatedLinks: max 3, directly relevant. Valid hrefs: /clients, /clients/[id], /campaigns, /approvals, /reports, /creatives, /analytics, /ai-agent. Never use /settings for integration navigation — use /clients/[id] instead.
- actionSuggested: omit if no clear next operator action
- reply: synthesize agent findings; do not dump raw JSON
- CRITICAL: Always use the exact client owner name from agent outputs (e.g. "Stanley Kaczmar", not a misspelling). Never paraphrase or alter proper names.
- CRITICAL: For integration navigation, always say "Open the client profile → Integrations tab" — never "Settings → Integrations" or "Review in settings".`;
}

// ─────────────────────────────────────────────────────────────
// Build a compact diagnostic summary for ALL clients (for system prompt)
// ─────────────────────────────────────────────────────────────

function buildAllDiagnosticSummary(ctx: VeronicaPortalContext): string {
  let summary = "";

  for (const client of ctx.clients) {
    const brain = buildClientBrain(client, ctx);
    const { launchReadiness: lr, performance: p, diagnostics } = brain;

    const { healthScore: hs, bottleneck: bn } = brain;
    summary += `\n### ${client.name} (${client.status})\n`;
    summary += `Health: ${hs.score}/100 [${hs.status.toUpperCase()}] | Bottleneck type: ${bn.type} | Status: ${lr.launchStatus}\n`;
    if (hs.topBlocker) summary += `Top blocker: ${hs.topBlocker}\n`;
    summary += `Launch readiness: ${lr.score}/${lr.maxScore}${lr.isReady ? " ✓ READY" : " — NOT READY"}\n`;
    if (lr.blockingItems.length > 0) summary += `Blocking items: ${lr.blockingItems.join(", ")}\n`;
    else if (lr.missing.length > 0) summary += `Missing (non-blocking): ${lr.missing.join(", ")}\n`;

    if (p.leads > 0 || client.status === "active") {
      const cplLabel =
        p.cplStatus === "ok"
          ? "OK"
          : p.cplStatus === "above_target"
          ? `ABOVE $${p.cplBenchmark} TARGET`
          : "no data";
      const bookingLabel =
        p.bookingStatus === "ok"
          ? "OK"
          : p.bookingStatus === "below_target"
          ? "BELOW 30% TARGET"
          : "—";
      const showLabel =
        p.showRateStatus === "ok"
          ? "OK"
          : p.showRateStatus === "below_target"
          ? "BELOW 65% TARGET"
          : "—";
      summary += `CPL: ${p.cpl} [${cplLabel}] | Booking: ${p.bookingRate > 0 ? p.bookingRate + "%" : "—"} [${bookingLabel}] | Show: ${p.showRate} [${showLabel}]\n`;
    }

    const criticals = diagnostics.filter((d) => d.severity === "critical");
    const warnings = diagnostics.filter((d) => d.severity === "warning");
    const infos = diagnostics.filter((d) => d.severity === "info");

    if (criticals.length > 0) {
      summary += `CRITICAL (${criticals.length}):\n`;
      criticals.forEach((d) => {
        summary += `  ⚠ ${d.signal}\n    → ${d.recommendation}\n    ✗ ${d.blocked}\n`;
      });
    }
    if (warnings.length > 0) {
      summary += `WARNINGS (${warnings.length}):\n`;
      warnings.forEach((d) => {
        summary += `  • ${d.signal}\n    → ${d.recommendation}\n`;
      });
    }
    if (infos.length > 0) {
      infos.forEach((d) => {
        summary += `  ℹ ${d.signal}\n`;
      });
    }
    if (diagnostics.length === 0) {
      summary += "  No active issues detected.\n";
    }
  }

  return summary;
}

// ─────────────────────────────────────────────────────────────
// System prompt builder
// ─────────────────────────────────────────────────────────────

export function buildVeronicaSystemPrompt(ctx: VeronicaPortalContext): string {
  const {
    clients,
    approvals,
    campaignDrafts,
    reports,
    clientIntelligence,
    creativeAssets,
    integrationConnections,
  } = ctx;

  const clientSummaries = clients.map((c) => ({
    id: c.id,
    name: c.name,
    owner: c.owner,
    status: c.status,
    market: c.market,
    services: c.services,
    monthlyBudget: c.monthlyBudget,
    avgJobValue: c.avgJobValue,
    offer: c.offer,
    stats: c.stats,
    metaAccountConnected: !!c.metaAccountId && !isValuePending(c.metaAccountId),
    pixelInstalled: !!c.pixelId && !isValuePending(c.pixelId),
    fbPageConnected: !!c.fbPageId && !isValuePending(c.fbPageId),
    ghlLocationConnected: !!c.ghlLocationId && !isValuePending(c.ghlLocationId),
    hasActiveMetaCampaigns: (c.campaigns ?? []).some((camp) => camp.status === "active"),
    notes: c.notes,
  }));

  const draftSummaries = campaignDrafts.slice(0, 30).map((d) => ({
    id: d.id,
    clientId: d.clientId,
    clientName: d.clientName,
    campaignName: d.campaignName,
    status: d.status,
    approvalStatus: d.approvalStatus,
    service: d.service,
    goal: d.goal,
    budget: d.budget,
    market: d.market,
    createdAt: d.createdAt,
  }));

  const reportSummaries = reports.slice(0, 20).map((r) => ({
    id: r.id,
    clientId: r.clientId,
    reportType: r.reportType,
    reportPeriod: r.reportPeriod,
    spend: r.spend,
    leads: r.leads,
    booked: r.booked,
    cpl: r.cpl,
    cpba: r.cpba,
    showRate: r.showRate,
    pipelineValue: r.pipelineValue,
    revenueGenerated: r.revenueGenerated,
    wins: r.wins,
    issues: r.issues,
    nextActions: r.nextActions,
    status: r.status,
  }));

  const approvalSummaries = approvals.slice(0, 20).map((a) => ({
    id: a.id,
    clientId: a.clientId,
    clientName: a.clientName,
    type: a.type,
    item: a.item,
    detail: a.detail,
    priority: a.priority,
    submittedBy: a.submittedBy,
    submittedAt: a.submittedAt,
  }));

  let prompt = `You are Veronica, Vault Co's internal AI Growth Operator. You are a read-only analyst and advisor for the operator team. You study live portal data and provide specific, actionable insights.

## Your Role
- Answer operator questions about clients, campaigns, performance, approvals, and creative assets
- Summarize client status and what is missing before they are launch-ready
- Identify pending approvals and what needs immediate attention
- Analyze Meta and GHL performance using synced stats and reports
- Recommend next actions (recommendations only — human must approve all changes)
- Help prepare campaign or report drafts (never publish live)
- Always cite real data from the portal context — operators need to trust your answers

## Absolute Safety Rules — Never Violate
- Never publish, activate, pause, or modify any live campaign or ad
- Never change ad budgets, spend caps, or bid strategies
- Never send SMS, email, or push GHL workflows or sequences
- Never expose API keys, tokens, service role keys, or credentials of any kind
- Never guarantee ROI, lead volume, or insurance outcomes
- Never use "cheapest", "guaranteed insurance coverage", or discriminatory targeting language
- All output is recommendations and drafts only — human approval required for everything

## Portal Data — Live State

### Clients (${clients.length} total)
${JSON.stringify(clientSummaries, null, 2)}

### Approval Queue (${approvals.length} items)
${JSON.stringify(approvalSummaries, null, 2)}

### Campaign Drafts (${campaignDrafts.length} total)
${JSON.stringify(draftSummaries, null, 2)}

### Reports (${reports.length} total)
${JSON.stringify(reportSummaries, null, 2)}`;

  if (clientIntelligence) {
    const intel = {
      clientId: clientIntelligence.clientId,
      extractedAt: clientIntelligence.extractedAt,
      companyProfile: clientIntelligence.companyProfile,
      serviceArea: clientIntelligence.serviceArea,
      targetMarket: clientIntelligence.targetMarket,
      buyerProfile: clientIntelligence.buyerProfile,
      offerIntelligence: clientIntelligence.offerIntelligence,
      salesIntelligence: clientIntelligence.salesIntelligence,
      kpiBaseline: clientIntelligence.kpiBaseline,
      campaignImplications: clientIntelligence.campaignImplications,
    };
    prompt += `\n\n### Client Intelligence (targeted client)\n${JSON.stringify(intel, null, 2)}`;
  }

  if (creativeAssets && creativeAssets.length > 0) {
    const assetSummary = creativeAssets.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      assetType: a.assetType,
      fileType: a.fileType,
      status: a.status,
      approvedForAds: a.approvedForAds,
      service: a.service,
      market: a.market,
      tags: a.tags,
      uploadDate: a.uploadDate,
    }));
    prompt += `\n\n### Creative Assets (${creativeAssets.length} for targeted client)\n${JSON.stringify(assetSummary, null, 2)}`;
  }

  if (integrationConnections && integrationConnections.length > 0) {
    prompt += `\n\n### Integration Connections (Meta & GHL sync status)\n${JSON.stringify(integrationConnections, null, 2)}`;
  }

  // Pre-computed diagnostics for all clients
  const diagnosticSummary = buildAllDiagnosticSummary(ctx);
  prompt += `\n\n## Pre-Computed Client Diagnostics\n\nThese findings have been computed automatically from the portal data. Use them as your starting point when diagnosing client situations.\n${diagnosticSummary}`;

  prompt += `

## Vault Co Performance Benchmarks
- Target CPL: under $75 for roofing, under $150 for remodeling
- Target booking rate: 30%+ (leads booked for consultation)
- Target show rate: 65%+ (booked who actually showed)
- CPL above 2x target = underperforming campaign
- Booking rate below 25% = GHL follow-up or setter gap
- Show rate below 50% = setter quality or scheduling problem
- Speed-to-lead: first contact within 5 minutes = critical for booking conversion
- Avg job value: roofing $10k–$25k | remodeling $20k–$50k

## Client Launch-Ready Checklist
1. Meta Ad Account ID connected (not "Pending")
2. Facebook Page ID set (not "Pending")
3. Meta Pixel installed and verified (not "Pending")
4. GHL Location ID connected (not "Pending")
5. At least one approved creative asset
6. Client intelligence extracted
7. Campaign draft approved (ready_for_meta or approved status)

## Bottleneck Classification — Use These Types in Every Diagnosis
Every client bottleneck must be classified as one of these five types. The pre-computed diagnostics include a bottleneck type per client — use it.

- **setup**: Missing Meta, GHL, pixel, no approved creatives, no intelligence — client cannot launch
- **ad**: High CPL, low leads despite active campaigns, stale creative, ad fatigue
- **followup**: Good lead volume but low booked appointments, GHL connected but 0 bookings, speed-to-lead failure
- **sales_show**: Booked appointments but show rate below 65% — post-booking conversion problem
- **reporting_data**: Stale/missing reports, conflicting data between integration_connections and client profile
- **none**: No significant bottleneck detected

For every bottleneck, explain:
1. What the bottleneck type is and why
2. What data proves it (specific numbers)
3. What it likely means (root cause)
4. What Vault Co should do next (one safe action)
5. What NOT to do yet

When a conflict is detected (signal starts with "This is a data mismatch"), say so explicitly before diagnosing performance.

## Weekly Priority Grouping
When asked about this week's priorities, group work into these four buckets:

**Critical today** — actively losing money or blocking live spend
- Active clients with zero bookings despite leads
- Active clients with CPL above 2x benchmark
- Active clients with show rate below 50%
- High-priority approvals blocking launch

**This week** — important but not immediately burning
- Pending campaign draft approvals
- Active clients with no reports
- Clients with launchStatus=blocked (missing credentials/creative)
- Active clients with booking rate below 30%

**Monitor** — watch but no immediate action needed
- Warning-level diagnostics
- Creative fatigue (30+ days old, still running)
- Missing intelligence for non-active clients
- GHL pipeline or sync warnings

**Can wait** — low urgency
- Info-level items
- Non-active client onboarding advancement
- Optimization opportunities with no current waste

## Reasoning Format for Strategy and Performance Questions
When answering strategy, bottleneck, performance, or "what should we do" questions, structure your reply like this:

1. Direct answer — one sentence
2. What the data shows — specific numbers from the portal
3. What it likely means — cause diagnosis using the bottleneck types above
4. Recommended next action — one specific, safe, actionable step
5. What NOT to do — what would be unsafe or premature
6. Data confidence: high / medium / low — be explicit
7. Data sources used — list only sources actually consulted

For simple factual questions, keep it short. The full format is for strategy, diagnosis, and "what should we do" questions only.

## What Veronica Can Recommend (Safe Actions)
- Generate campaign draft (for human approval)
- Generate report draft (for human approval)
- Review approvals queue
- Upload creative assets to Creative Library
- Sync Meta or GHL credentials — open the client profile → Integrations tab
- Complete client setup and onboarding
- Audit GHL follow-up speed (recommendation only)
- Install or verify Meta Pixel (recommendation only)

## What Veronica Cannot Recommend
- Publish, activate, pause, or modify live campaigns
- Change ad budgets or bid strategies
- Send SMS or email to any contact
- Push or activate GHL workflows
- Modify live Meta accounts or audiences
- Guarantee specific outcomes

## Response Format — CRITICAL
Respond ONLY with a valid JSON object. No text before or after the JSON. No markdown code fences. Use this exact shape:
{
  "reply": "Your answer using the reasoning format above for strategy questions. Use plain text with newlines. Use - for bullets. Reference real client names and real numbers. Never fabricate data.",
  "dataSources": ["clients", "reports"],
  "relatedLinks": [
    { "label": "View Kaczmar Builders", "href": "/clients/kaczmar-builders" }
  ],
  "actionSuggested": {
    "label": "Build Campaign for Kaczmar",
    "href": "/ai-agent"
  }
}

Rules:
- dataSources: only sources actually used. Options: clients, reports, campaign_drafts, approvals, client_intelligence, creative_assets, integration_connections
- relatedLinks: max 3, directly relevant only. Valid hrefs: /clients, /clients/[id], /campaigns, /approvals, /reports, /creatives, /analytics, /ai-agent. Never use /settings for integration navigation — use /clients/[id] instead.
- actionSuggested: omit entirely (do not include the key) if there is no clear next operator action
- reply: must reference real data from the portal context. Never fabricate metrics or client details
- CRITICAL: Always use the exact owner name from the clients data above. Never misspell or paraphrase owner names. The correct name for Kaczmar Builders is "Stanley Kaczmar" — use it exactly as written. If you are drafting a client message, copy the owner name character-for-character from the portal data.
- CRITICAL: For integration navigation, always say "open the client profile → Integrations tab" — never "Settings → Integrations" or "Review in settings".`;

  return prompt;
}

// ─────────────────────────────────────────────────────────────
// Data-aware mock fallback — works without an API key
// Uses client brain + diagnostic rules for structured responses
// ─────────────────────────────────────────────────────────────

function formatReasoningReply(
  directAnswer: string,
  dataShows: string,
  likelyMeans: string,
  recommendedAction: string,
  notToDo?: string,
  dataConfidence?: "high" | "medium" | "low",
  dataSources?: string[]
): string {
  let reply = `${directAnswer}\n\n`;
  reply += `What the data shows:\n${dataShows}\n\n`;
  reply += `What it likely means:\n${likelyMeans}\n\n`;
  reply += `Recommended next action:\n${recommendedAction}`;
  if (notToDo) reply += `\n\nDo not:\n${notToDo}`;
  if (dataConfidence) reply += `\n\nData confidence: ${dataConfidence.toUpperCase()}`;
  if (dataSources && dataSources.length > 0) reply += `\nData sources: ${dataSources.join(", ")}`;
  return reply;
}

export function mockVeronicaResponse(
  message: string,
  ctx: VeronicaPortalContext
): VeronicaConsoleResponse {
  const routing = routeToAgents(message, ctx.clients);
  const bundles = runSelectedAgents(routing, ctx);
  const gating = assembleApprovalGating(bundles);
  const dataConfidence = aggregateDataConfidence(bundles);
  const agentsUsed = bundles.map((b) => b.agentId);

  const base = _mockVeronicaBaseResponse(message, ctx);

  return {
    ...base,
    agentsUsed,
    approvalRequired: gating.approvalRequired,
    suggestedApprovalDestination: gating.suggestedApprovalDestination,
    whatVeronicaCanDoNow: gating.whatVeronicaCanDoNow,
    whatRequiresHumanApproval: gating.whatRequiresHumanApproval,
    whatIsBlocked: gating.whatIsBlocked,
    dataConfidence,
  };
}

function _mockVeronicaBaseResponse(
  message: string,
  ctx: VeronicaPortalContext
): VeronicaConsoleResponse {
  const msg = message.toLowerCase();
  const { clients, approvals, campaignDrafts, reports, creativeAssets } = ctx;

  // ── Client detection (fuzzy — catches typos like "Kazcmar" → "Kaczmar") ──
  const mentionedClient = clients.find((c) => clientMatchesMessage(c, msg));

  // ── Intent detection ──
  const isApprovals =
    msg.includes("approv") || msg.includes("pending") || msg.includes("review queue");
  const isCreatives =
    msg.includes("creative") || msg.includes("asset") || msg.includes("approved for ads");
  const isPerformance =
    msg.includes("cpl") ||
    msg.includes("performance") ||
    msg.includes("booking") ||
    msg.includes("show rate") ||
    msg.includes("meta") ||
    msg.includes("ghl") ||
    msg.includes("analytics") ||
    msg.includes("leads");
  const isNextActions =
    msg.includes("next action") ||
    msg.includes("recommend") ||
    msg.includes("what should") ||
    msg.includes("what to do") ||
    msg.includes("priority");
  const isReport = msg.includes("report");
  const isCampaign =
    (msg.includes("campaign") || msg.includes("draft") || msg.includes("generate")) && !isReport;
  const isMissing =
    msg.includes("missing") ||
    msg.includes("ready") ||
    msg.includes("complete") ||
    msg.includes("setup");
  const isBottleneck =
    msg.includes("bottleneck") ||
    msg.includes("barrier") ||
    msg.includes("block") ||
    msg.includes("problem") ||
    msg.includes("issue") ||
    msg.includes("fix");
  const isScaling =
    msg.includes("scale") ||
    msg.includes("increase") ||
    msg.includes("ad spend") ||
    (msg.includes("budget") && !msg.includes("campaign"));
  const isContactsNoBookings =
    (msg.includes("contact") || msg.includes("lead")) &&
    (msg.includes("no book") ||
      msg.includes("not book") ||
      msg.includes("no appoint") ||
      msg.includes("not appoint") ||
      msg.includes("not convert"));
  const isNotLaunchReady =
    msg.includes("not launch") ||
    msg.includes("launch-ready") ||
    (msg.includes("which client") && (msg.includes("ready") || msg.includes("launch"))) ||
    (msg.includes("not ready") && !mentionedClient);
  const isThisWeek =
    (msg.includes("this week") || msg.includes("next week") || msg.includes("today")) &&
    (msg.includes("do") || msg.includes("focus") || msg.includes("priorit") || msg.includes("what should"));
  const isAtRisk =
    msg.includes("at risk") ||
    (msg.includes("which client") && msg.includes("risk")) ||
    msg.includes("risk this week");
  const isFocusFirst =
    msg.includes("focus on first") ||
    msg.includes("focus first") ||
    msg.includes("highest priority client") ||
    (msg.includes("which client") && (msg.includes("first") || msg.includes("should we focus")));
  const isFollowupIssue =
    (msg.includes("follow-up") || msg.includes("follow up") || msg.includes("followup")) &&
    (msg.includes("bottleneck") || msg.includes("issue") || msg.includes("problem") ||
      msg.includes("which client"));
  const isMissingReports =
    msg.includes("missing report") ||
    msg.includes("no report") ||
    (msg.includes("which client") && msg.includes("report") && !msg.includes("generate"));

  // ────────────────────────────────────────────────────────────
  // Handler: Ad spend / scaling decision
  // ────────────────────────────────────────────────────────────
  if (isScaling) {
    const activeClients = clients.filter((c) => c.status === "active");
    const readyToScale = activeClients.filter((c) => {
      const brain = buildClientBrain(c, ctx);
      const p = brain.performance;
      return (
        p.cplStatus === "ok" &&
        p.bookingStatus === "ok" &&
        p.showRateStatus === "ok" &&
        brain.launchReadiness.isReady
      );
    });
    const notReadyToScale = activeClients.filter(
      (c) => !readyToScale.find((r) => r.id === c.id)
    );

    let dataShows = "";
    activeClients.forEach((c) => {
      const p = buildClientBrain(c, ctx).performance;
      dataShows += `- ${c.name}: CPL ${p.cpl} [${p.cplStatus === "ok" ? "OK" : "ABOVE TARGET"}], Booking ${p.bookingRate}% [${p.bookingStatus === "ok" ? "OK" : "BELOW TARGET"}], Show ${p.showRate} [${p.showRateStatus === "ok" ? "OK" : "BELOW TARGET"}]\n`;
    });

    const directAnswer =
      readyToScale.length > 0
        ? `${readyToScale.map((c) => c.name).join(", ")} ${readyToScale.length === 1 ? "shows" : "show"} metrics that support scaling. Other active clients have issues to fix first.`
        : "None of the active clients currently show the metrics required to justify increasing ad spend.";

    const likelyMeans =
      notReadyToScale.length > 0
        ? `Increasing budget on ${notReadyToScale.map((c) => c.name).join(", ")} would scale the problem, not the results. Fix conversion first, then scale spend.`
        : "The fundamentals are in place. Scaling spend should produce proportional lead increases.";

    const recommendedAction =
      readyToScale.length > 0
        ? `Generate a budget increase recommendation for ${readyToScale[0].name} and submit for human approval. Do not activate any budget change directly.`
        : `Fix the conversion issues on ${notReadyToScale.slice(0, 2).map((c) => c.name).join(" and ")} before increasing spend. Start with GHL follow-up speed audit.`;

    return {
      reply: formatReasoningReply(
        directAnswer,
        dataShows.trim() || "No active client performance data available.",
        likelyMeans,
        recommendedAction,
        "Do not increase budgets directly. All budget changes require human approval. Do not scale while booking rate or show rate is below target."
      ),
      dataSources: ["clients", "reports"],
      relatedLinks: [
        { label: "Analytics Dashboard", href: "/analytics" },
        { label: "Campaign Builder", href: "/ai-agent" },
      ],
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Which clients are at risk
  // ────────────────────────────────────────────────────────────
  if (isAtRisk && !mentionedClient) {
    const allBrains = clients.map((c) => buildClientBrain(c, ctx));
    const atRisk = allBrains.filter(
      (b) => b.healthScore.status === "at_risk" || b.healthScore.status === "blocked"
    );
    const watching = allBrains.filter((b) => b.healthScore.status === "watch");
    const healthy = allBrains.filter((b) => b.healthScore.status === "healthy");

    let reply = "Client Risk Assessment\n\n";

    if (atRisk.length > 0) {
      reply += `At Risk / Blocked (${atRisk.length}):\n`;
      atRisk.forEach((b) => {
        reply += `- ${b.profile.name} — Health: ${b.healthScore.score}/100 [${b.healthScore.status.toUpperCase()}] | Bottleneck: ${b.bottleneck.label}\n`;
        if (b.healthScore.topBlocker) reply += `  Top blocker: ${b.healthScore.topBlocker}\n`;
        reply += `  Next action: ${b.bottleneck.type !== "none" ? b.bottleneck.nextAction : b.healthScore.nextBestAction}\n`;
      });
      reply += "\n";
    }
    if (watching.length > 0) {
      reply += `Watch (${watching.length}):\n`;
      watching.forEach((b) => {
        reply += `- ${b.profile.name} — Health: ${b.healthScore.score}/100 | Bottleneck: ${b.bottleneck.label}\n`;
        if (b.healthScore.riskReasons.length > 0)
          reply += `  Risks: ${b.healthScore.riskReasons.slice(0, 2).join("; ")}\n`;
      });
      reply += "\n";
    }
    if (healthy.length > 0) {
      reply += `Healthy (${healthy.length}): ${healthy.map((b) => b.profile.name).join(", ")}\n`;
    }
    if (atRisk.length === 0 && watching.length === 0) {
      reply += "No clients are currently at risk. All clients show healthy or watch-level health scores.";
    }

    return {
      reply,
      dataSources: ["clients", "campaign_drafts", "reports", "creative_assets", "client_intelligence"],
      relatedLinks: [
        { label: "All Clients", href: "/clients" },
        { label: "Approvals Queue", href: "/approvals" },
      ],
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Which client should we focus on first
  // ────────────────────────────────────────────────────────────
  if (isFocusFirst && !mentionedClient) {
    const allBrains = clients.map((c) => buildClientBrain(c, ctx));
    // Sort by health score ascending (lowest = most urgent)
    const ranked = [...allBrains].sort((a, b) => a.healthScore.score - b.healthScore.score);
    const top = ranked[0];

    if (!top) {
      return {
        reply: "No client data available to rank priorities.",
        dataSources: ["clients"],
        mockMode: true,
        provider: "mock",
      };
    }

    let reply = formatReasoningReply(
      `Focus on ${top.profile.name} first — Health: ${top.healthScore.score}/100 [${top.healthScore.status.toUpperCase()}], Bottleneck: ${top.bottleneck.label}.`,
      `${top.profile.name} health breakdown:\n${top.healthScore.riskReasons.slice(0, 4).map((r) => `- ${r}`).join("\n") || "- No risk reasons recorded"}\n\nOther clients by priority:\n${ranked
        .slice(1, 4)
        .map((b) => `- ${b.profile.name}: ${b.healthScore.score}/100 [${b.healthScore.status}] | ${b.bottleneck.label}`)
        .join("\n")}`,
      top.bottleneck.likelyMeaning,
      top.healthScore.nextBestAction,
      top.bottleneck.notToDo,
      top.bottleneck.dataConfidence,
      ["clients", "campaign_drafts", "reports", "creative_assets"]
    );

    return {
      reply,
      dataSources: ["clients", "campaign_drafts", "reports", "creative_assets", "client_intelligence"],
      relatedLinks: [
        { label: `View ${top.profile.name}`, href: `/clients/${top.profile.id}` },
        { label: "All Clients", href: "/clients" },
      ],
      actionSuggested: top.launchReadiness.missing.includes("Campaign draft approved or ready")
        ? { label: `Build Campaign for ${top.profile.name}`, href: "/ai-agent" }
        : undefined,
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Which clients have follow-up bottlenecks
  // ────────────────────────────────────────────────────────────
  if (isFollowupIssue && !mentionedClient) {
    const allBrains = clients.map((c) => buildClientBrain(c, ctx));
    const followupClients = allBrains.filter((b) => b.bottleneck.type === "followup");
    const noBookingClients = allBrains.filter(
      (b) => b.performance.leads > 0 && b.performance.booked === 0 && b.bottleneck.type !== "followup"
    );

    let reply = "Follow-Up Bottleneck Analysis\n\n";
    if (followupClients.length > 0) {
      reply += `Clients with confirmed follow-up bottleneck (${followupClients.length}):\n\n`;
      followupClients.forEach((b) => {
        reply += `${b.profile.name}\n`;
        reply += `- ${b.bottleneck.proofData}\n`;
        reply += `- Likely cause: ${b.bottleneck.likelyMeaning}\n`;
        reply += `- Next action: ${b.bottleneck.nextAction}\n`;
        reply += `- Do not: ${b.bottleneck.notToDo}\n\n`;
      });
    }
    if (noBookingClients.length > 0) {
      reply += `Also flagged — leads but zero bookings (may be setup or data issue):\n`;
      noBookingClients.forEach((b) => {
        reply += `- ${b.profile.name}: ${b.performance.leads} leads, 0 booked | Bottleneck type: ${b.bottleneck.type}\n`;
      });
      reply += "\n";
    }
    if (followupClients.length === 0 && noBookingClients.length === 0) {
      reply += "No clients currently show follow-up bottleneck signals. All clients with leads have positive booking activity.";
    }

    return {
      reply,
      dataSources: ["clients", "integration_connections", "reports"],
      relatedLinks: [
        { label: "Client Profiles → Integrations", href: "/clients" },
        { label: "Analytics Dashboard", href: "/analytics" },
      ],
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Which clients are missing reports
  // ────────────────────────────────────────────────────────────
  if (isMissingReports && !mentionedClient) {
    const activeClients = clients.filter((c) => c.status === "active");
    const missingReports = activeClients.filter(
      (c) => !reports.some((r) => r.clientId === c.id)
    );
    const hasReports = activeClients.filter((c) =>
      reports.some((r) => r.clientId === c.id)
    );

    let reply = "Report Coverage — Active Clients\n\n";
    if (missingReports.length > 0) {
      reply += `Missing reports (${missingReports.length} active clients):\n`;
      missingReports.forEach((c) => {
        const brain = buildClientBrain(c, ctx);
        reply += `- ${c.name} (${c.market}) | Health: ${brain.healthScore.score}/100 | Leads: ${c.stats.leads} | CPL: ${c.stats.cpl}\n`;
      });
      reply += `\nRecommendation: Generate a weekly report draft for each of these clients. Active clients should receive weekly reporting.\n`;
    }
    if (hasReports.length > 0) {
      const withReports = hasReports.map((c) => {
        const r = reports.filter((r) => r.clientId === c.id).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        return `- ${c.name}: last report ${r?.reportPeriod ?? "unknown period"}`;
      });
      reply += `\nReports on file (${hasReports.length}):\n${withReports.join("\n")}`;
    }
    if (activeClients.length === 0) {
      reply += "No active clients found.";
    }

    return {
      reply,
      dataSources: ["clients", "reports"],
      relatedLinks: [
        { label: "Reports", href: "/reports" },
        { label: "All Clients", href: "/clients" },
      ],
      actionSuggested: missingReports.length > 0
        ? { label: "Generate Report Draft", href: "/reports" }
        : undefined,
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Contacts exist but no bookings
  // ────────────────────────────────────────────────────────────
  if (isContactsNoBookings) {
    const affected = clients.filter(
      (c) => c.stats.leads > 0 && c.stats.booked === 0
    );
    const low = clients.filter(
      (c) => c.stats.leads > 0 && c.stats.booked > 0 && buildClientBrain(c, ctx).performance.bookingStatus === "below_target"
    );

    let dataShows = "";
    if (affected.length > 0) {
      dataShows += `Clients with leads but zero bookings:\n`;
      affected.forEach((c) => {
        dataShows += `- ${c.name}: ${c.stats.leads} leads, 0 booked, GHL: ${!isValuePending(c.ghlLocationId) && c.ghlLocationId ? "connected" : "NOT connected"}\n`;
      });
    }
    if (low.length > 0) {
      dataShows += `\nClients with below-target booking rate:\n`;
      low.forEach((c) => {
        const p = buildClientBrain(c, ctx).performance;
        dataShows += `- ${c.name}: ${p.leads} leads, ${p.booked} booked (${p.bookingRate}% — below 30% target)\n`;
      });
    }
    if (!dataShows) {
      dataShows = "All clients show positive booking activity. No zero-booking clients detected.";
    }

    const directAnswer =
      affected.length > 0
        ? `${affected.map((c) => c.name).join(" and ")} ${affected.length === 1 ? "has" : "have"} leads but no booked appointments. This is a speed-to-lead or follow-up failure, not an ad performance issue.`
        : low.length > 0
        ? `${low.map((c) => c.name).join(" and ")} ${low.length === 1 ? "has" : "have"} a below-target booking rate. The ads are working — the follow-up is the bottleneck.`
        : "No severe booking conversion issues detected across active clients.";

    return {
      reply: formatReasoningReply(
        directAnswer,
        dataShows.trim(),
        "When leads exist but bookings do not, the issue is almost always follow-up speed (speed-to-lead), not lead quality. The first company to make contact wins the appointment. In home services, every minute of delay after form submission reduces booking probability significantly.",
        "Audit the GHL workflow for each affected client. Verify: (1) Immediate SMS fires within 60 seconds, (2) Setter task created within 1 minute, (3) First call placed within 5 minutes, (4) AI voice triggers at 10 minutes if no call logged.",
        "Do not change ad targeting or pause campaigns. Do not increase ad spend while this issue exists."
      ),
      dataSources: ["clients", "integration_connections"],
      relatedLinks: [
        { label: "Client Profiles → Integrations", href: "/clients" },
        { label: "Analytics Dashboard", href: "/analytics" },
      ],
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Which clients are not launch-ready
  // ────────────────────────────────────────────────────────────
  if (isNotLaunchReady && !mentionedClient) {
    let reply = "Launch Readiness — All Clients\n\n";
    const allBrains = clients.map((c) => buildClientBrain(c, ctx));
    const notReady = allBrains.filter((b) => !b.launchReadiness.isReady);
    const ready = allBrains.filter((b) => b.launchReadiness.isReady);

    if (notReady.length > 0) {
      reply += `Not Ready (${notReady.length}):\n\n`;
      notReady.forEach((b) => {
        const lr = b.launchReadiness;
        reply += `${b.profile.name} — ${lr.score}/${lr.maxScore} (${b.profile.status})\n`;
        lr.missing.forEach((m) => (reply += `  ✗ ${m}\n`));
        reply += "\n";
      });
    }

    if (ready.length > 0) {
      reply += `Ready to Launch (${ready.length}):\n`;
      ready.forEach((b) => {
        reply += `  ✓ ${b.profile.name} — ${b.launchReadiness.score}/${b.launchReadiness.maxScore}\n`;
      });
    }

    const relatedLinks: VeronicaRelatedLink[] = [
      { label: "Client Profiles → Integrations", href: "/clients" },
      { label: "Creative Library", href: "/creatives" },
    ];
    if (notReady.some((b) => b.launchReadiness.missing.includes("Campaign draft approved or ready"))) {
      relatedLinks.push({ label: "Campaign Builder", href: "/ai-agent" });
    }

    return {
      reply,
      dataSources: ["clients", "campaign_drafts", "creative_assets", "client_intelligence"],
      relatedLinks,
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: This week priorities — 4 groups
  // ────────────────────────────────────────────────────────────
  if (isThisWeek) {
    const allBrains = clients.map((c) => buildClientBrain(c, ctx));
    const allDiagnostics = allBrains.flatMap((b) => b.diagnostics);
    const pendingDrafts = campaignDrafts.filter(
      (d) => d.status === "needs_review" || d.approvalStatus === "needs_review"
    );
    const activeNoReports = clients
      .filter((c) => c.status === "active")
      .filter((c) => !reports.some((r) => r.clientId === c.id));

    // ── Critical today ──
    const criticalTodayItems: string[] = [];
    // Active clients with zero bookings despite leads
    allBrains.forEach((b) => {
      if (b.profile.status === "active" && b.performance.leads > 0 && b.performance.booked === 0)
        criticalTodayItems.push(
          `⚠ ${b.profile.name}: ${b.performance.leads} leads, 0 booked — speed-to-lead or GHL failure`
        );
    });
    // Active clients with CPL above 2x benchmark
    allBrains.forEach((b) => {
      const cplNum = parseFloat(b.performance.cpl.replace(/[^0-9.]/g, "")) || 0;
      if (b.profile.status === "active" && b.performance.cplStatus === "above_target" && cplNum > b.performance.cplBenchmark * 2)
        criticalTodayItems.push(
          `⚠ ${b.profile.name}: CPL ${b.performance.cpl} — above 2x $${b.performance.cplBenchmark} threshold`
        );
    });
    // Active clients with show rate < 50%
    allBrains.forEach((b) => {
      const showNum = parseFloat(b.performance.showRate.replace(/[^0-9.]/g, "")) || 0;
      if (b.profile.status === "active" && showNum > 0 && showNum < 50)
        criticalTodayItems.push(
          `⚠ ${b.profile.name}: Show rate ${b.performance.showRate} — below 50% critical threshold`
        );
    });
    // High-priority approvals
    const highPriorityApprovals = approvals.filter((a) => a.priority === "high");
    if (highPriorityApprovals.length > 0)
      criticalTodayItems.push(
        `⚠ ${highPriorityApprovals.length} high-priority approval(s) pending: ${highPriorityApprovals
          .slice(0, 2)
          .map((a) => `${a.item} (${a.clientName})`)
          .join(", ")}`
      );

    // ── This week ──
    const thisWeekItems: string[] = [];
    if (pendingDrafts.length > 0)
      thisWeekItems.push(
        `Review ${pendingDrafts.length} campaign draft(s): ${pendingDrafts
          .slice(0, 2)
          .map((d) => `${d.campaignName} (${d.clientName || d.clientId})`)
          .join(", ")}`
      );
    if (activeNoReports.length > 0)
      thisWeekItems.push(
        `Generate weekly reports for: ${activeNoReports.map((c) => c.name).join(", ")}`
      );
    allBrains.forEach((b) => {
      if (b.launchReadiness.launchStatus === "blocked" && b.profile.status !== "active")
        thisWeekItems.push(
          `${b.profile.name}: Launch blocked — missing ${b.launchReadiness.blockingItems.slice(0, 2).join(", ")}`
        );
    });
    allBrains.forEach((b) => {
      if (
        b.profile.status === "active" &&
        b.performance.bookingStatus === "below_target" &&
        b.performance.bookingRate >= 15 &&
        b.performance.booked > 0
      )
        thisWeekItems.push(
          `${b.profile.name}: Booking rate ${b.performance.bookingRate}% — below 30% target, audit GHL follow-up speed`
        );
    });

    // ── Monitor ──
    const monitorItems: string[] = [];
    const uniqueWarnings = allDiagnostics
      .filter((d) => d.severity === "warning")
      .filter((d, i, arr) => arr.findIndex((x) => x.signal === d.signal) === i)
      .slice(0, 4);
    uniqueWarnings.forEach((d) =>
      monitorItems.push(`${d.clientName}: ${d.signal}`)
    );
    allBrains.forEach((b) => {
      if (!b.intelligence && b.profile.status !== "active")
        monitorItems.push(`${b.profile.name}: Client intelligence not extracted`);
    });

    // ── Can wait ──
    const canWaitItems: string[] = [];
    allDiagnostics
      .filter((d) => d.severity === "info")
      .filter((d, i, arr) => arr.findIndex((x) => x.signal === d.signal) === i)
      .slice(0, 3)
      .forEach((d) => canWaitItems.push(`${d.clientName}: ${d.signal}`));
    allBrains.forEach((b) => {
      if (
        b.launchReadiness.launchStatus === "almost_ready" &&
        b.profile.status !== "active"
      )
        canWaitItems.push(
          `${b.profile.name}: Almost launch-ready — missing ${b.launchReadiness.missing.slice(0, 2).join(", ")}`
        );
    });

    let reply = "Vault Co — This Week's Priorities\n\n";

    if (criticalTodayItems.length > 0) {
      reply += "CRITICAL TODAY\n";
      criticalTodayItems.forEach((item) => (reply += `- ${item}\n`));
      reply += "\n";
    }
    if (thisWeekItems.length > 0) {
      reply += "THIS WEEK\n";
      thisWeekItems.forEach((item) => (reply += `- ${item}\n`));
      reply += "\n";
    }
    if (monitorItems.length > 0) {
      reply += "MONITOR\n";
      monitorItems.forEach((item) => (reply += `- ${item}\n`));
      reply += "\n";
    }
    if (canWaitItems.length > 0) {
      reply += "CAN WAIT\n";
      canWaitItems.forEach((item) => (reply += `- ${item}\n`));
    }
    if (
      criticalTodayItems.length === 0 &&
      thisWeekItems.length === 0 &&
      monitorItems.length === 0
    ) {
      reply += "No urgent actions this week. All clients are in good standing.";
    }

    return {
      reply,
      dataSources: ["clients", "campaign_drafts", "approvals", "reports"],
      relatedLinks: [
        { label: "Approvals Queue", href: "/approvals" },
        { label: "Reports", href: "/reports" },
        { label: "All Clients", href: "/clients" },
      ],
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Approvals queue
  // ────────────────────────────────────────────────────────────
  if (isApprovals) {
    const pendingDrafts = campaignDrafts.filter(
      (d) => d.status === "needs_review" || d.approvalStatus === "needs_review"
    );
    let reply = "Pending Approvals\n\n";
    if (pendingDrafts.length > 0) {
      reply += `Campaign Drafts Awaiting Review (${pendingDrafts.length}):\n`;
      pendingDrafts.forEach((d) => {
        reply += `- ${d.campaignName} | ${d.clientName || d.clientId} | ${d.service}, ${d.market} | Status: ${d.status}\n`;
      });
      reply += "\n";
    }
    if (approvals.length > 0) {
      reply += `Approval Queue (${approvals.length} items):\n`;
      approvals.slice(0, 8).forEach((a) => {
        reply += `- ${a.item} | ${a.clientName} | ${a.type} | Priority: ${a.priority} | By: ${a.submittedBy}\n`;
      });
    }
    if (pendingDrafts.length === 0 && approvals.length === 0) {
      reply += "No pending items found. The approval queue is clear.";
    }
    return {
      reply,
      dataSources: ["approvals", "campaign_drafts"],
      relatedLinks: [{ label: "Open Approvals Queue", href: "/approvals" }],
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Creatives
  // ────────────────────────────────────────────────────────────
  if (isCreatives && !mentionedClient) {
    const assets = creativeAssets ?? [];
    const approved = assets.filter((a) => a.approvedForAds);
    const needsReview = assets.filter((a) => a.status === "Needs Review");
    let reply = "Creative Asset Status\n\n";
    reply += `Approved for Meta Ads (${approved.length}):\n`;
    if (approved.length > 0) {
      approved
        .slice(0, 8)
        .forEach(
          (a) =>
            (reply += `- ${a.fileName} | ${a.assetType} | ${a.clientName} | ${a.service || "General"} | ${a.fileType}\n`)
        );
    } else {
      reply += "- None currently approved for Meta ads\n";
    }
    reply += `\nNeeds Review (${needsReview.length}):\n`;
    if (needsReview.length > 0) {
      needsReview
        .slice(0, 5)
        .forEach(
          (a) =>
            (reply += `- ${a.fileName} | ${a.assetType} | ${a.clientName} | uploaded ${a.uploadDate}\n`)
        );
    } else {
      reply += "- None currently pending review\n";
    }
    reply +=
      "\nNote: Creative assets must be approved before use in a Meta campaign submission.";
    return {
      reply,
      dataSources: ["creative_assets"],
      relatedLinks: [{ label: "Creative Library", href: "/creatives" }],
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Performance overview (no specific client)
  // ────────────────────────────────────────────────────────────
  if (isPerformance && !mentionedClient) {
    const activeClients = clients.filter((c) => c.status === "active");
    let reply = "Meta & GHL Performance Summary\n\n";
    if (activeClients.length > 0) {
      reply += `Active Clients (${activeClients.length}):\n\n`;
      activeClients.forEach((c) => {
        const p = buildClientBrain(c, ctx).performance;
        const cplFlag = p.cplStatus === "ok" ? "OK" : p.cplStatus === "above_target" ? "ABOVE TARGET" : "—";
        const bookingFlag =
          p.bookingStatus === "ok"
            ? "OK"
            : p.bookingStatus === "below_target"
            ? "BELOW 30% TARGET"
            : "—";
        reply += `${c.name} (${c.market})\n`;
        reply += `- Leads: ${p.leads} | Booked: ${p.booked} (${p.bookingRate}% booking rate — ${bookingFlag})\n`;
        reply += `- CPL: ${p.cpl} [${cplFlag} vs $${p.cplBenchmark} target] | Show Rate: ${p.showRate}\n`;
        reply += `- Spend: ${p.spend} | Pipeline: ${p.pipeline} | Revenue: ${p.revenue}\n`;
        reply += `- Meta: ${p.cplBenchmark > 0 ? (!!c.metaAccountId && !isValuePending(c.metaAccountId) ? "connected" : "not connected") : "—"} | GHL: ${!!c.ghlLocationId && !isValuePending(c.ghlLocationId) ? "connected" : "not connected"}\n\n`;
      });
    } else {
      reply += "No active clients found.\n\n";
    }
    if (reports.length > 0) {
      reply += `Recent Reports (${reports.length}):\n`;
      reports.slice(0, 4).forEach((r) => {
        const clientName = clients.find((c) => c.id === r.clientId)?.name || r.clientId;
        reply += `- ${clientName} | ${r.reportPeriod || "Recent"} | Spend: ${r.spend} | Leads: ${r.leads} | CPL: ${r.cpl} | Booked: ${r.booked}\n`;
      });
    }
    return {
      reply,
      dataSources: ["clients", "reports"],
      relatedLinks: [
        { label: "Analytics Dashboard", href: "/analytics" },
        { label: "Reports", href: "/reports" },
      ],
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Specific client (full brain + diagnostics)
  // ────────────────────────────────────────────────────────────
  if (mentionedClient) {
    const c = mentionedClient;
    const brain = buildClientBrain(c, ctx);
    const { performance: p, launchReadiness: lr, diagnostics, integrations, approvedAssets, pendingAssets, bottleneck: bn, healthScore: hs } = brain;

    // Bottleneck / issue / performance question → structured reasoning format
    if (isBottleneck || isPerformance || isScaling) {
      const criticals = diagnostics.filter((d) => d.severity === "critical");
      const warnings = diagnostics.filter((d) => d.severity === "warning");

      const directAnswer = bn.type !== "none"
        ? `The primary bottleneck for ${c.name} is a ${bn.label} — Health: ${hs.score}/100 [${hs.status.toUpperCase()}].`
        : `${c.name} has no critical bottleneck detected — Health: ${hs.score}/100 [${hs.status.toUpperCase()}]. Launch readiness: ${lr.score}/${lr.maxScore}.`;

      let dataShows = `Status: ${c.status} | Market: ${c.market} | Health: ${hs.score}/100 [${hs.status}]\n`;
      dataShows += `Leads: ${p.leads} | Booked: ${p.booked} (${p.bookingRate}% booking rate) | CPL: ${p.cpl} | Show Rate: ${p.showRate}\n`;
      dataShows += `Spend: ${p.spend} | Pipeline: ${p.pipeline} | Revenue: ${p.revenue}\n`;
      dataShows += `Meta: ${integrations.metaConnected ? "connected" : "NOT connected"} | Pixel: ${integrations.pixelInstalled ? "installed" : "NOT installed"} | GHL: ${integrations.ghlConnected ? "connected" : "NOT connected"}\n`;
      dataShows += `Active campaigns: ${integrations.activeCampaignCount} | Approved creatives: ${approvedAssets.length} | Intelligence: ${brain.intelligence ? "extracted" : "missing"}\n`;
      if (bn.type !== "none") dataShows += `Bottleneck proof: ${bn.proofData}`;

      const likelyMeans = bn.type !== "none"
        ? bn.likelyMeaning
        : `${c.name} is in ${c.status} phase. ${lr.missing.length > 0 ? `Still missing ${lr.missing.length} of ${lr.maxScore} launch requirements.` : "All launch requirements met."}`;

      const recommendedAction = bn.type !== "none"
        ? bn.nextAction
        : lr.missing.length > 0
        ? `Complete: ${lr.missing.slice(0, 3).join(", ")}. Open the client profile → Integrations tab for credentials; Creative Library for assets.`
        : "All requirements met. Generate a campaign draft and submit for approval.";

      const notToDo = bn.type !== "none" ? bn.notToDo : (criticals[0]?.blocked ?? warnings[0]?.blocked);

      const reply = formatReasoningReply(
        directAnswer,
        dataShows,
        likelyMeans,
        recommendedAction,
        notToDo,
        bn.dataConfidence,
        ["clients", "campaign_drafts", "reports", "creative_assets", "client_intelligence"]
      );

      const links: VeronicaRelatedLink[] = [
        { label: `View ${c.name}`, href: `/clients/${c.id}` },
      ];
      if (criticals.some((d) => d.relatedAction)) {
        const action = criticals.find((d) => d.relatedAction)!.relatedAction!;
        links.push({ label: action.label, href: action.href });
      }
      if (links.length < 3) links.push({ label: "Campaign Builder", href: "/ai-agent" });

      return {
        reply,
        dataSources: ["clients", "campaign_drafts", "reports", "creative_assets", "client_intelligence"],
        relatedLinks: links,
        actionSuggested:
          criticals[0]?.relatedAction ??
          warnings[0]?.relatedAction ??
          (lr.missing.length === 0 ? { label: `Build Campaign for ${c.name}`, href: "/ai-agent" } : undefined),
        mockMode: true,
        provider: "mock",
      };
    }

    // Launch readiness check
    if (isMissing || c.status !== "active") {
      let reply = `${c.name} — Launch Readiness\n\n`;
      reply += `Score: ${lr.score}/${lr.maxScore}${lr.isReady ? " ✓ READY TO LAUNCH" : ""}\n\n`;

      if (lr.complete.length > 0) {
        reply += `Complete:\n`;
        lr.complete.forEach((item) => (reply += `  ✓ ${item}\n`));
        reply += "\n";
      }
      if (lr.missing.length > 0) {
        reply += `Missing:\n`;
        lr.missing.forEach((item) => (reply += `  ✗ ${item}\n`));
        reply += "\n";
      }

      if (diagnostics.length > 0) {
        const criticals = diagnostics.filter((d) => d.severity === "critical");
        const warnings = diagnostics.filter((d) => d.severity === "warning");
        if (criticals.length > 0) {
          reply += `Critical issues (${criticals.length}):\n`;
          criticals.forEach((d) => (reply += `  ⚠ ${d.signal}\n  → ${d.recommendation}\n`));
          reply += "\n";
        }
        if (warnings.length > 0) {
          reply += `Warnings (${warnings.length}):\n`;
          warnings.forEach((d) => (reply += `  • ${d.signal}\n`));
        }
      }

      reply += `\nPerformance:\n`;
      reply += `- Leads: ${p.leads} | Booked: ${p.booked} (${p.bookingRate}% booking rate)\n`;
      reply += `- CPL: ${p.cpl} | Show Rate: ${p.showRate} | Spend: ${p.spend}\n`;

      if (brain.drafts.length > 0) {
        reply += `\nCampaign Drafts (${brain.drafts.length}):\n`;
        brain.drafts
          .slice(0, 4)
          .forEach((d) => (reply += `- ${d.campaignName} | ${d.service} | ${d.status}\n`));
      }

      return {
        reply,
        dataSources: ["clients", "campaign_drafts", "creative_assets", "client_intelligence"],
        relatedLinks: [
          { label: `View ${c.name}`, href: `/clients/${c.id}` },
          { label: "Client Profile → Integrations", href: `/clients/${c.id}` },
        ],
        actionSuggested:
          lr.missing.includes("Campaign draft approved or ready")
            ? { label: `Build Campaign for ${c.name}`, href: "/ai-agent" }
            : undefined,
        mockMode: true,
        provider: "mock",
      };
    }

    // General client summary
    let reply = `${c.name} — Client Summary\n\n`;
    reply += `Status: ${c.status} | Market: ${c.market}\n`;
    reply += `Owner: ${c.owner} | Budget: ${c.monthlyBudget} | Avg Job: ${c.avgJobValue}\n`;
    reply += `Services: ${c.services.join(", ")}\n`;
    if (c.offer) reply += `Offer: ${c.offer}\n`;
    reply += `\nPerformance:\n`;
    reply += `- Leads: ${p.leads} | Booked: ${p.booked} (${p.bookingRate}% booking rate${
      p.bookingStatus !== "unknown" ? " — " + (p.bookingStatus === "ok" ? "OK" : "BELOW TARGET") : ""
    })\n`;
    reply += `- CPL: ${p.cpl}${p.cplStatus !== "unknown" ? " [" + (p.cplStatus === "ok" ? "OK" : "ABOVE $" + p.cplBenchmark + " TARGET") + "]" : ""} | Show Rate: ${p.showRate}\n`;
    reply += `- Pipeline: ${p.pipeline} | Revenue: ${p.revenue} | Spend: ${p.spend}\n`;

    if (approvedAssets.length > 0 || pendingAssets.length > 0) {
      reply += `\nCreatives: ${approvedAssets.length} approved for ads${pendingAssets.length > 0 ? `, ${pendingAssets.length} pending review` : ""}\n`;
    }

    if (brain.drafts.length > 0) {
      reply += `\nCampaign Drafts (${brain.drafts.length}):\n`;
      brain.drafts
        .slice(0, 4)
        .forEach((d) => (reply += `- ${d.campaignName} | ${d.service} | ${d.status}\n`));
    }

    if (diagnostics.length > 0) {
      const criticals = diagnostics.filter((d) => d.severity === "critical");
      const warnings = diagnostics.filter((d) => d.severity === "warning");
      if (criticals.length + warnings.length > 0) {
        reply += `\nActive issues (${criticals.length} critical, ${warnings.length} warning):\n`;
        [...criticals, ...warnings].slice(0, 3).forEach((d) => {
          reply += `- [${d.severity.toUpperCase()}] ${d.signal}\n  → ${d.recommendation}\n`;
        });
      }
    }

    if (c.notes) reply += `\nNotes: ${c.notes}\n`;

    const actionLinks: VeronicaRelatedLink[] = [
      { label: `View ${c.name}`, href: `/clients/${c.id}` },
      { label: "Campaign Builder", href: "/ai-agent" },
    ];

    return {
      reply,
      dataSources: ["clients", "campaign_drafts", "reports", "creative_assets"],
      relatedLinks: actionLinks,
      actionSuggested: { label: `Build Campaign for ${c.name}`, href: "/ai-agent" },
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Report generation
  // ────────────────────────────────────────────────────────────
  if (isReport) {
    const activeClients = clients.filter((c) => c.status === "active");
    let reply = "Report Draft Generation\n\n";
    reply +=
      "Go to Reports and select a client to generate a weekly performance report draft.\n\n";
    reply += "Active clients ready for reporting:\n";
    activeClients.forEach((c) => {
      const s = c.stats;
      reply += `- ${c.name} (${c.market}) | Leads: ${s.leads} | Booked: ${s.booked} | CPL: ${s.cpl} | Spend: ${s.spend}\n`;
    });
    reply +=
      "\nVeronica will generate a full report including executive summary, wins, issues, next actions, and client-ready narrative. The draft goes to the approval queue before being shared with clients.";
    return {
      reply,
      dataSources: ["clients", "reports"],
      relatedLinks: [{ label: "Go to Reports", href: "/reports" }],
      actionSuggested: { label: "Generate Report Draft", href: "/reports" },
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Campaign generation
  // ────────────────────────────────────────────────────────────
  if (isCampaign) {
    const activeClients = clients.filter((c) => c.status === "active");
    let reply = "Campaign Draft Generation\n\n";
    reply +=
      "Open the Campaign Builder to generate a full approval-ready campaign draft. You'll need:\n\n";
    reply += "- Client (select from dropdown)\n";
    reply += "- Service — e.g., Roof Inspection, Storm Damage, Kitchen Remodel\n";
    reply += "- Market — city or metro area\n";
    reply += "- Budget — monthly ad spend\n";
    reply += "- Goal — Lead Generation, Retargeting, Brand Awareness\n\n";
    reply +=
      "The draft will include Meta campaign structure, ad copy, lead form, GHL workflow, creative direction, compliance check, and optimization rules. Human approval is required before anything goes live.\n\n";
    if (activeClients.length > 0) {
      reply += `Active clients: ${activeClients.map((c) => c.name).join(", ")}`;
    }
    return {
      reply,
      dataSources: ["clients"],
      relatedLinks: [{ label: "Open Campaign Builder", href: "/ai-agent" }],
      actionSuggested: { label: "Open Campaign Builder", href: "/ai-agent" },
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Handler: Next actions (generic priority list)
  // ────────────────────────────────────────────────────────────
  if (isNextActions) {
    const allBrains = clients.map((c) => buildClientBrain(c, ctx));
    const allDiagnostics = allBrains.flatMap((b) => b.diagnostics);
    const criticals = allDiagnostics.filter((d) => d.severity === "critical");
    const pendingDrafts = campaignDrafts.filter(
      (d) => d.status === "needs_review" || d.approvalStatus === "needs_review"
    );
    const activeNoReports = clients
      .filter((c) => c.status === "active")
      .filter((c) => !reports.some((r) => r.clientId === c.id));

    let reply = "Recommended Next Actions\n\n";
    let priority = 1;

    if (criticals.length > 0) {
      const unique = criticals.filter(
        (d, i, arr) => arr.findIndex((x) => x.signal === d.signal) === i
      );
      reply += `${priority++}. Fix ${unique.length} critical issue(s)\n`;
      unique.slice(0, 3).forEach((d) => {
        reply += `   ⚠ ${d.clientName}: ${d.signal}\n   → ${d.recommendation}\n`;
      });
      reply += "\n";
    }

    if (pendingDrafts.length > 0) {
      reply += `${priority++}. Review ${pendingDrafts.length} campaign draft(s) in the approval queue\n`;
      pendingDrafts
        .slice(0, 3)
        .forEach((d) => (reply += `   - ${d.campaignName} (${d.clientName || d.clientId})\n`));
      reply += "\n";
    }

    const incompleteClients = clients.filter(
      (c) => c.status === "setup" || c.status === "onboarding"
    );
    if (incompleteClients.length > 0) {
      reply += `${priority++}. Complete onboarding for ${incompleteClients.length} client(s)\n`;
      incompleteClients.forEach((c) => {
        const lr = allBrains.find((b) => b.profile.id === c.id)?.launchReadiness;
        reply += `   - ${c.name} (${c.status}): ${lr && lr.missing.length > 0 ? "missing " + lr.missing.slice(0, 2).join(", ") : "check integration credentials"}\n`;
      });
      reply += "\n";
    }

    if (activeNoReports.length > 0) {
      reply += `${priority++}. Generate weekly reports for ${activeNoReports.length} active client(s)\n`;
      activeNoReports.forEach((c) => (reply += `   - ${c.name}\n`));
      reply += "\n";
    }

    const highCplClients = clients.filter((c) => {
      const p = buildClientBrain(c, ctx).performance;
      return p.cplStatus === "above_target";
    });
    if (highCplClients.length > 0 && !criticals.some((d) => d.signal.toLowerCase().includes("cpl"))) {
      reply += `${priority++}. Investigate above-target CPL on ${highCplClients.length} client(s)\n`;
      highCplClients.forEach(
        (c) =>
          (reply += `   - ${c.name}: CPL ${c.stats.cpl} (above $${buildClientBrain(c, ctx).performance.cplBenchmark} target)\n`)
      );
    }

    if (priority === 1) {
      reply += "No urgent actions found. All clients appear to be in good standing.";
    }

    return {
      reply,
      dataSources: ["clients", "campaign_drafts", "approvals", "reports"],
      relatedLinks: [
        { label: "Approvals Queue", href: "/approvals" },
        { label: "Reports", href: "/reports" },
        { label: "All Clients", href: "/clients" },
      ],
      mockMode: true,
      provider: "mock",
    };
  }

  // ────────────────────────────────────────────────────────────
  // Default: portal overview with diagnostics
  // ────────────────────────────────────────────────────────────
  const activeCount = clients.filter((c) => c.status === "active").length;
  const setupCount = clients.filter((c) => c.status === "setup").length;
  const onboardingCount = clients.filter((c) => c.status === "onboarding").length;
  const pendingDraftCount = campaignDrafts.filter((d) => d.status === "needs_review").length;
  const allBrains = clients.map((c) => buildClientBrain(c, ctx));
  const totalCriticals = allBrains.flatMap((b) => b.diagnostics).filter((d) => d.severity === "critical").length;

  let reply = "Portal Overview\n\n";
  reply += `${clients.length} clients — ${activeCount} active, ${setupCount} in setup, ${onboardingCount} onboarding\n`;
  reply += `${campaignDrafts.length} campaign drafts — ${pendingDraftCount} pending review\n`;
  reply += `${reports.length} reports on file\n`;
  reply += `${approvals.length} items in the approval queue\n`;
  if (totalCriticals > 0) reply += `${totalCriticals} critical issue(s) flagged\n`;
  reply += "\nWhat would you like to dig into? I can:\n";
  reply += "- Summarize any client and check launch readiness\n";
  reply += "- Show what is missing before a client goes live\n";
  reply += "- Diagnose bottlenecks with structured reasoning\n";
  reply += "- List pending approvals and what needs action\n";
  reply += "- Analyze Meta and GHL performance\n";
  reply += "- Explain CPL or booking rate issues\n";
  reply += "- Recommend prioritized next actions\n";
  reply += "- Help prepare a campaign or report draft";

  return {
    reply,
    dataSources: ["clients", "campaign_drafts", "reports", "approvals"],
    relatedLinks: [
      { label: "All Clients", href: "/clients" },
      { label: "Approvals Queue", href: "/approvals" },
      { label: "Analytics", href: "/analytics" },
    ],
    mockMode: true,
    provider: "mock",
  };
}
