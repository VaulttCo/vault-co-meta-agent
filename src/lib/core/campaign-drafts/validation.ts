// Vault Core — Meta Campaign Draft validation + sanitization (Phase 9.5). PURE.
//
// Enforces draft-only safety: required fields (title, objective), allowed campaign_type,
// target_system pinned to "meta", capped/scrubbed text everywhere, NO secrets/access
// tokens, NO ad-account ids (act_…), NO live campaign/Meta numeric ids, NO raw Meta
// provider payloads, and NO launch/publish/go-live/"update budget" language (this is a
// PLAN, never an execution). Budget guidance is internal advisory text only — never a
// numeric value destined for a Meta API. Builds a sanitized safe_preview.

import { scrubText } from "../actions/validation";
import { CAMPAIGN_TYPES } from "./types";
import type {
  CampaignType, CampaignAudience, CampaignAdSet, CampaignAdCopy, CampaignLeadForm,
  CampaignBudgetRecommendation, CampaignSafePreview, VaultMetaCampaignDraftInput,
} from "./types";

const MAX_TITLE = 160;
const MAX_DESC = 600;
const MAX_FIELD = 400;
const MAX_LONG = 1000;
const MAX_LIST = 20;
const MAX_ITEM = 300;
const MAX_ADSETS = 12;

// Wording that implies a LIVE launch / external mutation — forbidden in a DRAFT.
const LAUNCH_LANGUAGE = [
  /\blaunch (the )?(campaign|ad|ads|now)\b/i,
  /\bpublish (the )?(campaign|lead form|to meta|ads?)\b/i,
  /\bpush (live|to meta|to facebook)\b/i,
  /\bgo live\b/i,
  /\bactivate (the )?campaign\b/i,
  /\bturn (the )?(campaign|ads?) on\b/i,
  /\bupdate (the )?budget\b/i,
  /\bset (the )?budget to\b/i,
  /\bcreate (a )?(live )?ad set\b/i,
  /\bcharge (the )?(card|client)\b/i,
  /\bspend now\b/i,
];
function hasLaunchLanguage(s: string): boolean {
  return LAUNCH_LANGUAGE.some((re) => re.test(s));
}

// Meta-specific redaction layered on top of scrubText: ad-account ids (act_<digits>),
// long numeric runs that look like Meta object ids (13+ digits), and bare http schemes.
function scrubMeta(s: string): string {
  return s
    .replace(/\bact_\d+/gi, "[redacted-id]")
    .replace(/\b\d{13,}\b/g, "[redacted-id]");
}
function safeUrlsOnly(s: string): string {
  return s.replace(/\b([a-z][a-z0-9+.-]*):\/\/\S+/gi, (m, scheme) => (/^https?$/i.test(scheme) ? m : "[link-removed]"));
}
function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = scrubMeta(safeUrlsOnly(scrubText(v))).slice(0, max).trim();
  return t || null;
}
function cleanList(v: unknown, max = MAX_LIST, itemMax = MAX_ITEM): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => clean(x, itemMax)).filter((x): x is string => !!x).slice(0, max);
}
function cleanRefSlug(v: unknown): string | null {
  const t = clean(v, 120);
  return t && /^[a-zA-Z0-9_:-]{1,120}$/.test(t) ? t : null;
}

function cleanAudience(v: unknown): CampaignAudience {
  const a = (v && typeof v === "object" ? v : {}) as Partial<CampaignAudience>;
  return {
    description: clean(a.description, MAX_LONG),
    geo: clean(a.geo, MAX_FIELD),
    age_range: clean(a.age_range, 60),
    interests: cleanList(a.interests),
    exclusions: cleanList(a.exclusions),
  };
}

function cleanAdSets(v: unknown): CampaignAdSet[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((raw) => {
      const s = (raw && typeof raw === "object" ? raw : {}) as Partial<CampaignAdSet>;
      const name = clean(s.name, 120);
      if (!name) return null;
      return {
        name,
        audience_summary: clean(s.audience_summary, MAX_FIELD),
        placement: clean(s.placement, MAX_FIELD),
        notes: clean(s.notes, MAX_FIELD),
      } as CampaignAdSet;
    })
    .filter((x): x is CampaignAdSet => !!x)
    .slice(0, MAX_ADSETS);
}

