// Server-side only — pure preview payload builder.
// Reads existing campaign draft JSONB fields. Makes zero Meta API calls.
// All output objects carry status: "PAUSED_PREVIEW_ONLY" — nothing is sent to Meta.

import type { CampaignDraftRow, IntegrationConnectionRow } from "@/lib/supabase/types";

export interface MetaCampaignPreview {
  name: string;
  objective: string;
  campaignType: string;
  dailyBudget: string;
  status: "PAUSED_PREVIEW_ONLY";
  notes: string;
}

export interface MetaAdSetPreview {
  name: string;
  purpose?: string;
  audience: string;
  locationTargeting: string;
  placements: string[];
  optimizationEvent: string;
  budgetSplit: string;
  budgetAmount?: string;
  audienceTemperature?: "cold" | "warm" | "hot";
  requiredForLaunch?: boolean;
  launchBlocker?: string;
  status: "PAUSED_PREVIEW_ONLY";
  notes: string;
}

export interface MetaAdPreview {
  name: string;
  assetId: string | null;
  fileName: string | null;
  assetType: string | null;
  fileType: string | null;
  approvedForAds: boolean;
  primaryTexts: string[];
  headline: string;
  description: string;
  cta: string;
  placements: string[];
  adSetAssignment?: string;
  adSetAudienceTemperature?: "cold" | "warm" | "hot";
  copyGenerationNote?: string;
  status: "PAUSED_PREVIEW_ONLY";
  notes: string;
}

export interface MetaLeadFormPreview {
  formName: string;
  introCopy: string;
  qualificationQuestions: string[];
  contactFields: string[];
  consentLanguage: string;
  thankYouCopy: string;
}

export interface MetaTrackingPreview {
  pixelConnected: boolean;
  pixelId: string | null;
  adAccountConnected: boolean;
  adAccountId: string | null;
  facebookPageConnected: boolean;
  facebookPageId: string | null;
  lastSyncedAt: string | null;
}

export interface SafetyCheckItem {
  label: string;
  status: "pass" | "fail" | "warn" | "unknown";
  detail: string;
}

export interface MetaPreviewPayload {
  previewOnly: true;
  generatedAt: string;
  draftId: string;
  clientId: string;
  draftStatus: string;
  campaign: MetaCampaignPreview;
  adSets: MetaAdSetPreview[];
  ads: MetaAdPreview[];
  leadForm: MetaLeadFormPreview;
  tracking: MetaTrackingPreview;
  safetyChecklist: SafetyCheckItem[];
  missingRequirements: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asObj(v: unknown): Record<string, any> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, any>;
  return {};
}

