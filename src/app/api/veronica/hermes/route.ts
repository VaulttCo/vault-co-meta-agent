// Server-side only — Hermes VPS bridge for Veronica.
// Safe external execution layer: drafts, SOPs, audits, operator plans only.
// Cannot launch ads, change budgets, send emails, delete data, or modify production systems.

import { NextRequest, NextResponse } from "next/server";

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

  const workerUrl = process.env.HERMES_WORKER_URL;
  const secret = process.env.HERMES_SECRET;

  if (!workerUrl || !secret) {
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
      body: JSON.stringify({ prompt: prompt.trim(), secret }),
    });
  } catch {
    return NextResponse.json(
      { output: null, error: "Hermes VPS is unreachable. Please try again later." },
      { status: 502 }
    );
  }

  let data: { output?: string | null; error?: string | null };
  try {
    data = await res.json();
  } catch {
    return NextResponse.json(
      { output: null, error: `Hermes returned an unparseable response (HTTP ${res.status}).` },
      { status: 502 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { output: null, error: data.error ?? `Hermes returned an error (HTTP ${res.status}).` },
      { status: res.status }
    );
  }

  return NextResponse.json({
    output: data.output ?? null,
    error: data.error ?? null,
  });
}
