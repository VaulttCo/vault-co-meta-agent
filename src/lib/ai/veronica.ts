// Server-side console intelligence — never import this in client components.
// Builds system prompts and data-aware mock responses for the Veronica Console.

import type { Client, Approval } from "@/lib/data";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import type { CreativeAsset } from "@/lib/creativeAssets";
import type { CampaignDraft } from "@/lib/planStore";
import type { PersistedReport } from "@/lib/data/data-provider";

// ─────────────────────────────────────────────────────────────
// Types
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
    metaAccountConnected: !!c.metaAccountId,
    pixelInstalled: !!c.pixelId,
    fbPageConnected: !!c.fbPageId,
    ghlLocationConnected: !!c.ghlLocationId,
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

  prompt += `

## Vault Co Performance Benchmarks
- Target CPL: under $75 for roofing, under $150 for remodeling
- Target booking rate: 30%+ (leads booked for consultation)
- Target show rate: 65%+ (booked who actually showed)
- CPL above 2x target = underperforming campaign
- Booking rate below 25% = GHL follow-up or setter gap
- Show rate below 50% = setter quality or scheduling problem
- Avg job value: roofing $10k–$25k | remodeling $20k–$50k

## Client Launch-Ready Checklist
1. Meta Ad Account ID connected
2. Facebook Page ID set
3. Meta Pixel installed and verified
4. GHL Location ID connected
5. At least one approved creative asset
6. Client intelligence extracted
7. Campaign draft approved (ready_for_meta status)

## Response Format — CRITICAL
Respond ONLY with a valid JSON object. No text before or after the JSON. No markdown code fences. Use this exact shape:
{
  "reply": "Your full answer. Use plain text with newlines for structure. Use - for bullets. Be specific — use real client names and real numbers from the portal data. Never invent data.",
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
- relatedLinks: max 3, directly relevant only. Valid hrefs: /clients, /clients/[id], /campaigns, /approvals, /reports, /creatives, /analytics, /ai-agent
- actionSuggested: omit entirely (do not include the key) if there is no clear next operator action
- reply: must reference real data from the portal context. Never fabricate metrics or client details`;

  return prompt;
}

// ─────────────────────────────────────────────────────────────
// Data-aware mock fallback — works without an API key
// Uses real portal data for structured, useful responses
// ─────────────────────────────────────────────────────────────

