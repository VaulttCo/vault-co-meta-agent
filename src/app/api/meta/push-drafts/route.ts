// Server-side only — Meta push draft management.
// Stores campaign payload for push readiness review and approval.
// NEVER writes to Meta API. NEVER launches campaigns. NEVER activates ads.
// All push actions require human approval before any future Meta write is attempted.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import type { CampaignDraft } from "@/lib/planStore";

export const runtime = "nodejs";

/**
 * GET /api/meta/push-drafts?clientId=
 * Returns the latest push drafts for a client (up to 5).
 */
export async function GET(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseServerClient() as any;
  if (!supabase) {
    return NextResponse.json({ drafts: [], mockMode: true });
  }

  try {
    const { data, error } = await supabase
      .from("meta_push_drafts")
      .select(
        "id, client_id, campaign_draft_id, campaign_name, objective, budget_type, daily_budget, lifetime_budget, validation_status, validation_errors, approval_status, meta_push_status, created_by, created_at, updated_at"
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("[GET /api/meta/push-drafts]", error);
      return NextResponse.json({ drafts: [] });
    }

    return NextResponse.json({ drafts: data ?? [] });
  } catch (err) {
    console.error("[GET /api/meta/push-drafts]", err);
    return NextResponse.json({ drafts: [] });
  }
}

interface CreatePushDraftBody {
  clientId: string;
  campaignDraftId?: string;
  campaignDraft: CampaignDraft;
}

/**
 * POST /api/meta/push-drafts
 * Creates a new Meta push draft from the current CampaignDraft.
 * Payload is stored as JSON for validation and approval review.
 * NO Meta API calls. NO campaign creation.
 */
export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: CreatePushDraftBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const clientId = body.clientId?.trim();
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const draft = body.campaignDraft;
  if (!draft) return NextResponse.json({ error: "campaignDraft is required" }, { status: 400 });

  // Extract key fields from the CampaignDraft
  const campaignName = draft.campaignName?.trim() || null;
  const objective = draft.metaStructure?.campaignObjective?.trim() || null;

  // Parse budget — CampaignDraft.budget is a string like "$1,500/mo"
  const budgetRaw = draft.budget ?? "";
  const budgetNum = parseFloat(budgetRaw.replace(/[^0-9.]/g, "")) || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseServerClient() as any;
  if (!supabase) {
    return NextResponse.json({ success: true, mockMode: true, id: `mock-push-draft-${Date.now()}` });
  }

  try {
    const { data, error } = await supabase
      .from("meta_push_drafts")
      .insert({
        client_id: clientId,
        campaign_draft_id: body.campaignDraftId?.trim() || null,
        campaign_name: campaignName,
        objective,
        budget_type: "daily",
        daily_budget: budgetNum,
        lifetime_budget: null,
        payload: draft as unknown as Record<string, unknown>,
        validation_status: "draft",
        validation_errors: null,
        approval_status: "not_submitted",
        meta_push_status: "not_pushed",
        created_by: auth.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[POST /api/meta/push-drafts]", error);
      return NextResponse.json({ error: "Failed to create push draft" }, { status: 500 });
    }

    // Log creation
    supabase
      .from("meta_push_logs")
      .insert({
        draft_id: data.id,
        client_id: clientId,
        action: "draft_created",
        request_payload: { campaign_name: campaignName, objective },
        response_payload: null,
        status: "success",
        error: null,
      })
      .then(({ error: logErr }: { error: unknown }) => {
        if (logErr) console.error("[POST /api/meta/push-drafts] log insert:", logErr);
      });

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("[POST /api/meta/push-drafts]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
