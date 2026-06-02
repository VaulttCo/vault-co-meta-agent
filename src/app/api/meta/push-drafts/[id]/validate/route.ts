// Server-side only — Meta push draft validation.
// Checks draft payload completeness for Meta readiness.
// NO Meta API calls. NO campaign writes. Read/write to meta_push_drafts only.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import type { CampaignDraft } from "@/lib/planStore";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/meta/push-drafts/[id]/validate
 * Validates a push draft payload for Meta readiness.
 * Updates validation_status + validation_errors on the draft row.
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Draft ID is required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseServerClient() as any;
  if (!supabase) {
    // Mock mode (no DB): never report a real "ready" — there is no draft to verify.
    // Signal mock_ready so the UI cannot mistake this for a validated, push-ready draft.
    return NextResponse.json({
      validation_status: "mock_ready",
      validation_errors: [],
      mockMode: true,
    });
  }

  try {
    // Load draft
    const { data: draftRow, error: draftErr } = await supabase
      .from("meta_push_drafts")
      .select("*")
      .eq("id", id)
      .single();

    if (draftErr || !draftRow) {
      return NextResponse.json({ error: "Push draft not found" }, { status: 404 });
    }

    const clientId: string = draftRow.client_id;
    const payload = draftRow.payload as unknown as CampaignDraft;

    // Load connection metadata (meta_connections first, then fallback)
    const { data: metaConn } = await supabase
      .from("meta_connections")
      .select("ad_account_id, page_id, pixel_id, token_status")
      .eq("client_id", clientId)
      .maybeSingle();

    // Also check clients table for any fields missing from meta_connections
    const { data: clientRow } = await supabase
      .from("clients")
      .select("meta_ad_account_id, facebook_page_id, meta_pixel_id")
      .eq("id", clientId)
      .maybeSingle();

    const adAccountId = metaConn?.ad_account_id ?? clientRow?.meta_ad_account_id ?? null;
    const pageId = metaConn?.page_id ?? clientRow?.facebook_page_id ?? null;
    const pixelId = metaConn?.pixel_id ?? clientRow?.meta_pixel_id ?? null;
    const tokenStatus = metaConn?.token_status ?? "not_connected";

    // ── Validation checks ─────────────────────────────────────────────────────
    const errors: string[] = [];

    // Connection checks
    if (!clientId) errors.push("client_id is missing");
    if (!adAccountId) errors.push("Meta Ad Account ID is not configured — add it in client settings or Meta Connections");
    if (!pageId) errors.push("Facebook Page ID is not configured — add it in client settings");
    if (tokenStatus === "not_connected") errors.push("Meta token is not connected — token_status is 'not_connected'");
    if (tokenStatus === "expired") errors.push("Meta access token has expired — reconnect in settings");

    // Campaign payload checks
    if (!payload?.campaignName?.trim()) {
      errors.push("campaign_name is missing from draft");
    }
    if (!payload?.metaStructure?.campaignObjective) {
      errors.push("Campaign objective is missing from Meta structure");
    }
    if (!payload?.budget?.trim()) {
      errors.push("Campaign budget is not set");
    }

    // Ad set checks
    const adSets = payload?.metaStructure?.adSets ?? [];
    const adSetNames = payload?.metaStructure?.adSetNames ?? [];
    if (adSets.length === 0 && adSetNames.length === 0) {
      errors.push("No ad sets defined in Meta structure");
    }
    const requiredAdSets = adSets.filter((s) => s.requiredForLaunch);
    if (adSets.length > 0 && requiredAdSets.length === 0) {
      errors.push("No required-for-launch ad sets found — at least one ad set must be marked requiredForLaunch");
    }

    // Ad/creative checks
    const adVariations = payload?.adVariations ?? [];
    if (adVariations.length === 0) {
      errors.push("No ad creative variations in Asset Matrix — run the campaign builder with assets selected");
    } else {
      const approvedAds = adVariations.filter((v) => v.approvedForAds);
      if (approvedAds.length === 0) {
        errors.push("No approved creative assets — at least one asset must be approved for ads");
      }
    }

    // Ad copy checks
    if (!payload?.adCopy?.primaryTexts?.length) {
      errors.push("Primary ad copy text is missing");
    }
    if (!payload?.adCopy?.headlines?.length) {
      errors.push("Ad headlines are missing");
    }
    if (!payload?.adCopy?.cta) {
      errors.push("Call-to-action (CTA) is missing from ad copy");
    }

    // Lead form checks
    if (!payload?.leadForm?.formName) {
      errors.push("Lead form name is missing");
    }
    if (!payload?.leadForm?.qualificationQuestions?.length) {
      errors.push("Lead form has no qualification questions");
    }

    // Pixel readiness (advisory warning, not a blocker if retargeting ad sets exist)
    const hasRetargetingAdSet = adSets.some((s) => s.audienceTemperature === "hot");
    if (!pixelId && hasRetargetingAdSet) {
      errors.push("Meta Pixel ID is not configured — retargeting ad sets require an active pixel");
    }

    // Compliance check
    if (payload?.compliance?.approvalWarnings?.length) {
      for (const warning of payload.compliance.approvalWarnings.slice(0, 3)) {
        errors.push(`Compliance warning: ${warning}`);
      }
    }

    const validationStatus = errors.length === 0 ? "ready" : "needs_info";

    // Update the draft
    await supabase
      .from("meta_push_drafts")
      .update({
        validation_status: validationStatus,
        validation_errors: errors,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Log the validation
    supabase
      .from("meta_push_logs")
      .insert({
        draft_id: id,
        client_id: clientId,
        action: "validation_run",
        request_payload: { adAccountId, pageId, pixelId, tokenStatus },
        response_payload: { validation_status: validationStatus, error_count: errors.length },
        status: validationStatus === "ready" ? "success" : "needs_info",
        error: errors.length > 0 ? errors[0] : null,
      })
      .then(({ error: logErr }: { error: unknown }) => {
        if (logErr) console.error("[POST validate] log:", logErr);
      });

    return NextResponse.json({ validation_status: validationStatus, validation_errors: errors });
  } catch (err) {
    console.error("[POST /api/meta/push-drafts/[id]/validate]", err);
    return NextResponse.json({ error: "Unexpected error during validation" }, { status: 500 });
  }
}
