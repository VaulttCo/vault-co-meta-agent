# Vault Core — Phase 1 Handoff

**Status:** shipped, build clean (68 routes). Fully functional with **zero database** via mock fallback.

Phase 1 delivers the complete Vault Core loop end-to-end:

```
existing data → Vega agent cycle → Vault Memory (nodes/edges) → 24/7 runtime → Knowledge Graph + Activity feed
```

It is intentionally thin: **only Vega (Intelligence Director) is active.** The other five
executives (Veronica, Victoria, Vivian, Valerie, Vanessa) are registered as
metadata-only stubs and render in the workforce roster but do not run.

---

## What was built

| Layer | Files |
|---|---|
| **L1 Vault Memory — schema** | `docs/vault-core-schema.sql` (5 tables) |
| **L1 Vault Memory — code** | `src/lib/core/types.ts`, `src/lib/core/memory/db.ts`, `src/lib/core/memory/mock-graph.ts` |
| **L2 Workforce** | `src/lib/core/agents/registry.ts` (roster), `src/lib/core/agents/types.ts`, `src/lib/core/agents/index.ts` (runnable map), `src/lib/core/agents/vega/index.ts` (active agent) |
| **Continuous Ops runtime** | `src/lib/core/runtime/kv.ts` (locks/state), `src/lib/core/runtime/dispatcher.ts`, `src/app/api/core/tick/route.ts`, `vercel.json` (crons) |
| **APIs (role-guarded)** | `src/app/api/core/memory/graph/route.ts`, `.../memory/overview/route.ts`, `.../activity/route.ts` |
| **UI (Veronica Design)** | `src/app/vault-memory/page.tsx`, `src/components/core/VaultMemoryView.tsx`, `src/components/core/VaultMemoryGraph.tsx`, `src/components/core/categoryStyle.ts`; Sidebar link added |
| **Dependency** | `@xyflow/react` (React Flow) added to `package.json` |

---

## Hard rules — how they're enforced

1. **Client systems stay read-only** — Vega reads via `getDataProvider().getClients()` only; no external writes anywhere in `src/lib/core`.
2. **Nothing sends/publishes/launches/edits/deletes** — the runtime only writes to the `vault_*` memory tables. Recommendations are always created with `status: "open"`; only humans advance them.
3. **Every API route is role-guarded** — all `/api/core/*` routes call `resolveServerRole()` (401) + `can(role, "canViewStrategyData")` (403). The manual tick (`POST /api/core/tick`) additionally requires `role === "admin"`.
4. **Mock fallback works without DB/env** — reads fall back to a seeded, freshly-timestamped mock graph; writes no-op. The page renders and "feels alive" with no Supabase, no Upstash, no Anthropic key.
5. **Build passes clean** — `pnpm build` ✓ (TypeScript + 68 routes). New files lint clean.

---

## Manual setup required for production (live mode)

### 1. Database — run the SQL

The five `vault_*` tables **do not exist yet**. Until they do, the app serves the
seeded mock graph. To go live:

```
Supabase → SQL Editor → paste & run docs/vault-core-schema.sql
```

It is purely additive (CREATE TABLE IF NOT EXISTS) — it never alters or drops existing tables.
Once tables exist and Vega runs, the graph/feed switch to real data automatically
(`getGraph()` returns mock only when there are 0 rows or on error).

> Optional: after creating tables, run `npx supabase gen types typescript ... > src/lib/supabase/types.ts`.
> Not required — Vault Core uses a typed escape hatch (`db() as any`) like the Victoria subsystem.

### 2. Environment variables

| Variable | Purpose | Without it |
|---|---|---|
| `CRON_SECRET` | **Required for cron.** Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on scheduled requests. The tick route compares it constant-time. | Cron requests are **rejected (fail closed)**. Only an admin manual trigger works. |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Live Vault Memory persistence. | Mock fallback (reads seeded graph, writes no-op). |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Durable tick locks + last-run state across serverless invocations. | Falls back to a process-local in-memory Map (fine for dev; locks are per-instance only). |
| `ANTHROPIC_API_KEY` | Lets Vega sharpen insight phrasing (Haiku). | Deterministic analysis is used (fully functional). |

Set `CRON_SECRET` in Vercel **Project → Settings → Environment Variables**.

### 3. Vercel Cron — plan limitation ⚠️

`vercel.json` declares six cron tiers (5min / 15min / hourly / daily / weekly / monthly):

```json
{ "path": "/api/core/tick?tier=hourly", "schedule": "0 * * * *" }   // etc.
```

- **Vercel Hobby:** cron jobs run **at most once per day** and are limited in count.
  The sub-hourly tiers (`5min`, `15min`, `hourly`) **will not fire** on Hobby.
- **Vercel Pro/Enterprise:** all tiers fire as declared.

**Phase-1 reality:** Vega only schedules on the `hourly` and `daily` tiers (see
`registry.ts`), so on **Pro** it runs hourly out of the box. On **Hobby**, only the
`daily` tier fires — for more frequent runs either upgrade, or point an external
pinger (cron-job.org, GitHub Actions) at
`GET /api/core/tick?tier=hourly` with the `Authorization: Bearer <CRON_SECRET>` header.

You can always trigger a cycle immediately as an admin: **/vault-memory → "Run cycle"**
(calls `POST /api/core/tick?tier=hourly`).

---

## How to verify

1. **No setup:** open `/vault-memory` → seeded graph, overview stats, live feed, health bars, workforce roster, recommendations all render. Badge shows **"Seeded preview"**.
2. **Admin manual run:** click **"Run cycle"** → `POST /api/core/tick?tier=hourly`. In mock mode it returns a success summary (no persistence); with DB it writes a Vega insight + activity (+ recommendation when the cross-client CPL spread ≥ 30%).
3. **Live:** after running the SQL + setting Supabase env, run a cycle → badge flips to **"Live memory"**, real nodes/edges appear.

---

## Deferred to later phases (not built)

- Real logic for the other four executives (Veronica/Vivian/Valerie/Vanessa) + Victoria
- Layer 3 Workforce Collaboration Engine
- Layer 6 System Creation Engine
- Graph filtering/search/expand-collapse, Memory Timeline, dedup
- Command Hub wiring of `vault_recommendations` into the existing approvals UI
