// Server-side AI service — never import this in client components.
// It reads process.env and makes outbound API calls.
// NEVER log or return the resolved key value.

import type { CampaignDraft } from "@/lib/planStore";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import { generateMockPlan, mockTimestamp, mockExtractIntelligence, mockAnalyzeCreative, mockGenerateReport } from "@/lib/ai/mock";
import {
  SYSTEM_PROMPT,
  COMPACT_STRATEGY_SYSTEM_PROMPT,
  EXTRACTION_SYSTEM_PROMPT,
  CREATIVE_ANALYSIS_SYSTEM_PROMPT,
  REPORT_SYSTEM_PROMPT,
  buildCampaignPrompt,
  buildExtractionPrompt,
  buildCreativeAnalysisPrompt,
  buildReportPrompt,
  type CampaignGenerationInput,
  type CreativeAnalysisInput,
  type CreativeAnalysisResult,
  type WeeklyReportInput,
  type WeeklyReportDraft,
} from "@/lib/ai/prompts";
import { buildAssetAdVariation, type StoredAssetAnalysis } from "@/lib/agents/creativeAnalysis";

export type { CampaignGenerationInput, CreativeAnalysisInput, CreativeAnalysisResult, WeeklyReportInput, WeeklyReportDraft };

// ─────────────────────────────────────────────────────────────
// Env key resolver — primary name wins; legacy typo is a fallback
// so that Vercel envs configured with the misspelled name still work.
// Never log or return the resolved value.
// ─────────────────────────────────────────────────────────────
function resolveAnthropicKey(): string | undefined {
  return (process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPC_API_KEY)?.trim() || undefined;
}

export type GenerationFailureStage =
  | "env"              // API key not configured
  | "provider_call"    // Provider API returned a 4xx/5xx error
  | "timeout"          // Fetch aborted after ANTHROPIC_TIMEOUT_MS
  | "json_parse"       // Provider responded but JSON.parse() on the text failed
  | "response_shape"   // Provider returned empty or malformed content structure
  | "generation_shape" // JSON parsed but resulted in an incomplete/invalid draft object
  | "asset_mapping"    // buildAssetAdVariation threw processing selected assets
  | "unknown";         // Unexpected exception outside normal provider paths

export interface GenerateCampaignResult {
  draft: CampaignDraft;
  mockMode: boolean;
  provider: string;
  notice?: string;
  // Only present when mockMode=true and the configured provider failed.
  // Carried through to the route so it can include failureStage in the 502 response.
  failureStage?: GenerationFailureStage;
}

export interface ExtractIntelligenceResult {
  intelligence: ClientIntelligence;
  mockMode: boolean;
  provider: string;
  notice?: string;
}

export interface AnalyzeCreativeResponse {
  analysis: CreativeAnalysisResult;
  mockMode: boolean;
  provider: string;
  notice?: string;
}

export interface GenerateReportResult {
  report: WeeklyReportDraft;
  mockMode: boolean;
  provider: string;
  notice?: string;
}

// ─────────────────────────────────────────────────────────────
// CompactCampaignStrategy — what Claude actually generates.
// ~600-800 tokens of pure strategy; deterministic code builds
// the full CampaignDraft on top of this via buildDraftFromStrategy().
// ─────────────────────────────────────────────────────────────
interface CompactCampaignStrategy {
  campaignAngle: string;
  offerAngle: string;
  audienceStrategy: string;
  servicePositioning: string;
  primaryObjections: string[];        // max 3
  recommendedHooks: string[];         // max 3 opening lines for ad copy
  leadFormIntent: string;
  complianceNotes: string;
  creativeStrategyNotes: string;
  whyThisCampaign: string;
  perAssetCopyDirections?: Array<{
    assetId: string;
    copyDirection: string;
    hookVariant: string;
  }>;
}

// ─────────────────────────────────────────────────────────────
// Timeout helper — wraps fetch with an AbortController
// 50s gives Anthropic time to respond within Vercel Hobby's 60s limit
// ─────────────────────────────────────────────────────────────

const ANTHROPIC_TIMEOUT_MS = 50_000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = ANTHROPIC_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────
// Campaign generation — main entry point
// ─────────────────────────────────────────────────────────────

// Classify an error thrown by callAnthropic/callOpenAI/parseAIJson into a stage.
function classifyStage(err: unknown): GenerationFailureStage {
  if (err instanceof StagedError) return err.stage;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("abort") || msg.includes("timeout") || msg.includes("AbortError")) return "timeout";
  // JSON parse errors — covers multiple V8/Node.js format variants:
  //   Node <20:  "SyntaxError: Unexpected token , in JSON..."
  //   Node 20+:  "Expected ',' or '}' after property value in JSON at position N"
  //   Node 20+:  "Unterminated string in JSON at position N"
  //   Our own:   "JSON parse failed: ..." (thrown by parseAIJson for OpenAI path)
  if (
    msg.includes("SyntaxError") ||
    msg.includes("Unexpected token") ||
    msg.includes("Unexpected end") ||
    msg.includes("Expected '") ||
    msg.includes("Unterminated string") ||
    msg.includes("JSON at position") ||
    msg.includes("json_parse") ||
    msg.includes("JSON parse failed")
  ) return "json_parse";
  if (msg.includes("empty content") || msg.includes("response_shape") || msg.includes("truncated")) return "response_shape";
  if (msg.includes("asset_mapping") || msg.includes("adVariations")) return "asset_mapping";
  return "provider_call";
}

