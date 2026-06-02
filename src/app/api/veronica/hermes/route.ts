// Server-side only — Hermes VPS bridge for Veronica.
// Safe external execution layer: drafts, SOPs, audits, operator plans only.
// Cannot launch ads, change budgets, send emails, delete data, or modify production systems.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { HermesRunStatus } from "@/lib/supabase/types";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { kvGet, kvSet } from "@/lib/victoria/redis";

// ── Rate limit ──────────────────────────────────────────────────────────────
// Best-effort fixed-window limiter per authenticated user. Prevents an authed
// user from spamming the external Hermes worker. Backed by Upstash when present,
// process-local memory otherwise. Never blocks on infra failure (fails open).
const RL_MAX = 10; // requests
const RL_WINDOW_SECONDS = 60;

async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    const bucket = Math.floor(Date.now() / (RL_WINDOW_SECONDS * 1000));
    const key = `veronica:hermes:rl:${userId}:${bucket}`;
    const current = (await kvGet<number>(key)) ?? 0;
    if (current >= RL_MAX) return false;
    await kvSet(key, current + 1, RL_WINDOW_SECONDS);
    return true;
  } catch {
    return true; // fail open — never let a KV blip break the feature
  }
}

// ── Strict command schema ─────────────────────────────────────────────────────
// Hermes is a dev-ops/QA layer ONLY and the worker is OUTPUT-ONLY: it returns text
// (audits, plans, drafts, summaries). It must NEVER be asked to execute, send,
// publish, or mutate any external system. Enforced server-side below.
const ALLOWED_MODES = ["audit", "plan", "draft", "summarize"] as const;
type HermesMode = (typeof ALLOWED_MODES)[number];

// Phrases implying execution / external mutation / sending / credential use.
// Defense-in-depth: dispatch is admin-only + off-by-default + the worker is
// text-only, but we still refuse prompts that request forbidden actions.
const MUTATION_DENYLIST: RegExp[] = [
  /\bsend(ing)?\s+(an?\s+|the\s+)?(email|sms|text|message|dm|reply)\b/i,
  /\b(publish|launch|deploy|go\s*live|activate)\b/i,
  /\b(delete|drop|truncate|wipe|erase)\s+(the\s+|all\s+)?(data|record|row|table|contact|lead|campaign|opportunity)\b/i,
  /\b(charge|refund|invoice|capture\s+payment|bill\s+the)\b/i,
  /\bstripe\b/i,
  /\b(trigger|run|start|fire|enroll\s+in)\s+(a\s+|the\s+)?(workflow|automation|sequence|campaign)\b/i,
  /\b(update|modify|mutate|write\s+to|push\s+to|post\s+to|sync\s+to)\s+(ghl|crm|meta|gohighlevel|leadconnector|pipeline|opportunit|contact)\b/i,
  /\b(execute|run)\s+(this\s+)?(code|command|shell|script|sql)\b/i,
  /\b(api[\s_-]?key|secret|credential|password|access[\s_-]?token|bearer\s+token)\b/i,
];

type CommandResult =
  | { ok: true; mode: HermesMode }
  | { ok: false; status: number; error: string };

function validateHermesCommand(rawMode: unknown, prompt: string): CommandResult {
  // Default a missing mode to the safest output-only mode so existing callers keep
  // working without a UI change, but any SUPPLIED mode must be in the allowlist.
  const mode =
    typeof rawMode === "string" && rawMode.trim()
      ? rawMode.trim().toLowerCase()
      : "draft";
  if (!ALLOWED_MODES.includes(mode as HermesMode)) {
    return { ok: false, status: 400, error: `Invalid mode. Allowed: ${ALLOWED_MODES.join(", ")}.` };
  }
  if (prompt.length > 8000) {
    return { ok: false, status: 413, error: "Prompt too long (max 8000 chars)." };
  }
  for (const rx of MUTATION_DENYLIST) {
    if (rx.test(prompt)) {
      return {
        ok: false,
        status: 422,
        error:
          "Rejected: Hermes is output-only (audit / plan / draft / summarize). It cannot execute, send, publish, or mutate any external system, CRM/GHL/Stripe/Meta, workflow, or credential.",
      };
    }
  }
  return { ok: true, mode: mode as HermesMode };
}

// nodejs runtime required for fetch with AbortController + DB writes.
// maxDuration tells Vercel Pro to allow up to 60s before platform kill.
export const runtime = "nodejs";
export const maxDuration = 60;

// ── Skill auto-detection ──────────────────────────────────────────────────────

const SKILL_TRIGGER_KEYWORDS = [
  "sop", "standard operating", "workflow", "checklist", "template", "playbook",
  "process", "framework", "audit", "onboarding", "report format", "campaign build",
  "crm workflow", "operator plan", "step-by-step",
];

