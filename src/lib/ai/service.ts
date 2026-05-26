// Server-side AI service — never import this in client components.
// It reads process.env and makes outbound API calls.
// NEVER log or return the resolved key value.

import type { CampaignDraft } from "@/lib/planStore";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import { generateMockPlan, mockTimestamp, mockExtractIntelligence, mockAnalyzeCreative, mockGenerateReport } from "@/lib/ai/mock";
import {
  SYSTEM_PROMPT,
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
// Anthropic tool schema — defines the campaign draft structure for tool calling.
// Tool calling forces Anthropic to return a validated JSON object internally,
// completely eliminating the "Expected ',' or '}'" class of JSON parse failures.
// The tool input is already parsed by Anthropic before being returned to us —
// we never call JSON.parse on the campaign output when using this path.
// ─────────────────────────────────────────────────────────────

const CAMPAIGN_TOOL_SCHEMA = {
  type: "object",
  description: "Complete Meta advertising campaign draft. Populate every field.",
  properties: {
    campaignName: { type: "string", description: "Descriptive name: [service] — [goal] — [market]" },
    metaStructure: {
      type: "object",
      properties: {
        campaignObjective: { type: "string" },
        campaignType: { type: "string" },
        adSetNames: { type: "array", items: { type: "string" } },
        audience: { type: "string" },
        locationTargeting: { type: "string" },
        placements: { type: "array", items: { type: "string" } },
        budgetSplit: { type: "string" },
        optimizationEvent: { type: "string" },
      },
      required: ["campaignObjective", "campaignType", "adSetNames", "audience", "locationTargeting", "placements", "budgetSplit", "optimizationEvent"],
    },
    adCopy: {
      type: "object",
      properties: {
        primaryTexts: { type: "array", items: { type: "string" }, description: "3 variants, 200-300 chars each, no inner quotes" },
        headlines: { type: "array", items: { type: "string" }, description: "3 variants, 40 chars max each" },
        descriptions: { type: "array", items: { type: "string" }, description: "3 variants, 30 chars max each" },
        cta: { type: "string" },
      },
      required: ["primaryTexts", "headlines", "descriptions", "cta"],
    },
    leadForm: {
      type: "object",
      properties: {
        formName: { type: "string" },
        introCopy: { type: "string" },
        qualificationQuestions: { type: "array", items: { type: "string" } },
        contactFields: { type: "array", items: { type: "string" } },
        consentLanguage: { type: "string", description: "TCPA-compliant with STOP opt-out" },
        thankYouCopy: { type: "string" },
      },
      required: ["formName", "introCopy", "qualificationQuestions", "contactFields", "consentLanguage", "thankYouCopy"],
    },
    ghlWorkflow: {
      type: "object",
      properties: {
        tags: { type: "array", items: { type: "string" } },
        pipelineStage: { type: "string" },
        immediateSms: { type: "string" },
        immediateEmail: {
          type: "object",
          properties: { subject: { type: "string" }, body: { type: "string" } },
          required: ["subject", "body"],
        },
        internalNotification: { type: "string" },
        setterTask: { type: "string" },
        aiVoiceTrigger: { type: "string" },
        bookedStopCondition: { type: "string" },
        steps: { type: "array", items: { type: "string" } },
      },
      required: ["tags", "pipelineStage", "immediateSms", "immediateEmail", "internalNotification", "setterTask", "steps"],
    },
    creativeDirection: {
      type: "object",
      properties: {
        angle: { type: "string" },
        hook: { type: "string" },
        shotList: { type: "array", items: { type: "string" }, description: "4-6 shots" },
        textOverlays: { type: "array", items: { type: "string" }, description: "3-4 overlays" },
        voiceoverScript: { type: "string", description: "30-second script" },
        recommendedFormat: { type: "string" },
        recommendedPlacements: { type: "array", items: { type: "string" } },
      },
      required: ["angle", "hook", "shotList", "textOverlays", "voiceoverScript", "recommendedFormat", "recommendedPlacements"],
    },
    compliance: {
      type: "object",
      properties: {
        metaRisk: { type: "string", description: "LOW | MEDIUM | HIGH — reason" },
        smsCompliance: { type: "string" },
        insuranceRisk: { type: "string" },
        disallowedPhrases: { type: "array", items: { type: "string" } },
        approvalWarnings: { type: "array", items: { type: "string" } },
      },
      required: ["metaRisk", "smsCompliance", "insuranceRisk", "disallowedPhrases", "approvalWarnings"],
    },
    optimization: {
      type: "object",
      properties: {
        cplThreshold: { type: "string" },
        cpbaThreshold: { type: "string" },
        bookingRateFloor: { type: "string" },
        creativeFatigueTrigger: { type: "string" },
        budgetScalingRule: { type: "string" },
        pauseRule: { type: "string" },
        humanApprovalTriggers: { type: "array", items: { type: "string" } },
      },
      required: ["cplThreshold", "cpbaThreshold", "bookingRateFloor", "creativeFatigueTrigger", "budgetScalingRule", "pauseRule", "humanApprovalTriggers"],
    },
    strategicRationale: {
      type: "object",
      properties: {
        whyThisCampaign: { type: "string" },
        audienceRationale: { type: "string" },
        offerAngleUsed: { type: "string" },
        creativeAngleUsed: { type: "string" },
      },
      required: ["whyThisCampaign", "audienceRationale", "offerAngleUsed", "creativeAngleUsed"],
    },
    buyerPsychologyUsed: { type: "object", description: "Optional — populate if client intelligence was used" },
    marketResearchUsed: { type: "object", description: "Optional — populate if market research was used" },
    clientIntelligenceUsed: { type: "object", description: "Optional — populate if onboarding intelligence was used" },
    creativeIntelligenceUsed: { type: "object", description: "Optional — populate if creative asset intelligence was used" },
  },
  required: ["campaignName", "metaStructure", "adCopy", "leadForm", "ghlWorkflow", "creativeDirection", "compliance", "optimization", "strategicRationale"],
};

// ─────────────────────────────────────────────────────────────
// Anthropic (Claude Haiku) — campaign generation via tool calling.
//
// Tool calling forces Anthropic to return a pre-parsed JSON object in
// content[0].input — eliminating all JSON.parse failures caused by
// unescaped quotes or newlines in ad copy strings.
//
// Response shape: content[0].type === "tool_use", content[0].input is the draft.
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
      // Slightly reduced from 4096 — campaign draft fits in ~3000 tokens;
      // extra headroom caused truncation which broke JSON parsing.
      max_tokens: 3500,
      system: SYSTEM_PROMPT,
      // Tool calling: Anthropic parses the output JSON internally.
      // content[0].input is already a plain object — no JSON.parse needed.
      tools: [
        {
          name: "generate_campaign_draft",
          description:
            "Generate a complete, production-ready Meta advertising campaign draft. " +
            "Populate every field completely based on the campaign parameters and client intelligence. " +
            "Keep all string values concise and avoid special characters inside strings.",
          input_schema: CAMPAIGN_TOOL_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "generate_campaign_draft" },
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

  // Detect max_tokens truncation before inspecting content
  const stopReason = (data as { stop_reason?: string })?.stop_reason;
  if (stopReason === "max_tokens") {
    throw new StagedError(
      "Anthropic response truncated — campaign draft exceeded max_tokens budget. Tool input may be incomplete.",
      "response_shape"
    );
  }

  // Extract the tool_use block from content
  const content = (data as { content?: { type: string; input?: unknown; name?: string }[] })?.content ?? [];
  const toolUse = content.find((c) => c.type === "tool_use" && c.name === "generate_campaign_draft");

  if (!toolUse || typeof toolUse.input !== "object" || toolUse.input === null) {
    // Fall back to text extraction if tool_use block is absent (e.g. model returned text instead)
    const textBlock = content.find((c) => c.type === "text");
    const fallbackText = (textBlock as { text?: string } | undefined)?.text ?? "";
    if (fallbackText) {
      // Attempt text-based parse as last resort
      return parseAIJson(fallbackText, input);
    }
    throw new StagedError(
      `Anthropic tool call returned no valid input. stop_reason=${stopReason}, content types=${content.map((c) => c.type).join(",")}`,
      "response_shape"
    );
  }

  // toolUse.input is already a plain JS object — no JSON.parse needed.
  return buildDraftFromParsed(toolUse.input as Record<string, unknown>, input);
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
