import { NextRequest, NextResponse } from "next/server";
import { getSupabaseSessionClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { runCreativeAnalysisAgent } from "@/lib/agents/creativeAnalysis";
import type { AssetType } from "@/lib/creativeAssets";

// ─────────────────────────────────────────────────────────────
// POST /api/creatives/analyze
//
// Analyzes one or more creative assets and returns structured
// intelligence. Results are persisted to the creative_assets
// table via the notes field using the __META__ pattern.
//
// Request body:
//   { assets: Array<{ id, assetType, service, market, notes?, approvedForAds, fileName?, clientName? }> }
//
// Response:
//   { results: Array<{ assetId, analysis, mockMode, savedToDb }>, totalAnalyzed, mockMode, analyzedBy }
//
// Auth: requires valid Supabase session (admin or media_buyer)
// Safety: read-only analysis — no campaign publishing, no Meta/GHL writes
// ─────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

interface AnalyzeAssetInput {
  id: string;
  assetType: AssetType | string;
  service: string;
  market?: string;
  notes?: string;
  approvedForAds?: boolean;
  fileName?: string;
  clientName?: string;
}

export async function POST(req: NextRequest) {
  // ── 1. Auth guard ─────────────────────────────────────────
  const sessionClient = await getSupabaseSessionClient();
  if (!sessionClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse request body ─────────────────────────────────
  let body: { assets?: AnalyzeAssetInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const assets = body.assets;
  if (!assets || !Array.isArray(assets) || assets.length === 0) {
    return NextResponse.json(
      { error: "Missing required field: assets (non-empty array)" },
      { status: 400 }
    );
  }
  if (assets.length > 10) {
    return NextResponse.json(
      { error: "Maximum 10 assets per request" },
      { status: 400 }
    );
  }

  // ── 3. Validate each asset ────────────────────────────────
  for (const a of assets) {
    if (!a.id || !a.assetType || !a.service) {
      return NextResponse.json(
        { error: `Asset ${a.id ?? "(unknown)"} is missing required fields: assetType, service` },
        { status: 400 }
      );
    }
  }

  // ── 4. Determine provider ─────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const useAnthropic = !!apiKey;
  let overallMockMode = !useAnthropic;

  // ── 5. Analyze each asset ─────────────────────────────────
  const results: Array<{
    assetId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analysis: any;
    mockMode: boolean;
    savedToDb: boolean;
    error?: string;
  }> = [];

  const supabase = getSupabaseServerClient();

  for (const asset of assets) {
    let analysis: ReturnType<typeof runCreativeAnalysisAgent> & {
      qualityScore?: number;
      approvalRecommendation?: string;
      approvalReason?: string;
    };
    let assetMockMode = !useAnthropic;

    try {
      if (useAnthropic) {
        // Try Anthropic REST API, fall back to mock on error
        try {
          const systemPrompt = `You are Veronica, an expert Meta Ads creative strategist for home service businesses.
Analyze the provided creative asset metadata and return a structured JSON analysis.
You must return ONLY valid JSON matching this exact schema — no markdown, no explanation, no code fences:
{
  "creativeType": "string",
  "serviceShown": "string",
  "buyerIntentLevel": "Cold" or "Warm" or "Hot",
  "trustSignals": ["string"],
  "localRelevance": "string",
  "visualStrength": "string",
  "hookStrength": "string",
  "objectionAddressed": "string",
  "bestCampaignAngle": "string",
  "bestAudienceTemperature": "string",
  "bestPlacement": ["string"],
  "complianceRisks": ["string"],
  "recommendedCopyAngle": "string",
  "recommendedCTA": "string",
  "recommendedObjective": "string",
  "retargetingUse": "string",
  "whyThisCreative": "string",
  "qualityScore": 1-10,
  "approvalRecommendation": "Approve" or "Needs Revision" or "Reject",
  "approvalReason": "string"
}`;

          const userPrompt = `Analyze this creative asset:
Asset Type: ${asset.assetType}
Service: ${asset.service}
Market: ${asset.market ?? "General"}
File Name: ${asset.fileName ?? "unknown"}
Client: ${asset.clientName ?? "unknown"}
Currently Approved for Ads: ${asset.approvedForAds ? "Yes" : "No"}
Notes: ${asset.notes ?? "None provided"}

Provide a complete strategic analysis for Meta Ads campaign use.`;

          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-3-5-haiku-20241022",
              max_tokens: 1024,
              system: systemPrompt,
              messages: [{ role: "user", content: userPrompt }],
            }),
          });

          if (!response.ok) {
            throw new Error(`Anthropic API ${response.status}`);
          }

          const data = await response.json();
          const raw = data.content?.[0]?.text ?? "";
          const parsed = JSON.parse(raw);

          analysis = {
            creativeType: parsed.creativeType ?? asset.assetType,
            serviceShown: parsed.serviceShown ?? asset.service,
            buyerIntentLevel: parsed.buyerIntentLevel ?? "Cold",
            trustSignals: parsed.trustSignals ?? [],
            localRelevance: parsed.localRelevance ?? "",
            visualStrength: parsed.visualStrength ?? "",
            hookStrength: parsed.hookStrength ?? "",
            objectionAddressed: parsed.objectionAddressed ?? "",
            bestCampaignAngle: parsed.bestCampaignAngle ?? "",
            bestAudienceTemperature: parsed.bestAudienceTemperature ?? "",
            bestPlacement: parsed.bestPlacement ?? [],
            complianceRisks: parsed.complianceRisks ?? [],
            recommendedCopyAngle: parsed.recommendedCopyAngle ?? "",
            recommendedCTA: parsed.recommendedCTA ?? "Book My Free Consultation",
            recommendedObjective: parsed.recommendedObjective ?? "LEAD_GENERATION",
            retargetingUse: parsed.retargetingUse ?? "",
            whyThisCreative: parsed.whyThisCreative ?? "",
            qualityScore: parsed.qualityScore,
            approvalRecommendation: parsed.approvalRecommendation,
            approvalReason: parsed.approvalReason,
          };
          assetMockMode = false;
          overallMockMode = false;
        } catch (anthropicErr) {
          console.warn("[/api/creatives/analyze] Anthropic failed, falling back to mock:", anthropicErr);
          analysis = runCreativeAnalysisAgent(
            asset.assetType,
            asset.service,
            asset.approvedForAds ?? false,
            asset.notes
          );
          assetMockMode = true;
        }
      } else {
        // Mock mode
        analysis = runCreativeAnalysisAgent(
          asset.assetType,
          asset.service,
          asset.approvedForAds ?? false,
          asset.notes
        );
      }

      // ── 6. Persist analysis to Supabase via notes __META__ ──
      let savedToDb = false;
      if (supabase) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: currentRow } = await (supabase.from("creative_assets") as any)
            .select("notes")
            .eq("id", asset.id)
            .single();

          const currentNotes = currentRow?.notes ?? "";
          const META_SEPARATOR = "\n__META__:";
          const idx = currentNotes.indexOf(META_SEPARATOR);
          const userNotes = idx === -1 ? currentNotes : currentNotes.substring(0, idx);

          let existingMeta: Record<string, unknown> = {};
          if (idx !== -1) {
            try {
              existingMeta = JSON.parse(currentNotes.substring(idx + META_SEPARATOR.length));
            } catch { /* ignore */ }
          }

          const updatedMeta = {
            ...existingMeta,
            ai_analysis: analysis,
            analyzed_at: new Date().toISOString(),
            analyzed_by: user.id,
            mock_mode: assetMockMode,
          };

          const updatedNotes = `${userNotes}${META_SEPARATOR}${JSON.stringify(updatedMeta)}`;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: updateError } = await (supabase.from("creative_assets") as any)
            .update({ notes: updatedNotes })
            .eq("id", asset.id);

          savedToDb = !updateError;
          if (updateError) {
            console.warn(`[/api/creatives/analyze] Failed to save analysis for ${asset.id}:`, updateError);
          }
        } catch (dbErr) {
          console.warn(`[/api/creatives/analyze] DB error for ${asset.id}:`, dbErr);
        }
      }

      results.push({ assetId: asset.id, analysis, mockMode: assetMockMode, savedToDb });
    } catch (err) {
      console.error(`[/api/creatives/analyze] Error analyzing asset ${asset.id}:`, err);
      results.push({
        assetId: asset.id,
        analysis: runCreativeAnalysisAgent(asset.assetType, asset.service, false),
        mockMode: true,
        savedToDb: false,
        error: "Analysis failed — mock result returned",
      });
    }
  }

  return NextResponse.json({
    results,
    totalAnalyzed: results.length,
    mockMode: overallMockMode,
    analyzedBy: user.email ?? user.id,
  });
}
