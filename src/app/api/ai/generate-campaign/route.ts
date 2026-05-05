import { NextRequest, NextResponse } from "next/server";
import { generateCampaignDraft } from "@/lib/ai/service";
import type { CampaignGenerationInput } from "@/lib/ai/service";

export async function POST(req: NextRequest) {
  let body: CampaignGenerationInput;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.client || !body.service || !body.market || !body.budget || !body.goal) {
    return NextResponse.json(
      { error: "Missing required fields: client, service, market, budget, goal" },
      { status: 400 }
    );
  }

  try {
    const result = await generateCampaignDraft(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/ai/generate-campaign]", err);
    return NextResponse.json({ error: "Campaign generation failed" }, { status: 500 });
  }
}
