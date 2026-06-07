// Vault Core — Message Draft validation + sanitization (Phase 9.4). PURE.
//
// Enforces draft-only safety: required fields, allowed enums, capped subject/body, no
// secrets/credentials, no raw GHL payloads, no raw contact PII beyond a sanitized
// contact_ref, http(s) URLs only, personalization tokens kept as placeholders, NO
// external-send language ("send now", "blast", "trigger", "deliver immediately"), and
// compliance notes for SMS/email/client-facing drafts. Builds a sanitized safe_preview.

import { scrubText } from "../actions/validation";
import { MESSAGE_TYPES, MESSAGE_CHANNELS, MESSAGE_AUDIENCES } from "./types";
import type {
  MessageType, MessageChannel, MessageAudience, MessageSafePreview, VaultMessageDraftInput,
} from "./types";

const MAX_TITLE = 160;
const MAX_SUBJECT = 200;
const MAX_BODY = 2000;
const MAX_LIST = 20;
const MAX_ITEM = 240;

// Wording that implies live sending / external delivery — forbidden in a DRAFT.
const SEND_LANGUAGE = [
  /\bsend (it )?now\b/i,
  /\bsend immediately\b/i,
  /\bdeliver (immediately|now)\b/i,
  /\bblast\b/i,
  /\btrigger (the )?(send|workflow|sequence)\b/i,
  /\bpush (live|to ghl)\b/i,
  /\bgo live\b/i,
  /\bfire (off|now)\b/i,
];
function hasSendLanguage(s: string): boolean {
  return SEND_LANGUAGE.some((re) => re.test(s));
}

function safeUrlsOnly(s: string): string {
  return s.replace(/\b([a-z][a-z0-9+.-]*):\/\/\S+/gi, (m, scheme) => (/^https?$/i.test(scheme) ? m : "[link-removed]"));
}
function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = safeUrlsOnly(scrubText(v)).slice(0, max).trim();
  return t || null;
}
function cleanList(v: unknown, max = MAX_LIST, itemMax = MAX_ITEM): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => clean(x, itemMax)).filter((x): x is string => !!x).slice(0, max);
}
function cleanSlug(v: unknown, max = 120): string | null {
  const t = clean(v, max);
  return t && /^[a-zA-Z0-9_:.\-\s]{1,120}$/.test(t) ? t : null;
}

// Personalization tokens must be {{placeholder}} shapes only — never raw data.
function cleanTokens(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => /^\{\{[a-zA-Z0-9_.]+\}\}$/.test(x))
    .slice(0, MAX_LIST);
}

// Extract {{tokens}} actually present in the body (so the UI shows real placeholders).
function tokensInBody(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(/\{\{[a-zA-Z0-9_.]+\}\}/g)) out.add(m[0]);
  return [...out].slice(0, MAX_LIST);
}

// A channel is an intent label; these map it to the underlying transport so subject /
// compliance rules are applied consistently (e.g. client_update is really an email).
export function routesToEmail(c: MessageChannel): boolean { return c === "email" || c === "client_update"; }
export function routesToSms(c: MessageChannel): boolean { return c === "sms" || c === "lead_reply"; }

// Default compliance notes per channel/type — always include a human-approval note.
function complianceFor(channel: MessageChannel, type: MessageType, extra: string[]): string[] {
  const notes = new Set<string>(extra);
  notes.add("Draft-only — requires human approval before any send. No message is delivered in this phase.");
  if (routesToSms(channel)) {
    notes.add("SMS: keep concise, no false urgency, include opt-out where required.");
    if (type === "reactivation" || type === "nurture_message") notes.add("Marketing/reactivation SMS: confirm consent + opt-out compliance before any future send.");
  }
  if (routesToEmail(channel)) notes.add("Email: subject must be accurate and non-misleading.");
  if (type === "payment_follow_up") notes.add("Payment follow-up: keep professional and non-threatening.");
  if (type === "review_request") notes.add("Review request: must not improperly incentivize reviews.");
  return [...notes].slice(0, MAX_LIST);
}

