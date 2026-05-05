// Single source of truth for all Vault Co client data

export type ClientStatus = "active" | "setup" | "onboarding" | "paused";
export type CampaignStatus = "active" | "paused" | "draft";
export type ApprovalPriority = "high" | "medium" | "low";
export type ApprovalIconType = "campaign" | "copy" | "budget" | "creative" | "report" | "workflow";

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: CampaignStatus;
  budget: string;
  spend: string;
  leads: number;
  cpl: string;
  booked: number;
}

export interface ClientStats {
  leads: number;
  booked: number;
  cpl: string;
  cpba: string;
  showRate: string;
  pipeline: string;
  revenue: string;
  spend: string;
}

export interface Client {
  id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  website: string;
  market: string;
  services: string[];
  avgJobValue: string;
  monthlyBudget: string;
  offer: string;
  brandTone: string;
  status: ClientStatus;
  notes: string;
  metaAccountId: string;
  pixelId: string;
  fbPageId: string;
  instagramId: string;
  ghlLocationId: string;
  ghlPipelineId: string;
  stats: ClientStats;
  campaigns: Campaign[];
}

export interface Approval {
  id: number;
  clientId: string;
  clientName: string;
  type: string;
  item: string;
  detail: string;
  priority: ApprovalPriority;
  submittedBy: string;
  submittedAt: string;
  iconType: ApprovalIconType;
}

// ─────────────────────────────────────────────────────────────
// CLIENT DATA
// ─────────────────────────────────────────────────────────────

