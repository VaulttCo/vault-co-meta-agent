// POST /api/core/message-drafts/from-workflow-draft — create a message DRAFT from a
// `draft_sms` / `draft_email` step of an approved/reviewable GHL workflow draft.
//
// DRAFT-ONLY: links source_workflow_draft_id, preserves the step's draft body/tokens.
// Does NOT send, NOT trigger the workflow, NOT mutate GHL. Per-step idempotent.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getWorkflowDraft } from "@/lib/core/workflows/db";
import { sanitizeStoredSteps } from "@/lib/core/workflows/validation";
import { createMessageDraft } from "@/lib/core/messages/message-draft";
import { toMessageDraftDTO, getMessageDraftBySourceWorkflowStep } from "@/lib/core/messages/db";
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
  const workflowDraftId = typeof body.workflow_draft_id === "string" ? body.workflow_draft_id : null;
  const stepId = typeof body.step_id === "string" ? body.step_id : null;
  if (!workflowDraftId || !stepId) return NextResponse.json({ error: "workflow_draft_id and step_id are required" }, { status: 400 });

  const wf = await getWorkflowDraft(workflowDraftId);
  if (!wf) return NextResponse.json({ error: "Workflow draft not found" }, { status: 404 });

  // Only seed from a workflow draft that has reached review or approval — never from a
  // raw/unsubmitted draft, and never from one humans already rejected/archived/sent back.
  const SOURCEABLE = ["pending_review", "future_adapter_required", "approved_internal"];
  if (!SOURCEABLE.includes(wf.status)) {
    return NextResponse.json({ error: `Workflow draft is ${wf.status.replace(/_/g, " ")} — cannot seed a message draft from it.` }, { status: 400 });
  }

  // Re-sanitize stored steps at this boundary (don't trust a backfilled/service-role
  // row) before copying any step text into a new message draft.
  const step = sanitizeStoredSteps(wf.steps).find((s) => s.id === stepId);
  if (!step) return NextResponse.json({ error: "Step not found in workflow draft" }, { status: 404 });
  if (step.type !== "draft_sms" && step.type !== "draft_email") {
    return NextResponse.json({ error: "Only draft_sms / draft_email steps can seed a message draft." }, { status: 400 });
  }

  const existing = await getMessageDraftBySourceWorkflowStep(workflowDraftId, stepId);
  if (existing) return NextResponse.json({ draft: toMessageDraftDTO(existing), existing: true }, { status: 200 });

  const channel: MessageChannel = step.type === "draft_email" ? "email" : "sms";
  // Client-facing workflows (onboarding, client check-in, etc.) seed CLIENT messages;
  // lead-facing workflows seed lead replies. Don't mislabel client emails as lead SMS.
  const clientFacing = ["onboarding_access_request", "client_check_in", "nurture_sequence"].includes(wf.workflow_type) || channel === "email";
  const audience: MessageAudience = clientFacing ? "client" : "lead";
  const message_type: MessageType = clientFacing ? "client_update" : "lead_reply";
  const input: VaultMessageDraftInput = {
    client_id: wf.client_id,
    title: `${wf.title} — ${step.label}`,
    message_type,
    channel,
    audience,
    source_agent: wf.source_agent,
    source_workflow_draft_id: wf.id,
    subject: channel === "email" ? step.label : null,
    body: step.draft_text || step.description || "Draft message from workflow step. Review and refine before any send.",
    intent: `From GHL workflow draft step "${step.label}".`,
    evidence: [`From workflow draft: ${wf.title}`],
    metadata: { template_key: "from_workflow_step", source_step_id: stepId },
  };

  const result = await createMessageDraft(input, { createdBy: auth.userId });
  if (!result.created || !result.draft) {
    return NextResponse.json({ error: result.reason ?? "Could not create message draft" }, { status: 400 });
  }
  return NextResponse.json({ draft: toMessageDraftDTO(result.draft) }, { status: 201 });
}
