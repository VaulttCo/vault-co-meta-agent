# Veronica Design Mode

Governance layer for all UI work in the Vault Co portal.

**Read this before touching any page.**

---

## What this is

`src/lib/veronica/design-mode/` is the single source of truth for every design decision in the portal. It defines rules, tokens, and an audit trail that must be consulted before any UI change is made.

These files are pure TypeScript data — they do not render components, do not run at runtime, and do not affect bundle size (tree-shaken). They exist for:
- Governing Veronica's UI behavior
- Tracking the state of every page
- Encoding rules that prevent visual drift

---

## Files

| File | Purpose |
|---|---|
| `design-principles.ts` | Color tokens, typography scale, spacing system, border radii. The canonical reference for raw design values. |
| `component-rules.ts` | Which component to use for every UI pattern. Panel rules, stat rules, table rules, button hierarchy, anti-patterns. |
| `motion-rules.ts` | Every approved Framer Motion pattern: timing tokens, animation variants, phase 2B rollout plan. |
| `page-audit.ts` | Per-page audit records: status, issues, completed work, what's frozen, what's approved for next phase. |
| `README.md` | This file. |

---

## How to use

### Before redesigning a page

```typescript
import { PAGE_AUDIT, PRE_REDESIGN_CHECKLIST, FROZEN_PAGES } from "@/lib/veronica/design-mode/page-audit";

// 1. Check if the page is frozen
const isFrozen = FROZEN_PAGES.includes("/settings"); // true → stop

// 2. Check current audit status
const audit = PAGE_AUDIT.clients;
// audit.status === "complete" → already done
// audit.status === "not-started" → needs audit first
// audit.approved === false → get approval before touching

// 3. Run through the pre-redesign checklist
PRE_REDESIGN_CHECKLIST.forEach(item => console.log(item));
```

### Before adding animation

```typescript
import { ANIMATABLE_ELEMENTS, TIMING, panelVariants } from "@/lib/veronica/design-mode/motion-rules";

// Check if your element is approved for animation
// ANIMATABLE_ELEMENTS.approved → yes list
// ANIMATABLE_ELEMENTS.forbidden → never animate these

// Use canonical timing tokens, never inline values
<motion.div variants={panelVariants} transition={TIMING.panel} />
```

### Before choosing a color

```typescript
import { COLORS, COLOR_RULES } from "@/lib/veronica/design-mode/design-principles";

// Raw values for dynamic use (Framer Motion targets, tests)
const activeBlue = COLORS.blue;       // "#0081f2"
const revenueGold = COLORS.gold;      // "#c9a84c"

// Usage rules
COLOR_RULES.gold;     // ["Revenue Dashboard ONLY", ...]
COLOR_RULES.forbidden; // ["Do NOT mix gold and blue accents...", ...]
```

### Before choosing a component

```typescript
import { PANEL_RULES, STAT_RULES, TABLE_RULES, ANTI_PATTERNS } from "@/lib/veronica/design-mode/component-rules";

// Am I building a panel? → PANEL_RULES
// Am I building a KPI tile? → STAT_RULES
// Am I building a table? → TABLE_RULES
// Is what I'm about to do in ANTI_PATTERNS? → Stop
```

---

## Design phase status

| Phase | Status | Scope |
|---|---|---|
| Phase 1 | ✅ Complete | VaultUI system, StatCard, clients table, AI agent, revenue dashboard, reports, stabilization pass |
| Phase 2A | ✅ Complete | framer-motion + shadcn/ui installed, `cn()` utility, `components.json`, Button primitive |
| Phase 2B | ⏳ Pending approval | Wire motion into: page wrapper, modals, panel stagger, stat count-up, mobile sidebar |
| Phase 3 | ⏳ Pending approval | Console, settings (limited), victoria, operator queue, analytics, campaigns, audiences |
| Phase 4 | ⏳ Pending approval | shadcn Dialog/Tooltip/Sheet, full table system, form system |

---

## Page status at a glance

| Page | Status | Frozen? | Notes |
|---|---|---|---|
| `/` (Command Hub) | ✅ Complete | — | Exempt — standalone full-screen |
| `/ai-agent` | ✅ Complete | — | Motion pending (Phase 2B) |
| `/clients` | ✅ Complete | — | Modal motion pending (Phase 2B) |
| `/reports` | ✅ Complete | — | View modal motion pending (Phase 2B) |
| `/revenue-dashboard` | ✅ Complete | — | Sub-pages inherited via SectionCard |
| `/revenue-dashboard/clients/[clientId]` | 🔒 Frozen | ✅ | Custom StatCard exception |
| `/clients/[id]` | 🔍 Audited | — | Large, partially done, Phase 3 |
| `/ai-agent/console` | ⏳ Pending | — | Complex — Phase 3 only |
| `/settings` | 🔒 Frozen | ✅ | Auth + integrations — never in a UI pass |
| `/login` | 🔒 Frozen | ✅ | Auth page |
| `/victoria` | ⏳ Pending | — | Live AI session — Phase 3 only |
| `/operator-queue` | ⏳ Pending | — | Complex — Phase 3 |
| `/analytics` | ⏳ Pending | — | Phase 3 |
| `/campaigns` | ⏳ Pending | — | Phase 3 |
| `/approvals` | ⏳ Pending | — | Phase 3 |
| `/creatives` | ⏳ Pending | — | Phase 3 |
| `/audiences` | ⏳ Pending | — | Phase 3 — small, quick |

---

## Critical rules (never break)

1. **Never expose tokens or log credentials** — enforced in every API route
2. **Never write to Meta Ads API** — the portal is read-only
3. **`resolveServerRole()` before any data access** — in every API route
4. **Mock fallback is mandatory** — app must render without DB
5. **Frozen pages are frozen** — settings, login, revenue-client-detail, never touched in UI passes

---

## Adding a new shadcn component

```bash
pnpm dlx shadcn add tooltip
```

Then immediately:
1. Open `src/app/globals.css` — check if `--background`, `--foreground`, or `--primary` were injected
2. Remove any injected vars that shadow `--t-*` tokens
3. Apply Vault Co colors to the component's variant map (reference `COLORS` from design-principles.ts)
4. Run `pnpm run build`
5. Add an entry to `SHADCN_RULES.installed` in `component-rules.ts`
6. Update `DESIGN_SYSTEM.md`

---

## Updating an audit entry

When a page redesign is complete, update its `PAGE_AUDIT` entry in `page-audit.ts`:

```typescript
// Before starting work:
approved: true,
status: "in-progress",

// After work is complete and build passes:
status: "complete",
completedPhase: "phase-3",
completedWork: [...existing, "What you actually did"],
pendingWork: [],
```

This is the paper trail. Keep it current.
