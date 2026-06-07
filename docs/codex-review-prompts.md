# Codex Review Prompts — Vault Core

Reusable, read-only Codex prompts. Codex **reviews and reports**; it does not edit files unless a
human explicitly approves. Pair with `/hermes-qa`.

> **Workforce naming (for audit context):**
> - **Valentina = AI Marketing Director — ACTIVE** Vault Core executive (`src/lib/core/agents/valentina/`,
>   registry id `valentina`, in `RUNNABLE_AGENTS`). It was renamed from the old `victoria` executive;
>   same read-only behavior/tiers/safety. ACTIVE_AGENT_IDS = 5 (vega, veronica, valentina, valerie, vanessa).
> - **Victoria = AI Sales Coach** — the live sales-call product (`src/lib/victoria/**`, `/api/victoria/**`,
>   `/victoria`, `victoria_*` DB tables). It is **NOT** a Vault Core executive and is **not** in the
>   workforce registry or the tick. Do NOT flag Victoria for not being a marketing director, do NOT
>   expect it in `WORKFORCE`/`RUNNABLE_AGENTS`, and do NOT treat the remaining "Victoria" product
>   references as the old marketing executive.
> - There is intentionally **no** `victoria` Vault Core executive anymore. Spec:
>   `docs/valentina-marketing-director-spec.md` (now implemented as the rename).
> - **Vivian = AI Client Success / Experience Operator — ACTIVE (Phase 8.2), RECOMMEND-ONLY.**
>   She is now the **sixth** active Vault Core runtime agent: `active: true` in `registry.ts`,
>   in `ACTIVE_AGENT_IDS`, in `RUNNABLE_AGENTS` (`vivianAgent`, module
>   `src/lib/core/agents/vivian/index.ts`), and in the tick. **ACTIVE_AGENT_IDS / RUNNABLE_AGENTS
>   are now exactly 6** (vega, veronica, valentina, valerie, vanessa, vivian) — do NOT flag the
>   count as wrong; expect Vivian as the sixth. Vivian is **recommend-only**: she reads safe
>   internal data only (no raw contact PII / no credentials / no tokens / no raw provider
>   payloads), writes Vault Memory + recommendation candidates for HUMAN approval, and must
>   **never** mutate any external system. **DO flag as P0** any Vivian code that emails/texts/
>   calls clients, updates GHL/CRM, triggers workflows, touches Stripe/billing, mutates Meta,
>   sends reports, auto-creates external tasks, or auto-executes a recommendation; or that imports
>   GHL/Stripe/Meta write paths or SMS/email/calling tools. Spec:
>   `docs/vivian-client-success-operator-spec.md`.
> - **Vera + Vesper = always-on backend recommendation HYGIENE layer, NOT executives.** Pure
>   functions in `src/lib/core/recommendations/*` (scoring/dedupe/quality-gate/memory-context/hygiene).
>   They run in TWO fail-open places: the insert-time gate (`insertRecommendation`) and the end-of-tick
>   hygiene pass (`runRecommendationHygiene()` in `dispatcher.ts`). They MAY read a bounded, NON-PII
>   Vault Memory context (open recs, related nodes/edges, recent activity, prior actions) and MAY
>   soft-classify/suppress/merge/downgrade recommendations via reversible `metadata.hygiene` +
>   `metadata.quality_gate`. They must NOT be in `ACTIVE_AGENT_IDS`/`RUNNABLE_AGENTS`, must NOT appear
>   in the active workforce ring, must NOT become client-facing agents, must make NO external calls,
>   must NEVER change a recommendation's `status` / approve / reject / implement, must NEVER hard-delete
>   or erase audit history, and must expose NO raw credentials/PII/provider payloads. Approvals stay
>   human-only. The hygiene pass is fail-open and must never fail the tick. Expect a `hygiene` activity
>   entry (agent `"hygiene"`) and a `mission_visible` count — these are backend QA, not executives.
>   **Codex must never be a production runtime dependency** — flag P1 if any production code path
>   imports/invokes Codex. Spec: `docs/vera-vesper-recommendation-quality-gate.md`.

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
- Workforce roster: ACTIVE_AGENT_IDS and RUNNABLE_AGENTS are EXACTLY the 6 active executives
  (vega, veronica, valentina, valerie, vanessa, vivian). Vivian (AI Client Success Operator) is now
  ACTIVE but RECOMMEND-ONLY — flag P0 if Vivian (or any agent) mutates an external system, contacts a
  client, sends/launches/charges, triggers a workflow, auto-creates external tasks, or auto-executes a
  recommendation; flag P0 if a 7th unapproved agent appears. Vera/Vesper are backend QA (pure
  functions), NOT runtime executives, and must not appear in ACTIVE_AGENT_IDS/RUNNABLE_AGENTS. Codex
  must not be a production runtime dependency.
