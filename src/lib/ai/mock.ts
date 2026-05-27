// Mock campaign draft generator — used when AI_PROVIDER=mock or as fallback
// when a live API key is absent or a provider call fails.

import type { Client } from "@/lib/data";
import type {
  CampaignDraft,
  DraftStatus,
  MetaStructure,
  AdCopy,
  LeadForm,
  GhlWorkflow,
  CreativeDirection,
  ComplianceCheck,
  OptimizationRules,
  AdSetDefinition,
} from "@/lib/planStore";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import { KACZMAR_INTELLIGENCE } from "@/lib/clientIntelligence";
import type { CreativeAsset } from "@/lib/creativeAssets";
import { runMarketResearchAgent } from "@/lib/agents/marketResearch";
import { runBuyerPsychologyAgent } from "@/lib/agents/buyerPsychology";
import { runCreativeAnalysisAgent, buildAssetAdVariation, type StoredAssetAnalysis } from "@/lib/agents/creativeAnalysis";
import type { CreativeAnalysisInput, CreativeAnalysisResult, WeeklyReportInput, WeeklyReportDraft } from "@/lib/ai/prompts";

export function mockTimestamp(): string {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────
// sanitizeDraftText — strips undefined/null/NaN/[object Object] from
// any string that will be shown to the user. Prevents placeholder leakage.
// ─────────────────────────────────────────────────────────────

export function sanitizeDraftText(text: string | null | undefined, fallback = ""): string {
  if (text === null || text === undefined) return fallback;
  return String(text)
    // Remove bare undefined, null, NaN, [object Object]
    .replace(/\bundefined\b/g, "")
    .replace(/\bnull\b/g, "")
    .replace(/\bNaN\b/g, "")
    .replace(/\[object Object\]/g, "")
    // Collapse multiple consecutive spaces
    .replace(/ {2,}/g, " ")
    // Remove trailing period/comma before whitespace or end
    .replace(/\s+([.,])\s*$/g, "")
    // Remove dangling punctuation at start of sentence after removal
    .replace(/\.\s*\./g, ".")
    .trim() || fallback;
}

// ─────────────────────────────────────────────────────────────
// Mock intelligence extraction — returns Kaczmar-style realistic data
// ─────────────────────────────────────────────────────────────

export function mockExtractIntelligence(clientId: string, _summary: string): ClientIntelligence {
  // In mock mode, return the Kaczmar intelligence as the realistic example.
  // When real AI is wired up, this path is replaced with AI parsing.
  return {
    ...KACZMAR_INTELLIGENCE,
    clientId,
    extractedAt: mockTimestamp(),
  };
}

// ─────────────────────────────────────────────────────────────
// Mock campaign draft generator
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Intelligence normalizer
// AI-extracted ClientIntelligence may be missing array fields that are present
// in the TypeScript interface but absent from the extraction schema sent to the AI.
// Accessing undefined[0] throws; this guard ensures every array field is at least [].
// ─────────────────────────────────────────────────────────────

function normalizeIntel(raw: ClientIntelligence | null): ClientIntelligence | null {
  if (!raw) return null;
  const a = <T>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);
  return {
    ...raw,
    serviceArea: {
      ...raw.serviceArea,
      cities: a(raw.serviceArea?.cities),
      bestNeighborhoods: a(raw.serviceArea?.bestNeighborhoods),
      targetZips: a(raw.serviceArea?.targetZips),
    },
    targetMarket: {
      ...raw.targetMarket,
      occupations: a(raw.targetMarket?.occupations),
      preferredJobTypes: a(raw.targetMarket?.preferredJobTypes),
    },
    buyerProfile: {
      ...raw.buyerProfile,
      trustTriggers: a(raw.buyerProfile?.trustTriggers),
      commonObjections: a(raw.buyerProfile?.commonObjections),
      commonFears: a(raw.buyerProfile?.commonFears),
      buyingMotivations: a(raw.buyerProfile?.buyingMotivations),
      urgencyTriggers: a(raw.buyerProfile?.urgencyTriggers),
      whyTheyChoose: a(raw.buyerProfile?.whyTheyChoose),
      reasonsTheyDelay: a(raw.buyerProfile?.reasonsTheyDelay),
    },
    marketResearch: {
      ...raw.marketResearch,
      mainCompetitors: a(raw.marketResearch?.mainCompetitors),
      competitorStrengths: a(raw.marketResearch?.competitorStrengths),
      competitorWeaknesses: a(raw.marketResearch?.competitorWeaknesses),
      opportunities: a(raw.marketResearch?.opportunities),
      risks: a(raw.marketResearch?.risks),
      serviceAreas: a(raw.marketResearch?.serviceAreas),
      highValueNeighborhoods: a(raw.marketResearch?.highValueNeighborhoods),
    },
    offerIntelligence: {
      ...raw.offerIntelligence,
      guarantees: a(raw.offerIntelligence?.guarantees),
      proofPoints: a(raw.offerIntelligence?.proofPoints),
      secondaryOffers: a(raw.offerIntelligence?.secondaryOffers),
      servicePriorities: a(raw.offerIntelligence?.servicePriorities),
      mostProfitableServices: a(raw.offerIntelligence?.mostProfitableServices),
      jobsTheyWantMore: a(raw.offerIntelligence?.jobsTheyWantMore),
      jobsTheyWantLess: a(raw.offerIntelligence?.jobsTheyWantLess),
    },
    salesIntelligence: {
      ...raw.salesIntelligence,
      // testimonials is in the TypeScript interface but NOT in the AI extraction schema.
      // It will always be undefined for AI-extracted intelligence.
      testimonials: a(raw.salesIntelligence?.testimonials),
      bestSalesAngles: a(raw.salesIntelligence?.bestSalesAngles),
      worstFitLeads: a(raw.salesIntelligence?.worstFitLeads),
      commonObjections: a(raw.salesIntelligence?.commonObjections),
      objectionResponses: a(raw.salesIntelligence?.objectionResponses),
      faqs: a(raw.salesIntelligence?.faqs),
      pastClientWins: a(raw.salesIntelligence?.pastClientWins),
      reviewHighlights: a(raw.salesIntelligence?.reviewHighlights),
    },
    brandIntelligence: {
      ...raw.brandIntelligence,
      whyCustomersTrust: a(raw.brandIntelligence?.whyCustomersTrust),
      whatNotToSay: a(raw.brandIntelligence?.whatNotToSay),
      complianceNotes: a(raw.brandIntelligence?.complianceNotes),
    },
    contentPlanning: {
      ...raw.contentPlanning,
      recommendedContentThemes: a(raw.contentPlanning?.recommendedContentThemes),
    },
    campaignImplications: {
      ...raw.campaignImplications,
      bestCampaignAngles: a(raw.campaignImplications?.bestCampaignAngles),
      servicesToPrioritize: a(raw.campaignImplications?.servicesToPrioritize),
      offersToTest: a(raw.campaignImplications?.offersToTest),
      creativeFormats: a(raw.campaignImplications?.creativeFormats),
      leadFormQuestions: a(raw.campaignImplications?.leadFormQuestions),
      followUpStrategy: a(raw.campaignImplications?.followUpStrategy),
      whatNotToSay: a(raw.campaignImplications?.whatNotToSay),
    },
    // salesAudit — AI extraction schema includes avgResponseTime, lostLeadRecovery, leadFallOffPoint
    // but NOT all fields. Guard against undefined access on every field.
    salesAudit: {
      leadProcess: raw.salesAudit?.leadProcess ?? "",
      avgResponseTime: raw.salesAudit?.avgResponseTime ?? "5 minutes",
      whoAnswersCalls: raw.salesAudit?.whoAnswersCalls ?? "",
      hasSalesScript: raw.salesAudit?.hasSalesScript ?? false,
      inspectionBookingProcess: raw.salesAudit?.inspectionBookingProcess ?? "",
      estimatePresentation: raw.salesAudit?.estimatePresentation ?? "",
      followUpCadence: raw.salesAudit?.followUpCadence ?? "",
      lostLeadRecovery: raw.salesAudit?.lostLeadRecovery ?? "",
      leadFallOffPoint: raw.salesAudit?.leadFallOffPoint ?? "",
    },
  };
}

