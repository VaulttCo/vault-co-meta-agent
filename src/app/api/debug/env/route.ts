import { NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";

// Debug endpoint — admin only, no raw secrets exposed
export async function GET() {
  const auth = await resolveServerRole();
  if (!auth || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    aiProvider: process.env.AI_PROVIDER ?? "(not set)",
    hasAnthropicKey: !!(process.env.ANTHROPIC_API_KEY?.trim()),
    hasSupabaseUrl: !!(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    hasServiceRole: !!(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    nodeEnv: process.env.NODE_ENV,
  });
}
