// Server-side only — generates a structured campaign draft from client intelligence + Veronica agents.
// Saves to public.campaign_drafts. Never writes to Meta, GHL, or any external system.
// No Meta API calls. No ad creation. No budget changes. No publishing.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { buildClientBrain, type VeronicaPortalContext } from "@/lib/ai/veronica";
import {
  runClientIntelligenceAgent,
  runOfferMessagingAgent,
  runComplianceRiskAgent,
  runGhlWorkflowBuilderAgent,
  runLaunchReadinessAgent,
  type ClientIntelligenceOutput,
  type OfferMessagingOutput,
  type ComplianceRiskOutput,
  type GhlWorkflowBuilderOutput,
  type LaunchReadinessOutput,
} from "@/lib/ai/veronica-agents";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import type { Client } from "@/lib/data";
import { buildAssetAdVariation } from "@/lib/agents/creativeAnalysis";

export const runtime = "nodejs";

// ── Client row → Client type (same mapping as veronica/route.ts) ──────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClientRow(row: any): Client {
  return {
    id: row.id,
    name: row.company_name,
    owner: row.owner_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    market: (row.service_areas ?? [])[0] ?? "",
    services: row.services_offered ?? [],
    avgJobValue: row.average_job_value ?? "",
    monthlyBudget: row.monthly_ad_budget ?? "",
    offer: row.offer ?? "",
    brandTone: row.brand_tone ?? "",
    status: row.status,
    notes: row.notes ?? "",
    metaAccountId: row.meta_ad_account_id ?? "",
    pixelId: row.meta_pixel_id ?? "",
    fbPageId: row.facebook_page_id ?? "",
    instagramId: row.instagram_account_id ?? "",
    ghlLocationId: row.ghl_location_id ?? "",
    ghlPipelineId: row.ghl_pipeline_id ?? "",
    stats: {
      leads: 0, booked: 0, cpl: "$0", cpba: "$0",
      showRate: "0%", pipeline: "$0", revenue: "$0", spend: "$0",
    },
    campaigns: [],
  };
}

// ── Intelligence row → ClientIntelligence type ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIntelligenceRow(clientId: string, data: any): ClientIntelligence {
  return {
    clientId,
    extractedAt: data.updated_at,
    onboardingSummary: data.onboarding_summary ?? "",
    companyProfile: data.company_profile,
    serviceArea: data.service_area,
    targetMarket: data.target_market,
    buyerProfile: data.buyer_profile,
    marketResearch: data.market_research,
    offerIntelligence: data.offer_intelligence,
    salesIntelligence: data.sales_intelligence,
    brandIntelligence: data.brand_intelligence,
    kpiBaseline: data.kpi_baseline,
    salesAudit: data.sales_audit,
    contentPlanning: data.content_planning,
    campaignImplications: data.campaign_implications,
  };
}

// ── JSON blob builders ────────────────────────────────────────────────────────

function buildMetaCampaignStructure(client: Client, intel: ClientIntelligence | null) {
  const market = client.market || intel?.serviceArea?.radius || "Service Area";
  const cities: string[] = intel?.serviceArea?.cities ?? [];
  const geo = cities.length > 0 ? `${market} — ${cities.slice(0, 5).join(", ")}` : market;
  const targetAge = intel?.targetMarket?.idealAgeRange ?? "35–65";
  const hhi = intel?.targetMarket?.householdIncome ?? "$100K+";

  return {
    objective: "LEAD_GENERATION",
    campaign_name: `${client.name} — ${client.services[0] ?? "Home Services"} — ${market}`,
    targeting: {
      geo,
      age_range: targetAge,
      household_income: hhi,
      placements: ["Facebook Feed", "Instagram Feed", "Facebook Stories", "Instagram Reels"],
      detailed_targeting: (intel?.targetMarket?.occupations ?? ["Homeowners"]).slice(0, 4),
    },
    ad_sets: [
      {
        name: `${market} — Broad Homeowner Prospecting`,
        targeting_type: "broad",
        budget_pct: 40,
        notes: "Wide net — demographic + interest signals only",
      },
      {
        name: `${market} — Intent / Lifestyle Targeting`,
        targeting_type: "interest",
        budget_pct: 35,
        notes: "Layered interest targeting — home improvement, property investment, local homeownership",
      },
      {
        name: `${market} — Retargeting 30-Day Visitors`,
        targeting_type: "retargeting",
        budget_pct: 25,
        notes: "Requires pixel — retargets website visitors in the last 30 days",
      },
    ],
    monthly_budget: client.monthlyBudget || "$2,000/mo",
    bidding_strategy: "Lowest Cost",
    pixel_required: true,
    meta_ad_account_required: true,
    facebook_page_required: true,
    approval_required: true,
    generated_by: "Veronica Campaign Draft Generator",
  };
}

