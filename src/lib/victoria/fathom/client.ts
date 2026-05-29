// Victoria — Fathom REST API Client
// Server-side only. Wraps Fathom's REST API with typed responses and graceful fallbacks.
// Requires FATHOM_API_KEY in environment. Falls back to mock data when not configured.

import type {
  FathomRawCallMetadata,
  FathomRawTranscriptResponse,
  FathomRawSummaryResponse,
  FathomSpeaker,
  FathomSegment,
  SpeakerRole,
} from "./types";

const FATHOM_BASE = "https://api.fathom.video/v1";
const FATHOM_TIMEOUT_MS = 20_000;

// ─────────────────────────────────────────────────────────────
// Key resolution
// ─────────────────────────────────────────────────────────────

function resolveKey(): string | null {
  const key = process.env.FATHOM_API_KEY?.trim();
  return key || null;
}

export function isFathomAvailable(): boolean {
  return resolveKey() !== null;
}

// ─────────────────────────────────────────────────────────────
// Shared fetch helper
// ─────────────────────────────────────────────────────────────

async function fathomFetch<T>(path: string): Promise<T> {
  const apiKey = resolveKey();
  if (!apiKey) throw new Error("FATHOM_API_KEY is not configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FATHOM_TIMEOUT_MS);

  try {
    const res = await fetch(`${FATHOM_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(`Fathom API ${res.status}: ${body.slice(0, 200)}`);
    }

    return await res.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────
// Recording resolution
// Fathom uses "recording_id" as the canonical identifier.
// Share URLs and call IDs must be resolved to recording_id first.
// ─────────────────────────────────────────────────────────────

/**
 * Extracts a recording_id from a Fathom share URL or direct URL.
 * Fathom share URLs follow these patterns:
 *   https://fathom.video/calls/{recording_id}
 *   https://fathom.video/share/{token}
 *   https://fathom.video/share/h/{token}
 *
 * For share tokens, we need to resolve via the API.
 * For /calls/{id} URLs, we can extract directly.
 */
export function extractRecordingIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Direct calls URL: /calls/{recording_id}
    const callsMatch = u.pathname.match(/^\/calls\/([a-zA-Z0-9_-]+)/);
    if (callsMatch) return callsMatch[1];
    // Share URL — can't extract ID directly, need API resolution
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves a Fathom share URL to a recording_id via API.
 */
export async function resolveShareUrl(shareUrl: string): Promise<string> {
  const data = await fathomFetch<{ id: string }>(`/recordings/resolve?url=${encodeURIComponent(shareUrl)}`);
  return data.id;
}

/**
 * Resolves a Fathom call_id (their internal meeting ID) to a recording_id.
 */
export async function resolveCallId(callId: string): Promise<string> {
  const data = await fathomFetch<{ recording_id: string }>(`/calls/${callId}`);
  return data.recording_id;
}

// ─────────────────────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────────────────────

export async function getCallMetadata(recordingId: string): Promise<FathomRawCallMetadata> {
  return fathomFetch<FathomRawCallMetadata>(`/recordings/${recordingId}`);
}

export async function getTranscript(recordingId: string): Promise<FathomRawTranscriptResponse> {
  return fathomFetch<FathomRawTranscriptResponse>(`/recordings/${recordingId}/transcript`);
}

export async function getSummary(recordingId: string): Promise<FathomRawSummaryResponse> {
  return fathomFetch<FathomRawSummaryResponse>(`/recordings/${recordingId}/summary`);
}

// ─────────────────────────────────────────────────────────────
// Speaker role resolution
// Maps Fathom speaker names to rep | prospect | unknown
// Uses rep profile's fathom_speaker_names[] for matching.
// ─────────────────────────────────────────────────────────────

export function resolveSpealerRoles(
  rawSpeakers: { id: string; name: string }[],
  repFathomNames: string[]  // From RepProfile.fathom_speaker_names
): FathomSpeaker[] {
  const normalizedRepNames = repFathomNames.map((n) => n.trim().toLowerCase());

  return rawSpeakers.map((s) => {
    const nameLower = s.name.trim().toLowerCase();
    const isRep = normalizedRepNames.some(
      (repName) => nameLower === repName || nameLower.includes(repName) || repName.includes(nameLower)
    );

    return {
      id: s.id,
      name: s.name,
      role: (isRep ? "rep" : "prospect") as SpeakerRole,
      is_known_rep: isRep,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Normalize raw utterances → typed segments
// ─────────────────────────────────────────────────────────────

export function normalizeSegments(
  utterances: FathomRawTranscriptResponse["utterances"],
  resolvedSpeakers: FathomSpeaker[]
): FathomSegment[] {
  const speakerMap = new Map(resolvedSpeakers.map((s) => [s.id, s]));

  return utterances.map((u) => {
    const speaker = speakerMap.get(u.speaker_id);
    return {
      speaker_id: u.speaker_id,
      speaker_name: speaker?.name ?? u.speaker_id,
      speaker_role: speaker?.role ?? "unknown",
      start_seconds: u.start,
      end_seconds: u.end,
      duration_seconds: Math.max(0, u.end - u.start),
      text: u.words,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Full ingestion orchestrator
// Given a recording_id, fetches all Fathom data in parallel.
// ─────────────────────────────────────────────────────────────

export interface FathomFetchResult {
  metadata: FathomRawCallMetadata;
  speakers: FathomSpeaker[];
  segments: FathomSegment[];
  summary: string;
  action_items: string[];
}

export async function fetchFathomRecording(
  recordingId: string,
  repFathomNames: string[] = []
): Promise<FathomFetchResult> {
  const [metadata, transcript, summary] = await Promise.all([
    getCallMetadata(recordingId),
    getTranscript(recordingId),
    getSummary(recordingId),
  ]);

  const resolvedSpeakers = resolveSpealerRoles(transcript.speakers ?? [], repFathomNames);
  const segments = normalizeSegments(transcript.utterances ?? [], resolvedSpeakers);

  const actionItems = [
    ...(summary.action_items ?? []),
    ...(summary.key_takeaways ?? []),
  ];

  return {
    metadata,
    speakers: resolvedSpeakers,
    segments,
    summary: summary.summary ?? "",
    action_items: actionItems,
  };
}

// ─────────────────────────────────────────────────────────────
// Mock data — returned when FATHOM_API_KEY is not configured
// ─────────────────────────────────────────────────────────────

export function buildMockFathomResult(
  prospectName: string,
  repName: string
): FathomFetchResult {
  const repSpeaker: FathomSpeaker = {
    id: "SPEAKER_0",
    name: repName,
    role: "rep",
    is_known_rep: true,
  };
  const prospectSpeaker: FathomSpeaker = {
    id: "SPEAKER_1",
    name: prospectName,
    role: "prospect",
    is_known_rep: false,
  };

  const segments: FathomSegment[] = [
    { speaker_id: "SPEAKER_0", speaker_name: repName,       speaker_role: "rep",      start_seconds: 0,    end_seconds: 8,    duration_seconds: 8,    text: "Hey, thanks for jumping on. Just to confirm — you mentioned you were running HomeAdvisor, right?" },
    { speaker_id: "SPEAKER_1", speaker_name: prospectName,  speaker_role: "prospect", start_seconds: 9,    end_seconds: 22,   duration_seconds: 13,   text: "Yeah, HomeAdvisor and some Google Ads. But honestly not getting great leads from either. Cost is too high for what we get back." },
    { speaker_id: "SPEAKER_0", speaker_name: repName,       speaker_role: "rep",      start_seconds: 23,   end_seconds: 30,   duration_seconds: 7,    text: "When you say the cost is too high — are we talking the cost per lead, or the cost per job you actually close?" },
    { speaker_id: "SPEAKER_1", speaker_name: prospectName,  speaker_role: "prospect", start_seconds: 31,   end_seconds: 55,   duration_seconds: 24,   text: "Both honestly. I'm paying like 80 bucks per lead and maybe closing 1 in 8. So each job is costing me $640 in marketing before I even get to materials. That's rough when my margin is already tight." },
    { speaker_id: "SPEAKER_0", speaker_name: repName,       speaker_role: "rep",      start_seconds: 56,   end_seconds: 64,   duration_seconds: 8,    text: "So you're spending $640 to close a job — what's your average ticket on a roofing job?" },
    { speaker_id: "SPEAKER_1", speaker_name: prospectName,  speaker_role: "prospect", start_seconds: 65,   end_seconds: 80,   duration_seconds: 15,   text: "Average is about $14,000. But when I factor in all the bad leads chasing me around — it's a headache. I need better leads, not more leads." },
    { speaker_id: "SPEAKER_0", speaker_name: repName,       speaker_role: "rep",      start_seconds: 81,   end_seconds: 115,  duration_seconds: 34,   text: "I love that — better, not more. That's exactly what we do with our 60-day system. We run Meta ads targeting homeowners who are already searching for roofing. Your cost per qualified lead comes down dramatically because we're not buying from aggregators — we own the lead from start to finish." },
    { speaker_id: "SPEAKER_1", speaker_name: prospectName,  speaker_role: "prospect", start_seconds: 116,  end_seconds: 135,  duration_seconds: 19,   text: "That sounds interesting. I've heard of people doing Facebook ads but I'm a little skeptical. My buddy tried it and got a bunch of junk leads." },
    { speaker_id: "SPEAKER_0", speaker_name: repName,       speaker_role: "rep",      start_seconds: 136,  end_seconds: 150,  duration_seconds: 14,   text: "Totally valid. Most roofing Facebook campaigns fail for the same reason — wrong targeting. What was his setup, do you know?" },
    { speaker_id: "SPEAKER_1", speaker_name: prospectName,  speaker_role: "prospect", start_seconds: 151,  end_seconds: 165,  duration_seconds: 14,   text: "No idea, I just know it didn't work for him. What makes yours different?" },
  ];

  return {
    metadata: {
      id: "mock_recording_001",
      title: `${repName} & ${prospectName} — Discovery Call`,
      duration: 165,
      url: null as unknown as string,
      share_url: null as unknown as string,
      created_at: new Date().toISOString(),
    },
    speakers: [repSpeaker, prospectSpeaker],
    segments,
    summary: `Discovery call between ${repName} and ${prospectName}. Prospect is currently using HomeAdvisor and Google Ads with high cost per acquisition ($640/job). They expressed interest in improving lead quality over quantity. Skepticism raised around Facebook/Meta ads based on a peer's negative experience. Strong pain points established around marketing costs and margin pressure.`,
    action_items: [
      `Send ${prospectName} a case study for a roofing client with similar ad spend`,
      "Schedule a follow-up to walk through the 60-day system ROI calculator",
      "Address the Facebook ads skepticism with specific targeting explanation",
    ],
  };
}