function cleanAdCopy(v: unknown): CampaignAdCopy {
  const c = (v && typeof v === "object" ? v : {}) as Partial<CampaignAdCopy>;
  return {
    primary_texts: cleanList(c.primary_texts),
    headlines: cleanList(c.headlines),
    descriptions: cleanList(c.descriptions),
  };
}

function cleanLeadForm(v: unknown): CampaignLeadForm {
  const f = (v && typeof v === "object" ? v : {}) as Partial<CampaignLeadForm>;
  return {
    intro: clean(f.intro, MAX_LONG),
    questions: cleanList(f.questions),
    privacy_note: clean(f.privacy_note, MAX_FIELD),
  };
}

function cleanBudget(v: unknown): CampaignBudgetRecommendation {
  const b = (v && typeof v === "object" ? v : {}) as Partial<CampaignBudgetRecommendation>;
  return {
    recommended_daily: clean(b.recommended_daily, 80),
    recommended_total: clean(b.recommended_total, 80),
    pacing_notes: clean(b.pacing_notes, MAX_FIELD),
    notes: clean(b.notes, MAX_FIELD),
  };
}

// Default compliance notes — always include a human-approval + draft-only note, plus
// lead-gen / sensitive-vertical reminders where relevant.
function complianceFor(campaign_type: CampaignType, extra: string[]): string[] {
  const notes = new Set<string>(extra);
  notes.add("Draft-only — requires human approval before any build/launch. No campaign is launched, no budget is changed, and no Meta object is created in this phase.");
  const isLeadGen = /lead_generation|inspection|repair|replacement|storm|financing|seasonal|reactivation|retargeting/.test(campaign_type);
  if (isLeadGen) {
    notes.add("Lead gen: ensure landing/lead-form privacy policy + consent language is present and accurate before any future launch.");
    notes.add("Claims (pricing, financing, warranties, storm/insurance) must be substantiated and compliant before any future launch.");
  }
  if (campaign_type === "financing_offer") {
    notes.add("Financing: APR/terms disclosures and lender compliance must be reviewed before any future launch.");
  }
  if (campaign_type === "storm_damage") {
    notes.add("Storm/insurance angle: avoid misleading insurance-claim guarantees; follow local solicitation rules.");
  }
  return [...notes].slice(0, MAX_LIST);
}

export function buildCampaignSafePreview(
  title: string, campaign_type: CampaignType, objective: string, adSets: CampaignAdSet[], offerAngle: string | null,
): CampaignSafePreview {
  const summary = `Draft Meta campaign plan: ${title} (${campaign_type.replace(/_/g, " ")}). Review only — nothing is launched, no budget is changed, and no Meta object is created in this phase.`.slice(0, 600);
  const highlights: string[] = [];
  if (offerAngle) highlights.push(`Offer: ${offerAngle}`.slice(0, 200));
  highlights.push(`${adSets.length} ad set${adSets.length === 1 ? "" : "s"} planned`);
  return {
    summary,
    campaign_type,
    objective_line: objective.slice(0, 240),
    ad_set_count: adSets.length,
    highlights: highlights.slice(0, 6),
  };
}

export interface CampaignValidationResult {
  ok: boolean;
  error?: string;
  value?: {
    client_id: string | null;
    title: string;
    description: string | null;
    campaign_type: CampaignType;
    source_agent: string | null;
    source_action_id: string | null;
    source_competitor_profile_id: string | null;
    objective: string;
    offer_angle: string | null;
    audience: CampaignAudience;
    ad_sets: CampaignAdSet[];
    creative_direction: string[];
    ad_copy: CampaignAdCopy;
    lead_form: CampaignLeadForm;
    budget_recommendation: CampaignBudgetRecommendation;
    launch_checklist: string[];
    missing_inputs: string[];
    compliance_notes: string[];
    evidence: string[];
    safe_preview: CampaignSafePreview;
  };
}

