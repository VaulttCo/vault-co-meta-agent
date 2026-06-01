# Vault Core — Vercel Production Deployment

Step-by-step deploy for the Vault Co Veronica Portal + Vault Core. Next.js 16, Vercel.

Companion docs: `vault-core-env-vars.md` · `vault-core-supabase-sql-order.md` ·
`vault-core-security-checklist.md` · `vault-core-route-verification.md` · `vault-core-production-readiness.md`.

---

## Step 1 — Push to GitHub
Commit and push the latest repo to your GitHub remote on the deploy branch (e.g. `main`).
Confirm no secrets are committed (see security checklist) — only `.env.example` should be tracked.

## Step 2 — Connect to Vercel
Vercel → **Add New Project** → import the GitHub repo. Framework preset: **Next.js** (auto-detected).
Build command `next build`, output handled automatically. Package manager: **pnpm** (lockfile present).

## Step 3 — Add environment variables
In Vercel → Project → Settings → Environment Variables, add the values from
`docs/vault-core-env-vars.md` (Production + Preview):
- **Required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- **Optional (Phase 6 live data):** `GHL_API_KEY`, `GHL_LOCATION_ID` — **only a freshly-rotated key** (see Step 9).
- Generate `CRON_SECRET` as a long random string (e.g. `openssl rand -hex 32`).

> The app deploys and runs on **mock fallback** even with zero env vars — but set the required ones for live persistence + cron.

## Step 4 — Run Supabase SQL (in order)
In the Supabase SQL Editor, run the files in the exact order in
`docs/vault-core-supabase-sql-order.md` (Phase 1 → 2 → 3 → 5 → 6; Phase 4 needs none).
Skipping a file just keeps that surface on mock data — nothing breaks.

## Step 5 — Deploy
Trigger the first deployment (push to `main` or **Deploy** in Vercel). Confirm the build succeeds
(local `pnpm build` is clean: 73 static pages).

## Step 6 — Verify live routes
Log in, then open each and confirm it renders (see `vault-core-route-verification.md`):
`/` (Command Hub), `/vault-memory`, `/workforce`, `/recommendations`, `/drafts`, `/proposals`.

## Step 7 — Manually trigger the runtime
```
curl -i "https://<your-app>.vercel.app/api/core/tick?tier=hourly" \
  -H "Authorization: Bearer <CRON_SECRET>"
```
Expect `200` with a summary showing the 5 active agents. Without the bearer → `401` (fail-closed).

## Step 8 — Confirm Vault Core surfaces work
Command Hub shows the Daily Executive Brief + Executive Queue + Recommendations + Drafts + Proposals;
Vault Memory shows the graph; Workforce shows the 5 active executives; Recommendations/Drafts/Proposals
review actions work. (With SQL + service role, these reflect live data; otherwise seeded mock.)

## Step 9 — Enable GHL read-only (only after rotating the key)
1. **Revoke** the exposed GHL key; **create a new one.**
2. Add `GHL_API_KEY` + `GHL_LOCATION_ID` in Vercel env; redeploy.
3. Veronica switches from mock to live read-only conversation data. **Read-only — never sends/mutates.**

---

## Cron / runtime notes
`vercel.json` declares six cron tiers: `5min`, `15min`, `hourly`, `daily`, `weekly`, `monthly`
(all hit `/api/core/tick?tier=…`). Vercel auto-attaches `Authorization: Bearer <CRON_SECRET>` when
`CRON_SECRET` is set.

- **Vercel Hobby:** cron runs **at most once per day** and is limited in count — the sub-daily tiers
  (`5min`/`15min`/`hourly`) will **not** fire. Only `daily` (and the weekly/monthly dailies) run.
- **Vercel Pro (recommended):** all tiers fire as declared. Use Pro for hourly+ intelligence cycles.
- **External pinger alternative:** on Hobby, schedule an external cron (cron-job.org, GitHub Actions)
  to `GET /api/core/tick?tier=hourly` with the `Authorization: Bearer <CRON_SECRET>` header.
- **Locks:** Upstash provides best-effort per-tier locks to prevent overlapping runs; without Upstash,
  locks are per-instance (acceptable for low volume).

## Rollback
Vercel keeps immutable deployments — use **Instant Rollback** to a prior deployment if needed.
SQL migrations are additive and idempotent; nothing destructive to roll back.
