import { NextRequest, NextResponse } from "next/server";
import { generateCampaignDraft } from "@/lib/ai/service";
import type { CampaignGenerationInput } from "@/lib/ai/service";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

// Server-side only — never expose ANTHROPIC_API_KEY in responses or logs.

// Extend Vercel function timeout to 60s (max for hobby plan, well within pro plan limit)
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function detectRuntime(): string {
  if (process.env.VERCEL_ENV) return `vercel-${process.env.VERCEL_ENV}`;
  if (process.env.VERCEL) return "vercel";
  return process.env.NODE_ENV === "production" ? "production" : "local";
}

// Strip anything that looks like an API key (long base64/hex token) before
// including an error string in the response. Never log key values.
function sanitizeError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : String(raw);
  return msg
    .slice(0, 300)
    .replace(/[A-Za-z0-9+/=_-]{40,}/g, "[REDACTED]")
    .trim();
}

// ─────────────────────────────────────────────────────────────
// POST /api/ai/generate-campaign
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Auth ─────────────────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(auth.role, "canGenerateCampaigns")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 2. Env diagnostics — computed once, used in all error responses ──────
  // NEVER include the actual key values in any response or log.
  const provider = ((process.env.AI_PROVIDER ?? "").trim().toLowerCase()) || "mock";
  const hasAnthropicKey = !!(process.env.ANTHROPIC_API_KEY?.trim());
  const hasOpenAIKey = !!(process.env.OPENAI_API_KEY?.trim());
  const runtime = detectRuntime();

  const providerDiagnostics = {
    providerName: provider,
    hasAIProvider: provider !== "mock",
    hasAnthropicKey: provider === "anthropic" ? hasAnthropicKey : undefined,
    runtime,
  } as const;

  // ── 3. Check: live provider set but API key missing → 503 ────────────────
  const missingEnvNames: string[] = [];
  if (provider === "anthropic" && !hasAnthropicKey) missingEnvNames.push("ANTHROPIC_API_KEY");
  if (provider === "openai" && !hasOpenAIKey) missingEnvNames.push("OPENAI_API_KEY");

  if (missingEnvNames.length > 0) {
    return NextResponse.json(
      {
        error: "Live AI provider is not configured in Vercel.",
        missingEnvNames,
        ...providerDiagnostics,
      },
      { status: 503 }
    );
  }

  // ── 4. Parse body ────────────────────────────────────────────────────────
  let body: CampaignGenerationInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.client || !body.service || !body.market || !body.budget || !body.goal) {
    return NextResponse.json(
      { error: "Missing required fields: client, service, market, budget, goal" },
      { status: 400 }
    );
  }

  // ── 5. Generate ──────────────────────────────────────────────────────────
  try {
    const result = await generateCampaignDraft(body);

    // ── 5a. Live provider configured but fell back to mock → 502 ───────────
    // This means the provider call failed at runtime (bad key, API error, timeout).
    // Return 502 so the frontend can show a specific, actionable error.
    if ((provider === "anthropic" || provider === "openai") && result.mockMode) {
      return NextResponse.json(
        {
          error: "Live AI provider call failed.",
          sanitizedError: sanitizeError(result.notice ?? "Provider call failed — check Vercel function logs."),
          ...providerDiagnostics,
        },
        { status: 502 }
      );
    }

    // ── 5b. Explicit mock mode (AI_PROVIDER=mock or unset) → 200 with mockMode ─
    // This is intentional mock operation — return the draft normally.
    return NextResponse.json(result);
  } catch (err) {
    // Unexpected throw from generateCampaignDraft — should not happen in normal
    // operation but provides actionable diagnostics if it does.
    console.error("[POST /api/ai/generate-campaign] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "Campaign generation failed.",
        sanitizedError: sanitizeError(err),
        ...providerDiagnostics,
      },
      { status: 500 }
    );
  }
}
