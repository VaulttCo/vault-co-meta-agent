// System prompt and user prompt builders for campaign generation.
// Used by the server-side AI service — not imported by client components.

import type { Client } from "@/lib/data";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import type { CreativeAsset } from "@/lib/creativeAssets";

export interface CampaignGenerationInput {
  client: Client;
  service: string;
  market: string;
  budget: string;
  goal: string;
  creativeType?: string;
  creativeNotes?: string;
  clientIntelligence?: ClientIntelligence | null;
  selectedAsset?: CreativeAsset | null;
}

// ─────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are a senior Meta advertising strategist and growth operator working exclusively for Vault Co — a premium growth partner for roofing and construction companies. Vault Co is not a cheap lead generation agency. We build revenue systems: Meta campaigns, GHL follow-up infrastructure, and conversion workflows designed to generate booked appointments and closed jobs — not just clicks.

## Vault Co Operating Principles
- Measure success in booked appointments and revenue, not lead counts alone
- Every campaign is client-specific, service-specific, market-specific, and creative-led
- Buyers are homeowners making a $10,000–$50,000 decision — treat the copy accordingly
- Premium-positioned clients never compete on price — never use "cheapest" language
- The follow-up system is as important as the ad — GHL must capture every lead immediately
- Compliance is non-negotiable — one insurance guarantee claim can kill an ad account

## Your Role
Generate complete, production-ready Meta advertising campaign drafts that are fully compliant, conversion-optimized, and ready for human review before any live action.

## Expertise
- Facebook and Instagram lead generation campaigns (Instant Forms, landing pages)
- Roofing and home improvement industry: inspection offers, storm damage campaigns, remodeling consultations
- GoHighLevel (GHL) CRM follow-up workflows: SMS, email, AI voice, task assignment
- Meta ad copy: primary text, headlines, descriptions, CTAs
- Creative direction: video shot lists, text overlays, voiceover scripts
- Compliance: Meta ad policies, TCPA/SMS consent, insurance advertising rules
- Performance optimization: CPL thresholds, booking rate floors, budget scaling rules
- Buyer psychology: understanding what homeowners fear, trust, delay on, and respond to

## Absolute Safety Rules (NEVER violate)
1. The AI generates drafts and recommendations ONLY. It CANNOT publish campaigns, activate ads, increase budgets, send reports, or push GHL workflows without explicit human approval.
2. NEVER use phrases implying guaranteed insurance coverage: "insurance will cover it", "100% covered", "guaranteed approval", "file a claim and pay nothing"
3. NEVER use unverifiable superlative claims: "best roofer in [city]", "cheapest in [area]"
4. NEVER guarantee specific ROI, conversion rates, or lead volumes
5. NEVER include discriminatory audience targeting (race, religion, national origin in housing-adjacent categories)
6. ALL SMS sequences require explicit TCPA opt-in consent captured in the lead form
7. ALL before/after creative must reference authentic client work only
8. NEVER imply urgency that cannot be enforced ("only 5 spots left" unless enforced)
9. NEVER say "cheapest" for clients positioned as premium — wrong brand positioning
10. NEVER guarantee storm damage claim approval or insurance payout outcomes

