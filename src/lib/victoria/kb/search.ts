// Victoria — Knowledge Base Search
// Server-side only. Text-based search over victoria_knowledge_base.
// Vector search is a future upgrade path; text search works immediately
// with no additional API keys.

import { searchKBText } from "../db";
import type { LiveCallSession, KBSearchResult } from "../types";

// ─────────────────────────────────────────────────────────────
// Build a search query from the current session context
// ─────────────────────────────────────────────────────────────

function buildCallQuery(session: LiveCallSession): string {
  const parts: string[] = [];

  // Most recent prospect utterance — highest signal
  const lastProspect = [...session.transcript]
    .reverse()
    .find((c) => c.speaker === "prospect");
  if (lastProspect) {
    // Take first 60 chars — enough signal without over-querying
    parts.push(lastProspect.text.slice(0, 60));
  }

  // Phase context
  if (session.phase === "handling") parts.push("objection");
  if (session.phase === "positioning") parts.push("offer system");
  if (session.phase === "closing") parts.push("close");

  // Active objection
  const lastObjText = session.objections.unresolved[session.objections.unresolved.length - 1];
  if (lastObjText) parts.push(lastObjText.slice(0, 40));

  return parts.slice(0, 2).join(" ").slice(0, 100);
}

// ─────────────────────────────────────────────────────────────
// Format KB results as an injectable context string
// ─────────────────────────────────────────────────────────────

function formatKBSnippets(results: KBSearchResult[]): string {
  if (results.length === 0) return "";

  const lines = results
    .slice(0, 3)
    .map((r) => {
      const content = r.content.length > 280
        ? r.content.slice(0, 280) + "…"
        : r.content;
      return `[${r.domain.replace(/_/g, " ").toUpperCase()}] ${r.title}\n${content}`;
    });

  return lines.join("\n\n");
}

// ─────────────────────────────────────────────────────────────
// Public API — search KB and return injectable context string
// ─────────────────────────────────────────────────────────────

/**
 * Search the Vault Co knowledge base for content relevant to the current
 * call state. Returns a formatted string ready to inject into agent prompts.
 * Returns empty string when no relevant results found.
 */
export async function getKBContextForCall(
  session: LiveCallSession
): Promise<string> {
  try {
    const query = buildCallQuery(session);
    if (!query.trim()) return "";

    const results = await searchKBText(query, {
      vertical: session.prospect.vertical,
      limit: 4,
    });

    if (results.length === 0) return "";
    return formatKBSnippets(results);
  } catch {
    return ""; // Never block agent execution due to KB failure
  }
}

/**
 * Targeted KB search for objection-specific knowledge.
 * Called when an objection is detected — searches by objection category.
 */
export async function getObjectionKBContext(
  objectionText: string,
  vertical: string
): Promise<string> {
  try {
    // Build targeted query from objection text
    const query = objectionText.slice(0, 80);
    const results = await searchKBText(query, {
      domain: "objection_handling",
      vertical,
      limit: 2,
    });

    // Also try generic contractor psychology
    const psychResults = await searchKBText("contractor skepticism burned agencies", {
      domain: "contractor_psychology",
      limit: 1,
    });

    const combined = [...results, ...psychResults].slice(0, 3);
    return formatKBSnippets(combined);
  } catch {
    return "";
  }
}
