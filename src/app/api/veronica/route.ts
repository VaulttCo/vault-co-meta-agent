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
  mockVeronicaResponse,
  type VeronicaConsoleResponse,
  type VeronicaPortalContext,
  type IntegrationConnection,
} from "@/lib/ai/veronica";

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

    // Fetch all core portal data in parallel
    const [clients, allDrafts, allApprovals, allReports] = await Promise.all([
      db.getClients(),
      db.getCampaignDrafts(),
      db.getApprovals(),
      db.getReports(),
    ]);

    // If no explicit clientId, detect a mentioned client from the message text
    // so the client brain is built with full intelligence context
    let effectiveClientId = clientId;
    if (!effectiveClientId) {
      const m = message.toLowerCase();
      const detected = clients.find((c) => {
        if (m.includes(c.name.toLowerCase())) return true;
        if (m.includes(c.id.toLowerCase())) return true;
        const ownerParts = c.owner.toLowerCase().split(" ");
        if (ownerParts.some((w: string) => w.length >= 4 && m.includes(w))) return true;
        const genericWords = new Set(["group", "roofing", "construction", "builders", "remodeling", "forge", "home"]);
        const nameParts = c.name.toLowerCase().split(/[\s-]+/);
        return nameParts.some((w: string) => w.length >= 4 && !genericWords.has(w) && m.includes(w));
      });
      if (detected) effectiveClientId = detected.id;
    }

    // Fetch client-specific data when a client is targeted (explicit or detected from message)
    let clientIntelligence = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let creativeAssets: any[] = [];
    if (effectiveClientId) {
      [clientIntelligence, creativeAssets] = await Promise.all([
        db.getClientIntelligence(effectiveClientId),
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
    };

    // Try Anthropic when configured
    const provider = (process.env.AI_PROVIDER ?? "mock").trim().toLowerCase();
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

    if (provider === "anthropic" && apiKey) {
      try {
        const systemPrompt = buildVeronicaSystemPrompt(ctx);

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
            system: systemPrompt,
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
        };

        return NextResponse.json(result);
      } catch (err) {
        console.error("[POST /api/veronica] Anthropic error — falling back to mock:", err);
        // Fall through to mock
      }
    }

    // Mock fallback (data-aware)
    const mockResult = mockVeronicaResponse(message, ctx);
    return NextResponse.json(mockResult);
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
