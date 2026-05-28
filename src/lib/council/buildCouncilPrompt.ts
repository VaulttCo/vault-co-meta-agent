// buildCouncilPrompt — constructs the full Council prompt for Hermes.
// applyCouncilToDraft — merges Council improved draft back into CampaignDraft.

import type { CampaignDraft } from "@/lib/planStore";
import type { CreativeAsset } from "@/lib/creativeAssets";
import type { CouncilMode, CouncilResponse } from "./types";

export interface CouncilContext {
  client?: { id: string; name: string; market?: string; monthlyBudget?: string; services?: string[] } | null;
  goal?: string;
  service?: string;
  market?: string;
  budget?: string;
  displayPlan?: CampaignDraft | null;
  selectedAssets?: CreativeAsset[];
  assetNotes?: Record<string, string>;
  assetAnalyses?: Record<string, { visualSummary?: string; analysisSource?: string }>;
  campaignNotes?: string;
}

const SAFETY_HEADER = `=== VAULT CO COUNCIL SAFETY RULES ===
The Council can: improve drafts, rewrite ad copy, create campaign structures, QA checklists, prepare Meta push payload drafts, create approval summaries, create operator tasks.
The Council CANNOT: launch ads, activate campaigns, change budgets, publish to Meta, push GHL workflows, send emails, delete production data, modify billing systems.
All outputs are DRAFT/APPROVAL-READY only. Campaign status must always be PAUSED or pending-approval.`;

const COUNCIL_ROLES = `=== THE COUNCIL — ADVISOR ROLES ===

Each advisor gives an INDEPENDENT analysis. Do not validate the existing draft. Pressure-test it. Find blind spots. Then rebuild.

[FATAL FLAW ADVISOR]
Find what could break this campaign. Identify weak assumptions, bad offers, unclear hooks, weak creative-to-copy match, tracking/budget/compliance/funnel risks.
Ask: "What could make this fail?"
Output: Fatal flaws, severity level, fix required before launch, what NOT to do.

[RIGHT PROBLEM ADVISOR]
Challenge whether we're solving the correct problem. Is the bottleneck lead quality, offer, creative, follow-up, market trust, sales process, or targeting?
Ask: "Are we solving the right problem?"
Output: Actual problem, misdiagnosed problem if any, better campaign objective, strategic correction.

[UPSIDE ADVISOR]
Find the strongest opportunity and highest-leverage angle. Identify best emotional/logical buying angle, proof/authority/trust/urgency opportunities, ways to increase conversion potential.
Ask: "What is the upside if we get this right?"
Output: Winning angle, highest-leverage opportunity, strongest audience segment, best offer framing, scale potential.

[NORMAL PERSON ADVISOR]
Act like a real homeowner/business owner with zero marketing context. Point out confusing language, what feels too salesy/vague/fake/generic, whether the ad makes immediate sense.
Ask: "Would a normal person care, understand, and take action?"
Output: Confusing parts, trust issues, what feels fake or generic, what would make them stop scrolling, plain-English rewrite suggestions.

[NEXT ACTION ADVISOR]
Only care about what should be done next. Turn the debate into executable steps. Separate urgent fixes from nice-to-have improvements.
Ask: "What do we actually do next?"
Output: Immediate next steps, operator task list, approval requirements, missing assets, timeline recommendation.

[CREATIVE DIRECTOR]
Analyze creative assets and identify strongest visual campaign angles. Identify what each asset is showing, visual hooks, emotional/status/trust/proof signals. Decide whether each asset is better for cold traffic, retargeting, trust, testimonial, authority, offer, or proof. Identify copy that should NOT be paired with each asset. Identify missing visual assets.
NOTE: Hermes receives asset metadata, operator notes, and any pre-completed vision analysis summaries. Base analysis on asset type, notes, vision summary if available, and campaign context.

[MEDIA BUYER]
Check campaign structure, objective, funnel, targeting, budget safety, Meta readiness. Check campaign objective, audience/funnel logic, budget safety, retargeting layer, Meta push readiness. Identify launch risks.

[COPY CHIEF]
Rewrite hooks, primary text, headlines, CTAs, offer framing, and lead form language. Avoid generic local filler like "in [city]". Tie every copy piece to the actual creative asset and actual client context. Create exact ready-to-use copy blocks. Match cold traffic vs retargeting intent.

[CRM/GHL AGENT]
Build follow-up logic and conversion system. Build speed-to-lead logic, missed-call handling, SMS/email nurture, appointment reminders, pipeline stage logic, GHL workflow draft.

[COMPLIANCE/RISK]
Catch claims, policy risks, restricted wording, unclear guarantees, approval issues. Check ad copy risk, lead form wording, claims/guarantees, financial/housing sensitivity. Identify what should be softened before approval.

[LOCAL MARKET]
Use actual market context intelligently. Avoid lazy "in [city]" copy. Use market context only when it strengthens trust, urgency, local proof, or relevance. Identify local buyer psychology.

[CHAIRMAN]
Make the final call after reading all advisors. Review every opinion. Identify disagreements. Resolve contradictions. Decide: ready / revise / rebuild / reject. Produce final campaign direction and next steps.
Output: Final verdict, winning strategy, required changes, final campaign direction, approval readiness score 0-100, next operator actions.`;

