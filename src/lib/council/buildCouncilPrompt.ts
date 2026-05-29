// buildCouncilPrompt — constructs the Council prompt for Hermes.
// applyCouncilToDraft — merges Council improved draft into CampaignDraft.
// safeExtractJson — robust JSON extraction from raw Hermes output.

import type { CampaignDraft } from "@/lib/planStore";
import type { CreativeAsset } from "@/lib/creativeAssets";
import type { CouncilMode, CouncilResponse, CampaignImprovementPatch } from "./types";

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

// ─────────────────────────────────────────────────────────────
// safeExtractJson
// ─────────────────────────────────────────────────────────────
// Robust JSON extraction from raw Hermes output.
// Handles: raw JSON, markdown fences, leading/trailing text.
export function safeExtractJson(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;

  // 1. Strip markdown fences
  let s = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

  // 2. Try the stripped string as-is
  try { JSON.parse(s); return s; } catch { /* continue */ }

  // 3. Find the first { and last } and extract that range
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = s.slice(first, last + 1);
    try { JSON.parse(candidate); return candidate; } catch { /* continue */ }
  }

  // 4. Try the raw string without any stripping
  try { JSON.parse(raw); return raw; } catch { /* continue */ }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Prompt builder constants — kept plain-text to avoid VPS
// pattern validation that rejects JSON-like syntax in prompts.
// ─────────────────────────────────────────────────────────────

const SAFETY_HEADER = `VAULT CO CAMPAIGN STRATEGY TASK
Safety: Only improve drafts, rewrite copy, build campaign structures, create QA checklists, prepare approval summaries, create operator tasks.
Cannot: launch ads, change budgets, publish to Meta, push GHL, send emails, delete data.
All output is draft/approval-ready only. Campaign status stays PAUSED.`;

// Advisor descriptions in plain prose — no JSON syntax, no brackets
const COUNCIL_ROLES = `STRATEGIC ADVISORS — each gives an independent analysis:

FATAL FLAW ADVISOR: Find what could break this campaign. Weak assumptions, bad offers, unclear hooks, weak creative-copy match, compliance or funnel risks. Output: flaws, severity, fix required.

RIGHT PROBLEM ADVISOR: Are we solving the right problem? Is the bottleneck lead quality, offer, creative, follow-up, trust, or targeting? Output: actual problem, strategic correction.

UPSIDE ADVISOR: Highest-leverage opportunity. Strongest emotional or logical buying angle, proof, trust, urgency. Output: winning angle, strongest audience segment, best offer framing.

NORMAL PERSON ADVISOR: Would a real customer care? Flag confusing language, fake-sounding claims, generic copy. Output: plain-English rewrite suggestions, what would make them stop scrolling.

NEXT ACTION ADVISOR: Executable steps only. Output: immediate next steps, operator tasks, missing assets, timeline.

CREATIVE DIRECTOR: Analyze creative assets. Identify best visual angles for cold traffic vs retargeting. What copy fits, what to avoid, what missing asset would strengthen the campaign.

MEDIA BUYER: Campaign structure, Meta readiness, budget safety, audience logic, retargeting layer. Output: launch risks, targeting corrections.

COPY CHIEF: Rewrite hooks, primary text, headlines, CTAs, lead form intro. Avoid generic local filler. Tie copy to actual creative and actual client context. Output: ready-to-use copy blocks.

CRM GHL AGENT: Follow-up logic. Speed-to-lead, SMS timing, missed-call handling, STOP conditions. Output: workflow blueprint.

COMPLIANCE RISK: Claims, restricted wording, approval risks, policy issues. Output: what to soften before approval.

LOCAL MARKET: Market context used intelligently. Only use location when it adds trust, urgency, or local relevance. Avoid lazy city-name filler. Output: what resonates locally.

CHAIRMAN: Read all advisors. Resolve disagreements. Final verdict: ready, revise, rebuild, or reject. Output: winning strategy, required changes, approval readiness score 0-100, next operator actions.`;

const COUNCIL_MODE_INSTRUCTIONS: Record<CouncilMode, string> = {
  campaign_build: `Run a full council campaign build. Each advisor analyzes independently. Chairman makes the final call. Then rebuild an improved campaign draft based on the Chairman direction. Do NOT validate the existing draft. Pressure-test it. Find blind spots. Rebuild into something better.`,
  improve_and_apply_draft: `Improve and apply the draft. Full council debate. Chairman decides the winning direction. Then rebuild the complete improved campaign draft. Every section of improvedDraft must be written at full quality. No placeholders. No generic filler. Tie every piece of copy to the actual creative assets and actual client context. The adCopy field must contain ready-to-use primary text specific to this client, offer, market, and creative.`,
  campaign_qa: `Run a council campaign QA. Each advisor performs a pre-launch audit. Chairman gives final QA verdict and approval readiness score. Score each area: offer clarity, audience fit, creative-copy match, asset quality, lead form, retargeting, GHL readiness, budget safety, compliance, tracking, approval readiness.`,
  creative_review: `Run a council creative asset review. Focus entirely on the uploaded creative assets. Creative Director leads. Copy Chief provides exact copy for each asset. Media Buyer confirms placement fit.`,
  meta_push_readiness: `Run a council Meta push readiness check. Media Buyer leads. Check every Meta launch requirement. Output a structured Meta push payload draft with PAUSED status only. Include: campaign name, objective, buying type, ad sets, ads, lead form requirements, tracking requirements, validation warnings.`,
  offer_review: `Run a council offer review. Focus on the offer, value proposition, framing, and conversion mechanism. Normal Person, Upside Advisor, and Copy Chief lead. Chairman decides final offer direction.`,
  funnel_review: `Run a council funnel review. Analyze the full funnel: ad to lead form to GHL follow-up to booking. CRM Agent, Media Buyer, and Right Problem Advisor lead. Map every funnel stage and identify leaks.`,
  operator_task_review: `Run a council operator task review. Next Action Advisor leads. Create a prioritized task list with blockers vs required vs recommended. Include owner, priority, action, and what each task blocks.`,
  strategy_review: `Run a council strategy review. Question the entire campaign strategy. Right Problem Advisor and Chairman lead. Output: final strategic direction with specific corrections.`,
};