const CATEGORY_PRIORITY: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["sop", "standard operating procedure", "standard operating"], category: "SOP" },
  { keywords: ["onboarding"], category: "Onboarding Process" },
  { keywords: ["crm workflow", "crm"], category: "CRM Workflow" },
  { keywords: ["checklist"], category: "Checklist" },
  { keywords: ["template"], category: "Template" },
  { keywords: ["playbook", "operator plan"], category: "Operator Playbook" },
  { keywords: ["campaign build", "campaign framework"], category: "Campaign Framework" },
  { keywords: ["framework"], category: "Campaign Framework" },
  { keywords: ["audit"], category: "Audit Process" },
  { keywords: ["report format"], category: "Report Format" },
  { keywords: ["workflow"], category: "Workflow" },
  { keywords: ["process"], category: "Workflow" },
];

const ACTION_PREFIX =
  /^(create|build|write|draft|generate|make|design|produce|develop|give me|prepare|create me|build me|write me)\s+(a\s+|an\s+|the\s+|me\s+a\s+)?/i;

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const { keywords, category } of CATEGORY_PRIORITY) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "Operator Playbook";
}

function generateSkillName(prompt: string): string {
  return prompt
    .replace(ACTION_PREFIX, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .slice(0, 60)
    .trim();
}

function shouldAutoCreateSkill(
  prompt: string,
  output: string
): { shouldCreate: boolean; name: string; category: string; description: string } {
  const empty = { shouldCreate: false, name: "", category: "", description: "" };
  if (!output || output.length < 500) return empty;
  const combined = (prompt + " " + output).toLowerCase();
  if (!SKILL_TRIGGER_KEYWORDS.some((k) => combined.includes(k))) return empty;
  return {
    shouldCreate: true,
    name: generateSkillName(prompt),
    category: detectCategory(combined),
    description: prompt.length > 200 ? prompt.slice(0, 197) + "…" : prompt,
  };
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function logRun(
  prompt: string,
  output: string | null,
  errorMsg: string | null,
  status: HermesRunStatus,
  createdBy: string,
  taskId?: string | null
): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseServerClient() as any;
    if (!db) return null;
    const insert: Record<string, unknown> = { prompt, output, error: errorMsg, status, created_by: createdBy };
    if (taskId) insert.task_id = taskId;
    const { data } = await db
      .from("veronica_hermes_runs")
      .insert(insert)
      .select("id")
      .single();
    return (data as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

async function createSkill(
  runId: string | null,
  name: string,
  category: string,
  description: string,
  instructions: string,
  createdBy: string
): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseServerClient() as any;
    if (!db) return null;
    const { data } = await db
      .from("veronica_hermes_skills")
      .insert({
        name,
        category,
        description,
        instructions,
        source_run_id: runId,
        created_by: createdBy,
        auto_created: true,
      })
      .select("id")
      .single();
    return (data as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

async function linkSkillToRun(runId: string, skillId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseServerClient() as any;
    if (!db) return;
    await db
      .from("veronica_hermes_runs")
      .update({ auto_skill_created: true, skill_id: skillId })
      .eq("id", runId);
  } catch {
    // Non-blocking
  }
}

async function touchSkillUsage(skillId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseServerClient() as any;
    if (!db) return;
    // Increment usage_count via rpc or a read-then-write
    const { data: skill } = await db
      .from("veronica_hermes_skills")
      .select("usage_count")
      .eq("id", skillId)
      .single();
    const current = (skill as { usage_count: number } | null)?.usage_count ?? 0;
    await db
      .from("veronica_hermes_skills")
      .update({ usage_count: current + 1, last_used_at: new Date().toISOString() })
      .eq("id", skillId);
  } catch {
    // Non-blocking
  }
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET() {
  // ── Auth: AI-builder access required to view Hermes run history ──────────────
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseServerClient() as any;
    if (!db) return NextResponse.json({ runs: [] });
    const { data, error } = await db
      .from("veronica_hermes_runs")
      .select("id, prompt, output, error, status, created_at, created_by, auto_skill_created, skill_id")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) return NextResponse.json({ runs: [] });
    return NextResponse.json({ runs: data ?? [] });
  } catch {
    return NextResponse.json({ runs: [] });
  }
}

export async function POST(req: NextRequest) {
  // ── Auth: external worker dispatch is ADMIN-ONLY (dev-ops/QA) ────────────────
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });
  }
  const userId = auth.userId;

  // ── Kill switch: dispatch is DISABLED unless explicitly enabled ─────────────
  // Off by default so no authenticated user can reach the external worker until an
  // operator opts in. Hermes stays a dev-ops/QA tool, never a runtime executor.
  if (process.env.HERMES_WORKER_ENABLED !== "true") {
    return NextResponse.json(
      {
        output: null,
        error:
          "Hermes worker dispatch is disabled. Set HERMES_WORKER_ENABLED=true to enable admin-only, output-only (audit/plan/draft/summarize) dispatch.",
      },
      { status: 501 }
    );
  }

  // ── Rate limit (per authenticated user) ─────────────────────────────────────
  if (!(await checkRateLimit(userId))) {
    return NextResponse.json(
      { output: null, error: "Rate limit exceeded. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: { prompt?: string; mode?: string; skill_id?: string; task_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, mode: incomingMode, skill_id: incomingSkillId, task_id: incomingTaskId } = body;

  // Validate task_id is a UUID if provided; discard malformed values
  const safeTaskId: string | null =
    typeof incomingTaskId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incomingTaskId.trim())
      ? incomingTaskId.trim()
      : null;
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const trimmedPrompt = prompt.trim();

  // ── Strict command schema: enforce allowed mode + reject mutation/execution ──
  const command = validateHermesCommand(incomingMode, trimmedPrompt);
  if (!command.ok) {
    await logRun(trimmedPrompt, null, command.error, "error", userId, safeTaskId);
    return NextResponse.json({ output: null, error: command.error }, { status: command.status });
  }

  const workerUrl = process.env.HERMES_WORKER_URL;
  const secret = process.env.HERMES_SECRET;

  if (!workerUrl || !secret) {
    await logRun(trimmedPrompt, null, "Hermes is not configured on this deployment.", "error", userId, safeTaskId);
    return NextResponse.json(
      { output: null, error: "Hermes is not configured on this deployment." },
      { status: 503 }
    );
  }

  // 45-second server-side abort — must respond before Vercel maxDuration (60s).
  // Client-side abort (35s) fires earlier so the user never waits for a 504.
  const vpsAbortCtrl = new AbortController();
  const vpsTimeout = setTimeout(() => vpsAbortCtrl.abort(), 45000);

  let res: Response;
  try {
    res = await fetch(`${workerUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Structured, validated command — never a raw arbitrary prompt. mode is one
      // of the output-only allowlist values; prompt passed the mutation denylist.
      body: JSON.stringify({ mode: command.mode, prompt: trimmedPrompt, secret }),
      signal: vpsAbortCtrl.signal,
    });
    clearTimeout(vpsTimeout);
  } catch (fetchErr) {
    clearTimeout(vpsTimeout);
    const isTimeout = fetchErr instanceof Error && fetchErr.name === "AbortError";
    const msg = isTimeout
      ? "Strategy engine did not respond in time. Please try again."
      : "Hermes VPS is unreachable. Please try again later.";
    const status: HermesRunStatus = isTimeout ? "error" : "unreachable";
    await logRun(trimmedPrompt, null, msg, status, userId, safeTaskId);
    return NextResponse.json({ output: null, error: msg }, { status: isTimeout ? 504 : 502 });
  }

  let data: { output?: string | null; error?: string | null };
  try {
    data = await res.json();
  } catch {
    const msg = `Hermes returned an unparseable response (HTTP ${res.status}).`;
    await logRun(trimmedPrompt, null, msg, "error", userId, safeTaskId);
    return NextResponse.json({ output: null, error: msg }, { status: 502 });
  }

  if (!res.ok) {
    const msg = data.error ?? `Hermes returned an error (HTTP ${res.status}).`;
    await logRun(trimmedPrompt, null, msg, "error", userId, safeTaskId);
    return NextResponse.json({ output: null, error: msg }, { status: res.status });
  }

  const output = data.output ?? null;
  const responseError = data.error ?? null;
  const runStatus: HermesRunStatus = responseError ? "error" : "success";

  // Log the run; get ID for skill linking
  const runId = await logRun(trimmedPrompt, output, responseError, runStatus, userId, safeTaskId);

  // If this was a skill re-run, update usage stats
  if (incomingSkillId) {
    touchSkillUsage(incomingSkillId); // fire-and-forget
  }

  // Auto-create skill on successful, non-skill-originated runs
  let autoSkillCreated = false;
  let savedSkillId: string | null = null;

  if (runStatus === "success" && output && !incomingSkillId) {
    const detection = shouldAutoCreateSkill(trimmedPrompt, output);
    if (detection.shouldCreate) {
      savedSkillId = await createSkill(
        runId,
        detection.name,
        detection.category,
        detection.description,
        output,
        userId
      );
      if (savedSkillId && runId) {
        linkSkillToRun(runId, savedSkillId); // fire-and-forget
        autoSkillCreated = true;
      }
    }
  }

  return NextResponse.json({ output, error: responseError, auto_skill_created: autoSkillCreated });
}
