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

  // Approximate request body size from Content-Length header.
  // Available before body is parsed; used in diagnostics only — key values never appear here.
  const approximatePayloadSize = (() => {
    const cl = req.headers.get("content-length");
    return cl ? parseInt(cl, 10) : null;
  })();

  const providerDiagnostics = {
    providerName: provider,
    hasAIProvider: provider !== "mock",
    hasAnthropicKey: provider === "anthropic" ? hasAnthropicKey : undefined,
    // Flag if the key was found under the legacy misspelled env var name
    usingLegacyKeyName: provider === "anthropic" ? usingLegacyKeyName : undefined,
    runtime,
    approximatePayloadSize,
  } as const;

  // ── 3. Check: live provider set but API key missing → 503 ────────────────
  const missingEnvNames: string[] = [];
  if (provider === "anthropic" && !hasAnthropicKey) missingEnvNames.push("ANTHROPIC_API_KEY");
  if (provider === "openai" && !hasOpenAIKey) missingEnvNames.push("OPENAI_API_KEY");

  if (missingEnvNames.length > 0) {
    return NextResponse.json(
      {
        error: "Live AI provider is not configured in Vercel.",
        failureStage: "env",
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
    return NextResponse.json(
      { error: "Invalid request body", failureStage: "parse", ...providerDiagnostics },
      { status: 400 }
    );
  }

  if (!body.client || !body.service || !body.market || !body.budget || !body.goal) {
    return NextResponse.json(
      {
        error: "Missing required fields: client, service, market, budget, goal",
        failureStage: "parse",
        ...providerDiagnostics,
      },
      { status: 400 }
    );
  }

  // Count assets and analyses for diagnostics (never log their content).
  const assetCount =
    (body.selectedAssets?.length ?? 0) + (body.selectedAsset ? 1 : 0);
  const analysisCount = Object.keys(body.assetAnalyses ?? {}).length;

  // ── 5. Generate ──────────────────────────────────────────────────────────
  try {
    const result = await generateCampaignDraft(body);

    // ── 5a. Live provider configured but fell back to mock → 502 ───────────
    // Means the provider call failed at runtime (wrong model, API error, timeout).
    // Return 502 with a sanitized error so the frontend can show something actionable.
    if ((provider === "anthropic" || provider === "openai") && result.mockMode) {
      const failureStage = result.failureStage ?? "provider_call";
      const rawNotice = result.notice ?? "Provider call failed — check Vercel function logs.";
      // For timeouts: give a clear, actionable message instead of the raw notice.
      const errorMessage =
        failureStage === "timeout"
          ? "Live AI generation timed out (>50s). Vercel Hobby plan has a 60s function limit. Fallback draft shown."
          : `Live AI provider call failed: ${sanitizeError(rawNotice)}`;
      return NextResponse.json(
        {
          error: errorMessage,
          sanitizedError: sanitizeError(rawNotice),
          failureStage,
          assetCount,
          analysisCount,
          ...providerDiagnostics,
        },
        { status: 502 }
      );
    }

    // ── 5b. Intentional mock (AI_PROVIDER=mock or unset) → 200 ───────────
    return NextResponse.json(result);
  } catch (err) {
    // generateCampaignDraft should never throw — safeFallback in service.ts handles recovery.
    // If we reach here, both the provider AND the mock fallback crashed (extremely rare).
    const sanitizedError = sanitizeError(err);
    // Extract failureStage from StagedError if available, else "unknown".
    const failureStage: string =
      err != null && typeof err === "object" && "stage" in err
        ? String((err as { stage: unknown }).stage)
        : "unknown";
    // Safe diagnostic log — no key values, no full prompts, no URLs.
    console.error("[generate-campaign] Both provider and fallback failed:", {
      failureStage,
      assetCount,
      analysisCount,
      hasAdSets: !!(body as { metaStructure?: unknown } | undefined)?.metaStructure,
      sanitizedError,
    });
    return NextResponse.json(
      {
        error: `Campaign generation failed [${failureStage}] — both provider and mock fallback crashed.`,
        sanitizedError,
        failureStage,
        assetCount,
        analysisCount,
        ...providerDiagnostics,
      },
      { status: 500 }
    );
  }
}