// Safe notice — never includes key material, safe to include in logs and responses.
function toNotice(err: unknown, prefix: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  return `${prefix} — ${msg.slice(0, 300)}`;
}

// Safe mockFallback wrapper — prevents a crash in generateMockPlan (e.g. missing arrays
// in AI-extracted intelligence) from propagating out of generateCampaignDraft.
// If the fallback itself crashes, returns the absolute minimum safe result.
function safeFallback(
  input: CampaignGenerationInput,
  notice: string,
  stage: GenerationFailureStage
): GenerateCampaignResult {
  try {
    return mockFallback(input, notice, stage);
  } catch (fallbackErr) {
    // The mock fallback crashed — try without intelligence (removes the crash risk).
    const safeInput: CampaignGenerationInput = {
      client: input.client,
      service: input.service,
      market: input.market,
      budget: input.budget,
      goal: input.goal,
      creativeType: input.creativeType,
      // Omit intelligence and assets — they may have caused the crash.
    };
    const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message.slice(0, 200) : String(fallbackErr).slice(0, 200);
    console.error("[AI Service] Mock fallback crashed — retrying without intelligence:", fallbackMsg);
    try {
      return mockFallback(safeInput, `${notice} (fallback crashed: ${fallbackMsg})`, stage);
    } catch {
      // Absolute last resort: the mock itself is broken. Throw so the route returns 500
      // with a clear failureStage instead of a misleading undefined error.
      throw new StagedError(`Both provider and mock fallback failed at stage "${stage}": ${fallbackMsg}`, stage);
    }
  }
}

export async function generateCampaignDraft(
  input: CampaignGenerationInput
): Promise<GenerateCampaignResult> {
  const provider = (process.env.AI_PROVIDER ?? "mock").trim().toLowerCase();

  if (provider === "anthropic") {
    const apiKey = resolveAnthropicKey();
    if (!apiKey) {
      return safeFallback(input, "ANTHROPIC_API_KEY is not set — using mock generation.", "env");
    }
    try {
      const draft = await callAnthropic(input, apiKey);
      return { draft, mockMode: false, provider: "anthropic" };
    } catch (err) {
      const stage = classifyStage(err);
      console.error("[AI Service] Anthropic campaign generation failed:", {
        stage,
        errorMessage: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
      });
      return safeFallback(input, toNotice(err, "Anthropic generation failed"), stage);
    }
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return safeFallback(input, "OPENAI_API_KEY is not set — using mock generation.", "env");
    }
    try {
      const draft = await callOpenAI(input, apiKey);
      return { draft, mockMode: false, provider: "openai" };
    } catch (err) {
      const stage = classifyStage(err);
      console.error("[AI Service] OpenAI campaign generation failed:", {
        stage,
        errorMessage: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
      });
      return safeFallback(input, toNotice(err, "OpenAI generation failed"), stage);
    }
  }

  return mockFallback(input);
}

// ─────────────────────────────────────────────────────────────
// Intelligence extraction — main entry point
// ─────────────────────────────────────────────────────────────

export async function extractClientIntelligence(
  clientId: string,
  onboardingSummary: string
): Promise<ExtractIntelligenceResult> {
  const provider = (process.env.AI_PROVIDER ?? "mock").trim().toLowerCase();

  if (provider === "anthropic") {
    const apiKey = resolveAnthropicKey();
    if (!apiKey) {
      return mockExtractionFallback(clientId, onboardingSummary, "ANTHROPIC_API_KEY is not set — using mock extraction.");
    }
    try {
      const intelligence = await callAnthropicExtract(clientId, onboardingSummary, apiKey);
      return { intelligence, mockMode: false, provider: "anthropic" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout = msg.includes("abort") || msg.includes("timeout") || msg.includes("AbortError");
      console.error("[AI Service] Anthropic extraction error:", err);
      return mockExtractionFallback(
        clientId,
        onboardingSummary,
        isTimeout
          ? "Anthropic timed out (>50s) — using mock fallback."
          : "Anthropic extraction failed — using mock fallback."
      );
    }
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return mockExtractionFallback(clientId, onboardingSummary, "OPENAI_API_KEY is not set — using mock extraction.");
    }
    try {
      const intelligence = await callOpenAIExtract(clientId, onboardingSummary, apiKey);
      return { intelligence, mockMode: false, provider: "openai" };
    } catch (err) {
      console.error("[AI Service] OpenAI extraction error:", err);
      return mockExtractionFallback(clientId, onboardingSummary, "OpenAI extraction failed — using mock fallback.");
    }
  }

  return mockExtractionFallback(clientId, onboardingSummary);
}