export function generateMockPlan(
  client: Client,
  goal: string,
  service: string,
  market: string,
  budget: string,
  creativeType: string,
  intelligence?: ClientIntelligence | null,
  selectedAsset?: CreativeAsset | null,
  selectedAssets?: CreativeAsset[],
  assetNotes?: Record<string, string>,
  assetAnalyses?: Record<string, StoredAssetAnalysis>
): CampaignDraft {
  const budgetNum = parseInt(budget.replace(/[^0-9]/g, "")) || 1500;
  const adSpend = Math.round(budgetNum * 0.85);
  const reserveBudget = budgetNum - adSpend;
  const as1Budget = Math.round(adSpend * 0.5);
  const as2Budget = Math.round(adSpend * 0.3);
  const as3Budget = adSpend - as1Budget - as2Budget;

  const svc = service.toLowerCase();
  const cat =
    svc.includes("roof") || svc.includes("storm") || svc.includes("inspection")
      ? "roofing"
      : svc.includes("kitchen") ||
        svc.includes("bathroom") ||
        svc.includes("basement") ||
        svc.includes("remodel")
      ? "remodeling"
      : "construction";

  const isRoofing = cat === "roofing";
  // Normalize intelligence before any access — AI-extracted intel may be missing array
  // fields that are present in the TypeScript interface but absent from the extraction schema.
  const intel = normalizeIntel(intelligence ?? null);
  const hasIntel = !!intel;

  // Run agents eagerly so their output is available throughout (creativeDirection, rationale, etc.)
  const psych = hasIntel
    ? runBuyerPsychologyAgent(intel.buyerProfile, intel.campaignImplications, service)
    : null;
  const mktResearch = hasIntel
    ? runMarketResearchAgent(intel.marketResearch, intel.serviceArea, intel.targetMarket, intel.campaignImplications, service)
    : null;

  // Creative analysis — runs whenever an asset or creative type is provided
  const effectiveCreativeType = selectedAsset?.assetType ?? creativeType ?? (isRoofing ? "Inspection Day" : "Before/After");
  const creativeAnalysis = runCreativeAnalysisAgent(
    effectiveCreativeType,
    service,
    selectedAsset?.approvedForAds ?? true,
    selectedAsset?.notes
  );

  // Pull from intelligence when available
  const serviceAreas = hasIntel ? intel.serviceArea.cities.slice(0, 4).join(", ") : market;
  const bestNeighborhoods = hasIntel ? intel.serviceArea.bestNeighborhoods.slice(0, 3) : [];
  const trustTriggers = hasIntel ? intel.buyerProfile.trustTriggers : [];
  const mainOffer = hasIntel ? intel.offerIntelligence.mainOffer : (isRoofing ? "Schedule a free roof inspection" : "Book a free consultation");
  const offerCta = hasIntel
    ? (intel.campaignImplications.offersToTest[0] ?? (isRoofing ? "Book My Free Inspection" : "Book My Free Consultation"))
    : (isRoofing ? "Get My Free Inspection" : "Book My Free Consultation");

  const primaryOffer = hasIntel ? intel.offerIntelligence.mainOffer : (isRoofing ? "free roof inspection" : "free consultation");
  const locationDesc = hasIntel
    ? `${serviceAreas} and surrounding ${intel.serviceArea.state} suburbs`
    : `${market} area`;

  const goalObjectiveMap: Record<string, string> = {
    "Lead Generation": "LEAD_GENERATION",
    Retargeting: "CONVERSIONS",
    "Brand Awareness": "AWARENESS",
    Conversion: "CONVERSIONS",
  };

  // Audience — use intelligence for richer targeting
  const audienceDesc = hasIntel
    ? `Homeowners · ${serviceAreas} ±20mi · Ages ${intel.targetMarket.idealAgeRange} · HHI ${intel.targetMarket.householdIncome} · Interests: Home Improvement, Homeowners Insurance, Roofing, Real Estate · Best neighborhoods: ${bestNeighborhoods.join(", ")} · Est. reach: 30,000–90,000`
    : isRoofing
    ? `Homeowners · ${market} ±15mi · Ages 30–65 · Home Ownership: Yes · Interests: Home Improvement, Homeowners Insurance, Roofing · Est. reach: 45,000–120,000`
    : `Homeowners · ${market} ±20mi · Ages 35–65 · HHI $75k+ · Interests: Home Improvement, Interior Design, Kitchen & Bath · Est. reach: 30,000–90,000`;

  const locationLabel = hasIntel ? serviceAreas : market;

  const adSetNames = isRoofing
    ? [
        `${locationLabel} — Broad Homeowner Prospecting`,
        `${locationLabel} — Storm & Roof Replacement Intent`,
        `${locationLabel} — Retargeting & Social Proof`,
      ]
    : [
        `${locationLabel} — High-Intent Homeowner Prospecting`,
        `${locationLabel} — Home Improvement Decision Intent`,
        `${locationLabel} — Retargeting & Social Proof`,
      ];

  const adSets: AdSetDefinition[] = isRoofing
    ? [
        {
          name: adSetNames[0],
          purpose:
            "Cold prospecting — homeowners aged 30–65 who own a home in the service area. Broad targeting to maximize new lead volume at lowest CPL.",
          audience: audienceDesc,
          locationTargeting: `${locationLabel} ±15mi`,
          placements: ["Facebook Feed", "Instagram Feed", "Facebook Reels", "Instagram Reels", "Facebook Stories", "Instagram Stories"],
          budgetSplit: "50%",
          budgetAmount: `$${as1Budget}/mo`,
          optimizationEvent: "LEAD (Meta Instant Form Submit)",
          audienceTemperature: "cold",
          requiredForLaunch: true,
        },
        {
          name: adSetNames[1],
          purpose:
            "High-intent targeting — homeowners showing storm damage research, insurance claim awareness, or roof replacement comparison signals. Smaller pool, higher intent.",
          audience: `Homeowners · Ages 30–65 · ${locationLabel} ±15mi · Intent signals: storm damage search, insurance claim research, roof replacement shopping · Est. reach: 8,000–25,000`,
          locationTargeting: `${locationLabel} ±15mi`,
          placements: ["Facebook Feed", "Instagram Feed", "Facebook Reels", "Instagram Reels"],
          budgetSplit: "30%",
          budgetAmount: `$${as2Budget}/mo`,
          optimizationEvent: "LEAD (Meta Instant Form Submit)",
          audienceTemperature: "hot",
          requiredForLaunch: true,
        },
        {
          name: adSetNames[2],
          purpose:
            "Warm retargeting — website visitors, page engagers, and video viewers. Uses social proof creative to convert warm audiences. Requires Pixel + Facebook Page to run.",
          audience: `30-day website visitors · Facebook page engagers · Video viewers (25%+) · ${locationLabel} ±15mi · Est. reach: 2,000–8,000`,
          locationTargeting: `${locationLabel} ±15mi`,
          placements: ["Facebook Feed", "Instagram Feed", "Facebook Stories", "Instagram Stories"],
          budgetSplit: "20%",
          budgetAmount: `$${as3Budget}/mo`,
          optimizationEvent: "LEAD (Meta Instant Form Submit)",
          audienceTemperature: "warm",
          requiredForLaunch: false,
          launchBlocker: "Requires Meta Pixel + Facebook Page ID in Integration Settings before this ad set can run.",
        },
      ]
    : [
        {
          name: adSetNames[0],
          purpose:
            "Cold prospecting — homeowners aged 35–65 with home improvement interest in the service area. Broad targeting to drive new consultation leads.",
          audience: audienceDesc,
          locationTargeting: `${locationLabel} ±20mi`,
          placements: ["Facebook Feed", "Instagram Feed", "Facebook Reels", "Instagram Reels", "Facebook Stories", "Instagram Stories"],
          budgetSplit: "50%",
          budgetAmount: `$${as1Budget}/mo`,
          optimizationEvent: goal === "Lead Generation" ? "LEAD (Meta Instant Form Submit)" : "OFFSITE_CONVERSION → Lead",
          audienceTemperature: "cold",
          requiredForLaunch: true,
        },
        {
          name: adSetNames[1],
          purpose:
            "Mid-funnel decision intent — homeowners actively researching remodeling projects, comparing pricing, or evaluating contractors.",
          audience: `Homeowners · Ages 35–65 · ${locationLabel} ±20mi · Intent signals: remodeling search, home improvement research, contractor comparison · Est. reach: 10,000–30,000`,
          locationTargeting: `${locationLabel} ±20mi`,
          placements: ["Facebook Feed", "Instagram Feed", "Facebook Reels", "Instagram Reels"],
          budgetSplit: "30%",
          budgetAmount: `$${as2Budget}/mo`,
          optimizationEvent: goal === "Lead Generation" ? "LEAD (Meta Instant Form Submit)" : "OFFSITE_CONVERSION → Lead",
          audienceTemperature: "hot",
          requiredForLaunch: true,
        },
        {
          name: adSetNames[2],
          purpose:
            "Warm retargeting — website visitors, page engagers, and video viewers. Social proof creative closes warm audiences. Requires Pixel + Facebook Page to run.",
          audience: `60-day website visitors · Facebook page engagers · Video viewers (25%+) · ${locationLabel} ±20mi · Est. reach: 1,500–6,000`,
          locationTargeting: `${locationLabel} ±20mi`,
          placements: ["Facebook Feed", "Instagram Feed", "Facebook Stories", "Instagram Stories"],
          budgetSplit: "20%",
          budgetAmount: `$${as3Budget}/mo`,
          optimizationEvent: goal === "Lead Generation" ? "LEAD (Meta Instant Form Submit)" : "OFFSITE_CONVERSION → Lead",
          audienceTemperature: "warm",
          requiredForLaunch: false,
          launchBlocker: "Requires Meta Pixel + Facebook Page ID in Integration Settings before this ad set can run.",
        },
      ];

  const metaStructure: MetaStructure = {
    campaignObjective: goalObjectiveMap[goal] ?? "LEAD_GENERATION",
    campaignType: goal === "Lead Generation" ? "Instant Form (Native Lead Form)" : "Link Click → Landing Page",
    adSetNames,
    adSets,
    audience: audienceDesc,
    locationTargeting: hasIntel
      ? `Target cities: ${intel.serviceArea.cities.join(", ")} · Target ZIPs: ${intel.serviceArea.targetZips.slice(0, 6).join(", ")} · Premium neighborhood targeting enabled · Mobile-first`
      : `Primary city: ${market} · Radius: ±${isRoofing ? "15" : "20"}mi · DMA-level targeting · Mobile-first · Exclude: business/commercial zones`,
    placements: [
      "Facebook Feed",
      "Instagram Feed",
      "Facebook Reels",
      "Instagram Reels",
      "Facebook Stories",
      "Instagram Stories",
    ],
    budgetSplit: `Total: $${budgetNum.toLocaleString()}/mo · Ad spend: $${adSpend}/mo · Reserve: $${reserveBudget}/mo · AS1 Broad (50%): $${as1Budget}/mo · AS2 Intent (30%): $${as2Budget}/mo · AS3 Retargeting (20%): $${as3Budget}/mo`,
    optimizationEvent: goal === "Lead Generation" ? "LEAD (Meta Instant Form Submit)" : "OFFSITE_CONVERSION → Lead",
  };

  // Ad copy — use intelligence for Kaczmar-specific angles
  const ownerName = hasIntel ? intel.companyProfile.ownerName.split(" ")[0] : client.owner.split(" ")[0];
  const warrantyDetail = hasIntel && intel.offerIntelligence.guarantees.length > 0
    ? intel.offerIntelligence.guarantees[0]
    : "50-year manufacturer warranty";
  const uniqueAngle = hasIntel ? intel.brandIntelligence.uniqueMechanism : "";
  const objection = hasIntel && intel.buyerProfile.commonObjections.length > 0
    ? intel.buyerProfile.commonObjections[0]
    : "getting the cheapest quote";

  const primaryTexts = hasIntel && isRoofing
    ? [
        `Most homeowners pick a roofer based on price — and regret it when the roof fails in year 3.\n\n${client.name} is different. ${ownerName} is a GAF Certified Plus contractor offering ${warrantyDetail}. That means you're not getting a cheap install that gets re-done in 5 years. You're getting a roof that lasts.\n\nSchedule your free roof inspection today — no pressure, just honest answers from a local family business that puts its name on every project.`,
        `If ${objection} is on your mind, here's what most homeowners don't know: the cheapest quote usually means cheap materials, no warranties, and subcontractors who've never met the owner.\n\n${client.name} offers a triple warranty: ${intel.offerIntelligence.guarantees.slice(0, 3).join(" + ")}.\n\n${ownerName} shows up personally. Your roof gets done right. Book your free inspection — ${locationDesc}.`,
        `"${intel.salesIntelligence.testimonials[0] ?? `${ownerName} was at my door within hours and found damage I didn't know existed. Professional from start to finish.`}" — ${intel.serviceArea.cities[0] ?? market} homeowner\n\nSee why ${locationDesc} homeowners trust ${client.name} for their most important investment. Free roof inspection — honest, no-pressure, family-owned.`,
      ]
    : isRoofing
    ? [
        `Your roof protects everything that matters. Don't let hidden damage turn into a $20,000 replacement. ${client.name} offers free roof inspections for ${market} homeowners — no pressure, no obligation. If we find damage, we'll show you exactly what needs fixing and walk you through your options honestly. Schedule your free inspection today.`,
        `Storm season doesn't wait — and neither should you. ${client.name} is offering free roof inspections across ${market} right now. In 45 minutes, we'll tell you exactly what shape your roof is in, what it'll cost to address, and what your realistic options are. No surprises. No pressure. Just honest answers.`,
        `"I had no idea my roof was damaged until ${client.name} found it during my free inspection. Professional from start to finish." — Real ${market} homeowner. Schedule your free inspection today. We've served ${market} homeowners and we'll give you the honest truth about your roof.`,
      ]
    : [
        `Your home should reflect your vision. At ${client.name}, we specialize in premium remodeling across ${market} — from concept to completion with zero surprises. Transparent pricing, clear timelines, and craftsmanship that lasts decades. Book your free consultation today.`,
        `What would your home look like if everything was exactly the way you wanted it? ${client.name} has helped ${market} homeowners transform their spaces with premium craftsmanship and zero stress. Book your free consultation and let's talk about what's possible.`,
        `"We've been thinking about remodeling for years. ${client.name} made it easy from the first call." — ${market} homeowner. If you're ready to finally make it happen, book your free consultation. Transparent pricing. No hidden costs. Just quality work.`,
      ];

  const headlines = hasIntel && isRoofing
    ? [
        `${warrantyDetail} — ${intel.serviceArea.cities[0] ?? market}`,
        `Family-Owned Roofing You Can Actually Trust`,
        `Quality Over the Cheapest Quote — Free Inspection`,
      ]
    : isRoofing
    ? [
        `Free Roof Inspection in ${market} — Schedule Today`,
        `${market} Homeowners: Is Your Roof Storm-Ready?`,
        `Don't Wait Until It's Too Late — Free Roof Check`,
      ]
    : [
        `Transform Your ${svc.includes("kitchen") ? "Kitchen" : svc.includes("bathroom") ? "Bathroom" : "Home"} — Free Consult`,
        `Premium Remodeling in ${market} — Book Your Design Call`,
        `${market} Remodeling Done Right — Free Consultation`,
      ];

  const descriptions = isRoofing
    ? hasIntel
      ? [
          `GAF Certified Plus · Family-Owned · ${intel.serviceArea.state}`,
          `Triple warranty stack · Honest inspections · No pressure`,
          `Free inspection for ${intel.serviceArea.cities[0] ?? market} homeowners`,
        ]
      : [
          `Licensed & insured. Honest inspections for ${market} homeowners.`,
          `Free inspection — no commitment. Know your roof's true condition.`,
          `Storm damage? Get answers before it costs you more.`,
        ]
    : [
        `Premium craftsmanship in ${market}. Transparent pricing.`,
        `Free consultation — no commitment. Let's talk possibilities.`,
        `Trusted by ${market} homeowners for quality that lasts.`,
      ];

  const adCopy: AdCopy = { primaryTexts, headlines, descriptions, cta: offerCta };

  // Lead form — use intelligence questions when available
  const qualificationQuestions = hasIntel && intel.campaignImplications.leadFormQuestions.length > 0
    ? intel.campaignImplications.leadFormQuestions.slice(0, 4)
    : isRoofing
    ? [
        "How old is your roof? (Approximate)",
        "Have you noticed any leaks, missing shingles, or visible damage?",
        "Do you own the home?",
      ]
    : [
        "Which project are you most interested in?",
        "What is your approximate project budget?",
        "What is your target timeline to begin?",
      ];

  const leadForm: LeadForm = {
    formName: `${service} — ${client.name} — ${locationDesc}`,
    introCopy: hasIntel
      ? `${mainOffer} with ${client.name}. ${ownerName} is personally involved in every project — you get honest answers, no pressure, and a clear picture of what your roof needs. ${intel.offerIntelligence.financingAvailable ? `Financing available: ${intel.offerIntelligence.financingAvailable}.` : ""}`
      : isRoofing
      ? `Schedule your free roof inspection with ${client.name}. Takes 45 minutes. No pressure. We'll tell you exactly what your roof needs — and whether you have an insurance claim worth filing.`
      : `Book your free consultation with ${client.name}. We'll walk through your project, answer every question, and give you a clear picture of timeline and cost — no obligation.`,
    qualificationQuestions,
    contactFields: ["First Name", "Last Name", "Phone Number", "Email Address", "Home Address / Zip Code"],
    consentLanguage: `By submitting this form, you agree to be contacted by ${client.name} via phone, SMS, and email. Message and data rates may apply. Reply STOP to opt out. We will never share your information with third parties. View our Privacy Policy at [URL].`,
    thankYouCopy: hasIntel
      ? `Thanks, [First Name]. Your request is confirmed. ${ownerName} from ${client.name} will contact you within ${intel.salesAudit?.avgResponseTime ?? "5 minutes"} to schedule your free${isRoofing ? " roof inspection" : " consultation"}.`
      : isRoofing
      ? `Thanks, [First Name]. Your free inspection request is confirmed. ${client.owner} from ${client.name} will contact you shortly to schedule a convenient time. Watch your phone!`
      : `Thanks, [First Name]. Your free consultation request is confirmed. ${client.owner} from ${client.name} will reach out shortly to get you scheduled. We look forward to hearing about your project!`,
  };

  // GHL workflow — use intelligence for follow-up strategy
  const followUpSteps = hasIntel && intel.campaignImplications.followUpStrategy.length > 0
    ? intel.campaignImplications.followUpStrategy
    : [];

  const ghlWorkflow: GhlWorkflow = {
    tags: isRoofing
      ? ["roof-lead", "meta-lead", "free-inspection", locationDesc.toLowerCase().replace(/[,\s]+/g, "-")]
      : ["remodel-lead", "meta-lead", "free-consultation", locationDesc.toLowerCase().replace(/[,\s]+/g, "-")],
    pipelineStage: "New Lead",
    immediateSms: `Hi [First Name], this is ${ownerName} from ${client.name}. We just received your request for a ${primaryOffer} — we'll call you within the next 5 minutes to get you scheduled. Watch for our call! Book directly: [Calendar Link]`,
    immediateEmail: {
      subject: `Your ${isRoofing ? "Free Roof Inspection" : "Free Consultation"} Request — ${client.name}`,
      body: `Hi [First Name],\n\nGreat news — we received your request and you're next on our list.\n\nHere's what happens next:\n  1. ${ownerName} will call you within 5 minutes\n  2. We'll find a time that works for your schedule\n  3. ${isRoofing ? "Our certified inspector will arrive at your home and give you a complete honest assessment — at no cost." : "We'll walk through your project, answer every question, and give you a clear plan with transparent pricing."}\n\nNeed to book right now? → [Calendar Link]\n\nTalk soon,\n${ownerName}\n${client.name}\n${client.phone}`,
    },
    internalNotification: `🔔 NEW LEAD — [Full Name] · ${locationDesc} · ${service} · Meta Instant Form\nPhone: [Phone] · Source: ${goal} campaign\nAssign to: ${ownerName} · Required response: 5 minutes`,
    setterTask: `Call [First Name] at [Phone Number] within 5 minutes of lead submission. Goal: Book ${primaryOffer}. If no answer: leave 15-second voicemail + send SMS #2 immediately. Log outcome in GHL.`,
    aiVoiceTrigger: `Trigger: No outbound call placed within 10 minutes of lead submission.\nScript: "Hi, is this [First Name]? My name is [AI Agent Name] and I'm calling on behalf of ${client.name} — you just requested a ${primaryOffer} and I wanted to make sure we connect you right away. Are mornings or afternoons better for your schedule?"`,
    bookedStopCondition: `STOP: If contact reaches stage "Appointment Booked" → immediately stop all SMS sequences. Trigger confirmation flow. Add tag: "appointment-confirmed". Remove tag: "follow-up-active".`,
    steps: followUpSteps.length > 0
      ? [
          `Trigger: New Meta lead — "${service} — ${goal} — ${locationDesc}"`,
          ...followUpSteps.map((step, i) => `Step ${i + 1}: ${step}`),
          `STOP: Appointment booked → Cancel all sequences, trigger confirmation flow`,
        ]
      : [
          `Trigger: New Meta lead submitted — "${service} — ${goal} — ${market}"`,
          `Step 1 (0 min): Apply tags · Set pipeline stage: New Lead`,
          `Step 2 (0 min): Send immediate SMS — personalized intro + calendar link`,
          `Step 3 (1 min): Send immediate email — confirmation + next steps`,
          `Step 4 (1 min): Create internal notification → assign to ${ownerName}`,
          `Step 5 (1 min): Create setter task — "Call [First Name] within 5 min"`,
          `Step 6 (10 min): If no call → trigger AI voice follow-up`,
          `Step 7 (1 hr): If not booked → Follow-up SMS #2`,
          `Step 8 (24 hr): If not booked → SMS #3 + manual call task`,
          `Step 9 (48 hr): Final SMS + move to "Attempted" stage`,
          `Step 10 (7 days): No response → 30-day cold nurture drip`,
          `STOP: Appointment booked → Cancel all sequences`,
        ],
  };

  const creativeAngle = hasIntel && intel.contentPlanning.recommendedContentThemes.length > 0
    ? intel.contentPlanning.recommendedContentThemes[0]
    : creativeType || (isRoofing ? "Owner On Camera — Trust-First Roof Inspection" : "Before/After Transformation");

  const creativeDirection: CreativeDirection = isRoofing
    ? {
        angle: creativeAngle,
        hook: hasIntel
          ? `"${psych?.resonatingHooks?.[0] ?? `Your roof protects everything that matters — is it protecting you?`}"`
          : `"Your neighbor's roof failed last week. Is yours next?"`,
        shotList: hasIntel && intel.contentPlanning.ownerOnCamera
          ? [
              `${ownerName} on camera — direct intro: "Hi, I'm ${ownerName} from ${client.name}. Here's the honest truth about your roof."`,
              "Drone shot over premium neighborhood — pan across rooftops in target service area",
              "Close-up of roof damage — missing shingles, water staining, storm damage",
              `${ownerName} with homeowner — pointing out damage, building rapport, honest conversation`,
              "Before/after split — damaged roof left, completed GAF replacement right",
              "Happy homeowner with new roof — genuine relief and satisfaction",
              `${ownerName} handing over warranty paperwork — the 3-warranty stack explanation on camera`,
            ]
          : [
              "Drone shot of neighborhood — scan across rooftops, linger on damaged shingles",
              "Inspector arriving at home — handshake, friendly confident energy",
              "Close-up of roof damage — missing shingles, water staining, granule loss",
              "Inspector pointing out damage to homeowner",
              "Before/After split — damaged roof left, completed replacement right",
              "Happy homeowner looking up at new roof — relief, satisfaction",
              "Final shot: inspector handing over report — CTA text overlay",
            ],
        textOverlays: hasIntel
          ? [
              `"${intel.serviceArea.cities[0] ?? market}'s Trusted Family-Owned Roofer" (opening)`,
              `"${warrantyDetail}" (trust anchor — bold white on dark bg)`,
              `"GAF Certified Plus · Family-Owned · ${intel.serviceArea.state}" (credibility)`,
              `"Free Roof Inspection — No Pressure →" (CTA, orange)`,
            ]
          : [
              `"Free Roof Inspection — ${market}" (opening hook, white bold on dark bg)`,
              `"Your roof could be damaged right now" (middle tension build)`,
              `"${client.name} — Trusted in ${market}" (credibility badge)`,
              `"Schedule Free Inspection Today →" (closing CTA, orange button style)`,
            ],
        voiceoverScript: hasIntel
          ? `[0–3s] "Is your roof actually protected — or just covered?" [3–8s] "Most homeowners don't find out until it's too late. And when they do, the cheapest roofer they hired is nowhere to be found." [8–18s] "${client.name} is different. ${ownerName} is GAF Certified Plus, meaning every roof comes with ${intel.offerIntelligence.guarantees.slice(0, 2).join(" and ")}. That's not a sales pitch — that's a written guarantee." [18–25s] "We serve ${serviceAreas} and the surrounding areas. Free inspection, honest answers, no pressure." [25–30s] "Tap below to schedule your free inspection today."`
          : `[0–3s] "Is your roof hiding storm damage?" [3–8s] "Most homeowners don't find out until it's too late — and it costs thousands more to fix." [8–18s] "${client.name} is offering free roof inspections across ${market} right now." [18–25s] "If we find damage, we'll show you exactly what needs fixing." [25–30s] "Tap below to schedule your free inspection today."`,
        recommendedFormat: "9:16 vertical video (15–30 sec) for Reels/Stories · 1:1 static image for Feed · 4:5 video for Facebook Feed",
        recommendedPlacements: ["Instagram Reels (primary)", "Facebook Reels", "Instagram Stories", "Facebook Stories", "Instagram Feed", "Facebook Feed"],
      }
    : {
        angle: creativeAngle,
        hook: `"What would your home look like if you actually built it the way you always imagined?"`,
        shotList: [
          "Before footage: dated kitchen or bathroom — dim, crowded, old fixtures",
          "Transformation timelapse: demo → framing → tile → final reveal",
          "Reveal moment: owner opens door/turns corner to see finished space",
          "Hero shot: completed project — wide angle, great lighting",
          "Detail shots: hardware, countertops, tile work, lighting",
          "Owner reaction: genuine surprise and satisfaction",
          "Team shot: crew with owner outside home",
        ],
        textOverlays: [
          `"Before" (left) / "After" (right)`,
          `"Premium ${svc.includes("kitchen") ? "Kitchen" : svc.includes("bathroom") ? "Bathroom" : "Home"} Remodeling in ${market}"`,
          `"${client.name} — Free Consultation"`,
          `"Book Your Free Design Call Today →" (closing CTA)`,
        ],
        voiceoverScript: `[0–3s] "What if your home actually looked the way you always imagined it?" [3–10s] "At ${client.name}, we turn that vision into reality — no surprises, no stress, just premium craftsmanship." [10–20s] "We've transformed kitchens, bathrooms, and entire homes across ${market}. Free consultation, transparent quote, and a timeline we stick to." [27–30s] "Book your free consultation today."`,
        recommendedFormat: "9:16 vertical video (15–30 sec) for Reels · 4:5 carousel for Feed · 1:1 static hero shot",
        recommendedPlacements: ["Instagram Reels (primary)", "Instagram Feed Carousel", "Facebook Reels", "Facebook Feed", "Instagram Stories"],
      };

  const compliance: ComplianceCheck = {
    metaRisk: isRoofing
      ? "MEDIUM — Storm damage and insurance claim language is a flagged category. Ads referencing insurance claims require careful phrasing. Review before submission."
      : "LOW — Standard home improvement offer. No special categories triggered. Standard review process.",
    smsCompliance:
      "All SMS contacts must have opted in via the Meta lead form with explicit TCPA consent language visible before submission. Maintain opt-in records. Honor STOP requests within 10 minutes.",
    insuranceRisk: isRoofing
      ? "Do not imply guaranteed insurance claim approval. Do not use 'insurance will cover it' or 'file a claim and pay nothing.' Use: 'we'll help you understand your options.'"
      : "N/A — No insurance claim language in this campaign category.",
    // disallowedPhrases: phrases FOUND in generated copy that violate Meta/compliance rules.
    // This field drives the Safety tab "Disallowed Phrases" check.
    // The mock generator does not produce banned phrases, so this is intentionally empty.
    // Anthropic-generated strategy copy is pre-screened by compliance guardrails in the system prompt.
    disallowedPhrases: [],
    approvalWarnings: [
      "⚠ Verify all copy is free of insurance guarantee language before Meta submission",
      "⚠ Lead form consent language — verify privacy policy URL is live and accurate",
      `⚠ Before/after imagery — must be authentic ${client.name} work, not stock photos`,
      "⚠ SMS sequence — verify TCPA consent is captured in lead form before activating",
      ...(isRoofing ? [
        "⚠ Do NOT use: 'insurance will cover it', 'guaranteed approval', '100% covered', 'free replacement', 'best roofer in [city]', or any guaranteed outcome language",
        "⚠ Safe replacements: 'free roof inspection', 'we can document visible storm damage for your records', 'we will help you understand your options'",
      ] : [
        "⚠ Do NOT use: 'best contractor in [city]', 'guaranteed to increase home value', 'limited spots available' without enforcing the limit",
      ]),
      ...(hasIntel && intel.brandIntelligence.complianceNotes.length > 0
        ? intel.brandIntelligence.complianceNotes.map((n) => `⚠ ${n}`)
        : []),
    ],
  };

  const cplTarget = isRoofing ? 75 : 130;
  const cpbaTarget = isRoofing ? 300 : 500;

  const optimization: OptimizationRules = {
    cplThreshold: `Pause ad set if CPL exceeds $${cplTarget} for 7 consecutive days. Flag for copy/creative review. Require human approval before resuming.`,
    cpbaThreshold: `Alert if CPBA exceeds $${cpbaTarget} for 14 consecutive days. Trigger booking rate analysis. Require human review of follow-up sequence.`,
    bookingRateFloor: `Alert if booking rate falls below 25% for 14+ days. Trigger: review setter performance + SMS sequence. Require human approval to continue spend.`,
    creativeFatigueTrigger: `Flag creative for refresh when CTR drops more than 20% vs 7-day rolling average. Notify operator. Do not auto-pause — require human approval.`,
    budgetScalingRule: `Recommend budget increase of 20% when leads exceed 1.4x monthly pace for 5+ consecutive days AND CPL is at or below target. Require human approval before executing.`,
    pauseRule: `Auto-pause: ad sets with CPL >2x threshold for 14+ days AND no improvement trend. Notify operator immediately. Require human approval to resume or redirect budget.`,
    humanApprovalTriggers: [
      "Budget increase of any amount",
      "New creative upload or copy change",
      "Campaign launch or reactivation",
      "Budget pause or campaign stop",
      "GHL workflow activation or modification",
      "Report delivery to client",
      "Any ad set structural change",
    ],
  };

  // ─── Intelligence-powered sections ───────────────────────────
  let buyerPsychologyUsed = undefined;
  let marketResearchUsed = undefined;
  let clientIntelligenceUsed = undefined;
  let strategicRationale = undefined;

  // Creative intelligence — always populated when a creative type or asset is available
  const creativeIntelligenceUsed = {
    assetId: selectedAsset?.id ?? null,
    assetType: effectiveCreativeType,
    creativeStrength: `${creativeAnalysis.hookStrength} — ${creativeAnalysis.bestCampaignAngle}`,
    trustSignals: creativeAnalysis.trustSignals,
    buyerIntent: creativeAnalysis.buyerIntentLevel,
    recommendedAngle: creativeAnalysis.bestCampaignAngle,
    recommendedHook: `${creativeAnalysis.hookStrength} hook — ${creativeAnalysis.objectionAddressed}`,
    recommendedCTA: creativeAnalysis.recommendedCTA,
    placementRecommendation: creativeAnalysis.bestPlacement,
    complianceNote: creativeAnalysis.complianceRisks.length > 0
      ? creativeAnalysis.complianceRisks[0]
      : "No specific compliance risks identified for this creative type",
    whyThisCreative: creativeAnalysis.whyThisCreative,
    retargetingUse: creativeAnalysis.retargetingUse,
    approvedForAds: selectedAsset?.approvedForAds ?? true,
  };

  if (hasIntel && psych && mktResearch) {
    buyerPsychologyUsed = {
      buyerInsight: psych.buyerStageNotes,
      urgencyTrigger: psych.urgencyCreators[0] ?? "Roof age and recent storm activity",
      trustTriggerUsed: psych.trustCreators.slice(0, 3).join(", "),
      objectionAddressed: psych.objectionsToHandle[0] ?? "Price comparison against cheaper competitors",
      hookRationale: psych.resonatingHooks[0] ?? "Leads with trust-first hook",
      ctaRationale: `${psych.bestCTA} — aligns with buyer stage (awareness to consultation)`,
    };

    marketResearchUsed = {
      marketSummary: mktResearch.localMarketSummary,
      competitorAngle: mktResearch.competitorAngle,
      audienceRationale: mktResearch.buyerDemandNotes,
      locationRationale: `Targeting ${intel.serviceArea.bestNeighborhoods.slice(0, 3).join(", ")} — highest concentration of ${intel.targetMarket.householdIncome} homeowners in service area`,
      seasonalityNote: mktResearch.seasonalityNotes,
    };

    clientIntelligenceUsed = {
      onboardingSummaryUsed: true,
      keyIntelligenceApplied: [
        "Buyer profile — price objection handling, trust triggers, urgency triggers",
        "Market research — competitor weaknesses, premium neighborhood targeting",
        "Offer intelligence — warranty stack, financing, proof points",
        "Sales audit — lost lead recovery sequence added (was a critical gap)",
        "Content planning — owner on camera format, specific content themes",
        "Campaign implications — service priorities, lead form questions, follow-up strategy",
      ],
      offerAngle: intel.offerIntelligence.mainOffer,
      servicesPrioritized: intel.campaignImplications.servicesToPrioritize,
    };

    strategicRationale = {
      whyThisCampaign: `This campaign was built using full onboarding intelligence for ${client.name}. The core insight: this client's biggest bottleneck is price shoppers. The campaign repositions ${client.name} away from being "another roofing quote" and toward being the trusted, warranty-backed, family-owned choice for ${intel.targetMarket.householdIncome} homeowners in ${serviceAreas}. Every element — copy angle, targeting, lead form, follow-up — is designed to attract quality buyers, pre-handle the price objection, and convert faster.`,
      buyerInsightUsed: `Buyer is ${intel.buyerProfile.primaryBuyerType}. Primary motivation: ${intel.buyerProfile.buyingMotivations[0]}. Biggest fear: ${intel.buyerProfile.commonFears[0]}. Key objection: ${intel.buyerProfile.commonObjections[0]}.`,
      marketInsightUsed: mktResearch.competitorAngle,
      offerAngleUsed: intel.offerIntelligence.mainOffer,
      creativeAngleUsed: `${creativeAngle} — selected because owner (${ownerName}) is on camera and personable, which directly addresses the trust gap vs. impersonal large companies`,
      trustTriggerUsed: intel.buyerProfile.trustTriggers.slice(0, 3).join(" + "),
      objectionAddressed: `"${intel.buyerProfile.commonObjections[0]}" — handled by leading with warranty stack and GAF Certified Plus credibility, not price`,
      audienceRationale: `Targeting ${intel.targetMarket.householdIncome} homeowners in ${intel.serviceArea.bestNeighborhoods.slice(0, 3).join(", ")} — premium neighborhoods with highest concentration of ideal buyers and lowest price sensitivity`,
      leadFormRationale: `Lead form questions from onboarding intelligence qualify for roof age, visible damage, homeownership, and financing interest — the 4 signals that indicate a high-quality replacement lead`,
      followUpRationale: `Lost lead recovery sequence added as a critical gap identified in sales audit. AI voice trigger at 10min if no setter call. Daily follow-up for first 3 days then tapers off. Automation stops the moment appointment is booked.`,
    };
  }

  // Multi-asset variations — built when multiple assets are passed
  const allAssets = selectedAssets && selectedAssets.length > 0
    ? selectedAssets
    : selectedAsset
    ? [selectedAsset]
    : [];
  const adVariations = allAssets.length > 0
    ? allAssets.map((a, i) => {
        const operatorNote = assetNotes?.[a.id];
        const storedAnalysis = assetAnalyses?.[a.id] ?? null;
        return buildAssetAdVariation(
          {
            id: a.id,
            fileName: a.fileName,
            assetType: a.assetType,
            fileType: a.fileType,
            approvedForAds: a.approvedForAds,
            notes: operatorNote || a.notes,
          },
          service,
          intel,
          i === 0,
          storedAnalysis
        );
      })
    : undefined;

  const createdAt = mockTimestamp();
  return {
    id: `plan-${Date.now()}`,
    clientId: client.id,
    clientName: client.name,
    campaignName: hasIntel
      ? `${intel.offerIntelligence.servicePriorities[0] ?? service} — ${goal} — ${intel.serviceArea.cities[0] ?? market}`
      : `${service} — ${goal} — ${market}`,
    market,
    service,
    goal,
    budget: `$${budgetNum.toLocaleString()}/mo`,
    creativeType,
    status: "draft" as DraftStatus,
    approvalStatus: "draft" as DraftStatus,
    createdAt,
    updatedAt: createdAt,
    createdBy: "Veronica",
    metaStructure,
    adCopy,
    leadForm,
    ghlWorkflow,
    creativeDirection,
    compliance,
    optimization,
    buyerPsychologyUsed,
    marketResearchUsed,
    clientIntelligenceUsed,
    strategicRationale,
    creativeIntelligenceUsed,
    adVariations,
  };
}

