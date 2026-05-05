import { NextResponse } from "next/server";

// TEMPORARY DEBUG ENDPOINT
export async function GET() {
  const aiProvider = process.env.AI_PROVIDER ?? "(not set)";
  const hasAnthropicKey = !!(process.env.ANTHROPIC_API_KEY?.trim());
  const anthropicKeyLength = process.env.ANTHROPIC_API_KEY?.trim().length ?? 0;
  const anthropicKeyPrefix = process.env.ANTHROPIC_API_KEY?.trim().substring(0, 10) ?? "(none)";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(not set)";
  const hasServiceRole = !!(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  return NextResponse.json({
    aiProvider,
    hasAnthropicKey,
    anthropicKeyLength,
    anthropicKeyPrefix,
    supabaseUrl,
    hasServiceRole,
    nodeEnv: process.env.NODE_ENV,
  });
}
