# Codex Review Prompts — Vault Core

Reusable, read-only Codex prompts. Codex **reviews and reports**; it does not edit files unless a
human explicitly approves. Pair with `/hermes-qa`.

> **Workforce naming (role split — for audit context):**
> - **Victoria = AI Sales Coach** (live sales-call product: `src/lib/victoria/**`, `/api/victoria/**`,
>   `/victoria`). Do NOT flag Victoria for not being a marketing director, and do NOT expect Victoria
>   to do marketing.
> - **Valentina = AI Marketing Director** — **SPEC ONLY** (`docs/valentina-marketing-director-spec.md`).
>   Valentina is intentionally **not active**, not in the tick, not a runnable agent. Do NOT flag her
>   absence from runtime as a defect.
> - Transitional reality: the active executive registered as `victoria` (title "Marketing Director")
>   currently performs the Valentina role; its rename/activation is a deferred future phase. Flag a
>   NEW finding only if runtime behavior actually changes — not for the documented transitional naming.

---

## Reusable Vault Core audit prompt (the default)

```
You are performing a READ-ONLY second-opinion code review of the Vault Co "Vault Core" codebase
(Next.js 16 App Router, TypeScript, Tailwind v4, Supabase, Upstash, Vercel). Do NOT edit files.
Report findings only, each tagged P0/P1/P2/P3 with file:line and a concrete fix.

Vault Core safety invariants (flag ANY violation as P0):
- Read / analyze / recommend / draft only. No SMS sending, no GHL/CRM mutation, no Stripe mutation,
  no invoice sending, no workflow triggers, no client-system mutation, no auto-execution from approvals.
- Drafts are never sent; approving a draft/recommendation/proposal only updates internal status.
- GHL invariant (CORRECTED — scope matters, do NOT blanket-flag per-client credentials as P0):
  • Vault Core EXECUTIVE RUNTIME (src/lib/core/**, src/app/api/core/**) must be Vault-Co-only for GHL:
    it may use ONLY VAULT_CO_GHL_API_KEY / VAULT_CO_GHL_LOCATION_ID / VAULT_CO_LEGACY_GHL_API_KEY /
    VAULT_CO_LEGACY_GHL_LOCATION_ID via src/lib/core/integrations/ghl/client.ts. It must NEVER use
    per-client credentials, integration_connections, client_integration_credentials,
    clients.ghl_location_id, or the generic GHL_API_KEY / GHL_LOCATION_ID fallback. Flag P0 if Vault
    Core runtime touches any of those.
  • CLIENT PORTAL TRACKING (Revenue Dashboard, client reporting, Meta/GHL performance, Veronica client
    portal) MAY use per-client GHL credentials — this is allowed and expected. It is acceptable when:
    routes are admin-only / canConnectIntegrations, credentials encrypted at rest, never logged, never
    returned to the client, GHL access GET-only, no GHL mutation, and gated by CLIENT_GHL_TRACKING_ENABLED.
    Do NOT classify a guarded, read-only, admin-only per-client GHL route as P0 merely for using
    per-client credentials.
- All GHL access remains GET-only; never multi-location scanning across arbitrary client sub-accounts
  from Vault Core runtime.
- Demo auth (NEXT_PUBLIC_AUTH_MODE=demo) must never bypass auth in a production build (gated on
  NODE_ENV !== "production" in both middleware and AuthProvider).

Check for and report:
- Missing role guards (resolveServerRole) or permission checks (can(role,...)) on any /api route.
- Secret exposure: hardcoded keys, NEXT_PUBLIC_ secrets, secrets logged or returned from an API,
  secrets reaching client components, committed .env.
- Unsafe server/client boundaries ("use client" files importing server-only/secret code).
- Missing mock fallback in data readers (must function with no DB / no env).
- Runtime failures, cron double-run risk, Upstash lock correctness.
- API mutation risk; outbound non-GET requests to external systems.
- Database migration safety (additive only, IF NOT EXISTS, indexes/constraints, RLS assumptions).
- GHL / Stripe / SMS mutation or send risks; approval or Command Hub review bypasses.
- Broken imports, type errors, route regressions, React hydration risks.
- Vercel deployment risks (cron cadence vs plan, env var assumptions).
- UI: generic AI-slop, inconsistent components, weak hierarchy, broken responsive, inconsistent
  Vault Co branding.

Output: grouped by severity (P0 first), each with file:line, the risk, and the recommended fix.
Default to read-only. Do not modify anything.
```

---

## Mode-specific prompts

### Standard Review
```
Read-only review of the changed files in this diff. Report correctness bugs, missing guards, and
obvious risks, tagged P0–P3 with file:line and a fix. Do not edit.
```

### Adversarial Review
```
Adversarial read-only review. Assume the author is overconfident. Challenge assumptions and hunt for
hidden bugs, race conditions, security flaws, unsafe defaults, and ways the Vault Core safety
invariants could be bypassed (sending, mutation, approval bypass, secret leak). Tag P0–P3 with
file:line and proof-of-risk. Do not edit.
```

### Deployment Review
```
Read-only deployment review for Vercel. Check: required env vars and safe fallbacks, vercel.json cron
cadence vs Hobby/Pro limits, Supabase migration order/idempotency, CRON_SECRET fail-closed, Upstash
lock behavior, and anything that breaks a cold production deploy. Tag P0–P3 with fixes. Do not edit.
```

### Security Review
```
Read-only security review. Check secrets (hardcoded/NEXT_PUBLIC/logged/returned), role + permission
guards on every /api route, server/client boundaries, GHL GET-only + Vault-Co-only scope, Stripe
safety, draft non-send, and API exposure. Tag P0–P3 with file:line and remediation. Do not edit.
```

### UI Review
```
Read-only UI review. Flag generic AI-slop, inconsistent card/badge/button/drawer styles, weak
hierarchy, low contrast, broken responsive/mobile layout, and inconsistent Vault Co branding /
premium voice. Tag P1–P3 with the screen/component and a fix. Do not edit.
```

### Database Review
```
Read-only database review of the SQL migrations. Confirm changes are additive (CREATE/ALTER ...
IF NOT EXISTS), correctly indexed/constrained, safe to re-run, RLS-compatible (service-role access),
and ordered correctly across phases. Tag P0–P3 with fixes. Do not edit.
```

---

## How to invoke
- CLI: `codex exec --sandbox read-only "<prompt above>"` (optionally scope to a path/diff).
- Manual fallback: paste the prompt into Codex in your terminal and paste findings back to Hermes.
