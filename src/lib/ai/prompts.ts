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

export const SYSTEM_PROMPT = `You are a Meta advertising strategist for Vault Co, a premium growth partner for roofing and construction companies. Generate production-ready campaign drafts for human review.

Core rules:
- Measure success in booked appointments and revenue, not just leads
- Buyers are homeowners making $10K–$50K decisions — copy must reflect this
- Never use "cheapest" language for premium clients
- NEVER imply guaranteed insurance coverage or ROI
- ALL SMS requires TCPA opt-in consent in the lead form
- This is a DRAFT only — no live actions without human approval

Return ONLY valid JSON. No markdown, no explanation. Follow the schema exactly.`;

// ─────────────────────────────────────────────────────────────
// JSON schema
// ─────────────────────────────────────────────────────────────

const CAMPAIGN_DRAFT_SCHEMA = `{
  "campaignName": "string",
  "metaStructure": {
    "campaignObjective": "LEAD_GENERATION",
    "campaignType": "string",
    "adSetNames": ["string", "string"],
    "audience": "string",
    "locationTargeting": "string",
    "placements": ["string"],
    "budgetSplit": "string",
    "optimizationEvent": "string"
  },
  "adCopy": {
    "primaryTexts": ["string (3 variants, 200-300 chars)"],
    "headlines": ["string (3 variants, 40 chars max)"],
    "descriptions": ["string (3 variants, 30 chars max)"],
    "cta": "string"
  },
  "leadForm": {
    "formName": "string",
    "introCopy": "string",
    "qualificationQuestions": ["string"],
    "contactFields": ["string"],
    "consentLanguage": "string (TCPA-compliant, include STOP opt-out)",
    "thankYouCopy": "string"
  },
  "ghlWorkflow": {
    "tags": ["string"],
    "pipelineStage": "string",
    "immediateSms": "string (within 60s of lead)",
    "immediateEmail": { "subject": "string", "body": "string" },
    "internalNotification": "string",
    "setterTask": "string",
    "aiVoiceTrigger": "string",
    "bookedStopCondition": "string",
    "steps": ["string"]
  },
  "creativeDirection": {
    "angle": "string",
    "hook": "string",
    "shotList": ["string (4-6 shots)"],
    "textOverlays": ["string (3-4 overlays)"],
    "voiceoverScript": "string (30s script)",
    "recommendedFormat": "string",
    "recommendedPlacements": ["string"]
  },
  "compliance": {
    "metaRisk": "LOW | MEDIUM | HIGH — reason",
    "smsCompliance": "string",
    "insuranceRisk": "string",
    "disallowedPhrases": ["string"],
    "approvalWarnings": ["string"]
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
  "strategicRationale": {
    "whyThisCampaign": "string",
    "audienceRationale": "string",
    "offerAngleUsed": "string",
    "creativeAngleUsed": "string"
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

### Campaign Implications
- Best angles: ${intel.campaignImplications.bestCampaignAngles.slice(0, 3).join("; ")}
- Lead form questions to use: ${intel.campaignImplications.leadFormQuestions.slice(0, 5).join("; ")}
- Follow-up strategy: ${intel.campaignImplications.followUpStrategy.slice(0, 4).join("; ")}

` : "";

  return `Generate a complete Meta advertising campaign draft for this client.

## Client
- **Name**: ${input.client.name}
- **Owner**: ${input.client.owner}
- **Market**: ${input.market}
- **Services**: ${input.client.services.join(", ")}
- **Avg Job Value**: ${input.client.avgJobValue}
- **Budget**: $${budgetNum.toLocaleString()}/mo
- **Offer**: ${input.client.offer}
- **Brand Tone**: ${input.client.brandTone}

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
    "bestSalesAngles": ["string — 3 proven angles, short phrases"],
    "worstFitLeads": ["string — 2 lead types to avoid"],
    "lostLeadRecovery": "string — or empty string if none"
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
    "monthlyLeads": 0, "monthlyRevenue": "string",
    "currentCloseRate": "string", "currentAdSpend": "string"
  },
  "salesAudit": {
    "avgResponseTime": "string",
    "lostLeadRecovery": "string — or empty string if none exists",
    "leadFallOffPoint": "string"
  },
  "contentPlanning": {
    "ownerOnCamera": false,
    "recommendedContentThemes": ["string — 3 themes"]
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

export const EXTRACTION_SYSTEM_PROMPT = `You are a client intelligence analyst for Vault Co, a Meta advertising agency for roofing and construction companies.

Extract structured intelligence from the onboarding summary. Return ONLY valid JSON — no markdown, no explanation.
- If a field is not mentioned, infer from context or use empty string / empty array
- Be specific and actionable — the campaignImplications section drives campaign generation
- Flag compliance risks in brandIntelligence.complianceNotes
- Keep all string values concise (under 100 chars each)`;

export function buildExtractionPrompt(clientId: string, summary: string): string {
  return `Extract client intelligence from this onboarding summary. Client ID: "${clientId}"

${summary}

Return ONLY this JSON (no other text):

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
