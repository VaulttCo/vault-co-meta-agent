// Server-side — Victoria Rep Profiles Route
// GET  /api/victoria/reps  — list all rep profiles (used by StartCallModal)
// POST /api/victoria/reps  — create a new rep profile

import { NextRequest, NextResponse } from "next/server";
import {
  listRepProfiles,
  insertRepProfile,
  seedRepProfilesIfEmpty,
} from "@/lib/victoria/reps/profiles";
import type { RepProfile } from "@/lib/victoria/reps/types";

export async function GET(_req: NextRequest) {
  // Ensure at least Nick + Jaxon exist
  await seedRepProfilesIfEmpty().catch(console.error);

  const reps = await listRepProfiles();
  return NextResponse.json({ reps });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Partial<RepProfile> | null;
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const id = await insertRepProfile({
    name: body.name.trim(),
    email: body.email ?? null,
    avatar_initials: body.avatar_initials ?? body.name.trim().slice(0, 2).toUpperCase(),
    fathom_speaker_names: body.fathom_speaker_names ?? [body.name.trim()],
    total_calls: 0,
    avg_overall_score: 0,
    avg_talk_ratio_rep: 0,
    avg_discovery_depth: 0,
    avg_close_readiness: 0,
    skill_talk_ratio: 50,
    skill_question_quality: 50,
    skill_emotional_intelligence: 50,
    skill_objection_handling: 50,
    skill_closing: 50,
    skill_discovery_depth: 50,
    interruption_tendency: "low",
    overtalking_tendency: "low",
    strengths: [],
    weaknesses: [],
  });

  if (!id) {
    return NextResponse.json({ error: "Failed to create rep profile" }, { status: 500 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
