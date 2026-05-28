// Server-side only — Hermes VPS bridge for Veronica.
// Safe external execution layer: drafts, SOPs, audits, operator plans only.
// Cannot launch ads, change budgets, send emails, delete data, or modify production systems.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { HermesRunStatus } from "@/lib/supabase/types";

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
  taskId?: string | null
): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseServerClient() as any;
    if (!db) return null;
    const insert: Record<string, unknown> = { prompt, output, error: errorMsg, status, created_by: "operator" };
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
  instructions: string
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
        created_by: "operator",
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
  let body: { prompt?: string; skill_id?: string; task_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, skill_id: incomingSkillId, task_id: incomingTaskId } = body;

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
  const workerUrl = process.env.HERMES_WORKER_URL;
  const secret = process.env.HERMES_SECRET;

  if (!workerUrl || !secret) {
    await logRun(trimmedPrompt, null, "Hermes is not configured on this deployment.", "error", safeTaskId);
    return NextResponse.json(
      { output: null, error: "Hermes is not configured on this deployment." },
      { status: 503 }
    );
  }

  let res: Response;
  try {
    res = await fetch(`${workerUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: trimmedPrompt, secret }),
    });
  } catch {
    const msg = "Hermes VPS is unreachable. Please try again later.";
    await logRun(trimmedPrompt, null, msg, "unreachable", safeTaskId);
    return NextResponse.json({ output: null, error: msg }, { status: 502 });
  }

  let data: { output?: string | null; error?: string | null };
  try {
    data = await res.json();
  } catch {
    const msg = `Hermes returned an unparseable response (HTTP ${res.status}).`;
    await logRun(trimmedPrompt, null, msg, "error", safeTaskId);
    return NextResponse.json({ output: null, error: msg }, { status: 502 });
  }

  if (!res.ok) {
    const msg = data.error ?? `Hermes returned an error (HTTP ${res.status}).`;
    await logRun(trimmedPrompt, null, msg, "error", safeTaskId);
    return NextResponse.json({ output: null, error: msg }, { status: res.status });
  }

  const output = data.output ?? null;
  const responseError = data.error ?? null;
  const runStatus: HermesRunStatus = responseError ? "error" : "success";

  // Log the run; get ID for skill linking
  const runId = await logRun(trimmedPrompt, output, responseError, runStatus, safeTaskId);

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
        output
      );
      if (savedSkillId && runId) {
        linkSkillToRun(runId, savedSkillId); // fire-and-forget
        autoSkillCreated = true;
      }
    }
  }

  return NextResponse.json({ output, error: responseError, auto_skill_created: autoSkillCreated });
}
