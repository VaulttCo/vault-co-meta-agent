# Veronica Design Operator

Rules for all UI and component work in this codebase. Read before touching any file in `src/`.

---

## Sandbox-first workflow

Every new component goes to `src/components/sandbox/` before it goes anywhere in production.

**Order is mandatory:**

1. Generate or write the component in `src/components/sandbox/`
2. Audit the data model — confirm every prop has a real data source
3. Propose the promotion plan and get approval
4. Move the named export to `src/components/ui/`
5. Strip sandbox demo code from the production file
6. Slim the sandbox file to import only from `src/components/ui/`
7. Wire into one page only, with real data only
8. Run `pnpm build` — zero errors required
9. Run visual QA — desktop and mobile
10. Report files changed

Skipping any step is not permitted. Steps 3, 7, and 8 require explicit approval before proceeding.

---

## No fake data rule

**Never fabricate a prop value in JSX.**

This means:
- No hardcoded scores, tiers, or labels that don't come from real data
- No `intelligenceScore={75}` inline when no score exists for this client
- No `tier="elite"` when the field isn't set in the data model
- No `change="+12%"` when no historical delta exists

If a prop has no honest source, make it optional and omit it. The component must degrade gracefully. A card with three real metrics and one `"—"` is correct. A card with four fabricated trend badges is not.

The degraded rendering is the correct production state until real data exists.

---

## One-page-at-a-time rule

When wiring a component into production pages:

- Wire into exactly one page per phase
- Get the first wiring reviewed before touching a second page
- Do not wire the same component into multiple pages in one commit unless explicitly approved

---

## Frozen files and areas

Do not touch these without a dedicated, explicitly approved task:

| Area | Files / paths | Why |
|---|---|---|
| Global styles | `src/app/globals.css` | Design token source of truth — uncontrolled edits break the entire theme |
| Auth system | `src/components/AuthProvider.tsx`, `src/middleware.ts` | Security boundary |
| Supabase schema | `src/lib/supabase/types.ts` (DB columns only), `docs/database-schema.md` | Schema changes require migrations; types must match the live DB |
| API routes | `src/app/api/**` | Server logic — UI work does not touch route handlers |
| Data provider interface | `src/lib/data/data-provider.ts` | Contract for all data access — interface changes ripple to all providers |
| Plan/approval flow | `src/lib/planStore.ts`, `src/components/PlanProvider.tsx` | Campaign approval state — not a UI concern |

Adding optional fields to `src/lib/data.ts` (the `Client` interface) and the provider implementations is permitted when data model work is explicitly approved.

---

## Build requirement

`pnpm build` must pass with zero TypeScript errors before any phase is reported complete.

The TypeScript check (`Running TypeScript...`) must finish without errors. Compile success alone is not enough.

If the build fails:
- Fix the error before reporting the phase done
- Do not move to the next phase with a broken build
- Do not use `// @ts-ignore` to suppress errors

---

## Visual QA requirement

After wiring any component into a production page, run a visual QA pass:

- Desktop viewport: 1280×900 minimum
- Mobile viewport: 390×844 minimum
- Confirm no horizontal overflow (`document.body.scrollWidth === viewport width`)
- Confirm no empty gaps where optional sections are hidden
- Confirm the card aligns with surrounding layout elements
- Check browser console for new errors introduced by this change

Use Playwright with demo auth (`NEXT_PUBLIC_AUTH_MODE=demo`, localStorage `vc_demo_auth_user` seeded) to drive headless screenshots when a browser is not open.

Only fix spacing or layout issues that are visually necessary. Do not add features during QA.

---

## Approval gates

These actions require explicit user approval before any code is written:

| Gate | What triggers it |
|---|---|
| Data model change | Any addition to `Client`, `ClientRow`, `ClientCreateInput`, or provider implementations |
| Sandbox → production promotion | Moving a component from `src/components/sandbox/` to `src/components/ui/` |
| First page wiring | Adding any new component import to a production page |
| Schema seeding | Adding values to mock client data or Supabase seed files |
| New optional prop | Making any currently-required prop optional (changes the component contract) |

For each gate, present a written proposal first:
- Exact files that would change
- Exact fields or props being added
- What renders when the new fields are absent
- Confirmation that no existing clients break

Do not write code until the proposal is approved.

---

## MCP usage rules

### @21st-dev/magic

- Requires `NEXT_PUBLIC_AUTH_MODE` and project `.mcp.json` — confirm active in session before invoking
- All generated output goes to `src/components/sandbox/` first — never directly to `src/components/ui/` or any page
- Generated code must be audited for VaultUI token compliance before promotion
- The magic tool generates starting points, not final components — always review and adapt to Vault Co design tokens

### General MCP rules

- Confirm each MCP server is listed in active session tools before attempting to use it
- If a tool is configured in `claude_desktop_config.json` but not in project `.mcp.json`, it is not active in Claude Code CLI sessions
- Do not assume a tool is available because it was used in a previous session

---

## Promote-to-production checklist

Use this before marking any component as promoted.

**Component file (`src/components/ui/`):**
- [ ] No default export (sandbox preview wrapper removed)
- [ ] All public types are named exports (`interface Props`, `interface MetricData`, etc.)
- [ ] No hardcoded client names, scores, or mock values
- [ ] All optional props degrade without empty gaps or placeholder text
- [ ] `"use client"` directive present if the component uses hooks or motion
- [ ] Framer Motion used only for `useReducedMotion`-aware subtle entry animations — no looping, no hover-only motion that can't be disabled
- [ ] All color values use VaultUI tokens (`var(--t-surface)`, `#0081f2`, `#c9a84c`) — no arbitrary hex values that aren't in the design system

**Data wiring:**
- [ ] Every prop has a named real field from the data model
- [ ] Optional props are omitted (not passed as `undefined` explicitly) when no data exists
- [ ] No inline ternaries that produce fabricated fallback values (`tier ?? "elite"` is fabricated; `tier` passed directly is honest)

**Page integration:**
- [ ] Component is imported from `@/components/ui/` not `@/components/sandbox/`
- [ ] Placement is additive — no existing layout, panel, or stat is removed
- [ ] No new route, API call, or Supabase query introduced by the wiring

**Build and QA:**
- [ ] `pnpm build` passes with zero TypeScript errors
- [ ] Desktop screenshot reviewed
- [ ] Mobile screenshot reviewed
- [ ] No new browser console errors
- [ ] Sandbox file still exists and imports from `src/components/ui/`

---

## Component lifecycle summary

```
@21st-dev/magic or manual
         │
         ▼
src/components/sandbox/        ← generation + iteration
         │
    [audit data model]
    [approval gate]
         │
         ▼
src/components/ui/             ← named exports only, no mock data
         │
    [approval gate]
         │
         ▼
src/app/[page]/page.tsx        ← one page, real data only
         │
    [pnpm build]
    [visual QA]
         │
         ▼
        done
```

The sandbox file is never deleted. It serves as the living demo of the component in isolation and is the reference for QA after future changes.