## Output Format
Return ONLY a valid JSON object with no text before or after it. No markdown, no explanation. Follow the exact schema in the user prompt.`;

// ─────────────────────────────────────────────────────────────
// JSON schema
// ─────────────────────────────────────────────────────────────

const CAMPAIGN_DRAFT_SCHEMA = `{
  "campaignName": "string — descriptive name e.g. 'Free Roof Inspection — Lead Generation — Phoenix'",
  "metaStructure": {
    "campaignObjective": "LEAD_GENERATION | CONVERSIONS | AWARENESS",
    "campaignType": "string — e.g. 'Instant Form (Native Lead Form)'",
    "adSetNames": ["string — 4 ad set names targeting distinct audience segments"],
    "audience": "string — detailed audience description with demographics, interests, est. reach",
    "locationTargeting": "string — primary city, radius, DMA, exclusions",
    "placements": ["string — list of Meta placements"],
    "budgetSplit": "string — budget allocation across ad sets",
    "optimizationEvent": "string — e.g. 'LEAD (Meta Instant Form Submit)'"
  },
  "adCopy": {
    "primaryTexts": ["string — 3 primary text variants (200–400 chars each), compelling and compliant"],
    "headlines": ["string — 3 headline variants (40 chars max each)"],
    "descriptions": ["string — 3 description variants (30 chars max each)"],
    "cta": "string — CTA button text e.g. 'Get My Free Inspection'"
  },
  "leadForm": {
    "formName": "string",
    "introCopy": "string — 2-3 sentence intro explaining the offer and what happens next",
    "qualificationQuestions": ["string — 2-4 pre-qualification questions"],
    "contactFields": ["string — fields to collect: name, phone, email, etc."],
    "consentLanguage": "string — TCPA-compliant SMS/email consent text with STOP opt-out instruction",
    "thankYouCopy": "string — confirmation message with next-step expectation setting"
  },
  "ghlWorkflow": {
    "tags": ["string — CRM tags to apply on lead creation"],
    "pipelineStage": "string",
    "immediateSms": "string — SMS sent within 60 seconds of lead submission, personalized",
    "immediateEmail": { "subject": "string", "body": "string" },
    "internalNotification": "string — internal alert to setter/owner with lead details",
    "setterTask": "string — task instructions for the setter",
    "aiVoiceTrigger": "string — AI voice script triggered if no call within 10 min",
    "bookedStopCondition": "string — instructions to stop sequences when appointment is booked",
    "steps": ["string — numbered list of all workflow steps with timing"]
  },
  "creativeDirection": {
    "angle": "string — creative angle/concept name",
    "hook": "string — opening hook line for the ad",
    "shotList": ["string — 6-8 specific shots for video production"],
    "textOverlays": ["string — 4 text overlay directions with placement notes"],
    "voiceoverScript": "string — full 30-second voiceover script with timestamps",
    "recommendedFormat": "string — format specs for different placements",
    "recommendedPlacements": ["string — ordered list of recommended placements, primary first"]
  },
  "compliance": {
    "metaRisk": "LOW — description | MEDIUM — description | HIGH — description",
    "smsCompliance": "string — TCPA compliance notes",
    "insuranceRisk": "string — insurance claim language risk or N/A",
    "disallowedPhrases": ["string — specific phrases to avoid in this campaign"],
    "approvalWarnings": ["string — specific items requiring human review before launch"]
  },
  "optimization": {
    "cplThreshold": "string",
    "cpbaThreshold": "string",
    "bookingRateFloor": "string",
    "creativeFatigueTrigger": "string",
    "budgetScalingRule": "string",
    "pauseRule": "string",
    "humanApprovalTriggers": ["string"]
  },
  "buyerPsychologyUsed": {
    "buyerInsight": "string — who the buyer is and what drives them",
    "urgencyTrigger": "string — what specific trigger creates urgency for this buyer right now",
    "trustTriggerUsed": "string — which trust signals were emphasized and why",
    "objectionAddressed": "string — the primary objection this campaign is designed to overcome",
    "hookRationale": "string — why this specific hook will resonate with this buyer",
    "ctaRationale": "string — why this CTA fits the buyer's decision stage"
  },
  "marketResearchUsed": {
    "marketSummary": "string — local market context used to inform this campaign",
    "competitorAngle": "string — how this positions against local competition",
    "audienceRationale": "string — why this specific audience was chosen",
    "locationRationale": "string — which areas/neighborhoods were targeted and why",
    "seasonalityNote": "string — seasonal context that informed the campaign timing or angle"
  },
  "clientIntelligenceUsed": {
    "onboardingSummaryUsed": true,
    "keyIntelligenceApplied": ["string — list of specific intelligence points used"],
    "offerAngle": "string — the specific offer angle derived from intelligence",
    "servicesPrioritized": ["string — services selected based on profitability/priority data"]
  },
  "strategicRationale": {
    "whyThisCampaign": "string — 2-3 sentence explanation of the core strategic decision",
    "buyerInsightUsed": "string — specific buyer insight that shaped the campaign",
    "marketInsightUsed": "string — specific market insight applied",
    "offerAngleUsed": "string — why this offer angle was chosen",
    "creativeAngleUsed": "string — why this creative format was chosen for this client",
    "trustTriggerUsed": "string — which trust triggers were selected and why",
    "objectionAddressed": "string — the specific objection this campaign is built to handle",
    "audienceRationale": "string — audience selection rationale based on intelligence",
    "leadFormRationale": "string — why these specific lead form questions were chosen",
    "followUpRationale": "string — follow-up sequence design rationale"
  },
  "creativeIntelligenceUsed": {
    "assetId": "string | null — ID of selected asset or null if type-only selection",
    "assetType": "string — creative type (Before/After, Owner On Camera, Storm Damage, etc.)",
    "creativeStrength": "string — e.g. 'Very High — emotional trust-first hook with owner face'",
    "trustSignals": ["string — specific trust signals this creative communicates"],
    "buyerIntent": "Cold | Warm | Hot — audience temperature this creative is best suited for",
    "recommendedAngle": "string — the specific campaign angle this creative should drive",
    "recommendedHook": "string — specific opening hook line for this creative",
    "recommendedCTA": "string — best CTA for this creative type and buyer stage",
    "placementRecommendation": ["string — ordered placements, primary first"],
    "complianceNote": "string — any compliance risks specific to this creative type",
    "whyThisCreative": "string — strategic rationale for using this creative in this campaign",
    "retargetingUse": "string — how this creative should be used in retargeting sequences",
    "approvedForAds": true
  }
}`;

// ─────────────────────────────────────────────────────────────
// User prompt builder
// ─────────────────────────────────────────────────────────────

export function buildCampaignPrompt(input: CampaignGenerationInput): string {
  const budgetNum = parseInt(input.budget.replace(/[^0-9]/g, "")) || 1500;
  const intel = input.clientIntelligence;
  const asset = input.selectedAsset ?? null;

  const creativeSection = asset ? `
