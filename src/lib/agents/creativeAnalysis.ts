// Creative Analysis Agent — analyzes creative assets and produces structured intelligence
// for campaign generation. In mock mode, returns realistic analysis per creative type.

import type { AssetType } from "@/lib/creativeAssets";
import type { AssetAdVariation } from "@/lib/planStore";
import type { ClientIntelligence } from "@/lib/clientIntelligence";

export interface StoredAssetAnalysis {
  visual_summary?: string;
  visible_subjects?: string[];
  analysis_source?: "vision" | "video_notes" | "operator_notes" | "metadata_only";
  visual_confidence?: "high" | "medium" | "low";
  bestCampaignAngle?: string;
  trustSignals?: string[];
  recommendedCopyAngle?: string;
  whyThisCreative?: string;
}

export interface CreativeAnalysis {
  creativeType: string;
  serviceShown: string;
  buyerIntentLevel: "Cold" | "Warm" | "Hot";
  trustSignals: string[];
  localRelevance: string;
  visualStrength: string;
  hookStrength: string;
  objectionAddressed: string;
  bestCampaignAngle: string;
  bestAudienceTemperature: string;
  bestPlacement: string[];
  complianceRisks: string[];
  recommendedCopyAngle: string;
  recommendedCTA: string;
  recommendedObjective: string;
  retargetingUse: string;
  whyThisCreative: string;
}

