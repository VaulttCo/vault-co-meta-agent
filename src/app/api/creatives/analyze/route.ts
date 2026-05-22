import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { runCreativeAnalysisAgent } from "@/lib/agents/creativeAnalysis";
import type { AssetType } from "@/lib/creativeAssets";

// Server-side only — never expose ANTHROPIC_API_KEY in responses or logs.

// ─────────────────────────────────────────────────────────────
// POST /api/creatives/analyze
//
// Analyzes one or more creative assets and returns structured
// intelligence. For image assets with a public storage_url,
// Claude vision is used; otherwise falls back to text-only.
// Results are persisted to creative_assets.notes via __META__ pattern.
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

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif"]);

function isImageUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    const ext = path.split(".").pop() ?? "";
    return IMAGE_EXTENSIONS.has(ext);
  } catch {
    return false;
  }
}

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
  // ── 1. Server-side auth + role resolution ────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, role: serverRole } = auth;

  // ── 2. Permission check ───────────────────────────────────────────────────
  if (!can(serverRole, "canAnalyzeCreatives")) {
    return NextResponse.json(
      { error: "Forbidden — admin or media_buyer role required" },
      { status: 403 }
    );
  }

  // ── 3. Parse request body ─────────────────────────────────────────────────
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

  // ── 4. Validate each asset ────────────────────────────────────────────────
  for (const a of assets) {
    if (!a.id || !a.assetType || !a.service) {
      return NextResponse.json(
        { error: `Asset ${a.id ?? "(unknown)"} is missing required fields: assetType, service` },
        { status: 400 }
      );
    }
  }

  // ── 5. Determine provider ─────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const useAnthropic = !!apiKey;
  let overallMockMode = !useAnthropic;

  // ── 6. Fetch storage_url for each asset from Supabase (server-side only) ──
  const supabase = getSupabaseServerClient();
  const storageUrls: Record<string, string | null> = {};

  if (supabase) {
    try {
      const ids = assets.map((a) => a.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows } = await (supabase.from("creative_assets") as any)
        .select("id, storage_url")
        .in("id", ids);

      if (rows && Array.isArray(rows)) {
        for (const row of rows) {
          storageUrls[row.id] = row.storage_url ?? null;
        }
      }
    } catch (err) {
      console.warn("[/api/creatives/analyze] Failed to fetch storage_urls:", err);
    }
  }

  // ── 7. Analyze each asset ─────────────────────────────────────────────────
  const results: Array<{
    assetId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analysis: any;
    mockMode: boolean;
    savedToDb: boolean;
    error?: string;
  }> = [];

  for (const asset of assets) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let analysis: any;
    let assetMockMode = !useAnthropic;

    try {
      if (useAnthropic) {
        try {
          const storageUrl = storageUrls[asset.id] ?? null;
          const canUseVision = !!storageUrl && isImageUrl(storageUrl);
          const analysisSource = canUseVision ? "vision" : "metadata_only";

          const systemPrompt = `You are Veronica, an expert Meta Ads creative strategist for home service businesses.
Analyze the provided creative asset and return a structured JSON analysis.
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
  "visual_summary": "string — one sentence describing what is literally visible in the image",
  "visible_subjects": ["string — each main visible element or person"],
  "analysis_source": "${analysisSource}",
  "visual_confidence": "high" or "medium" or "low",
  "qualityScore": 1-10,
  "approvalRecommendation": "Approve" or "Needs Revision" or "Reject",
  "approvalReason": "string"
}`;

          const metadataBlock = `Asset Type: ${asset.assetType}
Service: ${asset.service}
Market: ${asset.market ?? "General"}
File Name: ${asset.fileName ?? "unknown"}
Client: ${asset.clientName ?? "unknown"}
Currently Approved for Ads: ${asset.approvedForAds ? "Yes" : "No"}
Notes: ${asset.notes ?? "None provided"}`;

          // Build message content — include image for vision when available
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let messageContent: any[];

          if (canUseVision) {
            messageContent = [
              {
                type: "image",
                source: { type: "url", url: storageUrl },
              },
              {
                type: "text",
                text: `Analyze this creative asset image for Meta Ads use.\n\n${metadataBlock}\n\nFor visual_summary: describe exactly what you see in the image. For visible_subjects: list the main subjects/elements. Set visual_confidence to "high" since you have the actual image.`,
              },
            ];
          } else {
            messageContent = [
              {
                type: "text",
                text: `Analyze this creative asset for Meta Ads use (no image available — metadata only).\n\n${metadataBlock}\n\nFor visual_summary: write "Image not available for analysis". For visible_subjects: infer from asset type and file name. Set visual_confidence to "low" since no image was provided.`,
              },
            ];
          }

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
              messages: [{ role: "user", content: messageContent }],
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
            visual_summary: parsed.visual_summary ?? (canUseVision ? "" : "Image not available for analysis"),
            visible_subjects: parsed.visible_subjects ?? [],
            analysis_source: analysisSource,
            visual_confidence: parsed.visual_confidence ?? (canUseVision ? "high" : "low"),
            qualityScore: parsed.qualityScore,
            approvalRecommendation: parsed.approvalRecommendation,
            approvalReason: parsed.approvalReason,
          };
          assetMockMode = false;
          overallMockMode = false;
        } catch (anthropicErr) {
          console.warn("[/api/creatives/analyze] Anthropic failed, falling back to mock:", anthropicErr);
          const mockResult = runCreativeAnalysisAgent(
            asset.assetType,
            asset.service,
            asset.approvedForAds ?? false,
            asset.notes
          );
          analysis = {
            ...mockResult,
            visual_summary: "Image not available for analysis",
            visible_subjects: [],
            analysis_source: "metadata_only",
            visual_confidence: "low",
          };
          assetMockMode = true;
        }
      } else {
        // Mock mode
        const mockResult = runCreativeAnalysisAgent(
          asset.assetType,
          asset.service,
          asset.approvedForAds ?? false,
          asset.notes
        );
        analysis = {
          ...mockResult,
          visual_summary: "Image not available for analysis",
          visible_subjects: [],
          analysis_source: "metadata_only",
          visual_confidence: "low",
        };
      }

      // ── 8. Persist analysis to Supabase via notes __META__ ────────────────
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
            analyzed_by: userId,
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
      const mockResult = runCreativeAnalysisAgent(asset.assetType, asset.service, false);
      results.push({
        assetId: asset.id,
        analysis: {
          ...mockResult,
          visual_summary: "Image not available for analysis",
          visible_subjects: [],
          analysis_source: "metadata_only",
          visual_confidence: "low",
        },
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
    analyzedBy: userId,
  });
}