// ─────────────────────────────────────────────────────────────
// Mock fallbacks
// ─────────────────────────────────────────────────────────────

function mockFallback(
  input: CampaignGenerationInput,
  notice?: string,
  failureStage?: GenerationFailureStage
): GenerateCampaignResult {
  const draft = generateMockPlan(
    input.client,
    input.goal,
    input.service,
    input.market,
    input.budget,
    input.creativeType ?? "",
    input.clientIntelligence ?? null,
    input.selectedAsset ?? null,
    input.selectedAssets,
    input.assetNotes,
    input.assetAnalyses
  );
  return { draft, mockMode: true, provider: "mock", notice, failureStage };
}

function mockExtractionFallback(clientId: string, summary: string, notice?: string): ExtractIntelligenceResult {
  const intelligence = mockExtractIntelligence(clientId, summary);
  return { intelligence, mockMode: true, provider: "mock", notice };
}

// ─────────────────────────────────────────────────────────────
// JSON repair — strips common LLM formatting issues before JSON.parse
// Used only for text-based providers (OpenAI). Anthropic uses tool calling.
// ─────────────────────────────────────────────────────────────

function repairJson(raw: string): string {
  let s = raw.trim();
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) s = fenced[1].trim();
  // Extract the outermost JSON object
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1) s = s.slice(first, last + 1);
  // Remove trailing commas before } or ] (common LLM error)
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return s;
}

// ─────────────────────────────────────────────────────────────
// Draft builder — shared between tool-call path and text-parse path.
// Takes any already-parsed object and maps it to a CampaignDraft.
// Never calls JSON.parse — caller is responsible for parsing.
// ─────────────────────────────────────────────────────────────

function buildDraftFromParsed(
  parsed: Record<string, unknown>,
  input: CampaignGenerationInput
): CampaignDraft {
  const now = mockTimestamp();
  const budgetStr = input.budget.startsWith("$")
    ? input.budget
    : `$${parseInt(input.budget.replace(/[^0-9]/g, "") || "1500").toLocaleString()}/mo`;

  return {
    id: `plan-${Date.now()}`,
    clientId: input.client.id,
    clientName: input.client.name,
    campaignName: (parsed.campaignName as string) ?? `${input.service} — ${input.goal} — ${input.market}`,
    market: input.market,
    service: input.service,
    goal: input.goal,
    budget: budgetStr,
    creativeType: input.creativeType ?? "",
    status: "draft",
    approvalStatus: "draft",
    createdAt: now,
    updatedAt: now,
    createdBy: "Veronica",
    metaStructure: parsed.metaStructure as CampaignDraft["metaStructure"],
    adCopy: parsed.adCopy as CampaignDraft["adCopy"],
    leadForm: parsed.leadForm as CampaignDraft["leadForm"],
    ghlWorkflow: parsed.ghlWorkflow as CampaignDraft["ghlWorkflow"],
    creativeDirection: parsed.creativeDirection as CampaignDraft["creativeDirection"],
    compliance: parsed.compliance as CampaignDraft["compliance"],
    optimization: parsed.optimization as CampaignDraft["optimization"],
    buyerPsychologyUsed: parsed.buyerPsychologyUsed as CampaignDraft["buyerPsychologyUsed"],
    marketResearchUsed: parsed.marketResearchUsed as CampaignDraft["marketResearchUsed"],
    clientIntelligenceUsed: parsed.clientIntelligenceUsed as CampaignDraft["clientIntelligenceUsed"],
    strategicRationale: parsed.strategicRationale as CampaignDraft["strategicRationale"],
    creativeIntelligenceUsed: parsed.creativeIntelligenceUsed as CampaignDraft["creativeIntelligenceUsed"],
    // Ad variations are always built server-side from input assets — never from AI output.
    // Wrapped in try-catch: mapping is best-effort; failure omits variations rather than
    // crashing the entire generation response.
    adVariations: (() => {
      try {
        const assets =
          input.selectedAssets && input.selectedAssets.length > 0
            ? input.selectedAssets
            : input.selectedAsset
            ? [input.selectedAsset]
            : [];
        if (assets.length === 0) return undefined;
        return assets.map((a, i) => {
          const storedAnalysis: StoredAssetAnalysis | null = input.assetAnalyses?.[a.id] ?? null;
          const operatorNote = input.assetNotes?.[a.id];
          return buildAssetAdVariation(
            {
              id: a.id,
              fileName: a.fileName,
              assetType: a.assetType,
              fileType: a.fileType as "image" | "video",
              approvedForAds: a.approvedForAds,
              notes: operatorNote || a.notes || undefined,
            },
            input.service,
            input.clientIntelligence ?? null,
            i === 0,
            storedAnalysis
          );
        });
      } catch (assetErr) {
        console.error(
          "[AI Service] adVariations mapping failed — omitting:",
          assetErr instanceof Error ? assetErr.message : assetErr
        );
        return undefined;
      }
    })(),
  };
}

