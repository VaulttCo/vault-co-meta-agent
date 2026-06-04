// GET  /api/core/competitor-profiles — list competitor profiles (read).
// POST /api/core/competitor-profiles — create a profile (admin/internal write).
// Internal data only: no external calls, no credentials, no raw payloads, no PII.
// Inputs are validated + sanitized (only http(s) URLs, capped lengths).

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getProfiles, createProfile, toProfileDTO } from "@/lib/core/competitor/db";
import { validateProfileInput } from "@/lib/core/competitor/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    return NextResponse.json({ profiles: (await getProfiles()).map(toProfileDTO) });
  } catch (e) {
    console.error("[GET /api/core/competitor-profiles]", (e as Error).message);
    return NextResponse.json({ profiles: [] });
  }
}

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Manual competitor data is internal — admin / integration-manager only.
  if (!(auth.role === "admin" || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const result = validateProfileInput(body);
    if (!result.ok || !result.value) {
      return NextResponse.json({ error: result.error ?? "Invalid input" }, { status: 400 });
    }
    const profile = await createProfile(result.value, auth.userId ?? null);
    return NextResponse.json({ profile: toProfileDTO(profile) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/core/competitor-profiles]", (e as Error).message);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}
