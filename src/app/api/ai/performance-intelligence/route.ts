/**
 * POST /api/ai/performance-intelligence
 *
 * Veronica Performance Intelligence — analyzes synced Meta Ads and GHL data
 * for a specific client and returns structured AI-generated insights.
 *
 * This endpoint:
 * - Reads Meta campaign snapshots from Supabase
 * - Reads GHL pipeline snapshots from Supabase
 * - Sends combined data to Anthropic Claude
 * - Returns structured performance intelligence
 * - Optionally saves to client intelligence in Supabase
 *
 * READ-ONLY: never writes to Meta or GHL.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PerformanceIntelligenceResult {
  clientId: string;
  clientName: string;
  generatedAt: string;
  dataSource: {
    meta: boolean;
    ghl: boolean;
  };
  metaSummary: {
    totalSpend: number;
    totalLeads: number;
    cpl: number | null;
    topCampaign: string | null;
    campaignCount: number;
  } | null;
  ghlSummary: {
    contacts: number;
    appointments: number;
    bookedAppointments: number;
    pipelineValue: number;
    closedRevenue: number;
    showRate: number | null;
  } | null;
  intelligence: {
    performanceSummary: string;
    wins: string[];
    issues: string[];
    recommendations: string[];
    nextActions: string[];
    veronicaNote: string;
  };
  mockMode: boolean;
}

export async function POST(req: NextRequest) {
  let clientId: string;
  let clientName: string;

  try {
    const body = await req.json();
    clientId = body.clientId;
    clientName = body.clientName ?? clientId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  // ── Fetch Meta data ──────────────────────────────────────────
  let metaSummary: PerformanceIntelligenceResult["metaSummary"] = null;
  let metaHasData = false;

  if (supabase) {
    const { data: metaSnapshotsRaw } = await supabase
      .from("meta_campaign_snapshots")
      .select("*")
      .eq("client_id", clientId)
      .order("synced_at", { ascending: false })
      .limit(20);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metaSnapshots = metaSnapshotsRaw as any[] | null;

    if (metaSnapshots && metaSnapshots.length > 0) {
      metaHasData = true;
      let totalSpend = 0;
      let totalLeads = 0;
      let topCampaign: string | null = null;
      let topLeads = 0;

      for (const s of metaSnapshots) {
        const spend = Number(s.spend) || 0;
        const leads = Number(s.leads) || 0;
        totalSpend += spend;
        totalLeads += leads;
        if (leads > topLeads) {
          topLeads = leads;
          topCampaign = s.campaign_name ?? null;
        }
      }

      metaSummary = {
        totalSpend,
        totalLeads,
        cpl: totalLeads > 0 ? totalSpend / totalLeads : null,
        topCampaign,
        campaignCount: metaSnapshots.length,
      };
    }
  }

  // ── Fetch GHL data ───────────────────────────────────────────
  let ghlSummary: PerformanceIntelligenceResult["ghlSummary"] = null;
  let ghlHasData = false;

  if (supabase) {
    const { data: ghlSnapshotRaw } = await supabase
      .from("ghl_pipeline_snapshots")
      .select("*")
      .eq("client_id", clientId)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ghlSnapshot = ghlSnapshotRaw as any;

    if (ghlSnapshot) {
      ghlHasData = true;
      const appts = Number(ghlSnapshot.appointments) || 0;
      const booked = Number(ghlSnapshot.booked_appointments) || 0;
      ghlSummary = {
        contacts: Number(ghlSnapshot.contacts) || 0,
        appointments: appts,
        bookedAppointments: booked,
        pipelineValue: Number(ghlSnapshot.pipeline_value) || 0,
        closedRevenue: Number(ghlSnapshot.closed_revenue) || 0,
        showRate: appts > 0 ? (booked / appts) * 100 : null,
      };
    }
  }

  // ── Build AI prompt ──────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const isMockMode = !apiKey || (!metaHasData && !ghlHasData);

  let intelligence: PerformanceIntelligenceResult["intelligence"];

  if (isMockMode) {
    // Return a placeholder when no real data or no API key
    intelligence = {
      performanceSummary: metaHasData || ghlHasData
        ? "Performance data is available but AI analysis requires an Anthropic API key."
        : "No Meta Ads or GoHighLevel data has been synced for this client yet. Connect integrations in the Integrations tab to enable Performance Intelligence.",
      wins: [],
      issues: ["No integration data available for analysis."],
      recommendations: ["Connect Meta Ads and GoHighLevel in the Integrations tab."],
      nextActions: ["Add META_ACCESS_TOKEN and GHL_API_KEY to Vercel environment variables."],
      veronicaNote: "Performance Intelligence requires synced Meta Ads or GHL data.",
    };
  } else {
    // Build a rich context string for Claude
    const metaContext = metaSummary
      ? `META ADS DATA:
- Total Spend: $${metaSummary.totalSpend.toFixed(2)}
- Total Leads: ${metaSummary.totalLeads}
- Cost Per Lead (CPL): ${metaSummary.cpl != null ? "$" + metaSummary.cpl.toFixed(2) : "N/A"}
- Top Campaign: ${metaSummary.topCampaign ?? "N/A"}
- Active Campaigns: ${metaSummary.campaignCount}`
      : "META ADS DATA: Not connected or no data synced.";

    const ghlContext = ghlSummary
      ? `GOHIGHLEVEL DATA:
- Total Contacts: ${ghlSummary.contacts}
- Total Appointments: ${ghlSummary.appointments}
- Booked Appointments: ${ghlSummary.bookedAppointments}
- Show Rate: ${ghlSummary.showRate != null ? ghlSummary.showRate.toFixed(1) + "%" : "N/A"}
- Pipeline Value: $${ghlSummary.pipelineValue.toLocaleString()}
- Closed Revenue: $${ghlSummary.closedRevenue.toLocaleString()}`
      : "GOHIGHLEVEL DATA: Not connected or no data synced.";

    const prompt = `You are Veronica, an expert AI media buyer and performance analyst for Vault Co, a digital marketing agency.

Analyze the following performance data for client: ${clientName}

${metaContext}

${ghlContext}

Based on this data, provide a structured performance intelligence analysis. Be specific, actionable, and direct. Focus on what matters most for a home services or local business client.

Respond in this exact JSON format:
{
  "performanceSummary": "2-3 sentence executive summary of overall performance",
  "wins": ["win 1", "win 2", "win 3"],
  "issues": ["issue 1", "issue 2"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "nextActions": ["action 1", "action 2", "action 3"],
  "veronicaNote": "1 sentence personal note from Veronica about the most important thing to focus on this week"
}

Only include wins, issues, recommendations, and next actions that are directly supported by the data. Do not fabricate metrics. If data is limited, say so in the summary and focus recommendations on what to track.`;

    // Primary model: claude-sonnet-4-5-20250929 | Fallback: claude-haiku-4-5-20251001
    const PRIMARY_MODEL = "claude-sonnet-4-5-20250929";
    const FALLBACK_MODEL = "claude-haiku-4-5-20251001";

    async function callAnthropic(model: string): Promise<string> {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${errBody.substring(0, 200)}`);
      }
      const message = await response.json();
      const rawText = message.content?.[0]?.type === "text" ? message.content[0].text : "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      return jsonMatch[0];
    }

    try {
      let jsonText: string;
      try {
        jsonText = await callAnthropic(PRIMARY_MODEL);
        console.log(`[performance-intelligence] Used primary model: ${PRIMARY_MODEL}`);
      } catch (primaryErr) {
        console.warn(`[performance-intelligence] Primary model failed, trying fallback:`, primaryErr);
        jsonText = await callAnthropic(FALLBACK_MODEL);
        console.log(`[performance-intelligence] Used fallback model: ${FALLBACK_MODEL}`);
      }
      intelligence = JSON.parse(jsonText);
    } catch (err) {
      console.error("[performance-intelligence] AI error:", err);
      intelligence = {
        performanceSummary: "AI analysis temporarily unavailable. Raw data is shown below.",
        wins: metaSummary ? [`$${metaSummary.totalSpend.toFixed(2)} total ad spend tracked`, `${metaSummary.totalLeads} leads generated`] : [],
        issues: ["AI analysis failed — both primary and fallback models unavailable."],
        recommendations: ["Review raw data above and run analysis again."],
        nextActions: ["Verify ANTHROPIC_API_KEY has access to claude-sonnet-4-5-20250929 or claude-haiku-4-5-20251001."],
        veronicaNote: "Manual review recommended until AI analysis is restored.",
      };
    }
  }

  const result: PerformanceIntelligenceResult = {
    clientId,
    clientName,
    generatedAt: new Date().toISOString(),
    dataSource: { meta: metaHasData, ghl: ghlHasData },
    metaSummary,
    ghlSummary,
    intelligence,
    mockMode: isMockMode,
  };

  return NextResponse.json(result);
}
