# Vault Co Design System

Premium dark luxury AI command center. Every UI decision should reinforce that Veronica and the Vault Co portal is a serious, high-ticket operating system — not generic SaaS.

---

## Color Tokens

All tokens are defined in `src/app/globals.css` under `@theme inline` and `:root`.

### Brand palette

| Token | Value | When to use |
|---|---|---|
| `--color-vc-blue` / `#0081f2` | Primary blue | Active nav, primary CTAs, glow accents, icon rings |
| `--color-vc-orange` / `#ff8400` | Orange | Add/submit buttons, warning states, onboarding badges |
| `#c9a84c` (amber/gold) | Gold | Revenue dashboard only — partner earnings, leaderboard, priority indicators |
| `#22c55e` | Green | Live/active/success states |
| `#ef4444` | Red | Errors, blocked, urgent priority |
| `#f59e0b` | Amber | Warnings, paused status |
| `#a78bfa` | Purple | Victoria AI, skills, projection badges |

### Surface tokens (theme-aware, respect dark/light mode)

| Token | Dark value | Light value | Usage |
|---|---|---|---|
| `--t-bg` | `#05070B` | `#f7f4f0` | Page background |
| `--t-surface` | `#0D1520` | `#ffffff` | Card/panel background — use `vc-panel` class |
| `--t-surface-2` | `#0f1a28` | `#f9f7f4` | Nested elements (inside panels) |
| `--t-surface-3` | `#152030` | `#f1ede8` | Deeply nested elements |
| `--t-border` | `rgba(0,129,242,0.15)` | `rgba(0,0,0,0.09)` | Default border — use via token, not hardcoded |
| `--t-border-subtle` | `rgba(0,129,242,0.08)` | `rgba(0,0,0,0.05)` | Table row dividers |
| `--t-muted` | `#6b7a99` | `#6b6055` | Secondary text |
| `--t-dim` | `#3d4f6e` | `#a09385` | Placeholder, decorative text |
| `--t-input-bg` | `#0f1a28` | `#f5f2ee` | Form input backgrounds |

**Rule:** Never hardcode `#0D1520` or `rgba(0,129,242,0.15)` directly in a className — use `var(--t-surface)` / `var(--t-border)` or the `vc-panel` CSS class. Light mode otherwise breaks.

---

## Typography

| Use case | Font | Size | Weight |
|---|---|---|---|
| Page/section headings | Rajdhani | 18–26px | 700 |
| KPI stat values | Rajdhani | 22–26px | 700 |
| Body / panel text | Manrope | 12–13px | 400–500 |
| Form labels / section labels | Manrope | 9–10px | 700–800 |
| Table headers | Manrope | 9px | 700 |
| Nav items | Manrope | 13px | 500–600 |

Apply Rajdhani via `fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif"` or the `font-heading` Tailwind token.

---

## CSS Utility Classes

All defined in `src/app/globals.css`. Use these instead of raw Tailwind for consistent overrides.

| Class | What it does |
|---|---|
| `.vc-panel` | Section card: `var(--t-surface)` bg, `var(--t-border)` border, `border-radius: 12px`, `overflow: hidden`, card shadow |
| `.vc-panel-sm` | Same as `vc-panel` with `border-radius: 10px` |
| `.vc-panel-header` | `14px 20px` padding, `border-bottom: 1px solid var(--t-border-subtle)`, flex row, space-between |
| `.vc-stat-card` | Premium stat tile: surface bg, border, `border-radius: 12px`, hover lift + blue glow |
| `.vc-table-row` | Table row: `cursor: pointer`, hover `rgba(0,129,242,0.035)` bg |
| `.vc-filter-pill` | Filter tab: hover and `.active` state included |
| `.vc-input` | Form input: surface bg, border, focus glow ring (no JS needed) |
| `.vc-label` | Form/section label: 9px, 800 weight, uppercase, `var(--t-dim)` |
| `.vc-accent-top` | `::before` pseudo — 1px blue gradient line at top of element (used on Topbar) |
| `.vc-accent-top-gold` | Same in gold (for Revenue Dashboard header elements) |
| `.vc-dot`, `.vc-dot-live`, `.vc-dot-warn`, `.vc-dot-error` | Animated status dot |
| `.vc-btn-orange` | Orange CTA button (hover + glow) |
| `.vc-btn-blue` | Blue button (hover + glow) |
| `.vc-glow` | Blue glow border shadow |
| `.vc-glow-orange` | Orange glow border shadow |
| `.vc-text-blue` | Blue gradient text fill |
| `.vc-text-orange` | Orange gradient text fill |

---

## Component System — `src/components/ui/VaultUI.tsx`

Single import file for all reusable primitives. See inline comments in that file for `Usage` examples.