// ─────────────────────────────────────────────────────────────
// Mock creative analysis
// ─────────────────────────────────────────────────────────────

export function mockAnalyzeCreative(input: CreativeAnalysisInput): CreativeAnalysisResult {
  const agent = runCreativeAnalysisAgent(
    input.assetType,
    input.service,
    input.approvedForAds,
    input.notes
  );
  const isRoofing = /roof|storm|inspect/i.test(input.service + input.assetType);
  const client = input.clientName ?? "your company";

  return {
    creativeStrength: agent.visualStrength,
    trustSignals: agent.trustSignals,
    buyerIntent: agent.buyerIntentLevel,
    recommendedAngle: agent.bestCampaignAngle,
    recommendedHook: isRoofing
      ? `"Is your ${input.market} home hiding storm damage right now?"`
      : `"What would your ${input.service.toLowerCase()} look like done exactly right?"`,
    recommendedCTA: agent.recommendedCTA,
    placementRecommendation: agent.bestPlacement,
    complianceNote: input.approvedForAds
      ? agent.complianceRisks.join(" ") || "No major compliance risks identified for this creative type."
      : "⚠ Creative not yet approved for ads — must be reviewed and approved before any campaign use.",
    whyThisCreative: agent.whyThisCreative,
    retargetingUse: agent.retargetingUse,
    audienceTemperatureFit: agent.bestAudienceTemperature,
    formatRecommendation: "9:16 vertical (15–30 sec) for Reels/Stories · 1:1 for Feed · 4:5 for Facebook Feed",
    hookVariants: [
      isRoofing
        ? `"Your neighbor just got a free roof inspection — when did you last check yours?"`
        : `"Most ${input.market} homeowners regret waiting on this project"`,
      `"Before you hire anyone for ${input.service.toLowerCase()} in ${input.market}, watch this"`,
      `"Why ${input.market} homeowners trust ${client} — see the work for yourself"`,
    ],
    weaknesses: input.approvedForAds
      ? [
          "Ensure all footage is authentic client work — no stock imagery",
          "Verify any statistics or claims in overlays are factually accurate",
        ]
      : [
          "Creative not approved for ads — must complete approval before campaign use",
          "Human review required before this asset can be used in any live ad",
        ],
  };
}

