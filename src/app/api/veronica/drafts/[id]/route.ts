// Server-side only — update approval_status on a single veronica_drafts row.
// On approval, auto-creates a linked operator_tasks row for internal tracking.
// No Meta, GHL, SMS, email, or external action.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["needs_review", "approved", "changes_requested", "archived"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── 1. Auth ───────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Permission ─────────────────────────────────────────────
  // Status changes require the same admin-level gate as campaign approval.
  if (!can(auth.role, "canApproveCampaigns")) {
    return NextResponse.json(
      { error: "Forbidden — admin role required to update Veronica draft status" },
      { status: 403 }
    );
  }

  // ── 3. Route param ────────────────────────────────────────────
  const { id: draftId } = await params;
  if (!draftId?.trim()) {
    return NextResponse.json({ error: "Missing draft id" }, { status: 400 });
  }

  // ── 4. Parse body ─────────────────────────────────────────────
  let body: { approvalStatus: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── 5. Validate ───────────────────────────────────────────────
  if (!ALLOWED_STATUSES.includes(body.approvalStatus as AllowedStatus)) {
    return NextResponse.json(
      { error: `Invalid approval_status. Allowed: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // ── 6. Update ─────────────────────────────────────────────────
  // Only approval_status and updated_at are ever written. No external action.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json({ success: true, mockMode: true });
    }

    const { error } = await supabase
      .from("veronica_drafts")
      .update({
        approval_status: body.approvalStatus as AllowedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId.trim());

    if (error) {
      console.error("[PATCH /api/veronica/drafts/[id]]", error);
      return NextResponse.json({ error: "Failed to update draft status" }, { status: 500 });
    }

    // ── 7. Auto-create operator task on approval ──────────────────
    // Internal tracking only — no external action taken.
    let createdTaskId: string | undefined;
    let taskAlreadyExists = false;

    if (body.approvalStatus === "approved") {
      try {
        const { data: draftRow } = await supabase
          .from("veronica_drafts")
          .select("id, client_id, draft_type, clients(company_name)")
          .eq("id", draftId.trim())
          .single();

        if (draftRow) {
          const { data: existing } = await supabase
            .from("operator_tasks")
            .select("id")
            .eq("source_draft_id", draftId.trim())
            .limit(1);

          if (existing?.length) {
            taskAlreadyExists = true;
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clientName = (draftRow.clients as any)?.company_name ?? null;
            const sfx = clientName ? ` for ${clientName}` : "";
            const desc = "Generated from approved Veronica draft. Internal task only. No external action has been performed.";

            const DRAFT_TASK_MAP: Record<string, { titleBase: string; taskType: string; priority: string }> = {
              ghl_workflow_blueprint:  { titleBase: "Build approved GHL workflow",                                taskType: "ghl_workflow",    priority: "high"   },
              client_message_draft:    { titleBase: "Send approved client message manually",                     taskType: "client_message",  priority: "medium" },
              ad_copy_draft:           { titleBase: "Add approved ad copy to campaign draft",                    taskType: "campaign",        priority: "high"   },
              campaign_draft:          { titleBase: "Review approved campaign draft for launch readiness",       taskType: "campaign",        priority: "high"   },
              creative_brief:          { titleBase: "Execute approved creative brief",                           taskType: "creative",        priority: "medium" },
              report_draft:            { titleBase: "Review approved report draft for client delivery",          taskType: "reporting",       priority: "medium" },
              internal_task_list:      { titleBase: "Review approved internal task list",                        taskType: "internal_admin",  priority: "medium" },
            };

            const mapping = DRAFT_TASK_MAP[draftRow.draft_type as string];
            if (mapping) {
              const now = new Date().toISOString();
              const { data: newTask } = await supabase
                .from("operator_tasks")
                .insert({
                  title: `${mapping.titleBase}${sfx}`,
                  description: desc,
                  task_type: mapping.taskType,
                  priority: mapping.priority,
                  status: "open",
                  client_id: draftRow.client_id ?? null,
                  source_draft_id: draftId.trim(),
                  checklist: [],
                  created_at: now,
                  updated_at: now,
                })
                .select("id")
                .single();

              createdTaskId = newTask?.id ?? undefined;
            }
          }
        }
      } catch (taskErr) {
        console.error("[PATCH /api/veronica/drafts/[id]] task auto-creation failed:", taskErr);
        // Non-fatal — draft approval always succeeds even if task creation fails
      }
    }

    return NextResponse.json({
      success: true,
      ...(createdTaskId !== undefined && { createdTaskId }),
      ...(taskAlreadyExists && { taskAlreadyExists: true }),
    });
  } catch (err) {
    console.error("[PATCH /api/veronica/drafts/[id]]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
