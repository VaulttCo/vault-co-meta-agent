// Server-side only — client profile update route.
// Updates basic contact/profile fields only.
// Never modifies Meta/GHL IDs, campaign data, or creative assets.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface EditClientBody {
  name?: string;
  owner?: string;
  email?: string;
  phone?: string;
  website?: string;
  market?: string;
  notes?: string;
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
