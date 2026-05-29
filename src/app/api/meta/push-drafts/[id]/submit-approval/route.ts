// Server-side only — Submit a Meta push draft for human approval.
// Creates an approval record in the approvals table and sets approval_status = pending.
// NEVER writes to Meta API. NEVER creates or activates campaigns.
// All Meta writes are blocked until a separate paused-push flow is explicitly approved.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/meta/push-drafts/[id]/submit-approval
 * Submits a Meta push draft for human review.
 * Creates an approval record (related_type = "meta_push_draft") and
 * updates approval_status = "pending" on the push draft.
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canSubmitForApproval")) {
    return NextResponse.json({ error: "Forbidden — cannot submit for approval" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Draft ID is required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseServerClient() as any;
  if (!supabase) {
    return NextResponse.json({ success: true, mockMode: true, approvalId: `mock-approval-${Date.now()}` });
  }

  try {
    // Load push draft
    const { data: draftRow, error: draftErr } = await supabase
      .from("meta_push_drafts")
      .select("id, client_id, campaign_name, objective, validation_status, approval_status")
      .eq("id", id)
      .single();

    if (draftErr || !draftRow) {
      return NextResponse.json({ error: "Push draft not found" }, { status: 404 });
    }

    if (draftRow.approval_status === "pending" || draftRow.approval_status === "approved") {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        approval_status: draftRow.approval_status,
      });
    }

    const campaignName = draftRow.campaign_name ?? "Meta Push Draft";

    // Check for existing approval record to avoid duplicates
    const { data: existingApproval } = await supabase
      .from("approvals")
      .select("id, status")
      .eq("related_type", "meta_push_draft")
      .eq("related_id", id)
      .maybeSingle();

    let approvalId: string | null = existingApproval?.id ?? null;

    if (!existingApproval) {
      const { data: newApproval, error: approvalErr } = await supabase
        .from("approvals")
        .insert({
          client_id: draftRow.client_id,
          related_type: "meta_push_draft",
          related_id: id,
          approval_type: "meta_push",
          title: `Meta Push: ${campaignName}`,
          description: `Meta push draft submitted for approval. Campaign: "${campaignName}". Objective: ${draftRow.objective ?? "N/A"}. Validation status: ${draftRow.validation_status}. A human must review and approve before any Meta push is attempted. All pushes will be paused-only.`,
          risk_level: "high",
          status: "pending",
          requested_by: auth.userId,
          reviewed_by: null,
          submitted_at: new Date().toISOString(),
          reviewed_at: null,
          notes: "Meta push — paused-only — no campaigns will go live without explicit human approval.",
        })
        .select("id")
        .single();

      if (approvalErr) {
        console.error("[POST submit-approval] approvals insert:", approvalErr);
        // Don't fail — still update push draft status
      } else {
        approvalId = newApproval?.id ?? null;
      }
    }

    // Update push draft approval_status = pending
    await supabase
      .from("meta_push_drafts")
      .update({
        approval_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Log
    supabase
      .from("meta_push_logs")
      .insert({
        draft_id: id,
        client_id: draftRow.client_id,
        action: "approval_submitted",
        request_payload: { approval_id: approvalId },
        response_payload: null,
        status: "success",
        error: null,
      })
      .then(({ error: logErr }: { error: unknown }) => {
        if (logErr) console.error("[POST submit-approval] log:", logErr);
      });

    return NextResponse.json({ success: true, approvalId, approval_status: "pending" });
  } catch (err) {
    console.error("[POST /api/meta/push-drafts/[id]/submit-approval]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