## Creative Asset Selected
- **Asset Type**: ${asset.assetType}
- **File Type**: ${asset.fileType.toUpperCase()}
- **File Name**: ${asset.fileName}
- **Service**: ${asset.service}
- **Market**: ${asset.market}
- **Campaign Use Case**: ${asset.campaignUseCase}
- **Notes**: ${asset.notes}
- **Tags**: ${asset.tags.join(", ")}
- **Approved for Ads**: ${asset.approvedForAds ? "YES — approved and ready" : "NO — flag in compliance section, do not recommend launching until approved"}

IMPORTANT — Use this creative to shape the campaign:
- The hook, copy angle, and CTA must be designed specifically for a ${asset.assetType} creative
- Adjust audience temperature and placement recommendations to match this creative type
- Fill in the creativeIntelligenceUsed section with specific analysis of this creative asset
` : "";

  const intelligenceSection = intel ? `
## Client Intelligence (from onboarding)

### Company Profile
- Owner: ${intel.companyProfile.ownerName}
- Close rate: ${intel.companyProfile.currentCloseRate}
- Biggest bottleneck: ${intel.companyProfile.biggestBottleneck}
- Financing: ${intel.companyProfile.financingOffered ? "Yes — " + intel.offerIntelligence.financingAvailable : "No"}

### Service Area
- Areas: ${intel.serviceArea.cities.join(", ")}
- Best neighborhoods: ${intel.serviceArea.bestNeighborhoods.slice(0, 5).join(", ")}
- Target ZIPs: ${intel.serviceArea.targetZips.slice(0, 6).join(", ")}

### Target Buyer
- Age: ${intel.targetMarket.idealAgeRange}, HHI ${intel.targetMarket.householdIncome}
- Occupations: ${intel.targetMarket.occupations.slice(0, 4).join(", ")}
- Location type: ${intel.targetMarket.locationType}
- Preferred jobs: ${intel.targetMarket.preferredJobTypes.join(", ")}

### Buyer Psychology
- Primary buyer type: ${intel.buyerProfile.primaryBuyerType}
- Common fears: ${intel.buyerProfile.commonFears.slice(0, 3).join("; ")}
- Objections: ${intel.buyerProfile.commonObjections.join("; ")}
- Urgency triggers: ${intel.buyerProfile.urgencyTriggers.slice(0, 3).join("; ")}
- Trust triggers: ${intel.buyerProfile.trustTriggers.slice(0, 4).join("; ")}
- Why they delay: ${intel.buyerProfile.reasonsTheyDelay.slice(0, 2).join("; ")}

