// Vault Core — Meta Campaign DRAFT templates (Phase 9.5; repositioned Vault-Co-internal-first).
//
// INTERNAL-FIRST (see ../operating-principles.ts): these are PLANS for VAULT CO's OWN Meta
// ads — Vault Co acquiring agency clients (roofing & home-service business owners). They are
// NOT client roofing campaigns. Every template is draft-only (no launch, no budget change,
// no Meta object created). Copy uses {{placeholder}} tokens where data is needed — never
// real data. Instantiated into a VaultMetaCampaignDraftInput, re-validated/sanitized on save.

import { INTERNAL_FIRST_DEFAULTS } from "../operating-principles";
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

// Vault Co's OWN acquisition checklist — for Vault Co's ad account, not a client's.
const LEAD_GEN_CHECKLIST = [
  "Confirm Vault Co ad account + Business Manager assets (human-managed; not done here)",
  "Confirm Vault Co pixel/CAPI + lead tracking are live before any future launch",
  "Confirm Vault Co landing page / lead form privacy policy + consent language",
  "Confirm Vault Co target market + budget",
  "Confirm Vault Co creative assets (founder footage, proof, case studies) + brand guidelines",
  "Human approval required before anything is built in Meta",
];

// Vault Co's OWN audience — the agency-client prospects Vault Co wants to acquire.
const OWNER_AUDIENCE: CampaignAudience = {
  description: "Roofing & home-service business owners ($500k–$5M+) running some marketing but with inconsistent lead flow, missed calls, slow follow-up, no-shows, or poor lead quality.",
  geo: "{{target_markets}} (define US home-service states/metros)",
  age_range: "30-60",
  interests: ["Small business owner", "Roofing", "Home services / contractors", "Entrepreneurship", "GoHighLevel", "Facebook advertising"],
  exclusions: ["Existing Vault Co clients", "Other marketing agencies (optional)"],
};

// Vault Co's OWN lead form — qualifies an agency prospect, not a homeowner.
const OWNER_LEAD_FORM: CampaignLeadForm = {
  intro: "See how Vault Co turns ad spend into booked, qualified appointments for home-service businesses. A few quick questions, then we'll map your plan.",
  questions: [
    "Business name",
    "What service do you offer?",
    "Roughly how many leads / jobs per month right now?",
    "Biggest bottleneck (missed calls / slow follow-up / lead quality / no-shows)?",
    "Best phone number + time to reach you",
  ],
  privacy_note: "Confirm a compliant privacy policy URL + consent checkbox before any future launch.",
};

