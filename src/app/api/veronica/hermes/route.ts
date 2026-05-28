// Server-side only — Hermes VPS bridge for Veronica.
// Safe external execution layer: drafts, SOPs, audits, operator plans only.
// Cannot launch ads, change budgets, send emails, delete data, or modify production systems.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { HermesRunStatus } from "@/lib/supabase/types";

async function logRun(
  prompt: string,
  output: string | null,
  errorMsg: string | null,
  status: HermesRunStatus
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseServerClient() as any;
    if (!db) return;
    await db.from("veronica_hermes_runs").insert({
      prompt,
      output,
      error: errorMsg,
      status,
      created_by: "operator",
    });
  } catch {
    // Logging failure must never block the response
  }
}

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseServerClient() as any;
    if (!db) return NextResponse.json({ runs: [] });
    const { data, error } = await db
      .from("veronica_hermes_runs")
      .select("id, prompt, output, error, status, created_at, created_by")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      return NextResponse.json({ runs: [] });
    }
    return NextResponse.json({ runs: data ?? [] });
  } catch {
    return NextResponse.json({ runs: [] });
  }
}

export async function POST(req: NextRequest) {
  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt } = body;
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const trimmedPrompt = prompt.trim();
  const workerUrl = process.env.HERMES_WORKER_URL;
  const secret = process.env.HERMES_SECRET;

  if (!workerUrl || !secret) {
    await logRun(trimmedPrompt, null, "Hermes is not configured on this deployment.", "error");
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
    await logRun(trimmedPrompt, null, msg, "unreachable");
    return NextResponse.json({ output: null, error: msg }, { status: 502 });
  }

  let data: { output?: string | null; error?: string | null };
  try {
    data = await res.json();
  } catch {
    const msg = `Hermes returned an unparseable response (HTTP ${res.status}).`;
    await logRun(trimmedPrompt, null, msg, "error");
    return NextResponse.json({ output: null, error: msg }, { status: 502 });
  }

  if (!res.ok) {
    const msg = data.error ?? `Hermes returned an error (HTTP ${res.status}).`;
    await logRun(trimmedPrompt, null, msg, "error");
    return NextResponse.json({ output: null, error: msg }, { status: res.status });
  }

  const output = data.output ?? null;
  const responseError = data.error ?? null;
  await logRun(
    trimmedPrompt,
    output,
    responseError,
    responseError ? "error" : "success"
  );

  return NextResponse.json({ output, error: responseError });
}
