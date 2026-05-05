// Server-side AI service — never import this in client components.
// It reads process.env and makes outbound API calls.

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

export type { CampaignGenerationInput, CreativeAnalysisInput, CreativeAnalysisResult, WeeklyReportInput, WeeklyReportDraft };

export interface GenerateCampaignResult {
  draft: CampaignDraft;
  mockMode: boolean;
  provider: string;
  notice?: string;
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
// Campaign generation — main entry point
// ─────────────────────────────────────────────────────────────

export async function generateCampaignDraft(
  input: CampaignGenerationInput
): Promise<GenerateCampaignResult> {
  const provider = (process.env.AI_PROVIDER ?? "mock").trim().toLowerCase();

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return mockFallback(input, "ANTHROPIC_API_KEY is not set — using mock generation.");
    }
    try {
      const draft = await callAnthropic(input, apiKey);
      return { draft, mockMode: false, provider: "anthropic" };
    } catch (err) {
      console.error("[AI Service] Anthropic error:", err);
      return mockFallback(input, "Anthropic generation failed — using mock fallback.");
    }
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return mockFallback(input, "OPENAI_API_KEY is not set — using mock generation.");
    }
    try {
      const draft = await callOpenAI(input, apiKey);
      return { draft, mockMode: false, provider: "openai" };
    } catch (err) {
      console.error("[AI Service] OpenAI error:", err);
      return mockFallback(input, "OpenAI generation failed — using mock fallback.");
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
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return mockExtractionFallback(clientId, onboardingSummary, "ANTHROPIC_API_KEY is not set — using mock extraction.");
    }
    try {
      const intelligence = await callAnthropicExtract(clientId, onboardingSummary, apiKey);
      return { intelligence, mockMode: false, provider: "anthropic" };
    } catch (err) {
      console.error("[AI Service] Anthropic extraction error:", err);
      return mockExtractionFallback(clientId, onboardingSummary, "Anthropic extraction failed — using mock fallback.");
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

function mockFallback(input: CampaignGenerationInput, notice?: string): GenerateCampaignResult {
  const draft = generateMockPlan(
    input.client,
    input.goal,
    input.service,
    input.market,
    input.budget,
    input.creativeType ?? "",
    input.clientIntelligence ?? null,
    input.selectedAsset ?? null
  );
  return { draft, mockMode: true, provider: "mock", notice };
}

function mockExtractionFallback(clientId: string, summary: string, notice?: string): ExtractIntelligenceResult {
  const intelligence = mockExtractIntelligence(clientId, summary);
  return { intelligence, mockMode: true, provider: "mock", notice };
}

// ─────────────────────────────────────────────────────────────
// JSON parser — handles both raw JSON and ```json code blocks
// ─────────────────────────────────────────────────────────────

function parseAIJson(text: string, input: CampaignGenerationInput): CampaignDraft {
  let jsonStr = text.trim();

  const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) jsonStr = fenced[1].trim();

  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(jsonStr);
  const now = mockTimestamp();
  const budgetStr = input.budget.startsWith("$")
    ? input.budget
    : `$${parseInt(input.budget.replace(/[^0-9]/g, "") || "1500").toLocaleString()}/mo`;

  return {
    id: `plan-${Date.now()}`,
    clientId: input.client.id,
    clientName: input.client.name,
    campaignName: parsed.campaignName ?? `${input.service} — ${input.goal} — ${input.market}`,
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
    metaStructure: parsed.metaStructure,
    adCopy: parsed.adCopy,
    leadForm: parsed.leadForm,
    ghlWorkflow: parsed.ghlWorkflow,
    creativeDirection: parsed.creativeDirection,
    compliance: parsed.compliance,
    optimization: parsed.optimization,
    buyerPsychologyUsed: parsed.buyerPsychologyUsed,
    marketResearchUsed: parsed.marketResearchUsed,
    clientIntelligenceUsed: parsed.clientIntelligenceUsed,
    strategicRationale: parsed.strategicRationale,
    creativeIntelligenceUsed: parsed.creativeIntelligenceUsed,
  };
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
// Anthropic (Claude) — campaign generation
// ─────────────────────────────────────────────────────────────

async function callAnthropic(input: CampaignGenerationInput, apiKey: string): Promise<CampaignDraft> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildCampaignPrompt(input) }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`Anthropic API ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text: string = data?.content?.[0]?.text ?? "";
  if (!text) throw new Error("Anthropic returned empty content");

  return parseAIJson(text, input);
}

// ─────────────────────────────────────────────────────────────
// Anthropic — intelligence extraction
// ─────────────────────────────────────────────────────────────

async function callAnthropicExtract(clientId: string, summary: string, apiKey: string): Promise<ClientIntelligence> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
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
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildCampaignPrompt(input) },
      ],
    }),
  });

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
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: buildExtractionPrompt(clientId, summary) },
      ],
    }),
  });

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
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) return mockCreativeFallback(input, "ANTHROPIC_API_KEY is not set — using mock analysis.");
    try {
      const analysis = await callAnthropicAnalyzeCreative(input, apiKey);
      return { analysis, mockMode: false, provider: "anthropic" };
    } catch (err) {
      console.error("[AI Service] Anthropic creative analysis error:", err);
      return mockCreativeFallback(input, "Anthropic analysis failed — using mock fallback.");
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
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) return mockReportFallback(input, "ANTHROPIC_API_KEY is not set — using mock report.");
    try {
      const report = await callAnthropicReport(input, apiKey);
      return { report, mockMode: false, provider: "anthropic" };
    } catch (err) {
      console.error("[AI Service] Anthropic report error:", err);
      return mockReportFallback(input, "Anthropic report generation failed — using mock fallback.");
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
// ─────────────────────────────────────────────────────────────

async function callAnthropicAnalyzeCreative(input: CreativeAnalysisInput, apiKey: string): Promise<CreativeAnalysisResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
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
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
  });
  if (!response.ok) throw new Error(`OpenAI API ${response.status}: ${await response.text().catch(() => response.statusText)}`);
  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenAI returned empty content");
  return parseCreativeJson(text);
}

// ─────────────────────────────────────────────────────────────
// Anthropic — weekly report
// ─────────────────────────────────────────────────────────────

async function callAnthropicReport(input: WeeklyReportInput, apiKey: string): Promise<WeeklyReportDraft> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
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
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: REPORT_SYSTEM_PROMPT },
        { role: "user", content: buildReportPrompt(input) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI API ${response.status}: ${await response.text().catch(() => response.statusText)}`);
  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenAI returned empty content");
  return parseReportJson(text);
}
