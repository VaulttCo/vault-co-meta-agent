// Vault Core — runtime KV helpers (locks + last-run state).
//
// Reuses the platform's Upstash wrapper (src/lib/victoria/redis.ts), which
// already falls back to a process-local in-memory Map when Upstash env vars are
// absent. So locking/state work in dev with zero infrastructure, and become
// durable in production once UPSTASH_REDIS_REST_URL / _TOKEN are set.

import { kvGet, kvSet, kvDel } from "@/lib/victoria/redis";
import type { AgentTier } from "../types";

const NS = "vaultcore";

const lockKey = (tier: AgentTier) => `${NS}:lock:tick:${tier}`;
const lastRunKey = (tier: AgentTier) => `${NS}:lastrun:${tier}`;

/**
 * Best-effort tier lock to prevent overlapping cycles. Not a distributed mutex
 * (there's a small check-then-set window) — sufficient for cron tiers that fire
 * minutes apart. TTL auto-expires so a crashed run never wedges the tier.
 */
export async function acquireTickLock(tier: AgentTier, ttlSeconds = 280): Promise<boolean> {
  const key = lockKey(tier);
  const existing = await kvGet<{ at: number }>(key);
  if (existing) return false;
  await kvSet(key, { at: Date.now() }, ttlSeconds);
  return true;
}

export async function releaseTickLock(tier: AgentTier): Promise<void> {
  await kvDel(lockKey(tier));
}

export async function setLastRun(tier: AgentTier): Promise<void> {
  // Keep for a generous window so the UI can show "last ran" without a DB.
  await kvSet(lastRunKey(tier), { at: Date.now() }, 60 * 60 * 24 * 7);
}

export async function getLastRun(tier: AgentTier): Promise<number | null> {
  const v = await kvGet<{ at: number }>(lastRunKey(tier));
  return v?.at ?? null;
}
