// POST /api/vanta/assets/[id]/video-upload — V1.10 Universal Video Ingestion step 1.
// Issues a short-lived signed PUT target so the browser uploads the ORIGINAL video/audio
// file DIRECTLY to the private vanta-raw-footage bucket — bytes never pass through a
// JSON route, and no browser codec support is required (ffmpeg normalizes server-side).
// Validates extension whitelist, MIME family, size cap (300MB), and duration cap (12min)
// BEFORE issuing the target; server-side download re-checks size and deletes over-cap
// objects. Purpose-bound: only while the asset is awaiting transcription. Role-guarded.
// The signed URL goes only to the requesting client; never logged or persisted.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";
import { getVantaAsset, getVantaTranscript, getVantaRuns } from "@/lib/vanta/db";
import { isCloudTranscriptionAvailable } from "@/lib/vanta/cloud-transcribe";
import {
  createVideoUploadTarget, isAllowedUploadType,
  MAX_CLOUD_VIDEO_BYTES, MAX_CLOUD_AUDIO_DURATION_MS, ALLOWED_VIDEO_EXTENSIONS,
} from "@/lib/vanta/storage";

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

  // Authz note: this is a single-tenant internal operator tool — roles are global by
  // design (same model as every other Vanta mutating route). Cross-owner scoping is a
  // future multi-tenant milestone. Privilege is bound by PURPOSE instead: an upload
  // target is minted ONLY for an asset that (a) has no transcript yet AND (b) has an
  // active queued transcript job — i.e. one currently mid auto-edit flow.
  const transcript = await getVantaTranscript(asset.id);
  if (transcript && transcript.segments.length > 0) {
    return NextResponse.json({ error: "Asset already has a transcript — re-register the footage to replace it" }, { status: 409 });
  }
  const runs = await getVantaRuns(asset.project_id, 200);
  const hasQueuedTranscript = runs.some((r) => r.asset_id === asset.id && r.job_type === "transcript" && r.status === "queued");
  if (!hasQueuedTranscript) {
    return NextResponse.json({ error: "No transcription is awaiting this asset — start an Auto Editor draft first" }, { status: 409 });
  }

  if (!isCloudTranscriptionAvailable()) {
    return NextResponse.json({
      error: "Cloud transcription unavailable",
      detail: "Requires VANTA_TRANSCRIPTION_PROVIDER=openai, OPENAI_API_KEY, and Supabase Storage — falling back to local whisper / worker / manual paste.",
    }, { status: 409 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) ?? {};
    const fileName = typeof body.file_name === "string" ? body.file_name : asset.file_name;
    const mime = typeof body.mime_type === "string" ? body.mime_type.slice(0, 100) : null;
    const sizeBytes = typeof body.size_bytes === "number" && Number.isFinite(body.size_bytes) ? Math.round(body.size_bytes) : null;
    const durationMs = typeof body.duration_ms === "number" && Number.isFinite(body.duration_ms) ? Math.round(body.duration_ms) : null;

    const type = isAllowedUploadType(fileName, mime);
    if (!type.ok) {
      return NextResponse.json({ error: `Unsupported file type — accepted: ${ALLOWED_VIDEO_EXTENSIONS.join(", ")}` }, { status: 415 });
    }
    if (!sizeBytes || sizeBytes <= 0) return NextResponse.json({ error: "size_bytes is required" }, { status: 400 });
    if (sizeBytes > MAX_CLOUD_VIDEO_BYTES) {
      return NextResponse.json({ error: `File is ${Math.round(sizeBytes / 1024 / 1024)}MB — over the ${Math.round(MAX_CLOUD_VIDEO_BYTES / 1024 / 1024)}MB cloud cap (use the worker path)`, cap: "bytes" }, { status: 413 });
    }
    if (durationMs && durationMs > MAX_CLOUD_AUDIO_DURATION_MS) {
      return NextResponse.json({ error: `Footage is ${Math.round(durationMs / 60_000)} min — over the ${Math.round(MAX_CLOUD_AUDIO_DURATION_MS / 60_000)}-minute cloud cap (use the worker path)`, cap: "duration" }, { status: 413 });
    }

    const target = await createVideoUploadTarget(asset.project_id, asset.id, type.ext);
    if (!target) return NextResponse.json({ error: "Storage bucket unavailable — falling back to worker/manual transcription" }, { status: 409 });
    return NextResponse.json({
      upload: target, // short-lived signed PUT credential for this client only
      content_type: mime ?? "video/mp4",
      caps: { max_bytes: MAX_CLOUD_VIDEO_BYTES, max_duration_ms: MAX_CLOUD_AUDIO_DURATION_MS },
    });
  } catch (e) {
    console.error("[POST /api/vanta/assets/[id]/video-upload]", (e as Error).message);
    return NextResponse.json({ error: "Could not create upload target" }, { status: 500 });
  }
}