- Competitor Intelligence (Phase 8.4, `/competitor-intel`, `src/lib/core/competitor/**`,
  `/api/core/competitor-*`): INTERNAL, MANUAL-sourced only for Valentina. It must NOT scrape, fetch
  external sites, call the Meta Ads Library live, or run scheduled jobs. `COMPETITOR_AUTOMATION_ENABLED`
  is future/disabled (default false) and no code path may act on it in this phase. Manual create/update
  is internal DB only (admin / canConnectIntegrations), inputs validated/sanitized (http(s) URLs only),
  no credentials/PII/raw payloads stored or returned. Valentina reads this layer READ-ONLY and emits
  recommend-only candidates through insertRecommendation (Vera/Vesper gate). Flag P0 if any competitor
  code performs an external fetch/scrape or external mutation; do NOT flag the documented disabled
  future-automation scaffolding. Valentina = AI Marketing Director (NOT Victoria the Sales Coach product).
- Approved Execution Engine (Phase 9.0, `/actions`, `src/lib/core/actions/**`, `/api/core/actions*`,
  `vault_actions`): agents PREPARE actions → Vera/Vesper quality-check → humans approve → only the
  INTERNAL adapter may execute APPROVED internal actions. EVERY external adapter (GHL/Meta/Stripe/SMS/
  email/calendar/Slack/ClickUp/website) is DISABLED and returns adapter_disabled. The `execute` route
  MUST call `canExecute()` (execution-policy.ts) first and only invoke the resolved adapter; the
  internal adapter writes ONLY internal Vault Memory/activity/audit. Internal approved execution +
  internal status changes + audit logging are EXPECTED and allowed. **Flag P0** if any code: enables an
  external adapter; performs a real SMS/email/GHL/Meta/Stripe/workflow/ad/budget/invoice external action;
  bypasses approval; executes without `canExecute`; returns raw `payload`/credentials/PII (routes return
  DTOs with `safe_preview` only); or weakens auth/RLS. `payload` JSONB must be sanitized before insert.
  Vera/Vesper still never approve/reject/execute. No new active agents; active set remains the 6.
- Agent Action Generation (Phase 9.1, `src/lib/core/actions/generation-policy.ts`, `dedupe.ts`,
  `agent-action-generator.ts`, wired into `runtime/dispatcher.ts` after hygiene): agents AUTO-CREATE a
  SMALL number of approval-ready INTERNAL Vault Actions from their existing pending recommendations.
  **Agent-created internal actions are EXPECTED and allowed** — do NOT flag normal `createAction()`
  usage by the generator as a problem. The generator is INTERNAL-ONLY (`shouldCreateAction` rejects any
  non-internal target), capped (≤2 per agent per tick via `MAX_ACTIONS_PER_AGENT`/per-agent `maxPerTick`),
  deduped (`findDuplicateAction` — same source signal or similar title in the same lane is skipped), and
  quality-gated (Vera score floor + evidence + reason + safe_preview). Tick integration is FAIL-OPEN —
  action generation must never fail the tick; errors are logged as internal activity. It does NOT change
  tick cadence and adds NO new active agents. Vera/Vesper supply quality/generation metadata only and
  still never approve/reject/execute. **Flag P0** if the generator (or any new code) performs a real
  external mutation (SMS/email/GHL/Meta/Stripe/workflow/ad/budget/invoice), enables an external adapter,
  auto-approves or auto-executes an action, bypasses approval, weakens auth/RLS, calls Codex from the
  production runtime, scrapes/live-fetches competitors, or adds a 7th active agent. **Flag P1/P2** if
  generation is uncapped, not deduped (per-tick spam), or can throw and break the tick.
