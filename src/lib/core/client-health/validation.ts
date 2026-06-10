// Vault Core — Client Health / Retention Risk Draft validation + sanitization (Phase 9.8). PURE.
//
// Enforces draft-only safety: required fields (title), allowed health_type, target_system
// ∈ {internal,report,ghl,message}, capped/scrubbed text everywhere, NO secrets/tokens, NO
// raw contact PII, NO live GHL/Stripe/Meta IDs, NO raw provider payloads, and NO client-
// contact / CRM-mutation language ("send message", "email the client", "text the client",
// "update CRM", "create task in GHL", "trigger workflow", "cancel the client", "charge the
// client", …) anywhere in the draft. health_score / risk labels are INTERNAL advisory TEXT
// only — never a client-facing truth or a contact instruction. Builds a sanitized
// safe_preview.

import { scrubText } from "../actions/validation";
import { HEALTH_TYPES, HEALTH_TARGET_SYSTEMS } from "./types";
import type {
  HealthType, HealthTargetSystem, ClientHealthSafePreview, VaultClientHealthDraftInput,
} from "./types";

const MAX_TITLE = 160;
const MAX_DESC = 600;
const MAX_FIELD = 400;
const MAX_LONG = 1000;
const MAX_LIST = 20;
const MAX_ITEM = 300;

// Wording that implies LIVE client contact / external mutation — forbidden in a DRAFT.
// Patterns require the trigger verb BEFORE the noun (base/gerund form) so safety phrasing
// like "No client is contacted here" / "no message goes out" does NOT match, while
// instructions like "contact the client", "send an email", "update the GHL contact",
// "trigger the workflow" DO. `[^.\n]{0,N}` keeps each match inside one clause.
const CONTACT_LANGUAGE = [
  // sending any message / sms / email / dm
  /\bsend(s|ing)?\b[^.\n]{0,18}\b(sms|email|text|message|dm|reply)\b/i,
  // emailing / texting / calling / contacting the client directly
  /\bemail(s|ing)?\b[^.\n]{0,14}\b(client|lead|contact|customer)\b/i,
  /\btext(s|ing)?\b[^.\n]{0,14}\b(client|lead|contact|customer)\b/i,
  /\bcall(s|ing)?\b[^.\n]{0,14}\b(client|lead|contact|customer)\b/i,
  /\bcontact(s|ing)?\b[^.\n]{0,14}\b(client|lead|customer)\b/i,
  // mutating the CRM / GHL
  /\bupdat(e|es|ing)\b[^.\n]{0,16}\b(crm|ghl|gohighlevel|leadconnector|contact record|opportunity|pipeline)\b/i,
  /\b(create|creates|creating|add|adds|adding)\b[^.\n]{0,20}\b(task|note|opportunity|contact)\b[^.\n]{0,14}\b(in|on|to)\s+(ghl|gohighlevel|crm|leadconnector)\b/i,
  /\b(ghl|gohighlevel|crm)\b[^.\n]{0,12}\b(task|note|opportunity)\b[^.\n]{0,10}\bcreat/i,
  // triggering automations
  /\btrigger(s|ed|ing)?\b[^.\n]{0,16}\b(workflow|automation|sequence|campaign)\b/i,
  /\benrol?l(s|led|ling)?\b[^.\n]{0,16}\b(workflow|sequence|campaign|automation)\b/i,
  // account-destructive / money language
  /\bcancel(s|led|ling)?\b[^.\n]{0,12}\b(client|account|contract|subscription)\b/i,
  /\bcharg(e|es|ed|ing)\b[^.\n]{0,16}\b(client|card|customer|payment)\b/i,
  /\b(refund|debit|withdraw)(s|ed|ing)?\b[^.\n]{0,14}\b(client|card|customer|payment|funds?)\b/i,
  /\bpush\b[^.\n]{0,10}\blive\b/i,
] as const;
function hasContactLanguage(s: string): boolean {
  return CONTACT_LANGUAGE.some((re) => re.test(s));
}