// ─────────────────────────────────────────────────────────────
// buildCouncilPrompt
// ─────────────────────────────────────────────────────────────
// Produces a plain-text prompt safe for the Hermes VPS.
// No JSON syntax in the prompt body — output format described in prose.
export function buildCouncilPrompt(ctx: CouncilContext, councilMode: CouncilMode): string {
  const lines: string[] = [];

  lines.push(SAFETY_HEADER);
  lines.push("");

  // Client
  if (ctx.client) {
    lines.push("CLIENT");
    lines.push(`Name: ${ctx.client.name}`);
    if (ctx.market || ctx.client.market) lines.push(`Market: ${ctx.market || ctx.client.market}`);
    if (ctx.budget || ctx.client.monthlyBudget) lines.push(`Budget: ${ctx.budget || ctx.client.monthlyBudget}`);
    if (ctx.client.services?.length) lines.push(`Services: ${ctx.client.services.join(", ")}`);
  }

  // Campaign parameters
  lines.push("\nCAMPAIGN PARAMETERS");
  if (ctx.goal) lines.push(`Goal: ${ctx.goal}`);
  if (ctx.service) lines.push(`Service: ${ctx.service}`);
  if (ctx.market) lines.push(`Market: ${ctx.market}`);
  if (ctx.budget) lines.push(`Budget: ${ctx.budget}`);

  // Campaign draft — trim aggressively to keep prompt concise
  if (ctx.displayPlan) {
    const p = ctx.displayPlan;
    lines.push("\nCURRENT CAMPAIGN DRAFT");
    lines.push(`Name: ${p.campaignName}`);
    lines.push(`Objective: ${p.metaStructure?.campaignObjective ?? ""}`);
    lines.push(`Campaign Type: ${p.metaStructure?.campaignType ?? ""}`);
    lines.push(`Audience: ${(p.metaStructure?.audience ?? "").slice(0, 200)}`);
    lines.push(`Budget Split: ${(p.metaStructure?.budgetSplit ?? "").slice(0, 150)}`);

    const texts = p.adCopy?.primaryTexts;
    if (Array.isArray(texts)) {
      texts.slice(0, 2).forEach((t, i) => {
        if (t) lines.push(`Primary Text ${i + 1}: ${String(t).slice(0, 200)}`);
      });
    }
    if (Array.isArray(p.adCopy?.headlines)) {
      lines.push(`Headlines: ${p.adCopy.headlines.slice(0, 3).join(" / ")}`);
    }
    if (p.adCopy?.cta) lines.push(`CTA: ${p.adCopy.cta}`);

    if (p.creativeDirection?.angle) lines.push(`Creative Angle: ${String(p.creativeDirection.angle).slice(0, 150)}`);
    if (p.creativeDirection?.hook) lines.push(`Hook: ${String(p.creativeDirection.hook).slice(0, 150)}`);

    if (p.leadForm?.introCopy) lines.push(`Lead Form Intro: ${String(p.leadForm.introCopy).slice(0, 150)}`);

    if (p.ghlWorkflow?.immediateSms) lines.push(`GHL Immediate SMS: ${String(p.ghlWorkflow.immediateSms).slice(0, 150)}`);

    if (p.compliance?.metaRisk) lines.push(`Compliance Risk: ${String(p.compliance.metaRisk).slice(0, 100)}`);
  } else {
    lines.push("\nCAMPAIGN DRAFT: Not yet generated. Build from scratch.");
  }

  // Creative assets — no storageUrl (may trigger VPS URL pattern validation)
  lines.push("\nCREATIVE ASSETS");
  if (ctx.selectedAssets && ctx.selectedAssets.length > 0) {
    ctx.selectedAssets.forEach((asset, i) => {
      lines.push(`Asset ${i + 1}: ${asset.fileName} (${asset.fileType === "video" ? "VIDEO" : "IMAGE"}, ${asset.assetType})`);
      lines.push(`  Approved: ${asset.approvedForAds ? "Yes" : "No"}`);
      if (asset.campaignUseCase) lines.push(`  Use: ${String(asset.campaignUseCase).slice(0, 100)}`);
      if (asset.notes) lines.push(`  Notes: ${String(asset.notes).slice(0, 150)}`);
      const analysis = ctx.assetAnalyses?.[asset.id];
      if (analysis?.visualSummary && analysis.visualSummary !== "Image not available for analysis") {
        lines.push(`  Vision: ${String(analysis.visualSummary).slice(0, 200)}`);
      }
      const note = ctx.assetNotes?.[asset.id];
      if (note) lines.push(`  Campaign Note: ${String(note).slice(0, 100)}`);
    });
  } else {
    lines.push("No creative assets uploaded.");
  }

  if (ctx.campaignNotes) {
    lines.push(`\nNOTES: ${String(ctx.campaignNotes).slice(0, 300)}`);
  }

  lines.push("");
  lines.push(COUNCIL_ROLES);

  lines.push(`\nTASK: ${COUNCIL_MODE_INSTRUCTIONS[councilMode]}`);

  // Output format — described in prose only, no JSON syntax in the prompt
  lines.push(`\nOUTPUT FORMAT:
Return ONLY valid JSON. No markdown fences. No text before or after the JSON.
Required top-level fields:
- finalVerdict: string, one of: ready, revise, rebuild, reject
- approvalReadinessScore: integer 0 to 100
- winningAngle: string describing the strongest campaign angle
- councilDebate: object with string fields for each advisor: fatalFlawAdvisor, rightProblemAdvisor, upsideAdvisor, normalPersonAdvisor, nextActionAdvisor, creativeDirectorAgent, mediaBuyerAgent, copyChiefAgent, crmGhlAgent, complianceRiskAgent, localMarketAgent, chairman
- councilSummary: object with string fields: winningAngle, creativeReasoning, mediaBuyerReasoning, copyReasoning, crmReasoning, complianceNotes, localMarketNotes
- assetAnalysis: object with photos array and videos array
- improvedDraft: object with string fields: overview, metaStructure, adCopy, leadForm, ghlWorkflow, creativeDirection, compliance, optimization
- changesMade: array of strings
- missingAssets: array of strings
- nextOperatorTasks: array of strings`);

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Safe field helpers — coerce unexpected shapes from AI output
// ─────────────────────────────────────────────────────────────

function safeStr(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  return String(v).slice(0, 2000);
}

function safeStrArray(v: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(v)) return v.map((x) => safeStr(x));
  if (typeof v === "string" && v.trim()) return [v];
  return fallback;
}

