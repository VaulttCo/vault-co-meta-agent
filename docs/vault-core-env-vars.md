# Vault Core — Environment Variables

Final Vercel environment-variable checklist for deploying the Vault Co Veronica Portal + Vault Core.

**Set these in:** Vercel → Project → Settings → Environment Variables (Production + Preview).
For local dev, use `.env.local` (gitignored; never commit). `.env.example` documents the keys.

## Visibility rules
- `NEXT_PUBLIC_*` → shipped to the browser. Only the Supabase **URL** and **anon key** are public by design.
- Everything else is **server-only**. Next.js never inlines a non-`NEXT_PUBLIC_` var into the client bundle. Vault Core reads all secrets server-side only and never logs, returns, or exposes them.

## Required

| Variable | Visibility | Purpose | Without it |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL (auth + DB) | App treats requests as unauthenticated → login gate; mock fallback for data |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key (cookie session) | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | Privileged DB reads/writes (bypasses RLS) for Vault Memory | Vault Core reads/writes no-op → **mock fallback** everywhere |
| `ANTHROPIC_API_KEY` | **server-only** | Lets agents sharpen phrasing (Vega/Victoria) | Agents use deterministic analysis (fully functional) |
| `CRON_SECRET` | **server-only** | Authenticates Vercel Cron → `/api/core/tick` (constant-time) | Cron tick **rejected (fail-closed)**; only admin manual trigger works |
| `UPSTASH_REDIS_REST_URL` | **server-only** | Tick locks + last-run state | Falls back to in-memory map (per-instance; fine for dev, weak for prod locking) |
| `UPSTASH_REDIS_REST_TOKEN` | **server-only** | Upstash auth | Same as above |

## Optional — Phase 6 live conversation data (GoHighLevel / LeadConnector)

| Variable | Visibility | Purpose | Without it |
|---|---|---|---|
| `GHL_API_KEY` | **server-only** | Veronica reads lead conversations (READ-ONLY) | Veronica uses **mock conversation data** (fail-safe) |
| `GHL_LOCATION_ID` | **server-only** | Scopes GHL reads to the location | Same — mock fallback |

> ⚠️ **The previously-exposed GHL key is COMPROMISED. Do NOT use it in production.** Revoke it in GHL, create a new key, and set the new value only in Vercel env. See `docs/vault-core-security-checklist.md`.

## Other keys (pre-existing portal features, not required for Vault Core)
`AI_PROVIDER`, `OPENAI_API_KEY`, `META_ACCESS_TOKEN`, `META_APP_SECRET`, `STRIPE_SECRET_KEY`, `ASSEMBLYAI_API_KEY` — all server-only, all optional, all documented in `.env.example`. Vault Core does not require any of them.

## Grouped by capability
- **Mock fallback (zero config):** none required — the app + Vault Core run fully on seeded mock data with no env vars.
- **Live Vault Memory persistence:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **24/7 cron runtime:** `CRON_SECRET` (+ Upstash pair for durable locks).
- **Live GHL read-only data:** `GHL_API_KEY`, `GHL_LOCATION_ID` (rotated key only).
- **LLM-enhanced phrasing:** `ANTHROPIC_API_KEY`.