export const clients: Client[] = [
  {
    id: "jj-roofing-group",
    name: "JJ Roofing Group",
    owner: "Jason Johnson",
    email: "jason@jjroofinggroup.com",
    phone: "(480) 555-0182",
    website: "jjroofinggroup.com",
    market: "Tempe, AZ",
    services: ["Roof Repair", "Roof Replacement", "Roof Inspections", "Storm Damage"],
    avgJobValue: "$12,000",
    monthlyBudget: "$1,500/mo",
    offer: "Schedule a Free Roof Inspection",
    brandTone:
      "Trustworthy, local, professional. We help Tempe homeowners protect their biggest investment.",
    status: "active",
    notes:
      "Active since March 2026. Budget focused on lead gen, not brand awareness. Owner prefers Monday morning check-ins. Increase budget during hail events in storm season.",
    metaAccountId: "act_110482930",
    pixelId: "482910372849",
    fbPageId: "JJRoofingGroup",
    instagramId: "@jjroofing_az",
    ghlLocationId: "GHL-AZ-0012",
    ghlPipelineId: "PIPE-JJ-001",
    stats: {
      leads: 27,
      booked: 7,
      cpl: "$55.56",
      cpba: "$214.29",
      showRate: "71%",
      pipeline: "$84,000",
      revenue: "$42,000",
      spend: "$1,500",
    },
    campaigns: [
      {
        id: "jj-1",
        name: "Roof Inspection Lead Generation",
        type: "Lead Generation",
        status: "active",
        budget: "$1,200/mo",
        spend: "$1,200",
        leads: 22,
        cpl: "$54.55",
        booked: 6,
      },
      {
        id: "jj-2",
        name: "Storm Damage — Retargeting",
        type: "Retargeting",
        status: "active",
        budget: "$300/mo",
        spend: "$300",
        leads: 5,
        cpl: "$60.00",
        booked: 1,
      },
    ],
  },

  {
    id: "open-forge-construction",
    name: "Open Forge Construction",
    owner: "Marcus Webb",
    email: "marcus@openforge.build",
    phone: "(404) 555-0247",
    website: "openforge.build",
    market: "Georgia",
    services: [
      "Kitchen Remodeling",
      "Bathroom Remodeling",
      "Basement Remodeling",
      "Home Remodeling",
    ],
    avgJobValue: "$30,000",
    monthlyBudget: "$3,000/mo",
    offer: "Book a Free Remodeling Consultation",
    brandTone:
      "Premium, reliable, detail-focused. We speak to homeowners investing in their forever home.",
    status: "active",
    notes:
      "Longer sales cycle — 2–4 weeks from lead to booked. Focus on quality leads over volume. Owner wants monthly strategy calls.",
    metaAccountId: "act_220594841",
    pixelId: "594830261748",
    fbPageId: "OpenForgeConstruction",
    instagramId: "@openforge_ga",
    ghlLocationId: "GHL-GA-0034",
    ghlPipelineId: "PIPE-OF-002",
    stats: {
      leads: 25,
      booked: 6,
      cpl: "$120.00",
      cpba: "$500.00",
      showRate: "68%",
      pipeline: "$180,000",
      revenue: "$90,000",
      spend: "$3,000",
    },
    campaigns: [
      {
        id: "of-1",
        name: "Kitchen Remodeling Consultation",
        type: "Lead Generation",
        status: "active",
        budget: "$1,800/mo",
        spend: "$1,800",
        leads: 15,
        cpl: "$120.00",
        booked: 4,
      },
      {
        id: "of-2",
        name: "Bathroom Remodeling Lead Campaign",
        type: "Lead Generation",
        status: "active",
        budget: "$1,200/mo",
        spend: "$1,200",
        leads: 10,
        cpl: "$120.00",
        booked: 2,
      },
    ],
  },

  {
    id: "acorns-roofing",
    name: "Acorns Roofing",
    owner: "Derek Shields",
    email: "derek@acornsroofing.com",
    phone: "(678) 555-0394",
    website: "acornsroofing.com",
    market: "Georgia",
    services: [
      "Residential Roofing",
      "Roof Repair",
      "Roof Replacement",
      "Roof Inspections",
    ],
    avgJobValue: "$10,000",
    monthlyBudget: "$2,500/mo",
    offer: "Free Roof Inspection",
    brandTone:
      "Local, honest, community-based. Georgia homeowners trust Acorns because we're neighbors first.",
    status: "setup",
    notes:
      "Currently in setup phase. Meta Pixel being installed on website. Ad account access pending. Target campaign launch in 2 weeks.",
    metaAccountId: "Pending setup",
    pixelId: "Pending setup",
    fbPageId: "AcornsRoofing",
    instagramId: "@acorns_roofing",
    ghlLocationId: "GHL-GA-0056",
    ghlPipelineId: "Pending setup",
    stats: {
      leads: 0,
      booked: 0,
      cpl: "—",
      cpba: "—",
      showRate: "—",
      pipeline: "$0",
      revenue: "$0",
      spend: "$0",
    },
    campaigns: [
      {
        id: "ac-1",
        name: "Free Roof Inspection — Georgia",
        type: "Lead Generation",
        status: "draft",
        budget: "$2,000/mo",
        spend: "$0",
        leads: 0,
        cpl: "—",
        booked: 0,
      },
      {
        id: "ac-2",
        name: "Storm Damage — Prospecting",
        type: "Prospecting",
        status: "draft",
        budget: "$500/mo",
        spend: "$0",
        leads: 0,
        cpl: "—",
        booked: 0,
      },
    ],
  },

  {
    id: "kaczmar-builders",
    name: "Kaczmar Builders",
    owner: "Stanley Kaczmar",
    email: "stan@kaczmarbuilders.com",
    phone: "216-210-3645",
    website: "kaczmarbuilders.com",
    market: "Northeast Ohio",
    services: ["Roof Replacement", "Storm Damage Inspection", "Roof Repair", "Remodeling"],
    avgJobValue: "$25,000",
    monthlyBudget: "$2,000/mo",
    offer: "Schedule a Warranty-Backed Roof Replacement Consultation",
    brandTone:
      "Friendly, direct, personable. Family-owned luxury roofing for Northeast Ohio homeowners who want quality, warranty, and a contractor they can actually trust — not just the cheapest quote.",
    status: "onboarding",
    notes:
      "Intake call completed May 2, 2026. Full onboarding intelligence extracted. GAF Certified Plus. 50-yr manufacturer + 15-yr wind + 10-yr workmanship warranty stack. Stanley (owner) on camera. Biggest bottleneck: price shoppers. Focus on luxury positioning and warranty differentiation. GHL and Meta access not yet granted.",
    metaAccountId: "Pending",
    pixelId: "Pending",
    fbPageId: "KaczmarBuilders",
    instagramId: "@kaczmar_build",
    ghlLocationId: "Pending",
    ghlPipelineId: "Pending",
    stats: {
      leads: 30,
      booked: 20,
      cpl: "$75.00",
      cpba: "$100.00",
      showRate: "100%",
      pipeline: "$0",
      revenue: "$82,000",
      spend: "$2,000",
    },
    campaigns: [],
  },
];