// ─────────────────────────────────────────────────────────────
// applyCouncilToDraft
// ─────────────────────────────────────────────────────────────
// Completely defensive — never throws. Returns the original draft
// if anything goes wrong. Normalizes all field shapes.
export function applyCouncilToDraft(
  existing: CampaignDraft,
  council: CouncilResponse
): CampaignDraft {
  try {
    const now = new Date().toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });

    const improved = council.improvedDraft ?? {};
    const summary = council.councilSummary ?? {};

    // adCopy — improved.adCopy is a string; use as primaryTexts[0]
    const existingPrimaryTexts = Array.isArray(existing.adCopy?.primaryTexts)
      ? existing.adCopy.primaryTexts
      : [""];
    const improvedPrimaryText = safeStr(improved.adCopy, existingPrimaryTexts[0]);
    const newPrimaryTexts = [
      improvedPrimaryText,
      safeStr(existingPrimaryTexts[1], ""),
      safeStr(existingPrimaryTexts[2], ""),
    ];

    // creativeDirection
    const existingAngle = safeStr(existing.creativeDirection?.angle, "");
    const existingHook = safeStr(existing.creativeDirection?.hook, "");
    const improvedAngle = safeStr(council.winningAngle, "") ||
      safeStr(improved.creativeDirection, "").split("\n")[0] ||
      existingAngle;
    const improvedHook = safeStr(council.winningAngle, "") || existingHook;

    // compliance — only append warnings, don't replace existing
    const existingWarnings = Array.isArray(existing.compliance?.approvalWarnings)
      ? existing.compliance.approvalWarnings
      : [];
    const councilChanges = Array.isArray(council.changesMade) ? council.changesMade : [];
    const councilMissing = Array.isArray(council.missingAssets) ? council.missingAssets : [];
    const newWarnings = [
      ...existingWarnings,
      ...(councilChanges.length ? [`Council improvements applied: ${councilChanges.slice(0, 3).join("; ")}`] : []),
      ...(councilMissing.length ? [`Missing assets: ${councilMissing.slice(0, 2).join("; ")}`] : []),
    ];

    // strategicRationale — access existing fields via optional chaining to avoid {} type issues
    const er = existing.strategicRationale;
    const newRationale = {
      whyThisCampaign: safeStr(summary.winningAngle) || safeStr(council.winningAngle) || safeStr(er?.whyThisCampaign),
      buyerInsightUsed: safeStr(er?.buyerInsightUsed),
      marketInsightUsed: safeStr(summary.localMarketNotes) || safeStr(er?.marketInsightUsed),
      offerAngleUsed: safeStr(improved.overview) || safeStr(er?.offerAngleUsed),
      creativeAngleUsed: safeStr(improved.creativeDirection) || safeStr(er?.creativeAngleUsed),
      trustTriggerUsed: safeStr(er?.trustTriggerUsed),
      objectionAddressed: safeStr(er?.objectionAddressed),
      audienceRationale: safeStr(summary.mediaBuyerReasoning) || safeStr(er?.audienceRationale),
      leadFormRationale: safeStr(improved.leadForm) || safeStr(er?.leadFormRationale),
      followUpRationale: safeStr(improved.ghlWorkflow) || safeStr(er?.followUpRationale),
    };

    // Build existing name safely
    const existingName = safeStr(existing.campaignName, "Campaign");
    const newName = existingName.startsWith("[Council]") ? existingName : `[Council] ${existingName}`;

    return {
      ...existing,
      campaignName: newName,
      status: "needs_review",
      updatedAt: now,
      adCopy: {
        ...existing.adCopy,
        primaryTexts: newPrimaryTexts,
        headlines: safeStrArray(existing.adCopy?.headlines),
        descriptions: safeStrArray(existing.adCopy?.descriptions),
        cta: safeStr(existing.adCopy?.cta),
      },
      metaStructure: {
        ...existing.metaStructure,
        adSetNames: safeStrArray(existing.metaStructure?.adSetNames),
        placements: safeStrArray(existing.metaStructure?.placements),
      },
      creativeDirection: {
        ...existing.creativeDirection,
        angle: improvedAngle,
        hook: improvedHook,
        shotList: safeStrArray(existing.creativeDirection?.shotList),
        textOverlays: safeStrArray(existing.creativeDirection?.textOverlays),
        recommendedPlacements: safeStrArray(existing.creativeDirection?.recommendedPlacements),
        voiceoverScript: improved.creativeDirection
          ? `${safeStr(improved.creativeDirection).slice(0, 500)}\n\n---\nPrevious: ${safeStr(existing.creativeDirection?.voiceoverScript).slice(0, 200)}`
          : safeStr(existing.creativeDirection?.voiceoverScript),
      },
      compliance: {
        ...existing.compliance,
        disallowedPhrases: safeStrArray(existing.compliance?.disallowedPhrases),
        approvalWarnings: newWarnings,
      },
      optimization: {
        ...existing.optimization,
        humanApprovalTriggers: safeStrArray(existing.optimization?.humanApprovalTriggers),
      },
      ghlWorkflow: {
        ...existing.ghlWorkflow,
        steps: safeStrArray(existing.ghlWorkflow?.steps),
        tags: safeStrArray(existing.ghlWorkflow?.tags),
      },
      leadForm: {
        ...existing.leadForm,
        qualificationQuestions: safeStrArray(existing.leadForm?.qualificationQuestions),
        contactFields: safeStrArray(existing.leadForm?.contactFields),
      },
      strategicRationale: newRationale,
      // Preserve adVariations only if it's a real array
      adVariations: Array.isArray(existing.adVariations) ? existing.adVariations : undefined,
    };
  } catch (err) {
    // Never throw — return original draft if anything goes wrong
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Council] applyCouncilToDraft failed, preserving original:", err);
    }
    return existing;
  }
}

