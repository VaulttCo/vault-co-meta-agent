# Codex Audit Prompt — Executive Decision Center (Vault Core)

Paste the prompt below into Codex with the repository attached. It reviews the
newly added **Executive Decision Center** — a read-only decision-compression
layer inside `/vault-core` that rolls up pending items from existing approval
queues and deep-links into the existing review pages.

---

## Prompt

You are auditing a focused, additive change to an existing Next.js 16 (App
Router, TypeScript, Tailwind v4) internal operating system called **Vault OS /
Vault Core**. Do **not** propose architectural rewrites, new dashboards, or new
systems. Audit only the change described below and the files it touches.

### What was built

An **Executive Decision Center**: a read-only panel inside the existing
`/vault-core` Executive Command page. It aggregates **pending** items from nine
existing approval queues (recommendations, actions, meta campaign drafts, GHL
workflow drafts, message drafts, finance drafts, creative briefs, system
proposals, Veronica SMS drafts), groups them into **Critical / Recommended / Low
urgency**, and renders decision cards (title, client/system affected, source
queue, why it matters, estimated review time, business-impact estimate when
available, status badge, deep link). Each card links into the queue page that
already owns review/approval. It must not create a new approval system, new
statuses, or a new dashboard.

### Files to audit

- `src/lib/core/executive-decisions/build.ts` — server-side aggregator
  (`getExecutiveDecisionCenter()`), reads existing queue readers, mock-safe.
- `src/app/api/core/executive-decisions/route.ts` — `GET`, role-guarded
  (`canViewStrategyData`), read-only.
- `src/components/core/ExecutiveDecisionCenter.tsx` — client component, three
  priority sections, reuses `VaultUI` primitives.
- `src/app/vault-core/page.tsx` — mounts the component (additive only).

### Hard constraints the implementation MUST satisfy

1. Read-only. No mutation of Supabase, GHL, Stripe, Meta, or any external system.
2. No Meta push / publish / activate behavior anywhere in the change.
3. No exposure of Hermes, debug, or internal-only tooling.
4. No new approval logic and no new status values — it must consume existing
   `pending_review` (and SMS `draft`) statuses and existing readers only.
5. No duplicate dashboard and no re-implementation of existing queue pages — it
   deep-links into them.
6. Mock-safe: with no Supabase env, it must degrade gracefully (empty/− never
   throw). If any one queue reader fails, the rest must still render.
7. Role guard must match the existing executive surfaces (`canViewStrategyData`).
8. Reuse existing count/list readers and `VaultUI` components — flag any place
   that reinvents something already available in `src/lib/core/**` or
   `src/components/ui/VaultUI.tsx`.

### Review for

- TypeScript errors and unsafe `any` / incorrect types.
- Broken or circular imports; server-only code leaking into client bundles
  (e.g. `SUPABASE_SERVICE_ROLE_KEY`, server clients imported by a `"use client"`
  file).
- Runtime errors and unhandled promise rejections.
- Route/API issues: method, `runtime`, `dynamic`, auth/role guard correctness,
  error status codes, response shape mismatch with the client.
- Broken or missing auth/role guards.
- Duplicate dashboard logic or duplicate approval logic.
- Any accidental Meta push / external mutation / send behavior.
- Any Hermes or debug exposure.
- Unsafe mutations of shared state or external systems.
- Mock-mode failures (no Supabase, empty data, one reader throwing).
- Bad loading / empty / error states (including a queue partially failing).
- UI inconsistencies vs the existing Vault Core panels (spacing, tokens, badges).
- Accessibility: link semantics, `aria-label`s, color-only signaling, contrast,
  keyboard focus.
- Performance: redundant fetches, N+1 reads, oversized payloads, missing caps,
  unnecessary re-renders.
- Overengineering / dead code / unused exports.
- Missed reuse of existing utilities (status humanizers, draft-status metadata,
  client-name resolution, count readers).
- Anything that could break production or demo/mock mode.

### Output format (use exactly these sections)

1. **Critical issues** — would break production, security, or the read-only/no-push guarantees.
2. **High-priority issues** — bugs, broken states, guard/type problems.
3. **Medium-priority issues** — correctness/robustness/reuse improvements that are safe and localized.
4. **Low-priority cleanup** — style/naming/micro-optimizations.
5. **Exact files/lines involved** — `path:line` for every finding above.
6. **Recommended patch plan** — concrete, minimal diffs per issue; do not propose refactors of unrelated files, new systems, or product-direction changes.
7. **Safe to ship?** — explicit YES/NO with a one-paragraph justification covering: read-only, no Meta push, no Hermes exposure, no duplicate dashboard/approval system, mock-safe.

Constrain every recommendation to be additive and safe. Do NOT recommend
anything that would create duplicate systems, remove existing features, start
live Meta push, expose Hermes/debug, refactor unrelated architecture, break
mock/demo mode, or change product direction.
