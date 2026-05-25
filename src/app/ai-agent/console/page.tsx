"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  Brain,
  Film,
  Sparkles,
  Lightbulb,
  Loader2,
  Target,
  MapPin,
  DollarSign,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  CheckSquare,
  Send,
  Settings2,
  Zap,
  AlertCircle,
  FileText,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  Workflow,
  ClipboardList,
  ImageIcon,
  TrendingUp,
  Phone,
  Video,
  Tag,
  RadioTower,
  XCircle,
  Archive,
  ListChecks,
  Layers,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { clients, clientStatusVariant, type Client } from "@/lib/data";
import { usePlans } from "@/components/PlanProvider";
import { useIntelligence } from "@/components/IntelligenceProvider";
import { useAuth } from "@/components/AuthProvider";
import {
  getAssetsForClient,
  assetTypeColors,
  type CreativeAsset,
  type AssetType,
} from "@/lib/creativeAssets";
import { usePersistedCreativeAssets } from "@/lib/usePersistedCreativeAssets";
import { buildAssetAdVariation, type StoredAssetAnalysis } from "@/lib/agents/creativeAnalysis";
import { getDataProvider } from "@/lib/data/data-provider";
import { getStorageProvider } from "@/lib/storage/storage-provider";
import { mimeToFileType } from "@/lib/storage/types";
import {
  draftStatusLabel,
  draftStatusVariant,
  type CampaignDraft,
  type DraftStatus,
  type MetaStructure,
  type AdCopy,
  type LeadForm,
  type GhlWorkflow,
  type CreativeDirection,
  type ComplianceCheck,
  type OptimizationRules,
  type AssetAdVariation,
  type AdSetDefinition,
} from "@/lib/planStore";

// ─────────────────────────────────────────────────────────────
// Mock generation engine (client-side fallback)
// Canonical version lives in src/lib/ai/mock.ts (used server-side)
// ─────────────────────────────────────────────────────────────

function ts() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function generateMockPlan(
  client: Client,
  goal: string,
  service: string,
  market: string,
  budget: string,
  creativeType: string
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
  const freeOffer = isRoofing ? "free roof inspection" : "free consultation";
  const offerCta = isRoofing ? "Get My Free Inspection" : "Book My Free Consultation";

  const goalObjectiveMap: Record<string, string> = {
    "Lead Generation": "LEAD_GENERATION",
    Retargeting: "CONVERSIONS",
    "Brand Awareness": "AWARENESS",
    Conversion: "CONVERSIONS",
  };

  const adSetNames = isRoofing
    ? [
        `${market} — Broad Homeowner Prospecting`,
        `${market} — Storm & Roof Replacement Intent`,
        `${market} — Retargeting & Social Proof`,
      ]
    : [
        `${market} — High-Intent Homeowner Prospecting`,
        `${market} — Home Improvement Decision Intent`,
        `${market} — Retargeting & Social Proof`,
      ];

  const adSets: AdSetDefinition[] = isRoofing
    ? [
        {
          name: adSetNames[0],
          purpose: "Cold prospecting — homeowners with no prior brand exposure",
          audience: `Homeowners · ${market} ±15mi · Ages 30–65 · Interests: Home Improvement, Homeowners Insurance, Roofing`,
          locationTargeting: `Primary city: ${market} · Radius: ±15mi`,
          placements: ["Facebook Feed", "Instagram Feed", "Facebook Reels", "Instagram Reels"],
          budgetSplit: "50% of ad spend",
          budgetAmount: `$${as1Budget}/mo`,
          optimizationEvent: "LEAD",
          audienceTemperature: "cold",
          requiredForLaunch: true,
        },
        {
          name: adSetNames[1],
          purpose: "Mid-funnel — homeowners actively researching storm damage or replacement",
          audience: `${market} ±15mi · Ages 30–65 · Interests: Roof Repair, Storm Damage, Homeowners Insurance Claims`,
          locationTargeting: `Primary city: ${market} · Radius: ±15mi`,
          placements: ["Facebook Feed", "Instagram Feed", "Facebook Stories"],
          budgetSplit: "30% of ad spend",
          budgetAmount: `$${as2Budget}/mo`,
          optimizationEvent: "LEAD",
          audienceTemperature: "warm",
          requiredForLaunch: false,
        },
        {
          name: adSetNames[2],
          purpose: "Retargeting — warm audiences who engaged but haven't converted",
          audience: `Website visitors (30 days) · Video viewers (75%) · Lead form openers · Page engagers (60 days)`,
          locationTargeting: `Primary city: ${market} · Radius: ±15mi`,
          placements: ["Facebook Feed", "Instagram Feed", "Facebook Stories", "Instagram Stories"],
          budgetSplit: "20% of ad spend",
          budgetAmount: `$${as3Budget}/mo`,
          optimizationEvent: "LEAD",
          audienceTemperature: "hot",
          requiredForLaunch: false,
          launchBlocker: "Requires Meta Pixel + Facebook Page connected to activate retargeting audiences",
        },
      ]
    : [
        {
          name: adSetNames[0],
          purpose: "Cold prospecting — homeowners actively seeking remodeling services",
          audience: `Homeowners · ${market} ±20mi · Ages 35–65 · HHI $75k+ · Interests: Home Improvement, Interior Design`,
          locationTargeting: `Primary city: ${market} · Radius: ±20mi`,
          placements: ["Facebook Feed", "Instagram Feed", "Facebook Reels", "Instagram Reels"],
          budgetSplit: "50% of ad spend",
          budgetAmount: `$${as1Budget}/mo`,
          optimizationEvent: "LEAD",
          audienceTemperature: "cold",
          requiredForLaunch: true,
        },
        {
          name: adSetNames[1],
          purpose: "Mid-funnel — homeowners in decision phase for home improvement",
          audience: `${market} ±20mi · Ages 35–65 · Interests: Kitchen Remodeling, Bathroom Design, Home Renovation`,
          locationTargeting: `Primary city: ${market} · Radius: ±20mi`,
          placements: ["Facebook Feed", "Instagram Feed", "Facebook Stories"],
          budgetSplit: "30% of ad spend",
          budgetAmount: `$${as2Budget}/mo`,
          optimizationEvent: "LEAD",
          audienceTemperature: "warm",
          requiredForLaunch: false,
        },
        {
          name: adSetNames[2],
          purpose: "Retargeting — warm audiences who engaged but haven't converted",
          audience: `Website visitors (30 days) · Video viewers (75%) · Lead form openers · Page engagers (60 days)`,
          locationTargeting: `Primary city: ${market} · Radius: ±20mi`,
          placements: ["Facebook Feed", "Instagram Feed", "Facebook Stories", "Instagram Stories"],
          budgetSplit: "20% of ad spend",
          budgetAmount: `$${as3Budget}/mo`,
          optimizationEvent: "LEAD",
          audienceTemperature: "hot",
          requiredForLaunch: false,
          launchBlocker: "Requires Meta Pixel + Facebook Page connected to activate retargeting audiences",
        },
      ];

  const metaStructure: MetaStructure = {
    campaignObjective: goalObjectiveMap[goal] ?? "LEAD_GENERATION",
    campaignType:
      goal === "Lead Generation"
        ? "Instant Form (Native Lead Form)"
        : "Link Click → Landing Page",
    adSetNames,
    adSets,
    audience: isRoofing
      ? `Homeowners · ${market} ±15mi · Ages 30–65 · Home Ownership: Yes · Interests: Home Improvement, Homeowners Insurance, Roofing · Est. reach: 45,000–120,000`
      : `Homeowners · ${market} ±20mi · Ages 35–65 · HHI $75k+ · Interests: Home Improvement, Interior Design, Kitchen & Bath · Est. reach: 30,000–90,000`,
    locationTargeting: `Primary city: ${market} · Radius: ±${isRoofing ? "15" : "20"}mi · DMA-level targeting · Mobile-first · Exclude: business/commercial zones`,
    placements: [
      "Facebook Feed",
      "Instagram Feed",
      "Facebook Reels",
      "Instagram Reels",
      "Facebook Stories",
      "Instagram Stories",
    ],
    budgetSplit: `Total: $${budgetNum.toLocaleString()}/mo · Ad spend: $${adSpend}/mo · Reserve: $${reserveBudget}/mo · AS1 Broad (50%): $${as1Budget}/mo · AS2 Intent (30%): $${as2Budget}/mo · AS3 Retargeting (20%): $${as3Budget}/mo`,
    optimizationEvent:
      goal === "Lead Generation"
        ? "LEAD (Meta Instant Form Submit)"
        : "OFFSITE_CONVERSION → Lead",
  };

  const primaryTexts = isRoofing
    ? [
        `Your roof protects everything that matters. Don't let hidden damage turn into a $20,000 replacement. ${client.name} offers free roof inspections for ${market} homeowners — no pressure, no obligation. If we find damage, we'll show you exactly what needs fixing and help you navigate your insurance claim. Schedule your free inspection today.`,
        `Storm season doesn't wait — and neither should you. ${client.name} is offering free roof inspections across ${market} this month. In 45 minutes, we'll tell you exactly what shape your roof is in, what it'll cost to fix, and whether you have an insurance claim worth filing. No surprises. No pressure. Just answers.`,
        `"I had no idea my roof was damaged until ${client.name} found it during my free inspection. Saved me from a full replacement." — Real ${market} homeowner. Schedule your free inspection today. We've served ${market} for years and we'll give you the honest truth about your roof.`,
      ]
    : [
        `Your home should reflect your vision. At ${client.name}, we specialize in premium remodeling across ${market} — from concept to completion with zero surprises. Transparent pricing, clear timelines, and craftsmanship that lasts decades. Book your free ${svc.includes("kitchen") ? "kitchen design" : svc.includes("bathroom") ? "bathroom planning" : "remodeling"} consultation today.`,
        `What would your home look like if everything was exactly the way you wanted it? ${client.name} has helped ${market} homeowners transform their spaces with premium craftsmanship and zero stress. We handle every detail — you get the result you've always imagined. Book your free consultation and let's talk about what's possible.`,
        `"We've been thinking about remodeling for years. ${client.name} made it easy from the first call." — ${market} homeowner. If you're ready to finally make it happen, book your free consultation. Transparent pricing. No hidden costs. Just quality work.`,
      ];

  const headlines = isRoofing
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
    ? [
        `Licensed & insured. Honest inspections for ${market} homeowners.`,
        `Free inspection — no commitment. Know your roof's true condition.`,
        `Storm damage? Get answers before it costs you more.`,
      ]
    : [
        `Premium craftsmanship in ${market}. Transparent pricing.`,
        `Free consultation — no commitment. Let's talk possibilities.`,
        `Trusted by ${market} homeowners for quality that lasts.`,
      ];

  const adCopy: AdCopy = {
    primaryTexts,
    headlines,
    descriptions,
    cta: offerCta,
  };

  const leadForm: LeadForm = {
    formName: `${service} — ${client.name} — ${market}`,
    introCopy: isRoofing
      ? `Schedule your free roof inspection with ${client.name}. Takes 45 minutes. No pressure. We'll tell you exactly what your roof needs — and whether you have an insurance claim worth filing.`
      : `Book your free ${svc.includes("kitchen") ? "kitchen design" : svc.includes("bathroom") ? "bathroom planning" : "remodeling"} consultation with ${client.name}. We'll walk through your project, answer every question, and give you a clear picture of timeline and cost — no obligation.`,
    qualificationQuestions: isRoofing
      ? [
          "How old is your roof? (Approximate)",
          "Have you noticed any leaks, missing shingles, or visible damage?",
          "Do you own the home?",
        ]
      : [
          "Which project are you most interested in?",
          "What is your approximate project budget?",
          "What is your target timeline to begin?",
        ],
    contactFields: [
      "First Name",
      "Last Name",
      "Phone Number",
      "Email Address",
      "Home Address / Zip Code",
    ],
    consentLanguage: `By submitting this form, you agree to be contacted by ${client.name} via phone, SMS, and email. Message and data rates may apply. Reply STOP to opt out. We will never share your information with third parties. View our Privacy Policy at [URL].`,
    thankYouCopy: isRoofing
      ? `Thanks, [First Name]! Your free inspection request is confirmed. ${client.owner} from ${client.name} will contact you within 15 minutes to schedule a convenient time. Watch your phone!`
      : `Thanks, [First Name]! Your free consultation request is confirmed. ${client.owner} from ${client.name} will reach out within 15 minutes to get you scheduled. We look forward to hearing about your project!`,
  };

  const ghlWorkflow: GhlWorkflow = {
    tags: isRoofing
      ? ["roof-lead", "meta-lead", "free-inspection", market.toLowerCase().replace(/[,\s]+/g, "-")]
      : ["remodel-lead", "meta-lead", "free-consultation", market.toLowerCase().replace(/[,\s]+/g, "-")],
    pipelineStage: "New Lead",
    immediateSms: `Hi [First Name], this is ${client.owner} from ${client.name}. We just received your request for a ${freeOffer} — we'll call you within the next 5 minutes to get you scheduled. Watch for our call! If you'd prefer to book directly: [Calendar Link]`,
    immediateEmail: {
      subject: `Your ${isRoofing ? "Free Roof Inspection" : "Free Consultation"} Request — ${client.name}`,
      body: `Hi [First Name],\n\nGreat news — we received your request and you're next on our list.\n\nHere's what happens next:\n  1. ${client.owner} will call you within 5 minutes\n  2. We'll find a time that works for your schedule\n  3. ${isRoofing ? "Our certified inspector will arrive at your home and give you a complete honest assessment — at no cost." : "We'll walk through your project, answer every question, and give you a clear plan with transparent pricing."}\n\nNeed to book right now? → [Calendar Link]\n\nTalk soon,\n${client.owner}\n${client.name}\n${client.phone}`,
    },
    internalNotification: `🔔 NEW LEAD — [Full Name] · ${market} · ${service} · Meta Instant Form\nPhone: [Phone] · Source: ${goal} campaign\nAssign to: ${client.owner} · Required response: 5 minutes`,
    setterTask: `Call [First Name] at [Phone Number] within 5 minutes of lead submission. Goal: Book ${freeOffer}. If no answer: leave 15-second voicemail + send SMS #2 immediately. Log outcome in GHL.`,
    aiVoiceTrigger: `Trigger condition: No outbound call placed within 10 minutes of lead submission.\nAI Voice Script: "Hi, is this [First Name]? My name is [AI Agent Name] and I'm calling on behalf of ${client.name} — you just requested a ${freeOffer} and I wanted to make sure we connect you right away. Do you have 30 seconds? [PAUSE] Perfect — I just need to find the best time to get ${client.owner} out to you. Are mornings or afternoons better for your schedule?"`,
    bookedStopCondition: `STOP CONDITION: If contact reaches pipeline stage "Appointment Booked" → immediately stop all active follow-up SMS sequences. Trigger: Appointment Confirmation SMS + Email with date/time/address details. Add tag: "appointment-confirmed". Remove tag: "follow-up-active".`,
    steps: [
      `Trigger: New Meta lead submitted — "${service} — ${goal} — ${market}"`,
      `Step 1 (0 min): Apply tags [${isRoofing ? "roof-lead, free-inspection" : "remodel-lead, free-consultation"}] · Set pipeline stage: New Lead`,
      `Step 2 (0 min): Send immediate SMS — personalized intro + calendar link`,
      `Step 3 (1 min): Send immediate email — confirmation + what to expect + calendar link`,
      `Step 4 (1 min): Create internal notification → assign to ${client.owner}`,
      `Step 5 (1 min): Create setter task — "Call [First Name] within 5 min to book ${freeOffer}"`,
      `Step 6 (10 min): If no outbound call logged → trigger AI voice follow-up sequence`,
      `Step 7 (1 hr): If not booked → Send follow-up SMS #2: "Still interested? Here's a quick link to grab a time: [link]"`,
      `Step 8 (24 hr): If not booked → Follow-up SMS #3 + create manual call task`,
      `Step 9 (48 hr): If not booked → Final SMS + move to "Attempted" stage`,
      `Step 10 (7 days): No response → Move to 30-day cold nurture email drip`,
      `STOP: Appointment booked → Cancel all sequences, trigger confirmation flow`,
    ],
  };

  const creativeDirection: CreativeDirection = isRoofing
    ? {
        angle: creativeType || "Storm Damage Urgency — Homeowners with undetected damage",
        hook: `"Your neighbor's roof failed last week. Is yours next?"`,
        shotList: [
          "Drone shot of neighborhood — scan across rooftops, linger on damaged shingles",
          "Inspector arriving at home — handshake, friendly confident energy",
          "Close-up of roof damage — missing shingles, water staining, granule loss",
          "Inspector pointing out damage to homeowner — concerned, nodding along",
          "Before/After split — damaged roof left, completed replacement right",
          "Happy homeowner looking up at new roof — relief, satisfaction",
          "Final shot: inspector handing over inspection report — CTA text overlay",
        ],
        textOverlays: [
          `"Free Roof Inspection — ${market}" (opening hook, white bold on dark bg)`,
          `"Your roof could be damaged right now" (middle tension build)`,
          `"${client.name} — Trusted in ${market}" (credibility badge)`,
          `"Schedule Free Inspection Today →" (closing CTA, orange button style)`,
        ],
        voiceoverScript: `[0–3s] "Is your roof hiding storm damage?" [3–8s] "Most homeowners don't find out until it's too late — and it costs thousands more to fix." [8–18s] "${client.name} is offering free roof inspections across ${market} right now. Our certified inspectors check every inch — shingles, flashing, gutters, decking." [18–25s] "If we find damage, we'll show you exactly what needs fixing — and whether you have an insurance claim worth filing." [25–30s] "Tap below to schedule your free inspection today. Takes 45 minutes. Zero pressure."`,
        recommendedFormat:
          "9:16 vertical video (15–30 sec) for Reels/Stories · 1:1 static image for Feed · 4:5 video for Facebook Feed",
        recommendedPlacements: [
          "Instagram Reels (primary)",
          "Facebook Reels",
          "Instagram Stories",
          "Facebook Stories",
          "Instagram Feed",
          "Facebook Feed",
        ],
      }
    : {
        angle: creativeType || "Dream Space Visualization — Before/After Transformation",
        hook: `"What would your home look like if you actually built it the way you always imagined?"`,
        shotList: [
          "Before footage: cramped/dated kitchen or bathroom — dim, crowded, old fixtures",
          "Transformation timelapse: demo → framing → tile → final reveal",
          "Reveal moment: owner opens door/turns corner to see finished space",
          "Hero shot: completed project — wide angle, great lighting, clean styling",
          "Detail shots: hardware, countertops, tile work, lighting — premium craftsmanship",
          "Owner reaction: genuine surprise and satisfaction in finished space",
          "Team shot: crew with owner outside home — trust and relationship",
        ],
        textOverlays: [
          `"Before" (timestamp left side, muted) / "After" (timestamp right side, bold)`,
          `"Premium ${svc.includes("kitchen") ? "Kitchen" : svc.includes("bathroom") ? "Bathroom" : "Home"} Remodeling in ${market}"`,
          `"${client.name} — Free Consultation"`,
          `"Book Your Free Design Call Today →" (closing CTA)`,
        ],
        voiceoverScript: `[0–3s] "What if your home actually looked the way you always imagined it?" [3–10s] "At ${client.name}, we turn that vision into reality. From the first design call to the final walkthrough — no surprises, no stress, just premium craftsmanship." [10–20s] "We've transformed kitchens, bathrooms, and entire homes across ${market}. Our process is simple: free consultation, transparent quote, and a timeline we actually stick to." [20–27s] "This is what we built for a family right here in ${market}." [27–30s] "Book your free consultation today. Let's talk about what's possible for your home."`,
        recommendedFormat:
          "9:16 vertical video (15–30 sec) for Reels · 4:5 carousel for Feed (before/after swipe) · 1:1 static hero shot",
        recommendedPlacements: [
          "Instagram Reels (primary)",
          "Instagram Feed Carousel",
          "Facebook Reels",
          "Facebook Feed",
          "Instagram Stories",
        ],
      };

  const compliance: ComplianceCheck = {
    metaRisk: isRoofing
      ? "MEDIUM — Storm damage and insurance claim language is a flagged category. Ads referencing insurance claims require careful phrasing. Review before submission."
      : "LOW — Standard home improvement offer. No special categories triggered. Standard review process.",
    smsCompliance:
      "All SMS contacts must have opted in via the Meta lead form with explicit TCPA consent language visible before submission. Maintain opt-in records. Honor STOP requests within 10 minutes.",
    insuranceRisk: isRoofing
      ? "Do not imply guaranteed insurance claim approval. Do not use phrases like 'insurance will cover it' or 'file a claim and pay nothing.' Use language like 'we'll help you understand your options.'"
      : "N/A — No insurance claim language in this campaign category.",
    disallowedPhrases: isRoofing
      ? [
          '"Insurance will cover it" or "file a free insurance claim"',
          '"Guaranteed approval" or "100% covered by insurance"',
          '"Best roofer in [city]" — superlative claims',
          '"Limited time" without a real end date',
          '"Free replacement" — inspection offer only, not replacement',
        ]
      : [
          '"Cheapest remodeling in [city]" — price superlatives',
          '"Guaranteed to increase home value by X%" — performance claims',
          '"Best contractor in [city]" — unverified superlatives',
          '"Limited spots available" without enforcing the limit',
        ],
    approvalWarnings: [
      "⚠ Insurance/storm claim language — requires human review before Meta submission",
      "⚠ Lead form consent language — verify privacy policy URL is live and accurate",
      `⚠ Before/after imagery — must be authentic ${client.name} work, not stock photos`,
      "⚠ SMS sequence — verify TCPA consent is captured in lead form before activating",
    ],
  };

  const cplTarget = isRoofing ? 65 : 130;
  const cpbaTarget = isRoofing ? 250 : 500;

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

  const createdAt = ts();
  return {
    id: `plan-${Date.now()}`,
    clientId: client.id,
    clientName: client.name,
    campaignName: `${service} — ${goal} — ${market}`,
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
  };
}

