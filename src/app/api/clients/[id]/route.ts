// Server-side only — client profile read/update route.
// GET returns the current client row from Supabase (for refresh after edit).
// PATCH updates safe profile fields only — never touches Meta/GHL APIs, campaigns, or assets.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ── GET — load current client row ─────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Permission ────────────────────────────────────────────────
  // This row exposes client contact fields plus Meta/GHL reference IDs, so an
  // authenticated-but-unprivileged role must not be able to read arbitrary client
  // IDs. canViewClients is true for admin/media_buyer/setter and false for
  // client_viewer — which keeps client_viewer from reading other clients here.
  if (!can(auth.role, "canViewClients")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: clientId } = await params;
  if (!clientId) return NextResponse.json({ error: "Client ID required" }, { status: 400 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) return NextResponse.json({ client: null });

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (error || !data) return NextResponse.json({ client: null });

    // Map ClientRow → Client (mirrors SupabaseDataProvider.rowToClient)
    const client = {
      id: data.id,
      name: data.company_name,
      owner: data.owner_name,
      email: data.email ?? "",
      phone: data.phone ?? "",
      website: data.website ?? "",
      market: (data.service_areas ?? [])[0] ?? "",
      services: data.services_offered ?? [],
      avgJobValue: data.average_job_value ?? "",
      monthlyBudget: data.monthly_ad_budget ?? "",
      offer: data.offer ?? "",
      brandTone: data.brand_tone ?? "",
      status: data.status,
      notes: data.notes ?? "",
      metaAccountId: data.meta_ad_account_id ?? "",
      pixelId: data.meta_pixel_id ?? "",
      fbPageId: data.facebook_page_id ?? "",
      instagramId: data.instagram_account_id ?? "",
      ghlLocationId: data.ghl_location_id ?? "",
      ghlPipelineId: data.ghl_pipeline_id ?? "",
      stats: { leads: 0, booked: 0, cpl: "$0", cpba: "$0", showRate: "0%", pipeline: "$0", revenue: "$0", spend: "$0" },
      campaigns: [],
    };

    return NextResponse.json({ client });
  } catch (err) {
    console.error("[GET /api/clients/[id]]", err);
    return NextResponse.json({ client: null });
  }
}

// ── PATCH — update safe profile fields ───────────────────────────────────────

interface EditClientBody {
  name?: string;
  owner?: string;
  email?: string;
  phone?: string;
  website?: string;
  market?: string;
  notes?: string;
  // Integration ID backfill — reference fields only; no Meta/GHL API writes
  ghlPipelineId?: string;
  metaAccountId?: string;
  pixelId?: string;
  fbPageId?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── 1. Auth ───────────────────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { role: serverRole } = auth;

  // ── 2. Permission ─────────────────────────────────────────────
  if (!can(serverRole, "canEditClients")) {
    return NextResponse.json(
      { error: "Forbidden — admin role required to edit client details" },
      { status: 403 }
    );
  }

  // ── 3. Parse body ─────────────────────────────────────────────
  let body: EditClientBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id: clientId } = await params;
  if (!clientId) {
    return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
  }

  // ── 4. Build allowed-field-only update payload ────────────────
  const dbUpdates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const v = body.name.trim();
    if (!v) return NextResponse.json({ error: "Company name cannot be empty" }, { status: 400 });
    dbUpdates.company_name = v;
  }
  if (body.owner !== undefined) {
    const v = body.owner.trim();
    if (!v) return NextResponse.json({ error: "Owner name cannot be empty" }, { status: 400 });
    dbUpdates.owner_name = v;
  }
  if (body.email !== undefined) dbUpdates.email = body.email.trim() || null;
  if (body.phone !== undefined) dbUpdates.phone = body.phone.trim() || null;
  if (body.website !== undefined) dbUpdates.website = body.website.trim() || null;
  if (body.market !== undefined) {
    dbUpdates.service_areas = body.market.trim() ? [body.market.trim()] : [];
  }
  if (body.notes !== undefined) dbUpdates.notes = body.notes.trim() || null;
  // Integration ID backfill fields — stored in clients table, not sent to any external API
  if (body.ghlPipelineId !== undefined) dbUpdates.ghl_pipeline_id = body.ghlPipelineId.trim() || null;
  if (body.metaAccountId !== undefined) dbUpdates.meta_ad_account_id = body.metaAccountId.trim() || null;
  if (body.pixelId !== undefined) dbUpdates.meta_pixel_id = body.pixelId.trim() || null;
  if (body.fbPageId !== undefined) dbUpdates.facebook_page_id = body.fbPageId.trim() || null;

  if (Object.keys(dbUpdates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  dbUpdates.updated_at = new Date().toISOString();

  // ── 5. Update Supabase ────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json({ success: true, mockMode: true });
    }

    const { error } = await supabase
      .from("clients")
      .update(dbUpdates)
      .eq("id", clientId);

    if (error) {
      console.error("[PATCH /api/clients/[id]] Supabase error:", error);
      return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/clients/[id]]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
