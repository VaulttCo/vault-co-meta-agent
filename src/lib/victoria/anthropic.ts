// Victoria — Anthropic API caller
// Server-side only. Follows the same raw-fetch pattern as lib/ai/service.ts
// so behaviour is consistent across the entire platform.
// Never import in client components. Never log or return API key values.

const ANTHROPIC_BASE = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const VICTORIA_TIMEOUT_MS = 25_000; // 25 s — tighter than Veronica because latency matters

// ─────────────────────────────────────────────────────────────
// Key resolution — same fallback as the existing service.ts
// ─────────────────────────────────────────────────────────────

function resolveKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key || null;
}

export function isAnthropicAvailable(): boolean {
  return resolveKey() !== null;
}

// ─────────────────────────────────────────────────────────────
// Timeout wrapper
// ─────────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = VICTORIA_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────
// Tool-call request — structured JSON output via tool use.
// This is the primary call pattern for all Victoria agents.
// Returns the tool input object (already parsed — no JSON.parse needed).
// ─────────────────────────────────────────────────────────────

export interface AnthropicToolSchema {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: AnthropicToolSchema;
}

export interface AnthropicCallOptions {
  model: string;
  system: string;
  userMessage: string;
  tool: AnthropicTool;
  maxTokens?: number;
}

export interface AnthropicCallResult<T> {
  output: T;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  model: string;
}

export async function callAnthropicTool<T>(
  options: AnthropicCallOptions
): Promise<AnthropicCallResult<T>> {
  const apiKey = resolveKey();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const { model, system, userMessage, tool, maxTokens = 1500 } = options;
  const start = Date.now();

  const response = await fetchWithTimeout(ANTHROPIC_BASE, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  const latency_ms = Date.now() - start;

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`Anthropic API ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json() as {
    content: { type: string; name?: string; input?: unknown }[];
    usage?: { input_tokens: number; output_tokens: number };
    stop_reason?: string;
  };

  if (data.stop_reason === "max_tokens") {
    throw new Error(`Victoria agent response truncated — increase max_tokens for model ${model}`);
  }

  const toolUse = data.content?.find(
    (c) => c.type === "tool_use" && c.name === tool.name
  );

  if (!toolUse || typeof toolUse.input !== "object" || toolUse.input === null) {
    const types = data.content?.map((c) => c.type).join(",") ?? "none";
    throw new Error(`Tool call returned no valid input. stop_reason=${data.stop_reason}, content types=${types}`);
  }

  return {
    output: toolUse.input as T,
    input_tokens: data.usage?.input_tokens ?? 0,
    output_tokens: data.usage?.output_tokens ?? 0,
    latency_ms,
    model,
  };
}

// ─────────────────────────────────────────────────────────────
// Models used across Victoria agents
// Sonnet for reasoning agents, Haiku for fast classification agents.
// ─────────────────────────────────────────────────────────────

export const VICTORIA_MODELS = {
  ORCHESTRATOR: "claude-sonnet-4-6",   // Deep reasoning, synthesis
  DISCOVERY: "claude-sonnet-4-6",       // Most important agent — needs quality
  OBJECTION_INTEL: "claude-sonnet-4-6", // Psychological nuance required
  EMOTIONAL: "claude-haiku-4-5-20251001",  // Fast classification
  DEAL_RISK: "claude-haiku-4-5-20251001",  // Scoring pattern
  DEBRIEF: "claude-opus-4-7",           // Post-call, no latency pressure
} as const;