// Health-specific redaction layered on top of scrubText: provider object ids (Stripe-style
// prefixed ids), and long alphanumeric/numeric runs that look like live contact/record ids
// or phone/account numbers (12+ digits).
function scrubHealth(s: string): string {
  return s
    .replace(/\b(in|ch|pi|cus|pm|card|acct|sub|seti|re|txn|price|prod|po|ba|src|tok|cs|ii|il|inv)_[A-Za-z0-9]{6,}/gi, "[redacted-id]")
    .replace(/\b\d{12,}\b/g, "[redacted-number]");
}
function safeUrlsOnly(s: string): string {
  return s.replace(/\b([a-z][a-z0-9+.-]*):\/\/\S+/gi, (m, scheme) => (/^https?$/i.test(scheme) ? m : "[link-removed]"));
}
function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = scrubHealth(safeUrlsOnly(scrubText(v))).slice(0, max).trim();
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
// Strict UUID validator (for uuid source columns). Returns null for anything that is not a
// well-formed UUID so a non-UUID slug can't fail at insert time.
function cleanUuid(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ? t : null;
}

// Default compliance notes — always include a human-approval + draft-only note, plus
// retention-sensitive reminders where relevant. Client-facing / retention-sensitive types
// ALWAYS carry an explicit no-contact note.
function complianceFor(health_type: HealthType, target: HealthTargetSystem, extra: string[]): string[] {
  const notes = new Set<string>(extra);
  notes.add("Draft-only — requires human approval. No client is contacted, no SMS/email goes out, no GHL contact/task/opportunity/workflow is touched, and no external system is mutated in this phase.");
  if (target === "ghl" || target === "message") {
    notes.add("Client-facing lane (disabled): any future outreach or CRM update requires a separate, explicitly-approved adapter phase plus human sign-off.");
  }
  if (health_type === "retention_risk_review" || health_type === "client_save_plan") {
    notes.add("Retention-sensitive: keep the assessment factual and evidence-based. A human decides every retention step; nothing here acts on the client relationship.");
  }
  if (health_type === "communication_risk_review") {
    notes.add("Communication risk is an internal read on responsiveness — never a judgment shared with the client.");
  }
  if (health_type === "upsell_opportunity_review") {
    notes.add("Upsell notes are internal hypotheses; confirm delivery health before any future expansion conversation (handled by a human).");
  }
  if (health_type === "monthly_client_health_closeout") {
    notes.add("Closeout uses internal aggregate values only; reconcile with reviewed snapshots before lock.");
  }
  notes.add("health_score / risk labels are internal advisory signals — never shown to a client as fact.");
  return [...notes].slice(0, MAX_LIST);
}

export function buildHealthSafePreview(
  title: string, health_type: HealthType, health_score: string | null,
  risk_level_label: string | null, riskReasons: string[],
): ClientHealthSafePreview {
  const summary = `Draft client-health artifact: ${title} (${health_type.replace(/_/g, " ")}). Internal review only — no client is contacted and no external system is touched in this phase.`.slice(0, 600);
  const score_line = [
    health_score ? `Health: ${health_score}` : "Health: unscored",
    risk_level_label ? `— ${risk_level_label}` : "",
    "(advisory, internal)",
  ].filter(Boolean).join(" ").slice(0, 240);
  const highlights: string[] = [];
  if (risk_level_label) highlights.push(`Risk label: ${risk_level_label}`.slice(0, 200));
  highlights.push(`${riskReasons.length} risk reason${riskReasons.length === 1 ? "" : "s"}`);
  if (riskReasons[0]) highlights.push(riskReasons[0].slice(0, 200));
  return { summary, health_type, score_line, risk_reason_count: riskReasons.length, highlights: highlights.slice(0, 6) };
}

export interface HealthValidationResult {
  ok: boolean;
  error?: string;
  value?: {
    client_id: string | null;
    title: string;
    description: string | null;
    health_type: HealthType;
    source_agent: string | null;
    source_action_id: string | null;
    source_message_draft_id: string | null;
    source_finance_draft_id: string | null;
    source_snapshot_id: string | null;
    target_system: HealthTargetSystem;
    health_score: string | null;
    risk_level_label: string | null;
    risk_reasons: string[];
    missing_access: string[];
    missing_assets: string[];
    delivery_risks: string[];
    communication_risks: string[];
    next_best_actions: string[];
    owner_notes: string | null;
    save_plan: string[];
    upsell_opportunities: string[];
    follow_up_message_ref: string | null;
    missing_inputs: string[];
    compliance_notes: string[];
    evidence: string[];
    safe_preview: ClientHealthSafePreview;
  };
}

