// GET /api/victoria/transcription/token
// Returns a temporary AssemblyAI token for real-time transcription.
// The browser uses this token to open a WebSocket directly to AssemblyAI.
// Server-side only — the API key never leaves the server.

import { NextRequest, NextResponse } from "next/server";
import { resolveServerRole } from "@/lib/auth/server-role";
import { can } from "@/lib/auth/permissions";

export async function GET(_req: NextRequest) {
  // ── Auth: never issue a third-party transcription token to an unauthenticated
  // or unauthorized caller. AI-builder access is required (same gate as the rest
  // of the Victoria live-call feature). ───────────────────────────────────────
  const auth = await resolveServerRole();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(auth.role, "canViewAiBuilder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // IMPORTANT: Use ASSEMBLYAI_API_KEY (no NEXT_PUBLIC_ prefix).
  // This is a server-side route — the key must never reach the browser.
  // Only the short-lived token is returned to the client.
  const apiKey = process.env.ASSEMBLYAI_API_KEY?.trim();

  // If no AssemblyAI key, indicate fallback to Web Speech API
  if (!apiKey) {
    return NextResponse.json({
      available: false,
      provider: "web_speech_api",
      message: "AssemblyAI not configured — browser will use Web Speech API (Chrome required)",
    });
  }

  try {
    // Request a short-lived temporary token from AssemblyAI. Keep the TTL as
    // small as practical — it only needs to live long enough for the browser to
    // open its realtime WebSocket. 10 minutes is ample and limits exposure if the
    // token leaks.
    const response = await fetch("https://api.assemblyai.com/v2/realtime/token", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expires_in: 600 }), // 10 minutes
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[Victoria:Transcription] AssemblyAI token request failed:", response.status, body);
      return NextResponse.json({
        available: false,
        provider: "web_speech_api",
        message: "AssemblyAI token fetch failed — falling back to Web Speech API",
      });
    }

    const data = await response.json() as { token: string };

    return NextResponse.json({
      available: true,
      provider: "assemblyai",
      token: data.token,
    });
  } catch (err) {
    console.error("[Victoria:Transcription] Token fetch error:", err);
    return NextResponse.json({
      available: false,
      provider: "web_speech_api",
      message: "AssemblyAI unavailable — falling back to Web Speech API",
    });
  }
}
