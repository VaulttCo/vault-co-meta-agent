// Creative Analysis Agent — analyzes creative assets and produces structured intelligence
// for campaign generation. In mock mode, returns realistic analysis per creative type.

import type { AssetType } from "@/lib/creativeAssets";

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
