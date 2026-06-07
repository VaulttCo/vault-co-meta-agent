// POST /api/core/meta-campaign-drafts/from-competitor-intel — Valentina proposes a Meta
// campaign DRAFT angle from INTERNAL competitor intelligence already in Vault Core.
//
// Uses ONLY internal/manual competitor profiles + captures already stored in Vault Core.
// NO scraping, NO external fetch, NO Meta Ads Library live call, NO credentials. DRAFT-
// ONLY: builds an internal planning artifact; launches nothing, changes no budget, calls
// no Meta API. Idempotent per (competitor profile) is NOT enforced — multiple angle
// drafts per competitor are allowed; dedupe is the reviewer's call.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getProfiles, getCaptures } from "@/lib/core/competitor/db";
import { createCampaignDraft } from "@/lib/core/campaign-drafts/meta-campaign-draft";
import { toCampaignDraftDTO } from "@/lib/core/campaign-drafts/db";
import type { VaultMetaCampaignDraftInput } from "@/lib/core/campaign-drafts/types";

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
  const offers = captures.map((c) => c.offer).filter((o): o is string => !!o).slice(0, 5);
  const angles = captures.map((c) => c.angle).filter((a): a is string => !!a).slice(0, 5);

  const offerAngle = offers[0] ?? hooks[0] ?? `Response to ${profile.name}'s positioning`;
  const input: VaultMetaCampaignDraftInput = {
    client_id: profile.client_id ?? null,
    title: `Competitor response — ${profile.name}`,
    description: `Draft Meta campaign angle responding to internal competitor intel for ${profile.name}. Review and refine before any build.`,
    campaign_type: "custom",
    source_agent: "valentina",
    source_competitor_profile_id: profile.id,
    objective: "Position against competitor angles and capture comparison-shopping demand (draft plan).",
    offer_angle: offerAngle,
    audience: {
      description: `Homeowners comparing roofers in ${profile.market_niche ?? profile.service_area ?? "the service area"}.`,
      geo: profile.service_area ?? null,
      age_range: "30-65",
      interests: ["Homeownership", "Home improvement"],
      exclusions: [],
    },
    creative_direction: [
      "Differentiate on trust, quality, and honest pricing — do not name or disparage the competitor.",
      ...(hooks.length ? [`Counter observed competitor hooks: ${hooks.join("; ")}`] : []),
    ],
    ad_copy: {
      primary_texts: ["Looking for an honest, quality roofer? Here's why {{business.name}} stands out. Get your free estimate."],
      headlines: ["The Roofer Locals Trust", "Honest, Quality Roofing"],
      descriptions: ["Licensed & insured.", "Free estimate, no pressure."],
    },
    missing_inputs: [
      "Confirm our differentiators vs. this competitor",
      "Confirm service area + offer",
      ...(angles.length ? [] : ["Add competitor angle captures for a sharper response"]),
    ],
    compliance_notes: ["Do not name, target, or disparage the competitor; keep all comparative claims substantiated."],
    evidence: [
      `Competitor profile: ${profile.name}`,
      ...(offers.length ? [`Observed offers: ${offers.join("; ")}`] : []),
      ...(hooks.length ? [`Observed hooks: ${hooks.join("; ")}`] : []),
      "Source: internal Vault Core competitor intel (manual capture — no scraping).",
    ],
    metadata: { template_key: "from_competitor_intel", suggested_owner: "Valentina (positioning) + Veronica (lead gen)" },
  } as VaultMetaCampaignDraftInput;

  const result = await createCampaignDraft(input, { createdBy: auth.userId });
  if (!result.created || !result.draft) {
    return NextResponse.json({ error: result.reason ?? "Could not create campaign draft" }, { status: 400 });
  }
  return NextResponse.json({ draft: toCampaignDraftDTO(result.draft) }, { status: 201 });
}
