// GET  /api/core/competitor-captures — list manual intelligence captures (read).
// POST /api/core/competitor-captures — create a capture (admin/internal write).
// Manual entry only. No scraping, no external calls, no credentials, no PII, no
// raw provider payloads. Inputs are validated + sanitized.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getCaptures, createCapture, toCaptureDTO } from "@/lib/core/competitor/db";
import { validateCaptureInput } from "@/lib/core/competitor/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewStrategyData")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    return NextResponse.json({ captures: (await getCaptures()).map(toCaptureDTO) });
  } catch (e) {
    console.error("[GET /api/core/competitor-captures]", (e as Error).message);
    return NextResponse.json({ captures: [] });
  }
}

export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canConnectIntegrations"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const result = validateCaptureInput(body);
    if (!result.ok || !result.value) {
      return NextResponse.json({ error: result.error ?? "Invalid input" }, { status: 400 });
    }
    const capture = await createCapture(result.value, auth.userId ?? null);
    return NextResponse.json({ capture: toCaptureDTO(capture) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/core/competitor-captures]", (e as Error).message);
    return NextResponse.json({ error: "Failed to create capture" }, { status: 500 });
  }
}