// ─────────────────────────────────────────────────────────────
// Compact strategy overlay helpers.
// These take Claude's CompactCampaignStrategy and apply it on top of the
// full structural backbone produced by generateMockPlan().
// ─────────────────────────────────────────────────────────────

// Replace the opening line of each primary text variant with Claude's recommended hooks.
// The value proposition body (paragraphs 2+) from the mock is preserved intact.
function buildStrategyAdCopy(
  strategy: CompactCampaignStrategy,
  baseCopy: CampaignDraft["adCopy"]
): CampaignDraft["adCopy"] {
  const hooks = strategy.recommendedHooks;
  if (hooks.length === 0) return baseCopy;

  const primaryTexts = baseCopy.primaryTexts.map((baseText, i) => {
    const hook = hooks[i] ?? hooks[hooks.length - 1];
    const newOpening = hook.startsWith('"') ? hook : `"${hook}"`;
    // Split on double-newline (paragraph break). Replace first paragraph with Claude's hook.
    const paragraphs = baseText.split("\n\n");
    const firstParagraph = paragraphs[0] ?? "";
    // If the first paragraph is short (standalone hook), swap it; otherwise prepend.
    if (firstParagraph.length <= 150 && paragraphs.length > 1) {
      return [newOpening, ...paragraphs.slice(1)].join("\n\n");
    }
    return [newOpening, ...paragraphs].join("\n\n");
  });

  return { ...baseCopy, primaryTexts };
}

// Overlay Claude's strategic narrative on the base strategic rationale.
// When no base exists (no client intelligence loaded), builds the full object from strategy alone.
function buildStrategyRationale(
  strategy: CompactCampaignStrategy,
  baseRationale: CampaignDraft["strategicRationale"]
): CampaignDraft["strategicRationale"] {
  if (!baseRationale) {
    // No intelligence-powered rationale — build entirely from compact strategy
    return {
      whyThisCampaign: strategy.whyThisCampaign,
      buyerInsightUsed: strategy.primaryObjections.length > 0
        ? `Primary objections addressed: ${strategy.primaryObjections.join("; ")}`
        : strategy.servicePositioning,
      marketInsightUsed: strategy.audienceStrategy,
      offerAngleUsed: strategy.offerAngle,
      creativeAngleUsed: strategy.campaignAngle,
      trustTriggerUsed: strategy.servicePositioning,
      objectionAddressed: strategy.primaryObjections[0] ?? "",
      audienceRationale: strategy.audienceStrategy,
      leadFormRationale: strategy.leadFormIntent,
      followUpRationale: strategy.creativeStrategyNotes,
    };
  }

  // Intelligence-powered base exists — overlay Claude's strategic fields
  return {
    ...baseRationale,
    whyThisCampaign: strategy.whyThisCampaign,
    offerAngleUsed: strategy.offerAngle,
    creativeAngleUsed: strategy.campaignAngle,
    audienceRationale: strategy.audienceStrategy,
    leadFormRationale: strategy.leadFormIntent,
    objectionAddressed: strategy.primaryObjections[0] ?? baseRationale.objectionAddressed,
  };
}

// Rebuild asset variations using Claude's per-asset copy directions as enhanced notes.
// If no per-asset directions, returns the base variations unchanged (preserves visualSummary
// and analysisSource from the original buildAssetAdVariation output).
function buildStrategyAssetVariations(
  strategy: CompactCampaignStrategy,
  input: CampaignGenerationInput,
  baseVariations: CampaignDraft["adVariations"]
): CampaignDraft["adVariations"] {
  if (!strategy.perAssetCopyDirections || strategy.perAssetCopyDirections.length === 0) {
    return baseVariations;
  }

  const directionMap = new Map(
    strategy.perAssetCopyDirections.map((d) => [d.assetId, d])
  );

  const assets =
    input.selectedAssets && input.selectedAssets.length > 0
      ? input.selectedAssets
      : input.selectedAsset
      ? [input.selectedAsset]
      : [];

  if (assets.length === 0) return baseVariations;

  try {
    return assets.map((a, i) => {
      const direction = directionMap.get(a.id);
      const operatorNote = input.assetNotes?.[a.id];
      const storedAnalysis: StoredAssetAnalysis | null = input.assetAnalyses?.[a.id] ?? null;
      // Merge Claude's copy direction with operator note — builds richer context for the variation
      const enhancedNote = direction
        ? `[AI Strategy: ${direction.copyDirection}] Hook: ${direction.hookVariant}${operatorNote ? ` | Operator: ${operatorNote}` : ""}`
        : operatorNote || a.notes || undefined;

      return buildAssetAdVariation(
        {
          id: a.id,
          fileName: a.fileName,
          assetType: a.assetType,
          fileType: a.fileType as "image" | "video",
          approvedForAds: a.approvedForAds,
          notes: enhancedNote,
        },
        input.service,
        input.clientIntelligence ?? null,
        i === 0,
        storedAnalysis
      );
    });
  } catch (assetErr) {
    console.error(
      "[AI Service] buildStrategyAssetVariations failed — using base variations:",
      assetErr instanceof Error ? assetErr.message : String(assetErr).slice(0, 200)
    );
    return baseVariations;
  }
}

