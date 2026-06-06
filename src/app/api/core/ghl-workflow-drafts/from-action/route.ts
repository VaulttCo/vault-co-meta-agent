// POST /api/core/ghl-workflow-drafts/from-action — create a workflow DRAFT linked to
// an approved `draft_ghl_workflow` Vault Action.
//
// DRAFT-ONLY: this builds an internal review artifact from the action's sanitized
// safe_preview / reason / evidence and links source_action_id. It does NOT publish to
// GHL, does NOT mutate the action's approval/execution status, and leaves the action's
// external adapter DISABLED. It appends a single internal audit note to the action.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getAction, addActionNote } from "@/lib/core/actions/db";
import { createWorkflowDraft } from "@/lib/core/workflows/ghl-workflow-draft";
import { toWorkflowDraftDTO, getWorkflowDraftBySourceAction } from "@/lib/core/workflows/db";
import type { GHLWorkflowDraftInput } from "@/lib/core/workflows/types";

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

  // Only an APPROVED GHL-workflow action may seed a draft. (Approval is internal; the
  // action's external adapter remains disabled — this never publishes anything.)
  if (action.action_type !== "draft_ghl_workflow" || action.target_system !== "ghl") {
    return NextResponse.json({ error: "Action is not a GHL workflow draft action." }, { status: 400 });
  }
  if (action.approval_status !== "approved") {
    return NextResponse.json({ error: "Action must be approved before a workflow draft is created." }, { status: 400 });
  }

  // Idempotent: if a draft already exists for this action, return it instead of
  // spamming the queue with duplicates on repeated clicks.
  const existing = await getWorkflowDraftBySourceAction(action.id);
  if (existing) {
    return NextResponse.json({ draft: toWorkflowDraftDTO(existing), existing: true }, { status: 200 });
  }

  const input: GHLWorkflowDraftInput = {
    client_id: action.client_id,
    title: action.title,
    description: action.summary,
    workflow_type: "custom",
    source_agent: action.agent_id,
    source_action_id: action.id,
    trigger: { type: "from_action", description: action.reason ?? "Derived from an approved Vault Action." },
    steps: [
      { id: "step-1", type: "internal_note", label: "Review prepared follow-up", description: "Review the prepared follow-up intent and design the draft steps.", draft_only: true },
    ],
    evidence: Array.isArray(action.evidence) ? action.evidence : [],
    metadata: { template_key: "from_action" },
  };

  const result = await createWorkflowDraft(input, { createdBy: auth.userId });
  if (!result.created || !result.draft) {
    return NextResponse.json({ error: result.reason ?? "Could not create workflow draft" }, { status: 400 });
  }

  // Best-effort internal audit note on the action (never changes status/adapter). Uses
  // the compare-and-retry helper so a concurrent note/assign/review can't drop it.
  try {
    await addActionNote(action, {
      at: new Date().toISOString(), actor: auth.userId, event: "note_added",
      message: "Linked GHL workflow draft created (internal, draft-only).",
      detail: `workflow_draft_id=${result.draft.id}`,
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ draft: toWorkflowDraftDTO(result.draft) }, { status: 201 });
}