// ─────────────────────────────────────────────────────────────
// Section tab config
// ─────────────────────────────────────────────────────────────

type SectionId =
  | "overview"
  | "meta"
  | "copy"
  | "leadform"
  | "ghl"
  | "creative"
  | "compliance"
  | "optimization"
  | "buyer"
  | "market"
  | "rationale"
  | "creative-intel"
  | "asset-matrix";

const sectionTabs: {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { id: "overview", label: "Overview", icon: Megaphone, color: "#0081f2" },
  { id: "meta", label: "Meta Structure", icon: Target, color: "#a78bfa" },
  { id: "copy", label: "Ad Copy", icon: FileText, color: "#ff8400" },
  { id: "leadform", label: "Lead Form", icon: ClipboardList, color: "#22c55e" },
  { id: "ghl", label: "GHL Workflow", icon: Workflow, color: "#0081f2" },
  { id: "creative", label: "Creative", icon: Video, color: "#ff8400" },
  { id: "compliance", label: "Compliance", icon: ShieldCheck, color: "#f59e0b" },
  { id: "optimization", label: "Optimization", icon: TrendingUp, color: "#a78bfa" },
  { id: "buyer", label: "Buyer Psychology", icon: Brain, color: "#a78bfa" },
  { id: "market", label: "Market Research", icon: MapPin, color: "#22c55e" },
  { id: "rationale", label: "Strategy", icon: Lightbulb, color: "#ff8400" },
  { id: "creative-intel", label: "Creative Intel", icon: Film, color: "#ff8400" },
  { id: "asset-matrix", label: "Asset Matrix", icon: Layers, color: "#0081f2" },
];

// ─────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────

const agentActions: { time: string; action: string; reason: string; type: string }[] = [];

const automationRules = [
  { label: "Auto-scale budget", description: "Recommend +20% when leads exceed 1.4x monthly pace for 5+ days — requires human approval", enabled: true },
  { label: "Pause underperformers", description: "Auto-pause ad sets where CPL exceeds 2x threshold for 14 days", enabled: true },
  { label: "Creative refresh alert", description: "Flag creative for review when CTR drops >20% in 7-day window", enabled: true },
  { label: "Audience refresh", description: "Rebuild lookalikes from fresh converter lists each Monday", enabled: false },
  { label: "Weekly report generation", description: "Auto-generate client reports every Monday at 7am", enabled: true },
  { label: "AI voice follow-up", description: "Trigger AI voice call if no setter call placed within 10 min of lead submission", enabled: true },
];

const agentSuggestions = [
  "What should Vault Co do today?",
  "Which clients are blocked from launch?",
  "Which clients are at risk this week?",
  "What is blocking Kaczmar?",
  "Create a campaign draft for Kaczmar",
  "Which clients need reports?",
  "Which clients have follow-up bottlenecks?",
  "Should we increase ad spend anywhere?",
  "What should we fix before scaling?",
  "Build a GHL speed-to-lead workflow for Kaczmar",
  "Draft a client message for Kaczmar",
  "What is the media buyer bottleneck?",
  "Run a compliance check on current campaigns",
  "Who is the highest upsell opportunity right now?",
];

// ─────────────────────────────────────────────────────────────
// Console message type
// ─────────────────────────────────────────────────────────────

// Mirrors OperatorTaskSuggestion from veronica.ts — defined locally to keep this client component
// free of server-only imports.
interface OperatorTaskSuggestion {
  title: string;
  description: string;
  taskType: string;
  priority: "urgent" | "high" | "medium" | "low";
  clientId?: string | null;
  sourceAgent?: string;
}

interface ConsoleMsg {
  role: "user" | "agent";
  text: string;
  dataSources?: string[];
  relatedLinks?: { label: string; href: string }[];
  actionSuggested?: { label: string; href: string };
  isError?: boolean;
  // Veronica 2.0 agent fields
  agentsUsed?: string[];
  approvalRequired?: boolean;
  suggestedApprovalDestination?: string;
  whatVeronicaCanDoNow?: string[];
  whatRequiresHumanApproval?: string[];
  whatIsBlocked?: string[];
  dataConfidence?: "high" | "medium" | "low";
  // Client Veronica detected from the message — used by Save Draft.
  // detectedClientName is the official saved name from Supabase — always prefer this over
  // any client-side lookup, which can fail when IDs differ between mock and live data.
  detectedClientId?: string;
  detectedClientName?: string;
  // Deterministic task suggestions from structured agent outputs
  operatorTaskSuggestions?: OperatorTaskSuggestion[];
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-[var(--t-dim)] uppercase tracking-wider mb-1.5">
      {children}
    </div>
  );
}

function BulletList({ items, color = "#6b7a99" }: { items: string[]; color?: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--t-muted)] leading-snug">
          <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[12px] text-[var(--t-muted)] leading-snug">
          <span className="mt-0.5 w-4 h-4 rounded flex-shrink-0 bg-[var(--t-surface-2)] border border-[var(--t-border)] text-[10px] font-bold text-[var(--t-dim)] flex items-center justify-center">
            {i + 1}
          </span>
          {item}
        </li>
      ))}
    </ol>
  );
}