function buildAdCopy(
  intel: ClientIntelligence | null,
  offerOut: OfferMessagingOutput,
  clientIntelOut: ClientIntelligenceOutput
) {
  const primaryTexts = (
    offerOut.bestHooks.length > 0
      ? offerOut.bestHooks
      : intel?.campaignImplications?.bestCampaignAngles ?? []
  ).slice(0, 3).map((text, i) => ({ variant: `V${i + 1}`, text }));

  const headlines = (
    intel?.campaignImplications?.offersToTest ?? [
      "Schedule a Roof Replacement Consultation",
      "Get a GAF-Certified Estimate",
      "Book Your Free Inspection",
    ]
  ).slice(0, 3).map((text, i) => ({ variant: `H${i + 1}`, text }));

  const offerAngle =
    (offerOut.bestAngles[0] ?? intel?.salesIntelligence?.bestSalesAngles?.[0]) || offerOut.adCopyDirection;

  return {
    primary_texts: primaryTexts,
    headlines,
    cta: "Book Now",
    offer_angle: offerAngle,
    ad_copy_direction: offerOut.adCopyDirection,
    landing_page_message: offerOut.landingPageMessage,
    what_to_avoid: offerOut.whatToAvoidSaying,
    client_positioning: clientIntelOut.clientPositioning,
    ideal_customer_summary: clientIntelOut.idealCustomerSummary,
    key_objections: clientIntelOut.keyObjections,
    recommended_messaging: clientIntelOut.recommendedMessaging,
    important_notes: clientIntelOut.importantClientNotes,
    approval_required: true,
    generated_by: "Veronica Offer & Messaging Agent",
  };
}

function buildLeadForm(intel: ClientIntelligence | null, client: Client) {
  const questions = (intel?.campaignImplications?.leadFormQuestions ?? [
    "What service are you interested in?",
    "What city are you located in?",
    "Are you the homeowner?",
    "How soon are you looking to start?",
    "What is the best number to reach you?",
  ]).map((q, i) => ({ order: i + 1, question: q }));

  return {
    form_name: `${client.name} — ${client.services[0] ?? "Home Services"} Lead Form`,
    questions,
    thank_you_message: "Thank you — we'll reach out within 1 business hour.",
    privacy_policy_url: client.website ? `${client.website}/privacy` : null,
    tcpa_disclaimer:
      "By submitting this form you consent to receive SMS and phone calls. Message rates may apply. Reply STOP to unsubscribe.",
    approval_required: true,
    generated_by: "Veronica Campaign Draft Generator",
  };
}

