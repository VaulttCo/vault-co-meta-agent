// Vault Core — runtime KV helpers (locks + last-run state).
//
// Reuses the platform's Upstash wrapper (src/lib/victoria/redis.ts), which
// already falls back to a process-local in-memory Map when Upstash env vars are
// absent. So locking/state work in dev with zero infrastructure, and become
// durable in production once UPSTASH_REDIS_REST_URL / _TOKEN are set.

import { kvGet, kvSet, kvSetNX, kvDelIfMatch } from "@/lib/victoria/redis";
import type { AgentTier } from "../types";

const NS = "vaultcore";

const lockKey = (tier: AgentTier) => `${NS}:lock:tick:${tier}`;
const lastRunKey = (tier: AgentTier) => `${NS}:lastrun:${tier}`;

/**
 * Tier-aware lock TTL (seconds). The TTL must be:
 *   • long enough to cover a real run of that tier (so a slow run doesn't lose its
 *     lock mid-cycle and let a concurrent fire double-run), and
 *   • comfortably shorter than that tier's cron interval (so a CRASHED run's lock
 *     auto-expires before the next same-tier fire and never wedges the tier).
 * Frequent tiers get short TTLs (small cron gap); daily/weekly/monthly get longer
 * TTLs since their runs can take longer and their intervals are huge.
 */
const TIER_LOCK_TTL_SECONDS: Record<AgentTier, number> = {
  "5min": 240,    // < 300s gap
  "15min": 600,   // < 900s gap
  hourly: 1800,   // 30m — well under the 3600s gap, covers long hourly runs
  daily: 3000,    // 50m — tiny vs 24h gap
  weekly: 3000,   // 50m — tiny vs 7d gap
  monthly: 3000,  // 50m — tiny vs ~30d gap
};

/**
 * Distributed tier lock to prevent overlapping cycles. Acquisition is ATOMIC —
 * it uses SET ... NX EX (via kvSetNX) so two concurrent ticks can never both win
 * the lock (no check-then-set race). The TTL auto-expires so a crashed run never
 * wedges the tier, and is tier-aware (see TIER_LOCK_TTL_SECONDS).
 *
 * Returns an opaque owner token on success, or null if the lock is already held.
 * Pass the token back to releaseTickLock so a slow/overrun run can only release
 * the lock it actually owns (and never one a later run has since acquired).
 */
export async function acquireTickLock(
  tier: AgentTier,
  ttlSeconds?: number
): Promise<string | null> {
  const ttl = ttlSeconds ?? TIER_LOCK_TTL_SECONDS[tier] ?? 280;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const won = await kvSetNX(lockKey(tier), token, ttl);
  return won ? token : null;
}

/**
 * Releases the lock only if the stored token still matches this owner's token,
 * using an ATOMIC compare-and-delete. If another run has since acquired the lock
 * (e.g. after a TTL expiry), this is a no-op — we never delete someone else's lock,
 * and there is no get-then-del race window.
 */
export async function releaseTickLock(tier: AgentTier, token: string): Promise<void> {
  await kvDelIfMatch(lockKey(tier), token);
}

export async function setLastRun(tier: AgentTier): Promise<void> {
  // Keep for a generous window so the UI can show "last ran" without a DB.
  await kvSet(lastRunKey(tier), { at: Date.now() }, 60 * 60 * 24 * 7);
}

export async function getLastRun(tier: AgentTier): Promise<number | null> {
  const v = await kvGet<{ at: number }>(lastRunKey(tier));
  return v?.at ?? null;
}
