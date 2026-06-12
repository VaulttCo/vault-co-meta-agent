// POST /api/vanta/assets/[id]/audio-upload — V1.9 Cloud Transcription Bridge step 1.
// Issues a short-lived signed PUT target so the browser uploads its extracted 16kHz
// mono WAV DIRECTLY to private Supabase Storage — audio bytes never pass through a
// JSON route. Caps are enforced here (declared size/duration) and again server-side
// at download. 409 when storage/cloud transcription is unavailable so the client falls
// through to local whisper / worker / manual paste. Role-guarded. The signed URL is
// returned only to the requesting client and never logged or persisted.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaAsset, getVantaTranscript } from "@/lib/vanta/db";
import { isCloudTranscriptionAvailable } from "@/lib/vanta/cloud-transcribe";
import { createAudioUploadTarget, MAX_CLOUD_AUDIO_BYTES, MAX_CLOUD_AUDIO_DURATION_MS } from "@/lib/vanta/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(auth.role === "admin" || can(auth.role, "canViewAiBuilder"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const asset = await getVantaAsset(id);
  if (!asset || !asset.project_id) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  // Purpose binding: upload targets exist ONLY while the asset is awaiting transcription.
  // Once a timestamped transcript exists the audio object can no longer be overwritten
  // through this route (single-tenant internal tool — roles are global by design, so the
  // job-state binding is what scopes the privilege).
  const transcript = await getVantaTranscript(asset.id);
  if (transcript && transcript.segments.length > 0) {
    return NextResponse.json({ error: "Asset already has a transcript — re-register the footage to replace it" }, { status: 409 });
  }

  if (!isCloudTranscriptionAvailable()) {
    return NextResponse.json({
      error: "Cloud transcription unavailable",
      detail: "Requires VANTA_TRANSCRIPTION_PROVIDER=openai, OPENAI_API_KEY, and Supabase Storage — falling back to local whisper / worker / manual paste.",
    }, { status: 409 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) ?? {};
    const sizeBytes = typeof body.size_bytes === "number" && Number.isFinite(body.size_bytes) ? Math.round(body.size_bytes) : null;
    const durationMs = typeof body.duration_ms === "number" && Number.isFinite(body.duration_ms) ? Math.round(body.duration_ms) : null;
    if (!sizeBytes || sizeBytes <= 0) return NextResponse.json({ error: "size_bytes is required" }, { status: 400 });
    if (sizeBytes > MAX_CLOUD_AUDIO_BYTES) {
      return NextResponse.json({ error: `Audio exceeds the ${Math.round(MAX_CLOUD_AUDIO_BYTES / 1024 / 1024)}MB cloud cap — use the worker or paste the transcript`, cap: "bytes" }, { status: 413 });
    }
    if (durationMs && durationMs > MAX_CLOUD_AUDIO_DURATION_MS) {
      return NextResponse.json({ error: `Audio exceeds the ${Math.round(MAX_CLOUD_AUDIO_DURATION_MS / 60_000)}-minute cloud cap — use the worker or paste the transcript`, cap: "duration" }, { status: 413 });
    }

    const target = await createAudioUploadTarget(asset.project_id, asset.id);
    if (!target) return NextResponse.json({ error: "Storage bucket unavailable — falling back to worker/manual transcription" }, { status: 409 });
    return NextResponse.json({
      upload: target, // short-lived signed PUT credential for this client only
      content_type: "audio/wav",
      caps: { max_bytes: MAX_CLOUD_AUDIO_BYTES, max_duration_ms: MAX_CLOUD_AUDIO_DURATION_MS },
    });
  } catch (e) {
    console.error("[POST /api/vanta/assets/[id]/audio-upload]", (e as Error).message);
    return NextResponse.json({ error: "Could not create upload target" }, { status: 500 });
  }
}
