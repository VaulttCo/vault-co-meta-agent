// Creative asset types, statuses, mock library, and helpers.

export type AssetType =
  | "Before/After"
  | "Testimonial"
  | "Inspection Day"
  | "Storm Damage"
  | "Project Reveal"
  | "Team Photo"
  | "Owner On Camera"
  | "Drone Footage"
  | "Jobsite Walkthrough"
  | "Warranty Explanation"
  | "Q&A Clip"
  | "UGC Style Video";

export type AssetStatus =
  | "Uploaded"
  | "Needs Review"
  | "Approved"
  | "Used in Campaign"
  | "Archived";

export interface CreativeAsset {
  id: string;
  clientId: string;
  clientName: string;
  fileName: string;
  fileType: "image" | "video";
  assetType: AssetType;
  thumbnailUrl: string | null;
  uploadDate: string;
  service: string;
  market: string;
  campaignUseCase: string;
  notes: string;
  status: AssetStatus;
  tags: string[];
  approvedForAds: boolean;
}

export const MOCK_CREATIVE_ASSETS: CreativeAsset[] = [
  {
    id: "ca-001",
    clientId: "kaczmar-builders",
    clientName: "Kaczmar Builders",
    fileName: "stanley_trust_intro.mp4",
    fileType: "video",
    assetType: "Owner On Camera",
    thumbnailUrl: null,
    uploadDate: "May 1, 2026",
    service: "Roof Replacement",
    market: "Northeast Ohio",
    campaignUseCase: "Cold prospecting — trust-first intro from owner",
    notes: "Stanley introduces himself, 30+ years in NE Ohio, GAF Certified Plus, explains the triple warranty stack on camera. Natural, authentic, non-scripted feel.",
    status: "Approved",
    tags: ["trust", "owner", "warranties", "cold-audience"],
    approvedForAds: true,
  },
  {
    id: "ca-002",
    clientId: "kaczmar-builders",
    clientName: "Kaczmar Builders",
    fileName: "kaczmar_before_after_march.jpg",
    fileType: "image",
    assetType: "Before/After",
    thumbnailUrl: null,
    uploadDate: "Apr 22, 2026",
    service: "Roof Replacement",
    market: "Hudson, OH",
    campaignUseCase: "Social proof — quality comparison for warm audiences",
    notes: "Split: damaged hail-hit roof left, completed GAF Timberline HDZ right. High contrast, professionally shot. Authentic client project, not stock.",
    status: "Approved",
    tags: ["before-after", "quality-proof", "social-proof", "hail"],
    approvedForAds: true,
  },
  {
    id: "ca-003",
    clientId: "kaczmar-builders",
    clientName: "Kaczmar Builders",
    fileName: "warranty_explainer_v1.mp4",
    fileType: "video",
    assetType: "Warranty Explanation",
    thumbnailUrl: null,
    uploadDate: "May 3, 2026",
    service: "Roof Replacement",
    market: "Northeast Ohio",
    campaignUseCase: "Objection handling — justification for premium buyers comparing quotes",
    notes: "Stanley walks through the triple warranty: 50yr manufacturer, 15yr wind, 10yr workmanship. Good for warm audiences already considering multiple quotes.",
    status: "Needs Review",
    tags: ["warranty", "objection-handling", "warm-audience", "premium"],
    approvedForAds: false,
  },
  {
    id: "ca-004",
    clientId: "jj-roofing",
    clientName: "JJ Roofing Group",
    fileName: "phoenix_storm_reel.mp4",
    fileType: "video",
    assetType: "Storm Damage",
    thumbnailUrl: null,
    uploadDate: "Apr 18, 2026",
    service: "Storm Damage Inspection",
    market: "Tempe, AZ",
    campaignUseCase: "Urgency campaign — post-storm season inspection push",
    notes: "Shows real storm damage on Phoenix-area roofs — missing shingles, dented flashing, visible deck damage. Inspector on camera walking through findings.",
    status: "Approved",
    tags: ["storm", "urgency", "inspection", "hot-audience", "phoenix"],
    approvedForAds: true,
  },
  {
    id: "ca-005",
    clientId: "jj-roofing",
    clientName: "JJ Roofing Group",
    fileName: "homeowner_testimonial_az.mp4",
    fileType: "video",
    assetType: "Testimonial",
    thumbnailUrl: null,
    uploadDate: "Apr 10, 2026",
    service: "Roof Replacement",
    market: "Tempe, AZ",
    campaignUseCase: "Trust builder — social proof for mid-funnel warm audiences",
    notes: "Homeowner mentions finding hidden hail damage during free inspection, speed of the team, and being guided through the insurance claim. Authentic, unscripted.",
    status: "Approved",
    tags: ["testimonial", "social-proof", "insurance", "trust"],
    approvedForAds: true,
  },
  {
    id: "ca-006",
    clientId: "jj-roofing",
    clientName: "JJ Roofing Group",
    fileName: "tempe_neighborhood_drone.mp4",
    fileType: "video",
    assetType: "Drone Footage",
    thumbnailUrl: null,
    uploadDate: "May 2, 2026",
    service: "Roof Replacement",
    market: "Tempe, AZ",
    campaignUseCase: "Cold audience — local awareness, neighborhood-level relevance",
    notes: "High-altitude drone sweep over Tempe suburbs, zooms in on rooftops with visible aging and storm-related wear. Strong visual hook for scroll-stopping cold audiences.",
    status: "Uploaded",
    tags: ["drone", "cold-audience", "local-awareness", "tempe"],
    approvedForAds: false,
  },
  {
    id: "ca-007",
    clientId: "acorns-roofing",
    clientName: "Acorns Roofing",
    fileName: "inspector_onsite_walk.mp4",
    fileType: "video",
    assetType: "Inspection Day",
    thumbnailUrl: null,
    uploadDate: "Apr 28, 2026",
    service: "Storm Damage Inspection",
    market: "Atlanta, GA",
    campaignUseCase: "Process transparency — builds trust through showing the inspection",
    notes: "Inspector walking the roof, pointing out storm damage, explaining findings to camera. Professional and approachable. Good for mid-funnel warm audiences.",
    status: "Approved",
    tags: ["inspection", "process", "trust", "warm-audience", "atlanta"],
    approvedForAds: true,
  },
  {
    id: "ca-008",
    clientId: "acorns-roofing",
    clientName: "Acorns Roofing",
    fileName: "atlanta_reroof_reveal.mp4",
    fileType: "video",
    assetType: "Project Reveal",
    thumbnailUrl: null,
    uploadDate: "May 4, 2026",
    service: "Roof Replacement",
    market: "Atlanta, GA",
    campaignUseCase: "Quality proof — transformation with emotional homeowner reaction",
    notes: "Time-lapse of 1-day reroof on Atlanta colonial home. Dramatic before-reveal ending with owner walking out to see the finished roof. Strong emotional moment.",
    status: "Needs Review",
    tags: ["reveal", "transformation", "quality", "proof", "emotional"],
    approvedForAds: false,
  },
  {
    id: "ca-009",
    clientId: "open-forge",
    clientName: "Open Forge Construction",
    fileName: "kitchen_remodel_before_after.jpg",
    fileType: "image",
    assetType: "Before/After",
    thumbnailUrl: null,
    uploadDate: "Apr 15, 2026",
    service: "Kitchen Remodel",
    market: "Columbus, OH",
    campaignUseCase: "Dream transformation — premium remodeling social proof",
    notes: "Dark dated galley kitchen before. Bright open layout with custom cabinetry, quartz counters, waterfall island after. Very strong visual contrast. Shot by professional photographer.",
    status: "Approved",
    tags: ["before-after", "kitchen", "premium", "proof", "photography"],
    approvedForAds: true,
  },
  {
    id: "ca-010",
    clientId: "open-forge",
    clientName: "Open Forge Construction",
    fileName: "owner_qa_clip_process.mp4",
    fileType: "video",
    assetType: "Q&A Clip",
    thumbnailUrl: null,
    uploadDate: "May 1, 2026",
    service: "Home Remodeling",
    market: "Columbus, OH",
    campaignUseCase: "Objection handling — price, timeline, warranty questions answered on camera",
    notes: "Owner answers 3 common questions: 'How long does it take?', 'Do you have hidden fees?', 'What's your warranty?' Short, direct, confident. Good for warm retargeting.",
    status: "Uploaded",
    tags: ["qa", "objection-handling", "process", "warm", "retargeting"],
    approvedForAds: false,
  },
];

