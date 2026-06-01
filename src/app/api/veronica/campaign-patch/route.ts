// Server-side only — Dedicated campaign strategy patch using Anthropic directly.
// Bypasses the Hermes VPS (reserved for operator tasks, SOPs, queue work).
// Called exclusively from runVeronicaBuildPipeline() in the client Build with Veronica flow.
// Cannot launch ads, change budgets, push to Meta, or delete data.

import { NextRequest, NextResponse } from "next/server";
import type { CampaignImprovementPatch } from "@/lib/council/types";

export const runtime = "nodejs";
// maxDuration tells Vercel Pro to allow up to 45s; internal abort fires at 30s.
export const maxDuration = 45;

// ── Key resolver — mirrors service.ts (primary + typo fallback) ────────────────
function resolveAnthropicKey(): string | undefined {
  return (process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPC_API_KEY)?.trim() || undefined;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT =
  "You are Veronica's internal campaign strategy refinement engine. " +
  "Task: improve this campaign draft — better copy, stronger creative angle, clearer operator guidance. " +
  "Safety: draft/review only — cannot launch ads, push to Meta, change budgets, or delete data. " +
  "Be specific to the client's actual service, market, and creative assets — no generic filler. " +
  "Be concise: max 2 sentences per string field, max 3–5 items per array. " +
  "Return only the tool call. No explanatory text outside the tool call.";

// ── Tool schema — 14 core CampaignImprovementPatch fields ────────────────────
const PATCH_TOOL = {
  name: "generate_campaign_patch",
  description:
    "Generate a compact improvement patch for a campaign draft. " +
    "Return ONLY the specified fields — concise, specific, ready to apply. " +
    "Max 2 sentences per string, max 3–5 items per array.",
  input_schema: {
    type: "object",
    properties: {
      readinessScore: {
        type: "integer",
        description: "Campaign readiness score 0–100",
        minimum: 0,
        maximum: 100,
      },
      winningAngle: {
        type: "string",
        description: "Strongest strategic campaign angle specific to this client (1–2 sentences)",
      },
      campaignName: {
        type: "string",
        description: "Improved campaign name — keep original if already strong",
      },
      primaryTexts: {
        type: "array",
        items: { type: "string", description: "One primary ad text (2–3 sentences, no generic city filler)" },
        description: "3 primary text variants tied to client, offer, and assets",
        maxItems: 3,
      },
      headlines: {
        type: "array",
        items: { type: "string", description: "One headline, max 8 words" },
        description: "3 headline variants",
        maxItems: 3,
      },
      cta: { type: "string", description: "Call-to-action button text (3–6 words)" },
      creativeDirectionSummary: {
        type: "string",
        description: "Creative angle and visual direction (1–2 sentences)",
      },
      leadFormIntro: {
        type: "string",
        description: "Lead form intro copy (1–2 sentences)",
      },
      followUpSteps: {
        type: "array",
        items: { type: "string" },
        description: "Up to 3 GHL/CRM follow-up steps",
        maxItems: 3,
      },
      complianceWarnings: {
        type: "array",
        items: { type: "string" },
        description: "Up to 3 compliance flags for this campaign",
        maxItems: 3,
      },
      optimizationNotes: {
        type: "array",
        items: { type: "string" },
        description: "Up to 3 optimization notes or KPI thresholds",
        maxItems: 3,
      },
      missingAssets: {
        type: "array",
        items: { type: "string" },
        description: "Up to 3 assets or resources missing before launch",
        maxItems: 3,
      },
      nextOperatorTasks: {
        type: "array",
        items: { type: "string" },
        description: "Up to 3 next operator action items",
        maxItems: 3,
      },
      changesMade: {
        type: "array",
        items: { type: "string" },
        description: "Up to 5 key improvements vs. the original draft",
        maxItems: 5,
      },
    },
    required: ["readinessScore", "winningAngle", "primaryTexts", "headlines", "cta", "changesMade"],
  },
};

// ── Request body ──────────────────────────────────────────────────────────────
interface CampaignPatchBody {
  clientName?: string;
  campaignName?: string;
  goal?: string;
  service?: string;
  market?: string;
  budget?: string;
  primaryTexts?: string[];
  headlines?: string[];
  cta?: string;
  creativeSummary?: string;
  assetSummaries?: string[];
  creativeNotes?: string;
}

// ── User message builder ──────────────────────────────────────────────────────
function buildUserMessage(b: CampaignPatchBody): string {
  const lines: string[] = [];
  lines.push(
    `Client: ${b.clientName ?? "Unknown"} | Service: ${b.service ?? ""} | Market: ${b.market ?? ""} | Budget: ${b.budget ?? ""} | Goal: ${b.goal ?? ""}`
  );
  if (b.campaignName) lines.push(`Campaign: ${b.campaignName}`);
  const texts = b.primaryTexts ?? [];
  if (texts[0]) lines.push(`Current text 1: ${String(texts[0]).slice(0, 150)}`);
  if (texts[1]) lines.push(`Current text 2: ${String(texts[1]).slice(0, 100)}`);
  const heads = b.headlines ?? [];
  if (heads.length) lines.push(`Current headlines: ${heads.slice(0, 3).join(" / ")}`);
  if (b.cta) lines.push(`Current CTA: ${String(b.cta).slice(0, 50)}`);
  if (b.creativeSummary) lines.push(`Creative angle: ${String(b.creativeSummary).slice(0, 100)}`);
  if (b.assetSummaries?.length) lines.push(`Assets: ${b.assetSummaries.slice(0, 4).join(", ")}`);
  if (b.creativeNotes) lines.push(`Creative notes: ${String(b.creativeNotes).slice(0, 150)}`);
  lines.push("");
  lines.push("Improve this campaign. Return the generate_campaign_patch tool call with specific, ready-to-use improvements.");
  return lines.join("\n");
}

// ── Safe array extractor ──────────────────────────────────────────────────────
function safeStrArr(obj: Record<string, unknown>, key: string, maxItems: number, maxLen: number): string[] | undefined {
  const v = obj[key];
  if (!Array.isArray(v)) return undefined;
  const result = v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .slice(0, maxItems)
    .map((x) => x.trim().slice(0, maxLen));
  return result.length > 0 ? result : undefined;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = resolveAnthropicKey();
  if (!apiKey) {
    return NextResponse.json(
      { patch: null, error: "AI provider not configured", warnings: ["Set ANTHROPIC_API_KEY to enable campaign optimization."] },
      { status: 503 }
    );
  }

  let body: CampaignPatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ patch: null, error: "Invalid request body" }, { status: 400 });
  }

  if (!body.service && !body.campaignName && !body.goal) {
    return NextResponse.json({ patch: null, error: "Insufficient context — provide at least service, goal, or campaignName" }, { status: 400 });
  }

  const userMessage = buildUserMessage(body);

  // 30-second server-side abort — must complete inside the 45s maxDuration
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);

  try {
    const t0 = Date.now();
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [PATCH_TOOL],
        tool_choice: { type: "tool", name: "generate_campaign_patch" },
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (process.env.NODE_ENV !== "production") {
      console.log(`[campaign-patch] Anthropic ${response.status} in ${Date.now() - t0}ms`);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      console.error("[campaign-patch] Anthropic error:", response.status, errText.slice(0, 200));
      return NextResponse.json(
        { patch: null, error: `AI provider returned ${response.status}`, warnings: [] },
        { status: 502 }
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return NextResponse.json({ patch: null, error: "AI provider returned unparseable response" }, { status: 502 });
    }

    // Extract tool_use block — tool calling guarantees structured output
    const content = (data as { content?: { type: string; input?: unknown; name?: string }[] })?.content ?? [];
    const toolUse = content.find((c) => c.type === "tool_use" && c.name === "generate_campaign_patch");

    let rawTextPreview = "";
    if (!toolUse || typeof toolUse.input !== "object" || toolUse.input === null) {
      const textBlock = content.find((c) => c.type === "text");
      rawTextPreview = ((textBlock as { text?: string } | undefined)?.text ?? "").slice(0, 300);
      console.error("[campaign-patch] No tool_use block in response. stop_reason:", (data as { stop_reason?: string })?.stop_reason);
      return NextResponse.json(
        { patch: null, error: "AI provider did not return tool call", rawTextPreview, warnings: [] },
        { status: 422 }
      );
    }

    // toolUse.input is already a parsed JS object — no JSON.parse needed
    const raw = toolUse.input as Record<string, unknown>;

    // Safe coercion to CampaignImprovementPatch
    const patch: CampaignImprovementPatch = {};

    if (typeof raw.readinessScore === "number" && !isNaN(raw.readinessScore)) {
      patch.readinessScore = Math.max(0, Math.min(100, Math.round(raw.readinessScore)));
    }
    if (typeof raw.winningAngle === "string" && raw.winningAngle.trim()) {
      patch.winningAngle = raw.winningAngle.trim().slice(0, 500);
    }
    if (typeof raw.campaignName === "string" && raw.campaignName.trim()) {
      patch.campaignName = raw.campaignName.trim().slice(0, 120);
    }
    if (typeof raw.cta === "string" && raw.cta.trim()) {
      patch.cta = raw.cta.trim().slice(0, 80);
    }
    if (typeof raw.creativeDirectionSummary === "string" && raw.creativeDirectionSummary.trim()) {
      patch.creativeDirectionSummary = raw.creativeDirectionSummary.trim().slice(0, 500);
    }
    if (typeof raw.leadFormIntro === "string" && raw.leadFormIntro.trim()) {
      patch.leadFormIntro = raw.leadFormIntro.trim().slice(0, 600);
    }

    const pt = safeStrArr(raw, "primaryTexts", 3, 800); if (pt) patch.primaryTexts = pt;
    const hl = safeStrArr(raw, "headlines", 3, 120); if (hl) patch.headlines = hl;
    const fs = safeStrArr(raw, "followUpSteps", 5, 300); if (fs) patch.followUpSteps = fs;
    const cw = safeStrArr(raw, "complianceWarnings", 5, 300); if (cw) patch.complianceWarnings = cw;
    const on = safeStrArr(raw, "optimizationNotes", 5, 300); if (on) patch.optimizationNotes = on;
    const ma = safeStrArr(raw, "missingAssets", 5, 200); if (ma) patch.missingAssets = ma;
    const nt = safeStrArr(raw, "nextOperatorTasks", 5, 300); if (nt) patch.nextOperatorTasks = nt;
    const cm = safeStrArr(raw, "changesMade", 10, 200); if (cm) patch.changesMade = cm;

    if (process.env.NODE_ENV !== "production") {
      console.log("[campaign-patch] Patch keys:", Object.keys(patch).join(", "));
    }

    return NextResponse.json({ patch, rawTextPreview, warnings: [] });

  } catch (err) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && err.name === "AbortError";
    const msg = isAbort
      ? "Campaign patch timed out after 30s"
      : err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200);
    console.error("[campaign-patch]", isAbort ? "timeout" : "error:", msg);
    return NextResponse.json(
      { patch: null, error: msg, warnings: [] },
      { status: isAbort ? 504 : 500 }
    );
  }
}
