// Server-side console intelligence — never import this in client components.
// Builds system prompts and data-aware mock responses for the Veronica Console.

import type { Client, Approval } from "@/lib/data";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import type { CreativeAsset } from "@/lib/creativeAssets";
import type { CampaignDraft } from "@/lib/planStore";
import type { PersistedReport } from "@/lib/data/data-provider";

// ─────────────────────────────────────────────────────────────
// Public response types
// ─────────────────────────────────────────────────────────────

export interface VeronicaRelatedLink {
  label: string;
  href: string;
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

export interface LaunchReadinessCheck {
  clientId: string;
  clientName: string;
  score: number;
  maxScore: number;
  isReady: boolean;
  complete: string[];
  missing: string[];
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
    pixelInstalled: boolean;
    fbPageConnected: boolean;
    ghlConnected: boolean;
    hasActiveMetaCampaigns: boolean;
    activeCampaignCount: number;
  };
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
  intelligence: ClientIntelligence | null
): LaunchReadinessCheck {
  const checks: Array<{ label: string; pass: boolean }> = [
    { label: "Meta Ad Account connected", pass: !!client.metaAccountId && !isValuePending(client.metaAccountId) },
    { label: "Facebook Page connected", pass: !!client.fbPageId && !isValuePending(client.fbPageId) },
    { label: "Meta Pixel installed", pass: !!client.pixelId && !isValuePending(client.pixelId) },
    { label: "GHL Location connected", pass: !!client.ghlLocationId && !isValuePending(client.ghlLocationId) },
    { label: "Approved creative asset", pass: approvedAssets.length > 0 },
    { label: "Client intelligence extracted", pass: !!intelligence },
    {
      label: "Campaign draft approved or ready",
      pass: drafts.some((d) => d.status === "ready_for_meta" || d.status === "approved"),
    },
  ];

  const passed = checks.filter((c) => c.pass);
  const failed = checks.filter((c) => !c.pass);

  return {
    clientId: client.id,
    clientName: client.name,
    score: passed.length,
    maxScore: checks.length,
    isReady: failed.length === 0,
    complete: passed.map((c) => c.label),
    missing: failed.map((c) => c.label),
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
      relatedAction: { label: "Settings & Integrations", href: "/settings" },
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
      relatedAction: { label: "Settings & Integrations", href: "/settings" },
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
      relatedAction: { label: "Settings & Integrations", href: "/settings" },
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

  // Rule 11 — Disconnected integrations (non-active clients only — active clients with missing data flag separately)
  const missingIntegrations: string[] = [];
  if (!client.metaAccountId || isValuePending(client.metaAccountId)) missingIntegrations.push("Meta Ad Account");
  if (!client.pixelId || isValuePending(client.pixelId)) missingIntegrations.push("Meta Pixel");
  if (!client.fbPageId || isValuePending(client.fbPageId)) missingIntegrations.push("Facebook Page");
  if (!client.ghlLocationId || isValuePending(client.ghlLocationId)) missingIntegrations.push("GHL Location");

  if (missingIntegrations.length > 0 && client.status !== "active") {
    findings.push({
      clientId: client.id,
      clientName: client.name,
      signal: `Missing integrations: ${missingIntegrations.join(", ")}`,
      severity: missingIntegrations.length >= 3 ? "critical" : "warning",
      likelyCause:
        "Client onboarding has not been completed. Credentials have not been entered in Settings → Integrations, or client has not yet granted account access.",
      recommendation: `Complete integration setup for: ${missingIntegrations.join(", ")}. Go to Settings → Integrations.`,
      blocked:
        "Cannot run Meta ads without Meta Ad Account, Pixel, and Page. Cannot run GHL workflows without GHL Location ID.",
      relatedAction: { label: "Settings & Integrations", href: "/settings" },
    });
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
  const cplNum = parseFloat(s.cpl.replace(/[^0-9.]/g, "")) || 0;
  const bookingRate = s.leads > 0 ? Math.round((s.booked / s.leads) * 100) : 0;
  const showRateNum = parseFloat(s.showRate.replace(/[^0-9.]/g, "")) || 0;

  const cplStatus =
    cplNum === 0
      ? ("unknown" as const)
      : cplNum <= cplBenchmark
      ? ("ok" as const)
      : ("above_target" as const);

  const bookingStatus =
    s.leads === 0 && bookingRate === 0
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
    leads: s.leads,
    booked: s.booked,
    bookingRate,
    cpl: s.cpl,
    cpba: s.cpba,
    showRate: s.showRate,
    spend: s.spend,
    pipeline: s.pipeline,
    revenue: s.revenue,
    cplBenchmark,
    cplStatus,
    bookingStatus,
    showRateStatus,
  };

  const intelligence = clientIntelligence ?? null;
  const launchReadiness = checkLaunchReadiness(client, approvedAssets, drafts, intelligence);
  const diagnostics = runDiagnosticsForClient(client, performance, {
    approvedAssets,
    pendingAssets,
    drafts,
    pendingApprovals,
    recentReports,
    intelligence,
    hasActiveMetaCampaigns,
    isRoofing,
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
    integrations: {
      metaConnected:
        !!client.metaAccountId && !isValuePending(client.metaAccountId),
      pixelInstalled: !!client.pixelId && !isValuePending(client.pixelId),
      fbPageConnected: !!client.fbPageId && !isValuePending(client.fbPageId),
      ghlConnected:
        !!client.ghlLocationId && !isValuePending(client.ghlLocationId),
      hasActiveMetaCampaigns,
      activeCampaignCount: activeCampaigns.length,
    },
    performance,
    intelligence,
    approvedAssets,
    pendingAssets,
    drafts,
    pendingApprovals,
    recentReports,
    launchReadiness,
    diagnostics,
  };
}

// ─────────────────────────────────────────────────────────────
// Build a compact diagnostic summary for ALL clients (for system prompt)
// ─────────────────────────────────────────────────────────────

function buildAllDiagnosticSummary(ctx: VeronicaPortalContext): string {
  let summary = "";

  for (const client of ctx.clients) {
    const brain = buildClientBrain(client, ctx);
    const { launchReadiness: lr, performance: p, diagnostics } = brain;

    summary += `\n### ${client.name} (${client.status})\n`;
    summary += `Launch readiness: ${lr.score}/${lr.maxScore}${lr.isReady ? " ✓ READY" : " — NOT READY"}\n`;
    if (lr.missing.length > 0) summary += `Missing: ${lr.missing.join(", ")}\n`;

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

## Reasoning Format for Strategy and Performance Questions
When answering strategy, bottleneck, performance, or "what should we do" questions, structure your reply like this:

1. Direct answer — one sentence
2. What the data shows — specific numbers from the portal
3. What it likely means — cause diagnosis based on the rules above
4. Recommended next action — one specific, safe, actionable step
5. What NOT to do — what would be unsafe or premature

This format applies to questions like: "What is the bottleneck?", "Should we scale?", "Why are there leads but no bookings?", "What should we fix first?", "What do we do next this week?"

## What Veronica Can Recommend (Safe Actions)
- Generate campaign draft (for human approval)
- Generate report draft (for human approval)
- Review approvals queue
- Upload creative assets to Creative Library
- Sync Meta or GHL credentials in Settings
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
- relatedLinks: max 3, directly relevant only. Valid hrefs: /clients, /clients/[id], /campaigns, /approvals, /reports, /creatives, /analytics, /ai-agent, /settings
- actionSuggested: omit entirely (do not include the key) if there is no clear next operator action
- reply: must reference real data from the portal context. Never fabricate metrics or client details`;

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
  notToDo?: string
): string {
  let reply = `${directAnswer}\n\n`;
  reply += `What the data shows:\n${dataShows}\n\n`;
  reply += `What it likely means:\n${likelyMeans}\n\n`;
  reply += `Recommended next action:\n${recommendedAction}`;
  if (notToDo) reply += `\n\nDo not:\n${notToDo}`;
  return reply;
}

export function mockVeronicaResponse(
  message: string,
  ctx: VeronicaPortalContext
): VeronicaConsoleResponse {
  const msg = message.toLowerCase();
  const { clients, approvals, campaignDrafts, reports, creativeAssets } = ctx;

  // ── Client detection ──
  const mentionedClient = clients.find((c) => {
    const m = msg;
    if (m.includes(c.name.toLowerCase())) return true;
    if (m.includes(c.id.toLowerCase())) return true;
    const ownerParts = c.owner.toLowerCase().split(" ");
    if (ownerParts.some((w: string) => w.length >= 4 && m.includes(w))) return true;
    // Partial name match — catch "Kaczmar" for "Kaczmar Builders", "Acorns" for "Acorns Roofing", etc.
    const genericWords = new Set(["group", "roofing", "construction", "builders", "remodeling", "forge", "home"]);
    const nameParts = c.name.toLowerCase().split(/[\s-]+/);
    return nameParts.some((w: string) => w.length >= 4 && !genericWords.has(w) && m.includes(w));
  });

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
        { label: "Settings & Integrations", href: "/settings" },
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
      { label: "Settings & Integrations", href: "/settings" },
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
  // Handler: This week priorities (weekly ops)
  // ────────────────────────────────────────────────────────────
  if (isThisWeek) {
    const allBrains = clients.map((c) => buildClientBrain(c, ctx));
    const allDiagnostics = allBrains.flatMap((b) => b.diagnostics);
    const criticals = allDiagnostics.filter((d) => d.severity === "critical");
    const warnings = allDiagnostics.filter((d) => d.severity === "warning");
    const pendingDrafts = campaignDrafts.filter(
      (d) => d.status === "needs_review" || d.approvalStatus === "needs_review"
    );
    const activeNoReports = clients
      .filter((c) => c.status === "active")
      .filter((c) => !reports.some((r) => r.clientId === c.id));

    let reply = "Vault Co — This Week's Priority Actions\n\n";
    let priority = 1;

    if (criticals.length > 0) {
      const uniqueCriticals = criticals.filter(
        (d, i, arr) => arr.findIndex((x) => x.signal === d.signal) === i
      );
      reply += `${priority++}. Resolve ${uniqueCriticals.length} critical issue(s)\n`;
      uniqueCriticals.slice(0, 4).forEach((d) => {
        reply += `   ⚠ ${d.clientName}: ${d.signal}\n   → ${d.recommendation}\n`;
      });
      reply += "\n";
    }

    if (pendingDrafts.length > 0) {
      reply += `${priority++}. Review ${pendingDrafts.length} campaign draft(s) in the approval queue\n`;
      pendingDrafts.slice(0, 3).forEach((d) => {
        reply += `   - ${d.campaignName} (${d.clientName || d.clientId})\n`;
      });
      reply += "\n";
    }

    if (activeNoReports.length > 0) {
      reply += `${priority++}. Generate weekly reports for ${activeNoReports.length} active client(s)\n`;
      activeNoReports.forEach((c) => (reply += `   - ${c.name} (${c.market})\n`));
      reply += "\n";
    }

    if (warnings.length > 0) {
      const uniqueWarnings = warnings
        .filter((d, i, arr) => arr.findIndex((x) => x.signal === d.signal) === i)
        .slice(0, 3);
      reply += `${priority++}. Address ${warnings.length} warning(s)\n`;
      uniqueWarnings.forEach((d) => {
        reply += `   • ${d.clientName}: ${d.signal}\n`;
      });
      reply += "\n";
    }

    const notReady = allBrains.filter((b) => !b.launchReadiness.isReady && b.profile.status !== "active");
    if (notReady.length > 0) {
      reply += `${priority++}. Advance onboarding for ${notReady.length} client(s)\n`;
      notReady.forEach((b) => {
        reply += `   - ${b.profile.name}: missing ${b.launchReadiness.missing.slice(0, 2).join(", ")}\n`;
      });
    }

    if (priority === 1) {
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
    const { performance: p, launchReadiness: lr, diagnostics, integrations, approvedAssets, pendingAssets } = brain;

    // Bottleneck / issue / performance question → structured reasoning format
    if (isBottleneck || isPerformance || isScaling) {
      const criticals = diagnostics.filter((d) => d.severity === "critical");
      const warnings = diagnostics.filter((d) => d.severity === "warning");
      const topIssue = criticals[0] ?? warnings[0];

      const directAnswer = topIssue
        ? `The primary bottleneck for ${c.name} is: ${topIssue.signal}.`
        : `${c.name} has no critical issues at this time. The main focus should be advancing to launch-readiness (${lr.score}/${lr.maxScore}).`;

      let dataShows = `Status: ${c.status} | Market: ${c.market}\n`;
      dataShows += `Leads: ${p.leads} | Booked: ${p.booked} (${p.bookingRate}% booking rate) | CPL: ${p.cpl} | Show Rate: ${p.showRate}\n`;
      dataShows += `Spend: ${p.spend} | Pipeline: ${p.pipeline} | Revenue: ${p.revenue}\n`;
      dataShows += `Meta: ${integrations.metaConnected ? "connected" : "NOT connected"} | Pixel: ${integrations.pixelInstalled ? "installed" : "NOT installed"} | GHL: ${integrations.ghlConnected ? "connected" : "NOT connected"}\n`;
      dataShows += `Active campaigns: ${integrations.activeCampaignCount} | Approved creatives: ${approvedAssets.length} | Intelligence: ${brain.intelligence ? "extracted" : "missing"}`;

      const likelyMeans = topIssue
        ? topIssue.likelyCause
        : `${c.name} is in ${c.status} phase and missing ${lr.missing.length} of 7 launch requirements. No live campaign means no performance data yet.`;

      const recommendedAction = topIssue
        ? topIssue.recommendation
        : lr.missing.length > 0
        ? `Complete the missing setup items: ${lr.missing.slice(0, 3).join(", ")}. Use Settings → Integrations for credentials and Creative Library for assets.`
        : "All launch requirements met. Generate a campaign draft and submit for approval.";

      const notToDo = topIssue ? topIssue.blocked : undefined;

      const reply = formatReasoningReply(
        directAnswer,
        dataShows,
        likelyMeans,
        recommendedAction,
        notToDo
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
          { label: "Settings & Integrations", href: "/settings" },
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
