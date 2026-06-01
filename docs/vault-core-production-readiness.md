# Vault Core — Production Readiness

Status as of Phase 6.6 (2026-06-01): **READY for Vercel deployment** (one required action: rotate the GHL key).

## Summary
The Vault Co Veronica Portal + Vault Core (5 active executives — Vega, Victoria, Valerie, Vanessa,
Veronica; Vivian still a stub) is deployable, safe, and documented. It runs fully on **mock fallback**
with zero configuration and switches to live data as Supabase + env vars are added.

## Readiness checklist

| Area | Status | Evidence / doc |
|---|---|---|
| Build | ✅ clean | `pnpm build` → 73 static pages, no TS errors, lint clean on changed files |
| Stale cache | ✅ handled | `tsconfig.tsbuildinfo` cleared before final build |
| `console/page.tsx` boundary | ✅ untouched | `git diff HEAD` clean for that file |
| Secrets | ✅ none committed | `docs/vault-core-security-checklist.md` |
| GHL key rotation | ⚠️ **required before live GHL** | exposed key compromised — revoke + replace; mock until then |
| Env vars | ✅ documented | `docs/vault-core-env-vars.md` |
| Supabase SQL order | ✅ documented | `docs/vault-core-supabase-sql-order.md` |
| Routes | ✅ verified | `docs/vault-core-route-verification.md` |
| Role guards | ✅ all 15 `/api/core` routes | fail-closed (401) verified live |
| Mock fallback | ✅ preserved | every read falls back; writes no-op |
| Cron protection | ✅ `CRON_SECRET` constant-time | missing/incorrect → 401 |
| Runtime logged-out | ✅ works | tick runs 5 agents with no session, no GHL, mock mode |
| Deployment guide | ✅ | `docs/vercel-production-deployment.md` |

## Safety posture (unchanged through 6.6)
Read · Analyze · Recommend · Draft internally · Human review. **No** SMS sending, GHL/CRM mutation,
Stripe mutation, invoice sending, payment movement, client-facing external actions, approval
auto-execution, proposal auto-build, or recommendation auto-execution. GHL access is **GET-only**.

## Known limitations / follow-ups (non-blocking)
- **Vercel Hobby cron** only fires daily — use Pro or an external pinger for hourly cycles (see deploy doc).
- **Responsive / accessibility / visual QA** across all screens needs a live authenticated preview
  (Supabase session) — do a browser pass post-deploy. Headless verification covered build/routes/guards/runtime.
- **Vivian** remains a stub (intentionally not activated).
- **Live GHL field mapping** is best-effort and untested against a real account — falls back to mock on
  any mismatch; refine once a rotated test key is available.
- Two GHL client modules exist (`src/lib/integrations/ghl/` pre-existing, `src/lib/core/integrations/ghl/`
  Vault Core) — both server-only/read-safe; consolidation is optional future cleanup.

## Go / no-go
**GO** for deploy. Before enabling live GHL data: rotate the key. Everything else is production-ready.
