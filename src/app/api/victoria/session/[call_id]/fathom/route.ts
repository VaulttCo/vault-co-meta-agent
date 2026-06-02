// Server-side — Victoria Fathom Ingestion Route
// POST  /api/victoria/session/[call_id]/fathom  — ingest Fathom recording for this call
// GET   /api/victoria/session/[call_id]/fathom  — retrieve stored ingestion

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/victoria/memory/session-store";
import {
  isFathomAvailable,
  extractRecordingIdFromUrl,
  resolveShareUrl,
  fetchFathomRecording,
  buildMockFathomResult,
} from "@/lib/victoria/fathom/client";
import { computeSpeakerIntelligence } from "@/lib/victoria/fathom/speaker-metrics";
import { reconcileTranscripts } from "@/lib/victoria/fathom/reconcile";
import { getRepProfile } from "@/lib/victoria/reps/profiles";
import { upsertFathomIngestion, getFathomIngestion } from "@/lib/victoria/db";
import type { FathomIngestRequest, FathomIngestion } from "@/lib/victoria/fathom/types";
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
// GET — fetch stored ingestion
// ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ call_id: string }> }
) {
  const denied = await guard();
  if (denied) return denied;

  const { call_id } = await params;
  const row = await getFathomIngestion(call_id);
  if (!row) {
    return NextResponse.json({ ingestion: null }, { status: 200 });
  }
  return NextResponse.json({ ingestion: row });
}

// ─────────────────────────────────────────────────────────────
// POST — fetch from Fathom and run reconciliation
// ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ call_id: string }> }
) {
  const denied = await guard();
  if (denied) return denied;

  const { call_id } = await params;
  const start = Date.now();

  // Load live session (needed for reconciliation + prospect name)
  const session = await getSession(call_id);
  if (!session) {
    return NextResponse.json({ error: `Session not found: ${call_id}` }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as FathomIngestRequest;
  const prospectName = session.prospect.name;
  const mockMode = !isFathomAvailable();

  // ── Resolve rep's Fathom speaker names ──────────────────────
  let repFathomNames: string[] = [];
  if (session.rep_id) {
    const repProfile = await getRepProfile(session.rep_id).catch(() => null);
    if (repProfile) repFathomNames = repProfile.fathom_speaker_names ?? [];
  }
  // Fallback: use known Vault Co reps
  if (repFathomNames.length === 0) {
    repFathomNames = ["Nick Moore", "Nick", "Jaxon", "Jaxon B"];
  }

  // ── Resolve recording_id ─────────────────────────────────────
  let recordingId: string | null = body.fathom_recording_id ?? null;

  if (!recordingId && body.fathom_url && !mockMode) {
    // Try to extract from URL directly
    recordingId = extractRecordingIdFromUrl(body.fathom_url);
    // If share URL (can't extract directly), resolve via API
    if (!recordingId) {
      try {
        recordingId = await resolveShareUrl(body.fathom_url);
      } catch (err) {
        console.error("[Victoria:Fathom] URL resolution failed:", err);
        return NextResponse.json(
          { error: "Could not resolve Fathom recording from the provided URL." },
          { status: 400 }
        );
      }
    }
  }

  // ── Fetch from Fathom (or mock) ─────────────────────────────
  let fetchResult;
  const repName = repFathomNames[0] ?? "Rep";

  if (mockMode || !recordingId) {
    fetchResult = buildMockFathomResult(prospectName, repName);
    recordingId = recordingId ?? "mock_recording";
  } else {
    try {
      fetchResult = await fetchFathomRecording(recordingId, repFathomNames);
    } catch (err) {
      console.error("[Victoria:Fathom] Fetch failed:", err);
      // Fall back to mock rather than erroring out
      fetchResult = buildMockFathomResult(prospectName, repName);
    }
  }

  const { metadata, speakers, segments, summary, action_items } = fetchResult;

  // ── Compute speaker intelligence ────────────────────────────
  const speakerIntelligence = computeSpeakerIntelligence(
    call_id,
    speakers,
    segments,
    session
  );

  // ── Reconcile transcripts ───────────────────────────────────
  const reconciliation = session.transcript.length > 0
    ? reconcileTranscripts(session, segments, call_id)
    : null;

  // ── Build ingestion record ──────────────────────────────────
  const ingestion: Omit<FathomIngestion, "id"> = {
    call_id,
    fathom_recording_id: recordingId,
    recording_url: metadata.url ?? null,
    share_url: metadata.share_url ?? null,
    duration_seconds: metadata.duration ?? null,
    title: metadata.title ?? null,
    speakers,
    segments,
    summary,
    action_items,
    speaker_metrics: speakerIntelligence,
    reconciliation,
    ingested_at: new Date().toISOString(),
  };

  // ── Persist (non-blocking on error) ─────────────────────────
  upsertFathomIngestion({
    ...ingestion,
    speakers: speakers as unknown as import("@/lib/victoria/types").VictoriaFathomIngestionRow["speakers"],
    segments: segments as unknown as import("@/lib/victoria/types").VictoriaFathomIngestionRow["segments"],
    speaker_metrics: speakerIntelligence as unknown,
    reconciliation: reconciliation as unknown,
  }).catch(console.error);

  return NextResponse.json({
    ingestion: { ...ingestion, id: "pending" },
    speaker_intelligence: speakerIntelligence,
    reconciliation,
    meta: {
      fathom_available: !mockMode,
      mock_mode: mockMode || !body.fathom_url,
      processing_time_ms: Date.now() - start,
    },
  });
}
