// Vault Core — Creative Brief validation + sanitization (Phase 9.7). PURE.
//
// Enforces draft-only safety: required fields (title, objective), allowed brief_type /
// target_system / platform / content_format, capped/scrubbed text everywhere, NO secrets/
// tokens, NO live social-post or ad IDs, NO raw provider payloads, NO raw creator/contact
// PII, http(s) URLs only, and NO publish/post/upload/schedule/launch/boost language (this
// is a PLAN, never an action). Builds a sanitized safe_preview.

import { scrubText } from "../actions/validation";
import { BRIEF_TYPES, BRIEF_TARGET_SYSTEMS, BRIEF_PLATFORMS, CONTENT_FORMATS } from "./types";
import type {
  BriefType, BriefTargetSystem, BriefPlatform, ContentFormat, BriefSafePreview, VaultCreativeBriefInput,
} from "./types";

const MAX_TITLE = 160;
const MAX_DESC = 600;
const MAX_FIELD = 400;
const MAX_LONG = 4000; // scripts can be long
const MAX_LIST = 30;
const MAX_ITEM = 400;

// Wording that implies a LIVE publish / post / upload / launch — forbidden in a DRAFT.
// Tolerant of articles/plurals/gerunds + short clause gaps, but deliberately scoped so
// legitimate creative language ("schedule the shoot", "upload raw footage to the editor",
// "Instagram Reel deliverable") is NOT blocked — only imperative live-publish actions.
const PUBLISH_LANGUAGE = [
  /\bpost(s|ing|ed)?\b[^.\n]{0,14}\b(now|today|immediately|live|to (instagram|tiktok|facebook|youtube|fb|ig|the feed|the page|the grid|the story))\b/i,
  /\bpublish(es|ing|ed)?\b[^.\n]{0,14}\b(now|today|this|it|live|the (post|reel|video|content))\b/i,
  /\bschedul(e|es|ing|ed)\b[^.\n]{0,16}\b(this )?(post|posts|reel|video|content|publishing|to (instagram|tiktok|facebook|youtube))\b/i,
  /\bupload(s|ing|ed)?\b[^.\n]{0,18}\b(to )?(instagram|tiktok|youtube|facebook|\bfb\b|\big\b)\b/i,
  /\blaunch(es|ing|ed)?\b[^.\n]{0,12}\bads?\b/i,
  /\bboost(s|ing|ed)?\b[^.\n]{0,12}\b(now|this|the (post|reel|ad))\b/i,
  /\bgo live\b/i,
  /\bpush\b[^.\n]{0,10}\blive\b/i,
  /\bsend\b[^.\n]{0,12}\bto (the )?client\b/i,
];
function hasPublishLanguage(s: string): boolean {
  return PUBLISH_LANGUAGE.some((re) => re.test(s));
}

// Redaction layered on top of scrubText: long numeric runs that look like social-post /
// ad object ids (13+ digits), and Meta ad-account ids (act_…).
function scrubIds(s: string): string {
  return s
    .replace(/\bact_\d+/gi, "[redacted-id]")
    .replace(/\b\d{13,}\b/g, "[redacted-id]");
}
function safeUrlsOnly(s: string): string {
  return s.replace(/\b([a-z][a-z0-9+.-]*):\/\/\S+/gi, (m, scheme) => (/^https?$/i.test(scheme) ? m : "[link-removed]"));
}
function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = scrubIds(safeUrlsOnly(scrubText(v))).slice(0, max).trim();
  return t || null;
}
function cleanList(v: unknown, max = MAX_LIST, itemMax = MAX_ITEM): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => clean(x, itemMax)).filter((x): x is string => !!x).slice(0, max);
}
function cleanRefSlug(v: unknown): string | null {
  const t = clean(v, 120);
  return t && /^[a-zA-Z0-9_:.-]{1,120}$/.test(t) ? t : null;
}
// Strict UUID validator (for source ids backed by uuid DB columns).
function cleanUuid(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ? t : null;
}

// Default compliance notes — always include a human-approval + draft-only note, plus
// client-facing / ad-creative reminders where relevant.
function complianceFor(brief_type: BriefType, extra: string[]): string[] {
  const notes = new Set<string>(extra);
  notes.add("Draft-only — requires human approval before any production/publishing. No post is published, no video is uploaded, and no ad is launched in this phase.");
  const isAd = /ad_brief|competitor_response_creative/.test(brief_type);
  if (isAd) {
    notes.add("Ad creative: claims (pricing, warranties, financing, storm/insurance) must be substantiated and compliant before any future use.");
    notes.add("Ad creative: confirm required disclosures + platform policy compliance before any future launch.");
  }
  if (brief_type === "case_study" || brief_type === "client_brand_story" || /testimonial/.test(brief_type)) {
    notes.add("Client/testimonial content: confirm written usage permission before any future publishing.");
  }
  if (brief_type === "competitor_response_creative") {
    notes.add("Do not name, target, or disparage the competitor; keep comparative claims substantiated.");
  }
  return [...notes].slice(0, MAX_LIST);
}

// Default target lane per brief type. Ad briefs nominally route to the (DISABLED) meta
// lane; organic short-form to social; everything else to content. The content adapter is
// disabled regardless — these are descriptive only.
export function targetForBriefType(brief_type: BriefType): BriefTargetSystem {
  switch (brief_type) {
    case "video_ad_brief":
    case "ugc_ad_brief":
      return "meta";
    case "organic_reel":
    case "youtube_short":
    case "tiktok_short":
    case "instagram_reel":
      return "social";
    default:
      return "content";
  }
}