function buildGHLWorkflow(ghlOut: GhlWorkflowBuilderOutput) {
  return {
    workflow_name: ghlOut.workflowName,
    workflow_goal: ghlOut.workflowGoal,
    trigger: ghlOut.trigger,
    conditions: ghlOut.conditions,
    actions: ghlOut.actions,
    wait_steps: ghlOut.waitSteps,
    sms_copy: ghlOut.smsCopy,
    internal_notification_copy: ghlOut.internalNotificationCopy,
    assigned_user_role: ghlOut.assignedUserRole,
    stop_conditions: ghlOut.stopConditions,
    compliance_notes: ghlOut.complianceNotes,
    required_custom_fields: ghlOut.requiredCustomFields,
    testing_checklist: ghlOut.testingChecklist,
    what_not_to_automate: ghlOut.whatNotToAutomate,
    approval_required: true,
    note: "This is a workflow blueprint only. A human must build and activate this workflow in GHL directly. Veronica does not push to GHL.",
    generated_by: "Veronica GHL Workflow Builder Agent",
  };
}

function buildCreativeDirection(intel: ClientIntelligence | null) {
  const formats = intel?.campaignImplications?.creativeFormats ?? [
    "Owner-on-camera video",
    "Before/after photos",
    "Testimonial clips",
  ];
  const themes = intel?.contentPlanning?.recommendedContentThemes ?? [];
  const selling = intel?.contentPlanning?.biggestSellingPoints ?? [];

  return {
    recommended_creative_types: formats.slice(0, 5),
    recommended_themes: themes.slice(0, 5),
    key_selling_points_to_feature: selling,
    owner_on_camera: intel?.contentPlanning?.ownerOnCamera ?? false,
    content_tone: intel?.contentPlanning?.contentTone ?? "Friendly, professional",
    brand_tone: intel?.brandIntelligence?.brandTone ?? "Friendly, direct, trustworthy",
    what_to_avoid_visually: [
      "Generic stock photos",
      "Overly corporate or polished look",
      "Salesy or pushy on-screen text",
    ],
    priority_shoot_concepts: [
      "Owner introduces the company on-camera",
      "Jobsite walkthrough — before inspection, damage revealed, after replacement",
      "Drone footage of completed premium roof",
    ],
    approval_required: true,
    generated_by: "Veronica Creative Strategist",
  };
}

function buildComplianceCheck(complianceOut: ComplianceRiskOutput, intel: ClientIntelligence | null) {
  const allWhatNotToSay = [
    ...complianceOut.whatNotToSay,
    ...(intel?.brandIntelligence?.whatNotToSay ?? []),
    ...(intel?.campaignImplications?.whatNotToSay ?? []),
  ];

  return {
    risk_level: complianceOut.riskLevel,
    risk_flags: complianceOut.riskFlags,
    what_to_reword: complianceOut.whatToReword,
    safe_alternative_copy: complianceOut.safeAlternativeCopy,
    what_not_to_say: [...new Set(allWhatNotToSay)].slice(0, 12),
    compliance_notes: intel?.brandIntelligence?.complianceNotes ?? [],
    approval_required: true,
    generated_by: "Veronica Compliance & Risk Agent",
  };
}

function buildStrategicRationale(
  client: Client,
  intel: ClientIntelligence | null,
  launchOut: LaunchReadinessOutput,
  clientIntelOut: ClientIntelligenceOutput
) {
  return {
    positioning: clientIntelOut.clientPositioning,
    target_market_summary: clientIntelOut.idealCustomerSummary,
    best_offer_angles: clientIntelOut.bestOfferAngles,
    key_differentiators: intel?.brandIntelligence?.whyCustomersTrust ?? [],
    unique_mechanism: intel?.brandIntelligence?.uniqueMechanism ?? null,
    key_objections: clientIntelOut.keyObjections,
    sales_process_risks: clientIntelOut.salesProcessRisks,
    recommended_messaging: clientIntelOut.recommendedMessaging,
    launch_blockers: launchOut.blockingItems,
    missing_items_for_launch: launchOut.missingItems,
    recommended_launch_sequence: launchOut.recommendedLaunchSequence,
    what_must_be_approved_before_launch: [
      "Meta Ad Account connected",
      "Meta Pixel installed and verified",
      "Facebook Page connected to ad account",
      "Minimum 1 approved creative asset (image or video)",
      "This campaign draft approved by admin",
      "GHL workflow built and tested in GHL (not automated by Veronica)",
    ],
    launch_readiness_score: launchOut.launchReadinessScore,
    max_score: launchOut.maxScore,
    launch_status: launchOut.status,
    monthly_budget: client.monthlyBudget || "$2,000/mo",
    avg_job_value: client.avgJobValue || intel?.companyProfile?.avgTicketValue || null,
    generated_by: "Veronica Strategic Analysis",
    generated_at: new Date().toISOString(),
  };
}

