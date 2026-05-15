// Server-side only — save Veronica-generated outputs as approval-ready internal drafts.
// Writes to public.veronica_drafts. Never writes to Meta, GHL, or any external system.
// Never sends SMS, email, or any notification. Does not publish or activate anything.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_DRAFT_TYPES = [
  "campaign_draft",
  "ghl_workflow_blueprint",
  "client_message_draft",
  "creative_brief",
  "internal_task_list",
  "report_draft",
  "ad_copy_draft",
] as const;

type AllowedDraftType = (typeof ALLOWED_DRAFT_TYPES)[number];

interface SaveDraftBody {
  clientId?: string;
  draftType: string;
  title: string;
  content: string;
  sourcePrompt?: string;
  agentsUsed?: string[];
  dataSources?: string[];
}

export async function POST(req: NextRequest) {
  // ── 1. Auth ───────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { role: serverRole, userId } = auth;

  // ── 2. Permission ─────────────────────────────────────────────
  // Draft creation requires the same permission as client data access.
  // Setters and client_viewers cannot save internal drafts.
  if (!can(serverRole, "canViewAiBuilder")) {
    return NextResponse.json(
      { error: "Forbidden — media buyer or admin role required to save Veronica drafts" },
      { status: 403 }
    );
  }

  // ── 3. Parse body ─────────────────────────────────────────────
  let body: SaveDraftBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { clientId, draftType, title, content, sourcePrompt, agentsUsed, dataSources } = body;

  // ── 4. Validate ───────────────────────────────────────────────
  if (!ALLOWED_DRAFT_TYPES.includes(draftType as AllowedDraftType)) {
    return NextResponse.json(
      { error: `Invalid draft_type. Allowed values: ${ALLOWED_DRAFT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const trimmedContent = content?.trim();
  if (!trimmedContent) {
    return NextResponse.json({ error: "content is required and cannot be empty" }, { status: 400 });
  }

  const trimmedTitle = title?.trim();
  if (!trimmedTitle) {
    return NextResponse.json({ error: "title is required and cannot be empty" }, { status: 400 });
  }

  // Reject any fields not in the allowlist — no arbitrary inserts
  const safeAgentsUsed = Array.isArray(agentsUsed) ? agentsUsed.map(String) : [];
  const safeDataSources = Array.isArray(dataSources) ? dataSources.map(String) : [];
  const safeSourcePrompt = typeof sourcePrompt === "string" ? sourcePrompt.trim().slice(0, 2000) : null;
  const safeClientId = typeof clientId === "string" && clientId.trim() ? clientId.trim() : null;

  // ── 5. Insert ─────────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      // No Supabase configured — mock mode, treat as success
      return NextResponse.json({ success: true, mockMode: true, id: `mock-${Date.now()}` });
    }

    const { data, error } = await supabase
      .from("veronica_drafts")
      .insert({
        client_id: safeClientId,
        draft_type: draftType as AllowedDraftType,
        title: trimmedTitle,
        content: trimmedContent,
        source_prompt: safeSourcePrompt,
        agents_used: safeAgentsUsed,
        data_sources: safeDataSources,
        approval_status: "needs_review",
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      // FK violation — client_id not in clients table
      if (error.code === "23503") {
        console.error("[POST /api/veronica/drafts] FK violation — client_id not in clients table:", safeClientId);
        // Retry without client_id rather than failing the save
        const { data: d2, error: e2 } = await supabase
          .from("veronica_drafts")
          .insert({
            client_id: null,
            draft_type: draftType as AllowedDraftType,
            title: trimmedTitle,
            content: trimmedContent,
            source_prompt: safeSourcePrompt,
            agents_used: safeAgentsUsed,
            data_sources: safeDataSources,
            approval_status: "needs_review",
            created_by: userId,
          })
          .select("id")
          .single();

        if (e2) {
          console.error("[POST /api/veronica/drafts]", e2);
          return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
        }
        return NextResponse.json({ success: true, id: d2.id, clientIdDropped: true });
      }

      console.error("[POST /api/veronica/drafts]", error);
      return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("[POST /api/veronica/drafts]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