export function buildMessageSafePreview(title: string, channel: MessageChannel, body: string): MessageSafePreview {
  const summary = `Draft ${channel.replace(/_/g, " ")} message: ${title}. Review only — nothing is sent in this phase.`.slice(0, 600);
  const preview_lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean).slice(0, 8).map((l) => l.slice(0, 240));
  return { summary, channel, preview_lines };
}

export interface MessageValidationResult {
  ok: boolean;
  error?: string;
  value?: {
    client_id: string | null;
    contact_ref: string | null;
    title: string;
    message_type: MessageType;
    channel: MessageChannel;
    audience: MessageAudience;
    source_agent: string | null;
    source_action_id: string | null;
    source_workflow_draft_id: string | null;
    subject: string | null;
    body: string;
    tone: string | null;
    intent: string | null;
    personalization_tokens: string[];
    missing_inputs: string[];
    compliance_notes: string[];
    evidence: string[];
    safe_preview: MessageSafePreview;
  };
}

function cleanRefSlug(v: unknown): string | null {
  const t = clean(v, 120);
  return t && /^[a-zA-Z0-9_:-]{1,120}$/.test(t) ? t : null;
}

export function validateMessageDraftInput(body: unknown): MessageValidationResult {
  const b = (body && typeof body === "object" ? body : {}) as VaultMessageDraftInput;

  const message_type = MESSAGE_TYPES.includes(b.message_type as MessageType) ? (b.message_type as MessageType) : null;
  if (!message_type) return { ok: false, error: "valid message_type is required" };
  const channel = MESSAGE_CHANNELS.includes(b.channel as MessageChannel) ? (b.channel as MessageChannel) : null;
  if (!channel) return { ok: false, error: "valid channel is required" };
  const audience = MESSAGE_AUDIENCES.includes(b.audience as MessageAudience) ? (b.audience as MessageAudience) : null;
  if (!audience) return { ok: false, error: "valid audience is required" };

  const title = clean(b.title, MAX_TITLE);
  if (!title) return { ok: false, error: "title is required" };

  const bodyText = clean(b.body, MAX_BODY);
  if (!bodyText) return { ok: false, error: "body is required" };

  if (hasSendLanguage(`${title} ${bodyText} ${b.subject ?? ""}`)) {
    return { ok: false, error: "draft contains live-send language — messages are draft-only and never sent" };
  }

  const subject = clean(b.subject, MAX_SUBJECT);
  if (routesToEmail(channel) && !subject) return { ok: false, error: "subject is required for email drafts" };

  // Tokens: explicit placeholders + any found in the body.
  const tokens = [...new Set([...cleanTokens(b.personalization_tokens), ...tokensInBody(bodyText)])].slice(0, MAX_LIST);

  return {
    ok: true,
    value: {
      client_id: cleanRefSlug(b.client_id),
      contact_ref: cleanSlug(b.contact_ref),
      title,
      message_type,
      channel,
      audience,
      source_agent: cleanRefSlug(b.source_agent),
      source_action_id: cleanRefSlug(b.source_action_id),
      source_workflow_draft_id: cleanRefSlug(b.source_workflow_draft_id),
      subject,
      body: bodyText,
      tone: clean(b.tone, 60),
      intent: clean(b.intent, 200),
      personalization_tokens: tokens,
      missing_inputs: cleanList(b.missing_inputs),
      compliance_notes: complianceFor(channel, message_type, cleanList(b.compliance_notes)),
      evidence: cleanList(b.evidence),
      safe_preview: buildMessageSafePreview(title, channel, bodyText),
    },
  };
}

// ── DTO-boundary re-sanitizers (defense in depth — never trust stored JSON) ──
export function scrubStrList(v: unknown, max = MAX_LIST, itemMax = MAX_ITEM): string[] {
  return cleanList(v, max, itemMax);
}
export function scrubTokenList(v: unknown): string[] {
  return cleanTokens(v);
}
export function scrubOptional(v: unknown, max = MAX_BODY): string | null {
  return clean(v, max);
}
