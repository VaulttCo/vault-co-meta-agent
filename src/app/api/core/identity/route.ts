// GET /api/core/identity — Vault Co Identity Core summary + legacy learnings +
// GHL source status (current/legacy). READ-ONLY. Role-guarded (canViewStrategyData).
// Mock-safe. NEVER returns credentials — only configured booleans + non-secret
// location ids.

import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { VAULT_CO_IDENTITY } from "@/lib/core/identity/vault-co-identity";
import { getLegacyAnalysis } from "@/lib/core/identity/legacy";
import { isGhlConfigured, getGhlLocationId } from "@/lib/core/integrations/ghl/client";
import type { IdentitySummary } from "@/lib/core/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const legacy = await getLegacyAnalysis();
    const id = VAULT_CO_IDENTITY;

    const summary: IdentitySummary = {
      positioning: id.positioning,
      targetMarket: id.targetMarket,
      coreOffer: id.coreOffer,
      brandVoice: [...id.brandVoice],
      messagingPrinciples: [...id.messagingPrinciples],
      avoid: [...id.avoid],
      doubleDownOn: [
        ...id.differentiators,
        ...legacy.learnings.filter((l) => l.kind === "strong").map((l) => l.title),
      ],
      legacyLearnings: legacy.learnings.map((l) => ({ title: l.title, detail: l.detail })),
      // Source status: configured booleans + non-secret location ids only.
      sources: [
        { account: "current", configured: isGhlConfigured("current"), locationId: getGhlLocationId("current") },
        { account: "legacy", configured: isGhlConfigured("legacy"), locationId: getGhlLocationId("legacy") },
      ],
    };

    return NextResponse.json({ identity: summary, legacySource: legacy.source, automationMap: legacy.automationMap });
  } catch (e) {
    console.error("[GET /api/core/identity]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load identity" }, { status: 500 });
  }
}