const BUDGET = (daily: string, total: string, pacing: string): CampaignBudgetRecommendation => ({
  recommended_daily: daily, recommended_total: total, pacing_notes: pacing,
  notes: "Internal advisory only — never a live budget change. A human applies budgets later in Meta directly.",
});

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    key: "vaultco_roofing_contractor_lead_gen",
    campaign_type: "roofing_lead_generation",
    title: "Vault Co Roofing Contractor Lead Gen",
    description: "Vault Co's own lead-gen plan to acquire roofing contractors as agency clients.",
    objective: "Generate qualified roofing-owner leads for Vault Co via Meta lead forms (draft plan).",
    offer_angle: "Turn missed calls and slow follow-up into booked, qualified roofing jobs — done-for-you ads + AI follow-up.",
    audience: OWNER_AUDIENCE,
    ad_sets: [
      { name: "Owners — Core", audience_summary: "Roofing owners $500k–$5M+ in target markets", placement: "Facebook + Instagram feeds", notes: "Lead form objective." },
      { name: "Owners — Pain-point (missed calls)", audience_summary: "Owners frustrated with missed calls / slow follow-up", placement: "Advantage+ placements", notes: "Test vs. core." },
    ],
    creative_direction: [
      "Founder-led, operator-to-operator tone (not 'agency' fluff)",
      "Show the booked-appointment system + speed-to-lead in action",
      "Proof: tracked show-rate, real results framing (no raw client data)",
    ],
    ad_copy: {
      primary_texts: [
        "Roofers: stop losing jobs to missed calls and slow follow-up. Vault Co installs a booked-appointment system — ads + AI follow-up — and runs it like an operator. Book a call to see your plan.",
        "You don't need more 'leads.' You need booked, qualified appointments. That's what Vault Co builds for roofing businesses. Free strategy call.",
      ],
      headlines: ["Booked Roofing Jobs, On Autopilot", "Ads + AI Follow-Up That Books Jobs", "Stop Losing Jobs to Slow Follow-Up"],
      descriptions: ["Done-for-you. Operator-run.", "Booked appointments, not vanity leads."],
    },
    lead_form: OWNER_LEAD_FORM,
    budget_recommendation: BUDGET("$50–$150/day (internal guidance)", "Test 2–4 weeks before scaling", "Start conservative; scale on cost-per-booked-call + lead quality. Internal advisory only."),
    launch_checklist: LEAD_GEN_CHECKLIST,
    missing_inputs: ["Target markets/states", "Founder/proof footage", "Offer + pricing framing", "Booking calendar"],
    compliance_notes: ["Results framing must be accurate + non-misleading; no income/earnings guarantees."],
    suggested_owner: "Veronica (Vault Co ad creative) + Vega (tracking/budget review)",
    notes: "Vault Co's flagship acquisition campaign. Lead with the booked-appointment outcome.",
  },
  {
    key: "vaultco_booked_calls_for_roofers",
    campaign_type: "roofing_lead_generation",
    title: "Vault Co Booked Calls for Roofers Campaign",
    description: "Vault Co campaign optimized for booked discovery calls with roofing owners.",
    objective: "Book qualified strategy calls with roofing owners for Vault Co (draft plan).",
    offer_angle: "Free strategy call: we'll map exactly how to book more roofing jobs from your ad spend.",
    audience: OWNER_AUDIENCE,
    ad_sets: [
      { name: "Booked calls — Core owners", audience_summary: "Roofing owners in target markets", placement: "Facebook + Instagram feeds", notes: "Optimize for booked calls / quality leads." },
    ],
    creative_direction: [
      "Direct CTA to book a strategy call",
      "Quantify the cost of an empty calendar / inconsistent lead flow",
      "Calm authority — operator talking to operator",
    ],
    ad_copy: {
      primary_texts: [
        "Roofing owners: book a free strategy call with Vault Co and we'll map how to turn your ad spend into booked, qualified jobs — with speed-to-lead and AI follow-up built in.",
        "An empty calendar is expensive. Book a call — we'll show you the booked-appointment system Vault Co runs for roofers.",
      ],
      headlines: ["Book Your Free Strategy Call", "Map Your Booked-Jobs Plan", "Roofing Growth, Systemized"],
      descriptions: ["Operator-run, not a vendor.", "Booked appointments, tracked."],
    },
    lead_form: OWNER_LEAD_FORM,
    budget_recommendation: BUDGET("$40–$120/day (internal guidance)", "Ongoing; scale on booked-call rate", "Watch cost-per-booked-call + show-rate. Internal advisory only."),
    launch_checklist: LEAD_GEN_CHECKLIST,
    missing_inputs: ["Booking calendar/SLA", "Qualifying criteria", "Target markets"],
    compliance_notes: ["No income/earnings guarantees; keep claims substantiated."],
    suggested_owner: "Veronica (lead gen) + Vanessa (priority)",
    notes: "Speed-to-lead on inbound replies is the #1 booking lever — pair with Vault Co message drafts.",
  },
  {
    key: "vaultco_case_study_proof",
    campaign_type: "brand_awareness",
    title: "Vault Co Case Study / Proof Campaign",
    description: "Vault Co proof-led campaign showcasing client results to build trust with owners.",
    objective: "Build credibility with roofing/home-service owners using Vault Co proof + case studies (draft plan).",
    offer_angle: "Real results: here's what happens when a roofer runs the Vault Co system.",
    audience: { ...OWNER_AUDIENCE, description: "Roofing/home-service owners comparing agencies or skeptical of 'lead' vendors." },
    ad_sets: [
      { name: "Proof — Owners", audience_summary: "Owners in target markets (warm + cold)", placement: "Facebook + Instagram feeds", notes: "Awareness/engagement + lead form variant." },
    ],
    creative_direction: [
      "Lead with a specific, accurate result (no raw client data/PII)",
      "Show the system behind the result, not just the number",
      "Founder/client soundbite (with permission)",
    ],
    ad_copy: {
      primary_texts: [
        "How a roofing business went from missed calls to a booked calendar with Vault Co. Real system, tracked show-rate — here's how it works.",
        "Proof over promises. See what the Vault Co booked-appointment system does for roofers.",
      ],
      headlines: ["Real Roofing Results", "Proof, Not Promises", "The System Behind the Results"],
      descriptions: ["Tracked + transparent.", "Operator-run growth."],
    },
    lead_form: OWNER_LEAD_FORM,
    budget_recommendation: BUDGET("$20–$60/day (internal guidance)", "Always-on proof layer", "Supports lead-gen; don't expect direct cheap leads. Internal advisory only."),
    launch_checklist: [...LEAD_GEN_CHECKLIST, "Confirm written permission for any client result/testimonial used"],
    missing_inputs: ["Approved case-study metrics framing", "Client usage permission"],
    compliance_notes: ["No raw client data/PII; confirm permission + accuracy before any future use."],
    suggested_owner: "Valerie (value framing) + Veronica (creative)",
    notes: "Feeds retargeting; proof compounds trust before the strategy call.",
  },
  {
    key: "vaultco_ai_follow_up_system",
    campaign_type: "roofing_lead_generation",
    title: "Vault Co AI Follow-Up System Campaign",
    description: "Vault Co campaign centered on the AI follow-up / speed-to-lead advantage.",
    objective: "Acquire owners by leading with Vault Co's AI follow-up + speed-to-lead system (draft plan).",
    offer_angle: "Your leads are leaking. Vault Co's AI follow-up replies in seconds and books the job.",
    audience: { ...OWNER_AUDIENCE, description: "Owners losing leads to slow/no follow-up; using forms or 'lead' vendors with poor conversion." },
    ad_sets: [
      { name: "Follow-up advantage — Owners", audience_summary: "Owners with slow follow-up pain", placement: "Facebook + Instagram feeds", notes: "Lead form objective." },
    ],
    creative_direction: [
      "Dramatize the leaking-lead problem (speed-to-lead gap)",
      "Show the AI follow-up replying instantly + booking",
      "Position Vault Core/Veronica as the always-on workforce (human-approved)",
    ],
    ad_copy: {
      primary_texts: [
        "Most roofing leads die in the first 5 minutes. Vault Co's AI follow-up replies instantly and books the appointment — so you stop losing jobs to slow follow-up.",
        "Speed-to-lead wins. Vault Co installs ads + an AI follow-up system that responds in seconds. Book a call to see it.",
      ],
      headlines: ["Reply in Seconds, Book More Jobs", "Stop Leaking Leads", "AI Follow-Up That Books"],
      descriptions: ["Human-approved, always-on.", "Speed-to-lead, built in."],
    },
    lead_form: OWNER_LEAD_FORM,
    budget_recommendation: BUDGET("$50–$120/day (internal guidance)", "Test 2–4 weeks", "Strong angle; watch lead quality. Internal advisory only."),
    launch_checklist: LEAD_GEN_CHECKLIST,
    missing_inputs: ["Demo footage of follow-up system", "Target markets", "Proof points"],
    compliance_notes: ["Describe AI honestly (assists + human-approved); no overhyped claims."],
    suggested_owner: "Veronica (creative) + Vega (speed-to-lead data)",
    notes: "Vault Co's sharpest differentiator — make the leaking-lead pain visceral.",
  },
  {
    key: "vaultco_competitor_differentiation",
    campaign_type: "brand_awareness",
    title: "Vault Co Competitor Differentiation Campaign",
    description: "Vault Co campaign differentiating from lead vendors and typical agencies.",
    objective: "Differentiate Vault Co from Angi/HomeAdvisor and generic agencies for owners (draft plan).",
    offer_angle: "Not shared leads. Not 'ad management.' A booked-appointment system you own.",
    audience: { ...OWNER_AUDIENCE, description: "Owners burned by shared-lead vendors (Angi/HomeAdvisor) or agencies that just 'run ads'." },
    ad_sets: [
      { name: "Differentiation — Burned owners", audience_summary: "Owners skeptical after bad agency/lead-vendor experiences", placement: "Facebook + Instagram feeds", notes: "Lead form objective." },
    ],
    creative_direction: [
      "Name the usual failure (shared leads, slow follow-up, no system) — never name/disparage a specific competitor",
      "Contrast: exclusive booked appointments vs. shared leads",
      "Operator credibility",
    ],
    ad_copy: {
      primary_texts: [
        "Tired of shared leads and agencies that just 'run ads'? Vault Co builds an exclusive booked-appointment system — ads + follow-up + booking — that you actually own.",
        "Shared leads make you compete on price. Vault Co books exclusive appointments for your business. See the difference.",
      ],
      headlines: ["Not Shared Leads", "Exclusive Booked Appointments", "More Than 'Ad Management'"],
      descriptions: ["A system you own.", "Operator-run, transparent."],
    },
    lead_form: OWNER_LEAD_FORM,
    budget_recommendation: BUDGET("$30–$80/day (internal guidance)", "Test against core lead-gen", "Resonates with burned owners. Internal advisory only."),
    launch_checklist: LEAD_GEN_CHECKLIST,
    missing_inputs: ["Approved differentiators", "Proof vs. shared-lead model"],
    compliance_notes: ["Do not name or disparage specific competitors; keep comparative claims substantiated."],
    suggested_owner: "Valentina (positioning) + Veronica (creative)",
    notes: "Differentiate on the model, not attacks.",
  },
  {
    key: "vaultco_retargeting_warm_prospects",
    campaign_type: "retargeting",
    title: "Vault Co Retargeting Warm Prospects",
    description: "Vault Co retargeting of owners who engaged with Vault Co content/ads/site.",
    objective: "Re-engage warm owners who engaged with Vault Co to book a strategy call (draft plan).",
    offer_angle: "Still thinking about fixing your lead flow? Let's map your plan.",
    audience: { ...OWNER_AUDIENCE, description: "Vault Co-owned warm audiences: site visitors, video viewers, lead-form openers, page/ad engagers.", interests: [], exclusions: ["Existing Vault Co clients", "Already-booked prospects (if list available)"] },
    ad_sets: [
      { name: "Retargeting — Engagers", audience_summary: "Vault Co-owned warm engagers", placement: "Facebook + Instagram feeds", notes: "Frequency-capped; use only Vault Co-owned audiences." },
    ],
    creative_direction: ["Reminder tone; reduce friction", "Address objections (price, trust, 'tried agencies before')", "Strong proof / founder credibility"],
    ad_copy: {
      primary_texts: [
        "Still thinking about booking more jobs? Vault Co is here when you're ready — pick up where you left off and map your booked-appointment plan.",
        "No rush — but your calendar won't fill itself. Book a quick call with Vault Co.",
      ],
      headlines: ["Finish Your Strategy Call", "Ready to Book More Jobs?", "We're Here When You're Ready"],
      descriptions: ["Operator-run growth.", "Booked appointments, tracked."],
    },
    lead_form: OWNER_LEAD_FORM,
    budget_recommendation: BUDGET("$15–$40/day (internal guidance)", "Ongoing support layer", "Cheap, high-ROI layer once primary campaigns create engagement. Internal advisory only."),
    launch_checklist: [...LEAD_GEN_CHECKLIST, "Confirm Vault Co already owns the custom audiences (no new data sourcing)"],
    missing_inputs: ["Vault Co custom audiences", "Frequency cap preference"],
    compliance_notes: ["Use only Vault Co-owned audiences; respect frequency + data-use rules."],
    suggested_owner: "Vega (audiences/tracking) + Veronica (copy)",
    notes: "Highest ROI once Vault Co's primary campaigns generate engagement.",
  },
  {
    key: "vaultco_reactivation_past_agency_leads",
    campaign_type: "reactivation",
    title: "Vault Co Reactivation Past Agency Leads",
    description: "Vault Co reactivation of past agency leads/prospects (Vault Co-owned lists only).",
    objective: "Re-warm Vault Co's past owner leads with a fresh hook (draft plan).",
    offer_angle: "It's been a while — your free Vault Co strategy call is still on us.",
    audience: { ...OWNER_AUDIENCE, description: "Vault Co-owned past-lead lists / customer-file custom audiences only. No new data sourcing.", interests: [], exclusions: ["Current Vault Co clients", "Recently engaged prospects"] },
    ad_sets: [
      { name: "Reactivation — Past leads", audience_summary: "Vault Co-owned past-lead list", placement: "Facebook + Instagram feeds", notes: "Suppress recent engagers; Vault Co-owned data only." },
    ],
    creative_direction: ["Warm, no-pressure re-introduction", "Fresh hook or new proof since last time", "Reassure with recent results"],
    ad_copy: {
      primary_texts: [
        "It's been a while! Vault Co is still booking jobs for roofing & home-service owners. Your free strategy call is on us whenever you're ready.",
        "Lead flow still on your to-do list? Let's fix it. Free Vault Co strategy call — no pressure.",
      ],
      headlines: ["Your Free Strategy Call Awaits", "Let's Fix Your Lead Flow", "Still Here For You"],
      descriptions: ["Operator-run growth.", "No pressure, just the plan."],
    },
    lead_form: OWNER_LEAD_FORM,
    budget_recommendation: BUDGET("$15–$35/day (internal guidance)", "Short burst against the list", "List-size dependent; run in bursts. Internal advisory only."),
    launch_checklist: [...LEAD_GEN_CHECKLIST, "Confirm the past-lead list is Vault Co-owned + consent/opt-out compliant"],
    missing_inputs: ["Vault Co past-lead list", "Suppression list", "Consent/opt-out status"],
    compliance_notes: ["Use only Vault Co-owned lists; confirm consent + suppression before any future launch."],
    suggested_owner: "Valentina (hook) + Veronica (lead gen)",
    notes: "Cheapest prospects available when a usable Vault Co list exists.",
  },
  {
    key: "vaultco_founder_led_authority",
    campaign_type: "brand_awareness",
    title: "Vault Co Founder-Led Authority Campaign",
    description: "Vault Co founder-led authority/awareness to build trust with owners.",
    objective: "Build Vault Co founder authority + trust ahead of acquisition pushes (draft plan).",
    offer_angle: "The operator who actually runs the system — not another faceless agency.",
    audience: { ...OWNER_AUDIENCE, description: "Roofing/home-service owners in target markets (broad awareness)." },
    ad_sets: [
      { name: "Authority — Founder content", audience_summary: "Broad owner audience", placement: "Advantage+ placements", notes: "Reach / video-views objective." },
    ],
    creative_direction: ["Founder-to-camera, operator credibility", "Teach one sharp insight (speed-to-lead, missed calls, follow-up)", "Vault Co brand palette (premium, dark)"],
    ad_copy: {
      primary_texts: [
        "Most roofing marketing fails for one reason: slow follow-up. Here's how I think about fixing it — and the system Vault Co runs to book jobs.",
        "I run the booked-appointment system for home-service businesses. Here's what actually moves the needle.",
      ],
      headlines: ["The Operator Behind Vault Co", "Roofing Growth, Straight Talk", "How We Book Jobs"],
      descriptions: ["Founder-led. Operator-run.", "No agency fluff."],
    },
    lead_form: { intro: null, questions: [], privacy_note: "Awareness objective — typically no lead form; confirm objective before any future launch." },
    budget_recommendation: BUDGET("$10–$30/day (internal guidance)", "Always-on authority layer", "Awareness supports, not replaces, lead gen. Internal advisory only."),
    launch_checklist: ["Confirm Vault Co ad account access + assets (human-managed; not done here)", "Confirm objective (reach / video views)", "Confirm founder content footage", "Human approval required before anything is built in Meta"],
    missing_inputs: ["Founder content footage", "Key teaching angles", "Awareness objective confirmation"],
    compliance_notes: ["Keep claims accurate; no income/earnings guarantees."],
    suggested_owner: "Vanessa (brand priority) + Veronica (production)",
    notes: "Authority layer; warms owners before the strategy-call ask.",
  },
  {
    key: "vaultco_offer_testing",
    campaign_type: "custom",
    title: "Vault Co Offer Testing Campaign",
    description: "Vault Co structured offer/hook test to find the strongest acquisition angle.",
    objective: "Test Vault Co offers/angles (booked calls, AI follow-up, exclusivity, risk-reversal framing) (draft plan). No income/earnings guarantees.",
    offer_angle: "Define the offer variants to test (e.g. free strategy call vs. audit vs. risk-reversal framing — never income/earnings guarantees).",
    audience: OWNER_AUDIENCE,
    ad_sets: [
      { name: "Offer A — Free strategy call", audience_summary: "Owners (core)", placement: "Facebook + Instagram feeds", notes: "Variant A." },
      { name: "Offer B — Booked-jobs audit", audience_summary: "Owners (core)", placement: "Facebook + Instagram feeds", notes: "Variant B." },
    ],
    creative_direction: ["Hold creative constant; vary the offer/hook", "Track cost-per-booked-call per variant", "Pick a winner, then scale"],
    ad_copy: {
      primary_texts: ["Define offer variant A primary text.", "Define offer variant B primary text."],
      headlines: ["Offer A headline", "Offer B headline"],
      descriptions: ["Variant A", "Variant B"],
    },
    lead_form: OWNER_LEAD_FORM,
    budget_recommendation: BUDGET("$40–$100/day split across variants (internal guidance)", "1–2 week test window", "Equal budget per variant; decide on cost-per-booked-call. Internal advisory only."),
    launch_checklist: LEAD_GEN_CHECKLIST,
    missing_inputs: ["Offer variants to test", "Success metric (cost-per-booked-call)", "Test duration"],
    compliance_notes: ["No income/earnings guarantees; keep all offer claims substantiated."],
    suggested_owner: "Vanessa (agenda) + Veronica (creative) + Vega (measurement)",
    notes: "Find the winning Vault Co offer before scaling spend.",
  },
  {
    key: "vaultco_custom_campaign",
    campaign_type: "custom",
    title: "Vault Co Custom Campaign",
    description: "Blank, structured starting point for a bespoke Vault Co acquisition campaign.",
    objective: "Define the Vault Co campaign objective (draft plan).",
    offer_angle: "Define the offer angle.",
    audience: { ...OWNER_AUDIENCE, interests: [], exclusions: ["Existing Vault Co clients"] },
    ad_sets: [{ name: "Ad set 1", audience_summary: "Define audience", placement: "Define placements", notes: "Draft." }],
    creative_direction: ["Define creative direction (formats, angle, proof)"],
    ad_copy: { primary_texts: ["Draft primary text ({{placeholder}} tokens for data)."], headlines: ["Draft headline"], descriptions: ["Draft description"] },
    lead_form: OWNER_LEAD_FORM,
    budget_recommendation: BUDGET("Define recommended daily (internal guidance)", "Define test window", "Internal advisory only — no live budget is set."),
    launch_checklist: LEAD_GEN_CHECKLIST,
    missing_inputs: ["Objective", "Audience", "Offer", "Creative", "Budget"],
    compliance_notes: [],
    suggested_owner: "Veronica (Vault Co ad creative)",
    notes: "Use when none of the presets fit. " + INTERNAL_FIRST_DEFAULTS.metaCampaigns,
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