// ─────────────────────────────────────────────────────────────
// buildDraftFromStrategy — primary entry point for the compact live generation path.
//
// 1. Calls generateMockPlan() to produce a complete CampaignDraft structural backbone
//    (all 9 sections, all nested fields, proper types, correct asset matrix).
// 2. Overlays Claude's strategic intelligence on high-value fields:
//    - creativeDirection.angle → strategy.campaignAngle
//    - creativeDirection.hook  → strategy.recommendedHooks[0]
//    - adCopy.primaryTexts     → hooks injected as opening lines
//    - compliance.metaRisk     → strategy.complianceNotes
//    - strategicRationale      → full overlay from strategy
//    - adVariations            → rebuilt with per-asset copy directions (if provided)
// ─────────────────────────────────────────────────────────────

function buildDraftFromStrategy(
  strategy: CompactCampaignStrategy,
  input: CampaignGenerationInput
): CampaignDraft {
  // Step 1: build full structural backbone from the deterministic mock generator.
  // This produces all 9 campaign sections with correct data shapes, budget splits,
  // canonical 3-ad-set structure, and intelligence-powered content when intel is available.
  const base = generateMockPlan(
    input.client,
    input.goal,
    input.service,
    input.market,
    input.budget,
    input.creativeType ?? "",
    input.clientIntelligence ?? null,
    input.selectedAsset ?? null,
    input.selectedAssets,
    input.assetNotes,
    input.assetAnalyses
  );

  // Step 2: overlay Claude's strategic intelligence on high-value fields.
  const now = mockTimestamp();

  const enhancedCreativeDirection: CampaignDraft["creativeDirection"] = {
    ...base.creativeDirection,
    angle: strategy.campaignAngle,
    hook: strategy.recommendedHooks[0] ?? base.creativeDirection.hook,
  };

  const enhancedAdCopy = buildStrategyAdCopy(strategy, base.adCopy);

  const enhancedCompliance: CampaignDraft["compliance"] = {
    ...base.compliance,
    metaRisk: strategy.complianceNotes || base.compliance.metaRisk,
  };

  const enhancedStrategicRationale = buildStrategyRationale(strategy, base.strategicRationale);

  const enhancedAdVariations = buildStrategyAssetVariations(strategy, input, base.adVariations);

  return {
    ...base,
    updatedAt: now,
    createdBy: "Veronica (Live AI)",
    creativeDirection: enhancedCreativeDirection,
    adCopy: enhancedAdCopy,
    compliance: enhancedCompliance,
    strategicRationale: enhancedStrategicRationale,
    adVariations: enhancedAdVariations,
  };
}

// ─────────────────────────────────────────────────────────────
// Text-based JSON parser (OpenAI path only).
// For Anthropic, tool calling is used instead — see callAnthropic().
// ─────────────────────────────────────────────────────────────

function parseAIJson(text: string, input: CampaignGenerationInput): CampaignDraft {
  const repaired = repairJson(text);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(repaired) as Record<string, unknown>;
  } catch (firstErr) {
    throw new StagedError(
      `JSON parse failed: ${firstErr instanceof Error ? firstErr.message.slice(0, 300) : String(firstErr).slice(0, 300)}`,
      "json_parse"
    );
  }
  return buildDraftFromParsed(parsed, input);
}

function parseExtractionJson(text: string, clientId: string): ClientIntelligence {
  let jsonStr = text.trim();

  const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) jsonStr = fenced[1].trim();

  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(jsonStr) as ClientIntelligence;
  return { ...parsed, clientId, extractedAt: mockTimestamp() };
}

// ─────────────────────────────────────────────────────────────
// Tagged error class — lets generateCampaignDraft classify stage without
// string-matching on error messages.
// ─────────────────────────────────────────────────────────────

class StagedError extends Error {
  stage: GenerationFailureStage;
  constructor(message: string, stage: GenerationFailureStage) {
    super(message);
    this.stage = stage;
  }
}

// ─────────────────────────────────────────────────────────────
// Compact strategy tool schema — Claude generates ONLY strategic direction.
// ~600-800 token output, well within the 1500 max_tokens budget.
// Deterministic code in buildDraftFromStrategy() builds all campaign sections
// on top of this. No more max_tokens truncation.
// ─────────────────────────────────────────────────────────────

