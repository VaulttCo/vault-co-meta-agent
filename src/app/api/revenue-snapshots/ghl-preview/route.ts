// Server-side only — GHL read-only preview for a billing month.
//
// POST — fetches Closed Won opportunities from GHL for the given client + billing month.
//        Admin-only. Never saves to DB. Never writes to GHL.
//        Returns GHLPreviewResult for the UI to display before the admin chooses to save.
//
// Safety: read-only GHL access only. No Stripe. No invoices. No GHL writes.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getGHLClosedWonForMonth } from "@/lib/integrations/ghl/client";
import type { GHLPreviewResult } from "@/lib/revenue/types";

export const dynamic = "force-dynamic";

const RECURRING_FEE_PCT = 0.05;

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admin role required to preview GHL revenue" },
      { status: 403 }
    );
  }

  let body: { clientId?: string; billingMonth?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { clientId, billingMonth } = body;

  if (!clientId?.trim()) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }
  if (!billingMonth || !/^\d{4}-\d{2}-\d{2}$/.test(billingMonth)) {
    return NextResponse.json({ error: "billingMonth must be YYYY-MM-DD" }, { status: 400 });
  }

  // Load client revenue settings to get pipelineId and verify recurring billing is active
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseServerClient() as any;
  let ghlPipelineId: string | null = null;
  let ghlLocationId: string | null = null;

  if (supabase) {
    const { data: settingsRaw } = await supabase
      .from("client_revenue_settings")
      .select("ghl_pipeline_id, ghl_location_id, recurring_billing_active")
      .eq("client_id", clientId.trim())
      .maybeSingle();

    if (settingsRaw) {
      ghlPipelineId = settingsRaw.ghl_pipeline_id ?? null;
      ghlLocationId = settingsRaw.ghl_location_id ?? null;

      if (!settingsRaw.recurring_billing_active) {
        return NextResponse.json(
          { error: "Recurring billing is not active for this client. Enable it in Revenue Settings before syncing GHL revenue." },
          { status: 422 }
        );
      }
    }

    // If no location ID in revenue settings, fall back to clients table
    if (!ghlLocationId) {
      const { data: clientRaw } = await supabase
        .from("clients")
        .select("ghl_location_id, ghl_pipeline_id")
        .eq("id", clientId.trim())
        .maybeSingle();

      if (clientRaw) {
        ghlLocationId = clientRaw.ghl_location_id ?? null;
        if (!ghlPipelineId) ghlPipelineId = clientRaw.ghl_pipeline_id ?? null;
      }
    }
  }

  if (!ghlLocationId) {
    return NextResponse.json(
      { error: "No GHL Location ID configured for this client. Add it in Revenue Settings or Client Settings." },
      { status: 422 }
    );
  }

  // Fetch Closed Won deals from GHL (read-only)
  const result = await getGHLClosedWonForMonth(clientId.trim(), billingMonth, ghlPipelineId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: 502 }
    );
  }

  const vaultCoFee            = Math.round(result.totalRevenue * RECURRING_FEE_PCT * 100) / 100;
  const nickRecurringEarnings  = vaultCoFee;

  const preview: GHLPreviewResult = {
    clientId:              clientId.trim(),
    billingMonth,
    ghlLocationId,
    ghlPipelineId,
    closedWonDealsCount:   result.dealCount,
    closedWonRevenue:      result.totalRevenue,
    vaultCoFee,
    nickRecurringEarnings,
    jaxonRecurringEarnings: 0,
    source:                "ghl",
    dealPreview:           result.deals,
  };

  return NextResponse.json({ preview });
}
