// Vault Core — GHL Workflow Draft validation + sanitization (Phase 9.3). PURE.
//
// Enforces draft-only safety: required fields, allowed enums, capped text, no
// secrets/credentials, no raw GHL payloads, no live GHL IDs, no contact PII, http(s)
// URLs only, and NO external-execution language ("send now", "publish", "go live",
// "update contact now", etc.). Builds a sanitized safe_preview. No I/O.

import { scrubText } from "../actions/validation";
import { WORKFLOW_TYPES, STEP_TYPES } from "./types";
import type {
  WorkflowType, StepType, WorkflowStep, WorkflowTrigger, WorkflowSafePreview, GHLWorkflowDraftInput,
} from "./types";

const MAX_TITLE = 160;
const MAX_TEXT = 1200;
const MAX_STEP_TEXT = 600;
const MAX_STEPS = 40;
const MAX_LIST = 20;
const MAX_ITEM = 240;

// Wording that implies live execution / external mutation — forbidden in a DRAFT.
const EXECUTION_LANGUAGE = [
  /\bsend (it )?now\b/i,
  /\bpublish( now| live| the workflow)?\b/i,
  /\bgo live\b/i,
  /\bpush (live|to ghl)\b/i,
  /\bactivate (the )?workflow\b/i,
  /\bupdate (the )?contact now\b/i,
  /\b(create|build) (the )?workflow in ghl\b/i,
  /\btrigger (the )?workflow\b/i,
  /\bcharge\b/i,
];

function hasExecutionLanguage(s: string): boolean {
  return EXECUTION_LANGUAGE.some((re) => re.test(s));
}

function clean(v: unknown, max = MAX_TEXT): string | null {
  if (typeof v !== "string") return null;
  const t = scrubText(v).slice(0, max).trim();
  return t || null;
}

function cleanList(v: unknown, max = MAX_LIST, itemMax = MAX_ITEM): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => clean(x, itemMax)).filter((x): x is string => !!x).slice(0, max);
}

// Strip any http(s) URL that isn't http(s); drop non-web schemes entirely.
function safeUrlsOnly(s: string): string {
  return s.replace(/\b([a-z][a-z0-9+.-]*):\/\/\S+/gi, (m, scheme) =>
    /^https?$/i.test(scheme) ? m : "[link-removed]");
}

function cleanText(v: unknown, max = MAX_TEXT): string | null {
  const t = clean(v, max);
  return t ? safeUrlsOnly(t) : null;
}

function sanitizeTrigger(t: Partial<WorkflowTrigger> | undefined): WorkflowTrigger {
  return {
    type: clean(t?.type, 80) ?? "manual",
    description: cleanText(t?.description, 400) ?? "Trigger condition (draft).",
  };
}

const STEP_SET = new Set<string>(STEP_TYPES);

function sanitizeStep(raw: Partial<WorkflowStep>, idx: number): WorkflowStep | null {
  const type = (typeof raw.type === "string" && STEP_SET.has(raw.type) ? raw.type : null) as StepType | null;
  if (!type) return null;
  const label = clean(raw.label, 120) ?? type.replace(/_/g, " ");
  const description = cleanText(raw.description, MAX_STEP_TEXT) ?? "Draft step.";
  const step: WorkflowStep = {
    id: clean(raw.id, 60) ?? `step-${idx + 1}`,
    type,
    label,
    description,
    draft_only: true,
  };
  const dt = cleanText(raw.draft_text, MAX_STEP_TEXT); if (dt) step.draft_text = dt;
  const wd = clean(raw.wait_duration, 60); if (wd) step.wait_duration = wd;
  const cond = cleanText(raw.condition, MAX_STEP_TEXT); if (cond) step.condition = cond;
  const tag = clean(raw.tag, 80); if (tag) step.tag = tag;
  const task = cleanText(raw.task, MAX_STEP_TEXT); if (task) step.task = task;
  const ps = clean(raw.pipeline_stage, 80); if (ps) step.pipeline_stage = ps;
  const asg = clean(raw.assignee, 80); if (asg) step.assignee = asg;
  const note = cleanText(raw.note, MAX_STEP_TEXT); if (note) step.note = note;
  // webhook placeholders must be clearly disabled/future-adapter.
  if (type === "webhook_placeholder") {
    step.description = "Webhook placeholder — DISABLED. A future approved adapter is required; nothing is called.";
  }
  return step;
}

function blob(input: GHLWorkflowDraftInput): string {
  const parts: string[] = [input.title ?? "", input.description ?? ""];
  for (const s of input.steps ?? []) parts.push(s.description ?? "", s.draft_text ?? "", s.note ?? "", s.condition ?? "", s.task ?? "");
  return parts.join(" \n ");
}

