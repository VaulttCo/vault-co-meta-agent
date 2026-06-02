// Victoria — Redis client (Upstash)
// Server-side only. Falls back to an in-memory Map when Redis isn't configured.
// This means the full pipeline works locally without Redis credentials.

import { Redis } from "@upstash/redis";

// ─────────────────────────────────────────────────────────────
// Upstash Redis client
// Requires UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// ─────────────────────────────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) return null;

  _redis = new Redis({ url, token });
  return _redis;
}

export function isRedisAvailable(): boolean {
  return getRedis() !== null;
}

// ─────────────────────────────────────────────────────────────
// In-memory fallback (process-local, non-persistent)
// Used when Upstash env vars are absent — dev/test only.
// ─────────────────────────────────────────────────────────────

const _memoryStore = new Map<string, { value: string; expires_at: number }>();

function memGet(key: string): string | null {
  const entry = _memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires_at) {
    _memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function memSet(key: string, value: string, ttlSeconds: number): void {
  _memoryStore.set(key, {
    value,
    expires_at: Date.now() + ttlSeconds * 1000,
  });
}

// Atomic set-if-absent for the in-memory fallback. Honors TTL expiry so a stale
// entry doesn't block acquisition. Returns true only if the key was set.
function memSetNX(key: string, value: string, ttlSeconds: number): boolean {
  const existing = _memoryStore.get(key);
  if (existing && Date.now() <= existing.expires_at) return false;
  _memoryStore.set(key, { value, expires_at: Date.now() + ttlSeconds * 1000 });
  return true;
}

function memDel(key: string): void {
  _memoryStore.delete(key);
}

// ─────────────────────────────────────────────────────────────
// Unified Victoria KV store — Redis when configured, memory fallback
// All callers go through these functions — never import Upstash directly.
// ─────────────────────────────────────────────────────────────

const DEFAULT_TTL_SECONDS = 60 * 60 * 6; // 6 hours — longer than any real call

export async function kvGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<string>(key);
    if (!raw) return null;
    try {
      return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }
  // In-memory fallback
  const raw = memGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export async function kvSet(
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<void> {
  const serialized = JSON.stringify(value);
  const redis = getRedis();
  if (redis) {
    await redis.set(key, serialized, { ex: ttlSeconds });
    return;
  }
  memSet(key, serialized, ttlSeconds);
}

/**
 * Atomic "set if not exists" with TTL. Returns true only when this caller won the
 * key (i.e. it did not already exist). Use for distributed locks — the get + set
 * happen atomically inside Redis (SET ... NX EX), eliminating the check-then-set
 * race. Falls back to a process-local atomic operation when Redis is absent.
 */
export async function kvSetNX(
  key: string,
  value: string,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const res = await redis.set(key, value, { nx: true, ex: ttlSeconds });
    return res === "OK";
  }
  return memSetNX(key, value, ttlSeconds);
}

export async function kvDel(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(key);
    return;
  }
  memDel(key);
}

// ─────────────────────────────────────────────────────────────
// Victoria session key conventions
// ─────────────────────────────────────────────────────────────

export const VICTORIA_KEYS = {
  session: (callId: string) => `victoria:session:${callId}`,
  coaching: (callId: string) => `victoria:coaching:${callId}:latest`,
} as const;
