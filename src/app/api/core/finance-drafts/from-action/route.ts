// POST /api/core/finance-drafts/from-action — create a finance DRAFT linked to an approved
// `draft_invoice` or `prepare_budget_recommendation` Vault Action.
//
// DRAFT-ONLY: builds an internal planning artifact from the action's sanitized
// safe_preview / summary / reason / evidence and links source_action_id. Does NOT create/
// send/finalize an invoice, does NOT charge/collect, does NOT change the action's
// approval/execution status, and touches no external system. Idempotent; appends one
// internal audit note to the action.
//
// NOTE: unlike the GHL/message/Meta draft handoffs (which seed from DISABLED external-lane
// actions), the finance source actions live on INTERNAL lanes (`report`/`internal`). That
// is fine: the action's internal completion never touches Stripe, and this finance draft —
// the artifact — is itself draft-only with the finance adapter disabled.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getAction, addActionNote } from "@/lib/core/actions/db";
import { createFinanceDraft } from "@/lib/core/finance-drafts/finance-draft";
import { toFinanceDraftDTO, getFinanceDraftBySourceAction } from "@/lib/core/finance-drafts/db";
import type { VaultFinanceDraftInput } from "@/lib/core/finance-drafts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FINANCE_ACTION_TYPES = ["draft_invoice", "prepare_budget_recommendation"];

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

  // Only an APPROVED finance-relevant action may seed a finance draft. (Approval is
  // internal; this never invoices/charges — the finance adapter stays disabled.)
  if (!FINANCE_ACTION_TYPES.includes(action.action_type)) {
    return NextResponse.json({ error: "Action is not a finance draft action (draft_invoice / prepare_budget_recommendation)." }, { status: 400 });
  }
  if (action.approval_status !== "approved") {
    return NextResponse.json({ error: "Action must be approved before a finance draft is created." }, { status: 400 });
  }

  const existing = await getFinanceDraftBySourceAction(action.id);
  if (existing) return NextResponse.json({ draft: toFinanceDraftDTO(existing), existing: true }, { status: 200 });

  const input: VaultFinanceDraftInput = {
    client_id: action.client_id,
    title: action.title,
    description: action.summary || action.safe_preview || null,
    finance_type: "custom",
    source_agent: action.agent_id,
    source_action_id: action.id,
    calculation: action.summary || action.safe_preview || null,
    missing_inputs: ["Confirm finance subtype", "Confirm amounts", "Confirm terms"],
    evidence: Array.isArray(action.evidence) ? action.evidence : [],
    metadata: { template_key: "from_action" },
  };

  const result = await createFinanceDraft(input, { createdBy: auth.userId });
  if (!result.created || !result.draft) {
    return NextResponse.json({ error: result.reason ?? "Could not create finance draft" }, { status: 400 });
  }

  try {
    await addActionNote(action, {
      at: new Date().toISOString(), actor: auth.userId, event: "note_added",
      message: "Linked finance draft created (internal, draft-only).",
      detail: `finance_draft_id=${result.draft.id}`,
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ draft: toFinanceDraftDTO(result.draft) }, { status: 201 });
}
