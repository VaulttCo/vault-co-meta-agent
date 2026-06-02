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
import { getGHLClosedWonForMonth, clientGhlTrackingEnabled, CLIENT_GHL_DISABLED_BODY } from "@/lib/integrations/ghl/client";
import { resolveGHLCredentials } from "@/lib/integrations/credential-resolver";
import type { GHLPreviewResult } from "@/lib/revenue/types";

export const dynamic = "force-dynamic";

const RECURRING_FEE_PCT = 0.05;

// Mask a location ID for safe display: "abc...xyz" or "not set"
function maskId(id: string | null | undefined): string {
  if (!id || id.length < 6) return id ? `${id.slice(0, 2)}...` : "not set";
  return `${id.slice(0, 3)}...${id.slice(-3)}`;
}

export async function POST(req: NextRequest) {
  // Feature flag — this route reads a client's own GHL sub-account (per-client
  // tracking) for the Revenue Dashboard preview. Admin-only, GET-only, no GHL
  // mutation. Enabled by default; set CLIENT_GHL_TRACKING_ENABLED=false to disable
  // (501). NOT used by Vault Core runtime (Vault Core uses the env-only core client).
  if (!clientGhlTrackingEnabled()) {
    return NextResponse.json(CLIENT_GHL_DISABLED_BODY, { status: 501 });
  }

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseServerClient() as any;
  let ghlPipelineId: string | null = null;
  let ghlLocationId: string | null = null;
  let locationSource: string = "none";

  if (supabase) {
    const { data: settingsRaw } = await supabase
      .from("client_revenue_settings")
      .select("ghl_pipeline_id, ghl_location_id, recurring_billing_active")
      .eq("client_id", clientId.trim())
      .maybeSingle();

    if (settingsRaw) {
      ghlPipelineId = settingsRaw.ghl_pipeline_id ?? null;

      if (settingsRaw.ghl_location_id) {
        ghlLocationId = settingsRaw.ghl_location_id;
        locationSource = "revenue_settings";
      }

      // Only block if an explicit row exists and has recurring_billing_active = false.
      // No row means the client hasn't been configured yet — allow preview.
      if (settingsRaw.recurring_billing_active === false) {
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

      if (clientRaw?.ghl_location_id) {
        ghlLocationId = clientRaw.ghl_location_id;
        locationSource = "client_profile";
      }
      if (clientRaw && !ghlPipelineId) {
        ghlPipelineId = clientRaw.ghl_pipeline_id ?? null;
      }
    }
  }

  // Fallback: resolveGHLCredentials covers encrypted per-client creds and global env.
  // This is the path Kaczmar takes — credentials stored encrypted in
  // client_integration_credentials, location ID inside the decrypted blob.
  let resolvedCredentialSource: string | undefined;
  if (!ghlLocationId) {
    const resolved = await resolveGHLCredentials(clientId.trim());
    if (resolved?.locationId) {
      ghlLocationId = resolved.locationId;
      locationSource = resolved.source === "per-client" ? "encrypted_credentials" : "global_env";
      resolvedCredentialSource = resolved.source;
    }
  }

  if (!ghlLocationId) {
    return NextResponse.json(
      {
        error: "No GHL Location ID found for this client. Set it in Revenue Settings, Client Settings, or save GHL credentials in the Integrations tab.",
        locationSource: "none",
        locationIdPresent: false,
        locationIdMasked: "not set",
      },
      { status: 422 }
    );
  }

  // Fetch Closed Won deals from GHL (read-only).
  // Pass ghlLocationId explicitly so the function uses the same source as the status check
  // rather than re-resolving credentials and potentially picking a different location.
  const result = await getGHLClosedWonForMonth(
    clientId.trim(),
    billingMonth,
    ghlPipelineId ?? undefined,
    ghlLocationId
  );

  const debugMeta = {
    locationSource,
    locationIdPresent: true,
    locationIdMasked: maskId(ghlLocationId),
    credentialSource: resolvedCredentialSource ?? locationSource,
    ...(result.ghlStatusCode !== undefined ? { ghlStatusCode: result.ghlStatusCode } : {}),
  };

  if (result.error) {
    return NextResponse.json(
      { error: result.error, ...debugMeta },
      { status: 502 }
    );
  }

  const vaultCoFee           = Math.round(result.totalRevenue * RECURRING_FEE_PCT * 100) / 100;
  const nickRecurringEarnings = vaultCoFee;

  const preview: GHLPreviewResult = {
    clientId:              clientId.trim(),
    billingMonth,
    // Raw ghlLocationId intentionally OMITTED from the response — kept server-side
    // only. The masked value + source are returned below for display/debug.
    ghlPipelineId,
    closedWonDealsCount:   result.dealCount,
    closedWonRevenue:      result.totalRevenue,
    vaultCoFee,
    nickRecurringEarnings,
    jaxonRecurringEarnings: 0,
    source:                "ghl",
    dealPreview:           result.deals,
    // Safe debug metadata
    locationSource,
    locationIdPresent: true,
    locationIdMasked:  maskId(ghlLocationId),
    credentialSource:  resolvedCredentialSource ?? locationSource,
  };

  return NextResponse.json({ preview });
}