| Component | Replaces | Notes |
|---|---|---|
| `VCPanel` | `SectionCard`, raw surface divs, `vc-card` class | Primary section wrapper |
| `VCPanelHeader` | Manual header divs | Always first child of `VCPanel` |
| `VCStat` | `StatCard`, inline `StatTile` functions | Single KPI component for all pages |
| `VCStatusBadge` | Ad-hoc inline badge spans | 7 variants; coexists with `Badge.tsx` |
| `VCFilterBar` | Manual filter pill loops | Single-select only |
| `VCSearchInput` | Raw `<input>` + inline `inputStyle` | Uses `vc-input` CSS, no JS focus handler |
| `VCActionLink` | Manual "View all →" links | Always in `VCPanelHeader`'s `action` prop |
| `VCEmptyState` | Manual loading/empty blocks | Pass `loading` or `title`+`description` |
| `VCGlowIcon` | Manual icon ring divs | For intro icons and empty states |
| `VCButton` | Raw `<button>` with inline styles | 3 variants: orange, blue, ghost |
| `VCPriorityDot` | Manual `w-1.5 h-1.5 rounded-full` dots | Exports `priorityColors` map too |
| `VCSectionLabel` | `text-[10px] font-bold uppercase` divs | Wraps `vc-label` class |
| `VCPageWrapper` | `max-w-7xl mx-auto space-y-5` divs | Root wrapper; migrate gradually |

### Shared components that coexist with VaultUI

| Component | File | Notes |
|---|---|---|
| `Badge` | `src/components/ui/Badge.tsx` | 7 pages use it for client/status badges — do not remove |
| `PageHeader` | `src/components/ui/PageHeader.tsx` | Updated: supports `sectionLabel` and `badge` props |
| `StatCard` | `src/components/ui/StatCard.tsx` | Updated: uses `vc-stat-card` class; no active page imports (backup only) |

---

## Known Exceptions (Do Not "Fix" These)

| File | Pattern | Why it's intentional |
|---|---|---|
| `src/app/page.tsx` (Command Hub) | Custom gradient cards, no `vc-panel` | This is a full-screen landing experience, not a dashboard page |
| `revenue-dashboard/clients/[clientId]/page.tsx` | Inline `StatCard` function | Different props: `label/sub/icon/badge`, gold theme, 16 usages — custom for that page |
| `ai-agent/console/page.tsx` | Raw surface divs | Complex interactive console, not yet migrated |
| `settings/page.tsx` | Raw surface divs | Integration auth forms — do not touch |
| `victoria/page.tsx` | Raw surface divs | Live AI session page — do not touch |
| `operator-queue/page.tsx` | Raw surface divs | Complex task management — not yet migrated |
| `clients/[id]/page.tsx` | `inputCls` raw string | Custom input for live-edit fields; uses `#0f1a28` bg intentionally |

---

## Anti-Patterns

**Do not:**
- Hardcode `#0D1520`, `rgba(0,129,242,0.15)`, or `#0f1a28` in new code — use CSS tokens
- Use `onFocus={(e) => Object.assign(e.currentTarget.style, ...)}` — use `vc-input` CSS class
- Define a local `StatTile` or `StatCard` function in a page file — use `VCStat`
- Create a new `SectionCard`-style wrapper — use `VCPanel`
- Add new animations beyond hover/focus/dot-pulse — design is already complete
- Import additional UI libraries (Radix, shadcn, etc.) — all primitives live in VaultUI

**Do:**
- Always use `var(--t-surface)` / `var(--t-border)` for cards if not using `vc-panel`
- Use `font-family: "var(--font-rajdhani)"` for heading elements and stat values
- Keep `space-y-5` (not `space-y-6`) between page sections
- Use `vc-table-row` on every clickable table row — no need for explicit `transition-colors`
- Match mobile breakpoints: stack grids at `sm:` (640px) and reveal sidebar at `lg:` (1024px)

---

## Layout Structure

```
PortalShell (fixed sidebar + topbar)
└── <main> (scrollable, p-4 sm:p-5)
    └── VCPageWrapper  (max-w-7xl mx-auto space-y-5)
        ├── PageHeader (title + sectionLabel + action)
        ├── [stat grid]  (grid grid-cols-2 sm:grid-cols-4 gap-4, VCStat items)
        └── VCPanel
            ├── VCPanelHeader (icon + title + VCActionLink)
            └── [content]
```

The Command Hub (`/`) is a standalone full-screen page with no `PortalShell` wrapper — it is exempt from this structure.

---

## Spacing Reference

| Token | Value | Usage |
|---|---|---|
| Page section gap | `space-y-5` | Between PageHeader, stat grid, panels |
| Panel inner padding | `p-4` or `p-5` | Inside VCPanel content areas |
| Panel header padding | `14px 20px` (vc-panel-header) | Applied by CSS class |
| Table cell padding | `px-4 py-3.5` | Standard table cells |
| Filter bar gap | `gap-1` between pills | VCFilterBar default |
| Stat grid gap | `gap-3` or `gap-4` | Between VCStat tiles |
