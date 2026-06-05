// Vault Core — Action input validation + sanitization (Phase 9.0). PURE.
//
// Enforces required fields, caps lengths, strips control chars, redacts
// secrets/tokens, and rejects oversized/raw payloads. Builds a human-safe
// `safe_preview` that never exposes the raw payload, credentials, or PII.

import { ACTION_TYPES } from "./types";
import type { ActionType } from "./types";
import { ACTION_META, riskOrdinal, requiresApproval } from "./policies";

const MAX_TITLE = 200;
const MAX_TEXT = 2000;
const MAX_ITEMS = 20;
const MAX_ITEM = 400;
const MAX_PAYLOAD_BYTES = 16 * 1024; // 16 KB cap

const SECRET = /([\w.+-]+@[\w-]+\.[\w.-]+)|((?:sk|pk|rk)_[A-Za-z0-9]{8,})|(Bearer\s+[A-Za-z0-9._-]{12,})|(eyJ[A-Za-z0-9._-]{20,})|(AKIA[0-9A-Z]{12,})|([A-Fa-f0-9]{32,})/g;
// Long digit runs (phone / card-like contact identifiers).
const PHONE = /\+?\d[\d ().-]{7,}\d/g;

function scrub(s: string): string {
  return s.replace(SECRET, "[redacted]").replace(PHONE, "[redacted-number]");
}

/** Public scrubber for any free-text persisted into DTO-visible fields
 *  (e.g. review notes, rollback notes). Normalizes the same way as cleanText
 *  (strips control chars, collapses whitespace) THEN redacts emails/tokens/keys/phones,
 *  so audit-log fields can never carry raw control characters or hidden payloads. */
export function scrubText(s: string): string {
  if (typeof s !== "string") return "";
  const t = s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return scrub(t);
}

function cleanText(v: unknown, max = MAX_TEXT): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  if (!t) return null;
  return scrub(t);
}

function cleanList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => cleanText(x, MAX_ITEM)).filter((x): x is string => !!x).slice(0, MAX_ITEMS);
}

// Recursively sanitize a JSON payload: cap depth/size, strip control chars,
// redact secrets in string values, drop functions/symbols. Returns a plain
// JSON-safe object. Rejects (returns null) if it can't be serialized within cap.
function sanitizePayload(v: unknown, depth = 0): unknown {
  if (depth > 6) return null;
  if (v === null) return null;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "string") return scrub(v.replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, MAX_TEXT));
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => sanitizePayload(x, depth + 1));
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    let n = 0;
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (n++ >= 50) break;
      const key = k.slice(0, 80);
      // Drop keys that look like secret holders entirely.
      if (/(token|secret|password|passwd|api[_-]?key|access[_-]?key|bearer|credential|authorization)/i.test(key)) continue;
      // Drop keys that themselves carry email/token/key/phone-like material — a JSON
      // key can otherwise smuggle raw PII/secrets past the value-only scrub above.
      if (scrub(key) !== key) continue;
      out[key] = sanitizePayload(val, depth + 1);
    }
    return out;
  }
  return null; // functions/symbols/undefined
}

export interface ActionValidationResult {
  ok: boolean;
  error?: string;
  value?: {
    agent_id: string;
    action_type: ActionType;
    title: string;
    summary: string;
    reason: string | null;
    client_id: string | null;
    source_type: string | null;
    source_id: string | null;
    evidence: string[];
    constraints: string[];
    payload: Record<string, unknown>;
    metadata: Record<string, unknown>;
    target_system: ReturnType<typeof targetFor>;
    risk_level: ReturnType<typeof riskFor>;
    requires_approval: boolean;
    safe_preview: string;
  };
}

function targetFor(t: ActionType) { return ACTION_META[t].target; }
function riskFor(t: ActionType) { return ACTION_META[t].risk; }

function cleanSlug(v: unknown): string | null {
  const t = cleanText(v, 120);
  return t && /^[a-zA-Z0-9_:-]{1,120}$/.test(t) ? t : null;
}

/** Build a human-safe preview that NEVER includes the raw payload/credentials/PII. */
export function buildSafePreview(action_type: ActionType, title: string, summary: string): string {
  const m = ACTION_META[action_type];
  const verb = action_type.startsWith("draft_") ? "Prepare a draft" : action_type.startsWith("prepare_") ? "Prepare" : "Perform";
  return `${verb}: ${title}. ${summary} (type: ${action_type.replace(/_/g, " ")}, target: ${m.target}, risk: ${m.risk.replace(/_/g, " ")}).`.slice(0, 600);
}

export function validateActionInput(body: unknown): ActionValidationResult {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const action_type = ACTION_TYPES.includes(b.action_type as ActionType) ? (b.action_type as ActionType) : null;
  if (!action_type) return { ok: false, error: "valid action_type is required" };

  const agent_id = cleanSlug(b.agent_id);
  if (!agent_id) return { ok: false, error: "agent_id is required" };

  const title = cleanText(b.title, MAX_TITLE);
  if (!title) return { ok: false, error: "title is required" };

  const summary = cleanText(b.summary, MAX_TEXT);
  if (!summary) return { ok: false, error: "summary is required" };

  // Sanitize payload + enforce size cap.
  const payload = (sanitizePayload(b.payload ?? {}) ?? {}) as Record<string, unknown>;
  try {
    if (JSON.stringify(payload).length > MAX_PAYLOAD_BYTES) {
      return { ok: false, error: "payload too large" };
    }
  } catch {
    return { ok: false, error: "payload not serializable" };
  }

  const target_system = targetFor(action_type);
  const risk_level = riskFor(action_type);

  // Safety: ordinal sanity (defensive — should always be valid from the map).
  if (riskOrdinal(risk_level) < 0) return { ok: false, error: "unknown risk level" };

  return {
    ok: true,
    value: {
      agent_id,
      action_type,
      title,
      summary,
      reason: cleanText(b.reason, MAX_TEXT),
      client_id: cleanSlug(b.client_id),
      source_type: cleanSlug(b.source_type),
      source_id: cleanSlug(b.source_id),
      evidence: cleanList(b.evidence),
      constraints: cleanList(b.constraints),
      payload,
      metadata: (sanitizePayload(b.metadata ?? {}) ?? {}) as Record<string, unknown>,
      target_system,
      risk_level,
      requires_approval: requiresApproval(risk_level),
      safe_preview: buildSafePreview(action_type, title, summary),
    },
  };
}
