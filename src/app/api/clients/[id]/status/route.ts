// Server-side only — client status update route.
// Updates public.clients.status and updated_at for a given client ID.
// Never modifies any other client fields, Meta, or GHL.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ClientStatus } from "@/lib/data";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES: ClientStatus[] = ["onboarding", "setup", "active", "paused", "archived"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── 1. Server-side auth + role resolution ────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { role: serverRole } = auth;

  // ── 2. Permission check ──────────────────────────────────────────────────
  if (!can(serverRole, "canEditClients")) {
    return NextResponse.json(
      { error: "Forbidden — admin role required to change client status" },
      { status: 403 }
    );
  }

  // ── 3. Parse and validate request body ───────────────────────────────────
  let body: { status: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { status } = body;

  if (!status || !ALLOWED_STATUSES.includes(status as ClientStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const { id: clientId } = await params;

  if (!clientId) {
    return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
  }

  // ── 4. Update in Supabase ────────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      // Mock fallback — no Supabase configured
      return NextResponse.json({ success: true, status, mockMode: true });
    }

    const { error } = await supabase
      .from("clients")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", clientId);

    if (error) {
      console.error("[PATCH /api/clients/[id]/status] Supabase error:", error);
      return NextResponse.json({ error: "Failed to update client status" }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error("[PATCH /api/clients/[id]/status]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