const COUNCIL_MODE_INSTRUCTIONS: Record<CouncilMode, string> = {
  campaign_build: `Run a FULL COUNCIL CAMPAIGN BUILD.
Round 1: Each advisor analyzes independently.
Round 2: Each advisor reads the others and identifies blind spots.
Chairman Final Call: Summarize debate, resolve contradictions, give final decision.
Hermes Build: Rebuild an improved campaign draft based on the Chairman's direction.
IMPORTANT: Do NOT validate the existing draft. Pressure-test it. Fight over the weak parts. Identify blind spots. Rebuild into something better.`,

  improve_and_apply_draft: `Run COUNCIL IMPROVE AND APPLY DRAFT — the highest-stakes Council mode.
Full council debate. Chairman decides the winning direction. Hermes rebuilds the COMPLETE improved campaign draft.
Every section of the improvedDraft must be written at full quality. No placeholders. No generic filler.
Tie every piece of copy to the actual creative assets and actual client context.
The adCopy field must contain ready-to-use primary text that is NOT generic. It must be specific to the client, offer, market, and creative.`,

  campaign_qa: `Run a COUNCIL CAMPAIGN QA.
Each advisor performs a pre-launch audit from their perspective.
Chairman gives final QA verdict and approval readiness score.
End with structured QA checklist covering: offer clarity, audience fit, creative-to-copy match, asset quality, lead form readiness, retargeting readiness, GHL readiness, budget safety, compliance risk, tracking readiness, approval readiness, missing assets. Score each out of 10.`,

  creative_review: `Run a COUNCIL CREATIVE ASSET REVIEW.
Focus entirely on the uploaded creative assets. Creative Director leads.
Each advisor gives their angle on how to best use these assets.
Copy Chief provides exact copy for each asset.
Media Buyer confirms placement/objective fit per asset.
Output specific ad copy tied to each actual asset.`,

  meta_push_readiness: `Run a COUNCIL META PUSH READINESS CHECK.
Media Buyer leads. Check every Meta launch requirement.
Output a structured Meta push payload draft (PAUSED status only — no activation instructions).
Include: campaign_name, objective, buying_type, status: PAUSED, ad_sets, ads, lead_form_requirements, tracking_requirements, validation_warnings.
Compliance/Risk Agent reviews every field for approval risk.`,

  offer_review: `Run a COUNCIL OFFER REVIEW.
Focus on the offer itself — value proposition, the free offer, the framing, the conversion mechanism.
Normal Person, Upside Advisor, and Copy Chief lead the debate.
Chairman decides final offer direction and rewrite.`,

  funnel_review: `Run a COUNCIL FUNNEL REVIEW.
Analyze the full conversion funnel: ad → landing/lead form → GHL follow-up → booking.
CRM/GHL Agent, Media Buyer, and Right Problem Advisor lead.
Map every funnel stage and identify leaks, delays, and missed opportunities.`,

  operator_task_review: `Run a COUNCIL OPERATOR TASK REVIEW.
Next Action Advisor leads. Identify every operator action needed to launch this campaign.
Create a prioritized task list with BLOCKERS vs REQUIRED vs RECOMMENDED.
Include: owner, priority, type, action, and what each task blocks.`,

  strategy_review: `Run a COUNCIL STRATEGY REVIEW.
Question the entire campaign strategy. Is this the right market, offer, and funnel for this client right now?
Right Problem Advisor and Chairman lead the debate.
Output: final strategic direction decision with specific corrections.`,
};

