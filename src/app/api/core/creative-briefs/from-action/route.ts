// POST /api/core/creative-briefs/from-action — create a creative brief linked to an
// approved `prepare_content_idea` / `prepare_competitor_response` / `draft_meta_campaign`
// Vault Action.
//
// DRAFT-ONLY: builds an internal planning artifact from the action's sanitized safe_preview
// / summary / reason / evidence and links source_action_id. Does NOT post/publish/upload/
// launch anything, does NOT change the action's approval/execution status, and touches no
// external system. Idempotent; appends one internal audit note to the action.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getAction, addActionNote } from "@/lib/core/actions/db";
import { createCreativeBrief } from "@/lib/core/creative-briefs/creative-brief";
import { toCreativeBriefDTO, getCreativeBriefBySourceAction } from "@/lib/core/creative-briefs/db";
import type { VaultCreativeBriefInput, BriefType } from "@/lib/core/creative-briefs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CREATIVE_ACTION_TYPES = ["prepare_content_idea", "prepare_competitor_response", "draft_meta_campaign"];

// Map a source action_type to a sensible starting brief_type.
function briefTypeForAction(actionType: string): BriefType {
  if (actionType === "draft_meta_campaign") return "video_ad_brief";
  if (actionType === "prepare_competitor_response") return "competitor_response_creative";
  return "custom";
}

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

  // Only an APPROVED creative-relevant action may seed a brief. (Approval is internal;
  // this never posts/publishes/launches — the content adapter stays disabled.)
  if (!CREATIVE_ACTION_TYPES.includes(action.action_type)) {
    return NextResponse.json({ error: "Action is not a creative brief action (prepare_content_idea / prepare_competitor_response / draft_meta_campaign)." }, { status: 400 });
  }
  if (action.approval_status !== "approved") {
    return NextResponse.json({ error: "Action must be approved before a creative brief is created." }, { status: 400 });
  }

  const existing = await getCreativeBriefBySourceAction(action.id);
  if (existing) return NextResponse.json({ brief: toCreativeBriefDTO(existing), existing: true }, { status: 200 });

  const input: VaultCreativeBriefInput = {
    client_id: action.client_id,
    title: action.title,
    description: action.summary || action.safe_preview || null,
    brief_type: briefTypeForAction(action.action_type),
    source_agent: action.agent_id,
    source_action_id: action.id,
    objective: action.summary || action.safe_preview || "Define the creative objective (derived from an approved action).",
    hook_bank: ["Draft a lead hook before review."],
    deliverables: ["Define deliverables before review."],
    missing_inputs: ["Objective", "Audience", "Source media/assets", "Hooks"],
    evidence: Array.isArray(action.evidence) ? action.evidence : [],
    metadata: { template_key: "from_action" },
  };

  const result = await createCreativeBrief(input, { createdBy: auth.userId });
  if (!result.created || !result.brief) {
    return NextResponse.json({ error: result.reason ?? "Could not create creative brief" }, { status: 400 });
  }

  try {
    await addActionNote(action, {
      at: new Date().toISOString(), actor: auth.userId, event: "note_added",
      message: "Linked creative brief created (internal, draft-only).",
      detail: `creative_brief_id=${result.brief.id}`,
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ brief: toCreativeBriefDTO(result.brief) }, { status: 201 });
}
