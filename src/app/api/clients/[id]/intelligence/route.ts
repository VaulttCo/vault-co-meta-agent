// Server-side only — client intelligence save/read route.
// Uses the service role key (bypasses RLS) — safe because every handler calls
// resolveServerRole() + can() before touching data.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ClientIntelligence } from "@/lib/clientIntelligence";

export const dynamic = "force-dynamic";

// ── GET — load intelligence for a client (used by IntelligenceProvider on mount) ──

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role: serverRole } = auth;
  if (!can(serverRole, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: clientId } = await params;
  if (!clientId) return NextResponse.json({ error: "Client ID required" }, { status: 400 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) return NextResponse.json({ intelligence: null });

    const { data, error } = await supabase
      .from("client_intelligence")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (error || !data) return NextResponse.json({ intelligence: null });

    const intel: ClientIntelligence = {
      clientId,
      extractedAt: data.updated_at,
      onboardingSummary: data.onboarding_summary ?? "",
      companyProfile: data.company_profile,
      serviceArea: data.service_area,
      targetMarket: data.target_market,
      buyerProfile: data.buyer_profile,
      marketResearch: data.market_research,
      offerIntelligence: data.offer_intelligence,
      salesIntelligence: data.sales_intelligence,
      brandIntelligence: data.brand_intelligence,
      kpiBaseline: data.kpi_baseline,
      salesAudit: data.sales_audit,
      contentPlanning: data.content_planning,
      campaignImplications: data.campaign_implications,
    };

    return NextResponse.json({ intelligence: intel });
  } catch (err) {
    console.error(`[GET /api/clients/${clientId}/intelligence]`, err);
    return NextResponse.json({ intelligence: null });
  }
}

// ── POST — upsert intelligence for a client ────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role: serverRole } = auth;
  if (!can(serverRole, "canEditClients")) {
    return NextResponse.json(
      { error: "Forbidden — admin role required to save client intelligence" },
      { status: 403 }
    );
  }

  let intel: ClientIntelligence;
  try {
    intel = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id: clientId } = await params;
  if (!clientId) return NextResponse.json({ error: "Client ID required" }, { status: 400 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) {
      return NextResponse.json({ success: true, mockMode: true });
    }

    const { error } = await supabase.from("client_intelligence").upsert(
      {
        client_id: clientId,
        onboarding_summary: intel.onboardingSummary ?? "",
        company_profile: intel.companyProfile ?? {},
        service_area: intel.serviceArea ?? {},
        target_market: intel.targetMarket ?? {},
        buyer_profile: intel.buyerProfile ?? {},
        market_research: intel.marketResearch ?? {},
        offer_intelligence: intel.offerIntelligence ?? {},
        sales_intelligence: intel.salesIntelligence ?? {},
        brand_intelligence: intel.brandIntelligence ?? {},
        kpi_baseline: intel.kpiBaseline ?? {},
        sales_audit: intel.salesAudit ?? {},
        content_planning: intel.contentPlanning ?? {},
        campaign_implications: intel.campaignImplications ?? {},
      },
      { onConflict: "client_id" }
    );

    if (error) {
      if (error.code === "23503") {
        console.error(
          `[POST /api/clients/${clientId}/intelligence] FK violation: "${clientId}" not in clients table`
        );
        return NextResponse.json(
          {
            error: `Client "${clientId}" does not exist in the database. Save the client to Supabase before saving intelligence.`,
          },
          { status: 422 }
        );
      }
      console.error(`[POST /api/clients/${clientId}/intelligence]`, error);
      return NextResponse.json({ error: "Failed to save intelligence" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[POST /api/clients/${clientId}/intelligence]`, err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
