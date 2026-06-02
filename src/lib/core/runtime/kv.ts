// Vault Core — runtime KV helpers (locks + last-run state).
//
// Reuses the platform's Upstash wrapper (src/lib/victoria/redis.ts), which
// already falls back to a process-local in-memory Map when Upstash env vars are
// absent. So locking/state work in dev with zero infrastructure, and become
// durable in production once UPSTASH_REDIS_REST_URL / _TOKEN are set.

import { kvGet, kvSet, kvDel, kvSetNX } from "@/lib/victoria/redis";
import type { AgentTier } from "../types";

const NS = "vaultcore";

const lockKey = (tier: AgentTier) => `${NS}:lock:tick:${tier}`;
const lastRunKey = (tier: AgentTier) => `${NS}:lastrun:${tier}`;

/**
 * Distributed tier lock to prevent overlapping cycles. Acquisition is ATOMIC —
 * it uses SET ... NX EX (via kvSetNX) so two concurrent ticks can never both win
 * the lock (no check-then-set race). The TTL auto-expires so a crashed run never
 * wedges the tier.
 *
 * Returns an opaque owner token on success, or null if the lock is already held.
 * Pass the token back to releaseTickLock so a slow/overrun run can only release
 * the lock it actually owns (and never one a later run has since acquired).
 */
export async function acquireTickLock(
  tier: AgentTier,
  ttlSeconds = 280
): Promise<string | null> {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const won = await kvSetNX(lockKey(tier), token, ttlSeconds);
  return won ? token : null;
}

/**
 * Releases the lock only if the stored token still matches this owner's token.
 * If another run has since acquired the lock (e.g. after a TTL expiry), this is a
 * no-op so we never delete someone else's lock.
 */
export async function releaseTickLock(tier: AgentTier, token: string): Promise<void> {
  const key = lockKey(tier);
  const current = await kvGet<string>(key);
  if (current === token) {
    await kvDel(key);
  }
}

export async function setLastRun(tier: AgentTier): Promise<void> {
  // Keep for a generous window so the UI can show "last ran" without a DB.
  await kvSet(lastRunKey(tier), { at: Date.now() }, 60 * 60 * 24 * 7);
}

export async function getLastRun(tier: AgentTier): Promise<number | null> {
  const v = await kvGet<{ at: number }>(lastRunKey(tier));
  return v?.at ?? null;
}