export function runCreativeAnalysisAgent(
  assetType: AssetType | string,
  service: string,
  approvedForAds: boolean,
  notes?: string
): CreativeAnalysis {
  const isRoofing = /roof|storm|inspect|drone/i.test(service + assetType);
  const approvalNote = approvedForAds
    ? ""
    : " NOTE: Asset not yet approved for ads — flag for approval before campaign launch.";

  switch (assetType) {
    case "Owner On Camera":
      return {
        creativeType: "Owner On Camera",
        serviceShown: service,
        buyerIntentLevel: "Cold",
        trustSignals: [
          "Owner face and personal credibility",
          "Local business authenticity",
          "Personal commitment to quality",
          "Unscripted, genuine tone",
        ],
        localRelevance: "Very high — owner speaking directly to local homeowners in their community",
        visualStrength: "High — human face creates immediate pattern interrupt in feed",
        hookStrength: "Very High — personal story hooks resonate strongly with homeowners evaluating contractors",
        objectionAddressed: "Why should I trust this company over a cheaper competitor?",
        bestCampaignAngle: "Founder-led trust campaign — owner explains who they are, what they stand behind, and why they do it",
        bestAudienceTemperature: "Cold to Warm — ideal for building awareness and initial trust with new audiences",
        bestPlacement: ["Instagram Reels", "Facebook Reels", "Instagram Stories", "Facebook Feed"],
        complianceRisks: [
          "Avoid making specific ROI or result guarantees in voiceover or overlay text",
          "Do not imply insurance claim outcomes if roofing campaign",
          "Ensure any statistics mentioned are verifiable",
        ],
        recommendedCopyAngle: `Lead with who ${notes?.includes("years") ? "the owner is and his experience" : "the owner is"} — local family business that puts its name on every job. Contrast against impersonal large companies.`,
        recommendedCTA: isRoofing ? "Book My Free Inspection" : "Book My Free Consultation",
        recommendedObjective: "LEAD_GENERATION",
        retargetingUse: "High value as top-of-funnel trust builder — retarget viewers with specific offer ad within 3–7 days",
        whyThisCreative: `Owner On Camera is the highest-trust creative format for service businesses. It immediately answers "who am I working with?" — the #1 psychological barrier for homeowners evaluating contractors. Use this for cold audiences to establish identity and trust before selling an offer.${approvalNote}`,
      };

    case "Before/After":
      return {
        creativeType: "Before/After",
        serviceShown: service,
        buyerIntentLevel: "Warm",
        trustSignals: [
          "Authentic proof of work quality",
          "Real client project documentation",
          "Visual transformation demonstrates capability",
          "No need to claim quality — it shows itself",
        ],
        localRelevance: "High — if location or home style matches local market",
        visualStrength: "Very High — visual contrast is one of the most scroll-stopping formats in the feed",
        hookStrength: "Very High — transformation format drives high engagement and save rates",
        objectionAddressed: "How do I know their work quality is actually good?",
        bestCampaignAngle: "Social proof quality campaign — let the work speak for itself",
        bestAudienceTemperature: "Warm — best for audiences who have already seen a trust-first ad",
        bestPlacement: ["Instagram Feed", "Facebook Feed", "Instagram Stories", "Facebook Reels"],
        complianceRisks: [
          "Must use ONLY authentic client project work — no stock photos",
          "Do not exaggerate transformation or imply results beyond what is shown",
          "Avoid 'best in area' claims overlaid on before/after images",
        ],
        recommendedCopyAngle: "Lead with the transformation story — what changed, why it matters, and what the homeowner experienced during the process",
        recommendedCTA: isRoofing ? "Get My Free Inspection" : "Book My Free Consultation",
        recommendedObjective: "LEAD_GENERATION",
        retargetingUse: "High — use before/after as primary retargeting creative for audiences who engaged with the owner/trust video",
        whyThisCreative: `Before/After is the most proven format for demonstrating quality without making claims. Homeowners evaluating contractors are looking for proof, not promises. This creative answers "can they actually do the job?" with visual evidence.${approvalNote}`,
      };

    case "Storm Damage":
      return {
        creativeType: "Storm Damage",
        serviceShown: service,
        buyerIntentLevel: "Hot",
        trustSignals: [
          "Real documented storm damage builds immediate relevance",
          "Inspector on camera adds professional credibility",
          "Documentation-style increases authenticity",
        ],
        localRelevance: "Very high — storm damage footage from the same market area maximizes emotional relevance",
        visualStrength: "High — damage imagery creates immediate attention and concern",
        hookStrength: "High — urgency hook works especially well post-storm events",
        objectionAddressed: "Is my roof actually damaged? Do I need to get it checked right now?",
        bestCampaignAngle: "Urgency-based inspection campaign — create awareness of unseen damage and low-pressure way to find out",
        bestAudienceTemperature: "Hot — best used immediately after weather events or storm season",
        bestPlacement: ["Facebook Feed", "Instagram Feed", "Facebook Reels", "Instagram Reels"],
        complianceRisks: [
          "NEVER use 'insurance will cover it' or 'file a free claim'",
          "NEVER imply guaranteed insurance claim approval or payout",
          "Avoid fear-based language without factual basis — 'your roof WILL fail' is not compliant",
          "Do not use urgency that cannot be enforced — 'only 5 inspections left this week'",
          "Storm damage content is a flagged Meta category — review before submission",
        ],
        recommendedCopyAngle: "Fact-based urgency — 'here's what storm damage looks like, here's what it costs to ignore it, here's the free way to find out if you have it'",
        recommendedCTA: "Get My Free Roof Inspection",
        recommendedObjective: "LEAD_GENERATION",
        retargetingUse: "Medium — good for retargeting homeowners who engaged with trust ads but have not converted; adds urgency layer",
        whyThisCreative: `Storm Damage creative drives the highest-intent leads in roofing because it speaks directly to homeowners with an active, time-sensitive problem. The key is urgency without fear-mongering — show the reality of the risk, then offer a simple, no-pressure solution (free inspection).${approvalNote}`,
      };

    case "Testimonial":
      return {
        creativeType: "Testimonial",
        serviceShown: service,
        buyerIntentLevel: "Warm",
        trustSignals: [
          "Real homeowner voice builds peer credibility",
          "Specific details (timeline, communication, outcome) are more believable than generic praise",
          "Emotional reaction demonstrates genuine satisfaction",
        ],
        localRelevance: "High — same-city or same-area homeowner creates strong local identification",
        visualStrength: "Medium-High — depends on production quality and homeowner confidence on camera",
        hookStrength: "High — social proof hook cuts through skepticism better than brand claims",
        objectionAddressed: "Has anyone in my area actually used them? Were they happy?",
        bestCampaignAngle: "Social proof campaign — local homeowners recommend local contractor",
        bestAudienceTemperature: "Warm — best for mid-funnel audiences already familiar with the brand",
        bestPlacement: ["Instagram Feed", "Facebook Feed", "Instagram Stories", "Facebook Reels"],
        complianceRisks: [
          "Testimonial must be verbatim — do not edit or paraphrase to change meaning",
          "Do not use testimonials that reference insurance outcomes or guaranteed results",
          "Ensure homeowner provided consent to be filmed and used in advertising",
        ],
        recommendedCopyAngle: "Let the homeowner speak — minimal overlay text. Let the story do the work. Add context in primary text copy.",
        recommendedCTA: isRoofing ? "See Why Homeowners Trust Us — Book Free Inspection" : "See Their Story — Book Your Consultation",
        recommendedObjective: "LEAD_GENERATION",
        retargetingUse: "Very High — testimonials perform best as retargeting creative for warm audiences who know the brand but haven't converted",
        whyThisCreative: `Testimonials overcome the final trust barrier before a homeowner books — "has anyone local actually used them and been happy?" It's peer recommendation in ad format. Most effective at mid-funnel, after the homeowner already knows who the company is.${approvalNote}`,
      };

    case "Inspection Day":
      return {
        creativeType: "Inspection Day",
        serviceShown: service,
        buyerIntentLevel: "Warm",
        trustSignals: [
          "Shows the actual service process — not just claims",
          "Inspector competence visible through professional behavior",
          "Transparency about what the process looks like reduces anxiety",
        ],
        localRelevance: "Medium-High — location context increases relevance",
        visualStrength: "Medium — depends on footage quality and inspector presence",
        hookStrength: "Medium-High — 'what does a free inspection actually look like?' is a common objection",
        objectionAddressed: "What actually happens during an inspection? Will they pressure me to buy?",
        bestCampaignAngle: "Process transparency campaign — removes anxiety about what a free inspection involves",
        bestAudienceTemperature: "Warm — best for audiences who expressed interest but haven't booked",
        bestPlacement: ["Facebook Feed", "Instagram Reels", "Facebook Reels", "Instagram Stories"],
        complianceRisks: [
          "Ensure inspector behavior shown is representative of actual service",
          "Avoid implying guaranteed damage findings from inspections",
        ],
        recommendedCopyAngle: "Demystify the inspection — show exactly what happens, how long it takes, and that there's zero pressure to buy",
        recommendedCTA: "Book My Free Inspection — No Pressure",
        recommendedObjective: "LEAD_GENERATION",
        retargetingUse: "High — works well for retargeting audiences who clicked on an offer ad but did not convert; removes the 'what will happen' barrier",
        whyThisCreative: `Inspection Day content removes the last objection before booking: fear of a high-pressure sales encounter. Showing the actual inspection process in a calm, professional way dramatically increases conversion from ad click to booked appointment.${approvalNote}`,
      };

    case "Project Reveal":
      return {
        creativeType: "Project Reveal",
        serviceShown: service,
        buyerIntentLevel: "Warm",
        trustSignals: [
          "Completed project proves execution capability",
          "Homeowner reaction adds emotional authenticity",
          "Transformation format generates high engagement",
        ],
        localRelevance: "High — same architectural style and neighborhood context increases identification",
        visualStrength: "Very High — reveal moment creates emotional engagement",
        hookStrength: "Very High — mystery-to-reveal structure stops the scroll",
        objectionAddressed: "What does the finished product actually look like on a home like mine?",
        bestCampaignAngle: "Quality proof campaign — show the transformation and the homeowner's reaction",
        bestAudienceTemperature: "Warm to Hot — versatile format that works across funnel stages",
        bestPlacement: ["Instagram Reels", "Facebook Reels", "Instagram Feed", "Facebook Feed"],
        complianceRisks: [
          "Only use authentic client work — never staged or stock",
          "Do not imply timeline or result guarantees based on this example",
        ],
        recommendedCopyAngle: "Focus on the transformation and the feeling — what changed, how long it took, how the homeowner felt walking out",
        recommendedCTA: isRoofing ? "Book My Free Inspection" : "Book My Free Consultation",
        recommendedObjective: "LEAD_GENERATION",
        retargetingUse: "Medium-High — excellent for retargeting prospecting audiences; drives saves and shares which extend organic reach",
        whyThisCreative: `Project Reveal is one of the most emotionally engaging formats available. The reveal moment — especially with authentic homeowner reaction — creates a visceral desire to have the same result. Works across funnel stages and drives high organic engagement.${approvalNote}`,
      };

    case "Drone Footage":
      return {
        creativeType: "Drone Footage",
        serviceShown: service,
        buyerIntentLevel: "Cold",
        trustSignals: [
          "Professional production signals company investment and quality",
          "Aerial neighborhood view creates local relevance at scale",
        ],
        localRelevance: "Very High — local neighborhood footage is immediately recognizable to area residents",
        visualStrength: "Very High — aerial footage is cinematic and scroll-stopping",
        hookStrength: "High — neighborhood-level recognition creates pattern interrupt",
        objectionAddressed: "Are these people actually from my area?",
        bestCampaignAngle: "Local awareness campaign — 'we service homes just like yours, right in your neighborhood'",
        bestAudienceTemperature: "Cold — ideal for cold prospecting with geographic targeting; residents recognize their neighborhood",
        bestPlacement: ["Instagram Reels", "Facebook Reels", "Instagram Feed"],
        complianceRisks: [
          "Ensure drone footage was captured with proper permits and FAA compliance",
          "Do not use footage that reveals private property details beyond rooftop condition",
        ],
        recommendedCopyAngle: "Neighborhood-level local presence — 'we've worked on homes throughout [neighborhood] and [area]'",
        recommendedCTA: isRoofing ? "Get My Free Inspection" : "See Our Work in Your Area",
        recommendedObjective: "AWARENESS",
        retargetingUse: "Low — use as top-of-funnel awareness only; follow with offer or testimonial for retargeting",
        whyThisCreative: `Drone footage of local neighborhoods creates immediate geographic relevance — viewers recognize their area and stop scrolling. Best used for cold audience awareness to establish local presence before following up with an offer campaign.${approvalNote}`,
      };

    case "Warranty Explanation":
      return {
        creativeType: "Warranty Explanation",
        serviceShown: service,
        buyerIntentLevel: "Warm",
        trustSignals: [
          "Specific warranty terms signal company confidence in their work",
          "Manufacturer backing (e.g. GAF) adds third-party credibility",
          "Longevity commitment addresses long-term value concern",
        ],
        localRelevance: "Medium — relevant to homeowner anywhere evaluating roofing quality",
        visualStrength: "Medium — depends on delivery; owner on camera explaining warranties is more effective",
        hookStrength: "Medium-High — specific warranty stack is a strong differentiator for premium buyers comparing quotes",
        objectionAddressed: "How long will this actually last? What happens if something goes wrong?",
        bestCampaignAngle: "Premium value justification — address price objection by showing long-term warranty value vs. cheaper competitors",
        bestAudienceTemperature: "Warm — best used mid-funnel for audiences already comparing quotes",
        bestPlacement: ["Facebook Feed", "Instagram Feed", "Instagram Stories"],
        complianceRisks: [
          "Warranty claims must exactly match what is legally offered — verify terms before running",
          "Do not imply coverage for events not included in actual warranty",
          "Manufacturer warranty claims require manufacturer partnership verification",
        ],
        recommendedCopyAngle: "Break down the warranty stack in plain language — most competitors offer 1yr workmanship; contrast that with 10yr workmanship + 50yr manufacturer",
        recommendedCTA: "Get the Roof That's Actually Guaranteed",
        recommendedObjective: "LEAD_GENERATION",
        retargetingUse: "High — very effective for retargeting price-comparison audiences who visited but didn't convert",
        whyThisCreative: `Warranty Explanation content is the most powerful objection-handling creative for premium service businesses. It reframes the price conversation — not 'why does this cost more?' but 'what do you get for the premium?' Works especially well for clients positioned against low-price competitors.${approvalNote}`,
      };

    case "Q&A Clip":
      return {
        creativeType: "Q&A Clip",
        serviceShown: service,
        buyerIntentLevel: "Warm",
        trustSignals: [
          "Owner answering questions directly demonstrates transparency",
          "Specific answers to common objections pre-handle sales barriers",
          "Confident direct communication builds trust",
        ],
        localRelevance: "Medium — relevant across markets but enhanced with local context",
        visualStrength: "Medium — depends heavily on delivery and production quality",
        hookStrength: "Medium — hook depends on the specific question chosen; price and timeline questions perform best",
        objectionAddressed: "Multiple — price, timeline, hidden fees, warranty, process",
        bestCampaignAngle: "Objection-handling campaign — answer the exact questions buyers Google before choosing a contractor",
        bestAudienceTemperature: "Warm — best for mid-funnel retargeting of engaged audiences",
        bestPlacement: ["Instagram Reels", "Facebook Reels", "Instagram Stories"],
        complianceRisks: [
          "Ensure any pricing information is accurate and up to date",
          "Avoid guaranteeing timelines that may vary by project",
        ],
        recommendedCopyAngle: "Ask the question in the hook — 'The #1 question homeowners ask us before booking...' then answer it simply",
        recommendedCTA: "Get Your Questions Answered — Book Free Consultation",
        recommendedObjective: "LEAD_GENERATION",
        retargetingUse: "Very High — Q&A clips work best as retargeting creative; audiences who already know the brand respond strongly to transparent Q&A content",
        whyThisCreative: `Q&A content directly addresses the hidden objections that stop homeowners from booking. Most buyers have 3–5 unspoken questions before they'll call. Answering these on camera removes friction better than any other format in the late-funnel stage.${approvalNote}`,
      };

    case "Team Photo":
      return {
        creativeType: "Team Photo",
        serviceShown: service,
        buyerIntentLevel: "Cold",
        trustSignals: [
          "Real crew humanizes the brand",
          "Professional appearance signals organized operation",
          "Team size communicates capacity and stability",
        ],
        localRelevance: "Medium — enhanced by local backdrop or job site location",
        visualStrength: "Medium — static format; works better in feed than Reels",
        hookStrength: "Low-Medium — needs strong copy hook to compensate for lower visual impact",
        objectionAddressed: "Who is actually going to show up to my house?",
        bestCampaignAngle: "Brand awareness / humanization — 'the people behind the work'",
        bestAudienceTemperature: "Cold — best for brand awareness and humanization",
        bestPlacement: ["Facebook Feed", "Instagram Feed"],
        complianceRisks: ["Ensure all team members pictured have consented to be used in advertising"],
        recommendedCopyAngle: "Tell the team story — who they are, how long they've worked together, why they take pride in their craft",
        recommendedCTA: isRoofing ? "Meet the Team — Book Free Inspection" : "Meet Our Crew — Book Free Consultation",
        recommendedObjective: "AWARENESS",
        retargetingUse: "Low — use as supporting brand content; not a primary conversion driver",
        whyThisCreative: `Team photos humanize a contractor business and answer a core homeowner concern: who is actually coming to my home? Works best as awareness content or as part of a sequence building up to an offer.${approvalNote}`,
      };

    case "Jobsite Walkthrough":
      return {
        creativeType: "Jobsite Walkthrough",
        serviceShown: service,
        buyerIntentLevel: "Warm",
        trustSignals: [
          "Active worksite demonstrates real projects and demand",
          "Professional behavior on camera shows standards",
          "Material quality visible in real working conditions",
        ],
        localRelevance: "High — local job site creates strong geographic connection",
        visualStrength: "Medium-High — real working environment is authentic and engaging",
        hookStrength: "Medium — hook needs to emphasize what the viewer will learn",
        objectionAddressed: "Are they actually busy with real projects? Are they professional on the job?",
        bestCampaignAngle: "Process transparency and quality — show the work happening in real time",
        bestAudienceTemperature: "Warm — best for mid-funnel audiences building familiarity",
        bestPlacement: ["Instagram Reels", "Facebook Reels", "Facebook Feed"],
        complianceRisks: ["Ensure safety equipment is visible — active job site without PPE is a liability signal"],
        recommendedCopyAngle: "'Here's what your project day actually looks like...' — walk through the process step by step",
        recommendedCTA: isRoofing ? "See How We Do It — Book Your Inspection" : "See Our Process — Book Your Consultation",
        recommendedObjective: "LEAD_GENERATION",
        retargetingUse: "Medium — good secondary creative for warm audiences; reinforces professionalism",
        whyThisCreative: `Jobsite walkthroughs answer the question 'what will they actually do on my property?' by showing the real process. For service businesses where homeowners are inviting strangers into their homes, process transparency is a strong conversion driver.${approvalNote}`,
      };

    case "UGC Style Video":
      return {
        creativeType: "UGC Style Video",
        serviceShown: service,
        buyerIntentLevel: "Cold",
        trustSignals: [
          "Organic, unpolished feel creates high authenticity",
          "Looks like content from a real person, not an ad",
          "Higher initial trust than polished brand content",
        ],
        localRelevance: "High — local context in casual delivery maximizes identification",
        visualStrength: "Medium — intentionally lo-fi; strength is authenticity not production quality",
        hookStrength: "Very High — native content format performs best in Reels/Stories placements",
        objectionAddressed: "This is just another ad — I'm being sold something",
        bestCampaignAngle: "Authentic peer recommendation — real person sharing their experience in organic format",
        bestAudienceTemperature: "Cold to Warm — versatile format that performs across funnel stages",
        bestPlacement: ["Instagram Reels", "TikTok-style format", "Instagram Stories", "Facebook Reels"],
        complianceRisks: [
          "Must clearly identify as sponsored content if not appearing organic — Meta disclosure rules",
          "Ensure the creator is a real person with genuine experience if testimonial-style",
          "Avoid implied endorsement from non-affiliated individuals",
        ],
        recommendedCopyAngle: "Casual and direct — 'I just had my roof done and here's what I wish I knew...' or 'PSA for homeowners in [area]...'",
        recommendedCTA: isRoofing ? "Get My Free Inspection" : "Book My Free Consultation",
        recommendedObjective: "LEAD_GENERATION",
        retargetingUse: "Medium-High — UGC style works well for retargeting; repeat exposure in organic-feeling format reduces ad fatigue",
        whyThisCreative: `UGC-style content outperforms polished brand ads in Reels placements because it looks like native content, not advertising. The initial trust level is higher because viewers don't immediately identify it as an ad. Best for reaching cold audiences who have built-in resistance to traditional ad formats.${approvalNote}`,
      };

    default: {
      const isService = isRoofing;
      return {
        creativeType: assetType,
        serviceShown: service,
        buyerIntentLevel: "Warm",
        trustSignals: ["Professional creative demonstrates company investment", "Specific service context builds relevance"],
        localRelevance: "Medium — enhanced by local market context",
        visualStrength: "Medium",
        hookStrength: "Medium",
        objectionAddressed: "Can I trust this company with my home?",
        bestCampaignAngle: isService ? "Trust and quality campaign" : "Value demonstration campaign",
        bestAudienceTemperature: "Warm",
        bestPlacement: ["Facebook Feed", "Instagram Feed", "Instagram Reels"],
        complianceRisks: ["Review copy for unverifiable superlative claims", "Ensure authentic imagery only"],
        recommendedCopyAngle: "Lead with the value provided, not the price paid",
        recommendedCTA: isService ? "Book My Free Inspection" : "Book My Free Consultation",
        recommendedObjective: "LEAD_GENERATION",
        retargetingUse: "Medium — use as part of a multi-touch sequence",
        whyThisCreative: `This creative type provides strong contextual relevance for the ${service} campaign and supports trust-building at the key decision stage.${approvalNote}`,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────
// assignToAdSet — maps creative type to best-fit ad set
// Option B: one ad per asset, assigned to best-fit ad set
// ─────────────────────────────────────────────────────────────

function assignToAdSet(assetType: string, isRoofing: boolean): {
  adSetAssignment: string;
  adSetAudienceTemperature: "cold" | "warm" | "hot";
} {
  // Higher-intent / urgency → Storm & Roof Replacement Intent (Ad Set 2)
  if (isRoofing && ["Storm Damage", "Inspection Day", "Warranty Explanation"].includes(assetType)) {
    return { adSetAssignment: "Storm & Roof Replacement Intent", adSetAudienceTemperature: "hot" };
  }
  // Social proof / trust / owner-face → Retargeting & Social Proof (Ad Set 3)
  if (["Testimonial", "Owner On Camera", "Team Photo", "Q&A Clip"].includes(assetType)) {
    return { adSetAssignment: "Retargeting & Social Proof", adSetAudienceTemperature: "warm" };
  }
  // Everything else → Broad Homeowner Prospecting (Ad Set 1)
  return { adSetAssignment: "Broad Homeowner Prospecting", adSetAudienceTemperature: "cold" };
}

// ─────────────────────────────────────────────────────────────
// Per-asset-type copy templates (intel-powered)
// ─────────────────────────────────────────────────────────────

function buildIntelPrimaryText1(
  assetType: string,
  isRoofing: boolean,
  ownerFirst: string,
  clientName: string,
  mainOffer: string,
  warranty: string | null,
  uniqueMechanism: string | null,
  locationDesc: string,
): string {
  if (!isRoofing) {
    return `${clientName} — premium ${assetType.toLowerCase()} in ${locationDesc}. ${mainOffer}.`;
  }
  const wStack = warranty ?? "50-year manufacturer warranty + 15-year wind warranty + 10-year workmanship warranty";
  const gaf = uniqueMechanism ? "GAF Certified Plus" : "certified";
  switch (assetType) {
    case "Owner On Camera":
      return `Hi, I'm ${ownerFirst} — owner of ${clientName}. If you're comparing roofing quotes in ${locationDesc}, here's what most roofers won't say upfront: the cheapest quote today means a $15,000–$25,000 replacement in 5 years.\n\nWe're ${gaf}. Every roof comes with our triple warranty: ${wStack}. That's not a sales pitch — it's a written guarantee.\n\n${mainOffer}. No pressure. Honest answers. Family-owned.`;
    case "Storm Damage":
      return `${locationDesc} homeowners: storm damage to your roof is often invisible from the ground — but it compounds fast.\n\n${clientName} has completed free inspections across the area and found damage homeowners didn't know existed. We're ${gaf}. If there's damage, we'll show you exactly what needs fixing — no insurance games, no pressure, just honest findings.\n\n${mainOffer}. Free.`;
    case "Testimonial":
      return `The #1 thing ${locationDesc} homeowners tell us after choosing ${clientName}: "I wish I'd called you first."\n\nBefore you sign with a cheaper roofer — ask what warranty they're backing it with. Ours: ${wStack}. ${gaf}. Family-owned.\n\n${mainOffer}.`;
    case "Before/After":
      return `This is what a proper roof replacement looks like in ${locationDesc}.\n\nNot a patch job. Not a quick fix. A ${gaf} installation backed by ${wStack}.\n\n${mainOffer} — free, honest findings, zero pressure from a family-owned company.`;
    case "Project Reveal":
      return `${clientName} just finished this ${locationDesc} home. ${gaf} installation. ${warranty ?? "Triple warranty: " + wStack}.\n\nThis is what premium roofing looks like when done right — not the cheapest quote, the right quote, backed by the best warranty in the business.\n\n${mainOffer}. Free inspection today.`;
    case "Inspection Day":
      return `Wondering what actually happens during a free roof inspection?\n\n45 minutes. ${ownerFirst} walks your roof, shows you exactly what we find, and gives you honest answers — no upsell, no urgency tricks, no insurance pressure.\n\n${gaf} · Family-Owned · ${locationDesc}.\n\n${mainOffer}. Schedule today.`;
    case "Warranty Explanation":
      return `Most roofing companies offer a 1-year workmanship warranty. ${clientName} offers three:\n\n✓ ${wStack}\n\nThis is what the price difference actually buys you — not a better salesperson, a better guarantee.\n\n${mainOffer}. Let's talk.`;
    case "Drone Footage":
      return `We serve homes throughout ${locationDesc} — and we've done the roof on more than a few of your neighbors'.\n\n${gaf}. ${warranty ?? wStack}. Family-owned. Every job backed by the same warranty, the same standards.\n\n${mainOffer}. Free inspection for ${locationDesc} homeowners.`;
    default:
      return `${clientName} — ${gaf} roofing in ${locationDesc}. ${warranty ? `Backed by ${warranty}.` : ""} ${mainOffer}. Honest, no-pressure inspection from a family-owned company.`;
  }
}

function buildIntelPrimaryText2(
  assetType: string,
  isRoofing: boolean,
  objection: string,
  bestSalesAngle: string,
  mainOffer: string,
  ownerFirst: string,
  clientName: string,
  locationDesc: string,
): string {
  if (!isRoofing) {
    return `${objection ? `"${objection}" — ${bestSalesAngle}.` : bestSalesAngle + "."} ${mainOffer}.`;
  }
  const objStr = objection || "getting the cheapest quote";
  switch (assetType) {
    case "Owner On Camera":
      return `Most homeowners evaluating ${locationDesc} roofers ask: "${objStr}"\n\nHere's the honest answer: ${bestSalesAngle}. ${ownerFirst} shows up personally to every inspection. ${clientName} puts its name on every roof. ${mainOffer}.`;
    case "Storm Damage":
      return `"${objStr}" — we hear that. Here's what most ${locationDesc} homeowners don't realize: ${bestSalesAngle}. No obligation. No insurance pressure. Just facts about your roof. ${mainOffer}.`;
    case "Testimonial":
      return `"${objStr}" — that's the #1 objection we get. ${bestSalesAngle}. See what real ${locationDesc} homeowners say about ${clientName} before you make your decision. ${mainOffer}.`;
    case "Warranty Explanation":
      return `When a cheaper roofer says "${objStr}" — ask them to show you their warranty paperwork. ${bestSalesAngle}. ${clientName} shows you ours on the first call. ${mainOffer}.`;
    default:
      return `"${objStr}" — ${bestSalesAngle.charAt(0).toLowerCase() + bestSalesAngle.slice(1)}. ${mainOffer}. Honest, no-pressure, family-owned.`;
  }
}

function buildIntelHeadline1(
  assetType: string,
  isRoofing: boolean,
  offersToTest: string[],
  locationDesc: string,
  analysis: CreativeAnalysis,
  service: string,
): string {
  if (isRoofing) {
    const h1Map: Record<string, string> = {
      "Owner On Camera": `${locationDesc}'s GAF Certified Roofer`,
      "Storm Damage": `Free Roof Inspection — Honest Findings`,
      "Testimonial": `Why ${locationDesc} Homeowners Choose Us`,
      "Before/After": `Before & After — GAF Certified Replacement`,
      "Project Reveal": `Premium Roofing Done Right — ${locationDesc}`,
      "Inspection Day": `Free Inspection — See What We Actually Do`,
      "Drone Footage": `Serving ${locationDesc} Neighborhoods`,
      "Warranty Explanation": `Triple Warranty: 50yr + 15yr + 10yr`,
      "Q&A Clip": `Your Roof Questions — Answered Honestly`,
      "Team Photo": `Meet the ${locationDesc} Roofing Team`,
      "Jobsite Walkthrough": `Inside a Real ${locationDesc} Roof Job`,
      "UGC Style Video": `${locationDesc} Homeowner — Watch This First`,
    };
    return h1Map[assetType] ?? offersToTest[0] ?? `${service} — ${analysis.recommendedCTA}`;
  }
  return offersToTest[0] ?? `${service} — ${analysis.recommendedCTA}`;
}

function buildIntelHeadline2(
  assetType: string,
  isRoofing: boolean,
  warranty: string | null,
  ownerFirst: string,
): string {
  if (isRoofing) {
    const h2Map: Record<string, string> = {
      "Owner On Camera": `${ownerFirst} Shows Up to Every Inspection`,
      "Storm Damage": `GAF Certified · No Insurance Games`,
      "Testimonial": warranty ? "Triple Warranty — See for Yourself" : "Family-Owned · Locally Trusted",
      "Before/After": warranty ? warranty.split("+")[0].trim() : "50-Year Manufacturer Warranty",
      "Project Reveal": warranty ? warranty.split("+")[0].trim() : "Premium Roofing — Done Right",
      "Inspection Day": "45 Min · Free · Zero Pressure",
      "Drone Footage": "GAF Certified Plus · Family-Owned",
      "Warranty Explanation": "Compare Any Quote — We Back Ours",
      "Q&A Clip": "Ask Us Anything — We Answer Honestly",
      "Team Photo": "Family-Owned · Same Crew Every Job",
      "Jobsite Walkthrough": "Professional · Clean · Certified",
      "UGC Style Video": "Real Homeowner. Real Experience.",
    };
    return h2Map[assetType] ?? (warranty ? warranty.split("+")[0].trim() : "Family-Owned. Locally Trusted.");
  }
  return warranty ? warranty.split("—")[0].trim().split("+")[0].trim() : "Family-Owned. Locally Trusted.";
}

function buildWhyThisCopyMatchesCreative(
  assetType: string,
  isRoofing: boolean,
  hasIntel: boolean,
  effectiveSource: "vision" | "video_notes" | "operator_notes" | "metadata_only",
): string {
  // Build source note based on what intelligence was actually used
  let sourceNote: string;
  switch (effectiveSource) {
    case "vision":
      sourceNote = "Copy is grounded in the visual analysis of this specific image — seen content, verified subjects, and visual context were used.";
      break;
    case "video_notes":
      sourceNote = "Copy direction uses provided video notes and operator context. Veronica has not viewed the video — copy is recommended direction based on notes, not observed content.";
      break;
    case "operator_notes":
      sourceNote = "Copy uses operator notes and asset type context. No visual analysis was performed — copy is recommended direction, not observed content.";
      break;
    default:
      sourceNote = hasIntel
        ? "Copy generated from asset type, selected creative type, and client intelligence only. No visual analysis was performed — copy is recommended direction based on creative format, not observed content."
        : "Copy generated from asset type and service context only. No visual analysis available — copy is generic direction for this creative format.";
  }

  const reasonMap: Record<string, string> = {
    "Owner On Camera": "Owner-face format demands trust-first copy that establishes personal credibility before making any offer. Copy leads with identity and warranty proof, not price.",
    "Storm Damage": "Urgency format requires fact-based copy that identifies the problem and offers a low-pressure solution. Avoids insurance guarantee language per compliance rules.",
    "Testimonial": "Social proof format should let the result speak — copy frames the peer recommendation and handles the price objection, not the brand selling itself.",
    "Before/After": "Transformation format needs copy that anchors quality (warranty, certification) before the offer, so the visual comparison reinforces a premium — not a commodity — decision.",
    "Project Reveal": "Reveal format builds desire. Copy should reinforce that this result is what you get when you choose quality over the cheapest quote.",
    "Inspection Day": "Process-transparency format removes the #1 pre-booking friction: fear of a high-pressure inspection. Copy demystifies the experience.",
    "Warranty Explanation": "Objection-handling format. Copy reframes the price comparison by making the warranty stack the unit of comparison, not the quote.",
    "Drone Footage": "Neighborhood-level format builds geographic trust. Copy ties local presence to brand credibility.",
  };

  const reason = reasonMap[assetType] ?? "Creative type informs copy angle — copy is matched to the expected viewer intent and emotional state at the moment this creative is encountered.";
  return `${reason} ${sourceNote}`;
}

// ─────────────────────────────────────────────────────────────
// buildSourceDisclosure — generates a clear disclosure string for the Asset Matrix
// ─────────────────────────────────────────────────────────────

function buildSourceDisclosure(
  effectiveSource: "vision" | "video_notes" | "operator_notes" | "metadata_only",
  fileType: "image" | "video",
  hasNotes: boolean,
): string {
  switch (effectiveSource) {
    case "vision":
      return "Copy grounded in image vision analysis. Veronica analyzed the actual image content.";
    case "video_notes":
      return "Copy direction based on video notes / operator notes. Veronica has not viewed the video — these are recommended angles, not observed content.";
    case "operator_notes":
      return "Copy direction uses operator notes and asset type. No visual analysis performed — recommended direction only.";
    default:
      return fileType === "video"
        ? `Metadata-based direction only. Add video notes or a transcript so Veronica can write accurate asset-specific copy.`
        : `Metadata-based direction only — asset type, file name, and creative type used. Run visual analysis for image-grounded copy.`;
  }
}

// ─────────────────────────────────────────────────────────────
// buildOpeningFrame — video-specific opening frame suggestion
// ─────────────────────────────────────────────────────────────

function buildOpeningFrame(assetType: string, intel: ClientIntelligence | null): string {
  const owner = (intel as { companyProfile?: { ownerName?: string } } | null)?.companyProfile?.ownerName ?? "the owner";
  switch (assetType) {
    case "Owner On Camera":
      return `${owner} looking directly into camera, natural setting. Opens with movement or a direct statement — not a title card.`;
    case "Storm Damage":
      return `Tight shot of real storm damage — broken shingles, dented flashing, or compromised ridge. Inspector pointing at damage. Immediate visual proof.`;
    case "Testimonial":
      return `Homeowner mid-sentence, candid. Not stiff or rehearsed. Expression and body language drive credibility.`;
    case "Inspection Day":
      return `Inspector on roof in daylight. Camera follows the walkthrough. First frame establishes the on-roof setting immediately.`;
    case "Before/After":
      return `Start on the "before" — weathered, aged, or damaged surface. Hold 1–2 seconds before the transition cut.`;
    case "Project Reveal":
      return `Crew walking up to the home, camera facing the old roof. Build anticipation before the reveal turn.`;
    case "Drone Footage":
      return `Aerial establishing shot of the neighborhood. Open at altitude and slowly descend toward a completed project.`;
    case "UGC Style Video":
      return `Casual, handheld feel. Subject speaking directly to camera — no teleprompter. Authentic first impression.`;
    default:
      return `Open with the key visual element. Establish context within the first 2 seconds.`;
  }
}

// ─────────────────────────────────────────────────────────────
// buildAssetAdVariation — per-asset copy generator
// Deterministic. No API calls. Uses creative analysis + client intelligence.
// ─────────────────────────────────────────────────────────────

export function buildAssetAdVariation(
  asset: {
    id: string;
    fileName: string;
    assetType: string;
    fileType: "image" | "video";
    approvedForAds: boolean;
    notes?: string;
  },
  service: string,
  intel: ClientIntelligence | null,
  isPrimary: boolean,
  storedAnalysis?: StoredAssetAnalysis | null
): AssetAdVariation {
  const analysis = runCreativeAnalysisAgent(asset.assetType, service, asset.approvedForAds, asset.notes);
  const isVideo = asset.fileType === "video";
  const isRoofing = /roof|storm|inspect/i.test(service);
  const hasIntel = !!intel;

  // ── Intel fields ─────────────────────────────────────────────
  type IntelShape = {
    companyProfile?: { ownerName?: string };
    offerIntelligence?: { mainOffer?: string; guarantees?: string[] };
    brandIntelligence?: { uniqueMechanism?: string };
    buyerProfile?: { trustTriggers?: string[]; commonObjections?: string[] };
    salesIntelligence?: { bestSalesAngles?: string[] };
    campaignImplications?: { offersToTest?: string[] };
    serviceArea?: { cities?: string[] };
  };
  const i = intel as IntelShape | null;

  const mainOffer = i?.offerIntelligence?.mainOffer ?? (isRoofing ? "Free Roof Inspection" : "Free Consultation");
  const uniqueMechanism = i?.brandIntelligence?.uniqueMechanism ?? null;
  const warranty = i?.offerIntelligence?.guarantees?.[0] ?? uniqueMechanism;
  const trustTrigger1 = i?.buyerProfile?.trustTriggers?.[0] ?? analysis.trustSignals[0] ?? "Family-owned, locally trusted";
  const objection = i?.buyerProfile?.commonObjections?.[0] ?? analysis.objectionAddressed;
  const bestSalesAngle = i?.salesIntelligence?.bestSalesAngles?.[0] ?? analysis.bestCampaignAngle;
  const offersToTest = i?.campaignImplications?.offersToTest ?? [];
  const ownerName = i?.companyProfile?.ownerName ?? "";
  const ownerFirst = ownerName.split(" ")[0] || "the owner";
  const locationDesc = i?.serviceArea?.cities?.[0] ?? service.split(" ")[0] ?? "your area";

  const hasRealVision =
    !!storedAnalysis?.visual_summary &&
    storedAnalysis.visual_summary !== "Image not available for analysis" &&
    storedAnalysis.analysis_source === "vision";

  const hasOperatorNotes = !!(asset.notes?.trim());

  // ── Determine effective intelligence source ───────────────────
  // Hierarchy: vision > video_notes > operator_notes > metadata_only
  let effectiveSource: "vision" | "video_notes" | "operator_notes" | "metadata_only";
  if (hasRealVision && !isVideo) {
    effectiveSource = "vision";
  } else if (isVideo && hasOperatorNotes) {
    effectiveSource = "video_notes";
  } else if (!isVideo && hasOperatorNotes) {
    effectiveSource = "operator_notes";
  } else {
    effectiveSource = "metadata_only";
  }

  // ── visualConfidence — based on source ────────────────────────
  const effectiveConfidence: "high" | "medium" | "low" =
    effectiveSource === "vision"
      ? (storedAnalysis?.visual_confidence ?? "medium")
      : effectiveSource === "video_notes" || effectiveSource === "operator_notes"
      ? "medium"
      : "low";

  // ── visualAssumption — what to show in the Asset Matrix ───────
  const visualAssumption = hasRealVision
    ? storedAnalysis!.visual_summary!
    : hasOperatorNotes
    ? asset.notes!.trim()
    : isVideo
    ? "No video notes provided. Add a transcript or notes so Veronica can write accurate copy for this video."
    : "No visual analysis available. Analyze this image so Veronica can write copy grounded in what is actually shown.";

  // ── Ad set assignment ─────────────────────────────────────────
  const { adSetAssignment, adSetAudienceTemperature } = assignToAdSet(asset.assetType, isRoofing);

  // ── Copy generation ───────────────────────────────────────────
  // For metadata_only and video without transcript: copy is directional, not observational.
  // Do NOT write "This image shows..." or "The video opens with..." or "The homeowner says..."
  // unless that content was actually analyzed or provided.
  let primaryText1: string;
  let primaryText2: string;

  if (hasIntel && isRoofing) {
    // Intel-powered copy — specific to this client and market.
    // Note: even with intel, metadata-only copy should not claim to describe the creative visually.
    primaryText1 = buildIntelPrimaryText1(
      asset.assetType, isRoofing, ownerFirst, ownerName ? ownerName.split(" ").slice(-1)[0] + " Builders" : service,
      mainOffer, warranty, uniqueMechanism, locationDesc
    );
    primaryText2 = buildIntelPrimaryText2(
      asset.assetType, isRoofing, objection, bestSalesAngle, mainOffer, ownerFirst,
      ownerName ? ownerName.split(" ").slice(-1)[0] + " Builders" : service, locationDesc
    );
  } else if (effectiveSource === "metadata_only") {
    // Conservative metadata-only direction — use conditional framing
    primaryText1 = hasIntel
      ? `Use this ${asset.assetType.toLowerCase()} creative to position ${ownerName ? ownerName.split(" ").slice(-1)[0] + " Builders" : service} as the trusted, quality choice in ${locationDesc}. ${mainOffer}.`
      : `Recommended angle for this ${asset.assetType.toLowerCase()} format: lead with trust and quality, not price. ${mainOffer}.`;
    primaryText2 = objection
      ? `Assumption based on selected creative type: address the concern — "${objection}" — by leading with ${bestSalesAngle.charAt(0).toLowerCase() + bestSalesAngle.slice(1)}. ${mainOffer}.`
      : `Recommended direction for ${asset.assetType.toLowerCase()} format: ${analysis.bestCampaignAngle}. ${mainOffer}.`;
  } else if (isVideo) {
    // Video with notes — use notes-based direction (still recommended, not observed)
    primaryText1 = [analysis.recommendedCopyAngle, uniqueMechanism ? `— ${uniqueMechanism}.` : "", mainOffer + "."].filter(Boolean).join(" ").trim();
    primaryText2 = objection
      ? `Based on video context: "${objection}" — ${bestSalesAngle.charAt(0).toLowerCase() + bestSalesAngle.slice(1)}. ${mainOffer}.`
      : `${analysis.bestCampaignAngle}. ${mainOffer}.`;
  } else {
    // Image with operator notes or vision
    primaryText1 = [trustTrigger1, `— this is what ${service} looks like when done right.`, warranty ? `Backed by ${warranty}.` : "", mainOffer + "."].filter(Boolean).join(" ").trim();
    primaryText2 = objection
      ? `Most homeowners ask: "${objection}" — the answer is ${bestSalesAngle.charAt(0).toLowerCase() + bestSalesAngle.slice(1)}. ${mainOffer}.`
      : `${analysis.bestCampaignAngle}. ${mainOffer}.`;
  }

  const headline1 = buildIntelHeadline1(asset.assetType, isRoofing, offersToTest, locationDesc, analysis, service);
  const headline2 = buildIntelHeadline2(asset.assetType, isRoofing, warranty, ownerFirst);

  const description = hasIntel && isRoofing
    ? `GAF Certified Plus · Family-Owned · ${locationDesc}`
    : analysis.bestCampaignAngle;

  const hook = isVideo
    ? `First 3 sec: ${analysis.recommendedCopyAngle.split(".")[0]}. Hook must land immediately.`
    : `${analysis.trustSignals[0] ?? analysis.bestCampaignAngle} — ${asset.assetType} format.`;

  const whyThisCopyMatchesCreative = buildWhyThisCopyMatchesCreative(asset.assetType, isRoofing, hasIntel, effectiveSource);
  const sourceDisclosure = buildSourceDisclosure(effectiveSource, asset.fileType, hasOperatorNotes);

  const variation: AssetAdVariation = {
    assetId: asset.id,
    fileName: asset.fileName,
    assetType: asset.assetType,
    fileType: asset.fileType,
    approvedForAds: asset.approvedForAds,
    isPrimary,
    analysisAvailable: true,
    creativeAngle: analysis.bestCampaignAngle,
    visualAssumption,
    primaryText1,
    primaryText2,
    headline1,
    headline2,
    description,
    cta: analysis.recommendedCTA,
    hook,
    complianceNotes: analysis.complianceRisks.slice(0, 3).join(" | ") || "No specific compliance risks identified.",
    bestUseCase: analysis.whyThisCreative,
    recommendedPlacement: analysis.bestPlacement,
    adSetAssignment,
    adSetAudienceTemperature,
    whyThisCopyMatchesCreative,
    visualSummary: hasRealVision ? storedAnalysis!.visual_summary : undefined,
    analysisSource: effectiveSource,
    visualConfidence: effectiveConfidence,
    sourceDisclosure,
  };

  if (isVideo) {
    variation.firstThreeSecondHook = `Open with: ${analysis.recommendedCopyAngle.split(".")[0]}. Hook must land within 3 seconds.`;
    variation.suggestedOpeningFrame = buildOpeningFrame(asset.assetType, intel);
    variation.captionPrimaryText = primaryText1.split("\n\n")[0];
    variation.retargetingUse = analysis.retargetingUse;
  }

  return variation;
}
