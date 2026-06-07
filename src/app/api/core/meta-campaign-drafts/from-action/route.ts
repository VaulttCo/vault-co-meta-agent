// POST /api/core/meta-campaign-drafts/from-action — create a Meta campaign DRAFT linked
// to an approved `draft_meta_campaign` Vault Action (target_system = meta).
//
// DRAFT-ONLY: builds an internal planning artifact from the action's sanitized
// safe_preview / reason / evidence and links source_action_id. Does NOT launch anything,
// does NOT change a budget, does NOT change the action's approval/execution status, and
// leaves the action's Meta adapter DISABLED. Idempotent; appends one internal audit note.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getAction, addActionNote } from "@/lib/core/actions/db";
import { ACTION_META, isAdapterEnabled } from "@/lib/core/actions/policies";
import { createCampaignDraft } from "@/lib/core/campaign-drafts/meta-campaign-draft";
import { toCampaignDraftDTO, getCampaignDraftBySourceAction } from "@/lib/core/campaign-drafts/db";
import type { VaultMetaCampaignDraftInput } from "@/lib/core/campaign-drafts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canViewApprovals") || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const actionId = typeof body.action_id === "string" ? body.action_id : null;
  if (!actionId) return NextResponse.json({ error: "action_id is required" }, { status: 400 });

  const action = await getAction(actionId);
  if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });

  // Only an APPROVED meta-campaign action may seed a campaign draft. (Approval is
  // internal; the action's Meta adapter stays disabled — this never launches anything.)
  if (action.action_type !== "draft_meta_campaign") {
    return NextResponse.json({ error: "Action is not a Meta campaign draft action." }, { status: 400 });
  }
  if (action.approval_status !== "approved") {
    return NextResponse.json({ error: "Action must be approved before a campaign draft is created." }, { status: 400 });
  }
  // Defense in depth: action_type is AUTHORITATIVE — its canonical target must be the
  // DISABLED `meta` lane (so the action can never execute/launch). We check the canonical
  // target, not the persisted row, so a legacy/pre-reclassification row is handled safely.
  const meta = ACTION_META[action.action_type];
  if (isAdapterEnabled(meta.target)) {
    return NextResponse.json({ error: "This action_type does not map to the disabled Meta lane — cannot seed a campaign draft." }, { status: 400 });
  }

  const existing = await getCampaignDraftBySourceAction(action.id);
  if (existing) return NextResponse.json({ draft: toCampaignDraftDTO(existing), existing: true }, { status: 200 });

  const input: VaultMetaCampaignDraftInput = {
    client_id: action.client_id,
    title: action.title,
    description: action.summary || action.safe_preview || null,
    campaign_type: "custom",
    source_agent: action.agent_id,
    source_action_id: action.id,
    objective: action.summary || action.safe_preview || "Define the campaign objective (derived from an approved action).",
    offer_angle: action.reason ?? null,
    creative_direction: ["Define creative direction before review."],
    missing_inputs: ["Objective", "Audience", "Offer", "Creative", "Budget"],
    evidence: Array.isArray(action.evidence) ? action.evidence : [],
    metadata: { template_key: "from_action" },
  };

  const result = await createCampaignDraft(input, { createdBy: auth.userId });
  if (!result.created || !result.draft) {
    return NextResponse.json({ error: result.reason ?? "Could not create campaign draft" }, { status: 400 });
  }

  try {
    await addActionNote(action, {
      at: new Date().toISOString(), actor: auth.userId, event: "note_added",
      message: "Linked Meta campaign draft created (internal, draft-only).",
      detail: `meta_campaign_draft_id=${result.draft.id}`,
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ draft: toCampaignDraftDTO(result.draft) }, { status: 201 });
}
