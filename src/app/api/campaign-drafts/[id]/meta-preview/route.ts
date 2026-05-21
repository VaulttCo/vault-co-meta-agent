// Server-side only — read-only Meta payload preview.
// Reads campaign_drafts + integration_connections. Zero Meta API calls. Zero writes.
// All previewed objects carry status: "PAUSED_PREVIEW_ONLY".

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildMetaPreviewPayload } from "@/lib/metaPreview";
import type { CampaignDraftRow, IntegrationConnectionRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth ──────────────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: draftId } = await params;
  if (!draftId) {
    return NextResponse.json({ error: "Draft ID required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  // ── Fetch draft ───────────────────────────────────────────────────
  const { data: draftRaw, error: draftError } = await supabase
    .from("campaign_drafts")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    console.error("[GET /api/campaign-drafts/[id]/meta-preview] draft fetch error", draftError);
    return NextResponse.json({ error: "Failed to fetch draft" }, { status: 500 });
  }
  if (!draftRaw) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const draft = draftRaw as unknown as CampaignDraftRow;

  // ── Fetch integrations ────────────────────────────────────────────
  const { data: integrationsRaw } = await supabase
    .from("integration_connections")
    .select("*")
    .eq("client_id", draft.client_id);

  const integrations = (integrationsRaw ?? []) as unknown as IntegrationConnectionRow[];

  // ── Build preview (pure, no external calls) ───────────────────────
  const payload = buildMetaPreviewPayload(draft, integrations);

  return NextResponse.json(
    { preview: payload },
    {
      headers: {
        "X-Preview-Only": "true",
        "Cache-Control": "no-store",
      },
    }
  );
}