export function buildWorkflowSafePreview(title: string, type: WorkflowType, steps: WorkflowStep[]): WorkflowSafePreview {
  const summary = `Draft GHL workflow: ${title} (${type.replace(/_/g, " ")}). ${steps.length} draft step${steps.length === 1 ? "" : "s"} — review only, nothing is published to GHL.`.slice(0, 600);
  const step_summaries = steps.slice(0, 40).map((s, i) => `${i + 1}. ${s.label}${s.wait_duration ? ` (wait ${s.wait_duration})` : ""}`);
  return { summary, step_summaries };
}

export interface WorkflowValidationResult {
  ok: boolean;
  error?: string;
  value?: {
    client_id: string | null;
    title: string;
    description: string | null;
    workflow_type: WorkflowType;
    source_agent: string | null;
    source_action_id: string | null;
    trigger: WorkflowTrigger;
    steps: WorkflowStep[];
    guardrails: Record<string, unknown>;
    required_assets: string[];
    missing_inputs: string[];
    evidence: string[];
    safe_preview: WorkflowSafePreview;
  };
}

function cleanSlug(v: unknown, max = 120): string | null {
  const t = clean(v, max);
  return t && /^[a-zA-Z0-9_:-]{1,120}$/.test(t) ? t : null;
}

export function validateWorkflowDraftInput(body: unknown): WorkflowValidationResult {
  const b = (body && typeof body === "object" ? body : {}) as GHLWorkflowDraftInput;

  const workflow_type = WORKFLOW_TYPES.includes(b.workflow_type as WorkflowType) ? (b.workflow_type as WorkflowType) : null;
  if (!workflow_type) return { ok: false, error: "valid workflow_type is required" };

  const title = clean(b.title, MAX_TITLE);
  if (!title) return { ok: false, error: "title is required" };

  // Reject any execution/mutation language anywhere in the draft.
  if (hasExecutionLanguage(blob(b))) {
    return { ok: false, error: "draft contains live-execution language — workflows are draft-only and never published" };
  }

  const steps = (Array.isArray(b.steps) ? b.steps : [])
    .map((s, i) => sanitizeStep(s ?? {}, i))
    .filter((s): s is WorkflowStep => !!s)
    .slice(0, MAX_STEPS);

  // A draft with no valid steps is not a useful review artifact.
  if (steps.length === 0) return { ok: false, error: "at least one draft step is required" };

  const value = {
    client_id: cleanSlug(b.client_id),
    title,
    description: cleanText(b.description, MAX_TEXT),
    workflow_type,
    source_agent: cleanSlug(b.source_agent),
    source_action_id: cleanSlug(b.source_action_id),
    trigger: sanitizeTrigger(b.trigger),
    steps,
    guardrails: sanitizeGuardrails(b.guardrails),
    required_assets: cleanList(b.required_assets),
    missing_inputs: cleanList(b.missing_inputs),
    evidence: cleanList(b.evidence),
    safe_preview: buildWorkflowSafePreview(title, workflow_type, steps),
  };
  return { ok: true, value };
}

// ── DTO-boundary re-sanitizers (Phase 9.3 defense in depth) ──────────────────────
// Inserts are sanitized, but the DTO must NOT trust stored JSON: a future migration /
// import / service-role write could persist raw provider IDs, credentials, or unsafe
// text. These re-sanitize the stored shape before it reaches any client.
export function sanitizeStoredSteps(raw: unknown): WorkflowStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s, i) => sanitizeStep((s ?? {}) as Partial<WorkflowStep>, i)).filter((s): s is WorkflowStep => !!s).slice(0, MAX_STEPS);
}
export function sanitizeStoredTrigger(raw: unknown): WorkflowTrigger {
  return sanitizeTrigger((raw ?? {}) as Partial<WorkflowTrigger>);
}
export function scrubStrList(raw: unknown, max = MAX_LIST, itemMax = MAX_ITEM): string[] {
  return cleanList(raw, max, itemMax);
}
export function scrubOptionalText(raw: unknown, max = MAX_TEXT): string | null {
  return cleanText(raw, max);
}

// Guardrails are a small whitelist of safe boolean/string flags; everything else is
// dropped. The draft-only + no-external-send guarantees are ALWAYS forced on.
function sanitizeGuardrails(g: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {
    draft_only: true,
    no_external_send: true,
    requires_human_approval: true,
    ghl_adapter: "disabled",
  };
  if (g && typeof g === "object") {
    if (typeof g.max_messages_per_day === "number") out.max_messages_per_day = Math.max(0, Math.min(50, g.max_messages_per_day));
    if (typeof g.quiet_hours === "string") out.quiet_hours = clean(g.quiet_hours, 60);
    if (typeof g.stop_on_reply === "boolean") out.stop_on_reply = g.stop_on_reply;
  }
  return out;
}
