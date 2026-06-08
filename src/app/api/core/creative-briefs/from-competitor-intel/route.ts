// POST /api/core/creative-briefs/from-competitor-intel — create a competitor-response
// creative brief from INTERNAL competitor intelligence already in Vault Core.
//
// Uses ONLY internal/manual competitor profiles + captures already stored. NO scraping, NO
// external fetch, NO Meta Ads Library live call, NO credentials. DRAFT-ONLY: builds an
// internal planning artifact; posts/publishes/launches nothing. Links
// source_competitor_profile_id.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getProfiles, getCaptures } from "@/lib/core/competitor/db";
import { createCreativeBrief } from "@/lib/core/creative-briefs/creative-brief";
import { toCreativeBriefDTO } from "@/lib/core/creative-briefs/db";
import type { VaultCreativeBriefInput } from "@/lib/core/creative-briefs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Needs both strategy-data read access and a create-capable role.
  if (!can(auth.role, "canViewStrategyData")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(auth.role === "admin" || can(auth.role, "canViewApprovals") || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const profileId = typeof body.competitor_profile_id === "string" ? body.competitor_profile_id : null;
  if (!profileId) return NextResponse.json({ error: "competitor_profile_id is required" }, { status: 400 });

  // INTERNAL lookups only — no scraping, no external fetch, no Meta Ads Library call.
  const profiles = await getProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) return NextResponse.json({ error: "Competitor profile not found" }, { status: 404 });

  const captures = (await getCaptures()).filter((c) => c.competitor_profile_id === profileId);
  const hooks = captures.map((c) => c.hook).filter((h): h is string => !!h).slice(0, 5);
  const angles = captures.map((c) => c.angle).filter((a): a is string => !!a).slice(0, 5);
  const offers = captures.map((c) => c.offer).filter((o): o is string => !!o).slice(0, 5);

  const input: VaultCreativeBriefInput = {
    client_id: profile.client_id ?? null,
    title: `Competitor response creative — ${profile.name}`,
    description: `Draft competitor-response creative brief from internal competitor intel for ${profile.name}. Differentiate on trust/quality — never name or disparage the competitor. Review before any production.`,
    brief_type: "competitor_response_creative",
    source_agent: "valentina",
    source_competitor_profile_id: profile.id,
    platform: "meta",
    content_format: "video",
    objective: "Win comparison-shopping homeowners by differentiating on trust + quality (draft).",
    audience: `Homeowners comparing roofers in ${profile.market_niche ?? profile.service_area ?? "the service area"}.`,
    hook_bank: ["Getting roofing quotes? Read this first.", "Cheapest roof quote isn't the best roof.", "4 things to check before you pick a roofer."],
    visual_direction: [
      "Confident, not negative — never name or disparage the competitor.",
      ...(hooks.length ? [`Counter observed competitor hooks: ${hooks.join("; ")}`] : []),
    ],
    deliverables: ["1x 30s video (9:16)", "2x hook variants for testing"],
    missing_inputs: [
      "Confirm our differentiators vs. this competitor",
      ...(angles.length ? [] : ["Add competitor angle captures for a sharper response"]),
    ],
    compliance_notes: ["Do not name, target, or disparage the competitor; keep comparative claims substantiated."],
    evidence: [
      `Competitor profile: ${profile.name}`,
      ...(offers.length ? [`Observed offers: ${offers.join("; ")}`] : []),
      ...(hooks.length ? [`Observed hooks: ${hooks.join("; ")}`] : []),
      "Source: internal Vault Core competitor intel (manual capture — no scraping).",
    ],
    metadata: { template_key: "from_competitor_intel", suggested_owner: "Valentina (angle) + Veronica (production)" },
  };

  const result = await createCreativeBrief(input, { createdBy: auth.userId });
  if (!result.created || !result.brief) {
    return NextResponse.json({ error: result.reason ?? "Could not create creative brief" }, { status: 400 });
  }
  return NextResponse.json({ brief: toCreativeBriefDTO(result.brief) }, { status: 201 });
}
