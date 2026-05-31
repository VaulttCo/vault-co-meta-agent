---
title: "Veronica Design Standards"
created: 2026-05-31
tags: [design, standards, veronica-design]
---

# Veronica Design Standards

Veronica Design is the **official design authority** for Vault Core. No interface ships without
compliance. The canonical source is `DESIGN_SYSTEM.md` in the repo root; this note is the
cognitive-layer summary so agents share one understanding of the visual language.

## Direction

Premium SaaS · Executive Mission Control · AI Operating System · Dark mode first ·
Glass architecture · High information density · Premium motion · Operational transparency ·
Intelligence traceability · Human oversight.

> The user should feel like they are operating a living intelligence organization — not
> reviewing tickets inside a CRM.

## Core tokens (from `globals.css`)

- **Blue** `#0081f2` — primary: active nav, CTAs, glow accents, icon rings
- **Orange** `#ff8400` — add/submit, warnings, recommendations
- **Gold** `#c9a84c` — revenue/earnings only
- **Green** `#22c55e` — live/active/success
- **Purple** `#a78bfa` — Victoria, skills, implemented state
- **Cyan** `#22d3ee` — Vega / intelligence
- Surfaces: `--t-bg #05070B`, `--t-surface #0D1520`, `--t-surface-2 #0f1a28`
- Text: `--t-text #f8f8f7`, `--t-muted #6b7a99`, `--t-dim #3d4f6e`

**Rule:** never hardcode surface/border hex in className — use `var(--t-*)` tokens or the
`vc-*` CSS classes so light mode doesn't break.

## Primitives

Single source of truth: `src/components/ui/VaultUI.tsx` —
`VCPanel`, `VCPanelHeader`, `VCStat`, `VCStatusBadge`, `VCChip`, `VCButton`, `VCEmptyState`,
`VCPageWrapper`, `VCSectionLabel`, `VCBentoCell`. Use these before writing bespoke markup.

## Applied in Vault Core

- Knowledge graph nodes are styled per category (`src/components/core/categoryStyle.ts`).
- Recommendation status colors live in `src/components/core/recommendationStatus.ts`.

## Related
- [[_Index]] · [[Roadmap]]
