// Server-side only — Veronica Console API route.
// Read-only: fetches portal data, calls Anthropic, returns operator insights.
// Never writes to Meta, GHL, or any live system.

import { NextRequest, NextResponse } from "next/server";
import { getDataProvider } from "@/lib/data/data-provider";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import {
  buildVeronicaSystemPrompt,
  buildSynthesisPrompt,
  buildOperatorTaskSuggestions,
  routeToAgents,
  runSelectedAgents,
  assembleApprovalGating,
  aggregateDataConfidence,
  clientMatchesMessage,
  mockVeronicaResponse,
  type VeronicaConsoleResponse,
  type VeronicaPortalContext,
  type IntegrationConnection,
} from "@/lib/ai/veronica";
import { AGENT_DISPLAY_NAMES } from "@/lib/ai/veronica-agents";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import type { Client } from "@/lib/data";
import type { MetaCampaignSnapshotRow, GHLOpportunitySnapshotRow } from "@/lib/supabase/types";

// Read clients using the service role key so RLS is not a barrier and real UUIDs are returned.
// SupabaseDataProvider.getClients() uses the browser client which has no server session,
// causing RLS to block reads and fall back to mock slugs ("kaczmar-builders") instead of UUIDs.
async function readClientsServiceRole(): Promise<Client[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("company_name");

    if (error || !data?.length) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row: any): Client => ({
      id: row.id,
      name: row.company_name,
      owner: row.owner_name,
      email: row.email ?? "",
      phone: row.phone ?? "",
      website: row.website ?? "",
      market: (row.service_areas ?? [])[0] ?? "",
      services: row.services_offered ?? [],
      avgJobValue: row.average_job_value ?? "",
      monthlyBudget: row.monthly_ad_budget ?? "",
      offer: row.offer ?? "",
      brandTone: row.brand_tone ?? "",
      status: row.status,
      notes: row.notes ?? "",
      metaAccountId: row.meta_ad_account_id ?? "",
      pixelId: row.meta_pixel_id ?? "",
      fbPageId: row.facebook_page_id ?? "",
      instagramId: row.instagram_account_id ?? "",
      ghlLocationId: row.ghl_location_id ?? "",
      ghlPipelineId: row.ghl_pipeline_id ?? "",
      stats: { leads: 0, booked: 0, cpl: "$0", cpba: "$0", showRate: "0%", pipeline: "$0", revenue: "$0", spend: "$0" },
      campaigns: [],
    }));
  } catch {
    return [];
  }
}

