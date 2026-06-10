// POST /api/core/client-health/from-message-draft — create a client-health DRAFT from an
// INTERNAL message draft whose type signals a client-health moment (check-in, no-response
// follow-up, onboarding access, payment follow-up, report summary).
//
// READS the internal message draft only. NO send, NO GHL mutation, NO workflow trigger,
// NO external fetch. The health draft is composed from the message TYPE and client ref —
// not the message body — so no outreach copy is duplicated into the health lane.
// Idempotent via source_message_draft_id (1:1 message draft → health draft).

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getMessageDraft } from "@/lib/core/messages/db";
import { createClientHealthDraft } from "@/lib/core/client-health/health-draft";
import { toClientHealthDraftDTO, getClientHealthDraftBySourceMessageDraft } from "@/lib/core/client-health/db";
import type { VaultClientHealthDraftInput, HealthType } from "@/lib/core/client-health/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Message types that signal a client-health moment, and the health lens each maps to.
const HEALTH_MESSAGE_TYPES: Record<string, HealthType> = {
  client_check_in: "communication_risk_review",
  client_update: "communication_risk_review",
  no_show_follow_up: "communication_risk_review",
  onboarding_access_request: "onboarding_risk_review",
  payment_follow_up: "retention_risk_review",
  report_summary: "client_health_review",
};

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canViewApprovals") || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const messageDraftId = typeof body.message_draft_id === "string" ? body.message_draft_id : null;
  if (!messageDraftId) return NextResponse.json({ error: "message_draft_id is required" }, { status: 400 });

  const msg = await getMessageDraft(messageDraftId);
  if (!msg) return NextResponse.json({ error: "Message draft not found" }, { status: 404 });

  const healthType = HEALTH_MESSAGE_TYPES[msg.message_type];
  if (!healthType) {
    return NextResponse.json({ error: "Message draft type does not indicate a client-health moment (check-in / no-response / onboarding / payment / report types only)." }, { status: 400 });
  }

  const existing = await getClientHealthDraftBySourceMessageDraft(msg.id);
  if (existing) return NextResponse.json({ draft: toClientHealthDraftDTO(existing), existing: true }, { status: 200 });

  const typeLabel = msg.message_type.replace(/_/g, " ");
  // Composed from the message TYPE only — deliberately not the message body/subject, so
  // outreach copy never crosses into the health lane and can't trip contact-language checks.
  const input: VaultClientHealthDraftInput = {
    client_id: msg.client_id,
    title: `Client health signal — ${typeLabel}`,
    description: `Internal health review prompted by a ${typeLabel} message draft. Assess the underlying client signal; the message itself stays in its own draft lane for human review.`,
    health_type: healthType,
    source_agent: msg.source_agent ?? "vivian",
    source_message_draft_id: msg.id,
    risk_reasons: [`A ${typeLabel} draft was needed for this client — assess the underlying signal`],
    communication_risks: healthType === "communication_risk_review" ? ["Review response cadence and last-touch recency"] : [],
    next_best_actions: ["Complete the health assessment; the linked message draft is reviewed separately in /message-drafts"],
    follow_up_message_ref: msg.id,
    missing_inputs: ["Confirm health score inputs", "Confirm risk label"],
    evidence: [`Linked message draft (${typeLabel}, internal, draft-only)`, `Message draft status: ${msg.status}`],
    metadata: { template_key: "from_message_draft" },
  };

  const result = await createClientHealthDraft(input, { createdBy: auth.userId });
  if (!result.created || !result.draft) {
    return NextResponse.json({ error: result.reason ?? "Could not create client-health draft" }, { status: 400 });
  }
  return NextResponse.json({ draft: toClientHealthDraftDTO(result.draft) }, { status: 201 });
}