### Market Research
- Competitors: ${intel.marketResearch.mainCompetitors.join(", ")}
- Competitor weaknesses: ${intel.marketResearch.competitorWeaknesses.slice(0, 2).join("; ")}
- Opportunities: ${intel.marketResearch.opportunities.slice(0, 3).join("; ")}
- Seasonality: ${intel.marketResearch.seasonality}

### Offer Intelligence
- Main offer: ${intel.offerIntelligence.mainOffer}
- Guarantees: ${intel.offerIntelligence.guarantees.join(", ")}
- Proof points: ${intel.offerIntelligence.proofPoints.slice(0, 4).join("; ")}
- Jobs to prioritize: ${intel.offerIntelligence.jobsTheyWantMore.join(", ")}

### Brand Intelligence
- Positioning: ${intel.brandIntelligence.brandPositioning}
- Unique mechanism: ${intel.brandIntelligence.uniqueMechanism}
- Do NOT say: ${intel.brandIntelligence.whatNotToSay.slice(0, 4).join("; ")}

### Sales Intelligence
- Best angles: ${intel.salesIntelligence.bestSalesAngles.slice(0, 3).join("; ")}
- Lost lead recovery: ${intel.salesAudit.lostLeadRecovery}

### Campaign Implications
- Best angles: ${intel.campaignImplications.bestCampaignAngles.slice(0, 3).join("; ")}
- Lead form questions to use: ${intel.campaignImplications.leadFormQuestions.slice(0, 5).join("; ")}
- Follow-up strategy: ${intel.campaignImplications.followUpStrategy.slice(0, 4).join("; ")}

### Content
- Owner on camera: ${intel.contentPlanning.ownerOnCamera ? "Yes — " + intel.companyProfile.ownerName + " is outgoing and confident on camera" : "No"}
- Recommended themes: ${intel.contentPlanning.recommendedContentThemes.slice(0, 3).join("; ")}
` : "";

  return `Generate a complete Meta advertising campaign draft for this client and campaign.

## Client Profile
- **Name**: ${input.client.name}
- **Owner**: ${input.client.owner}
- **Market**: ${input.market}
- **Services**: ${input.client.services.join(", ")}
- **Average Job Value**: ${input.client.avgJobValue}
- **Monthly Ad Budget**: $${budgetNum.toLocaleString()}/mo
- **Core Offer**: ${input.client.offer}
- **Brand Tone**: ${input.client.brandTone}
- **Phone**: ${input.client.phone}
- **Meta Account ID**: ${input.client.metaAccountId}
- **GHL Location ID**: ${input.client.ghlLocationId}

## Campaign Parameters
- **Service to Promote**: ${input.service}
- **Campaign Goal**: ${input.goal}
- **Creative Type**: ${asset?.assetType ?? input.creativeType ?? "Video"}
${input.creativeNotes ? `- **Creative Notes**: ${input.creativeNotes}` : ""}
${asset ? `- **Asset Selected**: Yes — use creative intelligence above to shape the entire campaign` : ""}
${intel ? `- **Intelligence Available**: Full onboarding intelligence loaded — use all buyer psychology, market research, and campaign implication data below` : ""}
${intelligenceSection}${creativeSection}
## Instructions
Generate a complete, production-ready campaign draft. Be specific to this client, market, and service.

${intel ? `IMPORTANT: Use the full client intelligence above. This campaign must:
- Address the primary objection: "${intel.buyerProfile.commonObjections[0] ?? "price comparison"}"
- Lead with trust triggers: ${intel.buyerProfile.trustTriggers.slice(0, 2).join(", ")}
- Target: ${intel.targetMarket.householdIncome} homeowners in ${intel.serviceArea.cities.slice(0, 3).join(", ")}
- Avoid: ${intel.brandIntelligence.whatNotToSay[0] ?? "price-first positioning"}
- Use lead form questions from Campaign Implications section
- Add a lost lead recovery sequence (currently missing per sales audit)
- Fill in all intelligence fields (buyerPsychologyUsed, marketResearchUsed, clientIntelligenceUsed, strategicRationale)
` : `For ad copy: Write compelling, compliant, conversion-focused variants. Reference the specific market and client name.
For GHL workflow: Design a fast-response sequence. First contact within 5 minutes of lead submission.
For compliance: Be thorough. Flag any copy or targeting that could trigger Meta policy reviews.`}

