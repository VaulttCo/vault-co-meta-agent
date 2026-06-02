// /api/victoria/prospects
// GET:  List/search prospects
// POST: Create a new prospect record
// Server-side only.

import { NextRequest, NextResponse } from "next/server";
import { listProspects, insertProspect } from "@/lib/victoria/db";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

// Gate every handler on an authenticated user with AI-builder access.
async function guard(): Promise<NextResponse | null> {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// GET /api/victoria/prospects?search=john&limit=30
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 30), 100);

  const prospects = await listProspects(search, limit);
  return NextResponse.json({ prospects, count: prospects.length });
}

// ─────────────────────────────────────────────────────────────
// POST /api/victoria/prospects — create a new prospect
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  let body: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    vertical?: string;
    location_city?: string;
    location_state?: string;
    business_size?: string;
    years_in_business?: number;
    known_pain_points?: string[];
    known_objections?: string[];
    deal_stage?: string;
    urgency_level?: string;
    next_step?: string;
    primary_fear?: string;
    primary_desire?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const id = await insertProspect({
    name: body.name.trim(),
    company: body.company ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    vertical: body.vertical ?? null,
    location_city: body.location_city ?? null,
    location_state: body.location_state ?? null,
    business_size: body.business_size ?? null,
    years_in_business: body.years_in_business ?? null,
    personality_type: null,
    communication_style: null,
    known_pain_points: body.known_pain_points ?? [],
    known_objections: body.known_objections ?? [],
    known_triggers: [],
    known_resistances: [],
    primary_fear: body.primary_fear ?? null,
    primary_desire: body.primary_desire ?? null,
    deal_stage: body.deal_stage ?? "prospect",
    last_contact: null,
    next_step: body.next_step ?? null,
    urgency_level: body.urgency_level ?? "low",
  });

  if (!id) {
    return NextResponse.json(
      { error: "Failed to create prospect — check Supabase connection" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id, success: true }, { status: 201 });
}
