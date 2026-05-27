// /api/victoria/prospects/[id]
// GET:  Prospect detail + call history
// PATCH: Update prospect fields
// Server-side only.

import { NextRequest, NextResponse } from "next/server";
import { getProspect, updateProspect, getProspectCallHistory } from "@/lib/victoria/db";

// ─────────────────────────────────────────────────────────────
// GET /api/victoria/prospects/:id
// ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [prospect, callHistory] = await Promise.all([
    getProspect(id),
    getProspectCallHistory(id, 5),
  ]);

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  return NextResponse.json({ prospect, call_history: callHistory });
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/victoria/prospects/:id — partial update
// ─────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prospect = await getProspect(id);
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  // Whitelist updatable fields — never allow id, created_at
  const {
    name, company, email, phone, vertical,
    location_city, location_state, business_size,
    years_in_business, personality_type, communication_style,
    known_pain_points, known_objections, known_triggers,
    known_resistances, primary_fear, primary_desire,
    deal_stage, last_contact, next_step, urgency_level,
  } = body as Record<string, unknown>;

  await updateProspect(id, {
    ...(name !== undefined && { name: String(name) }),
    ...(company !== undefined && { company: company ? String(company) : null }),
    ...(email !== undefined && { email: email ? String(email) : null }),
    ...(phone !== undefined && { phone: phone ? String(phone) : null }),
    ...(vertical !== undefined && { vertical: vertical ? String(vertical) : null }),
    ...(location_city !== undefined && { location_city: location_city ? String(location_city) : null }),
    ...(location_state !== undefined && { location_state: location_state ? String(location_state) : null }),
    ...(business_size !== undefined && { business_size: business_size ? String(business_size) : null }),
    ...(years_in_business !== undefined && { years_in_business: years_in_business ? Number(years_in_business) : null }),
    ...(personality_type !== undefined && { personality_type: personality_type ? String(personality_type) : null }),
    ...(communication_style !== undefined && { communication_style: communication_style ? String(communication_style) : null }),
    ...(Array.isArray(known_pain_points) && { known_pain_points: known_pain_points as string[] }),
    ...(Array.isArray(known_objections) && { known_objections: known_objections as string[] }),
    ...(Array.isArray(known_triggers) && { known_triggers: known_triggers as string[] }),
    ...(Array.isArray(known_resistances) && { known_resistances: known_resistances as string[] }),
    ...(primary_fear !== undefined && { primary_fear: primary_fear ? String(primary_fear) : null }),
    ...(primary_desire !== undefined && { primary_desire: primary_desire ? String(primary_desire) : null }),
    ...(deal_stage !== undefined && { deal_stage: String(deal_stage) }),
    ...(last_contact !== undefined && { last_contact: last_contact ? String(last_contact) : null }),
    ...(next_step !== undefined && { next_step: next_step ? String(next_step) : null }),
    ...(urgency_level !== undefined && { urgency_level: String(urgency_level) }),
  });

  return NextResponse.json({ success: true, id });
}
