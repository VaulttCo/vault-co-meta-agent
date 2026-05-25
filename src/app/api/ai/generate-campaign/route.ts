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

// Only redact patterns that are structurally API keys.
// Does NOT redact model names, URLs, or JSON content — those are needed for debugging.
function sanitizeError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : String(raw);
  return msg
    .slice(0, 400)
    // Anthropic key: sk-ant-api03-<base64 payload>
    .replace(/sk-ant-[A-Za-z0-9_-]+/gi, "[ANTHROPIC_KEY_REDACTED]")
    // OpenAI key: sk-<48+ alphanumeric>
    .replace(/sk-[A-Za-z0-9]{48,}/g, "[OPENAI_KEY_REDACTED]")
    // Generic base64 blob (contains = padding and 40+ chars) — catches other token formats
    .replace(/[A-Za-z0-9+/]{40,}={1,2}/g, "[TOKEN_REDACTED]")
    .trim();
}

// Resolve the Anthropic API key.
// Primary: ANTHROPIC_API_KEY (correct spelling).
// Fallback: ANTHROPC_API_KEY (historical typo — some Vercel envs may use this name).
// Returns a boolean tuple: [resolvedKey, usingLegacyName]
// NEVER log or return the resolved key value.
function resolveAnthropicKeyInfo(): { hasKey: boolean; usingLegacyKeyName: boolean } {
  const primary = process.env.ANTHROPIC_API_KEY?.trim();
  if (primary) return { hasKey: true, usingLegacyKeyName: false };
  const legacy = process.env.ANTHROPC_API_KEY?.trim();
  if (legacy) return { hasKey: true, usingLegacyKeyName: true };
  return { hasKey: false, usingLegacyKeyName: false };
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

  // ── 2. Env diagnostics — computed once, never include key values ──────────
  const provider = ((process.env.AI_PROVIDER ?? "").trim().toLowerCase()) || "mock";
  const { hasKey: hasAnthropicKey, usingLegacyKeyName } = resolveAnthropicKeyInfo();
  const hasOpenAIKey = !!(process.env.OPENAI_API_KEY?.trim());
  const runtime = detectRuntime();

  const providerDiagnostics = {
    providerName: provider,
    hasAIProvider: provider !== "mock",
    hasAnthropicKey: provider === "anthropic" ? hasAnthropicKey : undefined,
    // Flag if the key was found under the legacy misspelled env var name
    usingLegacyKeyName: provider === "anthropic" ? usingLegacyKeyName : undefined,
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
    // Means the provider call failed at runtime (wrong model, API error, timeout).
    // Return 502 with a sanitized error so the frontend can show something actionable.
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

    // ── 5b. Intentional mock (AI_PROVIDER=mock or unset) → 200 ───────────
    return NextResponse.json(result);
  } catch (err) {
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
