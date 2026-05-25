// Server-side only — GET /api/ai/status
// Returns current AI provider configuration for the Veronica Console status indicator.
// Never exposes key values in the response.

import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";

function detectRuntime(): string {
  if (process.env.VERCEL_ENV) return `vercel-${process.env.VERCEL_ENV}`;
  if (process.env.VERCEL) return "vercel";
  return process.env.NODE_ENV === "production" ? "production" : "local";
}

// Primary: ANTHROPIC_API_KEY. Fallback: legacy misspelled env var.
// Returns whether a key exists and whether it is under the legacy name.
function resolveAnthropicKeyInfo(): { hasKey: boolean; usingLegacyKeyName: boolean } {
  const primary = process.env.ANTHROPIC_API_KEY?.trim();
  if (primary) return { hasKey: true, usingLegacyKeyName: false };
  const legacy = process.env.ANTHROPC_API_KEY?.trim(); // historical Vercel typo fallback
  if (legacy) return { hasKey: true, usingLegacyKeyName: true };
  return { hasKey: false, usingLegacyKeyName: false };
}

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = ((process.env.AI_PROVIDER ?? "").trim().toLowerCase()) || "mock";
  const { hasKey, usingLegacyKeyName } = resolveAnthropicKeyInfo();
  const hasOpenAIKey = !!(process.env.OPENAI_API_KEY?.trim());

  // "configured" means: the declared provider actually has its required key.
  // mock is always configured (no key needed).
  const configured =
    provider === "anthropic" ? hasKey :
    provider === "openai" ? hasOpenAIKey :
    true;

  return NextResponse.json({
    provider,
    configured,
    // Only relevant when provider=anthropic. Tells the UI the key is under a misspelled name.
    usingLegacyKeyName: provider === "anthropic" ? usingLegacyKeyName : false,
    runtime: detectRuntime(),
  });
}
