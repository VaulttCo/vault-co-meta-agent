import { NextRequest, NextResponse } from "next/server";
import { extractClientIntelligence } from "@/lib/ai/service";

export async function POST(req: NextRequest) {
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
