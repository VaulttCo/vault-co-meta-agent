# Vault Core — Security Checklist

Audited 2026-06-01 (Phase 6.6). Status: **PASS** — safe to deploy once the GHL key is rotated.

## Secrets in the repo
- ✅ **No `.env` files committed** — only `.env.example` (placeholders, no values) is tracked.
- ✅ `.gitignore` contains `.env*` with `!.env.example`.
- ✅ **No hardcoded secrets** — repo scan for JWT (`eyJ…`), `sk-…`, `pit-…`, and literal `Bearer <token>` strings found none in `src/`.
- ✅ **No `NEXT_PUBLIC_` secret misuse** — only `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public (by design). No key/secret/token is `NEXT_PUBLIC_`.

## ⚠️ Compromised GHL key — REQUIRED action before production
A GoHighLevel / LeadConnector API key was previously exposed in chat. **Treat it as compromised.**
1. **Revoke** the exposed key in the GHL dashboard.
2. **Create a new key.**
3. Set the new value only in Vercel env (`GHL_API_KEY`, `GHL_LOCATION_ID`) — never commit/log/return it.
4. Until rotated, leave GHL env unset → Veronica runs on **mock conversation data** (safe).

## Server-only enforcement
All secrets are read server-side only (no `"use client"` file reads a secret value):
- ✅ `GHL_API_KEY` / `GHL_LOCATION_ID` — only `src/lib/core/integrations/ghl/client.ts` (+ pre-existing server routes). Client-file references are **instructional label text** (e.g. settings UI showing "set `GHL_API_KEY` in Vercel"), not value reads; non-`NEXT_PUBLIC` vars are `undefined` in the browser regardless.
- ✅ `SUPABASE_SERVICE_ROLE_KEY` — only `src/lib/supabase/server.ts` + `api/debug/env`.
- ✅ `ANTHROPIC_API_KEY` — only server AI wrappers/routes.
- ✅ `CRON_SECRET` — only `src/app/api/core/tick/route.ts`.
- ✅ `UPSTASH_REDIS_REST_TOKEN` — only `src/lib/victoria/redis.ts`.

## No secret leakage
- ✅ **No route returns a secret value.** `/api/debug/env` is **admin-only** and returns booleans only (`hasAnthropicKey: !!…`), never values.
- ✅ **No secret logging.** The GHL client logs generic messages only (`GET <path> → HTTP <status>`); the API key never appears in a log line, error message, or response.
- ✅ Credentials are never placed in mock data.

## Runtime safety (read / analyze / recommend / draft only)
- ✅ GHL integration is **GET-only** (`method: "GET" // READ-ONLY`). No send/reply/update/create/delete, no workflow triggers.
- ✅ **No external mutations anywhere in `src/lib/core` or `/api/core`** (scan for outbound POST/PUT/PATCH/DELETE found none).
- ✅ No SMS sending · no GHL/CRM mutation · no Stripe mutation · no invoice sending · no payment movement.
- ✅ **Approvals never execute.** Approving a recommendation, proposal, or draft updates internal status + appends an audit record only. Drafts are never sent. Proposals are never auto-built. Recommendations never auto-execute.

## Access control
- ✅ All 15 `/api/core/*` routes call `resolveServerRole()` (401 unauthenticated, fail-closed) + a permission check (`can(role, …)` or `role === "admin"` / `isCronAuthorized`).
- ✅ Cron tick: constant-time `CRON_SECRET` compare; missing/incorrect secret → 401.
- ✅ Pages are auth-gated by middleware (unauthenticated → `/login`).

## Verdict
**Ship-safe.** The only blocking production action is **rotating the exposed GHL key**; everything else passes. Until rotation, leave GHL env unset and Veronica runs on mock data.
