// buildCouncilPrompt — constructs the Council prompt for Hermes.
// applyCouncilToDraft — merges Council improved draft into CampaignDraft.
// safeExtractJson — robust JSON extraction from raw Hermes output.

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