function buildBuyerPsychologyUsed(intel: ClientIntelligence | null) {
  if (!intel?.buyerProfile) return null;
  const bp = intel.buyerProfile;
  return {
    buyer_profile_summary: bp.homeownerProfile ?? null,
    primary_buyer_type: bp.primaryBuyerType ?? null,
    buying_motivations: bp.buyingMotivations ?? [],
    common_fears: bp.commonFears ?? [],
    urgency_triggers: bp.urgencyTriggers ?? [],
    trust_triggers: bp.trustTriggers ?? [],
    reasons_they_delay: bp.reasonsTheyDelay ?? [],
    why_they_choose: bp.whyTheyChoose ?? [],
  };
}

function buildMarketResearchUsed(intel: ClientIntelligence | null) {
  if (!intel?.marketResearch) return null;
  const mr = intel.marketResearch;
  return {
    primary_market: mr.primaryMarket ?? null,
    service_areas: mr.serviceAreas ?? [],
    high_value_neighborhoods: mr.highValueNeighborhoods ?? [],
    opportunities: mr.opportunities ?? [],
    risks: mr.risks ?? [],
    main_competitors: mr.mainCompetitors ?? [],
    competitor_weaknesses: mr.competitorWeaknesses ?? [],
    seasonality: mr.seasonality ?? null,
    local_market_notes: mr.localMarketNotes ?? null,
  };
}