export function validateCampaignDraftInput(body: unknown): CampaignValidationResult {
  const b = (body && typeof body === "object" ? body : {}) as VaultMetaCampaignDraftInput;

  const campaign_type = CAMPAIGN_TYPES.includes(b.campaign_type as CampaignType) ? (b.campaign_type as CampaignType) : null;
  if (!campaign_type) return { ok: false, error: "valid campaign_type is required" };

  // target_system, if provided, must be "meta" — there is no other lane for a campaign.
  if (typeof (b as { target_system?: unknown }).target_system === "string" && (b as { target_system?: string }).target_system !== "meta") {
    return { ok: false, error: "target_system must be 'meta'" };
  }

  const title = clean(b.title, MAX_TITLE);
  if (!title) return { ok: false, error: "title is required" };

  const objective = clean(b.objective, MAX_FIELD);
  if (!objective) return { ok: false, error: "objective is required" };

  // Sanitize EVERY user-controlled text field ONCE here so the launch-language scan and
  // the returned value use the same sanitized objects (no inconsistent re-sanitization).
  const offer_angle = clean(b.offer_angle, MAX_FIELD);
  const description = clean(b.description, MAX_DESC);
  const creative_direction = cleanList(b.creative_direction);
  const ad_sets = cleanAdSets(b.ad_sets);
  const ad_copy = cleanAdCopy(b.ad_copy);
  const lead_form = cleanLeadForm(b.lead_form);
  const audience = cleanAudience(b.audience);
  const budget_recommendation = cleanBudget(b.budget_recommendation);
  const launch_checklist = cleanList(b.launch_checklist);
  const missing_inputs = cleanList(b.missing_inputs);
  // Scan the USER-provided compliance notes (the system defaults from complianceFor are
  // safe and intentionally contain benign words like "before any future launch").
  const userComplianceNotes = cleanList(b.compliance_notes);
  const evidence = cleanList(b.evidence);

  // Reject any live-launch / budget-mutation language across ALL human-authored surfaces
  // before storage — advisory strings like "$50–$100/day" stay allowed; phrases like
  // "publish to Meta now" / "set budget to" / "create ad set" are rejected no matter
  // which field they were placed in (incl. audience, lead form, checklist, notes, etc.).
  const corpus = [
    title, objective, offer_angle ?? "", description ?? "",
    ...creative_direction, ...ad_copy.primary_texts, ...ad_copy.headlines, ...ad_copy.descriptions,
    ...ad_sets.flatMap((s) => [s.name, s.notes ?? "", s.placement ?? "", s.audience_summary ?? ""]),
    budget_recommendation.recommended_daily ?? "", budget_recommendation.recommended_total ?? "",
    budget_recommendation.pacing_notes ?? "", budget_recommendation.notes ?? "",
    audience.description ?? "", audience.geo ?? "", audience.age_range ?? "",
    ...audience.interests, ...audience.exclusions,
    lead_form.intro ?? "", lead_form.privacy_note ?? "", ...lead_form.questions,
    ...launch_checklist, ...missing_inputs, ...userComplianceNotes, ...evidence,
  ].join(" \n ");
  if (hasLaunchLanguage(corpus)) {
    return { ok: false, error: "draft contains live-launch / budget-mutation language — campaign drafts are plan-only and are never launched" };
  }

  return {
    ok: true,
    value: {
      client_id: cleanRefSlug(b.client_id),
      title,
      description,
      campaign_type,
      source_agent: cleanRefSlug(b.source_agent),
      source_action_id: cleanRefSlug(b.source_action_id),
      source_competitor_profile_id: cleanRefSlug(b.source_competitor_profile_id),
      objective,
      offer_angle,
      audience,
      ad_sets,
      creative_direction,
      ad_copy,
      lead_form,
      budget_recommendation,
      launch_checklist,
      missing_inputs,
      compliance_notes: complianceFor(campaign_type, userComplianceNotes),
      evidence,
      safe_preview: buildCampaignSafePreview(title, campaign_type, objective, ad_sets, offer_angle),
    },
  };
}

// ── DTO-boundary re-sanitizers (defense in depth — never trust stored JSON) ──
export function scrubStrList(v: unknown, max = MAX_LIST, itemMax = MAX_ITEM): string[] {
  return cleanList(v, max, itemMax);
}
export function scrubOptional(v: unknown, max = MAX_LONG): string | null {
  return clean(v, max);
}
export function scrubAudience(v: unknown): CampaignAudience { return cleanAudience(v); }
export function scrubAdSets(v: unknown): CampaignAdSet[] { return cleanAdSets(v); }
export function scrubAdCopy(v: unknown): CampaignAdCopy { return cleanAdCopy(v); }
export function scrubLeadForm(v: unknown): CampaignLeadForm { return cleanLeadForm(v); }
export function scrubBudget(v: unknown): CampaignBudgetRecommendation { return cleanBudget(v); }
