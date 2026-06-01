---
title: "ADR-0008: Production deployment readiness"
status: accepted
created: 2026-06-01
tags: [adr, vault-core, phase-6-6, deployment, security]
---

# ADR-0008: Production deployment readiness

- **Status:** accepted
- **Date:** 2026-06-01
- **Owner:** Nick (admin)
- **Related systems:** Vercel, Supabase, Upstash, Cron runtime, GHL, security

## Decision

Declare Vault Core **ready for Vercel production deployment** (5 active executives; Vivian still a
stub), gated on one required action: **rotating the compromised GHL key**.

- **Deployment path documented:** `docs/vercel-production-deployment.md` (9 steps).
- **Env vars documented:** `docs/vault-core-env-vars.md` (public vs server-only; required vs optional).
- **SQL install order documented:** `docs/vault-core-supabase-sql-order.md` (Phase 1→2→3→5→6; Phase 4 none).
- **Security audited:** `docs/vault-core-security-checklist.md` — no committed secrets, no hardcoded
  keys, no `NEXT_PUBLIC` secret misuse, `/api/debug/env` returns booleans only, GHL is GET-only.
- **Routes verified:** `docs/vault-core-route-verification.md` — all 15 `/api/core` routes role-guarded
  + fail-closed; mock fallback everywhere; no external mutation.

## Reason

Before deploying an AI workforce that touches financial, conversation, and operational intelligence,
the system must be demonstrably safe (read/analyze/recommend/draft only), credential-clean, and
operable on mock fallback so a misconfiguration degrades gracefully rather than breaking or leaking.

## Security: compromised GHL key

A GHL/LeadConnector key was exposed in chat → **must be rotated before production**. Until then, leave
`GHL_API_KEY`/`GHL_LOCATION_ID` unset and Veronica runs on mock conversation data.

## Tradeoffs / limitations

- **Vercel Hobby** only fires daily crons — Pro (or an external pinger) is needed for hourly cycles.
- Final **responsive/accessibility/visual QA** needs a live authenticated preview — a post-deploy
  browser pass; headless verification covered build/routes/guards/runtime.

## Impact

The Vault Co Veronica Portal + Vault Core can be deployed to Vercel safely. No new features were added;
this was an audit + documentation phase.

## Related
- [[ADR-0007-conversation-intelligence-layer]] · [[Roadmap]] · [[_Index]]