// ─────────────────────────────────────────────────────────────
// HELPER: look up a client by ID
// ─────────────────────────────────────────────────────────────

export function getClient(id: string): Client | undefined {
  return clients.find((c) => c.id === id);
}

// ─────────────────────────────────────────────────────────────
// APPROVALS DATA
// ─────────────────────────────────────────────────────────────

export const approvals: Approval[] = [
  {
    id: 1,
    clientId: "acorns-roofing",
    clientName: "Acorns Roofing",
    type: "Campaign Launch",
    item: "Free Roof Inspection — Georgia (Launch Approval)",
    detail:
      "Campaign draft is ready. Landing page confirmed live. GHL pipeline connected. Meta Pixel pending final verification. Budget: $2,000/mo.",
    priority: "high",
    submittedBy: "Veronica",
    submittedAt: "Today, 9:14 AM",
    iconType: "campaign",
  },
  {
    id: 2,
    clientId: "jj-roofing-group",
    clientName: "JJ Roofing Group",
    type: "Ad Copy Approval",
    item: "Roof Inspection — Headline v2",
    detail:
      '"Your roof took a hit this season. Get a free inspection before small damage becomes a $20,000 replacement." — New primary text for storm damage push in Tempe.',
    priority: "medium",
    submittedBy: "Veronica",
    submittedAt: "Today, 8:02 AM",
    iconType: "copy",
  },
  {
    id: 3,
    clientId: "open-forge-construction",
    clientName: "Open Forge Construction",
    type: "Budget Increase",
    item: "Monthly budget increase — Kitchen Remodeling Consultation +$500",
    detail:
      "Campaign has maintained $120 CPL for 3 weeks at 1.3x lead pace. Recommending increase from $1,800 to $2,300/mo to scale leads before summer.",
    priority: "medium",
    submittedBy: "Veronica",
    submittedAt: "Yesterday, 4:30 PM",
    iconType: "budget",
  },
  {
    id: 4,
    clientId: "kaczmar-builders",
    clientName: "Kaczmar Builders",
    type: "Onboarding Task",
    item: "Brand asset pack — Awaiting client submission",
    detail:
      "Logo files, brand colors, and offer creative required before campaign build can begin. Reminder sent to Tom Kaczmar on May 2.",
    priority: "low",
    submittedBy: "System",
    submittedAt: "May 2, 10:00 AM",
    iconType: "workflow",
  },
  {
    id: 5,
    clientId: "jj-roofing-group",
    clientName: "JJ Roofing Group",
    type: "Weekly Report",
    item: "Weekly performance report — May 2026 Week 1",
    detail:
      "Automated summary ready: 27 leads, 7 booked, $55.56 CPL, 71% show rate. Ready to send to Jason Johnson.",
    priority: "low",
    submittedBy: "Veronica",
    submittedAt: "Mon, 7:00 AM",
    iconType: "report",
  },
  {
    id: 6,
    clientId: "acorns-roofing",
    clientName: "Acorns Roofing",
    type: "GHL Workflow",
    item: "Lead follow-up sequence — Roof Inspection No-Show",
    detail:
      "3-step SMS sequence for leads who scheduled but didn't show. Triggers at 1h, 24h, and 48h. Requires GHL pipeline access to activate.",
    priority: "medium",
    submittedBy: "Veronica",
    submittedAt: "Sun, 3:42 PM",
    iconType: "workflow",
  },
];

// ─────────────────────────────────────────────────────────────
// BADGE VARIANT MAPS (re-exported for use across pages)
// ─────────────────────────────────────────────────────────────

export const clientStatusVariant: Record<ClientStatus, "success" | "warning" | "danger" | "neutral" | "blue" | "orange"> = {
  active: "success",
  setup: "blue",
  onboarding: "orange",
  paused: "warning",
};

export const campaignStatusVariant: Record<CampaignStatus, "success" | "warning" | "danger" | "neutral" | "blue" | "orange"> = {
  active: "success",
  paused: "warning",
  draft: "neutral",
};

export const approvalPriorityVariant: Record<ApprovalPriority, "success" | "warning" | "danger" | "neutral" | "blue" | "orange"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export const approvalPriorityLabel: Record<ApprovalPriority, string> = {
  high: "High Priority",
  medium: "Medium",
  low: "Low",
};
