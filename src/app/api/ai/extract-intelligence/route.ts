import { NextRequest, NextResponse } from "next/server";
import { extractClientIntelligence } from "@/lib/ai/service";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // ── Auth: extracting + persisting client intelligence is a staff write ──────
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canGenerateCampaigns")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { clientId, onboardingSummary } = body;

    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }
    if (!onboardingSummary || typeof onboardingSummary !== "string") {
      return NextResponse.json({ error: "onboardingSummary is required" }, { status: 400 });
    }

    const result = await extractClientIntelligence(clientId, onboardingSummary);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[extract-intelligence] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