export function buildBriefSafePreview(
  title: string, brief_type: BriefType, platform: BriefPlatform, objective: string, deliverables: string[], hookBank: string[],
): BriefSafePreview {
  const summary = `Draft creative brief: ${title} (${brief_type.replace(/_/g, " ")} · ${platform}). Review only — nothing is posted, published, uploaded, or launched in this phase.`.slice(0, 600);
  const highlights: string[] = [];
  if (hookBank[0]) highlights.push(`Lead hook: ${hookBank[0]}`.slice(0, 200));
  highlights.push(`${deliverables.length} deliverable${deliverables.length === 1 ? "" : "s"}`);
  return {
    summary,
    brief_type,
    platform,
    objective_line: objective.slice(0, 240),
    deliverable_count: deliverables.length,
    highlights: highlights.slice(0, 6),
  };
}

export interface BriefValidationResult {
  ok: boolean;
  error?: string;
  value?: {
    client_id: string | null;
    title: string;
    description: string | null;
    brief_type: BriefType;
    source_agent: string | null;
    source_action_id: string | null;
    source_meta_campaign_draft_id: string | null;
    source_competitor_profile_id: string | null;
    target_system: BriefTargetSystem;
    platform: BriefPlatform;
    content_format: ContentFormat;
    objective: string;
    audience: string | null;
    hook_bank: string[];
    script: string | null;
    shot_list: string[];
    editor_notes: string | null;
    visual_direction: string[];
    caption_options: string[];
    thumbnail_concepts: string[];
    deliverables: string[];
    missing_inputs: string[];
    compliance_notes: string[];
    evidence: string[];
    safe_preview: BriefSafePreview;
  };
}

export function validateCreativeBriefInput(body: unknown): BriefValidationResult {
  const b = (body && typeof body === "object" ? body : {}) as VaultCreativeBriefInput;

  const brief_type = BRIEF_TYPES.includes(b.brief_type as BriefType) ? (b.brief_type as BriefType) : null;
  if (!brief_type) return { ok: false, error: "valid brief_type is required" };

  let target_system: BriefTargetSystem = targetForBriefType(brief_type);
  if (typeof (b as { target_system?: unknown }).target_system === "string") {
    const t = (b as { target_system?: string }).target_system as BriefTargetSystem;
    if (!BRIEF_TARGET_SYSTEMS.includes(t)) return { ok: false, error: "invalid target_system" };
    target_system = t;
  }

  const platform = (BRIEF_PLATFORMS.includes(b.platform as BriefPlatform) ? b.platform : "multi") as BriefPlatform;
  const content_format = (CONTENT_FORMATS.includes(b.content_format as ContentFormat) ? b.content_format : "video") as ContentFormat;

  const title = clean(b.title, MAX_TITLE);
  if (!title) return { ok: false, error: "title is required" };

  const objective = clean(b.objective, MAX_FIELD);
  if (!objective) return { ok: false, error: "objective is required" };

  // Sanitize EVERY user-controlled text field ONCE so the publish-language scan and the
  // returned value use the same sanitized objects (no inconsistent re-sanitization).
  const description = clean(b.description, MAX_DESC);
  const audience = clean(b.audience, MAX_FIELD);
  const hook_bank = cleanList(b.hook_bank);
  const script = clean(b.script, MAX_LONG);
  const shot_list = cleanList(b.shot_list);
  const editor_notes = clean(b.editor_notes, MAX_LONG);
  const visual_direction = cleanList(b.visual_direction);
  const caption_options = cleanList(b.caption_options);
  const thumbnail_concepts = cleanList(b.thumbnail_concepts);
  const deliverables = cleanList(b.deliverables);
  const missing_inputs = cleanList(b.missing_inputs);
  const userComplianceNotes = cleanList(b.compliance_notes);
  const evidence = cleanList(b.evidence);

  // Reject imperative publish/post/upload/launch/boost language across ALL human-authored
  // surfaces before storage. (System default compliance notes are added AFTER this scan.)
  const corpus = [
    title, description ?? "", objective, audience ?? "", script ?? "", editor_notes ?? "",
    ...hook_bank, ...shot_list, ...visual_direction, ...caption_options, ...thumbnail_concepts,
    ...deliverables, ...missing_inputs, ...userComplianceNotes, ...evidence,
  ].join(" \n ");
  if (hasPublishLanguage(corpus)) {
    return { ok: false, error: "draft contains live publish/post/upload/launch language — creative briefs are plan-only; nothing is posted, published, uploaded, or launched" };
  }

  return {
    ok: true,
    value: {
      client_id: cleanRefSlug(b.client_id),
      title,
      description,
      brief_type,
      source_agent: cleanRefSlug(b.source_agent),
      source_action_id: cleanUuid(b.source_action_id),
      source_meta_campaign_draft_id: cleanUuid(b.source_meta_campaign_draft_id),
      source_competitor_profile_id: cleanRefSlug(b.source_competitor_profile_id),
      target_system,
      platform,
      content_format,
      objective,
      audience,
      hook_bank,
      script,
      shot_list,
      editor_notes,
      visual_direction,
      caption_options,
      thumbnail_concepts,
      deliverables,
      missing_inputs,
      compliance_notes: complianceFor(brief_type, userComplianceNotes),
      evidence,
      safe_preview: buildBriefSafePreview(title, brief_type, platform, objective, deliverables, hook_bank),
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