// ─────────────────────────────────────────────────────────────
// buildImprovementPatchPrompt
// ─────────────────────────────────────────────────────────────
// Builds a focused, plain-text prompt for the hidden pipeline refinement step.
// Covers all major campaign sections. No JSON syntax in prompt body.
export function buildImprovementPatchPrompt(ctx: CouncilContext): string {
  const lines: string[] = [];

  lines.push("CAMPAIGN COMPREHENSIVE IMPROVEMENT TASK");
  lines.push("Improve all major campaign sections. Return a comprehensive improvement patch.");
  lines.push("Safety: Only improve copy and strategy. Cannot launch ads, change budgets, or push to Meta.");
  lines.push("");

  if (ctx.client) {
    lines.push(`Client: ${ctx.client.name}`);
    if (ctx.market || ctx.client.market) lines.push(`Market: ${ctx.market || ctx.client.market}`);
    if (ctx.budget || ctx.client.monthlyBudget) lines.push(`Budget: ${ctx.budget || ctx.client.monthlyBudget}`);
    if (ctx.client.services?.length) lines.push(`Services: ${ctx.client.services.slice(0, 3).join(", ")}`);
  }
  lines.push(`Goal: ${ctx.goal ?? ""}`);
  lines.push(`Service: ${ctx.service ?? ""}`);

  if (ctx.displayPlan) {
    const p = ctx.displayPlan;
    lines.push("");
    lines.push("CURRENT CAMPAIGN DRAFT");
    const texts = Array.isArray(p.adCopy?.primaryTexts) ? p.adCopy.primaryTexts : [];
    if (texts[0]) lines.push(`Primary Text 1: ${String(texts[0]).slice(0, 200)}`);
    if (texts[1]) lines.push(`Primary Text 2: ${String(texts[1]).slice(0, 180)}`);
    const heads = Array.isArray(p.adCopy?.headlines) ? p.adCopy.headlines : [];
    if (heads.length) lines.push(`Headlines: ${heads.slice(0, 3).join(" / ")}`);
    if (p.adCopy?.cta) lines.push(`CTA: ${String(p.adCopy.cta).slice(0, 50)}`);
    if (p.creativeDirection?.angle) lines.push(`Creative Angle: ${String(p.creativeDirection.angle).slice(0, 120)}`);
    if (p.creativeDirection?.hook) lines.push(`Hook: ${String(p.creativeDirection.hook).slice(0, 100)}`);
    if (p.leadForm?.introCopy) lines.push(`Lead Form Intro: ${String(p.leadForm.introCopy).slice(0, 120)}`);
    if (p.compliance?.metaRisk) lines.push(`Compliance: ${String(p.compliance.metaRisk).slice(0, 80)}`);
    if (p.metaStructure?.campaignObjective) lines.push(`Objective: ${p.metaStructure.campaignObjective}`);
    const adSetNames = Array.isArray(p.metaStructure?.adSetNames) ? p.metaStructure.adSetNames : [];
    if (adSetNames.length) lines.push(`Ad Sets: ${adSetNames.join(", ")}`);
    if (p.ghlWorkflow?.immediateSms) lines.push(`Immediate SMS: ${String(p.ghlWorkflow.immediateSms).slice(0, 100)}`);
    if (p.optimization?.budgetScalingRule) lines.push(`Scaling Rule: ${String(p.optimization.budgetScalingRule).slice(0, 80)}`);
    if (p.buyerPsychologyUsed?.buyerInsight) lines.push(`Buyer Insight: ${String(p.buyerPsychologyUsed.buyerInsight).slice(0, 100)}`);
  }

  if (ctx.selectedAssets && ctx.selectedAssets.length > 0) {
    lines.push("");
    lines.push("CREATIVE ASSETS");
    ctx.selectedAssets.slice(0, 4).forEach((asset, i) => {
      lines.push(`Asset ${i + 1}: ${asset.fileName} (${asset.fileType === "video" ? "VIDEO" : "IMAGE"}, ${asset.assetType})`);
      if (asset.notes) lines.push(`  Notes: ${String(asset.notes).slice(0, 100)}`);
      const analysis = ctx.assetAnalyses?.[asset.id];
      if (analysis?.visualSummary && analysis.visualSummary !== "Image not available for analysis") {
        lines.push(`  Vision: ${String(analysis.visualSummary).slice(0, 150)}`);
      }
      const note = ctx.assetNotes?.[asset.id];
      if (note) lines.push(`  Campaign Note: ${String(note).slice(0, 80)}`);
    });
  }

  lines.push("");
  lines.push("SECTIONS TO IMPROVE:");
  lines.push("Ad Copy: Rewrite primary texts (specific to assets, no generic city filler), headlines, CTA, add hook bank variants, and retargeting copy.");
  lines.push("Creative Direction: Best campaign angle, hook, shot list, text overlays, voiceover direction note.");
  lines.push("Buyer Psychology: Core motivation, urgency trigger, trust triggers, objections addressed, hook rationale, CTA rationale.");
  lines.push("Market Research: Market summary, competitor angle, audience rationale, location rationale, seasonality note.");
  lines.push("Asset Matrix: For each creative asset, write specific angle, primary text, headline, CTA, best ad set assignment, temperature (cold/warm/hot), and reason.");
  lines.push("Lead Form: Stronger intro copy, qualification questions, improved thank-you copy.");
  lines.push("GHL Workflow: Workflow summary, follow-up steps, immediate SMS draft (speed-to-lead), GHL tags.");
  lines.push("Compliance: Compliance warnings, disallowed phrases to remove, required disclaimers to add.");
  lines.push("Optimization: KPIs to track, scaling rules, kill/pause rules, human approval triggers.");
  lines.push("Meta Push Readiness: Status (not_ready, needs_review, or ready_for_validation), missing fields, payload notes, validation warnings.");
  lines.push("");
  lines.push("OUTPUT FORMAT");
  lines.push("Return valid JSON only. No markdown fences. No text before or after the JSON.");
  lines.push("Top-level fields: readinessScore (0-100), winningAngle, campaignName, primaryTexts (array), headlines (array), descriptions (array), cta, hookBank (array), retargetingCopy (array), creativeDirectionSummary, shotList (array), textOverlays (array), voiceoverNote, buyerPsychology (object: insight, urgencyTrigger, trustTriggers array, objections array, hookRationale, ctaRationale), marketResearch (object: summary, competitorAngle, audienceRationale, locationRationale, seasonalityNote), assetMatrix (array of objects: assetId, assetName, angle, primaryText1, headline1, cta, adSet, adSetTemperature, reason, warnings array), leadFormIntro, qualificationQuestions (array), thankYouCopy, ghlWorkflowSummary, followUpSteps (array), immediateSmsDraft, ghlTags (array), complianceWarnings (array), disallowedPhrases (array), requiredDisclaimers (array), optimizationNotes (array), kpis (array), scalingRules (array), killRules (array), humanApprovalTriggers (array), metaPushReadiness (object: status, missingFields array, payloadNotes array, validationWarnings array), changesMade (array), missingAssets (array), nextOperatorTasks (array).");

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// safeExtractImprovementPatch
// ─────────────────────────────────────────────────────────────
// Robustly parses Hermes output into a CampaignImprovementPatch.
// Validates every field independently — bad fields are skipped.
// Never throws. Returns null if unusable.
export function safeExtractImprovementPatch(raw: string): CampaignImprovementPatch | null {
  const jsonStr = safeExtractJson(raw);
  if (!jsonStr) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Patch] safeExtractImprovementPatch: no JSON found. Raw length:", raw?.length ?? 0);
    }
    return null;
  }

  let parsed: Record<string, unknown>;
  try {
    const p = JSON.parse(jsonStr);
    if (typeof p !== "object" || p === null || Array.isArray(p)) return null;
    parsed = p as Record<string, unknown>;
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Patch] safeExtractImprovementPatch: JSON.parse failed");
    }
    return null;
  }

  const patch: CampaignImprovementPatch = {};
  const applied: string[] = [];
  const skipped: string[] = [];

  function tryStr(field: string, maxLen = 1000): string | undefined {
    const v = parsed[field];
    if (typeof v === "string" && v.trim()) {
      applied.push(field);
      return v.trim().slice(0, maxLen);
    }
    if (v != null) skipped.push(field);
    return undefined;
  }

  function tryStrArr(field: string, maxItems = 10, maxLen = 500): string[] | undefined {
    const v = parsed[field];
    if (Array.isArray(v)) {
      const result = v
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .slice(0, maxItems)
        .map((x) => x.trim().slice(0, maxLen));
      if (result.length > 0) { applied.push(field); return result; }
    } else if (typeof v === "string" && v.trim()) {
      applied.push(field);
      return [v.trim().slice(0, maxLen)];
    }
    if (v != null) skipped.push(field);
    return undefined;
  }

  function tryNestedObj(field: string): Record<string, string | string[]> | undefined {
    const v = parsed[field];
    if (typeof v !== "object" || v === null || Array.isArray(v)) {
      if (v != null) skipped.push(field);
      return undefined;
    }
    const obj = v as Record<string, unknown>;
    const result: Record<string, string | string[]> = {};
    let hasData = false;
    for (const [k, val] of Object.entries(obj)) {
      if (typeof val === "string" && val.trim()) {
        result[k] = val.trim().slice(0, 600);
        hasData = true;
      } else if (Array.isArray(val)) {
        const arr = val
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .slice(0, 10)
          .map((x) => x.trim().slice(0, 400));
        if (arr.length) { result[k] = arr; hasData = true; }
      }
    }
    if (hasData) { applied.push(field); return result; }
    return undefined;
  }

  try {
    // ── Core ──────────────────────────────────────────────────────
    const scoreRaw = parsed["readinessScore"];
    if (typeof scoreRaw === "number" && !isNaN(scoreRaw)) {
      patch.readinessScore = Math.max(0, Math.min(100, Math.round(scoreRaw)));
      applied.push("readinessScore");
    }
    const wa = tryStr("winningAngle", 500); if (wa) patch.winningAngle = wa;
    const cn = tryStr("campaignName", 120); if (cn) patch.campaignName = cn;

    // ── Ad Copy ───────────────────────────────────────────────────
    const pt = tryStrArr("primaryTexts", 3, 800); if (pt) patch.primaryTexts = pt;
    const hl = tryStrArr("headlines", 5, 120); if (hl) patch.headlines = hl;
    const ds = tryStrArr("descriptions", 5, 200); if (ds) patch.descriptions = ds;
    const cta = tryStr("cta", 80); if (cta) patch.cta = cta;
    const hb = tryStrArr("hookBank", 5, 200); if (hb) patch.hookBank = hb;
    const rc = tryStrArr("retargetingCopy", 3, 500); if (rc) patch.retargetingCopy = rc;

    // ── Creative Direction ─────────────────────────────────────────
    const cd = tryStr("creativeDirectionSummary", 500); if (cd) patch.creativeDirectionSummary = cd;
    const sl = tryStrArr("shotList", 10, 200); if (sl) patch.shotList = sl;
    const to = tryStrArr("textOverlays", 8, 100); if (to) patch.textOverlays = to;
    const vn = tryStr("voiceoverNote", 400); if (vn) patch.voiceoverNote = vn;

    // ── Lead Form ─────────────────────────────────────────────────
    const lfi = tryStr("leadFormIntro", 600); if (lfi) patch.leadFormIntro = lfi;
    const qq = tryStrArr("qualificationQuestions", 5, 200); if (qq) patch.qualificationQuestions = qq;
    const ty = tryStr("thankYouCopy", 300); if (ty) patch.thankYouCopy = ty;

    // ── GHL Workflow ───────────────────────────────────────────────
    const ghl = tryStr("ghlWorkflowSummary", 500); if (ghl) patch.ghlWorkflowSummary = ghl;
    const fs = tryStrArr("followUpSteps", 10, 300); if (fs) patch.followUpSteps = fs;
    const sms = tryStr("immediateSmsDraft", 300); if (sms) patch.immediateSmsDraft = sms;
    const gt = tryStrArr("ghlTags", 10, 60); if (gt) patch.ghlTags = gt;

    // ── Compliance ────────────────────────────────────────────────
    const cw = tryStrArr("complianceWarnings", 8, 300); if (cw) patch.complianceWarnings = cw;
    const dp = tryStrArr("disallowedPhrases", 10, 100); if (dp) patch.disallowedPhrases = dp;
    const rd = tryStrArr("requiredDisclaimers", 5, 300); if (rd) patch.requiredDisclaimers = rd;

    // ── Optimization ──────────────────────────────────────────────
    const on = tryStrArr("optimizationNotes", 5, 300); if (on) patch.optimizationNotes = on;
    const kpi = tryStrArr("kpis", 8, 200); if (kpi) patch.kpis = kpi;
    const sr = tryStrArr("scalingRules", 5, 300); if (sr) patch.scalingRules = sr;
    const kr = tryStrArr("killRules", 5, 300); if (kr) patch.killRules = kr;
    const hat = tryStrArr("humanApprovalTriggers", 8, 200); if (hat) patch.humanApprovalTriggers = hat;

    // ── Misc ──────────────────────────────────────────────────────
    const ma = tryStrArr("missingAssets", 8, 200); if (ma) patch.missingAssets = ma;
    const nt = tryStrArr("nextOperatorTasks", 8, 300); if (nt) patch.nextOperatorTasks = nt;
    const cm = tryStrArr("changesMade", 10, 200); if (cm) patch.changesMade = cm;

    // ── Nested: Buyer Psychology ───────────────────────────────────
    const bpRaw = tryNestedObj("buyerPsychology");
    if (bpRaw) {
      const bp: CampaignImprovementPatch["buyerPsychology"] = {};
      if (typeof bpRaw.insight === "string") bp.insight = bpRaw.insight;
      if (typeof bpRaw.urgencyTrigger === "string") bp.urgencyTrigger = bpRaw.urgencyTrigger;
      if (Array.isArray(bpRaw.trustTriggers)) bp.trustTriggers = bpRaw.trustTriggers as string[];
      if (Array.isArray(bpRaw.objections)) bp.objections = bpRaw.objections as string[];
      if (typeof bpRaw.hookRationale === "string") bp.hookRationale = bpRaw.hookRationale;
      if (typeof bpRaw.ctaRationale === "string") bp.ctaRationale = bpRaw.ctaRationale;
      patch.buyerPsychology = bp;
    }

    // ── Nested: Market Research ────────────────────────────────────
    const mrRaw = tryNestedObj("marketResearch");
    if (mrRaw) {
      const mr: CampaignImprovementPatch["marketResearch"] = {};
      if (typeof mrRaw.summary === "string") mr.summary = mrRaw.summary;
      if (typeof mrRaw.competitorAngle === "string") mr.competitorAngle = mrRaw.competitorAngle;
      if (typeof mrRaw.audienceRationale === "string") mr.audienceRationale = mrRaw.audienceRationale;
      if (typeof mrRaw.locationRationale === "string") mr.locationRationale = mrRaw.locationRationale;
      if (typeof mrRaw.seasonalityNote === "string") mr.seasonalityNote = mrRaw.seasonalityNote;
      patch.marketResearch = mr;
    }

    // ── Array of objects: Asset Matrix ─────────────────────────────
    const amRaw = parsed["assetMatrix"];
    if (Array.isArray(amRaw) && amRaw.length > 0) {
      const matrix: NonNullable<CampaignImprovementPatch["assetMatrix"]> = [];
      for (const item of amRaw) {
        if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
        const obj = item as Record<string, unknown>;
        const entry: NonNullable<CampaignImprovementPatch["assetMatrix"]>[number] = {};
        if (typeof obj.assetId === "string" && obj.assetId.trim()) entry.assetId = obj.assetId.trim();
        if (typeof obj.assetName === "string" && obj.assetName.trim()) entry.assetName = obj.assetName.trim().slice(0, 120);
        if (typeof obj.angle === "string" && obj.angle.trim()) entry.angle = obj.angle.trim().slice(0, 300);
        if (typeof obj.primaryText1 === "string" && obj.primaryText1.trim()) entry.primaryText1 = obj.primaryText1.trim().slice(0, 800);
        if (typeof obj.headline1 === "string" && obj.headline1.trim()) entry.headline1 = obj.headline1.trim().slice(0, 120);
        if (typeof obj.cta === "string" && obj.cta.trim()) entry.cta = obj.cta.trim().slice(0, 60);
        if (typeof obj.adSet === "string" && obj.adSet.trim()) entry.adSet = obj.adSet.trim().slice(0, 100);
        const temp = obj.adSetTemperature;
        if (temp === "cold" || temp === "warm" || temp === "hot") entry.adSetTemperature = temp;
        if (typeof obj.reason === "string" && obj.reason.trim()) entry.reason = obj.reason.trim().slice(0, 400);
        if (Array.isArray(obj.warnings)) {
          entry.warnings = (obj.warnings as unknown[])
            .filter((w): w is string => typeof w === "string" && w.trim().length > 0)
            .slice(0, 5);
        }
        if (entry.assetName || entry.assetId || entry.primaryText1) matrix.push(entry);
      }
      if (matrix.length > 0) { patch.assetMatrix = matrix; applied.push("assetMatrix"); }
    }

    // ── Nested: Meta Push Readiness ────────────────────────────────
    const mprRaw = parsed["metaPushReadiness"];
    if (typeof mprRaw === "object" && mprRaw !== null && !Array.isArray(mprRaw)) {
      const obj = mprRaw as Record<string, unknown>;
      const mpr: CampaignImprovementPatch["metaPushReadiness"] = {};
      const status = obj.status;
      if (status === "not_ready" || status === "needs_review" || status === "ready_for_validation") {
        mpr.status = status;
      }
      if (Array.isArray(obj.missingFields)) {
        mpr.missingFields = (obj.missingFields as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 10);
      }
      if (Array.isArray(obj.payloadNotes)) {
        mpr.payloadNotes = (obj.payloadNotes as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 10);
      }
      if (Array.isArray(obj.validationWarnings)) {
        mpr.validationWarnings = (obj.validationWarnings as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 10);
      }
      if (mpr.status || mpr.missingFields?.length || mpr.payloadNotes?.length) {
        patch.metaPushReadiness = mpr;
        applied.push("metaPushReadiness");
      }
    }

  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Patch] field extraction error:", err);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[Patch] applied:", applied.join(", "));
    if (skipped.length) console.warn("[Patch] skipped (wrong type):", skipped.join(", "));
  }

  const usable = !!(patch.winningAngle || (patch.primaryTexts && patch.primaryTexts.length > 0) || patch.readinessScore);
  return usable ? patch : null;
}