const COMPACT_STRATEGY_SCHEMA = {
  type: "object",
  description:
    "Compact campaign strategy. Return ONLY these fields — deterministic code builds all campaign sections (ad sets, budgets, lead form, GHL workflow, compliance, optimization, ad copy, asset variations) from your strategic direction.",
  properties: {
    campaignAngle: {
      type: "string",
      description: "Core creative/messaging angle for this campaign (1-2 sentences, 20-40 words)",
    },
    offerAngle: {
      type: "string",
      description: "How the offer is positioned to the target audience (1-2 sentences, 20-40 words)",
    },
    audienceStrategy: {
      type: "string",
      description: "Who to target and why — specific to this client, market, and service (1-2 sentences)",
    },
    servicePositioning: {
      type: "string",
      description: "How to position this service vs. competitors in this specific market (1-2 sentences)",
    },
    primaryObjections: {
      type: "array",
      items: { type: "string", description: "One specific objection, max 15 words" },
      description: "Up to 3 primary objections this campaign must address",
      maxItems: 3,
    },
    recommendedHooks: {
      type: "array",
      items: {
        type: "string",
        description: "One opening hook line for ad copy — 10-15 words, ready to use as the first sentence",
      },
      description: "Up to 3 opening hook lines for ad copy",
      maxItems: 3,
    },
    leadFormIntent: {
      type: "string",
      description: "What the lead form should qualify for and what a quality lead looks like (1 sentence)",
    },
    complianceNotes: {
      type: "string",
      description:
        "Risk level (LOW / MEDIUM / HIGH) followed by the top 1-2 specific compliance risks for this campaign (1-2 sentences)",
    },
    creativeStrategyNotes: {
      type: "string",
      description: "Key creative direction — format, tone, visual approach (1-2 sentences)",
    },
    whyThisCampaign: {
      type: "string",
      description:
        "Strategic rationale: why this angle, audience, and offer — specific to this client and market, not generic (2-3 sentences)",
    },
    perAssetCopyDirections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          assetId: { type: "string", description: "The exact asset ID from the selected assets list" },
          copyDirection: {
            type: "string",
            description: "Specific copy angle for this asset (1 sentence, max 20 words)",
          },
          hookVariant: {
            type: "string",
            description: "Specific opening hook for this asset (10-15 words, ready to use)",
          },
        },
        required: ["assetId", "copyDirection", "hookVariant"],
      },
      description:
        "Only include when specific assets are listed in the prompt. One entry per selected asset ID.",
    },
  },
  required: [
    "campaignAngle",
    "offerAngle",
    "audienceStrategy",
    "servicePositioning",
    "primaryObjections",
    "recommendedHooks",
    "leadFormIntent",
    "complianceNotes",
    "creativeStrategyNotes",
    "whyThisCampaign",
  ],
};

// ─────────────────────────────────────────────────────────────
// Anthropic (Claude Haiku) — compact strategy generation via tool calling.
//
// Architecture change: Claude generates ONLY a compact strategy (~600-800 tokens).
// buildDraftFromStrategy() then calls generateMockPlan() to build the full
// CampaignDraft structurally and overlays Claude's strategic intelligence on top.
//
// This eliminates max_tokens truncation — compact strategy fits in 1500 tokens
// with headroom to spare. Tool calling still eliminates JSON parse failures.
//
// Response shape: content[0].type === "tool_use", content[0].name === "generate_campaign_strategy",
//   content[0].input is the already-parsed CompactCampaignStrategy object.
// ─────────────────────────────────────────────────────────────