- Approval-to-Execution Workflow (Phase 9.2, `/actions`, `actions/db.ts`, new routes
  `/api/core/actions/[id]/note` + `/assign`, review/execute routes): adds lifecycle
  timeline (rich `audit_log` entries), human notes, owner/priority/due/labels, and a
  ready-to-execute queue — all metadata-first (no schema change). **Internal-only and
  audit-only**: notes/owner/priority live in `metadata` and are sanitized; appending a
  lifecycle/audit event NEVER changes status or bypasses approval; the governed
  transitions still happen only via the review/execute routes. Approved INTERNAL
  actions become `ready_after_approval` and execute only through the internal adapter;
  approved EXTERNAL actions stay `adapter_disabled` and are never executable. The
  `note` and `assign` routes are `canViewApprovals`-guarded and change no status; the
  `execute` route still calls `canExecute()` first and L4 still needs explicit typed
  confirmation. **Flag P0** if any code performs a real SMS/email/GHL/Meta/Stripe/
  workflow/ad/budget/invoice external mutation, enables an external adapter, lets a
  note/assign/lifecycle event bypass approval or execute, auto-approves/auto-executes,
  weakens auth/RLS, or returns raw `payload`/`execution_result`/credentials/PII to the
  client (DTOs expose `safe_preview` + whitelisted metadata only). Owner/priority/notes
  are internal triage; no new active agents; Vera/Vesper still never approve/execute.
- GHL Workflow Builder DRAFT MODE (Phase 9.3, `/ghl-workflows`, `src/lib/core/workflows/**`,
  `/api/core/ghl-workflow-drafts*`, `ghl_workflow_drafts`): agents DESIGN GHL follow-up
  workflow DRAFTS; humans review/approve them INSIDE Vault Core. This is **draft-only —
  there is NO live GHL adapter**. Designing/reviewing/approving a draft internally is
  EXPECTED and allowed. **Flag P0** if any code: creates/updates/publishes a live GHL
  workflow; mutates a GHL contact/opportunity/workflow; sends SMS/email; calls a GHL API
  or imports a live GHL client / uses per-client GHL credentials in the workflows module;
  adds a publish/execute route for drafts; exposes raw GHL payloads/credentials/live IDs
  (DTOs return sanitized steps + safe_preview only); bypasses approval; or weakens
  auth/RLS. `approve_internal` must NOT publish (it moves the draft to
  `future_adapter_required`). `adapters/ghl-disabled.ts` must perform NO I/O. Workflow
  steps (`draft_sms`/`draft_email`/tag/task/pipeline/webhook_placeholder) are draft-only
  and must never execute. No new active agents; `draft_ghl_workflow` actions stay
  `adapter_disabled` and human-approved.
- Lead Reply + Client Message Drafting DRAFT MODE (Phase 9.4, `/message-drafts`,
  `src/lib/core/messages/**`, `/api/core/message-drafts*`, `vault_core_message_drafts`):
  agents prepare lead replies / client messages; humans review/approve them INSIDE Vault
  Core. This is **draft-only — there is NO live send adapter**. Designing/reviewing/
  approving a message draft internally is EXPECTED and allowed. **Flag P0** if any code:
  sends a live SMS/email; mutates a GHL contact/opportunity/workflow or triggers a
  workflow; uses a provider credential or imports an SMS/email/GHL client in the messages
  module; adds a send/execute route for drafts; exposes raw provider payloads/credentials/
  live IDs or raw contact PII (DTOs return safe_preview + sanitized body + a sanitized
  `contact_ref` only); bypasses approval; weakens auth/RLS; or lets Vivian contact clients
  directly. `approve_internal` must NOT send (it moves the draft to
  `future_adapter_required`). `messages/adapters/send-disabled.ts` must perform NO I/O.
  `draft_lead_reply`/`draft_client_message` actions map to the DISABLED send lane (sms/
  email) and stay `adapter_disabled`. The table is `vault_core_message_drafts` (distinct
  from the Phase 6 `vault_message_drafts`). No new active agents.

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
