// Server-side only — Meta connection metadata for push readiness.
// NEVER returns access_token_encrypted to the frontend.
// No Meta API calls. No campaign writes. Read/write to meta_connections only.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

export const runtime = "nodejs";

/**
 * GET /api/meta/connections?clientId=
 * Returns connection metadata for a client.
 * Falls back to integration_connections + clients table if no meta_connections row.
 * Never returns access_token_encrypted.
 */
export async function GET(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseServerClient() as any;
  if (!supabase) {
    return NextResponse.json({ connection: null, mockMode: true });
  }

  try {
    // Prefer dedicated meta_connections row
    const { data: connRow } = await supabase
      .from("meta_connections")
      .select("id, client_id, ad_account_id, business_id, page_id, pixel_id, token_status, created_at, updated_at")
      .eq("client_id", clientId)
      .maybeSingle();

    if (connRow) {
      return NextResponse.json({ connection: connRow });
    }

    // Fall back: compose from integration_connections + clients
    const [{ data: intConn }, { data: clientRow }] = await Promise.all([
      supabase
        .from("integration_connections")
        .select("provider_account_id, connection_status, metadata")
        .eq("client_id", clientId)
        .eq("provider", "meta")
        .maybeSingle(),
      supabase
        .from("clients")
        .select("meta_ad_account_id, facebook_page_id, meta_pixel_id")
        .eq("id", clientId)
        .maybeSingle(),
    ]);

    const fallback = {
      id: null,
      client_id: clientId,
      ad_account_id: intConn?.provider_account_id ?? clientRow?.meta_ad_account_id ?? null,
      business_id: null,
      page_id: clientRow?.facebook_page_id ?? null,
      pixel_id: clientRow?.meta_pixel_id ?? null,
      token_status: intConn?.connection_status === "connected" ? "connected" : "not_connected",
      created_at: null,
      updated_at: null,
    };

    return NextResponse.json({ connection: fallback });
  } catch (err) {
    console.error("[GET /api/meta/connections]", err);
    return NextResponse.json({ error: "Failed to load connection" }, { status: 500 });
  }
}

interface ConnectionBody {
  clientId: string;
  adAccountId?: string;
  businessId?: string;
  pageId?: string;
  pixelId?: string;
  tokenStatus?: string;
}

/**
 * POST /api/meta/connections
 * Upserts connection metadata. Never accepts access_token_encrypted.
 */
export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canConnectIntegrations")) {
    return NextResponse.json({ error: "Forbidden — admin role required to manage Meta connections" }, { status: 403 });
  }

  let body: ConnectionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const clientId = body.clientId?.trim();
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const ALLOWED_TOKEN_STATUSES = ["not_connected", "connected", "expired", "error"];
  const tokenStatus = ALLOWED_TOKEN_STATUSES.includes(body.tokenStatus ?? "")
    ? body.tokenStatus!
    : "not_connected";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseServerClient() as any;
  if (!supabase) {
    return NextResponse.json({ success: true, mockMode: true });
  }

  try {
    const { data, error } = await supabase
      .from("meta_connections")
      .upsert(
        {
          client_id: clientId,
          ad_account_id: body.adAccountId?.trim() || null,
          business_id: body.businessId?.trim() || null,
          page_id: body.pageId?.trim() || null,
          pixel_id: body.pixelId?.trim() || null,
          token_status: tokenStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id" }
      )
      .select("id, client_id, ad_account_id, business_id, page_id, pixel_id, token_status, updated_at")
      .single();

    if (error) {
      console.error("[POST /api/meta/connections]", error);
      return NextResponse.json({ error: "Failed to save connection" }, { status: 500 });
    }

    return NextResponse.json({ success: true, connection: data });
  } catch (err) {
    console.error("[POST /api/meta/connections]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