async function callAnthropic(input: CampaignGenerationInput, apiKey: string): Promise<CampaignDraft> {
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      // Compact strategy output is ~600-800 tokens; 1500 gives comfortable headroom
      // without any risk of truncation. Previous 3500 budget caused max_tokens errors.
      max_tokens: 1500,
      system: COMPACT_STRATEGY_SYSTEM_PROMPT,
      tools: [
        {
          name: "generate_campaign_strategy",
          description:
            "Generate a compact campaign strategy. Return ONLY the 10 strategy fields — " +
            "deterministic code builds the full campaign draft (ad sets, lead form, GHL workflow, " +
            "compliance, optimization, ad copy, asset variations) from your strategic output. " +
            "Be concise: 1-2 sentences per field, max 3 items per array.",
          input_schema: COMPACT_STRATEGY_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "generate_campaign_strategy" },
      messages: [{ role: "user", content: buildCampaignPrompt(input, true) }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new StagedError(`Anthropic API ${response.status}: ${body}`, "provider_call");
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new StagedError("Anthropic outer response was not valid JSON", "response_shape");
  }

  // Detect max_tokens truncation — should not occur at 1500 tokens with compact schema,
  // but guard defensively in case of unexpectedly large intelligence payloads.
  const stopReason = (data as { stop_reason?: string })?.stop_reason;
  if (stopReason === "max_tokens") {
    throw new StagedError(
      "Anthropic compact strategy response truncated — strategy output exceeded 1500 token budget. " +
        "Input payload may be too large.",
      "response_shape"
    );
  }

  // Extract the tool_use block
  const content = (data as { content?: { type: string; input?: unknown; name?: string }[] })?.content ?? [];
  const toolUse = content.find((c) => c.type === "tool_use" && c.name === "generate_campaign_strategy");

  if (!toolUse || typeof toolUse.input !== "object" || toolUse.input === null) {
    // Fall back to text extraction if tool_use block is absent (model returned text instead)
    const textBlock = content.find((c) => c.type === "text");
    const fallbackText = (textBlock as { text?: string } | undefined)?.text ?? "";
    if (fallbackText) {
      // Try to parse the text as a compact strategy object and build from it
      try {
        const parsed = JSON.parse(repairJson(fallbackText)) as CompactCampaignStrategy;
        return buildDraftFromStrategy(parsed, input);
      } catch {
        // Text parse failed — fall through to throw
      }
    }
    throw new StagedError(
      `Anthropic strategy tool call returned no valid input. stop_reason=${stopReason}, content types=${content.map((c) => c.type).join(",")}`,
      "response_shape"
    );
  }

  // toolUse.input is already a plain JS object — no JSON.parse needed.
  // Pass it to buildDraftFromStrategy which runs generateMockPlan() + applies overlays.
  return buildDraftFromStrategy(toolUse.input as CompactCampaignStrategy, input);
}

// ─────────────────────────────────────────────────────────────
// Anthropic — intelligence extraction
// max_tokens 3000 — enough for slimmed schema without truncation
// ─────────────────────────────────────────────────────────────

async function callAnthropicExtract(clientId: string, summary: string, apiKey: string): Promise<ClientIntelligence> {
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildExtractionPrompt(clientId, summary) }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`Anthropic API ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text: string = data?.content?.[0]?.text ?? "";
  if (!text) throw new Error("Anthropic returned empty content");

  return parseExtractionJson(text, clientId);
}

// ─────────────────────────────────────────────────────────────
// OpenAI (GPT-4o) — campaign generation
// ─────────────────────────────────────────────────────────────

async function callOpenAI(input: CampaignGenerationInput, apiKey: string): Promise<CampaignDraft> {
  const response = await fetch(
    `${process.env.OPENAI_API_BASE ?? "https://api.openai.com"}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildCampaignPrompt(input) },
        ],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI API ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenAI returned empty content");

  return parseAIJson(text, input);
}

// ─────────────────────────────────────────────────────────────
// OpenAI — intelligence extraction
// ─────────────────────────────────────────────────────────────

