// VANTA — worker-only bearer auth (server-side, V1.4).
//
// The external Vanta Worker (Hermes pattern) authenticates to the queue routes with
// `Authorization: Bearer ${VANTA_WORKER_SECRET}`. FAIL CLOSED: when the env var is unset
// the worker contract is disabled and every worker route returns 503 — there is no
// default secret and no fallback to session auth. Comparison is constant-time over a
// SHA-256 digest so length differences leak nothing. Never log or echo the secret.

import { createHash, timingSafeEqual, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

const MIN_SECRET_LENGTH = 16;

/** Worker request bodies are small JSON; transcripts max out well under this. */
export const MAX_WORKER_BODY_BYTES = 2 * 1024 * 1024;

export function workerBodyTooLarge(req: NextRequest): boolean {
  const len = Number(req.headers.get("content-length") ?? "0");
  return Number.isFinite(len) && len > MAX_WORKER_BODY_BYTES;
}

// ── Claim identity (per-claim token) ─────────────────────────────────────────
// The bearer secret is shared across worker instances, so ownership of a specific run
// is bound to a server-issued random claim token instead: claimed_by is stored as
// `worker:{name}#{token}` and heartbeat/complete/fail must present both. One worker
// (or a leaked secret) can therefore never finalize another worker's active run.

export function newClaimIdentity(name: string): { claimedBy: string; claimToken: string } {
  const claimToken = randomBytes(12).toString("hex");
  return { claimedBy: `worker:${name.trim().slice(0, 60)}#${claimToken}`, claimToken };
}

/** Rebuild the stored identity from a request body. Null when malformed. */
export function claimIdentityFrom(name: unknown, token: unknown): string | null {
  if (typeof name !== "string" || !name.trim()) return null;
  if (typeof token !== "string" || !/^[a-f0-9]{24}$/.test(token)) return null;
  return `worker:${name.trim().slice(0, 60)}#${token}`;
}

/** Strip the claim token before claimed_by leaves the server (UI/API responses). */
export function redactClaimedBy(claimedBy: string | null): string | null {
  if (!claimedBy) return claimedBy;
  const i = claimedBy.indexOf("#");
  return i >= 0 ? claimedBy.slice(0, i) : claimedBy;
}

export type WorkerAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

export function requireWorkerAuth(req: NextRequest): WorkerAuthResult {
  const secret = process.env.VANTA_WORKER_SECRET?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    return { ok: false, status: 503, error: "Worker contract disabled (VANTA_WORKER_SECRET not configured)" };
  }
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return { ok: false, status: 401, error: "Unauthorized" };
  const presented = createHash("sha256").update(match[1].trim()).digest();
  const expected = createHash("sha256").update(secret).digest();
  if (!timingSafeEqual(presented, expected)) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true };
}
