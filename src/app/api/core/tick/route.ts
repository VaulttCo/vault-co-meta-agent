// Vault Core — runtime tick (Continuous Operations).
//
// This is the heartbeat that makes the workforce run 24/7. It is invoked two ways:
//   • CRON (production): Vercel Cron calls GET with `Authorization: Bearer <CRON_SECRET>`.
//   • MANUAL (dev/ops):  an admin clicks "Run cycle" in the UI → POST, role-guarded.
//
// SECURITY:
//   • Cron auth uses a constant-time comparison against CRON_SECRET. If CRON_SECRET
//     is not configured, cron-style requests are REJECTED (fail closed) — only an
//     authenticated admin can trigger ticks.
//   • Manual triggers require an authenticated admin (resolveServerRole).
//
// SAFETY: a tick only runs analysis + writes to Vault Memory. It never sends,
// publishes, launches, edits, or deletes anything on external/client systems.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { resolveServerRole } from "@/lib/auth/server-role";
import { runTier } from "@/lib/core/runtime/dispatcher";
import { acquireTickLock, releaseTickLock } from "@/lib/core/runtime/kv";
import type { AgentTier } from "@/lib/core/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TIERS: AgentTier[] = ["5min", "15min", "hourly", "daily", "weekly", "monthly"];

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false; // fail closed — no secret means no cron access
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return constantTimeEqual(header, expected);
}

function parseTier(req: NextRequest): AgentTier | null {
  const raw = req.nextUrl.searchParams.get("tier");
  return VALID_TIERS.includes(raw as AgentTier) ? (raw as AgentTier) : null;
}

async function handleTick(
  tier: AgentTier,
  trigger: "cron" | "manual"
): Promise<NextResponse> {
  const lockToken = await acquireTickLock(tier);
  if (!lockToken) {
    return NextResponse.json(
      { ok: false, tier, skipped: true, reason: "Another run for this tier is in progress" },
      { status: 200 }
    );
  }
  try {
    const summary = await runTier(tier, trigger);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error("[VaultCore:tick]", (e as Error).message);
    return NextResponse.json({ ok: false, error: "Tick failed" }, { status: 500 });
  } finally {
    await releaseTickLock(tier, lockToken);
  }
}

// ── GET: cron entrypoint (Vercel Cron) ─────────────────────────
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tier = parseTier(req);
  if (!tier) {
    return NextResponse.json(
      { error: `Invalid or missing tier. One of: ${VALID_TIERS.join(", ")}` },
      { status: 400 }
    );
  }
  return handleTick(tier, "cron");
}

// ── POST: manual admin trigger (from the Vault Memory UI) ──────
export async function POST(req: NextRequest) {
  const auth = await resolveServerRole();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admin role required to trigger the workforce" },
      { status: 403 }
    );
  }
  const tier = parseTier(req) ?? "hourly";
  return handleTick(tier, "manual");
}
