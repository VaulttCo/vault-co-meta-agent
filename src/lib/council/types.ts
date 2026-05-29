// The Council — shared types for campaign strategy analysis

// ─────────────────────────────────────────────────────────────
// CampaignImprovementPatch
// ─────────────────────────────────────────────────────────────
// Small, safe patch returned by the hidden strategy refinement step.
// Only contains fields that can be merged into an existing typed CampaignDraft.
// All fields are optional — missing fields are skipped during merge.
export interface CampaignImprovementPatch {
  // ── Core ──────────────────────────────────────────────────────
  readinessScore?: number;
  winningAngle?: string;
  campaignName?: string;
  changesMade?: string[];
  missingAssets?: string[];
  nextOperatorTasks?: string[];

  // ── Ad Copy (flat, maps to adCopy.*) ─────────────────────────
  primaryTexts?: string[];
  headlines?: string[];
  descriptions?: string[];
  cta?: string;
  hookBank?: string[];           // additional hook variants
  retargetingCopy?: string[];    // retargeting-specific ad copy

  // ── Creative Direction (maps to creativeDirection.*) ─────────
  creativeDirectionSummary?: string;
  shotList?: string[];
  textOverlays?: string[];
  voiceoverNote?: string;

  // ── Lead Form (maps to leadForm.*) ───────────────────────────
  leadFormIntro?: string;
  qualificationQuestions?: string[];
  thankYouCopy?: string;

  // ── GHL Workflow (maps to ghlWorkflow.*) ─────────────────────
  ghlWorkflowSummary?: string;
  followUpSteps?: string[];
  immediateSmsDraft?: string;    // maps to ghlWorkflow.immediateSms
  ghlTags?: string[];            // maps to ghlWorkflow.tags

  // ── Compliance (maps to compliance.*) ────────────────────────
  complianceWarnings?: string[];
  disallowedPhrases?: string[];
  requiredDisclaimers?: string[];

  // ── Optimization (maps to optimization.*) ────────────────────
  optimizationNotes?: string[];
  kpis?: string[];
  scalingRules?: string[];
  killRules?: string[];
  humanApprovalTriggers?: string[];

  // ── Buyer Psychology (maps to buyerPsychologyUsed) ───────────
  buyerPsychology?: {
    insight?: string;
    urgencyTrigger?: string;
    trustTriggers?: string[];
    objections?: string[];
    hookRationale?: string;
    ctaRationale?: string;
  };

  // ── Market Research (maps to marketResearchUsed) ─────────────
  marketResearch?: {
    summary?: string;
    competitorAngle?: string;
    audienceRationale?: string;
    locationRationale?: string;
    seasonalityNote?: string;
  };

  // ── Asset Matrix (maps to adVariations[]) ────────────────────
  // Hermes returns per-asset copy. The apply function matches by
  // assetId or assetName and overlays into existing adVariations.
  assetMatrix?: Array<{
    assetId?: string;
    assetName?: string;
    angle?: string;
    primaryText1?: string;
    headline1?: string;
    cta?: string;
    adSet?: string;
    adSetTemperature?: "cold" | "warm" | "hot";
    reason?: string;
    warnings?: string[];
  }>;

  // ── Meta Push Readiness (shown in Strategy Intelligence panel) ─
  // Not applied to draft — kept in patch state for UI display only.
  metaPushReadiness?: {
    status?: "not_ready" | "needs_review" | "ready_for_validation";
    missingFields?: string[];
    payloadNotes?: string[];
    validationWarnings?: string[];
  };
}

export type CouncilMode =
  | "campaign_build"
  | "campaign_qa"
  | "creative_review"
  | "meta_push_readiness"
  | "offer_review"
  | "funnel_review"
  | "operator_task_review"
  | "strategy_review"
  | "improve_and_apply_draft";

export interface CouncilAssetPhoto {
  assetName: string;
  whatIsVisible: string;
  bestUse: "cold_traffic" | "retargeting" | "trust" | "testimonial" | "authority" | "offer" | "proof";
  recommendedHook: string;
  recommendedPrimaryText: string;
  recommendedHeadline: string;
  recommendedCTA: string;
  warnings: string[];
}

export interface CouncilAssetVideo {
  assetName: string;
  openingHook: string;
  firstThreeSeconds: string;
  recommendedPrimaryText: string;
  recommendedCaption: string;
  recommendedCutdowns: string[];
  bestUse: "cold_traffic" | "retargeting" | "trust" | "testimonial" | "authority" | "offer" | "proof";
  warnings: string[];
}

export interface CouncilResponse {
  finalVerdict: "ready" | "revise" | "rebuild" | "reject";
  approvalReadinessScore: number;
  winningAngle: string;
  councilDebate: {
    fatalFlawAdvisor: string;
    rightProblemAdvisor: string;
    upsideAdvisor: string;
    normalPersonAdvisor: string;
    nextActionAdvisor: string;
    creativeDirectorAgent: string;
    mediaBuyerAgent: string;
    copyChiefAgent: string;
    crmGhlAgent: string;
    complianceRiskAgent: string;
    localMarketAgent: string;
    chairman: string;
  };
  councilSummary: {
    winningAngle: string;
    creativeReasoning: string;
    mediaBuyerReasoning: string;
    copyReasoning: string;
    crmReasoning: string;
    complianceNotes: string;
    localMarketNotes: string;
  };
  assetAnalysis: {
    photos: CouncilAssetPhoto[];
    videos: CouncilAssetVideo[];
  };
  improvedDraft: {
    overview: string;
    metaStructure: string;
    adCopy: string;
    leadForm: string;
    ghlWorkflow: string;
    creativeDirection: string;
    compliance: string;
    optimization: string;
  };
  changesMade: string[];
  missingAssets: string[];
  nextOperatorTasks: string[];
}