function asStr(v: unknown, fallback = ""): string {
  return typeof v === "string" && v ? v : fallback;
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function buildMetaPreviewPayload(
  draft: CampaignDraftRow,
  integrations: IntegrationConnectionRow[]
): MetaPreviewPayload {
  const metaStructure = asObj(draft.meta_campaign_structure);
  const adCopy = asObj(draft.ad_copy);
  const leadFormRaw = asObj(draft.lead_form);
  const compliance = asObj(draft.compliance_check);
  const creativeDirection = asObj(draft.creative_direction);

  // ── Campaign ──────────────────────────────────────────────────────
  const campaign: MetaCampaignPreview = {
    name: draft.campaign_name,
    objective: asStr(metaStructure.campaignObjective, "LEAD_GENERATION"),
    campaignType: asStr(metaStructure.campaignType, "Advantage+ Shopping"),
    dailyBudget: draft.budget,
    status: "PAUSED_PREVIEW_ONLY",
    notes: "Preview only — not sent to Meta",
  };

  // ── Ad Sets ───────────────────────────────────────────────────────
  const richAdSetsRaw = asArr(metaStructure.adSets);
  const adSetNames: string[] = asArr(metaStructure.adSetNames).map((n) => asStr(n));

  const adSets: MetaAdSetPreview[] =
    richAdSetsRaw.length > 0
      ? richAdSetsRaw.map((raw) => {
          const s = asObj(raw);
          return {
            name: asStr(s.name),
            purpose: asStr(s.purpose) || undefined,
            audience: asStr(s.audience, asStr(metaStructure.audience, draft.market)),
            locationTargeting: asStr(s.locationTargeting, draft.market),
            placements: asArr(s.placements).map((p) => asStr(p)).filter(Boolean),
            optimizationEvent: asStr(s.optimizationEvent, "LEAD"),
            budgetSplit: asStr(s.budgetSplit, ""),
            budgetAmount: asStr(s.budgetAmount) || undefined,
            audienceTemperature: (s.audienceTemperature as "cold" | "warm" | "hot") || undefined,
            requiredForLaunch: s.requiredForLaunch === true,
            launchBlocker: asStr(s.launchBlocker) || undefined,
            status: "PAUSED_PREVIEW_ONLY" as const,
            notes: "Preview only — not sent to Meta",
          };
        })
      : adSetNames.length > 0
      ? adSetNames.map((name) => ({
          name,
          audience: asStr(metaStructure.audience, draft.market),
          locationTargeting: asStr(metaStructure.locationTargeting, draft.market),
          placements: asArr(metaStructure.placements).map((p) => asStr(p)).filter(Boolean),
          optimizationEvent: asStr(metaStructure.optimizationEvent, "LEAD"),
          budgetSplit: asStr(metaStructure.budgetSplit, "Even split"),
          status: "PAUSED_PREVIEW_ONLY" as const,
          notes: "Preview only — not sent to Meta",
        }))
      : [
          {
            name: `${draft.campaign_name} — Ad Set 1`,
            audience: draft.market,
            locationTargeting: draft.market,
            placements: ["Facebook Feed", "Instagram Feed"],
            optimizationEvent: "LEAD",
            budgetSplit: "100%",
            status: "PAUSED_PREVIEW_ONLY",
            notes: "Preview only — not sent to Meta",
          },
        ];

  // ── Ads ───────────────────────────────────────────────────────────
  const assetVariations = asArr(adCopy.asset_variations);
  const selectedAssets = asArr(creativeDirection.selected_assets);
  const basePrimaryTexts = asArr(adCopy.primaryTexts).map((t) => asStr(t)).filter(Boolean);
  const baseHeadlines = asArr(adCopy.headlines).map((h) => asStr(h)).filter(Boolean);
  const baseDescriptions = asArr(adCopy.descriptions).map((d) => asStr(d)).filter(Boolean);
  const baseCta = asStr(adCopy.cta, "Get Free Quote");
  const basePlacements = asArr(metaStructure.placements).map((p) => asStr(p)).filter(Boolean);

  let ads: MetaAdPreview[];

  if (assetVariations.length > 0) {
    ads = assetVariations.map((v, i) => {
      const variation = asObj(v);
      const fileName = asStr(variation.fileName);
      const adName = fileName
        ? `${draft.campaign_name} — ${fileName}`
        : `${draft.campaign_name} — Ad ${i + 1}`;
      const variationPlacements = asArr(variation.recommendedPlacement)
        .map((p) => asStr(p))
        .filter(Boolean);
      const adSetAssignment = asStr(variation.adSetAssignment) || undefined;
      const adSetAudienceTemperature = (variation.adSetAudienceTemperature as "cold" | "warm" | "hot") || undefined;
      const copyGenerationNote = asStr(variation.whyThisCopyMatchesCreative) || undefined;
      return {
        name: adName,
        assetId: asStr(variation.assetId) || null,
        fileName: fileName || null,
        assetType: asStr(variation.assetType) || null,
        fileType: asStr(variation.fileType) || null,
        approvedForAds: variation.approvedForAds === true,
        primaryTexts: [asStr(variation.primaryText1), asStr(variation.primaryText2)].filter(Boolean),
        headline: asStr(variation.headline1, baseHeadlines[0] ?? draft.campaign_name),
        description: asStr(variation.description, baseDescriptions[0] ?? ""),
        cta: asStr(variation.cta, baseCta),
        placements: variationPlacements.length > 0 ? variationPlacements : basePlacements,
        adSetAssignment,
        adSetAudienceTemperature,
        copyGenerationNote,
        status: "PAUSED_PREVIEW_ONLY",
        notes: "Preview only — not sent to Meta",
      };
    });
  } else if (selectedAssets.length > 0) {
    ads = selectedAssets.map((a, i) => {
      const asset = asObj(a);
      const fileName = asStr(asset.file_name);
      return {
        name: `${draft.campaign_name} — ${fileName || `Ad ${i + 1}`}`,
        assetId: asStr(asset.id) || null,
        fileName: fileName || null,
        assetType: asStr(asset.asset_type) || null,
        fileType: asStr(asset.file_type) || null,
        approvedForAds: asset.approved_for_ads === true,
        primaryTexts: basePrimaryTexts.slice(0, 2),
        headline: baseHeadlines[0] ?? draft.campaign_name,
        description: baseDescriptions[0] ?? "",
        cta: baseCta,
        placements: basePlacements,
        status: "PAUSED_PREVIEW_ONLY",
        notes: "Preview only — not sent to Meta",
      };
    });
  } else {
    // Single ad from base copy
    ads = [
      {
        name: `${draft.campaign_name} — Ad 1`,
        assetId: draft.creative_asset_id,
        fileName: draft.creative_type || null,
        assetType: draft.creative_type || null,
        fileType: null,
        approvedForAds: false,
        primaryTexts: basePrimaryTexts.slice(0, 2),
        headline: baseHeadlines[0] ?? draft.campaign_name,
        description: baseDescriptions[0] ?? "",
        cta: baseCta,
        placements: basePlacements,
        status: "PAUSED_PREVIEW_ONLY",
        notes: "Preview only — not sent to Meta",
      },
    ];
  }

  // ── Lead Form ─────────────────────────────────────────────────────
  const leadForm: MetaLeadFormPreview = {
    formName: asStr(leadFormRaw.formName, `${draft.campaign_name} — Lead Form`),
    introCopy: asStr(leadFormRaw.introCopy, ""),
    qualificationQuestions: asArr(leadFormRaw.qualificationQuestions).map((q) => asStr(q)).filter(Boolean),
    contactFields: asArr(leadFormRaw.contactFields).map((f) => asStr(f)).filter(Boolean),
    consentLanguage: asStr(leadFormRaw.consentLanguage, ""),
    thankYouCopy: asStr(leadFormRaw.thankYouCopy, ""),
  };

  // ── Tracking ──────────────────────────────────────────────────────
  const metaConn = integrations.find((c) => c.provider === "meta" && c.connection_status === "connected");
  const metaConnAny = integrations.find((c) => c.provider === "meta");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metaMeta = asObj((metaConn ?? metaConnAny)?.metadata as any);

  // Pixel ID — check all known field name variants across integration metadata
  const rawPixelId =
    metaMeta.pixel_id ||
    metaMeta.pixelId ||
    metaMeta.meta_pixel_id ||
    metaMeta.metaPixelId ||
    null;
  // Page ID — check all known field name variants
  const rawPageId =
    metaMeta.page_id ||
    metaMeta.pageId ||
    metaMeta.facebook_page_id ||
    metaMeta.facebookPageId ||
    null;

  const tracking: MetaTrackingPreview = {
    adAccountConnected: metaConn?.connection_status === "connected",
    adAccountId: metaConn?.provider_account_id ?? null,
    pixelConnected: !!rawPixelId,
    pixelId: asStr(rawPixelId) || null,
    facebookPageConnected: !!rawPageId,
    facebookPageId: asStr(rawPageId) || null,
    lastSyncedAt: metaConn?.last_synced_at ?? null,
  };

  // ── Safety Checklist ──────────────────────────────────────────────
  const metaRisk = asStr(compliance.metaRisk, "UNKNOWN");
  const approvalWarnings: string[] = asArr(compliance.approvalWarnings).map((w) => asStr(w)).filter(Boolean);

  // Banned phrase scan — scan actual ad copy for known compliance violations.
  // disallowedPhrases in the compliance field should be FOUND violations, not a "to avoid" list.
  // We also scan copy directly to catch any phrases missed by the generator.
  const BANNED_PHRASE_PATTERNS: { phrase: string; pattern: RegExp }[] = [
    { phrase: "insurance will cover it", pattern: /insurance will cover it/i },
    { phrase: "file a free insurance claim", pattern: /file a free insurance claim/i },
    { phrase: "file.*insurance claim", pattern: /file.{0,20}insurance claim/i },
    { phrase: "guaranteed approval", pattern: /guaranteed approval/i },
    { phrase: "pre-approved", pattern: /pre-approved/i },
    { phrase: "100% covered by insurance", pattern: /100%?\s*covered by insurance/i },
    { phrase: "best roofer in [city]", pattern: /best roofer in/i },
    { phrase: "free replacement", pattern: /free replacement/i },
    { phrase: "guaranteed outcome", pattern: /we guarantee.{0,40}(claim|approval|coverage)/i },
  ];

  // Gather all copy text to scan
  const allCopyText = [
    ...ads.flatMap((a) => [...a.primaryTexts, a.headline, a.description]),
    leadForm.introCopy,
    leadForm.thankYouCopy,
  ].filter(Boolean).join(" ");

  // Phrases from compliance field — filter out advisory "to avoid" entries (they start with '"')
  const complianceFieldPhrases: string[] = asArr(compliance.disallowedPhrases)
    .map((p) => asStr(p))
    .filter(Boolean)
    .filter((p) => !(p.startsWith('"') && p.length > 50));

  // Scan actual copy for banned patterns
  const scannedViolations: string[] = BANNED_PHRASE_PATTERNS
    .filter(({ pattern }) => pattern.test(allCopyText))
    .map(({ phrase }) => phrase);

  // Merge: compliance field violations + scanned violations, deduplicated
  const disallowedPhrases: string[] = [
    ...new Set([...complianceFieldPhrases, ...scannedViolations]),
  ];

  const riskStatus: SafetyCheckItem["status"] = metaRisk.startsWith("LOW")
    ? "pass"
    : metaRisk.startsWith("MEDIUM")
    ? "warn"
    : metaRisk.startsWith("HIGH")
    ? "fail"
    : "unknown";

  const allCreativesApproved = ads.every((a) => a.approvedForAds);
  const hasLeadForm = !!(leadForm.formName && leadForm.qualificationQuestions.length > 0);
  const hasAdCopy = ads.every((a) => a.primaryTexts.length > 0 && a.headline);

  // Retargeting ad set blocked — any ad set with a launchBlocker and pixel/page missing
  const retargetingAdSets = adSets.filter((s) => s.launchBlocker);
  const retargetingBlocked = retargetingAdSets.length > 0 && (!tracking.pixelConnected || !tracking.facebookPageConnected);

  const safetyChecklist: SafetyCheckItem[] = [
    {
      label: "Meta Policy Risk",
      status: riskStatus,
      detail: metaRisk || "Not assessed",
    },
    {
      label: "Disallowed Phrases",
      status: disallowedPhrases.length === 0 ? "pass" : "fail",
      detail: disallowedPhrases.length === 0
        ? "No disallowed phrases detected"
        : `Flagged: ${disallowedPhrases.join(", ")}`,
    },
    {
      label: "Approval Warnings",
      status: approvalWarnings.length === 0 ? "pass" : "warn",
      detail: approvalWarnings.length === 0
        ? "No warnings"
        : approvalWarnings.join(" | "),
    },
    {
      label: "Creative Assets Approved",
      status: allCreativesApproved ? "pass" : ads.length > 0 ? "fail" : "unknown",
      detail: allCreativesApproved
        ? "All creatives approved for ads"
        : "One or more creatives not yet approved",
    },
    {
      label: "Ad Copy Complete",
      status: hasAdCopy ? "pass" : "fail",
      detail: hasAdCopy ? "Primary text and headlines present" : "Missing ad copy",
    },
    {
      label: "Lead Form Defined",
      status: hasLeadForm ? "pass" : "warn",
      detail: hasLeadForm
        ? "Lead form with qualification questions present"
        : "Lead form incomplete or missing",
    },
    {
      label: "Meta Ad Account",
      status: tracking.adAccountConnected ? "pass" : "fail",
      detail: tracking.adAccountConnected
        ? `Connected: ${tracking.adAccountId}`
        : "No connected Meta ad account. Connect in Client → Integrations → Meta.",
    },
    {
      // Pixel is WARN (not FAIL) for instant-form lead campaigns.
      // Pixel is only required for retargeting and website event optimization.
      // If retargeting ad set is present and pixel missing, that is handled in the Retargeting check.
      label: "Meta Pixel Confirmed",
      status: tracking.pixelConnected ? "pass" : "warn",
      detail: tracking.pixelConnected
        ? `Pixel ID: ${tracking.pixelId} — website event tracking active.`
        : "Meta Pixel ID not found in integration metadata. Add it in Client → Integrations → Meta. Required for retargeting and website event tracking. Instant-form prospecting ad sets can still launch without Pixel.",
    },
    {
      // Facebook Page is WARN (not FAIL) for instant-form campaigns.
      // Page connection is required for retargeting and social proof ad sets.
      label: "Facebook Page Connected",
      status: tracking.facebookPageConnected ? "pass" : "warn",
      detail: tracking.facebookPageConnected
        ? `Page ID: ${tracking.facebookPageId} — Facebook Page connected.`
        : "Facebook Page ID not found in integration metadata. Add it in Client → Integrations → Meta. Required for retargeting ad set and social proof placement. Prospecting ad sets can run without it.",
    },
    {
      label: "SMS Compliance",
      status: asStr(compliance.smsCompliance).startsWith("COMPLIANT") ? "pass" : "warn",
      detail: asStr(compliance.smsCompliance, "Not assessed — verify TCPA consent is captured in the lead form before activating SMS sequences."),
    },
    ...(retargetingAdSets.length > 0
      ? [
          {
            label: "Retargeting Ad Set",
            status: retargetingBlocked ? ("warn" as const) : ("pass" as const),
            detail: retargetingBlocked
              ? `Paused / Blocked — retargeting requires Meta Pixel + Facebook Page. Missing: ${[!tracking.pixelConnected && "Pixel ID", !tracking.facebookPageConnected && "Facebook Page ID"].filter(Boolean).join(", ")}. Fix in Client → Integrations → Meta. Prospecting ad sets are unaffected.`
              : `Ready — Pixel + Page connected. Retargeting ad set${retargetingAdSets.length > 1 ? "s" : ""}: ${retargetingAdSets.map((s) => s.name).join(", ")}`,
          },
        ]
      : []),
  ];

  // ── Missing Requirements ──────────────────────────────────────────
  // Only hard blockers go here — Pixel and Page are warnings, not blockers for instant-form campaigns.
  const missingRequirements: string[] = [];
  if (!tracking.adAccountConnected) missingRequirements.push("Connect Meta ad account in Client → Integrations");
  if (!allCreativesApproved) missingRequirements.push("Approve all creative assets for Meta ads in Creative Library");
  if (!hasLeadForm) missingRequirements.push("Complete lead form configuration in Campaign Builder");
  if (disallowedPhrases.length > 0) missingRequirements.push(`Remove compliance violations found in copy: ${disallowedPhrases.join(", ")}`);
  if (riskStatus === "fail") missingRequirements.push("Resolve HIGH meta policy risk before launch — see Safety tab");
  // Pixel and Page are advisory warnings, added separately from hard blockers
  if (!tracking.pixelConnected) missingRequirements.push("⚠ Add Meta Pixel ID to enable retargeting and website event tracking (not required for instant-form prospecting)");
  if (!tracking.facebookPageConnected) missingRequirements.push("⚠ Add Facebook Page ID to enable retargeting ad set (not required for prospecting-only launch)");

  return {
    previewOnly: true,
    generatedAt: new Date().toISOString(),
    draftId: draft.id,
    clientId: draft.client_id,
    draftStatus: draft.status,
    campaign,
    adSets,
    ads,
    leadForm,
    tracking,
    safetyChecklist,
    missingRequirements,
  };
}
