// POST /api/core/creative-briefs/from-meta-campaign-draft — create a creative brief from an
// INTERNAL Meta campaign DRAFT already stored in Vault Core.
//
// Reads ONLY the internal campaign draft (no Meta call, no ad launch, no Meta mutation).
// DRAFT-ONLY: builds an internal planning artifact from the campaign's sanitized objective /
// offer angle / audience / ad copy / creative direction / lead form / compliance notes and
// links source_meta_campaign_draft_id. Idempotent per (campaign draft, brief_type).

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getCampaignDraft } from "@/lib/core/campaign-drafts/db";
import { createCreativeBrief } from "@/lib/core/creative-briefs/creative-brief";
import { toCreativeBriefDTO, getCreativeBriefByCampaignAndType } from "@/lib/core/creative-briefs/db";
import type { VaultCreativeBriefInput, BriefType } from "@/lib/core/creative-briefs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BRIEF_TYPE: BriefType = "video_ad_brief";

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canViewApprovals") || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const campaignId = typeof body.meta_campaign_draft_id === "string" ? body.meta_campaign_draft_id : null;
  if (!campaignId) return NextResponse.json({ error: "meta_campaign_draft_id is required" }, { status: 400 });

  // INTERNAL read only — the stored campaign draft; no Meta API call, no mutation.
  const campaign = await getCampaignDraft(campaignId);
  if (!campaign) return NextResponse.json({ error: "Meta campaign draft not found" }, { status: 404 });

  // Idempotent: one video-ad brief per campaign draft.
  const existing = await getCreativeBriefByCampaignAndType(campaign.id, BRIEF_TYPE);
  if (existing) return NextResponse.json({ brief: toCreativeBriefDTO(existing), existing: true }, { status: 200 });

  const aud = campaign.audience ?? null;
  const audienceStr = aud
    ? [aud.description, aud.geo ? `Geo: ${aud.geo}` : null, aud.age_range ? `Age: ${aud.age_range}` : null,
       aud.interests?.length ? `Interests: ${aud.interests.join(", ")}` : null].filter(Boolean).join(" · ")
    : null;
  const copy = campaign.ad_copy ?? { primary_texts: [], headlines: [], descriptions: [] };

  const input: VaultCreativeBriefInput = {
    client_id: campaign.client_id,
    title: `Creative brief — ${campaign.title}`,
    description: `Draft creative brief built from the internal Meta campaign draft "${campaign.title}". Review and refine before any production. Nothing is launched or published.`,
    brief_type: BRIEF_TYPE,
    source_agent: "veronica",
    source_meta_campaign_draft_id: campaign.id,
    platform: "meta",
    content_format: "video",
    objective: campaign.objective || "Drive qualified leads via a Meta video ad (draft).",
    audience: audienceStr,
    // Primary texts → hook bank; headlines/descriptions → caption options.
    hook_bank: Array.isArray(copy.primary_texts) && copy.primary_texts.length ? copy.primary_texts.slice(0, 6) : ["Draft a lead hook before review."],
    caption_options: [...(copy.headlines ?? []), ...(copy.descriptions ?? [])].slice(0, 10),
    visual_direction: Array.isArray(campaign.creative_direction) ? campaign.creative_direction.slice(0, 10) : [],
    deliverables: ["1x video (9:16)", "1x 1:1 cutdown", "3x hook variants for testing"],
    missing_inputs: ["Source footage/photos (with permission)", "Final script", "Shot list"],
    // Carry over the campaign's compliance notes plus the offer angle as context.
    compliance_notes: Array.isArray(campaign.compliance_notes) ? campaign.compliance_notes.slice(0, 10) : [],
    evidence: [
      `From Meta campaign draft: ${campaign.title}`,
      ...(campaign.offer_angle ? [`Offer angle: ${campaign.offer_angle}`] : []),
      "Source: internal Vault Core campaign draft (no Meta call).",
    ],
    metadata: { template_key: "from_meta_campaign_draft", suggested_owner: "Veronica (ad creative)" },
  };

  const result = await createCreativeBrief(input, { createdBy: auth.userId });
  if (!result.created || !result.brief) {
    return NextResponse.json({ error: result.reason ?? "Could not create creative brief" }, { status: 400 });
  }
  return NextResponse.json({ brief: toCreativeBriefDTO(result.brief) }, { status: 201 });
}
