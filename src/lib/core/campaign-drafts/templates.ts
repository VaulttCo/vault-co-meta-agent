// Vault Core — Meta Campaign DRAFT templates (Phase 9.5). PURE / static.
//
// Starter campaign PLANS for common Vault Co roofing/remodeling offers. Every template
// is draft-only (no launch, no budget change, no Meta object created). Copy uses
// {{placeholder}} tokens where client data is needed — never real data. Instantiated
// into a VaultMetaCampaignDraftInput, then re-validated/sanitized on save.

import type {
  CampaignType, CampaignAudience, CampaignAdSet, CampaignAdCopy, CampaignLeadForm,
  CampaignBudgetRecommendation, VaultMetaCampaignDraftInput,
} from "./types";

export interface CampaignTemplate {
  key: string;
  campaign_type: CampaignType;
  title: string;
  description: string;
  objective: string;
  offer_angle: string;
  audience: CampaignAudience;
  ad_sets: CampaignAdSet[];
  creative_direction: string[];
  ad_copy: CampaignAdCopy;
  lead_form: CampaignLeadForm;
  budget_recommendation: CampaignBudgetRecommendation;
  launch_checklist: string[];
  missing_inputs: string[];
  compliance_notes: string[];
  suggested_owner: string;
  notes: string;
}

const LEAD_GEN_CHECKLIST = [
  "Confirm ad account access + Business Manager assets (human-managed; not done here)",
  "Confirm pixel/CAPI + lead tracking are live before any future launch",
  "Confirm landing page / lead form privacy policy + consent language",
  "Confirm service area + budget with the client",
  "Confirm creative assets (photos/video) and brand guidelines",
  "Human approval required before anything is built in Meta",
];

