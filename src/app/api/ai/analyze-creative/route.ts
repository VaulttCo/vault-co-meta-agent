import { NextRequest, NextResponse } from "next/server";
import { analyzeCreativeAsset } from "@/lib/ai/service";
import type { CreativeAnalysisInput } from "@/lib/ai/service";

// Extend Vercel function timeout to 60s (max for Hobby plan)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: CreativeAnalysisInput;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.assetType || !body.service || !body.market) {
    return NextResponse.json(
      { error: "Missing required fields: assetType, service, market" },
      { status: 400 }
    );
  }

  try {
    const result = await analyzeCreativeAsset(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/ai/analyze-creative]", err);
    return NextResponse.json({ error: "Creative analysis failed" }, { status: 500 });
  }
}
