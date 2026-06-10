// POST /api/core/client-health/from-action — create a client-health DRAFT linked to an
// approved client-success-relevant Vault Action (prepare_client_success_plan /
// draft_client_message / draft_report / draft_invoice).
//
// DRAFT-ONLY: builds an internal planning artifact from the action's sanitized
// safe_preview / summary / reason / evidence and links source_action_id. Does NOT contact
// a client, does NOT send anything, does NOT change the action's approval/execution
// status, and touches no external system. Idempotent; appends one internal audit note to
// the action.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getAction, addActionNote } from "@/lib/core/actions/db";
import { createClientHealthDraft } from "@/lib/core/client-health/health-draft";
import { toClientHealthDraftDTO, getClientHealthDraftBySourceAction } from "@/lib/core/client-health/db";
import type { VaultClientHealthDraftInput, HealthType } from "@/lib/core/client-health/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Action types that may seed a client-health draft, and the health lens each maps to.
const HEALTH_ACTION_TYPES: Record<string, HealthType> = {
  prepare_client_success_plan: "client_health_review",
  draft_client_message: "communication_risk_review",
  draft_report: "client_health_review",
  draft_invoice: "retention_risk_review",
};

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

  // Only an APPROVED client-success-relevant action may seed a health draft. (Approval is
  // internal; this never contacts a client — the client-success adapter stays disabled.)
  const healthType = HEALTH_ACTION_TYPES[action.action_type];
  if (!healthType) {
    return NextResponse.json({ error: "Action is not a client-health source action (prepare_client_success_plan / draft_client_message / draft_report / draft_invoice)." }, { status: 400 });
  }
  if (action.approval_status !== "approved") {
    return NextResponse.json({ error: "Action must be approved before a client-health draft is created." }, { status: 400 });
  }

  const existing = await getClientHealthDraftBySourceAction(action.id);
  if (existing) return NextResponse.json({ draft: toClientHealthDraftDTO(existing), existing: true }, { status: 200 });

  const input: VaultClientHealthDraftInput = {
    client_id: action.client_id,
    title: `Client health — ${action.title}`,
    description: action.summary || action.safe_preview || null,
    health_type: healthType,
    source_agent: action.agent_id,
    source_action_id: action.id,
    risk_reasons: action.reason ? [action.reason] : [],
    next_best_actions: ["Review the linked action context and complete the health assessment"],
    missing_inputs: ["Confirm health score inputs", "Confirm risk label", "Confirm internal owner"],
    evidence: Array.isArray(action.evidence) ? action.evidence : [],
    metadata: { template_key: "from_action" },
  };

  const result = await createClientHealthDraft(input, { createdBy: auth.userId });
  if (!result.created || !result.draft) {
    return NextResponse.json({ error: result.reason ?? "Could not create client-health draft" }, { status: 400 });
  }

  try {
    await addActionNote(action, {
      at: new Date().toISOString(), actor: auth.userId, event: "note_added",
      message: "Linked client-health draft created (internal, draft-only).",
      detail: `client_health_draft_id=${result.draft.id}`,
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ draft: toClientHealthDraftDTO(result.draft) }, { status: 201 });
}
