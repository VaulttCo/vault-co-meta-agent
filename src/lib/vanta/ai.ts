// VANTA — Anthropic API caller (server-side only). V1.
//
// Same raw-fetch + tool-call pattern as Victoria (src/lib/victoria/anthropic.ts) so
// behaviour is consistent platform-wide. Never import in client components. Never log or
// return API key values. Falls back to null on any failure — the analyze orchestrator
// always degrades to the deterministic mock so the app works with no key.

const ANTHROPIC_BASE = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const VANTA_MODEL = "claude-sonnet-4-6";
const VANTA_TIMEOUT_MS = 60_000; // creative package is a big single call

function resolveKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key || null;
}

export function isVantaAiAvailable(): boolean {
  return resolveKey() !== null;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = VANTA_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface VantaToolSchema {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
}

/**
 * One structured tool-call. Returns the parsed tool input object, or null on ANY failure
 * (no key, timeout, refusal, malformed) — callers must mock-fallback.
 */
export async function vantaToolCall<T>(opts: {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  schema: VantaToolSchema;
  maxTokens?: number;
}): Promise<T | null> {
  const key = resolveKey();
  if (!key) return null;
  try {
    const res = await fetchWithTimeout(ANTHROPIC_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: VANTA_MODEL,
        max_tokens: opts.maxTokens ?? 8000,
        system: opts.system,
        tools: [{ name: opts.toolName, description: opts.toolDescription, input_schema: opts.schema }],
        tool_choice: { type: "tool", name: opts.toolName },
        messages: [{ role: "user", content: opts.user }],
      }),
    });
    if (!res.ok) {
      console.error("[vanta:ai] anthropic error", res.status);
      return null;
    }
    const data = (await res.json()) as { content?: Array<{ type: string; input?: unknown }> };
    const block = data.content?.find((b) => b.type === "tool_use");
    return (block?.input as T) ?? null;
  } catch (e) {
    console.error("[vanta:ai]", (e as Error).message);
    return null;
  }
}
