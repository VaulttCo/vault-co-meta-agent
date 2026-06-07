// POST /api/core/message-drafts/from-action — create a message DRAFT linked to an
// approved `draft_client_message` / `draft_lead_reply` Vault Action.
//
// DRAFT-ONLY: builds an internal review artifact from the action's sanitized
// safe_preview / reason / evidence and links source_action_id. Does NOT send, does NOT
// change the action's approval/execution status, and leaves the action's external
// adapter DISABLED. Idempotent; appends one internal audit note to the action.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getAction, addActionNote } from "@/lib/core/actions/db";
import { ACTION_META, isAdapterEnabled } from "@/lib/core/actions/policies";
import { createMessageDraft } from "@/lib/core/messages/message-draft";
import { toMessageDraftDTO, getMessageDraftBySourceAction } from "@/lib/core/messages/db";
import type { VaultMessageDraftInput, MessageChannel, MessageType, MessageAudience } from "@/lib/core/messages/types";

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

  // Only an APPROVED message-draft action may seed a message draft. (Approval is
  // internal; the action's external adapter stays disabled — this never sends.)
  if (action.action_type !== "draft_client_message" && action.action_type !== "draft_lead_reply") {
    return NextResponse.json({ error: "Action is not a message draft action." }, { status: 400 });
  }
  if (action.approval_status !== "approved") {
    return NextResponse.json({ error: "Action must be approved before a message draft is created." }, { status: 400 });
  }
  // Defense in depth: action_type is AUTHORITATIVE — its canonical target must be a
  // DISABLED send lane (so the action can never execute/send). We check the canonical
  // target, not the persisted row, so a legacy/pre-reclassification row (whose stored
  // target may be stale) is handled safely — `canExecute()` already blocks execution of
  // any row whose persisted target/risk disagree with ACTION_META.
  const meta = ACTION_META[action.action_type];
  if (isAdapterEnabled(meta.target)) {
    return NextResponse.json({ error: "This action_type does not map to a disabled send lane — cannot seed a message draft." }, { status: 400 });
  }

  const existing = await getMessageDraftBySourceAction(action.id);
  if (existing) return NextResponse.json({ draft: toMessageDraftDTO(existing), existing: true }, { status: 200 });

  const isLead = action.action_type === "draft_lead_reply";
  const channel: MessageChannel = isLead ? "sms" : "email";
  const message_type: MessageType = isLead ? "lead_reply" : "client_update";
  const audience: MessageAudience = isLead ? "lead" : "client";

  const input: VaultMessageDraftInput = {
    client_id: action.client_id,
    title: action.title,
    message_type,
    channel,
    audience,
    source_agent: action.agent_id,
    source_action_id: action.id,
    subject: channel === "email" ? action.title : null,
    body: action.summary || action.safe_preview || "Draft message prepared from an approved action. Review and refine before any send.",
    intent: action.reason ?? "Derived from an approved Vault Action.",
    evidence: Array.isArray(action.evidence) ? action.evidence : [],
    metadata: { template_key: "from_action" },
  };

  const result = await createMessageDraft(input, { createdBy: auth.userId });
  if (!result.created || !result.draft) {
    return NextResponse.json({ error: result.reason ?? "Could not create message draft" }, { status: 400 });
  }

  try {
    await addActionNote(action, {
      at: new Date().toISOString(), actor: auth.userId, event: "note_added",
      message: "Linked message draft created (internal, draft-only).",
      detail: `message_draft_id=${result.draft.id}`,
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ draft: toMessageDraftDTO(result.draft) }, { status: 201 });
}