// Default target lane per health type. Save plans / communication reviews nominally route
// to the (DISABLED) message lane; access/asset reviews to the (DISABLED) ghl lane; the
// closeout to report; everything else stays internal. The adapter is ALWAYS disabled
// regardless of target — nothing executes and no client is contacted.
function targetForType(health_type: HealthType): HealthTargetSystem {
  switch (health_type) {
    case "client_save_plan":
    case "communication_risk_review":
      return "message";
    case "missing_access_review":
    case "missing_assets_review":
      return "ghl";
    case "monthly_client_health_closeout":
    case "client_health_review":
      return "report";
    default:
      return "internal";
  }
}

export function validateClientHealthDraftInput(body: unknown): HealthValidationResult {
  const b = (body && typeof body === "object" ? body : {}) as VaultClientHealthDraftInput;

  const health_type = HEALTH_TYPES.includes(b.health_type as HealthType) ? (b.health_type as HealthType) : null;
  if (!health_type) return { ok: false, error: "valid health_type is required" };

  // target_system, if provided, must be one of the allowed lanes; else default by type.
  let target_system: HealthTargetSystem = targetForType(health_type);
  if (typeof (b as { target_system?: unknown }).target_system === "string") {
    const t = (b as { target_system?: string }).target_system as HealthTargetSystem;
    if (!HEALTH_TARGET_SYSTEMS.includes(t)) return { ok: false, error: "target_system must be internal, report, ghl, or message" };
    target_system = t;
  }

  const title = clean(b.title, MAX_TITLE);
  if (!title) return { ok: false, error: "title is required" };

  // Sanitize EVERY user-controlled text field ONCE so the contact-language scan and the
  // returned value use the same sanitized objects (no inconsistent re-sanitization).
  const description = clean(b.description, MAX_DESC);
  const health_score = clean(b.health_score, 80);
  const risk_level_label = clean(b.risk_level_label, 60);
  const risk_reasons = cleanList(b.risk_reasons);
  const missing_access = cleanList(b.missing_access);
  const missing_assets = cleanList(b.missing_assets);
  const delivery_risks = cleanList(b.delivery_risks);
  const communication_risks = cleanList(b.communication_risks);
  const next_best_actions = cleanList(b.next_best_actions);
  const owner_notes = clean(b.owner_notes, MAX_LONG);
  const save_plan = cleanList(b.save_plan);
  const upsell_opportunities = cleanList(b.upsell_opportunities);
  const missing_inputs = cleanList(b.missing_inputs);
  const userComplianceNotes = cleanList(b.compliance_notes);
  const evidence = cleanList(b.evidence);

  // Reject any live client-contact / CRM-mutation / workflow-trigger language across ALL
  // human-authored surfaces before storage. (System default compliance notes are added
  // AFTER this scan.)
  const corpus = [
    title, description ?? "", health_score ?? "", risk_level_label ?? "", owner_notes ?? "",
    ...risk_reasons, ...missing_access, ...missing_assets, ...delivery_risks,
    ...communication_risks, ...next_best_actions, ...save_plan, ...upsell_opportunities,
    ...missing_inputs, ...userComplianceNotes, ...evidence,
  ].join(" \n ");
  if (hasContactLanguage(corpus)) {
    return { ok: false, error: "draft contains client-contact / CRM-mutation / workflow-trigger language — client-health drafts are plan-only; no client is contacted and no external system is touched" };
  }

  return {
    ok: true,
    value: {
      client_id: cleanRefSlug(b.client_id),
      title,
      description,
      health_type,
      source_agent: cleanRefSlug(b.source_agent),
      source_action_id: cleanUuid(b.source_action_id),
      source_message_draft_id: cleanUuid(b.source_message_draft_id),
      source_finance_draft_id: cleanUuid(b.source_finance_draft_id),
      source_snapshot_id: cleanRefSlug(b.source_snapshot_id),
      target_system,
      health_score,
      risk_level_label,
      risk_reasons,
      missing_access,
      missing_assets,
      delivery_risks,
      communication_risks,
      next_best_actions,
      owner_notes,
      save_plan,
      upsell_opportunities,
      follow_up_message_ref: cleanRefSlug(b.follow_up_message_ref),
      missing_inputs,
      compliance_notes: complianceFor(health_type, target_system, userComplianceNotes),
      evidence,
      safe_preview: buildHealthSafePreview(title, health_type, health_score, risk_level_label, risk_reasons),
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
