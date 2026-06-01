# Vault Core — Route Verification Checklist

Verified 2026-06-01 (Phase 6.6). Build: **clean, 73 static pages generated**.

## Pages (all auth-gated by middleware → `/login` when unauthenticated)

| Route | Purpose | Mock-safe | Notes |
|---|---|---|---|
| `/` | **Command Hub** — executive home base: Daily Executive Brief → Recommendations + System Proposals → Draft Queue, then Operating Systems portals | ✅ | Single hub (no duplicate). Refined in Phase 6.5 |
| `/vault-memory` | Knowledge graph + memory overview/health + activity feed | ✅ | React Flow graph; mock graph when no DB |
| `/workforce` | Reputation cards, objectives, collaboration feed, executive brief preview, conversation-intelligence panel | ✅ | 5 active execs + Vivian stub |
| `/recommendations` | Recommendation queue + traceability drawer + review actions; status / source-agent / executive-priority filters | ✅ | Human review only |
| `/drafts` | Draft Approval Queue (Veronica) — approve / edit / reject; never sends | ✅ | Drafts marked approved internally only |
| `/proposals` | System Creation Engine proposals — review | ✅ | Approval signals intent only |

## API surfaces (all role-guarded, fail-closed)

| Route | Guard | Mock fallback | External mutation |
|---|---|---|---|
| `GET/POST /api/core/tick` | `CRON_SECRET` (cron) or admin (manual); constant-time, fail-closed | runs in mock; writes no-op | none — writes Vault Memory only |
| `GET /api/core/memory/graph` | `canViewStrategyData` | ✅ seeded graph | none |
| `GET /api/core/memory/overview` | `canViewStrategyData` | ✅ | none |
| `GET /api/core/activity` | `canViewStrategyData` | ✅ | none |
| `GET /api/core/recommendations` `/[id]` `/[id]/review` | `canViewApprovals` | ✅ | none (status + audit only) |
| `GET /api/core/collaboration` | `canViewStrategyData` | ✅ | none |
| `GET /api/core/workforce` | `canViewStrategyData` | ✅ | none |
| `GET /api/core/proposals` `/[id]` `/[id]/review` | `canViewApprovals` | ✅ | none (status only) |
| `GET /api/core/drafts` `/[id]/review` | `canViewApprovals` | ✅ | **none — never sends** |
| `GET /api/core/executive-brief` | `canViewStrategyData` | ✅ computed | none |

## Confirmed
- ✅ **Role guards exist** on all 15 `/api/core` routes (`resolveServerRole` + permission/secret check).
- ✅ **Unauthenticated access fails closed** — verified live: every `/api/core/*` returns `401`; pages return `307 → /login`.
- ✅ **Mock fallback** on every read; writes no-op without DB.
- ✅ **No route leaks secrets** (see `docs/vault-core-security-checklist.md`).
- ✅ **No route performs external mutation** — repo scan for outbound POST/PUT/PATCH/DELETE in core found none; GHL client is GET-only.
- ✅ **Runtime works logged-out** — `/api/core/tick` (with `CRON_SECRET`) runs all 5 agents with no user session, in mock mode, without GHL env. Verified: `vega/veronica/victoria/valerie/vanessa = success`.