For optimization: Use industry benchmarks: roofing CPL target $50–$80, remodeling CPL target $100–$150.

Return ONLY the following JSON object with no additional text:

${CAMPAIGN_DRAFT_SCHEMA}`;
}

// ─────────────────────────────────────────────────────────────
// Intelligence extraction
// ─────────────────────────────────────────────────────────────

const INTELLIGENCE_SCHEMA = `{
  "clientId": "string — use the provided clientId exactly",
  "onboardingSummary": "string — copy the summary text verbatim here",
  "companyProfile": {
    "ownerName": "string", "email": "string", "phone": "string",
    "website": "string", "officeAddress": "string",
    "businessModel": "string — residential | commercial | both",
    "projectType": "string — roofing | remodeling | both | other",
    "avgTicketValue": "string — dollar amount e.g. '$15,000'",
    "financingOffered": "boolean",
    "crewCount": "number",
    "monthlyCapacity": "string — e.g. '20 jobs/month'",
    "currentCloseRate": "string — e.g. '30–40%'",
    "biggestBottleneck": "string"
  },
  "serviceArea": {
    "radius": "string — e.g. '50-mile radius of Phoenix'",
    "state": "string — e.g. 'AZ'",
    "cities": ["string — list all mentioned cities"],
    "targetZips": ["string — list all mentioned ZIP codes"],
    "bestNeighborhoods": ["string — highest-value neighborhoods"]
  },
  "targetMarket": {
    "idealAgeRange": "string — e.g. '35–65'",
    "householdIncome": "string — e.g. '$100K–$300K'",
    "occupations": ["string — 4–6 inferred occupations"],
    "homeownership": "string — e.g. 'Homeowners, 10+ years in home'",
    "locationType": "string — suburban | urban | rural | mixed",
    "preferredJobTypes": ["string"],
    "highestMarginService": "string"
  },
  "buyerProfile": {
    "primaryBuyerType": "string",
    "homeownerProfile": "string",
    "focus": "string",
    "incomeNotes": "string",
    "decisionMaker": "string",
    "commonFears": ["string — 4–6 real fears"],
    "commonObjections": ["string — 3–5 objections"],
    "urgencyTriggers": ["string — 3–5 triggers"],
    "trustTriggers": ["string — 4–6 trust signals"],
    "buyingMotivations": ["string — 3–5 motivations"],
    "reasonsTheyDelay": ["string — 3–4 delay reasons"],
    "whyTheyChoose": ["string — 3–5 choice reasons"]
  },
  "marketResearch": {
    "primaryMarket": "string",
    "serviceAreas": ["string"],
    "mainCompetitors": ["string — all mentioned competitors"],
    "competitorStrengths": ["string"],
    "competitorWeaknesses": ["string — infer if not stated"],
    "localMarketNotes": "string",
    "seasonality": "string — peak seasons and slow periods",
    "stormRelevance": "string — storm/weather market relevance",
    "highValueNeighborhoods": ["string"],
    "opportunities": ["string — 3–5 market opportunities"],
    "risks": ["string — 2–4 market risks"]
  },
  "offerIntelligence": {
    "mainOffer": "string — the primary call-to-action offer",
    "secondaryOffers": ["string"],
    "servicePriorities": ["string — in order of priority"],
    "avgJobValue": "string",
    "mostProfitableServices": ["string"],
    "jobsTheyWantMore": ["string"],
    "jobsTheyWantLess": ["string"],
    "financingAvailable": "string — financing details or 'Not offered'",
    "insuranceNotes": "string — insurance claim handling or 'N/A'",
    "guarantees": ["string — warranties and guarantees offered"],
    "proofPoints": ["string — 4–6 credibility proof points"]
  },
  "salesIntelligence": {
    "bestSalesAngles": ["string — 3–5 proven angles"],
    "worstFitLeads": ["string — 2–3 lead types to avoid"],
    "commonObjections": ["string — top objections in sales"],
    "objectionResponses": ["string — how to respond to each"],
    "faqs": ["string — common questions prospects ask"],
    "pastClientWins": ["string — notable client success stories"],
    "testimonials": ["string — any quoted testimonials"],
    "reviewHighlights": ["string — what reviewers say most"],
    "beforeAfterNotes": "string — before/after content potential"
  },
  "brandIntelligence": {
    "brandTone": "string — e.g. 'Professional, direct, family-owned warmth'",
    "brandPositioning": "string — how they position vs competitors",
    "whyCustomersTrust": ["string — 4–6 trust reasons"],
    "founderStory": "string — owner background if mentioned",
    "teamStory": "string — team info if mentioned",
    "uniqueMechanism": "string — what makes them genuinely different",
    "whatNotToSay": ["string — 3–5 phrases that contradict positioning"],
    "complianceNotes": ["string — any legal/compliance sensitivities"]
  },
  "kpiBaseline": {
    "monthlyLeads": "number", "monthlyAppointments": "number",
    "monthlyCloses": "number", "monthlyRevenue": "string",
    "avgJobSize": "string", "closePercentage": "string",
    "costPerLead": "string", "showRate": "string",
    "currentAdSpend": "string",
    "currentLeadSources": ["string"]
  },
  "salesAudit": {
    "leadProcess": "string — how leads are handled end-to-end",
    "avgResponseTime": "string",
    "whoAnswersCalls": "string",
    "hasSalesScript": "boolean",
    "inspectionBookingProcess": "string",
    "estimatePresentation": "string",
    "followUpCadence": "string",
    "lostLeadRecovery": "string — or empty string if none exists",
    "leadFallOffPoint": "string — where leads drop off most"
  },
  "contentPlanning": {
    "ownerOnCamera": "boolean",
    "ownerPersonality": "string",
    "contentTone": "string",
    "testimonialsAvailable": "boolean",
    "crewWillingToFilm": "boolean",
    "biggestSellingPoints": ["string — 4–6 visual selling points"],
    "recommendedContentThemes": ["string — 4–6 content themes"]
  },
  "campaignImplications": {
    "bestCampaignAngles": ["string — 4–6 specific campaign angles"],
    "servicesToPrioritize": ["string — in order of ad priority"],
    "offersToTest": ["string — 3–5 specific testable offers"],
    "creativeFormats": ["string — recommended formats"],
    "leadFormQuestions": ["string — 4–6 specific qualifying questions"],
    "followUpStrategy": ["string — 4–6 follow-up sequence steps"],
    "whatNotToSay": ["string — 3–5 copy phrases to avoid"]
  }
}`;

export const EXTRACTION_SYSTEM_PROMPT = `You are a client intelligence analyst for Vault Co, a premium Meta advertising agency for roofing and construction companies.

