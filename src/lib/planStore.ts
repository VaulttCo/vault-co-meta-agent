// Shared types for campaign draft management across the portal

export type DraftStatus =
  | "draft"
  | "needs_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "ready_for_meta"
  | "pushed_paused"
  | "live";

export interface MetaStructure {
  campaignObjective: string;
  campaignType: string;
  adSetNames: string[];
  audience: string;
  locationTargeting: string;
  placements: string[];
  budgetSplit: string;
  optimizationEvent: string;
}

export interface AdCopy {
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  cta: string;
}

export interface LeadForm {
  formName: string;
  introCopy: string;
  qualificationQuestions: string[];
  contactFields: string[];
  consentLanguage: string;
  thankYouCopy: string;
}

export interface GhlWorkflow {
  tags: string[];
  pipelineStage: string;
  immediateSms: string;
  immediateEmail: { subject: string; body: string };
  internalNotification: string;
  setterTask: string;
  aiVoiceTrigger: string;
  bookedStopCondition: string;
  steps: string[];
}

export interface CreativeDirection {
  angle: string;
  hook: string;
  shotList: string[];
  textOverlays: string[];
  voiceoverScript: string;
  recommendedFormat: string;
  recommendedPlacements: string[];
}

export interface ComplianceCheck {
  metaRisk: string;
  smsCompliance: string;
  insuranceRisk: string;
  disallowedPhrases: string[];
  approvalWarnings: string[];
}

export interface OptimizationRules {
  cplThreshold: string;
  cpbaThreshold: string;
  bookingRateFloor: string;
  creativeFatigueTrigger: string;
  budgetScalingRule: string;
  pauseRule: string;
  humanApprovalTriggers: string[];
}

export interface BuyerPsychologyUsed {
  buyerInsight: string;
  urgencyTrigger: string;
  trustTriggerUsed: string;
  objectionAddressed: string;
  hookRationale: string;
  ctaRationale: string;
}

export interface MarketResearchUsed {
  marketSummary: string;
  competitorAngle: string;
  audienceRationale: string;
  locationRationale: string;
  seasonalityNote: string;
}

export interface ClientIntelligenceUsed {
  onboardingSummaryUsed: boolean;
  keyIntelligenceApplied: string[];
  offerAngle: string;
  servicesPrioritized: string[];
}

export interface StrategicRationale {
  whyThisCampaign: string;
  buyerInsightUsed: string;
  marketInsightUsed: string;
  offerAngleUsed: string;
  creativeAngleUsed: string;
  trustTriggerUsed: string;
  objectionAddressed: string;
  audienceRationale: string;
  leadFormRationale: string;
  followUpRationale: string;
}

export interface CreativeIntelligenceUsed {
  assetId: string | null;
  assetType: string;
  creativeStrength: string;
  trustSignals: string[];
  buyerIntent: string;
  recommendedAngle: string;
  recommendedHook: string;
  recommendedCTA: string;
  placementRecommendation: string[];
  complianceNote: string;
  whyThisCreative: string;
  retargetingUse: string;
  approvedForAds: boolean;
}

export interface CampaignDraft {
  id: string;
  clientId: string;
  clientName: string;
  campaignName: string;
  market: string;
  service: string;
  goal: string;
  budget: string;
  creativeType: string;
  status: DraftStatus;
  approvalStatus: DraftStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  metaStructure: MetaStructure;
  adCopy: AdCopy;
  leadForm: LeadForm;
  ghlWorkflow: GhlWorkflow;
  creativeDirection: CreativeDirection;
  compliance: ComplianceCheck;
  optimization: OptimizationRules;
  // Intelligence-powered fields (optional — not present in older drafts)
  buyerPsychologyUsed?: BuyerPsychologyUsed;
  marketResearchUsed?: MarketResearchUsed;
  clientIntelligenceUsed?: ClientIntelligenceUsed;
  strategicRationale?: StrategicRationale;
  creativeIntelligenceUsed?: CreativeIntelligenceUsed;
  // File storage references (optional)
  selectedCreativeAssetId?: string | null;
  selectedFileId?: string | null;
}

export const draftStatusLabel: Record<DraftStatus, string> = {
  draft: "Draft",
  needs_review: "Needs Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  rejected: "Rejected",
  ready_for_meta: "Ready for Meta",
  pushed_paused: "Pushed (Paused)",
  live: "Live",
};

export const draftStatusVariant: Record<
  DraftStatus,
  "success" | "warning" | "danger" | "neutral" | "blue" | "orange"
> = {
  draft: "neutral",
  needs_review: "blue",
  changes_requested: "warning",
  approved: "success",
  rejected: "danger",
  ready_for_meta: "success",
  pushed_paused: "orange",
  live: "success",
};