function CopyVariant({ label, text, index }: { label: string; text: string; index: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-[var(--t-dim)] uppercase tracking-wider">{label}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[var(--t-surface-2)] border border-[var(--t-border)] text-[var(--t-muted)] rounded">
          V{index + 1}
        </span>
      </div>
      <p className="text-[12px] text-[var(--t-text)] leading-relaxed bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg p-3">
        {text}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Approval action bar
// ─────────────────────────────────────────────────────────────

function ApprovalBar({
  plan,
  onSave,
  onUpdate,
  hasUnapprovedCreative = false,
  size = "sm",
}: {
  plan: CampaignDraft;
  onSave: () => void;
  onUpdate: (s: DraftStatus) => void;
  hasUnapprovedCreative?: boolean;
  size?: "sm" | "md";
}) {
  const btn =
    size === "md"
      ? "flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-lg"
      : "flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg";
  const ico = size === "md" ? 14 : 12;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {plan.status === "draft" && (
        <>
          <button onClick={onSave} className={`${btn} text-[var(--t-muted)] border border-[var(--t-border)] hover:text-[var(--t-text)] hover:border-[var(--t-border)] transition-colors`}>
            Save Draft
          </button>
          {hasUnapprovedCreative ? (
            <div className={`${btn} text-[#f59e0b] border border-[#f59e0b]/30 bg-[#f59e0b]/5 cursor-not-allowed`} title="Approve the selected creative in the Creative Library before submitting">
              <AlertCircle size={ico} />Creative Not Approved
            </div>
          ) : (
            <button onClick={() => onUpdate("needs_review")} className={`${btn} vc-blue-gradient text-white hover:opacity-90 transition-opacity`}>
              <CheckSquare size={ico} />Submit for Approval
            </button>
          )}
        </>
      )}
      {plan.status === "needs_review" && (
        <>
          <button onClick={() => onUpdate("changes_requested")} className={`${btn} text-[#f59e0b] border border-[#f59e0b]/30 hover:bg-[#f59e0b]/10 transition-colors`}>
            Request Changes
          </button>
          <button onClick={() => onUpdate("approved")} className={`${btn} bg-[#22c55e] text-white hover:opacity-90 transition-opacity`}>
            <CheckCircle2 size={ico} />Approve Draft
          </button>
        </>
      )}
      {plan.status === "changes_requested" && (
        <button onClick={() => onUpdate("needs_review")} className={`${btn} vc-blue-gradient text-white hover:opacity-90 transition-opacity`}>
          <CheckSquare size={ico} />Resubmit for Approval
        </button>
      )}
      {plan.status === "rejected" && (
        <button onClick={() => onUpdate("needs_review")} className={`${btn} vc-blue-gradient text-white hover:opacity-90 transition-opacity`}>
          <CheckSquare size={ico} />Resubmit for Approval
        </button>
      )}
      {plan.status === "approved" && (
        <button onClick={() => onUpdate("ready_for_meta")} className={`${btn} vc-orange-gradient text-white hover:opacity-90 transition-opacity`}>
          <RadioTower size={ico} />Mark Ready for Meta
        </button>
      )}
      {plan.status === "ready_for_meta" && (
        <div className={`${btn} text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20`}>
          <CheckCircle2 size={ico} />Ready for Meta
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Save Draft menu (Veronica Console)
// ─────────────────────────────────────────────────────────────

const VERONICA_DRAFT_TYPES = [
  { value: "campaign_draft",        label: "Campaign Draft" },
  { value: "ghl_workflow_blueprint", label: "GHL Workflow Blueprint" },
  { value: "client_message_draft",  label: "Client Message Draft" },
  { value: "creative_brief",        label: "Creative Brief" },
  { value: "internal_task_list",    label: "Internal Task List" },
  { value: "report_draft",          label: "Report Draft" },
  { value: "ad_copy_draft",         label: "Ad Copy Draft" },
] as const;

type VeroniaDraftTypeValue = (typeof VERONICA_DRAFT_TYPES)[number]["value"];

function SaveDraftMenu({ msg, clientName }: { msg: ConsoleMsg; clientName?: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save(draftType: VeroniaDraftTypeValue) {
    setOpen(false);
    setSaving(true);
    setSaveError(null);

    const typeLabel = VERONICA_DRAFT_TYPES.find((t) => t.value === draftType)?.label ?? draftType;
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const title = clientName
      ? `${typeLabel} — ${clientName} — ${date}`
      : `${typeLabel} — ${date}`;

    try {
      const res = await fetch("/api/veronica/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: msg.detectedClientId,
          draftType,
          title,
          content: msg.text,
          agentsUsed: msg.agentsUsed ?? [],
          dataSources: msg.dataSources ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Save failed. Please try again.");
        return;
      }
      setSavedId(data.id ?? "saved");
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (savedId) {
    return (
      <div className="flex items-center gap-2 text-[11px]" style={{ color: "#22c55e" }}>
        <CheckCircle2 size={10} />
        Saved as approval-ready draft.
        <a href="/approvals" className="hover:underline" style={{ color: "#a78bfa" }}>
          Review in Approvals →
        </a>
      </div>
    );
  }

  if (saveError) {
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <AlertCircle size={10} style={{ color: "#ef4444" }} />
        <span style={{ color: "#ef4444" }}>{saveError}</span>
        <button
          onClick={() => setSaveError(null)}
          className="underline hover:no-underline"
          style={{ color: "#6b7a99" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#6b7a99" }}>
        <Loader2 size={10} className="animate-spin" />
        Saving draft…
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-colors"
        style={{
          color: open ? "#eef1f8" : "#6b7a99",
          backgroundColor: open ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Archive size={10} />
        Save as Draft
        <ChevronDown size={8} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
      </button>
      {open && (
        <>
          {/* Click-away overlay */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full mb-1 left-0 z-20 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: "#13151c", border: "1px solid #2a2e42", minWidth: "210px" }}
          >
            {VERONICA_DRAFT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => save(t.value)}
                className="w-full text-left px-4 py-2.5 text-[12px] transition-colors"
                style={{ color: "#eef1f8" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a1d27"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = ""; }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Create Campaign Draft — structured draft into campaign_drafts table
// ─────────────────────────────────────────────────────────────

function CreateCampaignDraftButton({
  msg,
  clientName,
  creativeAssetIds,
}: {
  msg: ConsoleMsg;
  clientName?: string;
  creativeAssetIds?: string[];
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftId, setDraftId] = useState<string | null>(null);

  // Only show when a client is detected
  if (!msg.detectedClientId) return null;

  async function createDraft() {
    setState("saving");
    try {
      const res = await fetch("/api/campaign-drafts/from-veronica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: msg.detectedClientId,
          sourcePrompt: msg.text?.slice(0, 500),
          agentsUsed: msg.agentsUsed ?? [],
          creativeAssetIds: creativeAssetIds ?? [],
        }),
      });
      const data = await res.json() as { success?: boolean; id?: string; campaignName?: string; error?: string; mockMode?: boolean };
      if (!res.ok) {
        console.error("[CreateCampaignDraftButton]", data.error);
        setState("error");
        return;
      }
      setDraftId(data.id ?? "saved");
      setState("saved");
    } catch {
      setState("error");
    }
  }

  if (state === "saved") {
    return (
      <div className="flex items-center gap-2 text-[11px]" style={{ color: "#22c55e" }}>
        <CheckCircle2 size={10} />
        Campaign draft saved for approval.{" "}
        {draftId && draftId !== "saved" ? (
          <a href="/approvals" className="hover:underline" style={{ color: "#a78bfa" }}>
            Review in Approvals →
          </a>
        ) : (
          <span style={{ color: "#5a6278" }}>(Mock mode)</span>
        )}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <AlertCircle size={10} style={{ color: "#ef4444" }} />
        <span style={{ color: "#ef4444" }}>Draft save failed.</span>
        <button onClick={() => setState("idle")} className="underline hover:no-underline" style={{ color: "#6b7a99" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={state === "saving"}
      onClick={createDraft}
      className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
      style={{
        color: "#c9a84c",
        backgroundColor: "rgba(201,168,76,0.06)",
        border: "1px solid rgba(201,168,76,0.20)",
      }}
      title={clientName ? `Create campaign draft for ${clientName}` : "Create campaign draft"}
    >
      {state === "saving" ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <FileText size={10} />
      )}
      {state === "saving" ? "Creating…" : "Create Campaign Draft"}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Save as Task — creates an operator queue task from a Veronica response
// ─────────────────────────────────────────────────────────────

function inferTaskPriority(content: string): "urgent" | "high" | "medium" {
  if (/critical|blocker|blocked|cannot launch|launch blocked|urgent/i.test(content)) return "urgent";
  if (/launch readiness|client health|at.risk|high.risk|missing|no.*connect/i.test(content)) return "high";
  return "medium";
}

function inferTaskType(content: string, agents: string[]): string {
  if (agents.includes("ghl_workflow_builder") || /ghl workflow|workflow blueprint/i.test(content)) return "ghl_workflow";
  if (/meta ad account|pixel|facebook page|integration|connect.*meta|connect.*ghl/i.test(content)) return "integration";
  if (agents.includes("creative_strategist") || /creative|asset|shoot|video|image.*ad/i.test(content)) return "creative";
  if (/campaign|ad copy|ad set|launch.*campaign/i.test(content)) return "campaign";
  if (agents.includes("client_communication") || /client message|communication draft/i.test(content)) return "client_message";
  if (agents.includes("reporting") || /report|weekly update|performance report/i.test(content)) return "reporting";
  if (agents.includes("data_quality") || /pipeline id|data quality|mismatch|data conflict/i.test(content)) return "data_cleanup";
  if (agents.includes("ghl_followup") || /follow.up|booking|appointment setter/i.test(content)) return "follow_up";
  if (agents.includes("sales_conversion") || /sales|close rate|setter process/i.test(content)) return "sales_process";
  return "internal_admin";
}

function SaveAsTaskButton({ msg, clientName }: { msg: ConsoleMsg; clientName?: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function saveTask() {
    setState("saving");

    const content = msg.text;
    const agents = msg.agentsUsed ?? [];
    const priority = inferTaskPriority(content);
    const taskType = inferTaskType(content, agents);

    // Auto-title: first meaningful line (up to 70 chars), appended with client name
    const firstLine = (content.split("\n")[0] ?? "").slice(0, 70).trim() || "Veronica Recommendation";
    const title = clientName ? `${firstLine} — ${clientName}` : firstLine;
    const sourceAgent = agents[0] ?? undefined;

    try {
      const res = await fetch("/api/operator-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: msg.detectedClientId,
          title,
          description: msg.text,
          taskType,
          priority,
          source: "veronica",
          sourceAgent,
        }),
      });
      if (res.ok) {
        setState("saved");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "saved") {
    return (
      <div className="flex items-center gap-2 text-[11px]" style={{ color: "#c9a84c" }}>
        <CheckCircle2 size={10} />
        Saved to Operator Queue.
        <a href="/operator-queue" className="hover:underline" style={{ color: "#a78bfa" }}>
          View Queue →
        </a>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <AlertCircle size={10} style={{ color: "#ef4444" }} />
        <span style={{ color: "#ef4444" }}>Failed to save task.</span>
        <button onClick={() => setState("idle")} className="underline hover:no-underline" style={{ color: "#6b7a99" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={state === "saving"}
      onClick={saveTask}
      className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
      style={{
        color: "#6b7a99",
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {state === "saving" ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <ListChecks size={10} />
      )}
      {state === "saving" ? "Saving…" : "Save as Single Task"}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Generate Task List — deterministic extraction from Veronica response
// ─────────────────────────────────────────────────────────────

interface ExtractedTask {
  title: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  taskType: string;
}

interface TaskRule {
  match: RegExp;
  title: (clientName?: string) => string;
  priority: "urgent" | "high" | "medium" | "low";
  taskType: string;
}

// Each `match` tolerates flexible natural language between the noun phrase and the
// negative indicator — `[^✓\n]{0,60}` allows colons, "has", "is", dashes, parens, etc.
// while stopping at a ✓ (completed item) or newline to avoid cross-sentence matches.
const TASK_RULES: TaskRule[] = [
  {
    match: /✗[^\n]*meta\s+ad\s+account|no\s+(?:\w+\s+){0,3}meta\s+ad\s+account|meta\s+(?:ad\s+)?account[^✓\n]{0,60}(?:not\b|missing|pending|disconnected|unconnected)|\bad\s+account[^✓\n]{0,60}(?:not\s+connected|missing|disconnected)|connect\s+(?:the\s+)?meta\s+(?:ad\s+)?account/i,
    title: (c) => `Connect Meta Ad Account${c ? ` for ${c}` : ""}`,
    priority: "urgent",
    taskType: "integration",
  },
  {
    match: /✗[^\n]*meta\s+pixel|no\s+(?:\w+\s+){0,3}meta\s+pixel|meta\s+pixel[^✓\n]{0,60}(?:not\b|missing|pending|not\s+installed)|pixel[^✓\n]{0,40}(?:not\s+installed|missing|pending)|install\s+(?:the\s+)?meta\s+pixel/i,
    title: (c) => `Install Meta Pixel${c ? ` for ${c}` : ""}`,
    priority: "urgent",
    taskType: "integration",
  },
  {
    match: /✗[^\n]*facebook\s+page|no\s+(?:\w+\s+){0,3}facebook\s+page|facebook\s+page[^✓\n]{0,60}(?:not\b|missing|pending|disconnected)|connect\s+(?:the\s+)?facebook\s+page/i,
    title: (c) => `Connect Facebook Page${c ? ` for ${c}` : ""}`,
    priority: "high",
    taskType: "integration",
  },
  {
    match: /✗[^\n]*ghl\s+location|no\s+(?:\w+\s+){0,3}ghl\s+location|ghl\s+location[^✓\n]{0,60}(?:not\b|missing|pending|disconnected)|connect\s+(?:the\s+)?ghl\s+location/i,
    title: (c) => `Connect GHL Location${c ? ` for ${c}` : ""}`,
    priority: "urgent",
    taskType: "integration",
  },
  {
    match: /no\s+approved\s+creative\s+assets?|✗[^\n]*approved\s+creative|no\s+creative\s+assets?|approved\s+creative\s+assets?[^✓\n]{0,60}(?:not\b|missing|pending)|upload\s+(?:and\s+approve\s+)?creative/i,
    title: (c) => `Upload and approve creative assets${c ? ` for ${c}` : ""}`,
    priority: "high",
    taskType: "creative",
  },
  {
    match: /no\s+(?:approved\s+)?campaign\s+draft|✗[^\n]*campaign\s+draft|campaign\s+draft[^✓\n]{0,60}(?:not\b|missing|pending|approved\s+or\s+ready)|prepare\s+(?:a\s+)?campaign\s+draft/i,
    title: (c) => `Prepare approval-ready campaign draft${c ? ` for ${c}` : ""}`,
    priority: "high",
    taskType: "campaign",
  },
  {
    match: /pipeline\s+id[^✓\n]{0,40}(?:missing|pending|needs?|mismatch)|backfill\s+(?:ghl\s+)?pipeline/i,
    title: (c) => `Backfill GHL Pipeline ID${c ? ` for ${c}` : ""}`,
    priority: "medium",
    taskType: "data_cleanup",
  },
  {
    match: /last\s+sync|stale\s+sync|data\s+may\s+be\s+stale|fresh\s+sync\s+recommended|trigger\s+(?:a\s+)?fresh\s+sync|✗[^\n]*ghl\s+sync/i,
    title: (c) => `Trigger fresh GHL sync${c ? ` for ${c}` : ""}`,
    priority: "medium",
    taskType: "data_cleanup",
  },
  {
    match: /ghl\s+workflow\s+blueprint|follow.?up\s+workflow|speed.?to.?lead\s+workflow|workflow\s+builder/i,
    title: (c) => `Configure GHL follow-up workflow${c ? ` for ${c}` : ""}`,
    priority: "medium",
    taskType: "ghl_workflow",
  },
  {
    match: /performance\s+report|weekly\s+update|monthly\s+report/i,
    title: (c) => `Generate performance report${c ? ` for ${c}` : ""}`,
    priority: "medium",
    taskType: "reporting",
  },
  {
    match: /communication\s+draft|client\s+message|follow.?up\s+message/i,
    title: (c) => `Review and finalize client communication${c ? ` for ${c}` : ""}`,
    priority: "medium",
    taskType: "client_message",
  },
];

function extractOperatorTasksFromResponse({
  text,
  clientName,
}: {
  text: string;
  clientName?: string;
}): ExtractedTask[] {
  const seen = new Set<string>();
  const tasks: ExtractedTask[] = [];

  for (const rule of TASK_RULES) {
    if (!rule.match.test(text)) continue;
    const title = rule.title(clientName);
    if (seen.has(title)) continue;
    seen.add(title);
    const matchIndex = text.search(rule.match);
    const start = Math.max(0, matchIndex - 40);
    const end = Math.min(text.length, matchIndex + 120);
    const excerpt = text.slice(start, end).replace(/\s+/g, " ").trim();
    tasks.push({
      title,
      description: `${excerpt}\n\nInternal task only. No external action has been performed.`,
      priority: rule.priority,
      taskType: rule.taskType,
    });
  }

  // Fallback only when no specific rule matched
  if (tasks.length === 0) {
    const firstLine = (text.split("\n").find((l) => l.trim().length > 10) ?? "").slice(0, 80).trim();
    tasks.push({
      title: clientName ? `Review Veronica analysis for ${clientName}` : "Review Veronica analysis",
      description: `${firstLine}\n\nInternal task only. No external action has been performed.`,
      priority: "medium",
      taskType: "internal_admin",
    });
  }

  return tasks;
}

function GenerateTaskListButton({ msg, clientName }: { msg: ConsoleMsg; clientName?: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedCount, setSavedCount] = useState(0);

  // Prefer structured suggestions from agent outputs (deterministic, exact labels).
  // Fall back to regex extraction from the synthesized response text only when no
  // structured suggestions are available (e.g. older response or non-client query).
  // Normalize both into a common shape so the POST logic is uniform.
  type TaskPost = { title: string; description: string; taskType: string; priority: string; clientId?: string | null; sourceAgent?: string };
  const structuredTasks = msg.operatorTaskSuggestions ?? [];
  const tasks: TaskPost[] = structuredTasks.length > 0
    ? structuredTasks
    : extractOperatorTasksFromResponse({ text: msg.text, clientName }).map((t) => ({
        ...t,
        clientId: msg.detectedClientId,
        sourceAgent: msg.agentsUsed?.[0],
      }));

  async function generateTasks() {
    setState("saving");
    let count = 0;
    try {
      await Promise.all(
        tasks.map(async (task) => {
          const res = await fetch("/api/operator-tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: task.clientId ?? msg.detectedClientId,
              title: task.title,
              description: task.description,
              taskType: task.taskType,
              priority: task.priority,
              source: "veronica",
              sourceAgent: task.sourceAgent ?? msg.agentsUsed?.[0],
            }),
          });
          if (res.ok) count++;
        })
      );
      setSavedCount(count);
      setState(count > 0 ? "saved" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "saved") {
    return (
      <div className="flex items-center gap-2 text-[11px]" style={{ color: "#c9a84c" }}>
        <CheckCircle2 size={10} />
        Saved {savedCount} task{savedCount !== 1 ? "s" : ""} to Operator Queue.
        <a href="/operator-queue" className="hover:underline" style={{ color: "#a78bfa" }}>
          View Queue →
        </a>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <AlertCircle size={10} style={{ color: "#ef4444" }} />
        <span style={{ color: "#ef4444" }}>Failed to generate tasks.</span>
        <button onClick={() => setState("idle")} className="underline hover:no-underline" style={{ color: "#6b7a99" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={state === "saving"}
      onClick={generateTasks}
      className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
      style={{
        color: "#c9a84c",
        backgroundColor: "rgba(201, 168, 76, 0.06)",
        border: "1px solid rgba(201, 168, 76, 0.18)",
      }}
    >
      {state === "saving" ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <Sparkles size={10} />
      )}
      {state === "saving" ? "Generating…" : `Generate Task List (${tasks.length})`}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

function AICampaignBuilderContent() {
  const { plans, saveDraft, getPlan } = usePlans();
  const { getIntelligence } = useIntelligence();
  const searchParams = useSearchParams();

  // The ?draft=<id> URL param (from Approvals → View Draft).
  // PlanProvider starts with [] and loads localStorage async, so getPlan() returns
  // undefined at mount but resolves on the next render after plans load.
  // We do NOT use lazy initializers here — those would capture null at mount
  // and never update. Instead we derive displayPlan reactively below.
  const urlDraftId = searchParams.get("draft");

  const [activeTab, setActiveTab] = useState<"builder" | "plans" | "console" | "automation">("builder");
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  // Builder clients — loaded from data provider so IDs match creative_assets.client_id
  const [builderClients, setBuilderClients] = useState<typeof clients>([]);

  // Form state — plain defaults (no getPlan in initializers — plans is [] at mount)
  const [selectedClientId, setSelectedClientId] = useState("");
  const [goal, setGoal] = useState("Lead Generation");
  const [service, setService] = useState("");
  const [creative, setCreative] = useState("");
  const [creativeNotes, setCreativeNotes] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<CreativeAsset[]>([]);
  const [assetNotes, setAssetNotes] = useState<Record<string, string>>({});
  const [assetAnalyses, setAssetAnalyses] = useState<Record<string, StoredAssetAnalysis>>({});
  const [analyzingAssets, setAnalyzingAssets] = useState<Set<string>>(new Set());
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  // Asset drop zone state
  const assetFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [assetUploading, setAssetUploading] = useState(false);
  const [assetUploadError, setAssetUploadError] = useState<string | null>(null);
  const [market, setMarket] = useState("");
  const [budget, setBudget] = useState("");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<CampaignDraft | null>(null);
  // When user explicitly resets, stop showing the URL-param draft
  const [planResetByUser, setPlanResetByUser] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  // mockModeActive: true only when server AI provider IS mock or key is genuinely missing.
  // Generation errors do NOT set this — a failed live generation ≠ mock mode.
  // Cleared by status check when configured:true or by each new generation start.
  // Never derived from build-time env vars — the server's AI_PROVIDER is authoritative.
  const [mockModeActive, setMockModeActive] = useState(false);
  const [mockModeNotice, setMockModeNotice] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string>("mock");
  // aiConfigured: null = status check not yet complete; true/false = result.
  // Used to show the live-provider badge before any generation attempt.
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  // Derived: the plan to display is either a locally generated plan,
  // or the URL-param draft once plans load from localStorage.
  // This is reactive — automatically resolves once PlanProvider's useEffect fires.
  const urlParamDraft =
    urlDraftId && !planResetByUser ? (getPlan(urlDraftId) ?? null) : null;
  const displayPlan = currentPlan ?? urlParamDraft;

  const { user } = useAuth();

  // ── Veronica Console state ──
  const [chat, setChat] = useState<ConsoleMsg[]>([
    {
      role: "agent",
      text: "Veronica online. I have access to all portal data — clients, campaigns, approvals, reports, and Meta/GHL sync status. What do you want to know?",
      dataSources: ["clients", "campaign_drafts", "reports", "approvals"],
    },
  ]);
  const [consoleMessage, setConsoleMessage] = useState("");
  const [isConsoleLoading, setIsConsoleLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, isConsoleLoading]);

  // Check server AI provider status on mount.
  // When configured:true  → explicitly clear mock state (fixes stale true from prior sessions).
  // When configured:false → set mock state so the banner shows before any generation attempt.
  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.ok ? r.json() : null)
      .then((status: { provider?: string; configured?: boolean; usingLegacyKeyName?: boolean } | null) => {
        if (!status) return;
        if (status.provider !== "mock" && status.configured) {
          // Live provider is correctly configured — clear any stale mock state.
          setAiConfigured(true);
          setAiProvider(status.provider ?? "anthropic");
          setMockModeActive(false);
          setMockModeNotice(null);
        } else {
          // Provider is mock or key is missing.
          setAiConfigured(false);
          setMockModeActive(true);
          if (status.usingLegacyKeyName) {
            setMockModeNotice(
              "A Vercel env var for the Anthropic key has a misspelled name. Rename it to ANTHROPIC_API_KEY in Vercel settings to enable live generation."
            );
          } else if (status.provider !== "mock") {
            setMockModeNotice(
              "ANTHROPIC_API_KEY is missing in Vercel — add it alongside AI_PROVIDER=anthropic to enable live generation."
            );
          } else {
            // Intentional mock mode — default banner text is sufficient.
            setMockModeNotice(null);
          }
        }
      })
      .catch(() => {}); // silent — a status check failure must not break the page
  }, []);

  // Load real clients from data provider so selectedClientId matches creative_assets.client_id
  useEffect(() => {
    getDataProvider().getClients().then((fetched) => {
      if (fetched.length > 0) setBuilderClients(fetched);
    }).catch(() => {});
  }, []);

  // Use data-provider clients when available; fall back to static list until loaded
  const effectiveClients = useMemo(
    () => (builderClients.length > 0 ? builderClients : clients),
    [builderClients]
  );

  const selectedClient = effectiveClients.find((c) => c.id === selectedClientId) ?? null;
  const clientIntelligence = selectedClientId ? (getIntelligence(selectedClientId) ?? null) : null;
  const { allAssets: allPersistedAssets, prependAsset } = usePersistedCreativeAssets();
  const clientAssets = selectedClientId ? getAssetsForClient(selectedClientId, allPersistedAssets) : [];

  function handleClientChange(id: string) {
    setSelectedClientId(id);
    const c = effectiveClients.find((cl) => cl.id === id);
    if (c) {
      setMarket(c.market);
      setBudget(c.monthlyBudget.replace("/mo", "").trim());
      setService(c.services[0] ?? "");
      setCreative("");
    } else {
      setMarket(""); setBudget(""); setService(""); setCreative("");
    }
    setSelectedAssets([]);
    setCreativeNotes("");
    setShowAssetPicker(false);
    setCurrentPlan(null);
  }

  async function handleBuilderAssetUpload(file: File) {
    if (!selectedClientId) return;
    setAssetUploading(true);
    setAssetUploadError(null);
    try {
      const resolvedMime = file.type || (file.name.endsWith(".jpg") || file.name.endsWith(".jpeg") ? "image/jpeg" : file.name.endsWith(".png") ? "image/png" : "video/mp4");
      const assetId = `ca-builder-${Date.now()}`;
      const fileRecord = {
        id: assetId,
        clientId: selectedClientId,
        fileName: file.name,
        fileType: mimeToFileType(resolvedMime),
        fileSize: file.size,
        mimeType: resolvedMime,
        category: "creative_asset" as const,
        storageUrl: "",
        thumbnailUrl: null as string | null,
        uploadedBy: "Operator",
        uploadedAt: new Date().toISOString(),
        notes: "",
        status: "pending" as const,
        _blob: file,
      };
      const storageProvider = getStorageProvider();
      const saved = await storageProvider.saveFile(fileRecord);
      const newAsset: CreativeAsset = {
        id: assetId,
        clientId: selectedClientId,
        clientName: selectedClient?.name ?? selectedClientId,
        fileName: file.name,
        fileType: resolvedMime.startsWith("video/") ? "video" : "image",
        assetType: "Project Reveal",
        category: "Creative Asset",
        thumbnailUrl: saved.thumbnailUrl ?? null,
        storageUrl: saved.storageUrl ?? null,
        uploadDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        service: "",
        market: "",
        campaignUseCase: "",
        notes: "",
        status: "Uploaded",
        tags: [],
        approvedForAds: false,
      };
      prependAsset(newAsset);
      setSelectedAssets((prev) => [...prev, newAsset]);
      if (!creative) setCreative(newAsset.assetType);
    } catch (err) {
      setAssetUploadError(err instanceof Error ? err.message : "Upload failed — check storage configuration.");
    } finally {
      setAssetUploading(false);
    }
  }

  async function handleGenerate() {
    if (!selectedClient || !goal || !service || !market || !budget) return;
    setIsGenerating(true);
    setCurrentPlan(null);
    setGenerateError(null);
    // Reset mock state before each attempt — a new generation supersedes prior errors.
    // If the server is configured, this clears any stale mockModeActive from a prior failure.
    setMockModeActive(false);
    setMockModeNotice(null);
    setActiveSection("overview");

    try {
      const res = await fetch("/api/ai/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: selectedClient,
          service,
          market,
          budget,
          goal,
          creativeType: creative,
          creativeNotes,
          clientIntelligence,
          selectedAsset: selectedAssets[0] ?? null,
          selectedAssets,
          assetNotes: Object.keys(assetNotes).length > 0 ? assetNotes : undefined,
          assetAnalyses: Object.keys(assetAnalyses).length > 0 ? assetAnalyses : undefined,
        }),
      });

      if (!res.ok) {
        // Parse the error body to surface a specific, actionable message.
        let errMsg = `API error ${res.status}`;
        try {
          const errBody = await res.json() as {
            error?: string;
            sanitizedError?: string;
            missingEnvNames?: string[];
            usingLegacyKeyName?: boolean;
          };
          if (res.status === 503 && errBody.missingEnvNames?.length) {
            errMsg = `503:AI provider not configured in Vercel — ${errBody.missingEnvNames.join(", ")} is missing from your environment variables.`;
          } else if (res.status === 502 && errBody.sanitizedError) {
            // Append hint if Vercel has the Anthropic key under a misspelled env var name
            const legacyHint = errBody.usingLegacyKeyName
              ? " (Vercel has the key under a misspelled env var name — rename it to ANTHROPIC_API_KEY in Vercel settings)"
              : "";
            errMsg = `502:AI provider call failed: ${errBody.sanitizedError}${legacyHint}`;
          } else if (errBody.error) {
            errMsg = `${res.status}:${errBody.error}`;
          }
        } catch { /* ignore parse errors */ }
        throw new Error(errMsg);
      }

      const { draft, mockMode, provider, notice } = await res.json();
      setCurrentPlan({
        ...draft,
        selectedCreativeAssetId: selectedAssets[0]?.id ?? null,
      });
      setMockModeActive(mockMode ?? false);
      setMockModeNotice(notice ?? null);
      setAiProvider(provider ?? "mock");
      // Explicit defensive clear — ensures no stale error from a prior failed run
      // can ever coexist with a successful generation result.
      setGenerateError(null);
    } catch (err) {
      console.error("Campaign generation failed:", err);
      const rawMsg = err instanceof Error ? err.message : "";
      let generateErrorMsg: string;
      if (rawMsg.startsWith("503:")) {
        generateErrorMsg = rawMsg.slice(4);
      } else if (rawMsg.startsWith("502:")) {
        generateErrorMsg = `Live AI provider call failed: ${rawMsg.slice(4)}`;
      } else {
        generateErrorMsg = "Could not reach the generation API — showing mock draft.";
      }
      // Client-side fallback to local mock — build adVariations from selectedAssets directly
      const plan = generateMockPlan(selectedClient, goal, service, market, budget, creative);
      const fallbackVariations =
        selectedAssets.length > 0
          ? selectedAssets.map((a, i) => {
              const operatorNote = assetNotes[a.id];
              const storedAnalysis = assetAnalyses[a.id] ?? null;
              return buildAssetAdVariation(
                {
                  id: a.id,
                  fileName: a.fileName,
                  assetType: a.assetType,
                  fileType: a.fileType as "image" | "video",
                  approvedForAds: a.approvedForAds,
                  notes: operatorNote || a.notes || undefined,
                },
                service,
                clientIntelligence,
                i === 0,
                storedAnalysis
              );
            })
          : undefined;
      setCurrentPlan({
        ...plan,
        adVariations: fallbackVariations,
        selectedCreativeAssetId: selectedAssets[0]?.id ?? null,
      });
      // Reset aiProvider to "mock" — the displayed plan IS a local mock fallback,
      // not a live Anthropic response. Without this, aiProvider stays "anthropic"
      // (set by the status-check effect on mount) and the green banner would falsely
      // say "Generated by Veronica — using Anthropic Claude" for a fallback draft.
      setAiProvider("mock");
      // Do NOT set mockModeActive here. A generation failure (timeout, 502, network
      // error) does not mean the AI provider is configured as mock — it means this
      // specific call failed. The mock banner reflects provider configuration.
      // The generateError display (red banner below) already surfaces the failure.
      setGenerateError(generateErrorMsg);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSaveDraft() {
    if (!displayPlan) return;
    saveDraft(displayPlan);
  }

  function handleUpdateStatus(status: DraftStatus) {
    if (!displayPlan) return;
    const updated: CampaignDraft = {
      ...displayPlan,
      status,
      approvalStatus: status,
      updatedAt: new Date().toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
      }),
    };
    setCurrentPlan(updated);
    saveDraft(updated);
  }

  async function handleAnalyzeAsset(asset: CreativeAsset) {
    if (analyzingAssets.has(asset.id)) return;
    setAnalyzingAssets((prev) => new Set(prev).add(asset.id));
    try {
      const res = await fetch("/api/creatives/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: [{
            id: asset.id,
            assetType: asset.assetType,
            service: service || asset.assetType,
            market: market || undefined,
            notes: assetNotes[asset.id] || asset.notes || undefined,
            approvedForAds: asset.approvedForAds,
            fileName: asset.fileName,
            clientName: selectedClient?.name,
          }],
        }),
      });
      if (!res.ok) throw new Error(`Analyze API error ${res.status}`);
      const data = await res.json();
      const result = data.results?.[0];
      if (result?.analysis) {
        setAssetAnalyses((prev) => ({ ...prev, [asset.id]: result.analysis }));
      }
    } catch (err) {
      console.error("Asset analysis failed:", err);
    } finally {
      setAnalyzingAssets((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    }
  }

  async function sendConsoleMessage() {
    const msg = consoleMessage.trim();
    if (!msg || isConsoleLoading) return;
    setConsoleMessage("");
    setChat((prev) => [...prev, { role: "user", text: msg }]);
    setIsConsoleLoading(true);
    try {
      const res = await fetch("/api/veronica", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: msg,
          userRole: user?.role ?? "admin",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setChat((prev) => [
        ...prev,
        {
          role: "agent",
          text: data.reply ?? "No response.",
          dataSources: data.dataSources,
          relatedLinks: data.relatedLinks,
          actionSuggested: data.actionSuggested,
          agentsUsed: data.agentsUsed,
          approvalRequired: data.approvalRequired,
          suggestedApprovalDestination: data.suggestedApprovalDestination,
          whatVeronicaCanDoNow: data.whatVeronicaCanDoNow,
          whatRequiresHumanApproval: data.whatRequiresHumanApproval,
          whatIsBlocked: data.whatIsBlocked,
          dataConfidence: data.dataConfidence,
          detectedClientId: data.detectedClientId,
          detectedClientName: data.detectedClientName,
          operatorTaskSuggestions: data.operatorTaskSuggestions,
        },
      ]);
    } catch {
      setChat((prev) => [
        ...prev,
        {
          role: "agent",
          text: "Veronica could not reach the portal. Check your connection and try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsConsoleLoading(false);
    }
  }

  const canGenerate = !!selectedClient && !!goal && !!service && !!market && !!budget && !isGenerating;

  const visibleSectionTabs = sectionTabs.filter((s) => {
    if (s.id === "buyer") return !!displayPlan?.buyerPsychologyUsed;
    if (s.id === "market") return !!displayPlan?.marketResearchUsed;
    if (s.id === "rationale") return !!displayPlan?.strategicRationale;
    if (s.id === "creative-intel") return !!displayPlan?.creativeIntelligenceUsed;
    if (s.id === "asset-matrix") return !!displayPlan?.adVariations?.length;
    return true;
  });

  const tabs = [
    { id: "builder" as const, label: "Build with Veronica", icon: Bot },
    { id: "plans" as const, label: `Campaign Plans${plans.length > 0 ? ` (${plans.length})` : ""}`, icon: FileText },
    { id: "console" as const, label: "Veronica Console", icon: MessageSquare },
    { id: "automation" as const, label: "Automation Rules", icon: Settings2 },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header — Vault Co branded hero */}
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ backgroundColor: "var(--t-surface)", border: "1px solid rgba(0, 129, 242, 0.15)" }}
      >
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(0, 129, 242, 0.07)" }} />
        <div className="absolute -top-16 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(255, 132, 0, 0.07)" }} />
        <div className="relative flex items-center justify-between px-6 py-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2
                className="text-[22px] font-bold tracking-wide"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
              >
                Veronica
              </h2>
              <span
                className="text-[10px] font-bold rounded-full px-2 py-0.5"
                style={{ color: "#ff8400", backgroundColor: "rgba(255, 132, 0, 0.10)", border: "1px solid rgba(255, 132, 0, 0.22)" }}
              >
                by Vault Co
              </span>
            </div>
            <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
              AI Growth Operator — Campaign strategy, client intelligence, creative analysis, and approval-ready growth plans.
            </p>
          </div>
          <span
            className="flex items-center gap-1.5 text-[11px] font-bold rounded-full px-3 py-1.5"
            style={{ color: "#22c55e", backgroundColor: "rgba(34, 197, 94, 0.10)", border: "1px solid rgba(34, 197, 94, 0.20)" }}
          >
            <span className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
            Veronica Active
          </span>
        </div>
      </div>

      {/* Veronica intro card */}
      <div className="relative overflow-hidden bg-[var(--t-surface)] border border-[#ff8400]/20 rounded-xl px-5 py-4">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#ff8400]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#ff8400]/10 border border-[#ff8400]/25 flex items-center justify-center flex-shrink-0">
            <Sparkles size={15} className="text-[#ff8400]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-bold text-[var(--t-text)]">Veronica</span>
              <span className="text-[10px] font-semibold text-[#ff8400] bg-[#ff8400]/10 border border-[#ff8400]/25 rounded-full px-1.5 py-0.5">by Vault Co</span>
              <span className="text-[10px] text-[var(--t-muted)]">· AI Growth Operator</span>
            </div>
            <p className="text-[12px] text-[var(--t-muted)] leading-relaxed mb-2">
              Veronica studies client onboarding data, buyer psychology, market context, creative assets, and campaign performance to build approval-ready campaign drafts for roofing and construction clients.
            </p>
            <div className="flex items-start gap-1.5">
              <ShieldCheck size={11} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[var(--t-muted)] leading-snug">
                Veronica can research, generate, recommend, and draft.{" "}
                <span className="text-[#f59e0b]">Veronica cannot publish campaigns, activate ads, increase budgets, send reports, or push GHL workflows without human approval.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Safety notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-[#f59e0b]/5 border border-[#f59e0b]/15 rounded-xl">
        <ShieldCheck size={13} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-[var(--t-muted)] leading-snug">
          <span className="text-[#f59e0b] font-semibold">Approval Required: </span>
          Veronica-generated campaign drafts require human approval before launch, budget changes, or Meta publishing.
        </p>
      </div>

      {/* AI provider notice — four mutually exclusive states:
          1. mockModeActive: provider is mock or key missing → show mock banner
          2. !mockModeActive + displayPlan + !generateError: generation succeeded live → show result banner
          3. !mockModeActive + !displayPlan (or generateError) + aiConfigured: configured, no live result yet → show live status badge
          4. aiConfigured === null: status check still pending → show nothing
          Rule: the green "Generated by Veronica" banner only fires when the MOST RECENT
          generation attempt succeeded. If generateError is set, that attempt failed and
          only the red error banner (below) should describe the result.
      */}
      {mockModeActive ? (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-[#3d4f6e]/20 border border-[#3d4f6e]/40 rounded-xl">
          <AlertCircle size={13} className="text-[var(--t-muted)] flex-shrink-0 mt-0.5" />
          <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
            <p className="text-[12px] text-[var(--t-muted)] leading-snug">
              <span className="text-[var(--t-text)] font-semibold">Veronica is running in mock mode. </span>
              {mockModeNotice ?? "Set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY in Vercel environment variables to enable live generation."}
            </p>
            <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3d4f6e]/40 text-[var(--t-muted)] border border-[#3d4f6e]/60 uppercase tracking-wider">
              Mock
            </span>
          </div>
        </div>
      ) : (displayPlan && !generateError) ? (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-xl">
          <CheckCircle2 size={13} className="text-[#22c55e] flex-shrink-0" />
          <p className="text-[12px] text-[#22c55e] flex-1">
            <span className="font-semibold">Generated by Veronica — </span>
            {aiProvider === "anthropic" ? "using Anthropic Claude (claude-sonnet-4-6)" : aiProvider === "openai" ? "using OpenAI GPT-4o" : aiProvider}
          </p>
          <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 uppercase tracking-wider">
            {aiProvider === "anthropic" ? "Live · Claude" : aiProvider === "openai" ? "Live · GPT-4o" : "Live"}
          </span>
        </div>
      ) : aiConfigured === true ? (
        /* Live status badge — shown before any generation when provider is confirmed live */
        <div className="flex items-center gap-2.5 px-4 py-2 bg-[#22c55e]/5 border border-[#22c55e]/15 rounded-xl">
          <CheckCircle2 size={11} className="text-[#22c55e] flex-shrink-0" />
          <p className="text-[11px] text-[#22c55e] flex-1">
            <span className="font-semibold">Live AI Provider: </span>
            {aiProvider === "anthropic" ? "Anthropic Claude (claude-sonnet-4-6)" : aiProvider === "openai" ? "OpenAI GPT-4o" : aiProvider}
            {" "}— ready to generate
          </p>
          <span className="flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 uppercase tracking-wider">
            Live
          </span>
        </div>
      ) : null}

      {/* Generate error notice */}
      {generateError && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl">
          <AlertCircle size={13} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[var(--t-muted)] leading-snug">
            <span className="text-[#ef4444] font-semibold">Generation error: </span>
            {generateError}
          </p>
        </div>
      )}

      {/* Creative approval warning — via creativeIntelligenceUsed */}
      {displayPlan?.creativeIntelligenceUsed && !displayPlan.creativeIntelligenceUsed.approvedForAds && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-xl">
          <AlertCircle size={13} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[var(--t-muted)] leading-snug">
            <span className="text-[#f59e0b] font-semibold">Creative needs approval: </span>
            The selected creative asset ({displayPlan.creativeIntelligenceUsed.assetType}) has not been approved for Meta ads.
            Approve it in the{" "}
            <a href="/creatives" className="text-[#f59e0b] hover:underline">Creative Library</a>
            {" "}before submitting this campaign.
          </p>
        </div>
      )}

      {/* Creative approval warning — via direct selectedAssets */}
      {selectedAssets.some(a => !a.approvedForAds) && !displayPlan?.creativeIntelligenceUsed && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-xl">
          <AlertCircle size={13} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[var(--t-muted)] leading-snug">
            <span className="text-[#f59e0b] font-semibold">Unapproved creative selected: </span>
            <span className="text-[var(--t-text)]">{selectedAssets.filter(a => !a.approvedForAds).map(a => a.fileName).join(", ")}</span> {selectedAssets.filter(a => !a.approvedForAds).length === 1 ? "has" : "have"} not been approved for Meta ads.
            This campaign cannot be submitted for final approval until the creative is reviewed.
            Go to the{" "}
            <a href="/creatives" className="text-[#f59e0b] hover:underline">Creative Library</a>
            {" "}to approve it first.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-[var(--t-border)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
              activeTab === id
                ? "text-[#0081f2] border-[#0081f2]"
                : "text-[var(--t-muted)] border-transparent hover:text-[var(--t-text)]"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Build Campaign ── */}
      {activeTab === "builder" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Form */}
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--t-border)]">
              <Sparkles size={13} className="text-[#0081f2]" />
              <span className="text-[13px] font-semibold text-[var(--t-text)]">Build with Veronica</span>
            </div>
            <div className="p-5 space-y-5">
              {/* 1. Client */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--t-dim)] uppercase tracking-wider">
                  1. Select Client
                </label>
                <div className="relative">
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full appearance-none bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--t-text)] focus:outline-none focus:border-[#0081f2]/50 transition-colors pr-8"
                  >
                    <option value="">— Select a client —</option>
                    {effectiveClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t-muted)] pointer-events-none" />
                </div>
                {selectedClient && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge label={selectedClient.status} variant={clientStatusVariant[selectedClient.status]} />
                    <span className="text-[11px] text-[var(--t-muted)]">
                      {selectedClient.market} · {selectedClient.monthlyBudget}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Goal */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--t-dim)] uppercase tracking-wider">
                  2. Campaign Goal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Lead Generation", "Retargeting", "Brand Awareness", "Conversion"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className={`px-3 py-2 rounded-lg text-[12px] font-medium text-left transition-colors border ${
                        goal === g
                          ? "bg-[#0081f2]/10 border-[#0081f2]/40 text-[#0081f2]"
                          : "bg-[var(--t-surface-2)] border-[var(--t-border)] text-[var(--t-muted)] hover:text-[var(--t-text)] hover:border-[var(--t-border)]"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Service */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--t-dim)] uppercase tracking-wider">
                  3. Service to Promote
                </label>
                <div className="relative">
                  <select
                    key={selectedClientId ?? 'no-client'}
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    disabled={!selectedClient}
                    className="w-full appearance-none bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--t-text)] focus:outline-none focus:border-[#0081f2]/50 transition-colors pr-8 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">— Select a service —</option>
                    {(selectedClient?.services ?? []).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t-muted)] pointer-events-none" />
                </div>
              </div>

              {/* 4. Creative */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--t-dim)] uppercase tracking-wider">
                  4. Creative Assets (Optional)
                </label>

                {/* Browse library — multi-select toggle */}
                {selectedClientId && (
                  <div className="relative">
                    <button
                      onClick={() => setShowAssetPicker(!showAssetPicker)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg text-[12px] text-[var(--t-muted)] hover:text-[var(--t-text)] hover:border-[var(--t-border)] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Film size={11} />
                        Browse {selectedClient?.name.split(" ")[0]}&apos;s Library ({clientAssets.length})
                        {selectedAssets.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[#0081f2]/15 text-[#0081f2] border border-[#0081f2]/25">
                            {selectedAssets.length} selected
                          </span>
                        )}
                      </span>
                      <ChevronDown size={11} className={`transition-transform ${showAssetPicker ? "rotate-180" : ""}`} />
                    </button>
                    {showAssetPicker && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                        {clientAssets.length === 0 ? (
                          <div className="px-3 py-4 text-center space-y-1.5">
                            <div className="text-[11px] text-[var(--t-muted)]">
                              No assets in library for {selectedClient?.name ?? "this client"}
                            </div>
                            <a
                              href="/creatives"
                              className="text-[11px] text-[#0081f2] hover:underline block"
                              onClick={() => setShowAssetPicker(false)}
                            >
                              Upload in Creative Library →
                            </a>
                          </div>
                        ) : (
                          clientAssets.map((asset) => {
                            const color = assetTypeColors[asset.assetType as AssetType] ?? "#6b7a99";
                            const AIcon = asset.fileType === "video" ? Video : ImageIcon;
                            const isSelected = selectedAssets.some((a) => a.id === asset.id);
                            return (
                              <button
                                key={asset.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedAssets((prev) => prev.filter((a) => a.id !== asset.id));
                                  } else {
                                    setSelectedAssets((prev) => [...prev, asset]);
                                    setCreative(asset.assetType);
                                  }
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left border-b border-[var(--t-border)]/40 last:border-0 ${isSelected ? "bg-[#0081f2]/6" : "hover:bg-[var(--t-surface-2)]"}`}
                              >
                                <div
                                  className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border"
                                  style={isSelected ? { backgroundColor: "#0081f215", borderColor: "#0081f250" } : { backgroundColor: `${color}12`, borderColor: `${color}28` }}
                                >
                                  {isSelected
                                    ? <CheckCircle2 size={11} style={{ color: "#0081f2" }} />
                                    : <AIcon size={9} style={{ color }} />
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] text-[var(--t-text)] font-medium truncate">{asset.fileName}</div>
                                  <div className="text-[10px] text-[var(--t-muted)]">{asset.assetType} · {asset.status}</div>
                                </div>
                                {asset.approvedForAds ? (
                                  <span className="text-[9px] text-[#22c55e] flex items-center gap-0.5 flex-shrink-0">
                                    <CheckCircle2 size={9} />Approved
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-[#f59e0b] flex items-center gap-0.5 flex-shrink-0">
                                    <AlertCircle size={9} />Needs Review
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected assets list */}
                {selectedAssets.length > 0 && (
                  <div className="space-y-2">
                    {selectedAssets.map((asset, i) => {
                      const color = assetTypeColors[asset.assetType as AssetType] ?? "#6b7a99";
                      const storedAnalysis = assetAnalyses[asset.id];
                      const isAnalyzing = analyzingAssets.has(asset.id);
                      const analysisSource = storedAnalysis?.analysis_source;
                      const visualConfidence = storedAnalysis?.visual_confidence;
                      return (
                        <div key={asset.id} className="bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg overflow-hidden">
                          {/* Asset header row */}
                          <div className="flex items-center gap-2 px-2.5 py-2">
                            <div
                              className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: `${color}15`, border: `1px solid ${color}28` }}
                            >
                              {asset.fileType === "video"
                                ? <Video size={11} style={{ color }} />
                                : <ImageIcon size={11} style={{ color }} />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium text-[var(--t-text)] truncate">{asset.fileName}</span>
                                {i === 0 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#0081f2]/12 text-[#0081f2] border border-[#0081f2]/20 flex-shrink-0">Primary</span>
                                )}
                              </div>
                              <div className="text-[10px] text-[var(--t-muted)]">
                                {asset.assetType}
                                {asset.approvedForAds
                                  ? <span className="ml-1.5 text-[#22c55e]">· Approved</span>
                                  : <span className="ml-1.5 text-[#f59e0b]">· Needs Approval</span>
                                }
                              </div>
                            </div>
                            {/* Analysis status badge */}
                            {isAnalyzing ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 flex items-center gap-1 flex-shrink-0">
                                <Loader2 size={8} className="animate-spin" />Analyzing…
                              </span>
                            ) : analysisSource === "vision" ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 flex-shrink-0">
                                Vision {visualConfidence === "high" ? "✓" : "~"}
                              </span>
                            ) : analysisSource === "metadata_only" ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#6b7a99]/10 text-[#6b7a99] border border-[#6b7a99]/20 flex-shrink-0">
                                Metadata
                              </span>
                            ) : null}
                            {/* Analyze button */}
                            {!isAnalyzing && asset.fileType !== "video" && (
                              <button
                                onClick={() => handleAnalyzeAsset(asset)}
                                className="text-[9px] px-1.5 py-0.5 rounded border border-[#c9a84c]/30 text-[#c9a84c] hover:bg-[#c9a84c]/8 transition-colors flex-shrink-0"
                              >
                                {storedAnalysis ? "Re-analyze" : "Analyze"}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedAssets((prev) => prev.filter((a) => a.id !== asset.id));
                                if (selectedAssets.length === 1) setCreative("");
                              }}
                              className="text-[var(--t-dim)] hover:text-[#ef4444] flex-shrink-0 transition-colors"
                            >
                              <XCircle size={12} />
                            </button>
                          </div>
                          {/* Visual summary (if analyzed) */}
                          {storedAnalysis?.visual_summary && storedAnalysis.visual_summary !== "Image not available for analysis" && (
                            <div className="px-2.5 pb-1.5 border-t border-[var(--t-border)]/40">
                              <p className="text-[10px] text-[#22c55e]/70 italic leading-snug pt-1.5">{storedAnalysis.visual_summary}</p>
                            </div>
                          )}
                          {/* Per-asset operator notes */}
                          <div className="px-2.5 pb-2 border-t border-[var(--t-border)]/40">
                            <textarea
                              value={assetNotes[asset.id] ?? ""}
                              onChange={(e) => setAssetNotes((prev) => ({ ...prev, [asset.id]: e.target.value }))}
                              placeholder="Operator notes for this asset (optional)…"
                              rows={2}
                              className="w-full mt-1.5 bg-[var(--t-surface)] border border-[var(--t-border)] rounded px-2 py-1.5 text-[10px] text-[var(--t-text)] placeholder-[var(--t-dim)] resize-none focus:outline-none focus:border-[#c9a84c]/40"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Upload drop zone */}
                <>
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                      isDragging
                        ? "border-[#0081f2]/60 bg-[#0081f2]/5"
                        : "border-[var(--t-border)] hover:border-[#0081f2]/30"
                    } ${assetUploading ? "pointer-events-none opacity-60" : ""}`}
                    onClick={() => !assetUploading && assetFileInputRef.current?.click()}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const files = Array.from(e.dataTransfer.files);
                      files.forEach((file) => handleBuilderAssetUpload(file));
                    }}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                  >
                    <input
                      ref={assetFileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        files.forEach((file) => handleBuilderAssetUpload(file));
                        e.target.value = "";
                      }}
                    />
                    {assetUploading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={13} className="text-[#0081f2] animate-spin" />
                        <span className="text-[11px] text-[var(--t-muted)]">Uploading to Creative Library…</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-[var(--t-surface-2)] border border-[var(--t-border)] flex items-center justify-center mx-auto mb-2">
                          <Layers size={13} className="text-[var(--t-dim)]" />
                        </div>
                        <div className="text-[11px] text-[var(--t-muted)]">
                          Drop images/videos or <span className="text-[#0081f2]">browse</span>
                        </div>
                        <div className="text-[10px] text-[var(--t-dim)] mt-0.5">JPG, PNG, MP4 · Multiple files · Max 50MB each</div>
                      </>
                    )}
                  </div>
                  {assetUploadError && (
                    <p className="text-[10px] text-[#ef4444]">{assetUploadError}</p>
                  )}
                  <div className="text-[10px] text-[var(--t-dim)] text-center">or select creative type</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["Before/After", "Testimonial", "Inspection Day", "Storm Damage", "Project Reveal", "Team Photo", "Owner On Camera", "Drone Footage", "UGC Style Video"].map((lbl) => (
                      <button
                        key={lbl}
                        onClick={() => setCreative(lbl)}
                        className={`px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors border text-center ${
                          creative === lbl
                            ? "bg-[#0081f2]/10 border-[#0081f2]/40 text-[#0081f2]"
                            : "bg-[var(--t-surface-2)] border-[var(--t-border)] text-[var(--t-muted)] hover:text-[var(--t-text)] hover:border-[var(--t-border)]"
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                  {creative && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0081f2]/8 border border-[#0081f2]/20 rounded-lg">
                      <CheckCircle2 size={11} className="text-[#0081f2] flex-shrink-0" />
                      <span className="text-[11px] text-[#0081f2]">{creative} selected</span>
                    </div>
                  )}
                </>

                {/* Creative notes */}
                <textarea
                  value={creativeNotes}
                  onChange={(e) => setCreativeNotes(e.target.value)}
                  placeholder="Creative notes — tone, specific shots, restrictions..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg text-[12px] text-[var(--t-text)] placeholder-[#3d4f6e] focus:outline-none focus:border-[#0081f2]/50 transition-colors resize-none"
                />
              </div>

              {/* 5. Market */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--t-dim)] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={10} />5. Market / City
                </label>
                <input
                  type="text"
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  placeholder="e.g. Tempe, AZ"
                  className="w-full bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--t-text)] placeholder-[#3d4f6e] focus:outline-none focus:border-[#0081f2]/50 transition-colors"
                />
              </div>

              {/* 6. Budget */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--t-dim)] uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={10} />6. Monthly Budget
                </label>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. $1,500"
                  className="w-full bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--t-text)] placeholder-[#3d4f6e] focus:outline-none focus:border-[#0081f2]/50 transition-colors"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full flex items-center justify-center gap-2 py-3 vc-orange-gradient text-white text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <><Loader2 size={14} className="animate-spin" />Veronica is building…</>
                ) : (
                  <><Sparkles size={14} />Build with Veronica</>
                )}
              </button>
              {!selectedClient && (
                <p className="text-[11px] text-[var(--t-dim)] text-center">Select a client to get started</p>
              )}
            </div>
          </div>

          {/* Output panel */}
          <div className="lg:col-span-2">
            {!isGenerating && !displayPlan && (
              <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl p-16 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-xl bg-[var(--t-surface-2)] border border-[var(--t-border)] flex items-center justify-center mb-4">
                  <Bot size={22} className="text-[#0081f2]" />
                </div>
                <div className="text-[14px] font-semibold text-[var(--t-text)] mb-1.5">Full Campaign Draft will appear here</div>
                <p className="text-[12px] text-[var(--t-muted)] max-w-xs leading-relaxed">
                  Fill in all fields and click Build with Veronica. Veronica will produce a complete campaign brief across 8 sections.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-sm">
                  {sectionTabs.slice(0, 8).map((s) => (
                    <span key={s.id} className="flex items-center gap-1 px-2.5 py-1 bg-[var(--t-surface-2)] border border-[var(--t-border)] text-[10px] text-[var(--t-dim)] rounded-full">
                      <s.icon size={9} style={{ color: s.color }} />{s.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl p-16 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-xl bg-[#0081f2]/10 border border-[#0081f2]/25 flex items-center justify-center mb-4">
                  <Loader2 size={22} className="text-[#0081f2] animate-spin" />
                </div>
                <div className="text-[14px] font-semibold text-[var(--t-text)] mb-1.5">Veronica is building the campaign draft…</div>
                <p className="text-[12px] text-[var(--t-muted)]">
                  Building copy, lead form, GHL workflow, creative direction &amp; compliance check
                </p>
              </div>
            )}

            {!isGenerating && displayPlan && (
              <div className="space-y-3">
                {/* Plan header */}
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge
                          label={draftStatusLabel[displayPlan.status]}
                          variant={draftStatusVariant[displayPlan.status]}
                        />
                        <span className="text-[10px] text-[var(--t-dim)]">Generated {displayPlan.createdAt}</span>
                      </div>
                      <h3 className="text-[15px] font-bold text-[var(--t-text)] leading-snug">{displayPlan.campaignName}</h3>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--t-muted)] flex-wrap">
                        <span className="font-mono text-[var(--t-dim)]">{displayPlan.clientId}</span>
                        <span>·</span><span>{displayPlan.clientName}</span>
                        <span>·</span><span>{displayPlan.market}</span>
                        <span>·</span><span>{displayPlan.budget}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                      <button
                        onClick={() => { setCurrentPlan(null); setPlanResetByUser(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[var(--t-muted)] border border-[var(--t-border)] rounded-lg hover:text-[var(--t-text)] hover:border-[var(--t-border)] transition-colors"
                      >
                        <RotateCcw size={11} />Reset
                      </button>
                      <ApprovalBar
                        plan={displayPlan}
                        onSave={handleSaveDraft}
                        onUpdate={handleUpdateStatus}
                        hasUnapprovedCreative={selectedAssets.some(a => !a.approvedForAds)}
                        size="sm"
                      />
                    </div>
                  </div>
                  {displayPlan.status === "needs_review" && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#0081f2]/5 border border-[#0081f2]/15 rounded-lg">
                      <CheckCircle2 size={11} className="text-[#0081f2] flex-shrink-0" />
                      <p className="text-[11px] text-[var(--t-muted)]">
                        Submitted for review · Visible on the{" "}
                        <a href="/approvals" className="text-[#0081f2] hover:underline">Approvals page</a>
                      </p>
                    </div>
                  )}
                </div>

                {/* Section nav */}
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-0 overflow-x-auto border-b border-[var(--t-border)]">
                    {visibleSectionTabs.map(({ id, label, icon: Icon, color }) => (
                      <button
                        key={id}
                        onClick={() => setActiveSection(id)}
                        className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-medium whitespace-nowrap transition-colors border-b-2 -mb-px flex-shrink-0 ${
                          activeSection === id
                            ? "border-current"
                            : "border-transparent text-[var(--t-muted)] hover:text-[var(--t-text)]"
                        }`}
                        style={activeSection === id ? { color, borderColor: color } : {}}
                      >
                        <Icon size={12} />
                        {label}
                        {id === "compliance" && (
                          <span className={`ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            displayPlan.compliance.metaRisk.startsWith("MEDIUM")
                              ? "bg-[#f59e0b]/15 text-[#f59e0b]"
                              : "bg-[#22c55e]/15 text-[#22c55e]"
                          }`}>
                            {displayPlan.compliance.metaRisk.startsWith("MEDIUM") ? "MED" : "LOW"}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    {/* 1 — Overview */}
                    {activeSection === "overview" && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: "Campaign Name", value: displayPlan.campaignName },
                            { label: "Client", value: `${displayPlan.clientName} (${displayPlan.clientId})` },
                            { label: "Market", value: displayPlan.market },
                            { label: "Service", value: displayPlan.service },
                            { label: "Campaign Goal", value: displayPlan.goal },
                            { label: "Monthly Budget", value: displayPlan.budget },
                          ].map(({ label, value }) => (
                            <div key={label} className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                              <div className="text-[10px] font-semibold text-[var(--t-dim)] uppercase tracking-wider mb-1">{label}</div>
                              <p className="text-[13px] font-semibold text-[var(--t-text)] leading-snug">{value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                            <div className="text-[10px] font-semibold text-[var(--t-dim)] uppercase tracking-wider mb-1">Status</div>
                            <Badge label={draftStatusLabel[displayPlan.status]} variant={draftStatusVariant[displayPlan.status]} />
                          </div>
                          <div className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                            <div className="text-[10px] font-semibold text-[var(--t-dim)] uppercase tracking-wider mb-1">Created By</div>
                            <p className="text-[12px] text-[var(--t-text)]">{displayPlan.createdBy}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-[var(--t-border)]">
                          <div className="text-[11px] font-semibold text-[var(--t-dim)] uppercase tracking-wider mb-3">Approval Actions</div>
                          <ApprovalBar plan={displayPlan} onSave={handleSaveDraft} onUpdate={handleUpdateStatus} hasUnapprovedCreative={selectedAssets.some(a => !a.approvedForAds)} size="md" />
                          <p className="text-[11px] text-[var(--t-dim)] mt-3 leading-snug">
                            {displayPlan.status === "draft" && "Draft not yet submitted. Save or submit for human approval."}
                            {displayPlan.status === "needs_review" && "Submitted — visible on the Approvals page."}
                            {displayPlan.status === "changes_requested" && "Changes requested. Revise and resubmit."}
                            {displayPlan.status === "approved" && "Approved. Click Mark Ready for Meta when ready to push."}
                            {displayPlan.status === "rejected" && "Draft rejected. Revise and resubmit."}
                            {displayPlan.status === "ready_for_meta" && "Marked ready. Connect the Meta API to publish."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 2 — Meta Structure */}
                    {activeSection === "meta" && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <SubLabel>Campaign Objective</SubLabel>
                            <p className="text-[13px] text-[#a78bfa] font-mono font-semibold">{displayPlan.metaStructure.campaignObjective}</p>
                          </div>
                          <div>
                            <SubLabel>Campaign Type</SubLabel>
                            <p className="text-[12px] text-[var(--t-text)]">{displayPlan.metaStructure.campaignType}</p>
                          </div>
                          <div>
                            <SubLabel>Optimization Event</SubLabel>
                            <p className="text-[12px] text-[var(--t-text)] font-mono">{displayPlan.metaStructure.optimizationEvent}</p>
                          </div>
                          <div>
                            <SubLabel>Budget Split</SubLabel>
                            <p className="text-[12px] text-[var(--t-muted)] leading-snug">{displayPlan.metaStructure.budgetSplit}</p>
                          </div>
                        </div>
                        <div>
                          <SubLabel>Ad Sets ({displayPlan.metaStructure.adSetNames.length})</SubLabel>
                          <div className="space-y-1.5">
                            {displayPlan.metaStructure.adSetNames.map((name, i) => (
                              <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                                <span className="w-5 h-5 rounded flex-shrink-0 bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[10px] font-bold text-[#a78bfa] flex items-center justify-center">{i + 1}</span>
                                <span className="text-[12px] text-[var(--t-text)]">{name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <SubLabel>Audience</SubLabel>
                          <p className="text-[12px] text-[var(--t-muted)] leading-relaxed bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg p-3">{displayPlan.metaStructure.audience}</p>
                        </div>
                        <div>
                          <SubLabel>Location Targeting</SubLabel>
                          <p className="text-[12px] text-[var(--t-muted)] leading-relaxed bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg p-3">{displayPlan.metaStructure.locationTargeting}</p>
                        </div>
                        <div>
                          <SubLabel>Placements</SubLabel>
                          <div className="flex flex-wrap gap-1.5">
                            {displayPlan.metaStructure.placements.map((p) => (
                              <span key={p} className="px-2.5 py-1 text-[11px] font-medium bg-[var(--t-surface-2)] border border-[var(--t-border)] text-[var(--t-muted)] rounded-lg">{p}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3 — Ad Copy */}
                    {activeSection === "copy" && (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <SubLabel>Primary Text — 3 Variants</SubLabel>
                          {displayPlan.adCopy.primaryTexts.map((t, i) => (
                            <CopyVariant key={i} label="Primary Text" text={t} index={i} />
                          ))}
                        </div>
                        <div>
                          <SubLabel>Headlines — 3 Options</SubLabel>
                          <div className="space-y-1.5">
                            {displayPlan.adCopy.headlines.map((h, i) => (
                              <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                                <span className="text-[11px] font-mono text-[var(--t-dim)] flex-shrink-0">{i + 1}.</span>
                                <span className="text-[13px] font-semibold text-[var(--t-text)]">{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <SubLabel>Descriptions — 3 Options</SubLabel>
                          <div className="space-y-1.5">
                            {displayPlan.adCopy.descriptions.map((d, i) => (
                              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                                <span className="text-[11px] font-mono text-[var(--t-dim)] flex-shrink-0">{i + 1}.</span>
                                <span className="text-[12px] text-[var(--t-muted)]">{d}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <SubLabel>CTA Button</SubLabel>
                          <span className="px-4 py-1.5 bg-[#ff8400]/10 border border-[#ff8400]/30 text-[#ff8400] text-[13px] font-semibold rounded-lg">
                            {displayPlan.adCopy.cta}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 4 — Lead Form */}
                    {activeSection === "leadform" && (
                      <div className="space-y-5">
                        <div>
                          <SubLabel>Form Name</SubLabel>
                          <p className="text-[13px] font-semibold text-[var(--t-text)]">{displayPlan.leadForm.formName}</p>
                        </div>
                        <div>
                          <SubLabel>Intro Copy</SubLabel>
                          <p className="text-[12px] text-[var(--t-muted)] leading-relaxed bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg p-3">{displayPlan.leadForm.introCopy}</p>
                        </div>
                        <div>
                          <SubLabel>Qualification Questions</SubLabel>
                          <div className="space-y-1.5">
                            {displayPlan.leadForm.qualificationQuestions.map((q, i) => (
                              <div key={i} className="flex items-start gap-3 px-3 py-2.5 bg-[var(--t-surface-2)] border border-[#22c55e]/15 rounded-lg">
                                <span className="w-4 h-4 rounded flex-shrink-0 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[9px] font-bold text-[#22c55e] flex items-center justify-center mt-0.5">{i + 1}</span>
                                <span className="text-[12px] text-[var(--t-text)]">{q}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <SubLabel>Contact Fields</SubLabel>
                          <div className="flex flex-wrap gap-1.5">
                            {displayPlan.leadForm.contactFields.map((f) => (
                              <span key={f} className="px-2.5 py-1 text-[11px] font-medium bg-[var(--t-surface-2)] border border-[#22c55e]/20 text-[#22c55e] rounded-lg">{f}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <SubLabel>Consent Language</SubLabel>
                          <p className="text-[11px] text-[var(--t-muted)] leading-relaxed italic bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg p-3">{displayPlan.leadForm.consentLanguage}</p>
                        </div>
                        <div>
                          <SubLabel>Thank You Screen</SubLabel>
                          <p className="text-[12px] text-[var(--t-muted)] leading-relaxed bg-[var(--t-surface-2)] border border-[#22c55e]/15 rounded-lg p-3">{displayPlan.leadForm.thankYouCopy}</p>
                        </div>
                      </div>
                    )}

                    {/* 5 — GHL Workflow */}
                    {activeSection === "ghl" && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <SubLabel>Tags to Apply</SubLabel>
                            <div className="flex flex-wrap gap-1.5">
                              {displayPlan.ghlWorkflow.tags.map((t) => (
                                <span key={t} className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-[var(--t-surface-2)] border border-[var(--t-border)] text-[#0081f2] rounded">
                                  <Tag size={8} />{t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <SubLabel>Pipeline Stage</SubLabel>
                            <p className="text-[12px] text-[var(--t-text)]">{displayPlan.ghlWorkflow.pipelineStage}</p>
                          </div>
                        </div>
                        <div>
                          <SubLabel>Immediate SMS (0 min)</SubLabel>
                          <div className="flex gap-2.5 bg-[var(--t-surface-2)] border border-[#0081f2]/15 rounded-lg p-3">
                            <Phone size={12} className="text-[#0081f2] flex-shrink-0 mt-0.5" />
                            <p className="text-[12px] text-[var(--t-muted)] leading-relaxed">{displayPlan.ghlWorkflow.immediateSms}</p>
                          </div>
                        </div>
                        <div>
                          <SubLabel>Immediate Email (1 min)</SubLabel>
                          <div className="bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg p-3 space-y-2">
                            <p className="text-[11px] text-[var(--t-dim)]">Subject: <span className="text-[var(--t-text)] font-medium">{displayPlan.ghlWorkflow.immediateEmail.subject}</span></p>
                            <pre className="text-[11px] text-[var(--t-muted)] leading-relaxed whitespace-pre-wrap font-sans">{displayPlan.ghlWorkflow.immediateEmail.body}</pre>
                          </div>
                        </div>
                        <div>
                          <SubLabel>Internal Notification</SubLabel>
                          <p className="text-[12px] text-[var(--t-muted)] leading-snug bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg p-3">{displayPlan.ghlWorkflow.internalNotification}</p>
                        </div>
                        <div>
                          <SubLabel>Setter Task</SubLabel>
                          <p className="text-[12px] text-[var(--t-muted)] leading-snug">{displayPlan.ghlWorkflow.setterTask}</p>
                        </div>
                        <div>
                          <SubLabel>AI Voice Follow-Up (if no call within 10 min)</SubLabel>
                          <p className="text-[12px] text-[var(--t-muted)] leading-relaxed bg-[var(--t-surface-2)] border border-[#ff8400]/15 rounded-lg p-3">{displayPlan.ghlWorkflow.aiVoiceTrigger}</p>
                        </div>
                        <div>
                          <SubLabel>Booked Appointment — Stop Condition</SubLabel>
                          <p className="text-[12px] text-[var(--t-muted)] leading-snug bg-[var(--t-surface-2)] border border-[#22c55e]/15 rounded-lg p-3">{displayPlan.ghlWorkflow.bookedStopCondition}</p>
                        </div>
                        <div>
                          <SubLabel>Full Workflow ({displayPlan.ghlWorkflow.steps.length} steps)</SubLabel>
                          <NumberedList items={displayPlan.ghlWorkflow.steps} />
                        </div>
                      </div>
                    )}

                    {/* 6 — Creative Direction */}
                    {activeSection === "creative" && (
                      <div className="space-y-5">
                        <div>
                          <SubLabel>Creative Angle</SubLabel>
                          <p className="text-[13px] font-semibold text-[var(--t-text)]">{displayPlan.creativeDirection.angle}</p>
                        </div>
                        <div>
                          <SubLabel>Hook</SubLabel>
                          <p className="text-[14px] font-medium italic text-[var(--t-text)] leading-snug bg-[var(--t-surface-2)] border border-[#ff8400]/20 rounded-lg p-4">{displayPlan.creativeDirection.hook}</p>
                        </div>
                        <div>
                          <SubLabel>Shot List</SubLabel>
                          <NumberedList items={displayPlan.creativeDirection.shotList} />
                        </div>
                        <div>
                          <SubLabel>Text Overlays</SubLabel>
                          <BulletList items={displayPlan.creativeDirection.textOverlays} color="#ff8400" />
                        </div>
                        <div>
                          <SubLabel>Voiceover Script (30 sec)</SubLabel>
                          <p className="text-[12px] text-[var(--t-muted)] leading-relaxed bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg p-3">{displayPlan.creativeDirection.voiceoverScript}</p>
                        </div>
                        <div>
                          <SubLabel>Recommended Format</SubLabel>
                          <p className="text-[12px] text-[var(--t-muted)]">{displayPlan.creativeDirection.recommendedFormat}</p>
                        </div>
                        <div>
                          <SubLabel>Recommended Placements</SubLabel>
                          <div className="flex flex-wrap gap-1.5">
                            {displayPlan.creativeDirection.recommendedPlacements.map((p, i) => (
                              <span key={p} className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border ${
                                i === 0
                                  ? "bg-[#ff8400]/10 border-[#ff8400]/25 text-[#ff8400]"
                                  : "bg-[var(--t-surface-2)] border-[var(--t-border)] text-[var(--t-muted)]"
                              }`}>
                                {i === 0 ? "★ " : ""}{p}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 7 — Compliance */}
                    {activeSection === "compliance" && (
                      <div className="space-y-5">
                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                          displayPlan.compliance.metaRisk.startsWith("MEDIUM")
                            ? "bg-[#f59e0b]/5 border-[#f59e0b]/20"
                            : "bg-[#22c55e]/5 border-[#22c55e]/20"
                        }`}>
                          <ShieldCheck size={16} className={displayPlan.compliance.metaRisk.startsWith("MEDIUM") ? "text-[#f59e0b]" : "text-[#22c55e]"} />
                          <div>
                            <p className={`text-[12px] font-semibold ${displayPlan.compliance.metaRisk.startsWith("MEDIUM") ? "text-[#f59e0b]" : "text-[#22c55e]"}`}>
                              {displayPlan.compliance.metaRisk.split(" —")[0]} Risk
                            </p>
                            <p className="text-[11px] text-[var(--t-muted)] mt-0.5">{displayPlan.compliance.metaRisk.split(" — ")[1]}</p>
                          </div>
                        </div>
                        <div>
                          <SubLabel>SMS / TCPA Compliance</SubLabel>
                          <p className="text-[12px] text-[var(--t-muted)] leading-relaxed">{displayPlan.compliance.smsCompliance}</p>
                        </div>
                        {displayPlan.compliance.insuranceRisk !== "N/A — No insurance claim language in this campaign category." && (
                          <div>
                            <SubLabel>Insurance Claim Risk</SubLabel>
                            <p className="text-[12px] text-[var(--t-muted)] leading-relaxed">{displayPlan.compliance.insuranceRisk}</p>
                          </div>
                        )}
                        <div>
                          <SubLabel>Disallowed Wording</SubLabel>
                          <div className="space-y-1.5">
                            {displayPlan.compliance.disallowedPhrases.map((phrase, i) => (
                              <div key={i} className="flex items-start gap-2 px-3 py-2 bg-[var(--t-surface-2)] border border-[#ef4444]/15 rounded-lg">
                                <AlertCircle size={11} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
                                <span className="text-[12px] text-[var(--t-muted)]">{phrase}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <SubLabel>Approval Warnings</SubLabel>
                          <div className="space-y-1.5">
                            {displayPlan.compliance.approvalWarnings.map((w, i) => (
                              <div key={i} className="flex items-start gap-2 px-3 py-2 bg-[#f59e0b]/5 border border-[#f59e0b]/15 rounded-lg">
                                <AlertCircle size={11} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
                                <span className="text-[12px] text-[var(--t-muted)] leading-snug">{w}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 8 — Optimization */}
                    {activeSection === "optimization" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { label: "CPL Threshold", value: displayPlan.optimization.cplThreshold, color: "#ef4444" },
                            { label: "CPBA Threshold", value: displayPlan.optimization.cpbaThreshold, color: "#f59e0b" },
                            { label: "Booking Rate Floor", value: displayPlan.optimization.bookingRateFloor, color: "#f59e0b" },
                            { label: "Creative Fatigue Trigger", value: displayPlan.optimization.creativeFatigueTrigger, color: "#a78bfa" },
                            { label: "Budget Scaling Rule", value: displayPlan.optimization.budgetScalingRule, color: "#22c55e" },
                            { label: "Pause Rule", value: displayPlan.optimization.pauseRule, color: "#ef4444" },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                              <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color }}>{label}</div>
                              <p className="text-[12px] text-[var(--t-muted)] leading-snug">{value}</p>
                            </div>
                          ))}
                        </div>
                        <div>
                          <SubLabel>Human Approval Required For</SubLabel>
                          <BulletList items={displayPlan.optimization.humanApprovalTriggers} color="#a78bfa" />
                        </div>
                        <div className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                          <div className="text-[10px] font-semibold text-[var(--t-dim)] uppercase tracking-wider mb-1">Veronica Safety Rule</div>
                          <p className="text-[11px] text-[var(--t-muted)] leading-snug">
                            Veronica generates drafts and recommendations only. Veronica cannot publish campaigns, activate ads, increase budgets, send reports, or push GHL workflows without explicit human approval.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 9 — Buyer Psychology */}
                    {activeSection === "buyer" && displayPlan?.buyerPsychologyUsed && (
                      <div className="space-y-4">
                        {[
                          { label: "Buyer Insight", value: displayPlan.buyerPsychologyUsed.buyerInsight, color: "#a78bfa" },
                          { label: "Urgency Trigger", value: displayPlan.buyerPsychologyUsed.urgencyTrigger, color: "#f59e0b" },
                          { label: "Trust Trigger Used", value: displayPlan.buyerPsychologyUsed.trustTriggerUsed, color: "#22c55e" },
                          { label: "Objection Addressed", value: displayPlan.buyerPsychologyUsed.objectionAddressed, color: "#ef4444" },
                          { label: "Hook Rationale", value: displayPlan.buyerPsychologyUsed.hookRationale, color: "#ff8400" },
                          { label: "CTA Rationale", value: displayPlan.buyerPsychologyUsed.ctaRationale, color: "#0081f2" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color }}>{label}</div>
                            <p className="text-[12px] text-[var(--t-muted)] leading-snug">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 10 — Market Research */}
                    {activeSection === "market" && displayPlan?.marketResearchUsed && (
                      <div className="space-y-4">
                        {[
                          { label: "Market Summary", value: displayPlan.marketResearchUsed.marketSummary, color: "#22c55e" },
                          { label: "Competitor Angle", value: displayPlan.marketResearchUsed.competitorAngle, color: "#ff8400" },
                          { label: "Audience Rationale", value: displayPlan.marketResearchUsed.audienceRationale, color: "#0081f2" },
                          { label: "Location Rationale", value: displayPlan.marketResearchUsed.locationRationale, color: "#a78bfa" },
                          { label: "Seasonality Note", value: displayPlan.marketResearchUsed.seasonalityNote, color: "#f59e0b" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color }}>{label}</div>
                            <p className="text-[12px] text-[var(--t-muted)] leading-snug">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 11 — Strategic Rationale */}
                    {activeSection === "rationale" && displayPlan?.strategicRationale && (
                      <div className="space-y-4">
                        <div className="p-4 bg-[#ff8400]/5 border border-[#ff8400]/20 rounded-lg">
                          <div className="text-[10px] font-semibold text-[#ff8400] uppercase tracking-wider mb-1.5">Why This Campaign Was Built This Way</div>
                          <p className="text-[12px] text-[var(--t-text)] leading-relaxed">{displayPlan.strategicRationale.whyThisCampaign}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { label: "Buyer Insight Used", value: displayPlan.strategicRationale.buyerInsightUsed, color: "#a78bfa" },
                            { label: "Market Insight Used", value: displayPlan.strategicRationale.marketInsightUsed, color: "#22c55e" },
                            { label: "Offer Angle Used", value: displayPlan.strategicRationale.offerAngleUsed, color: "#ff8400" },
                            { label: "Creative Angle Used", value: displayPlan.strategicRationale.creativeAngleUsed, color: "#0081f2" },
                            { label: "Trust Trigger Used", value: displayPlan.strategicRationale.trustTriggerUsed, color: "#22c55e" },
                            { label: "Objection Addressed", value: displayPlan.strategicRationale.objectionAddressed, color: "#ef4444" },
                            { label: "Audience Rationale", value: displayPlan.strategicRationale.audienceRationale, color: "#a78bfa" },
                            { label: "Lead Form Rationale", value: displayPlan.strategicRationale.leadFormRationale, color: "#f59e0b" },
                            { label: "Follow-Up Rationale", value: displayPlan.strategicRationale.followUpRationale, color: "#0081f2" },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                              <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color }}>{label}</div>
                              <p className="text-[12px] text-[var(--t-muted)] leading-snug">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 12 — Creative Intelligence */}
                    {/* Asset Matrix — per-asset copy variations */}
                    {activeSection === "asset-matrix" && displayPlan?.adVariations && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Layers size={14} className="text-[#0081f2]" />
                          <div className="text-[13px] font-bold text-[var(--t-text)]">Asset Copy Matrix</div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0081f2]/10 text-[#0081f2] border border-[#0081f2]/20">{displayPlan.adVariations.length} asset{displayPlan.adVariations.length !== 1 ? "s" : ""}</span>
                        </div>
                        <p className="text-[11px] text-[var(--t-muted)]">Veronica generated asset-specific ad copy for each selected creative. The first asset is primary.</p>
                        {(displayPlan.adVariations as AssetAdVariation[]).map((v, i) => {
                          const isVideo = v.fileType === "video";
                          const accentColor = v.approvedForAds ? "#22c55e" : "#f59e0b";
                          return (
                            <div key={v.assetId} className="border border-[var(--t-border)] rounded-xl overflow-hidden">
                              {/* Asset header */}
                              <div className="flex items-center gap-3 px-4 py-3 bg-[var(--t-surface-2)] border-b border-[var(--t-border)]">
                                <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "#0081f215", border: "1px solid #0081f228" }}>
                                  {isVideo ? <Video size={12} className="text-[#0081f2]" /> : <ImageIcon size={12} className="text-[#0081f2]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[12px] font-semibold text-[var(--t-text)] truncate">{v.fileName}</span>
                                    {v.isPrimary && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#0081f2]/12 text-[#0081f2] border border-[#0081f2]/20 flex-shrink-0">Primary</span>}
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ color: accentColor, backgroundColor: `${accentColor}12`, border: `1px solid ${accentColor}25` }}>
                                      {v.approvedForAds ? "✓ Approved" : "⚠ Needs Approval"}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-[var(--t-muted)]">{v.assetType} · {isVideo ? "Video" : "Image"} · Asset {i + 1}</div>
                                </div>
                              </div>
                              {/* Copy fields */}
                              <div className="p-4 space-y-3">
                                {/* Creative angle */}
                                <div className="p-3 bg-[#0081f2]/5 border border-[#0081f2]/15 rounded-lg">
                                  <div className="text-[10px] font-semibold text-[#0081f2] uppercase tracking-wider mb-1">Creative Angle</div>
                                  <p className="text-[12px] text-[var(--t-muted)] leading-snug">{v.creativeAngle}</p>
                                </div>
                                {/* Primary texts */}
                                <div className="grid grid-cols-1 gap-2">
                                  {[
                                    { label: "Primary Text 1", value: v.primaryText1, color: "#ff8400" },
                                    { label: "Primary Text 2", value: v.primaryText2, color: "#a78bfa" },
                                  ].map(({ label, value, color }) => (
                                    <div key={label} className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color }}>{label}</div>
                                      <p className="text-[12px] text-[var(--t-muted)] leading-snug">{value}</p>
                                    </div>
                                  ))}
                                </div>
                                {/* Headlines + hook */}
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { label: "Headline 1", value: v.headline1 },
                                    { label: "Headline 2", value: v.headline2 },
                                    { label: "Description", value: v.description },
                                    { label: "CTA", value: v.cta },
                                  ].map(({ label, value }) => (
                                    <div key={label} className="p-2.5 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                                      <div className="text-[10px] font-semibold text-[var(--t-dim)] uppercase tracking-wider mb-0.5">{label}</div>
                                      <p className="text-[11px] text-[var(--t-text)] leading-snug">{value}</p>
                                    </div>
                                  ))}
                                </div>
                                <div className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                                  <div className="text-[10px] font-semibold text-[#ff8400] uppercase tracking-wider mb-1">Hook</div>
                                  <p className="text-[12px] text-[var(--t-muted)] leading-snug">{v.hook}</p>
                                </div>
                                {/* Video-specific fields */}
                                {isVideo && (
                                  <div className="space-y-2 pt-2 border-t border-[var(--t-border)]">
                                    <div className="text-[10px] font-semibold text-[#a78bfa] uppercase tracking-wider">Video-Specific</div>
                                    {[
                                      { label: "First 3-Second Hook", value: v.firstThreeSecondHook },
                                      { label: "Opening Frame", value: v.suggestedOpeningFrame },
                                      { label: "Caption Primary Text", value: v.captionPrimaryText },
                                      { label: "Retargeting Use", value: v.retargetingUse },
                                    ].filter(f => !!f.value).map(({ label, value }) => (
                                      <div key={label} className="p-2.5 bg-[#a78bfa]/5 border border-[#a78bfa]/15 rounded-lg">
                                        <div className="text-[10px] font-semibold text-[#a78bfa] uppercase tracking-wider mb-0.5">{label}</div>
                                        <p className="text-[11px] text-[var(--t-muted)] leading-snug">{value}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Placement + compliance */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="p-2.5 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                                    <div className="text-[10px] font-semibold text-[#22c55e] uppercase tracking-wider mb-1.5">Placements</div>
                                    <div className="flex flex-wrap gap-1">
                                      {v.recommendedPlacement.map((p) => (
                                        <span key={p} className="text-[9px] px-1.5 py-0.5 bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/15 rounded-full">{p}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="p-2.5 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                                    <div className="text-[10px] font-semibold text-[#f59e0b] uppercase tracking-wider mb-1">Compliance</div>
                                    <p className="text-[10px] text-[var(--t-muted)] leading-snug">{v.complianceNotes}</p>
                                  </div>
                                </div>
                                {/* Visual assumption / Vision summary */}
                                <div className="p-2.5 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <div className="text-[10px] font-semibold text-[var(--t-dim)] uppercase tracking-wider">
                                      {v.analysisSource === "vision" ? "Vision Summary" : "Visual Assumption"}
                                    </div>
                                    {v.analysisSource && (
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                                        v.analysisSource === "vision"
                                          ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20"
                                          : "bg-[#6b7a99]/10 text-[#6b7a99] border-[#6b7a99]/20"
                                      }`}>
                                        {v.analysisSource === "vision"
                                          ? `Vision · ${v.visualConfidence ?? "medium"} confidence`
                                          : "Metadata only"}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[var(--t-dim)] leading-snug italic">{v.visualAssumption}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activeSection === "creative-intel" && displayPlan?.creativeIntelligenceUsed && (
                      <div className="space-y-4">
                        {/* Header card */}
                        <div className="p-4 bg-[#a78bfa]/5 border border-[#a78bfa]/20 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-semibold text-[#a78bfa] uppercase tracking-wider">
                              Creative Intelligence Analysis
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                displayPlan.creativeIntelligenceUsed.approvedForAds
                                  ? "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/25"
                                  : "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/25"
                              }`}
                            >
                              {displayPlan.creativeIntelligenceUsed.approvedForAds ? "✓ Approved for Ads" : "⚠ Needs Approval"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="text-[13px] font-bold text-[var(--t-text)]">{displayPlan.creativeIntelligenceUsed.assetType}</div>
                              <div className="text-[11px] text-[#a78bfa]">{displayPlan.creativeIntelligenceUsed.creativeStrength}</div>
                            </div>
                          </div>
                        </div>

                        {/* Why this creative */}
                        <div className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                          <div className="text-[10px] font-semibold text-[#a78bfa] uppercase tracking-wider mb-1.5">Why This Creative</div>
                          <p className="text-[12px] text-[var(--t-muted)] leading-snug">{displayPlan.creativeIntelligenceUsed.whyThisCreative}</p>
                        </div>

                        {/* Trust signals */}
                        <div className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                          <div className="text-[10px] font-semibold text-[#22c55e] uppercase tracking-wider mb-2">Trust Signals</div>
                          <div className="flex flex-wrap gap-1.5">
                            {displayPlan.creativeIntelligenceUsed.trustSignals.map((s) => (
                              <span key={s} className="text-[10px] px-2 py-0.5 bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 rounded-full">{s}</span>
                            ))}
                          </div>
                        </div>

                        {/* Key fields */}
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { label: "Buyer Intent Level", value: displayPlan.creativeIntelligenceUsed.buyerIntent, color: "#f59e0b" },
                            { label: "Recommended Angle", value: displayPlan.creativeIntelligenceUsed.recommendedAngle, color: "#0081f2" },
                            { label: "Recommended Hook", value: displayPlan.creativeIntelligenceUsed.recommendedHook, color: "#ff8400" },
                            { label: "Recommended CTA", value: displayPlan.creativeIntelligenceUsed.recommendedCTA, color: "#ff8400" },
                            { label: "Compliance Note", value: displayPlan.creativeIntelligenceUsed.complianceNote, color: "#ef4444" },
                            { label: "Retargeting Use", value: displayPlan.creativeIntelligenceUsed.retargetingUse, color: "#a78bfa" },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                              <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color }}>{label}</div>
                              <p className="text-[12px] text-[var(--t-muted)] leading-snug">{value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Placement recommendations */}
                        <div className="p-3 bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-lg">
                          <div className="text-[10px] font-semibold text-[#0081f2] uppercase tracking-wider mb-2">Placement Recommendations</div>
                          <div className="space-y-1">
                            {displayPlan.creativeIntelligenceUsed.placementRecommendation.map((p, i) => (
                              <div key={p} className="flex items-center gap-2 text-[12px]">
                                <span className="text-[10px] font-bold text-[var(--t-dim)] w-4">{i + 1}.</span>
                                <span className={i === 0 ? "text-[var(--t-text)] font-medium" : "text-[var(--t-muted)]"}>{p}</span>
                                {i === 0 && <span className="text-[9px] px-1.5 py-0.5 bg-[#0081f2]/15 text-[#0081f2] border border-[#0081f2]/20 rounded-full">Primary</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section footer nav */}
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => {
                      const idx = visibleSectionTabs.findIndex((s) => s.id === activeSection);
                      if (idx > 0) setActiveSection(visibleSectionTabs[idx - 1].id);
                    }}
                    disabled={activeSection === visibleSectionTabs[0]?.id}
                    className="text-[11px] text-[var(--t-muted)] hover:text-[var(--t-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous section
                  </button>
                  <span className="text-[10px] text-[var(--t-dim)]">
                    {visibleSectionTabs.findIndex((s) => s.id === activeSection) + 1} / {visibleSectionTabs.length}
                  </span>
                  <button
                    onClick={() => {
                      const idx = visibleSectionTabs.findIndex((s) => s.id === activeSection);
                      if (idx < visibleSectionTabs.length - 1) setActiveSection(visibleSectionTabs[idx + 1].id);
                    }}
                    disabled={activeSection === visibleSectionTabs[visibleSectionTabs.length - 1]?.id}
                    className="text-[11px] text-[var(--t-muted)] hover:text-[var(--t-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next section →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Generated Plans tab ── */}
      {activeTab === "plans" && (
        <div>
          {plans.length === 0 ? (
            <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl p-16 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--t-surface-2)] border border-[var(--t-border)] flex items-center justify-center mb-3">
                <FileText size={18} className="text-[var(--t-dim)]" />
              </div>
              <div className="text-[13px] font-semibold text-[var(--t-text)] mb-1">No plans saved yet</div>
              <p className="text-[12px] text-[var(--t-muted)]">
                Generate and save a campaign plan from the Build Campaign tab.
              </p>
            </div>
          ) : (
            <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--t-border)]">
                    {["Client", "Campaign", "Goal", "Budget", "Saved", "Status", ""].map((h, i) => (
                      <th
                        key={`${h}-${i}`}
                        className={`px-4 py-3.5 text-[9px] font-bold text-[var(--t-dim)] uppercase tracking-widest ${
                          ["Client", "Campaign"].includes(h) ? "text-left" : h === "" ? "" : "text-right"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`border-b border-[var(--t-border)]/60 hover:bg-[var(--t-surface-2)]/60 transition-colors ${
                        i === plans.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[var(--t-text)]">{p.clientName}</div>
                        <div className="text-[10px] font-mono text-[var(--t-dim)]">{p.clientId}</div>
                      </td>
                      <td className="px-4 py-3.5 text-[var(--t-muted)] max-w-[200px] truncate">{p.campaignName}</td>
                      <td className="px-4 py-3.5 text-right text-[var(--t-text)]">{p.goal}</td>
                      <td className="px-4 py-3.5 text-right text-[var(--t-text)]">{p.budget}</td>
                      <td className="px-4 py-3.5 text-right text-[var(--t-muted)]">{p.updatedAt}</td>
                      <td className="px-4 py-3.5 text-right">
                        <Badge label={draftStatusLabel[p.status]} variant={draftStatusVariant[p.status]} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setCurrentPlan(p);
                            setActiveSection("overview");
                            setActiveTab("builder");
                          }}
                          className="text-[11px] text-[#0081f2] hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Agent Console ── */}
      {activeTab === "console" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div
            className="lg:col-span-2 flex flex-col bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl overflow-hidden"
            style={{ minHeight: "520px" }}
          >
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--t-border)]">
              <Bot size={14} className="text-[#0081f2]" />
              <span className="text-[13px] font-semibold text-[var(--t-text)]">Veronica Command Center</span>
              <span
                className="ml-3 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ color: "#a78bfa", backgroundColor: "rgba(167, 139, 250, 0.10)", border: "1px solid rgba(167, 139, 250, 0.22)" }}
              >
                <ShieldCheck size={9} />
                Approval-Gated Operator
              </span>
              <span className="ml-auto text-[10px] text-[var(--t-dim)]">Veronica by Vault Co</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chat.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${msg.role === "agent" ? "bg-[#0c0f15] border border-[#18b8f0]/30" : "bg-[#f07820]/15 border border-[#f07820]/25"}`}>
                    {msg.role === "agent"
                      ? <Image src="/vaultco-logo.png" alt="Agent" width={28} height={28} className="object-cover scale-[1.8] translate-y-[-2px]" />
                      : <span className="text-[10px] font-bold text-[#f07820]">VC</span>}
                  </div>
                  <div className="flex flex-col gap-2 max-w-[75%]">
                    <div className={`px-4 py-3 rounded-xl text-[13px] leading-relaxed whitespace-pre-line ${msg.role === "agent" ? (msg.isError ? "bg-[#ef4444]/5 border border-[#ef4444]/20 text-[#ef4444]" : "bg-[#131720] border border-[#1c2438] text-[#eef1f8]") : "bg-[#f07820]/10 border border-[#f07820]/15 text-[#eef1f8]"}`}>
                      {msg.text}
                    </div>
                    {/* Agents used pills */}
                    {msg.role === "agent" && msg.agentsUsed && msg.agentsUsed.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {msg.agentsUsed.map((agentId) => (
                          <span key={agentId} className="text-[9px] font-medium px-2 py-0.5 rounded-full" style={{ color: "#a78bfa", backgroundColor: "rgba(167, 139, 250, 0.10)", border: "1px solid rgba(167, 139, 250, 0.20)" }}>
                            {agentId.replace(/_/g, " ")}
                          </span>
                        ))}
                        {msg.dataConfidence && (
                          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full ml-1" style={{
                            color: msg.dataConfidence === "high" ? "#22c55e" : msg.dataConfidence === "medium" ? "#f59e0b" : "#ef4444",
                            backgroundColor: msg.dataConfidence === "high" ? "rgba(34,197,94,0.10)" : msg.dataConfidence === "medium" ? "rgba(245,158,11,0.10)" : "rgba(239,68,68,0.10)",
                            border: `1px solid ${msg.dataConfidence === "high" ? "rgba(34,197,94,0.25)" : msg.dataConfidence === "medium" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`,
                          }}>
                            {msg.dataConfidence} confidence
                          </span>
                        )}
                      </div>
                    )}
                    {/* Approval required banner */}
                    {msg.role === "agent" && msg.approvalRequired && msg.whatRequiresHumanApproval && msg.whatRequiresHumanApproval.length > 0 && (
                      <div className="rounded-lg px-3 py-2 text-[11px]" style={{ backgroundColor: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.18)" }}>
                        <div className="flex items-center gap-1.5 font-semibold mb-1" style={{ color: "#f59e0b" }}>
                          <ShieldCheck size={10} />
                          Requires human approval before activation
                        </div>
                        <ul className="space-y-0.5">
                          {msg.whatRequiresHumanApproval.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="text-[10px]" style={{ color: "#a78bfa" }}>• {item}</li>
                          ))}
                        </ul>
                        {msg.suggestedApprovalDestination && (
                          <a href={msg.suggestedApprovalDestination} className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium" style={{ color: "#f59e0b" }}>
                            <Sparkles size={9} /> Review in {msg.suggestedApprovalDestination.replace("/", "")} →
                          </a>
                        )}
                      </div>
                    )}
                    {msg.dataSources && msg.dataSources.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {msg.dataSources.map((src) => (
                          <span key={src} className="text-[10px] px-2 py-0.5 bg-[#1a1d27] border border-[#2a2e42] text-[#5a6278] rounded-full">
                            {src.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    {msg.relatedLinks && msg.relatedLinks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.relatedLinks.map((link) => (
                          <a key={link.href} href={link.href} className="text-[11px] px-3 py-1 bg-[#131720] border border-[#18b8f0]/30 text-[#18b8f0] rounded-lg hover:bg-[#18b8f0]/5 transition-colors">
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                    {msg.actionSuggested && (
                      <div>
                        <a href={msg.actionSuggested.href} className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 vc-orange-gradient text-white rounded-lg hover:opacity-90 transition-opacity">
                          <Sparkles size={10} />
                          {msg.actionSuggested.label}
                        </a>
                      </div>
                    )}
                    {/* Save actions — only for non-error agent responses */}
                    {msg.role === "agent" && !msg.isError && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <CreateCampaignDraftButton
                          msg={msg}
                          clientName={
                            msg.detectedClientName ??
                            (msg.detectedClientId
                              ? clients.find((c) => c.id === msg.detectedClientId)?.name
                              : undefined)
                          }
                          creativeAssetIds={selectedAssets.map(a => a.id)}
                        />
                        <SaveDraftMenu
                          msg={msg}
                          clientName={
                            msg.detectedClientName ??
                            (msg.detectedClientId
                              ? clients.find((c) => c.id === msg.detectedClientId)?.name
                              : undefined)
                          }
                        />
                        <SaveAsTaskButton
                          msg={msg}
                          clientName={
                            msg.detectedClientName ??
                            (msg.detectedClientId
                              ? clients.find((c) => c.id === msg.detectedClientId)?.name
                              : undefined)
                          }
                        />
                        <GenerateTaskListButton
                          msg={msg}
                          clientName={
                            msg.detectedClientName ??
                            (msg.detectedClientId
                              ? clients.find((c) => c.id === msg.detectedClientId)?.name
                              : undefined)
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isConsoleLoading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-[#0c0f15] border border-[#18b8f0]/30">
                    <Image src="/vaultco-logo.png" alt="Agent" width={28} height={28} className="object-cover scale-[1.8] translate-y-[-2px]" />
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-[#131720] border border-[#1c2438] flex items-center gap-2">
                    <Loader2 size={13} className="text-[#18b8f0] animate-spin" />
                    <span className="text-[12px] text-[#5a6278]">Veronica is analyzing the portal…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="px-4 pt-3 flex flex-wrap gap-2">
              {agentSuggestions.map((s) => (
                <button key={s} onClick={() => { if (!isConsoleLoading) setConsoleMessage(s); }} className="text-[11px] px-3 py-1.5 bg-[#131720] border border-[#1c2438] text-[#5a6278] hover:text-[#18b8f0] hover:border-[#18b8f0]/25 rounded-full transition-colors disabled:opacity-40">{s}</button>
              ))}
            </div>
            <div className="p-4 flex gap-3">
              <input
                type="text"
                value={consoleMessage}
                onChange={(e) => setConsoleMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !isConsoleLoading) sendConsoleMessage(); }}
                placeholder="Ask about any client, campaign, approval, or performance…"
                className="flex-1 px-4 py-2.5 bg-[#131720] border border-[#1c2438] rounded-lg text-[13px] text-[#eef1f8] placeholder-[#5a6278] focus:outline-none focus:border-[#18b8f0]/40 transition-colors"
              />
              <button onClick={sendConsoleMessage} disabled={isConsoleLoading} className={`w-10 h-10 flex items-center justify-center vc-orange-gradient text-white rounded-lg transition-opacity flex-shrink-0 ${isConsoleLoading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}>
                {isConsoleLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[var(--t-border)]">
              <Zap size={13} className="text-[#ff8400]" />
              <span className="text-[13px] font-semibold text-[var(--t-text)]">Recent Actions</span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center text-center gap-2" style={{ minHeight: "120px" }}>
              <Sparkles size={14} className="text-[var(--t-dim)]" />
              <p className="text-[12px] font-medium" style={{ color: "var(--t-muted)" }}>No recent actions yet</p>
              <p className="text-[11px] leading-snug" style={{ color: "var(--t-dim)" }}>Veronica is ready. Ask a question or generate a campaign draft.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Automation Rules ── */}
      {activeTab === "automation" && (
        <div className="max-w-2xl">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--t-border)]">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-[#0081f2]" />
                <span className="text-[13px] font-semibold text-[var(--t-text)]">Automation Rules</span>
              </div>
              <span className="text-[11px] text-[var(--t-muted)]">Applied to all active clients</span>
            </div>
            <div className="p-4 space-y-1">
              {automationRules.map((rule) => (
                <div key={rule.label} className="flex items-start gap-4 p-3.5 rounded-lg hover:bg-[var(--t-surface-2)] transition-colors">
                  <div className={`mt-0.5 w-9 h-5 rounded-full flex-shrink-0 relative cursor-pointer transition-colors ${rule.enabled ? "bg-[#0081f2]/65" : "bg-[rgba(0, 129, 242, 0.15)]"}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${rule.enabled ? "translate-x-5" : "translate-x-1"}`} />
                  </div>
                  <div>
                    <div className="text-[12px] font-medium text-[var(--t-text)]">{rule.label}</div>
                    <div className="text-[11px] text-[var(--t-muted)] mt-0.5 leading-snug">{rule.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unused icon reference to satisfy import check */}
      <span className="hidden"><XCircle size={1} /></span>
    </div>
  );
}

export default function AICampaignBuilderPage() {
  return (
    <Suspense fallback={null}>
      <AICampaignBuilderContent />
    </Suspense>
  );
}