function buildClientIntelligenceUsed(intel: ClientIntelligence | null) {
  if (!intel) return { available: false };
  return {
    available: true,
    extracted_at: intel.extractedAt ?? null,
    onboarding_summary_excerpt: (intel.onboardingSummary ?? "").slice(0, 500),
    key_objections: intel.buyerProfile?.commonObjections ?? [],
    trust_triggers: intel.buyerProfile?.trustTriggers ?? [],
    guarantees: intel.offerIntelligence?.guarantees ?? [],
    proof_points: intel.offerIntelligence?.proofPoints ?? [],
    best_sales_angles: intel.salesIntelligence?.bestSalesAngles ?? [],
    main_offer: intel.offerIntelligence?.mainOffer ?? null,
    financing_available: intel.offerIntelligence?.financingAvailable ?? null,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { role: serverRole, userId } = auth;

  // ── 2. Permission ─────────────────────────────────────────────────────────
  // Campaign draft creation requires AI builder + strategy data access.
  // Setters and client_viewers cannot create campaign drafts.
  if (!can(serverRole, "canViewAiBuilder") || !can(serverRole, "canViewStrategyData")) {
    return NextResponse.json(
      { error: "Forbidden — admin or media_buyer role required to create campaign drafts from Veronica" },
      { status: 403 }
    );
  }

  // ── 3. Parse body ─────────────────────────────────────────────────────────
  let body: { clientId: string; sourcePrompt?: string; agentsUsed?: string[]; creativeAssetId?: string | null; creativeAssetIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const safeClientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  if (!safeClientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }
  const safeSourcePrompt =
    typeof body.sourcePrompt === "string" ? body.sourcePrompt.slice(0, 500) : null;

  // Support both creativeAssetId (single, legacy) and creativeAssetIds (multi, Phase 2)
  const rawCreativeAssetIds: string[] = [];
  if (Array.isArray(body.creativeAssetIds)) {
    for (const id of body.creativeAssetIds) {
      if (typeof id === "string" && id.trim()) rawCreativeAssetIds.push(id.trim());
    }
  } else if (typeof body.creativeAssetId === "string" && body.creativeAssetId.trim()) {
    rawCreativeAssetIds.push(body.creativeAssetId.trim());
  }
  // Deduplicate and cap at 10 assets
  const dedupedAssetIds = [...new Set(rawCreativeAssetIds)].slice(0, 10);
  // Keep legacy single for backward compat
  const rawCreativeAssetId = dedupedAssetIds[0] ?? null;

  // ── 4. Load client + intelligence from Supabase (service role) ────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseServerClient() as any;

  // Mock mode — no Supabase configured
  if (!supabase) {
    return NextResponse.json({
      success: true,
      mockMode: true,
      id: `mock-draft-${Date.now()}`,
      campaignName: "Campaign Draft (Mock Mode — Supabase not configured)",
    });
  }

  try {
    const [clientResult, intelResult] = await Promise.all([
      supabase.from("clients").select("*").eq("id", safeClientId).single(),
      supabase.from("client_intelligence").select("*").eq("client_id", safeClientId).single(),
    ]);

    if (clientResult.error || !clientResult.data) {
      console.error("[POST /api/campaign-drafts/from-veronica] client not found:", safeClientId, clientResult.error);
      return NextResponse.json({ error: `Client not found: ${safeClientId}` }, { status: 404 });
    }

    const client = mapClientRow(clientResult.data);
    const intelligence: ClientIntelligence | null =
      intelResult.data && !intelResult.error
        ? mapIntelligenceRow(safeClientId, intelResult.data)
        : null;

    // ── 4b. Validate all creative_asset_ids belong to this client ────────
    // Fetch full rows so we can build per-asset copy. If validation fails for
    // an asset, null it out — draft creation is not blocked by missing assets.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type AssetRow = { id: string; file_name: string; asset_type: string | null; file_type: string | null; approved_for_ads: boolean; notes: string | null };
    let validatedAssetRows: AssetRow[] = [];
    if (dedupedAssetIds.length > 0) {
      const { data: assetRows, error: assetError } = await supabase
        .from("creative_assets")
        .select("id, file_name, asset_type, file_type, approved_for_ads, notes")
        .in("id", dedupedAssetIds)
        .eq("client_id", safeClientId);
      if (!assetError && assetRows) {
        validatedAssetRows = assetRows as AssetRow[];
      } else {
        console.warn("[POST /api/campaign-drafts/from-veronica] asset validation error:", assetError?.message ?? "no rows");
      }
    }
    // Primary asset ID — first validated (preserves submission order best-effort)
    const safeCreativeAssetId = dedupedAssetIds.find((id) => validatedAssetRows.some((r) => r.id === id)) ?? null;

    // ── 5. Build ClientBrain + run agents ─────────────────────────────────
    const ctx: VeronicaPortalContext = {
      userRole: serverRole,
      clients: [client],
      approvals: [],
      campaignDrafts: [],
      reports: [],
      clientIntelligence: intelligence,
    };

    const brain = buildClientBrain(client, ctx);
    const clientIntelOut = runClientIntelligenceAgent(brain);
    const offerOut = runOfferMessagingAgent(brain);
    const complianceOut = runComplianceRiskAgent(brain, []);
    const ghlOut = runGhlWorkflowBuilderAgent(brain);
    const launchOut = runLaunchReadinessAgent(brain);

    // ── 6. Assemble the structured draft ──────────────────────────────────
    const date = new Date().toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
    const service = client.services[0] ?? "Home Services";
    const market = client.market || intelligence?.serviceArea?.radius || "Service Area";
    const campaignName = `${client.name} — ${service} — ${market} — ${date}`;

    // ── 6a. Build per-asset ad copy variations (Phase 2 — multi-asset matrix) ─
    // Order preserved from submission; first validated asset is primary.
    const adVariations =
      validatedAssetRows.length > 0
        ? validatedAssetRows.map((row, i) =>
            buildAssetAdVariation(
              {
                id: row.id,
                fileName: row.file_name,
                assetType: row.asset_type ?? "Photo",
                fileType: row.file_type === "video" ? "video" : "image",
                approvedForAds: row.approved_for_ads,
                notes: row.notes ?? undefined,
              },
              service,
              intelligence,
              i === 0
            )
          )
        : undefined;

    const selectedAssetsMeta =
      validatedAssetRows.length > 0
        ? validatedAssetRows.map((r) => ({
            id: r.id,
            file_name: r.file_name,
            asset_type: r.asset_type ?? null,
            file_type: r.file_type ?? null,
            approved_for_ads: r.approved_for_ads,
          }))
        : undefined;

    const draftInsert = {
      client_id: safeClientId,
      campaign_name: campaignName,
      market,
      service,
      goal: "Lead Generation",
      budget: client.monthlyBudget || "$2,000/mo",
      creative_type: null as string | null,
      creative_asset_id: safeCreativeAssetId,
      status: "needs_review" as const,
      approval_status: "needs_review" as const,
      meta_campaign_structure: buildMetaCampaignStructure(client, intelligence),
      ad_copy: {
        ...buildAdCopy(intelligence, offerOut, clientIntelOut),
        ...(adVariations ? { asset_variations: adVariations } : {}),
      },
      lead_form: buildLeadForm(intelligence, client),
      ghl_workflow: buildGHLWorkflow(ghlOut),
      creative_direction: {
        ...buildCreativeDirection(intelligence),
        ...(selectedAssetsMeta ? { selected_assets: selectedAssetsMeta } : {}),
      },
      compliance_check: buildComplianceCheck(complianceOut, intelligence),
      optimization_rules: null,
      buyer_psychology_used: buildBuyerPsychologyUsed(intelligence),
      market_research_used: buildMarketResearchUsed(intelligence),
      client_intelligence_used: buildClientIntelligenceUsed(intelligence),
      creative_intelligence_used: null,
      strategic_rationale: buildStrategicRationale(client, intelligence, launchOut, clientIntelOut),
      created_by: userId,
    };

    // ── 7. Insert into campaign_drafts ────────────────────────────────────
    const { data: draftData, error: draftError } = await supabase
      .from("campaign_drafts")
      .insert(draftInsert)
      .select("id")
      .single();

    if (draftError) {
      console.error("[POST /api/campaign-drafts/from-veronica] draft insert:", draftError);
      return NextResponse.json({ error: "Failed to save campaign draft" }, { status: 500 });
    }

    // ── 8. Create an approvals record so /approvals surfaces the draft ─────
    // Non-blocking — log error but don't fail the response
    supabase
      .from("approvals")
      .insert({
        client_id: safeClientId,
        related_type: "campaign_draft",
        related_id: draftData.id,
        approval_type: "campaign_draft",
        title: campaignName,
        description: `Veronica-generated campaign draft for ${market} — ${service}. Review all sections and approve before Meta launch.${safeSourcePrompt ? ` Source prompt: "${safeSourcePrompt}"` : ""}`,
        risk_level: "medium" as const,
        status: "pending" as const,
        requested_by: userId,
        reviewed_by: null,
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        notes: null,
      })
      .then(({ error }: { error: unknown }) => {
        if (error) {
          console.error("[POST /api/campaign-drafts/from-veronica] approvals insert:", error);
        }
      });

    return NextResponse.json({
      success: true,
      id: draftData.id,
      campaignName,
      detectedClientName: client.name,
    });
  } catch (err) {
    console.error("[POST /api/campaign-drafts/from-veronica]", err);
    return NextResponse.json({ error: "Unexpected error creating campaign draft" }, { status: 500 });
  }
}