export const ALL_ASSET_TYPES: AssetType[] = [
  "Before/After",
  "Testimonial",
  "Inspection Day",
  "Storm Damage",
  "Project Reveal",
  "Team Photo",
  "Owner On Camera",
  "Drone Footage",
  "Jobsite Walkthrough",
  "Warranty Explanation",
  "Q&A Clip",
  "UGC Style Video",
];

export const ALL_ASSET_STATUSES: AssetStatus[] = [
  "Uploaded",
  "Needs Review",
  "Approved",
  "Used in Campaign",
  "Archived",
];

export function getAssetsForClient(clientId: string, assets = MOCK_CREATIVE_ASSETS): CreativeAsset[] {
  return assets.filter((a) => a.clientId === clientId);
}

export const assetTypeColors: Record<AssetType, string> = {
  "Before/After": "#22c55e",
  "Testimonial": "#18b8f0",
  "Inspection Day": "#f07820",
  "Storm Damage": "#ef4444",
  "Project Reveal": "#a78bfa",
  "Team Photo": "#f59e0b",
  "Owner On Camera": "#c9a84c",
  "Drone Footage": "#18b8f0",
  "Jobsite Walkthrough": "#f07820",
  "Warranty Explanation": "#22c55e",
  "Q&A Clip": "#a78bfa",
  "UGC Style Video": "#f59e0b",
};

export const assetStatusVariant: Record<
  AssetStatus,
  "success" | "warning" | "neutral" | "blue" | "orange"
> = {
  "Uploaded": "neutral",
  "Needs Review": "warning",
  "Approved": "success",
  "Used in Campaign": "blue",
  "Archived": "neutral",
};