// Read client intelligence using the service role key so RLS is not a barrier.
// The browser client (used by SupabaseDataProvider) is unauthenticated on the server
// because auth sessions are cookie-based via @supabase/ssr, not localStorage.
async function readIntelligenceServiceRole(clientId: string): Promise<ClientIntelligence | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseServerClient() as any;
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("client_intelligence")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (error || !data) return null;

    return {
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
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // ── 1. Server-side auth + role resolution ────────────────────────────────
  // SECURITY: Role is resolved entirely from the Supabase server-side session.
  // Any userRole field in the request body is intentionally ignored.
  const auth = await resolveServerRole();
  if (!auth) {
    // No valid session — unauthenticated
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const serverRole = auth.role;

  // ── 2. Permission check ──────────────────────────────────────────────────
  // Veronica Console requires canViewAiBuilder + canViewStrategyData.
  // client_viewer and setter do not have these permissions.
  if (!can(serverRole, "canViewAiBuilder") || !can(serverRole, "canViewStrategyData")) {
    return NextResponse.json(
      {
        error: "Forbidden — your role does not have access to the Veronica Console operator tools.",
      },
      { status: 403 }
    );
  }

  // ── 3. Parse request body ────────────────────────────────────────────────
  // NOTE: userRole from body is intentionally NOT used — use serverRole only.
  let body: { message: string; clientId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { message, clientId } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Use the server-resolved role for all downstream logic
  const userRole = serverRole;

  try {
    const db = getDataProvider();

    // Fetch all core portal data in parallel.
    // readClientsServiceRole() uses the service role key so Supabase UUIDs are returned
    // instead of mock slugs (which would cause FK violations when saving drafts).
    const [supabaseClients, allDrafts, allApprovals, allReports] = await Promise.all([
      readClientsServiceRole(),
      db.getCampaignDrafts(),
      db.getApprovals(),
      db.getReports(),
    ]);
    // Fall back to mock clients only when Supabase is not configured or returns nothing
    const clients = supabaseClients.length > 0 ? supabaseClients : await db.getClients();

    // If no explicit clientId, detect a mentioned client from the message text (fuzzy)
    let effectiveClientId = clientId;
    if (!effectiveClientId) {
      const detected = clients.find((c) => clientMatchesMessage(c, message));
      if (detected) effectiveClientId = detected.id;
    }

    // Fetch client-specific data when a client is targeted (explicit or detected from message)
    let clientIntelligence = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let creativeAssets: any[] = [];
    if (effectiveClientId) {
      [clientIntelligence, creativeAssets] = await Promise.all([
        readIntelligenceServiceRole(effectiveClientId),
        db.getCreativeAssets(effectiveClientId),
      ]);
    }

    // Try to read integration_connections from Supabase (read-only — no writes)
    const integrationConnections: IntegrationConnection[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = getSupabaseServerClient() as any;
      if (supabase) {
        const { data } = await supabase
          .from("integration_connections")
          .select("client_id, provider, connection_status, last_synced_at");
        if (data) {
          for (const r of data) {
            integrationConnections.push({
              clientId: r.client_id,
              provider: r.provider,
              status: r.connection_status,
              lastSyncedAt: r.last_synced_at,
            });
          }
        }
      }
    } catch {
      // integration_connections table may not exist yet — silently skip
    }

    // Fetch Meta campaign snapshots for the target client (read-only)
    let metaSnapshots: MetaCampaignSnapshotRow[] = [];
    if (effectiveClientId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = getSupabaseServerClient() as any;
        if (supabase) {
          const { data: snapshotData } = await supabase
            .from("meta_campaign_snapshots")
            .select("id,client_id,meta_account_id,campaign_id,campaign_name,status,objective,spend,impressions,clicks,ctr,cpc,cpm,leads,cpl,date_start,date_end,synced_at,created_at")
            .eq("client_id", effectiveClientId)
            .order("synced_at", { ascending: false })
            .limit(100);
          if (snapshotData) metaSnapshots = snapshotData as MetaCampaignSnapshotRow[];
        }
      } catch {
        // meta_campaign_snapshots table may not be accessible — silently skip
      }
    }

    // Setters see clients but not strategy/intelligence data
    // (setter cannot reach this point due to permission check above, but kept for safety)
    const filteredIntelligence = userRole === "setter" ? null : clientIntelligence;

    const ctx: VeronicaPortalContext = {
      userRole,
      clients,
      approvals: allApprovals,
      campaignDrafts: allDrafts,
      reports: allReports,
      clientIntelligence: filteredIntelligence,
      creativeAssets: creativeAssets.length > 0 ? creativeAssets : undefined,
      integrationConnections:
        integrationConnections.length > 0 ? integrationConnections : undefined,
      metaSnapshots: metaSnapshots.length > 0 ? metaSnapshots : undefined,
    };

    // ── Agent routing phase (always runs, both live and mock) ────────────────
    const routing = routeToAgents(message, clients);
    const bundles = runSelectedAgents(routing, ctx);
    const gating = assembleApprovalGating(bundles);
    const dataConfidence = aggregateDataConfidence(bundles);
    const agentsUsed = bundles.map((b) => b.agentId);

    // Build deterministic operator task suggestions from structured agent outputs.
    // Done once here so both Anthropic and mock paths get the same structured data.
    const detectedClient = effectiveClientId
      ? (clients.find((c) => c.id === effectiveClientId) ?? null)
      : null;
    const operatorTaskSuggestions = buildOperatorTaskSuggestions(
      bundles,
      detectedClient?.name ?? null,
      effectiveClientId ?? null
    );

    // Try Anthropic when configured
    const aiProvider = (process.env.AI_PROVIDER ?? "mock").trim().toLowerCase();
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

    if (aiProvider === "anthropic" && apiKey) {
      try {
        // Use compact synthesis prompt (agent outputs as context) instead of full portal dump
        const synthesisPrompt = buildSynthesisPrompt(message, routing, bundles, ctx);

        // Build a legacy system prompt as fallback context only
        const legacySystemPrompt = buildVeronicaSystemPrompt(ctx);
        void legacySystemPrompt; // kept for reference; synthesis replaces it

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
            system: synthesisPrompt,
            messages: [
              {
                role: "user",
                content: `${message}\n\nRespond with valid JSON only. No markdown fences. No text outside the JSON object.`,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Anthropic API ${response.status}: ${await response.text().catch(() => response.statusText)}`);
        }

        const data = await response.json();
        const text: string = data?.content?.[0]?.text ?? "";
        if (!text) throw new Error("Empty response from Anthropic");

        // Parse JSON — handle any stray fences
        let jsonStr = text.trim();
        const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) jsonStr = fenced[1].trim();
        const first = jsonStr.indexOf("{");
        const last = jsonStr.lastIndexOf("}");
        if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);

        const parsed = JSON.parse(jsonStr);

        const result: VeronicaConsoleResponse = {
          reply: parsed.reply ?? "No response generated.",
          dataSources: Array.isArray(parsed.dataSources) ? parsed.dataSources : [],
          relatedLinks: Array.isArray(parsed.relatedLinks) ? parsed.relatedLinks : undefined,
          actionSuggested: parsed.actionSuggested ?? undefined,
          mockMode: false,
          provider: "anthropic",
          // Merge deterministic agent gating fields
          agentsUsed,
          approvalRequired: gating.approvalRequired,
          suggestedApprovalDestination: gating.suggestedApprovalDestination,
          whatVeronicaCanDoNow: gating.whatVeronicaCanDoNow,
          whatRequiresHumanApproval: gating.whatRequiresHumanApproval,
          whatIsBlocked: gating.whatIsBlocked,
          dataConfidence,
          detectedClientId: effectiveClientId ?? undefined,
          detectedClientName: detectedClient?.name ?? undefined,
          operatorTaskSuggestions: operatorTaskSuggestions.length > 0 ? operatorTaskSuggestions : undefined,
        };

        return NextResponse.json(result);
      } catch (err) {
        console.error("[POST /api/veronica] Anthropic error — falling back to mock:", err);
        // Fall through to mock
      }
    }

    // Mock fallback (data-aware + agent-enriched)
    const mockResult = mockVeronicaResponse(message, ctx);
    void AGENT_DISPLAY_NAMES; // imported for route-level use if needed
    return NextResponse.json({
      ...mockResult,
      detectedClientId: effectiveClientId ?? undefined,
      detectedClientName: detectedClient?.name ?? undefined,
      operatorTaskSuggestions: operatorTaskSuggestions.length > 0 ? operatorTaskSuggestions : undefined,
    });
  } catch (err) {
    console.error("[POST /api/veronica]", err);
    return NextResponse.json(
      {
        reply:
          "Veronica encountered an error fetching portal data. Please try again.",
        dataSources: [],
        mockMode: true,
        provider: "error",
      } satisfies VeronicaConsoleResponse,
      { status: 500 }
    );
  }
}