// ─────────────────────────────────────────────────────────────
// Mock weekly report
// ─────────────────────────────────────────────────────────────

export function mockGenerateReport(input: WeeklyReportInput): WeeklyReportDraft {
  const bookingRate = input.leads > 0
    ? `${Math.round((input.booked / input.leads) * 100)}%`
    : "N/A";
  const bookingNum = input.leads > 0 ? Math.round((input.booked / input.leads) * 100) : 0;
  const isHealthy = bookingNum >= 25;
  const cplNum = parseFloat(input.cpl.replace(/[^0-9.]/g, "")) || 0;
  const cplHealthy = cplNum <= 100;

  const wins = input.wins.length > 0
    ? input.wins.join(". ") + "."
    : "Lead flow maintained at consistent pace throughout the week.";

  const issues = input.issues.length > 0
    ? input.issues.join(". ") + "."
    : "No critical issues to flag this week.";

  const nextSteps = input.nextActions.length > 0
    ? input.nextActions.join(". ") + "."
    : "Continue current campaign structure. Monitor CPL trend for the next 7 days before making adjustments.";

  return {
    reportTitle: `${input.clientName} — Weekly Performance Report — ${input.reportPeriod}`,
    executiveSummary: `${input.clientName} generated ${input.leads} leads at ${input.cpl} CPL with ${input.booked} booked appointments (${bookingRate} booking rate) during ${input.reportPeriod}. ${cplHealthy ? "CPL is within target range." : "CPL is trending above target — creative review recommended."} ${isHealthy ? "Booking rate is on track." : "Booking rate is below the 25% floor — setter follow-up sequence needs review."}`,
    winsSection: wins,
    issuesSection: issues,
    nextActionsSection: nextSteps,
    agentRecommendations: [
      cplHealthy
        ? `CPL of ${input.cpl} is within target — no immediate budget changes needed`
        : `CPL of ${input.cpl} is above target — review ad copy performance and consider creative refresh`,
      isHealthy
        ? `Booking rate of ${bookingRate} is healthy — setter follow-up sequence is working`
        : `Booking rate of ${bookingRate} is below 25% floor — audit setter response time and SMS sequence`,
      input.leads > 0 && input.booked > 0
        ? `Pipeline value of ${input.pipelineValue} represents strong near-term revenue potential — prioritize closing these opportunities`
        : "Focus on increasing booked appointment rate before scaling ad spend",
      "All budget changes, creative updates, and workflow modifications require human approval before execution",
    ],
    clientReadyNarrative: `Good morning from the Vault Co team. Here is your weekly performance summary for ${input.reportPeriod}.\n\nThis week, your campaigns generated ${input.leads} qualified leads with a total ad spend of ${input.spend} — bringing your cost per lead to ${input.cpl}. Of those leads, ${input.booked} converted to booked appointments, giving you a ${bookingRate} booking rate. Your current pipeline stands at ${input.pipelineValue}.\n\n${wins}\n\n${issues}\n\nLooking ahead: ${nextSteps}\n\nAs always, no campaign changes are made without your review and approval. We will send specific recommendations for next week's actions separately.`,
    approvalNote: "This report was generated in mock mode. Review all numbers against actual platform data before delivering to the client. Human approval required before sending.",
  };
}