const LEAD_FORM_BASE: CampaignLeadForm = {
  intro: "Get your free, no-obligation {{service_type}} assessment from {{business.name}}.",
  questions: [
    "Full name",
    "Best phone number",
    "Property address / service area",
    "What do you need help with?",
    "Best time to reach you",
  ],
  privacy_note: "Confirm a compliant privacy policy URL + consent checkbox before any future launch.",
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    key: "roof_replacement_lead_gen",
    campaign_type: "roof_replacement",
    title: "Roofing Roof Replacement Lead Gen",
    description: "Lead-generation plan for homeowners needing a full roof replacement.",
    objective: "Generate qualified roof replacement leads via Meta lead forms (draft plan).",
    offer_angle: "Free roof replacement estimate + financing options available.",
    audience: {
      description: "Homeowners 35–65 in the service area, likely older homes / aging roofs.",
      geo: "{{service_area}} (define radius around service base)",
      age_range: "35-65",
      interests: ["Homeownership", "Home improvement", "Home renovation"],
      exclusions: ["Renters", "Recent roof replacement audiences (if available)"],
    },
    ad_sets: [
      { name: "Replacement — Core homeowners", audience_summary: "Homeowners 35–65 in service area", placement: "Facebook + Instagram feeds", notes: "Lead form objective." },
      { name: "Replacement — Aging-roof angle", audience_summary: "Older-home homeowners", placement: "Advantage+ placements", notes: "Test against core set." },
    ],
    creative_direction: [
      "Before/after roof replacement photos (real jobs, with permission)",
      "Short UGC-style video walkthrough of a completed replacement",
      "Trust markers: licensed, insured, warranty, local reviews",
    ],
    ad_copy: {
      primary_texts: [
        "Is your roof past its prime? {{business.name}} replaces aging roofs with quality materials and a workmanship warranty. Get your free estimate today.",
        "A failing roof only gets more expensive. Get a free, no-pressure replacement estimate from {{business.name}} — financing options available.",
      ],
      headlines: ["Free Roof Replacement Estimate", "Quality Roof Replacement, Done Right", "Protect Your Home — New Roof"],
      descriptions: ["Licensed, insured, locally trusted.", "Financing options available."],
    },
    lead_form: LEAD_FORM_BASE,
    budget_recommendation: {
      recommended_daily: "$50–$100/day (internal guidance — confirm with client)",
      recommended_total: "Test 2–4 weeks before scaling",
      pacing_notes: "Start conservative; scale on CPL + lead quality. Internal advisory only — no live budget is set.",
      notes: "Never a live budget change — this is a recommendation for a human to apply later.",
    },
    launch_checklist: LEAD_GEN_CHECKLIST,
    missing_inputs: ["Service area radius", "Financing details/terms", "Real job photos", "Warranty terms"],
    compliance_notes: ["Warranty + financing claims must be accurate and substantiated."],
    suggested_owner: "Veronica (lead gen structure) + Vega (tracking/budget review)",
    notes: "Workhorse offer. Lead with the free estimate, support with trust + financing.",
  },
  {
    key: "roof_repair_lead_gen",
    campaign_type: "roof_repair",
    title: "Roofing Roof Repair Lead Gen",
    description: "Lead-generation plan for homeowners needing roof repairs (leaks, missing shingles).",
    objective: "Generate roof repair leads via Meta lead forms (draft plan).",
    offer_angle: "Fast, affordable roof repair — free inspection to diagnose the issue.",
    audience: {
      description: "Homeowners in service area with active repair intent (leaks, storm damage).",
      geo: "{{service_area}}",
      age_range: "30-65",
      interests: ["Homeownership", "Home maintenance"],
      exclusions: ["Renters"],
    },
    ad_sets: [
      { name: "Repair — Core homeowners", audience_summary: "Homeowners in service area", placement: "Facebook + Instagram feeds", notes: "Lead form objective." },
    ],
    creative_direction: [
      "Close-up photos of common roof problems (leaks, missing shingles)",
      "Reassuring, fast-response tone",
      "Local + responsive trust markers",
    ],
    ad_copy: {
      primary_texts: [
        "Roof leak or missing shingles? {{business.name}} offers fast, affordable repairs. Book your free inspection today.",
        "Small roof problems become big ones fast. Get a free inspection from {{business.name}} and fix it before it spreads.",
      ],
      headlines: ["Free Roof Inspection", "Fast, Affordable Roof Repair", "Stop the Leak — Book Today"],
      descriptions: ["Licensed & insured.", "Same-week inspections (confirm availability)."],
    },
    lead_form: LEAD_FORM_BASE,
    budget_recommendation: {
      recommended_daily: "$30–$60/day (internal guidance)",
      recommended_total: "Ongoing, adjust on lead flow",
      pacing_notes: "Repair intent converts fast; watch response time. Internal advisory only.",
      notes: "Recommendation only — no live budget is set.",
    },
    launch_checklist: LEAD_GEN_CHECKLIST,
    missing_inputs: ["Service area", "Inspection availability/SLA", "Repair photos"],
    compliance_notes: ["Avoid guaranteeing repair outcomes; keep claims accurate."],
    suggested_owner: "Veronica (lead gen) + Vivian (client readiness)",
    notes: "Speed-to-lead matters most for repair intent — pair with a fast follow-up plan.",
  },
  {
    key: "storm_damage_inspection",
    campaign_type: "storm_damage",
    title: "Storm Damage Inspection Offer",
    description: "Post-storm lead-gen plan offering a free storm damage inspection.",
    objective: "Generate storm damage inspection leads in affected areas (draft plan).",
    offer_angle: "Free storm damage inspection — know if you have a claim before it's too late.",
    audience: {
      description: "Homeowners in recently storm-affected zip codes.",
      geo: "{{storm_affected_area}} (define recently affected zips)",
      age_range: "30-70",
      interests: ["Homeownership"],
      exclusions: ["Renters"],
    },
    ad_sets: [
      { name: "Storm — Affected area", audience_summary: "Homeowners in affected zips", placement: "Facebook + Instagram feeds", notes: "Geo-tight; timeliness matters." },
    ],
    creative_direction: [
      "Storm/hail damage imagery (real, with permission)",
      "Urgency without fear-mongering; helpful + factual",
      "Insurance-savvy positioning (no claim guarantees)",
    ],
    ad_copy: {
      primary_texts: [
        "Recent storms in {{storm_affected_area}}? Hidden roof damage can lead to costly leaks. {{business.name}} offers a free storm damage inspection.",
        "Don't wait until the next rain. Get a free, no-obligation storm damage inspection from {{business.name}}.",
      ],
      headlines: ["Free Storm Damage Inspection", "Storm Hit? Check Your Roof", "Free Roof Storm Check"],
      descriptions: ["Licensed & insured.", "Honest assessment, no pressure."],
    },
    lead_form: { ...LEAD_FORM_BASE, intro: "Free storm damage inspection from {{business.name}}. We'll assess your roof honestly — no pressure." },
    budget_recommendation: {
      recommended_daily: "$60–$150/day during active storm window (internal guidance)",
      recommended_total: "Time-boxed to storm window",
      pacing_notes: "Storm campaigns are time-sensitive; scale fast then taper. Internal advisory only.",
      notes: "Recommendation only — no live budget is set.",
    },
    launch_checklist: [...LEAD_GEN_CHECKLIST, "Confirm affected zip list + storm date is current"],
    missing_inputs: ["Affected zip codes", "Storm date", "Inspection capacity"],
    compliance_notes: [
      "Do NOT guarantee insurance claim approval or outcomes.",
      "Follow local post-storm solicitation rules and licensing.",
    ],
    suggested_owner: "Valentina (timing/angle) + Veronica (lead gen)",
    notes: "Highly time-sensitive. Keep insurance language compliant and non-guaranteeing.",
  },
  {
    key: "free_roof_inspection",
    campaign_type: "inspection_offer",
    title: "Free Roof Inspection Offer",
    description: "Evergreen free-inspection lead magnet for general roof intent.",
    objective: "Generate inspection leads as a low-friction entry offer (draft plan).",
    offer_angle: "Free, no-obligation roof inspection — know the real condition of your roof.",
    audience: {
      description: "Broad homeowner audience in service area.",
      geo: "{{service_area}}",
      age_range: "30-65",
      interests: ["Homeownership", "Home improvement"],
      exclusions: ["Renters"],
    },
    ad_sets: [
      { name: "Inspection — Broad homeowners", audience_summary: "Homeowners in service area", placement: "Advantage+ placements", notes: "Low-friction lead form." },
    ],
    creative_direction: [
      "Friendly inspector at a home; approachable tone",
      "Emphasize 'free' + 'no obligation'",
      "Simple, clean, trust-forward",
    ],
    ad_copy: {
      primary_texts: [
        "When did you last have your roof checked? {{business.name}} offers a free, no-obligation inspection. Book in 30 seconds.",
        "Peace of mind starts with knowing. Get a free roof inspection from {{business.name}}.",
      ],
      headlines: ["Free Roof Inspection", "Book Your Free Roof Check", "No-Obligation Roof Inspection"],
      descriptions: ["Licensed & insured.", "Quick, honest, free."],
    },
    lead_form: LEAD_FORM_BASE,
    budget_recommendation: {
      recommended_daily: "$30–$70/day (internal guidance)",
      recommended_total: "Evergreen, adjust on CPL",
      pacing_notes: "Low-friction offer; expect higher lead volume + lower intent. Internal advisory only.",
      notes: "Recommendation only — no live budget is set.",
    },
    launch_checklist: LEAD_GEN_CHECKLIST,
    missing_inputs: ["Service area", "Inspection availability"],
    compliance_notes: ["'Free' must be genuinely free with no hidden conditions."],
    suggested_owner: "Veronica (lead gen) + Vega (CPL/quality review)",
    notes: "Great top-of-funnel offer; qualify hard on follow-up.",
  },
  {
    key: "financing_roof_replacement",
    campaign_type: "financing_offer",
    title: "Financing-Focused Roof Replacement",
    description: "Roof replacement plan led by affordable monthly financing.",
    objective: "Generate replacement leads using financing/affordability as the hook (draft plan).",
    offer_angle: "New roof for an affordable monthly payment — financing options available.",
    audience: {
      description: "Homeowners in service area who may need replacement but worry about cost.",
      geo: "{{service_area}}",
      age_range: "35-65",
      interests: ["Homeownership", "Personal finance", "Home improvement"],
      exclusions: ["Renters"],
    },
    ad_sets: [
      { name: "Financing — Affordability angle", audience_summary: "Cost-conscious homeowners", placement: "Facebook + Instagram feeds", notes: "Lead with monthly payment framing." },
    ],
    creative_direction: [
      "Calm, reassuring tone around affordability",
      "Show monthly-payment framing (no specific unverified numbers)",
      "Quality roof imagery + trust markers",
    ],
    ad_copy: {
      primary_texts: [
        "A new roof doesn't have to break the bank. {{business.name}} offers financing options to fit your budget. Get a free estimate.",
        "Worried about the cost of a new roof? Ask {{business.name}} about flexible financing. Free estimate, no pressure.",
      ],
      headlines: ["Affordable Roof Financing", "New Roof, Flexible Payments", "Free Estimate + Financing"],
      descriptions: ["Financing options available.", "Licensed & insured."],
    },
    lead_form: { ...LEAD_FORM_BASE, intro: "Ask {{business.name}} about flexible financing for your new roof. Free estimate, no obligation." },
    budget_recommendation: {
      recommended_daily: "$50–$100/day (internal guidance)",
      recommended_total: "Test 2–4 weeks",
      pacing_notes: "Financing angle widens the audience; watch lead quality. Internal advisory only.",
      notes: "Recommendation only — no live budget is set.",
    },
    launch_checklist: [...LEAD_GEN_CHECKLIST, "Confirm lender + exact financing terms before any future launch"],
    missing_inputs: ["Lender/financing terms (APR, qualifying)", "Service area", "Job photos"],
    compliance_notes: [
      "APR/terms disclosures + lender compliance required before any future launch.",
      "Do not advertise specific rates/payments without substantiation.",
    ],
    suggested_owner: "Valerie (financing/revenue context) + Veronica (lead gen)",
    notes: "Powerful for fence-sitters; financing claims must be airtight.",
  },
  {
    key: "retargeting_estimate_follow_up",
    campaign_type: "retargeting",
    title: "Retargeting Estimate Follow-Up",
    description: "Retargeting plan to re-engage people who engaged but didn't convert.",
    objective: "Re-engage warm audiences (site/lead-form/video engagers) to complete an estimate (draft plan).",
    offer_angle: "Still thinking about your roof? Let's finish your free estimate.",
    audience: {
      description: "Warm custom audiences: site visitors, lead-form openers, video viewers, page engagers (use only audiences the client already owns).",
      geo: "{{service_area}}",
      age_range: "30-65",
      interests: [],
      exclusions: ["Existing converted leads (if list available)"],
    },
    ad_sets: [
      { name: "Retargeting — Engagers", audience_summary: "Warm engagers / site visitors", placement: "Facebook + Instagram feeds", notes: "Frequency-capped; use existing client-owned audiences only." },
    ],
    creative_direction: [
      "Reminder tone; reduce friction",
      "Address common objections (cost, timing, trust)",
      "Strong social proof / reviews",
    ],
    ad_copy: {
      primary_texts: [
        "Still thinking about your roof? {{business.name}} is here when you're ready. Pick up where you left off — free estimate, no pressure.",
        "No rush — but your roof won't wait forever. Finish your free estimate with {{business.name}}.",
      ],
      headlines: ["Finish Your Free Estimate", "Still Need a Roofer?", "We're Here When You're Ready"],
      descriptions: ["Licensed & insured.", "Trusted by local homeowners."],
    },
    lead_form: LEAD_FORM_BASE,
    budget_recommendation: {
      recommended_daily: "$15–$40/day (internal guidance)",
      recommended_total: "Ongoing support layer",
      pacing_notes: "Smaller budget; retargeting is a support layer, not primary acquisition. Internal advisory only.",
      notes: "Recommendation only — no live budget is set.",
    },
    launch_checklist: [...LEAD_GEN_CHECKLIST, "Confirm the client already owns the custom audiences (no scraping / no new data sourcing)"],
    missing_inputs: ["Existing custom audiences", "Frequency cap preference"],
    compliance_notes: ["Use only audiences the client already owns; respect frequency + data-use rules."],
    suggested_owner: "Vega (audience/tracking) + Veronica (copy)",
    notes: "Cheap, high-ROI layer once primary campaigns generate engagement.",
  },
  {
    key: "reactivation_past_leads",
    campaign_type: "reactivation",
    title: "Reactivation Past Leads",
    description: "Plan to re-engage old/cold leads using a fresh hook (client-owned lists only).",
    objective: "Re-warm past leads the client already owns with a new offer (draft plan).",
    offer_angle: "It's been a while — your free roof estimate is still on us.",
    audience: {
      description: "Client-owned past-lead lists / customer-file custom audiences only. No new data sourcing.",
      geo: "{{service_area}}",
      age_range: "30-70",
      interests: [],
      exclusions: ["Recently converted customers"],
    },
    ad_sets: [
      { name: "Reactivation — Past leads", audience_summary: "Client-owned past-lead list", placement: "Facebook + Instagram feeds", notes: "Suppress recent converters; client-owned data only." },
    ],
    creative_direction: [
      "Warm, no-pressure re-introduction",
      "Fresh hook or seasonal reason to act",
      "Reassure with updated reviews / recent work",
    ],
    ad_copy: {
      primary_texts: [
        "It's been a while! {{business.name}} is still here for your roof. Your free estimate is on us whenever you're ready.",
        "Roof still on your to-do list? Let's knock it out. Free estimate from {{business.name}} — no pressure.",
      ],
      headlines: ["Your Free Estimate Awaits", "Let's Finish Your Roof", "Still Here For You"],
      descriptions: ["Licensed & insured.", "No pressure, just help."],
    },
    lead_form: LEAD_FORM_BASE,
    budget_recommendation: {
      recommended_daily: "$15–$35/day (internal guidance)",
      recommended_total: "Short burst against the list",
      pacing_notes: "List-size dependent; run in bursts. Internal advisory only.",
      notes: "Recommendation only — no live budget is set.",
    },
    launch_checklist: [...LEAD_GEN_CHECKLIST, "Confirm the past-lead list is client-owned + consent/opt-out compliant"],
    missing_inputs: ["Client-owned past-lead list", "Suppression list", "Consent/opt-out status"],
    compliance_notes: ["Use only client-owned lists; confirm consent + suppression before any future launch."],
    suggested_owner: "Valentina (offer hook) + Veronica (lead gen)",
    notes: "Cheapest leads available when a usable list exists — verify data ownership first.",
  },
  {
    key: "brand_awareness_social_proof",
    campaign_type: "brand_awareness",
    title: "Brand Awareness / Social Proof",
    description: "Top-of-funnel awareness plan building trust via reviews + completed work.",
    objective: "Build local brand awareness and trust ahead of lead-gen pushes (draft plan).",
    offer_angle: "The local roofer your neighbors trust.",
    audience: {
      description: "Broad local audience in service area for awareness/reach.",
      geo: "{{service_area}}",
      age_range: "28-65",
      interests: ["Homeownership", "Local community"],
      exclusions: [],
    },
    ad_sets: [
      { name: "Awareness — Local reach", audience_summary: "Broad local homeowners", placement: "Advantage+ placements", notes: "Reach/video-views objective (not lead form)." },
    ],
    creative_direction: [
      "Real completed-job photos + happy customer stories",
      "Short testimonial / review-highlight video",
      "Community + local-pride framing",
    ],
    ad_copy: {
      primary_texts: [
        "Your neighbors trust {{business.name}} for honest, quality roofing. See why locals choose us.",
        "Quality work. Honest pricing. Local crew. That's {{business.name}}.",
      ],
      headlines: ["Locally Trusted Roofing", "Your Neighbors' Roofer", "Honest, Quality Roofing"],
      descriptions: ["Licensed & insured.", "Proudly local."],
    },
    lead_form: { intro: null, questions: [], privacy_note: "Awareness objective — typically no lead form; confirm objective before any future launch." },
    budget_recommendation: {
      recommended_daily: "$10–$30/day (internal guidance)",
      recommended_total: "Always-on brand layer",
      pacing_notes: "Awareness supports, not replaces, lead gen. Internal advisory only.",
      notes: "Recommendation only — no live budget is set.",
    },
    launch_checklist: [
      "Confirm ad account access + assets (human-managed; not done here)",
      "Confirm objective (reach / video views vs. leads)",
      "Confirm review/testimonial usage permissions",
      "Human approval required before anything is built in Meta",
    ],
    missing_inputs: ["Reviews/testimonials with permission", "Completed-job media", "Awareness objective confirmation"],
    compliance_notes: ["Use real, permissioned reviews/testimonials; no fabricated social proof."],
    suggested_owner: "Vanessa (priority/agenda) + Valentina (positioning)",
    notes: "Best paired with active lead-gen; do not expect direct leads from this layer.",
  },
  {
    key: "seasonal_promo",
    campaign_type: "seasonal_promo",
    title: "Seasonal Promo",
    description: "Time-boxed seasonal offer to drive urgency (spring/fall/end-of-year).",
    objective: "Generate leads with a seasonal, time-limited offer (draft plan).",
    offer_angle: "{{season}} roof special — limited-time offer for {{service_area}} homeowners.",
    audience: {
      description: "Homeowners in service area, seasonally relevant intent.",
      geo: "{{service_area}}",
      age_range: "30-65",
      interests: ["Homeownership", "Home improvement"],
      exclusions: ["Renters"],
    },
    ad_sets: [
      { name: "Seasonal — Core homeowners", audience_summary: "Homeowners in service area", placement: "Facebook + Instagram feeds", notes: "Time-boxed offer; clear end date." },
    ],
    creative_direction: [
      "Seasonal imagery + clear time-limited framing",
      "Specific (compliant) offer detail",
      "Trust markers + urgency without false scarcity",
    ],
    ad_copy: {
      primary_texts: [
        "{{season}} is the perfect time for a new roof. {{business.name}} has a limited-time offer for {{service_area}} homeowners — get your free estimate.",
        "Don't miss our {{season}} roof special. Free estimate from {{business.name}} — offer ends {{offer_end_date}}.",
      ],
      headlines: ["{{season}} Roof Special", "Limited-Time Roof Offer", "Free Estimate — This {{season}}"],
      descriptions: ["Licensed & insured.", "Offer ends {{offer_end_date}}."],
    },
    lead_form: LEAD_FORM_BASE,
    budget_recommendation: {
      recommended_daily: "$40–$90/day during the promo window (internal guidance)",
      recommended_total: "Time-boxed to promo window",
      pacing_notes: "Concentrate spend in the promo window. Internal advisory only.",
      notes: "Recommendation only — no live budget is set.",
    },
    launch_checklist: [...LEAD_GEN_CHECKLIST, "Confirm exact offer terms + end date are accurate"],
    missing_inputs: ["Offer details + end date", "Season", "Service area"],
    compliance_notes: ["Offer terms + end dates must be accurate; no false scarcity."],
    suggested_owner: "Vanessa (agenda) + Veronica (lead gen)",
    notes: "Urgency works — but the offer + deadline must be real.",
  },
  {
    key: "custom_campaign",
    campaign_type: "custom",
    title: "Custom Campaign",
    description: "Blank, structured starting point for a bespoke campaign plan.",
    objective: "Define the campaign objective (draft plan).",
    offer_angle: "Define the offer angle.",
    audience: {
      description: "Define the target audience.",
      geo: "{{service_area}}",
      age_range: null,
      interests: [],
      exclusions: [],
    },
    ad_sets: [
      { name: "Ad set 1", audience_summary: "Define audience", placement: "Define placements", notes: "Draft." },
    ],
    creative_direction: ["Define creative direction (formats, angle, proof)"],
    ad_copy: {
      primary_texts: ["Draft primary text here ({{placeholder}} tokens for client data)."],
      headlines: ["Draft headline"],
      descriptions: ["Draft description"],
    },
    lead_form: LEAD_FORM_BASE,
    budget_recommendation: {
      recommended_daily: "Define recommended daily (internal guidance)",
      recommended_total: null,
      pacing_notes: "Internal advisory only — no live budget is set.",
      notes: "Recommendation only.",
    },
    launch_checklist: LEAD_GEN_CHECKLIST,
    missing_inputs: ["Objective", "Audience", "Offer", "Creative", "Budget"],
    compliance_notes: [],
    suggested_owner: "Assign an owner",
    notes: "Use when none of the presets fit; fill in before review.",
  },
];

export function getCampaignTemplate(key: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((t) => t.key === key);
}

export function campaignTemplateToInput(
  t: CampaignTemplate,
  opts: { client_id?: string | null; source_agent?: string | null } = {},
): VaultMetaCampaignDraftInput {
  return {
    client_id: opts.client_id ?? null,
    title: t.title,
    description: t.description,
    campaign_type: t.campaign_type,
    source_agent: opts.source_agent ?? null,
    objective: t.objective,
    offer_angle: t.offer_angle,
    audience: t.audience,
    ad_sets: t.ad_sets,
    creative_direction: t.creative_direction,
    ad_copy: t.ad_copy,
    lead_form: t.lead_form,
    budget_recommendation: t.budget_recommendation,
    launch_checklist: t.launch_checklist,
    missing_inputs: t.missing_inputs,
    compliance_notes: t.compliance_notes,
    evidence: [`Template: ${t.title}`, `Suggested owner: ${t.suggested_owner}`, t.notes],
    metadata: { template_key: t.key, suggested_owner: t.suggested_owner },
  };
}