Your job: extract structured intelligence from a client onboarding summary and return a complete JSON object.

Rules:
- Return ONLY valid JSON — no markdown, no explanation, no text before or after the JSON object
- If a field is not explicitly mentioned, infer it from context or use an empty string / empty array
- Be specific and actionable — vague answers ("good quality", "local company") are useless
- The campaignImplications section is the most important — make it specific and campaign-ready
- Flag real compliance risks in brandIntelligence.complianceNotes
- Numbers in kpiBaseline must be actual numbers (not strings), except where string is specified`;

export function buildExtractionPrompt(clientId: string, summary: string): string {
  return `Extract complete structured intelligence from this client onboarding summary.

Client ID: "${clientId}"

## Onboarding Summary
${summary}

## Instructions
Extract all intelligence into the JSON schema below. Be thorough and specific:
- Use actual quotes and numbers from the summary where available
- Infer missing fields from context (e.g., if they're a premium roofer, infer appropriate HHI target)
- The campaignImplications section drives campaign generation — make every item specific and actionable
- Write salesAudit.lostLeadRecovery as an empty string "" if the summary indicates there is none

Return ONLY this JSON object with no other text:

${INTELLIGENCE_SCHEMA}`;
}

// ─────────────────────────────────────────────────────────────
// Creative analysis types and prompt
// ─────────────────────────────────────────────────────────────

export interface CreativeAnalysisInput {
  assetId?: string;
  assetType: string;
  fileType: "image" | "video";
  fileName: string;
  service: string;
  market: string;
  tags: string[];
  notes: string;
  approvedForAds: boolean;
  campaignUseCase: string;
  clientName?: string;
  clientIntelligence?: ClientIntelligence | null;
}

export interface CreativeAnalysisResult {
  creativeStrength: string;
  trustSignals: string[];
  buyerIntent: "Cold" | "Warm" | "Hot";
  recommendedAngle: string;
  recommendedHook: string;
  recommendedCTA: string;
  placementRecommendation: string[];
  complianceNote: string;
  whyThisCreative: string;
  retargetingUse: string;
  audienceTemperatureFit: string;
  formatRecommendation: string;
  hookVariants: string[];
  weaknesses: string[];
}

const CREATIVE_ANALYSIS_SCHEMA = `{
  "creativeStrength": "string — Very High | High | Medium | Low — with one-sentence explanation",
  "trustSignals": ["string — list specific trust signals this creative communicates"],
  "buyerIntent": "Cold | Warm | Hot — single word only",
  "recommendedAngle": "string — specific campaign angle to pair with this creative",
  "recommendedHook": "string — specific opening hook line (in quotes, ready to use)",
  "recommendedCTA": "string — best CTA button text for this creative type",
  "placementRecommendation": ["string — ordered placements, primary first"],
  "complianceNote": "string — any specific compliance risks for this creative type",
  "whyThisCreative": "string — 2-sentence strategic rationale for using this creative",
  "retargetingUse": "string — how to use this creative in retargeting sequences",
  "audienceTemperatureFit": "string — which audience stages this creative is best for",
  "formatRecommendation": "string — 9:16 / 1:1 / 4:5 specs for each placement",
  "hookVariants": ["string — exactly 3 hook variants to test, each in quotes"],
  "weaknesses": ["string — 2-3 genuine creative weaknesses or risks to address"]
}`;

export const CREATIVE_ANALYSIS_SYSTEM_PROMPT = `You are a creative strategist for Vault Co, a Meta advertising agency for roofing and construction companies.

Analyze creative assets based on their metadata, notes, and context — without seeing the actual image or video. Use the asset type, tags, notes, and service to infer creative quality and strategic fit.

Return ONLY valid JSON — no markdown, no explanation, no text before or after.`;

export function buildCreativeAnalysisPrompt(input: CreativeAnalysisInput): string {
  const intel = input.clientIntelligence;

  const intelSection = intel ? `
## Client Intelligence
- Primary buyer: ${intel.buyerProfile.primaryBuyerType}
- Trust triggers: ${intel.buyerProfile.trustTriggers.slice(0, 4).join(", ")}
- Common objections: ${intel.buyerProfile.commonObjections.slice(0, 3).join("; ")}
- Best campaign angles: ${intel.campaignImplications.bestCampaignAngles.slice(0, 3).join("; ")}
- What NOT to say: ${intel.brandIntelligence.whatNotToSay.slice(0, 3).join("; ")}
` : "";

  return `Analyze this creative asset for Meta advertising use.

## Creative Asset
- Type: ${input.assetType}
- File: ${input.fileName} (${input.fileType})
- Service: ${input.service}
- Market: ${input.market}
- Campaign Use Case: ${input.campaignUseCase}
- Tags: ${input.tags.join(", ")}
- Notes: ${input.notes || "No notes provided"}
- Approved for Ads: ${input.approvedForAds ? "YES" : "NO — flag in complianceNote"}
${input.clientName ? `- Client: ${input.clientName}` : ""}
${intelSection}
## Instructions
Analyze this creative for strategic fit, hook strength, trust signals, compliance risks, and placement recommendations. All analysis must be specific to this creative type and service — not generic.

Return ONLY this JSON:

${CREATIVE_ANALYSIS_SCHEMA}`;
}

// ─────────────────────────────────────────────────────────────
// Weekly report types and prompt
// ─────────────────────────────────────────────────────────────

export interface WeeklyReportInput {
  clientId?: string;
  clientName: string;
  reportPeriod: string;
  spend: string;
  leads: number;
  booked: number;
  cpl: string;
  cpba: string;
  showRate: string;
  pipelineValue: string;
  revenueGenerated: string;
  wins: string[];
  issues: string[];
  nextActions: string[];
  previousWeekComparison?: {
    leads?: number;
    spend?: string;
    cpl?: string;
  };
}

export interface WeeklyReportDraft {
  reportTitle: string;
  executiveSummary: string;
  winsSection: string;
  issuesSection: string;
  nextActionsSection: string;
  agentRecommendations: string[];
  clientReadyNarrative: string;
  approvalNote: string;
}

const REPORT_SCHEMA = `{
  "reportTitle": "string — e.g. '[Client Name] — Weekly Performance Report — [Period]'",
  "executiveSummary": "string — 2-3 sentence operator-level summary of the week",
  "winsSection": "string — narrative paragraph on wins, framed positively and specifically",
  "issuesSection": "string — honest, specific narrative on issues with context (not alarmist)",
  "nextActionsSection": "string — clear, specific next steps narrative",
  "agentRecommendations": ["string — 3-5 specific, actionable recommendations with rationale"],
  "clientReadyNarrative": "string — full client-facing report narrative (3-5 paragraphs, professional tone, framed around revenue and booked appointments — this is what gets sent to the client)",
  "approvalNote": "string — reminder that human review is required before sending"
}`;

export const REPORT_SYSTEM_PROMPT = `You are a senior growth operator writing weekly performance reports for Vault Co clients.

Vault Co is a premium growth partner — not a media buying shop. Reports must:
- Lead with booked appointments and pipeline value, not just lead counts
- Be honest about issues without being alarmist
- Make every recommendation specific and actionable
- Sound like a strategic growth partner, not a metrics dashboard
- Never guarantee outcomes or imply budget changes are automatic

The clientReadyNarrative is the section that gets sent to the actual client. Make it premium, clear, and confidence-building.

Return ONLY valid JSON — no markdown, no explanation.`;

export function buildReportPrompt(input: WeeklyReportInput): string {
  const bookingRate = input.leads > 0
    ? `${Math.round((input.booked / input.leads) * 100)}%`
    : "N/A";

  const wowSection = input.previousWeekComparison ? `
## Week-Over-Week Comparison
- Leads: ${input.previousWeekComparison.leads ?? "N/A"} → ${input.leads} (${input.leads - (input.previousWeekComparison.leads ?? 0) >= 0 ? "+" : ""}${input.leads - (input.previousWeekComparison.leads ?? 0)})
- Spend: ${input.previousWeekComparison.spend ?? "N/A"} → ${input.spend}
- CPL: ${input.previousWeekComparison.cpl ?? "N/A"} → ${input.cpl}
` : "";

  return `Generate a premium weekly performance report for this roofing/construction client.

## Client: ${input.clientName}
## Report Period: ${input.reportPeriod}

## Performance Data
- Ad Spend: ${input.spend}
- Leads Generated: ${input.leads}
- Booked Appointments: ${input.booked}
- Booking Rate: ${bookingRate}
- Cost Per Lead: ${input.cpl}
- Cost Per Booked Appointment: ${input.cpba}
- Show Rate: ${input.showRate}
- Pipeline Value: ${input.pipelineValue}
- Revenue Generated: ${input.revenueGenerated}
${wowSection}
## Wins This Week
${input.wins.length > 0 ? input.wins.map((w) => `- ${w}`).join("\n") : "- Steady lead flow maintained"}

## Issues This Week
${input.issues.length > 0 ? input.issues.map((i) => `- ${i}`).join("\n") : "- No critical issues to report"}

## Next Actions
${input.nextActions.length > 0 ? input.nextActions.map((a) => `- ${a}`).join("\n") : "- Continue current campaign structure"}

## Instructions
Write the clientReadyNarrative as a premium 3-5 paragraph client report. Lead with the business impact (booked appointments, pipeline, revenue), address any issues honestly, and end with specific next steps. Tone: growth partner, not vendor. Never use jargon like "CTR" or "ROAS" in the client narrative — translate to business terms.

All agentRecommendations must require human approval before execution.

Return ONLY this JSON:

${REPORT_SCHEMA}`;
}