export function buildCouncilPrompt(ctx: CouncilContext, councilMode: CouncilMode): string {
  const lines: string[] = [];

  lines.push(SAFETY_HEADER);
  lines.push("");

  if (ctx.client) {
    lines.push("=== CLIENT ===");
    lines.push(`Name: ${ctx.client.name}`);
    if (ctx.market || ctx.client.market) lines.push(`Market: ${ctx.market || ctx.client.market}`);
    if (ctx.budget || ctx.client.monthlyBudget) lines.push(`Monthly Budget: ${ctx.budget || ctx.client.monthlyBudget}`);
    if (ctx.client.services?.length) lines.push(`Services: ${ctx.client.services.join(", ")}`);
  }

  lines.push("\n=== CAMPAIGN PARAMETERS ===");
  if (ctx.goal) lines.push(`Goal: ${ctx.goal}`);
  if (ctx.service) lines.push(`Service: ${ctx.service}`);
  if (ctx.market) lines.push(`Market: ${ctx.market}`);
  if (ctx.budget) lines.push(`Budget: ${ctx.budget}`);

  if (ctx.displayPlan) {
    const p = ctx.displayPlan;
    lines.push("\n=== CURRENT CAMPAIGN DRAFT ===");
    lines.push(`Campaign Name: ${p.campaignName}`);
    lines.push(`Status: ${p.status}`);
    lines.push(`Objective: ${p.metaStructure.campaignObjective}`);
    lines.push(`Campaign Type: ${p.metaStructure.campaignType}`);
    lines.push(`Audience: ${p.metaStructure.audience}`);
    lines.push(`Location Targeting: ${p.metaStructure.locationTargeting}`);
    lines.push(`Budget Split: ${p.metaStructure.budgetSplit}`);
    lines.push(`Optimization Event: ${p.metaStructure.optimizationEvent}`);
    if (p.metaStructure.adSetNames?.length) {
      lines.push(`Ad Sets: ${p.metaStructure.adSetNames.join(" | ")}`);
    }

    lines.push("\n--- AD COPY ---");
    p.adCopy?.primaryTexts?.forEach((t, i) => {
      if (t) lines.push(`Primary Text ${i + 1}: ${t}`);
    });
    if (p.adCopy?.headlines?.length) lines.push(`Headlines: ${p.adCopy.headlines.join(" | ")}`);
    if (p.adCopy?.descriptions?.length) lines.push(`Descriptions: ${p.adCopy.descriptions.join(" | ")}`);
    if (p.adCopy?.cta) lines.push(`CTA: ${p.adCopy.cta}`);

    lines.push("\n--- CREATIVE DIRECTION ---");
    if (p.creativeDirection?.angle) lines.push(`Angle: ${p.creativeDirection.angle}`);
    if (p.creativeDirection?.hook) lines.push(`Hook: ${p.creativeDirection.hook}`);
    if (p.creativeDirection?.recommendedFormat) lines.push(`Format: ${p.creativeDirection.recommendedFormat}`);
    if (p.creativeDirection?.voiceoverScript) lines.push(`Voiceover: ${p.creativeDirection.voiceoverScript.slice(0, 300)}`);

    lines.push("\n--- LEAD FORM ---");
    if (p.leadForm?.formName) lines.push(`Form Name: ${p.leadForm.formName}`);
    if (p.leadForm?.introCopy) lines.push(`Intro: ${p.leadForm.introCopy.slice(0, 300)}`);
    if (p.leadForm?.qualificationQuestions?.length) {
      lines.push(`Questions: ${p.leadForm.qualificationQuestions.join(" | ")}`);
    }
    if (p.leadForm?.thankYouCopy) lines.push(`Thank You: ${p.leadForm.thankYouCopy.slice(0, 200)}`);

    lines.push("\n--- GHL WORKFLOW ---");
    if (p.ghlWorkflow?.immediateSms) lines.push(`Immediate SMS: ${p.ghlWorkflow.immediateSms.slice(0, 200)}`);
    if (p.ghlWorkflow?.pipelineStage) lines.push(`Pipeline Stage: ${p.ghlWorkflow.pipelineStage}`);
    if (p.ghlWorkflow?.steps?.length) lines.push(`Steps: ${p.ghlWorkflow.steps.slice(0, 4).join(" → ")}`);

    lines.push("\n--- COMPLIANCE ---");
    if (p.compliance?.metaRisk) lines.push(`Meta Risk: ${p.compliance.metaRisk}`);
    if (p.compliance?.disallowedPhrases?.length) {
      lines.push(`Disallowed phrases: ${p.compliance.disallowedPhrases.slice(0, 5).join("; ")}`);
    }
    if (p.compliance?.approvalWarnings?.length) {
      lines.push(`Approval warnings: ${p.compliance.approvalWarnings.slice(0, 3).join("; ")}`);
    }

    if (p.strategicRationale?.whyThisCampaign) {
      lines.push(`\nStrategic Rationale: ${p.strategicRationale.whyThisCampaign.slice(0, 300)}`);
    }
  } else {
    lines.push("\n=== CAMPAIGN DRAFT ===");
    lines.push("No campaign draft generated yet. Build from scratch using available context.");
  }

  // Creative assets
  lines.push("\n=== CREATIVE ASSETS ===");
  if (ctx.selectedAssets && ctx.selectedAssets.length > 0) {
    ctx.selectedAssets.forEach((asset, i) => {
      lines.push(`\nAsset ${i + 1}: "${asset.fileName}"`);
      lines.push(`  File Type: ${asset.fileType === "video" ? "VIDEO" : "IMAGE"}`);
      lines.push(`  Creative Type: ${asset.assetType}`);
      lines.push(`  Approval Status: ${asset.approvedForAds ? "Approved for Ads" : "NOT YET APPROVED"}`);
      if (asset.campaignUseCase) lines.push(`  Intended Use: ${asset.campaignUseCase}`);
      if (asset.notes) lines.push(`  Operator Notes: ${asset.notes}`);

      const analysis = ctx.assetAnalyses?.[asset.id];
      if (analysis?.visualSummary) {
        lines.push(`  Vision Analysis: ${analysis.visualSummary}`);
        lines.push(`  Analysis Source: ${analysis.analysisSource ?? "vision"}`);
      }

      const note = ctx.assetNotes?.[asset.id];
      if (note) lines.push(`  Campaign Notes: ${note}`);
    });
    lines.push(`\nASSET NOTE: Hermes receives metadata, operator notes, and pre-completed vision summaries. Hermes cannot directly view image or video files. Creative Director must analyze based on asset type, notes, vision summary, and campaign context.`);
  } else {
    lines.push("No creative assets uploaded. Creative Director should identify what visuals are missing and recommend what would most strengthen this campaign.");
  }

  if (ctx.campaignNotes) {
    lines.push(`\n=== CAMPAIGN NOTES ===\n${ctx.campaignNotes}`);
  }

  lines.push("");
  lines.push(COUNCIL_ROLES);

  lines.push("\n=== COUNCIL TASK ===");
  lines.push(COUNCIL_MODE_INSTRUCTIONS[councilMode]);

  lines.push(`\n=== REQUIRED OUTPUT FORMAT ===`);
  lines.push(
    `Return ONLY a single valid JSON object. No text before or after the JSON. No markdown code fences. The JSON must exactly match this shape:\n` +
    `{\n` +
    `  "finalVerdict": "ready|revise|rebuild|reject",\n` +
    `  "approvalReadinessScore": 0,\n` +
    `  "winningAngle": "...",\n` +
    `  "councilDebate": {\n` +
    `    "fatalFlawAdvisor": "...",\n` +
    `    "rightProblemAdvisor": "...",\n` +
    `    "upsideAdvisor": "...",\n` +
    `    "normalPersonAdvisor": "...",\n` +
    `    "nextActionAdvisor": "...",\n` +
    `    "creativeDirectorAgent": "...",\n` +
    `    "mediaBuyerAgent": "...",\n` +
    `    "copyChiefAgent": "...",\n` +
    `    "crmGhlAgent": "...",\n` +
    `    "complianceRiskAgent": "...",\n` +
    `    "localMarketAgent": "...",\n` +
    `    "chairman": "..."\n` +
    `  },\n` +
    `  "councilSummary": {\n` +
    `    "winningAngle": "...",\n` +
    `    "creativeReasoning": "...",\n` +
    `    "mediaBuyerReasoning": "...",\n` +
    `    "copyReasoning": "...",\n` +
    `    "crmReasoning": "...",\n` +
    `    "complianceNotes": "...",\n` +
    `    "localMarketNotes": "..."\n` +
    `  },\n` +
    `  "assetAnalysis": { "photos": [], "videos": [] },\n` +
    `  "improvedDraft": {\n` +
    `    "overview": "...",\n` +
    `    "metaStructure": "...",\n` +
    `    "adCopy": "...",\n` +
    `    "leadForm": "...",\n` +
    `    "ghlWorkflow": "...",\n` +
    `    "creativeDirection": "...",\n` +
    `    "compliance": "...",\n` +
    `    "optimization": "..."\n` +
    `  },\n` +
    `  "changesMade": [],\n` +
    `  "missingAssets": [],\n` +
    `  "nextOperatorTasks": []\n` +
    `}`
  );

  return lines.join("\n");
}