async function callOpenAIExtract(clientId: string, summary: string, apiKey: string): Promise<ClientIntelligence> {
  const response = await fetch(
    `${process.env.OPENAI_API_BASE ?? "https://api.openai.com"}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: buildExtractionPrompt(clientId, summary) },
        ],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI API ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenAI returned empty content");

  return parseExtractionJson(text, clientId);
}

// ─────────────────────────────────────────────────────────────
// Creative asset analysis — main entry point
// ─────────────────────────────────────────────────────────────

export async function analyzeCreativeAsset(
  input: CreativeAnalysisInput
): Promise<AnalyzeCreativeResponse> {
  const provider = (process.env.AI_PROVIDER ?? "mock").trim().toLowerCase();

  if (provider === "anthropic") {
    const apiKey = resolveAnthropicKey();
    if (!apiKey) return mockCreativeFallback(input, "ANTHROPIC_API_KEY is not set — using mock analysis.");
    try {
      const analysis = await callAnthropicAnalyzeCreative(input, apiKey);
      return { analysis, mockMode: false, provider: "anthropic" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout = msg.includes("abort") || msg.includes("timeout") || msg.includes("AbortError");
      console.error("[AI Service] Anthropic creative analysis error:", err);
      return mockCreativeFallback(
        input,
        isTimeout
          ? "Anthropic timed out (>50s) — using mock fallback."
          : "Anthropic analysis failed — using mock fallback."
      );
    }
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return mockCreativeFallback(input, "OPENAI_API_KEY is not set — using mock analysis.");
    try {
      const analysis = await callOpenAIAnalyzeCreative(input, apiKey);
      return { analysis, mockMode: false, provider: "openai" };
    } catch (err) {
      console.error("[AI Service] OpenAI creative analysis error:", err);
      return mockCreativeFallback(input, "OpenAI analysis failed — using mock fallback.");
    }
  }

  return mockCreativeFallback(input);
}

// ─────────────────────────────────────────────────────────────
// Weekly report generation — main entry point
// ─────────────────────────────────────────────────────────────

export async function generateWeeklyReport(
  input: WeeklyReportInput
): Promise<GenerateReportResult> {
  const provider = (process.env.AI_PROVIDER ?? "mock").trim().toLowerCase();

  if (provider === "anthropic") {
    const apiKey = resolveAnthropicKey();
    if (!apiKey) return mockReportFallback(input, "ANTHROPIC_API_KEY is not set — using mock report.");
    try {
      const report = await callAnthropicReport(input, apiKey);
      return { report, mockMode: false, provider: "anthropic" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout = msg.includes("abort") || msg.includes("timeout") || msg.includes("AbortError");
      console.error("[AI Service] Anthropic report error:", err);
      return mockReportFallback(
        input,
        isTimeout
          ? "Anthropic timed out (>50s) — using mock fallback."
          : "Anthropic report generation failed — using mock fallback."
      );
    }
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return mockReportFallback(input, "OPENAI_API_KEY is not set — using mock report.");
    try {
      const report = await callOpenAIReport(input, apiKey);
      return { report, mockMode: false, provider: "openai" };
    } catch (err) {
      console.error("[AI Service] OpenAI report error:", err);
      return mockReportFallback(input, "OpenAI report generation failed — using mock fallback.");
    }
  }

  return mockReportFallback(input);
}

// ─────────────────────────────────────────────────────────────
// Mock fallbacks for new functions
// ─────────────────────────────────────────────────────────────

function mockCreativeFallback(input: CreativeAnalysisInput, notice?: string): AnalyzeCreativeResponse {
  const analysis = mockAnalyzeCreative(input);
  return { analysis, mockMode: true, provider: "mock", notice };
}

function mockReportFallback(input: WeeklyReportInput, notice?: string): GenerateReportResult {
  const report = mockGenerateReport(input);
  return { report, mockMode: true, provider: "mock", notice };
}

// ─────────────────────────────────────────────────────────────
// JSON parsers for new types
// ─────────────────────────────────────────────────────────────

function parseCreativeJson(text: string): CreativeAnalysisResult {
  let jsonStr = text.trim();
  const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) jsonStr = fenced[1].trim();
  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonStr) as CreativeAnalysisResult;
}

function parseReportJson(text: string): WeeklyReportDraft {
  let jsonStr = text.trim();
  const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) jsonStr = fenced[1].trim();
  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonStr) as WeeklyReportDraft;
}

// ─────────────────────────────────────────────────────────────
// Anthropic — creative analysis
// max_tokens reduced to 1024 — compact schema, fast response
// ─────────────────────────────────────────────────────────────

async function callAnthropicAnalyzeCreative(input: CreativeAnalysisInput, apiKey: string): Promise<CreativeAnalysisResult> {
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: CREATIVE_ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildCreativeAnalysisPrompt(input) }],
    }),
  });
  if (!response.ok) throw new Error(`Anthropic API ${response.status}: ${await response.text().catch(() => response.statusText)}`);
  const data = await response.json();
  const text: string = data?.content?.[0]?.text ?? "";
  if (!text) throw new Error("Anthropic returned empty content");
  return parseCreativeJson(text);
}

// ─────────────────────────────────────────────────────────────
// OpenAI — creative analysis
// ─────────────────────────────────────────────────────────────

async function callOpenAIAnalyzeCreative(input: CreativeAnalysisInput, apiKey: string): Promise<CreativeAnalysisResult> {
  const response = await fetch(
    `${process.env.OPENAI_API_BASE ?? "https://api.openai.com"}/v1/chat/completions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 2048,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CREATIVE_ANALYSIS_SYSTEM_PROMPT },
          { role: "user", content: buildCreativeAnalysisPrompt(input) },
        ],
      }),
    }
  );
  if (!response.ok) throw new Error(`OpenAI API ${response.status}: ${await response.text().catch(() => response.statusText)}`);
  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenAI returned empty content");
  return parseCreativeJson(text);
}

// ─────────────────────────────────────────────────────────────
// Anthropic — weekly report
// max_tokens reduced to 1500 — concise report schema
// ─────────────────────────────────────────────────────────────

async function callAnthropicReport(input: WeeklyReportInput, apiKey: string): Promise<WeeklyReportDraft> {
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: REPORT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildReportPrompt(input) }],
    }),
  });
  if (!response.ok) throw new Error(`Anthropic API ${response.status}: ${await response.text().catch(() => response.statusText)}`);
  const data = await response.json();
  const text: string = data?.content?.[0]?.text ?? "";
  if (!text) throw new Error("Anthropic returned empty content");
  return parseReportJson(text);
}

// ─────────────────────────────────────────────────────────────
// OpenAI — weekly report
// ─────────────────────────────────────────────────────────────

async function callOpenAIReport(input: WeeklyReportInput, apiKey: string): Promise<WeeklyReportDraft> {
  const response = await fetch(
    `${process.env.OPENAI_API_BASE ?? "https://api.openai.com"}/v1/chat/completions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 2048,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: REPORT_SYSTEM_PROMPT },
          { role: "user", content: buildReportPrompt(input) },
        ],
      }),
    }
  );
  if (!response.ok) throw new Error(`OpenAI API ${response.status}: ${await response.text().catch(() => response.statusText)}`);
  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenAI returned empty content");
  return parseReportJson(text);
}
