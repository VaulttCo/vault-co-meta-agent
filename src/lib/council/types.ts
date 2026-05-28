// The Council — shared types for campaign strategy analysis

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
