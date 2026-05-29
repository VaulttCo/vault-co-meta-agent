// Server-side — Victoria Rep Profile Detail Route
// GET   /api/victoria/reps/[rep_id]  — get a single rep profile
// PATCH /api/victoria/reps/[rep_id]  — update rep profile settings or stats

import { NextRequest, NextResponse } from "next/server";
import {
  getRepProfile,
  updateRepProfile,
  updateRepProfileStats,
  getRepCallLogs,
} from "@/lib/victoria/reps/profiles";
import type { RepCallStatsUpdate } from "@/lib/victoria/reps/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ rep_id: string }> }
) {
  const { rep_id } = await params;
  const profile = await getRepProfile(rep_id);

  if (!profile) {
    return NextResponse.json({ error: "Rep profile not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const includeLogs = url.searchParams.get("include_logs") === "true";
  const logs = includeLogs ? await getRepCallLogs(rep_id) : undefined;

  return NextResponse.json({ rep: profile, logs });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ rep_id: string }> }
) {
  const { rep_id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Request body required" }, { status: 400 });
  }

  // If body contains a 'stats_update' key, treat as a post-call stats update
  if (body.stats_update && body.call_id) {
    await updateRepProfileStats(
      rep_id,
      body.call_id as string,
      body.stats_update as RepCallStatsUpdate
    );
    const updated = await getRepProfile(rep_id);
    return NextResponse.json({ rep: updated });
  }

  // Otherwise treat as a direct field update
  const { stats_update: _ignored, ...fields } = body;
  await updateRepProfile(rep_id, fields);
  const updated = await getRepProfile(rep_id);
  return NextResponse.json({ rep: updated });
}