export function mockVeronicaResponse(
  message: string,
  ctx: VeronicaPortalContext
): VeronicaConsoleResponse {
  const msg = message.toLowerCase();
  const { clients, approvals, campaignDrafts, reports, creativeAssets } = ctx;

  const mentionedClient = clients.find(
    (c) =>
      msg.includes(c.name.toLowerCase()) ||
      msg.includes(c.id.toLowerCase()) ||
      msg.includes(c.owner.toLowerCase().split(" ")[0])
  );

  const isApprovals = msg.includes("approv") || msg.includes("pending") || msg.includes("review queue");
  const isCreatives = msg.includes("creative") || msg.includes("asset") || msg.includes("approved for ads");
  const isPerformance =
    msg.includes("cpl") || msg.includes("performance") || msg.includes("booking") ||
    msg.includes("show rate") || msg.includes("meta") || msg.includes("ghl") ||
    msg.includes("analytics");
  const isReport = msg.includes("report") || msg.includes("weekly");
  const isNextAction = msg.includes("next") || msg.includes("priority") || msg.includes("what should");

  // ── Client summary ──
  if (mentionedClient) {
    const c = mentionedClient;
    const missing: string[] = [];
    if (!c.metaAccountId) missing.push("Meta Ad Account");
    if (!c.fbPageId) missing.push("Facebook Page ID");
    if (!c.pixelId) missing.push("Meta Pixel");
    if (!c.ghlLocationId) missing.push("GHL Location ID");

    const clientDrafts = campaignDrafts.filter((d) => d.clientId === c.id);
    const clientReports = reports.filter((r) => r.clientId === c.id);
    const clientAssets = creativeAssets?.filter((a) => a.clientId === c.id) ?? [];
    const approvedAssets = clientAssets.filter((a) => a.approvedForAds);

    let reply = `${c.name} — ${c.status.toUpperCase()}\n\n`;
    reply += `Owner: ${c.owner}\n`;
    reply += `Market: ${c.market}\n`;
    reply += `Services: ${c.services.join(", ")}\n`;
    reply += `Monthly Budget: ${c.monthlyBudget}\n`;
    reply += `Avg Job Value: ${c.avgJobValue}\n\n`;

    reply += `Performance\n`;
    reply += `- Leads (MTD): ${c.stats.leads}\n`;
    reply += `- Booked: ${c.stats.booked}\n`;
    reply += `- CPL: ${c.stats.cpl}\n`;
    reply += `- Spend: ${c.stats.spend}\n\n`;

    reply += `Integration Status\n`;
    reply += `- Meta Account: ${c.metaAccountId ? "Connected (" + c.metaAccountId + ")" : "Not connected"}\n`;
    reply += `- Facebook Page: ${c.fbPageId ? "Connected" : "Not connected"}\n`;
    reply += `- Meta Pixel: ${c.pixelId ? "Installed" : "Not installed"}\n`;
    reply += `- GHL Location: ${c.ghlLocationId ? "Connected (" + c.ghlLocationId + ")" : "Not connected"}\n\n`;

    if (missing.length > 0) {
      reply += `Missing Before Launch\n`;
      missing.forEach((m) => (reply += `- ${m}\n`));
      reply += "\n";
    } else {
      reply += `All integrations connected.\n\n`;
    }

    reply += `Campaign Drafts: ${clientDrafts.length} total`;
    const readyDraft = clientDrafts.find((d) => d.approvalStatus === "ready_for_meta");
    if (readyDraft) reply += ` — 1 ready for Meta (${readyDraft.campaignName})`;
    reply += "\n";

    reply += `Creative Assets: ${clientAssets.length} total, ${approvedAssets.length} approved for ads\n`;
    reply += `Reports on File: ${clientReports.length}`;

    return {
      reply,
      dataSources: ["clients", "campaign_drafts", "creative_assets", "reports"],
      relatedLinks: [
        { label: `View ${c.name}`, href: `/clients/${c.id}` },
        { label: "Campaign Builder", href: "/ai-agent" },
        { label: "Creatives", href: "/creatives" },
      ],
      actionSuggested:
        clientDrafts.length === 0
          ? { label: `Build Campaign for ${c.name}`, href: "/ai-agent" }
          : undefined,
      mockMode: true,
      provider: "mock",
    };
  }

  // ── Approvals ──
  if (isApprovals) {
    const pending = approvals.filter(
      (a) => !("status" in a) || (a as { status?: string }).status !== "approved"
    );
    let reply = `Approval Queue — ${pending.length} item(s) pending\n\n`;
    if (pending.length === 0) {
      reply += "No pending approvals. All items have been reviewed.";
    } else {
      pending.slice(0, 10).forEach((a) => {
        reply += `- [${a.priority?.toUpperCase() ?? "NORMAL"}] ${a.clientName}: ${a.item}\n`;
        if (a.detail) reply += `  ${a.detail}\n`;
      });
    }
    return {
      reply,
      dataSources: ["approvals"],
      relatedLinks: [{ label: "Approvals Queue", href: "/approvals" }],
      mockMode: true,
      provider: "mock",
    };
  }

  // ── Creatives ──
  if (isCreatives) {
    const allAssets = creativeAssets ?? [];
    const approved = allAssets.filter((a) => a.approvedForAds);
    let reply = `Creative Assets — ${allAssets.length} total, ${approved.length} approved for ads\n\n`;
    if (approved.length === 0) {
      reply += "No creative assets are currently approved for ads. Upload and approve assets in the Creatives section.";
    } else {
      approved.slice(0, 10).forEach((a) => {
        reply += `- ${a.fileName} (${a.assetType}) — ${a.service ?? "general"}\n`;
      });
    }
    return {
      reply,
      dataSources: ["creative_assets"],
      relatedLinks: [{ label: "Creatives Library", href: "/creatives" }],
      mockMode: true,
      provider: "mock",
    };
  }

  // ── Performance ──
  if (isPerformance) {
    let reply = `Meta & GHL Performance Summary\n\n`;
    const activeClients = clients.filter((c) => c.status === "active");
    if (activeClients.length === 0) {
      reply += "No active clients with connected integrations.";
    } else {
      activeClients.forEach((c) => {
        reply += `${c.name}\n`;
        reply += `- Leads: ${c.stats.leads} | Booked: ${c.stats.booked} | CPL: ${c.stats.cpl} | Spend: ${c.stats.spend}\n`;
        const cplNum = parseFloat(c.stats.cpl.replace(/[^0-9.]/g, "")) || 0;
        const isRoofing = c.services.some((sv) => sv.toLowerCase().includes("roof"));
        const benchmark = isRoofing ? 75 : 150;
        if (cplNum > benchmark * 2) {
          reply += `  ⚠ CPL is above 2x benchmark ($${benchmark}) — campaign may be underperforming\n`;
        }
        reply += "\n";
      });
    }
    return {
      reply,
      dataSources: ["clients", "reports"],
      relatedLinks: [
        { label: "Analytics", href: "/analytics" },
        { label: "Reports", href: "/reports" },
      ],
      mockMode: true,
      provider: "mock",
    };
  }

  // ── Report draft ──
  if (isReport) {
    const targetClient = clients.find((c) => c.status === "active") ?? clients[0];
    if (!targetClient) {
      return {
        reply: "No clients found to generate a report draft for.",
        dataSources: ["clients"],
        mockMode: true,
        provider: "mock",
      };
    }
    let reply = `Report Draft — ${targetClient.name}\n\n`;
    reply += `Period: ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}\n\n`;
    reply += `Performance Summary\n`;
    reply += `- Ad Spend: ${targetClient.stats.spend}\n`;
    reply += `- Leads Generated: ${targetClient.stats.leads}\n`;
    reply += `- Booked Appointments: ${targetClient.stats.booked}\n`;
    reply += `- Cost Per Lead: ${targetClient.stats.cpl}\n\n`;
    reply += `This is a draft. Review and edit before sending to the client. Human approval required.`;
    return {
      reply,
      dataSources: ["clients", "reports"],
      relatedLinks: [
        { label: `View ${targetClient.name}`, href: `/clients/${targetClient.id}` },
        { label: "Reports", href: "/reports" },
      ],
      actionSuggested: { label: "Go to Reports", href: "/reports" },
      mockMode: true,
      provider: "mock",
    };
  }

  // ── Next actions ──
  if (isNextAction) {
    let reply = `Recommended Next Actions\n\n`;
    let priority = 1;

    const pendingApprovals = approvals.filter(
      (a) => !("status" in a) || (a as { status?: string }).status !== "approved"
    );
    if (pendingApprovals.length > 0) {
      reply += `${priority++}. Review ${pendingApprovals.length} pending approval(s)\n`;
      pendingApprovals.slice(0, 3).forEach((a) => {
        reply += `   - ${a.clientName}: ${a.item} [${a.priority}]\n`;
      });
      reply += "\n";
    }

    const incompleteClients = clients.filter(
      (c) => c.status !== "paused" && (!c.metaAccountId || !c.ghlLocationId || !c.pixelId)
    );
    if (incompleteClients.length > 0) {
      reply += `${priority++}. Complete integration setup for ${incompleteClients.length} client(s)\n`;
      incompleteClients.forEach((c) => {
        const missing: string[] = [];
        if (!c.metaAccountId) missing.push("Meta account");
        if (!c.ghlLocationId) missing.push("GHL location");
        if (!c.pixelId) missing.push("Meta Pixel");
        reply += `   - ${c.name} (${c.status}): ${missing.length > 0 ? "missing " + missing.join(", ") : "check integration credentials"}\n`;
      });
      reply += "\n";
    }

    const activeClients = clients.filter((c) => c.status === "active");
    if (activeClients.length > 0 && reports.length < activeClients.length) {
      reply += `${priority++}. Generate weekly reports\n`;
      reply += `   Active clients due for reporting: ${activeClients.map((c) => c.name).join(", ")}\n\n`;
    }

    const highCplClients = activeClients.filter((c) => {
      const cpl = parseFloat(c.stats.cpl.replace(/[^0-9.]/g, "")) || 0;
      const isRoofing = c.services.some((sv) => sv.toLowerCase().includes("roof"));
      return cpl > (isRoofing ? 75 : 150);
    });
    if (highCplClients.length > 0) {
      reply += `${priority++}. Investigate high CPL on ${highCplClients.length} client(s)\n`;
      highCplClients.forEach(
        (c) => (reply += `   - ${c.name}: CPL ${c.stats.cpl} (above benchmark)\n`)
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

  // Default: portal overview
  const activeCount = clients.filter((c) => c.status === "active").length;
  const setupCount = clients.filter((c) => c.status === "setup").length;
  const onboardingCount = clients.filter((c) => c.status === "onboarding").length;
  const pendingDraftCount = campaignDrafts.filter((d) => d.status === "needs_review").length;

  let reply = "Portal Overview\n\n";
  reply += `${clients.length} clients — ${activeCount} active, ${setupCount} in setup, ${onboardingCount} onboarding\n`;
  reply += `${campaignDrafts.length} campaign drafts — ${pendingDraftCount} pending review\n`;
  reply += `${reports.length} reports on file\n`;
  reply += `${approvals.length} items in the approval queue\n\n`;
  reply += "What would you like to dig into? I can:\n";
  reply += "- Summarize any client and check launch readiness\n";
  reply += "- Show what is missing before a client goes live\n";
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