// Merges Council improved draft text back into an existing CampaignDraft.
// Creates a new draft (does not mutate). Sets status to needs_review.
export function applyCouncilToDraft(
  existing: CampaignDraft,
  council: CouncilResponse
): CampaignDraft {
  const now = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const improved = council.improvedDraft ?? {};
  const summary = council.councilSummary ?? {};

  // Extract the best primary text from improved adCopy.
  // The improved adCopy field is a string — use it as primaryTexts[0].
  const improvedPrimaryText = improved.adCopy || existing.adCopy.primaryTexts[0];
  const improvedPrimaryTexts: string[] = [
    improvedPrimaryText,
    existing.adCopy.primaryTexts[1] ?? "",
    existing.adCopy.primaryTexts[2] ?? "",
  ];

  // Extract improved creative angle / hook from the improved draft.
  const improvedAngle =
    council.winningAngle ||
    (improved.creativeDirection
      ? improved.creativeDirection.split("\n")[0]
      : existing.creativeDirection.angle);
  const improvedHook = council.winningAngle || existing.creativeDirection.hook;

  return {
    ...existing,
    campaignName: existing.campaignName.startsWith("[Council]")
      ? existing.campaignName
      : `[Council] ${existing.campaignName}`,
    status: "needs_review",
    updatedAt: now,
    adCopy: {
      ...existing.adCopy,
      primaryTexts: improvedPrimaryTexts,
    },
    creativeDirection: {
      ...existing.creativeDirection,
      angle: improvedAngle,
      hook: improvedHook,
      voiceoverScript: improved.creativeDirection
        ? `${improved.creativeDirection}\n\n---\nCouncil improved. Previous: ${existing.creativeDirection.voiceoverScript}`
        : existing.creativeDirection.voiceoverScript,
    },
    compliance: {
      ...existing.compliance,
      approvalWarnings: [
        ...(existing.compliance.approvalWarnings ?? []),
        ...(council.changesMade?.length ? [`Council applied changes: ${council.changesMade.slice(0, 3).join("; ")}`] : []),
        ...(council.missingAssets?.length ? [`Missing assets noted: ${council.missingAssets.slice(0, 2).join("; ")}`] : []),
      ],
    },
    strategicRationale: {
      whyThisCampaign:
        summary.winningAngle ||
        council.winningAngle ||
        existing.strategicRationale?.whyThisCampaign ||
        "",
      buyerInsightUsed: existing.strategicRationale?.buyerInsightUsed || "",
      marketInsightUsed:
        summary.localMarketNotes ||
        existing.strategicRationale?.marketInsightUsed ||
        "",
      offerAngleUsed:
        improved.overview ||
        existing.strategicRationale?.offerAngleUsed ||
        "",
      creativeAngleUsed:
        improved.creativeDirection ||
        existing.strategicRationale?.creativeAngleUsed ||
        "",
      trustTriggerUsed: existing.strategicRationale?.trustTriggerUsed || "",
      objectionAddressed: existing.strategicRationale?.objectionAddressed || "",
      audienceRationale:
        summary.mediaBuyerReasoning ||
        existing.strategicRationale?.audienceRationale ||
        "",
      leadFormRationale:
        improved.leadForm ||
        existing.strategicRationale?.leadFormRationale ||
        "",
      followUpRationale:
        improved.ghlWorkflow ||
        existing.strategicRationale?.followUpRationale ||
        "",
    },
  };
}