// ─────────────────────────────────────────────────────────────
// applyImprovementPatchToDraft
// ─────────────────────────────────────────────────────────────
// Merges a CampaignImprovementPatch into an existing valid CampaignDraft.
// Every section is applied only if the patch provides valid data.
// Never throws — returns original on any error.
export function applyImprovementPatchToDraft(
  original: CampaignDraft,
  patch: CampaignImprovementPatch
): CampaignDraft {
  try {
    const now = new Date().toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });

    // ── adCopy ─────────────────────────────────────────────────────
    const existingPT = Array.isArray(original.adCopy?.primaryTexts) ? original.adCopy.primaryTexts : [""];
    const patchPT = patch.primaryTexts;
    const newPrimaryTexts = (patchPT && patchPT.length > 0)
      ? [patchPT[0] ?? existingPT[0] ?? "", patchPT[1] ?? existingPT[1] ?? "", patchPT[2] ?? existingPT[2] ?? ""].filter(Boolean)
      : existingPT;

    const existingHL = Array.isArray(original.adCopy?.headlines) ? original.adCopy.headlines : [];
    const newHeadlines = (patch.headlines && patch.headlines.length > 0) ? patch.headlines : existingHL;

    const existingDS = Array.isArray(original.adCopy?.descriptions) ? original.adCopy.descriptions : [];
    const newDescriptions = (patch.descriptions && patch.descriptions.length > 0) ? patch.descriptions : existingDS;

    const newCta = (patch.cta && patch.cta.trim()) ? patch.cta : (original.adCopy?.cta ?? "");

    // ── creativeDirection ─────────────────────────────────────────
    const existingSL = Array.isArray(original.creativeDirection?.shotList) ? original.creativeDirection.shotList : [];
    const newShotList = (patch.shotList && patch.shotList.length > 0) ? patch.shotList : existingSL;

    const existingTO = Array.isArray(original.creativeDirection?.textOverlays) ? original.creativeDirection.textOverlays : [];
    const newTextOverlays = (patch.textOverlays && patch.textOverlays.length > 0) ? patch.textOverlays : existingTO;

    const newAngle = (patch.winningAngle && patch.winningAngle.trim())
      ? patch.winningAngle : (original.creativeDirection?.angle ?? "");
    const newHook = (patch.winningAngle && patch.winningAngle.trim())
      ? patch.winningAngle : (original.creativeDirection?.hook ?? "");

    const existingVoiceover = original.creativeDirection?.voiceoverScript ?? "";
    const newVoiceover = (patch.voiceoverNote && patch.voiceoverNote.trim())
      ? (existingVoiceover ? `${patch.voiceoverNote}\n\n---\n${existingVoiceover.slice(0, 200)}` : patch.voiceoverNote)
      : existingVoiceover;

    // ── leadForm ──────────────────────────────────────────────────
    const newLeadFormIntro = (patch.leadFormIntro && patch.leadFormIntro.trim())
      ? patch.leadFormIntro : (original.leadForm?.introCopy ?? "");

    const existingQQ = Array.isArray(original.leadForm?.qualificationQuestions) ? original.leadForm.qualificationQuestions : [];
    const newQQ = (patch.qualificationQuestions && patch.qualificationQuestions.length > 0)
      ? patch.qualificationQuestions : existingQQ;

    const newThankYou = (patch.thankYouCopy && patch.thankYouCopy.trim())
      ? patch.thankYouCopy : (original.leadForm?.thankYouCopy ?? "");

    // ── ghlWorkflow ───────────────────────────────────────────────
    const existingSteps = Array.isArray(original.ghlWorkflow?.steps) ? original.ghlWorkflow.steps : [];
    const newSteps = (patch.followUpSteps && patch.followUpSteps.length > 0) ? patch.followUpSteps : existingSteps;

    const newImmediateSms = (patch.immediateSmsDraft && patch.immediateSmsDraft.trim())
      ? patch.immediateSmsDraft : (original.ghlWorkflow?.immediateSms ?? "");

    const existingTags = Array.isArray(original.ghlWorkflow?.tags) ? original.ghlWorkflow.tags : [];
    const newTags = (patch.ghlTags && patch.ghlTags.length > 0) ? patch.ghlTags : existingTags;

    // ── compliance — append, never replace ────────────────────────
    const existingWarnings = Array.isArray(original.compliance?.approvalWarnings) ? original.compliance.approvalWarnings : [];
    const patchWarnings = [
      ...(Array.isArray(patch.complianceWarnings) ? patch.complianceWarnings : []),
      ...(Array.isArray(patch.requiredDisclaimers) ? patch.requiredDisclaimers : []),
    ];
    const newWarnings = [...existingWarnings, ...patchWarnings.filter((w) => !existingWarnings.includes(w))];

    const existingDisallowed = Array.isArray(original.compliance?.disallowedPhrases) ? original.compliance.disallowedPhrases : [];
    const patchDisallowed = Array.isArray(patch.disallowedPhrases) ? patch.disallowedPhrases : [];
    const newDisallowed = [...existingDisallowed, ...patchDisallowed.filter((d) => !existingDisallowed.includes(d))];

    // ── optimization ──────────────────────────────────────────────
    const existingTriggers = Array.isArray(original.optimization?.humanApprovalTriggers) ? original.optimization.humanApprovalTriggers : [];
    const patchTriggers = [
      ...(Array.isArray(patch.humanApprovalTriggers) ? patch.humanApprovalTriggers : []),
      ...(Array.isArray(patch.kpis) ? patch.kpis.slice(0, 3).map(k => `KPI: ${k}`) : []),
    ];
    const newTriggers = [...existingTriggers, ...patchTriggers.filter((t) => !existingTriggers.includes(t))];

    const newScalingRule = (patch.scalingRules && patch.scalingRules.length > 0)
      ? patch.scalingRules.join("; ").slice(0, 300) : (original.optimization?.budgetScalingRule ?? "");

    const newPauseRule = (patch.killRules && patch.killRules.length > 0)
      ? patch.killRules.join("; ").slice(0, 300) : (original.optimization?.pauseRule ?? "");

    // ── buyerPsychologyUsed ───────────────────────────────────────
    const bp = patch.buyerPsychology;
    const existingBP = original.buyerPsychologyUsed;
    const newBP = bp ? {
      buyerInsight: (bp.insight && bp.insight.trim()) ? bp.insight : (existingBP?.buyerInsight ?? ""),
      urgencyTrigger: (bp.urgencyTrigger && bp.urgencyTrigger.trim()) ? bp.urgencyTrigger : (existingBP?.urgencyTrigger ?? ""),
      trustTriggerUsed: (Array.isArray(bp.trustTriggers) && bp.trustTriggers.length > 0)
        ? bp.trustTriggers.join("; ") : (existingBP?.trustTriggerUsed ?? ""),
      objectionAddressed: (Array.isArray(bp.objections) && bp.objections.length > 0)
        ? bp.objections.join("; ") : (existingBP?.objectionAddressed ?? ""),
      hookRationale: (bp.hookRationale && bp.hookRationale.trim()) ? bp.hookRationale : (existingBP?.hookRationale ?? ""),
      ctaRationale: (bp.ctaRationale && bp.ctaRationale.trim()) ? bp.ctaRationale : (existingBP?.ctaRationale ?? ""),
    } : existingBP;

    // ── marketResearchUsed ────────────────────────────────────────
    const mr = patch.marketResearch;
    const existingMR = original.marketResearchUsed;
    const newMR = mr ? {
      marketSummary: (mr.summary && mr.summary.trim()) ? mr.summary : (existingMR?.marketSummary ?? ""),
      competitorAngle: (mr.competitorAngle && mr.competitorAngle.trim()) ? mr.competitorAngle : (existingMR?.competitorAngle ?? ""),
      audienceRationale: (mr.audienceRationale && mr.audienceRationale.trim()) ? mr.audienceRationale : (existingMR?.audienceRationale ?? ""),
      locationRationale: (mr.locationRationale && mr.locationRationale.trim()) ? mr.locationRationale : (existingMR?.locationRationale ?? ""),
      seasonalityNote: (mr.seasonalityNote && mr.seasonalityNote.trim()) ? mr.seasonalityNote : (existingMR?.seasonalityNote ?? ""),
    } : existingMR;

    // ── strategicRationale ────────────────────────────────────────
    const er = original.strategicRationale;
    const newRationale = {
      whyThisCampaign: (patch.winningAngle && patch.winningAngle.trim()) ? patch.winningAngle : (er?.whyThisCampaign ?? ""),
      buyerInsightUsed: (bp?.insight && bp.insight.trim()) ? bp.insight : (er?.buyerInsightUsed ?? ""),
      marketInsightUsed: (mr?.summary && mr.summary.trim()) ? mr.summary : (er?.marketInsightUsed ?? ""),
      offerAngleUsed: (patch.winningAngle && patch.winningAngle.trim()) ? patch.winningAngle : (er?.offerAngleUsed ?? ""),
      creativeAngleUsed: (patch.creativeDirectionSummary && patch.creativeDirectionSummary.trim())
        ? patch.creativeDirectionSummary : (er?.creativeAngleUsed ?? ""),
      trustTriggerUsed: (Array.isArray(bp?.trustTriggers) && bp.trustTriggers.length > 0)
        ? bp.trustTriggers[0] : (er?.trustTriggerUsed ?? ""),
      objectionAddressed: (Array.isArray(bp?.objections) && bp.objections.length > 0)
        ? bp.objections[0] : (er?.objectionAddressed ?? ""),
      audienceRationale: (mr?.audienceRationale && mr.audienceRationale.trim()) ? mr.audienceRationale : (er?.audienceRationale ?? ""),
      leadFormRationale: (patch.leadFormIntro && patch.leadFormIntro.trim())
        ? `Improved intro: ${patch.leadFormIntro.slice(0, 150)}` : (er?.leadFormRationale ?? ""),
      followUpRationale: (patch.ghlWorkflowSummary && patch.ghlWorkflowSummary.trim())
        ? patch.ghlWorkflowSummary : (er?.followUpRationale ?? ""),
    };

    // ── adVariations (Asset Matrix) ───────────────────────────────
    // Find and update matching variations by assetId or fileName
    const existingVariations = Array.isArray(original.adVariations) ? original.adVariations : undefined;
    let newVariations = existingVariations;
    const assetMatrixPatch = patch.assetMatrix;
    if (assetMatrixPatch && assetMatrixPatch.length > 0 && existingVariations && existingVariations.length > 0) {
      newVariations = existingVariations.map((existing) => {
        const match = assetMatrixPatch.find((p) =>
          (p.assetId && p.assetId === existing.assetId) ||
          (p.assetName && existing.fileName && (
            p.assetName === existing.fileName ||
            existing.fileName.toLowerCase().includes(p.assetName.toLowerCase().split(".")[0]) ||
            p.assetName.toLowerCase().includes(existing.fileName.toLowerCase().split(".")[0])
          ))
        );
        if (!match) return existing;
        return {
          ...existing,
          creativeAngle: (match.angle && match.angle.trim()) ? match.angle : existing.creativeAngle,
          primaryText1: (match.primaryText1 && match.primaryText1.trim()) ? match.primaryText1 : existing.primaryText1,
          headline1: (match.headline1 && match.headline1.trim()) ? match.headline1 : existing.headline1,
          cta: (match.cta && match.cta.trim()) ? match.cta : existing.cta,
          adSetAssignment: (match.adSet && match.adSet.trim()) ? match.adSet : existing.adSetAssignment,
          adSetAudienceTemperature: match.adSetTemperature ?? existing.adSetAudienceTemperature,
          whyThisCopyMatchesCreative: (match.reason && match.reason.trim()) ? match.reason : existing.whyThisCopyMatchesCreative,
        };
      });
    }

    // ── campaignName ──────────────────────────────────────────────
    const existingName = original.campaignName ?? "";
    const newName = (patch.campaignName && patch.campaignName.trim() && patch.campaignName.trim() !== existingName)
      ? patch.campaignName.trim()
      : existingName;

    return {
      ...original,
      campaignName: newName,
      status: "needs_review",
      updatedAt: now,
      adCopy: {
        ...original.adCopy,
        primaryTexts: newPrimaryTexts.length > 0 ? newPrimaryTexts : existingPT,
        headlines: newHeadlines,
        descriptions: newDescriptions,
        cta: newCta,
      },
      metaStructure: {
        ...original.metaStructure,
        adSetNames: Array.isArray(original.metaStructure?.adSetNames) ? original.metaStructure.adSetNames : [],
        placements: Array.isArray(original.metaStructure?.placements) ? original.metaStructure.placements : [],
        adSets: Array.isArray(original.metaStructure?.adSets) ? original.metaStructure.adSets : undefined,
      },
      creativeDirection: {
        ...original.creativeDirection,
        angle: newAngle,
        hook: newHook,
        shotList: newShotList,
        textOverlays: newTextOverlays,
        voiceoverScript: newVoiceover,
        recommendedPlacements: Array.isArray(original.creativeDirection?.recommendedPlacements) ? original.creativeDirection.recommendedPlacements : [],
        recommendedFormat: original.creativeDirection?.recommendedFormat ?? "",
      },
      leadForm: {
        ...original.leadForm,
        introCopy: newLeadFormIntro,
        qualificationQuestions: newQQ,
        thankYouCopy: newThankYou,
        contactFields: Array.isArray(original.leadForm?.contactFields) ? original.leadForm.contactFields : [],
        formName: original.leadForm?.formName ?? "",
        consentLanguage: original.leadForm?.consentLanguage ?? "",
      },
      ghlWorkflow: {
        ...original.ghlWorkflow,
        steps: newSteps,
        tags: newTags,
        immediateSms: newImmediateSms,
        pipelineStage: original.ghlWorkflow?.pipelineStage ?? "",
        immediateEmail: original.ghlWorkflow?.immediateEmail ?? { subject: "", body: "" },
        internalNotification: original.ghlWorkflow?.internalNotification ?? "",
        setterTask: original.ghlWorkflow?.setterTask ?? "",
        aiVoiceTrigger: original.ghlWorkflow?.aiVoiceTrigger ?? "",
        bookedStopCondition: original.ghlWorkflow?.bookedStopCondition ?? "",
      },
      compliance: {
        ...original.compliance,
        approvalWarnings: newWarnings,
        disallowedPhrases: newDisallowed,
        metaRisk: original.compliance?.metaRisk ?? "",
        smsCompliance: original.compliance?.smsCompliance ?? "",
        insuranceRisk: original.compliance?.insuranceRisk ?? "",
      },
      optimization: {
        ...original.optimization,
        humanApprovalTriggers: newTriggers,
        budgetScalingRule: newScalingRule,
        pauseRule: newPauseRule,
        cplThreshold: original.optimization?.cplThreshold ?? "",
        cpbaThreshold: original.optimization?.cpbaThreshold ?? "",
        bookingRateFloor: original.optimization?.bookingRateFloor ?? "",
        creativeFatigueTrigger: original.optimization?.creativeFatigueTrigger ?? "",
      },
      strategicRationale: newRationale,
      buyerPsychologyUsed: newBP,
      marketResearchUsed: newMR,
      adVariations: newVariations,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Patch] applyImprovementPatchToDraft failed, preserving original:", err);
    }
    return original;
  }
}
