---
title: "ADR-0006: Vanessa activation + Executive Oversight Layer"
status: accepted
created: 2026-05-31
tags: [adr, vault-core, phase-5, executive, vanessa]
---

# ADR-0006: Vanessa activation + Executive Oversight Layer

- **Status:** accepted
- **Date:** 2026-05-31
- **Owner:** Nick (admin)
- **Related systems:** Vanessa, Vault Memory, Command Hub, Collaboration Engine, Priority Engine

## Decision

Activate **Vanessa** (Executive Director) as the 4th runnable executive and add the Executive
Oversight Layer.

- **Priority Engine** (`vanessa/priority.ts`, pure): scores recommendations across priority,
  influence, confidence, financial risk, cross-agent support, and review need → levels
  `critical | high | medium | low | watch`.
- **Daily Executive Brief** (`vanessa/brief.ts`, pure): synthesizes recommendations, proposals,
  activity, reputation, and collaborations into a structured brief. Computed fresh by the
  `/api/core/executive-brief` endpoint AND persisted as an `executive_brief` node by Vanessa's run
  (so the API and the stored record agree).
- **8 new executive node categories:** `executive_brief`, `executive_priority`,
  `strategic_recommendation`, `risk_summary`, `opportunity_summary`,
  `workforce_performance_summary`, `decision_support_brief`, `company_priority`.
- **Recommendation prioritization:** `vanessa_priority` + `priority_reason` columns
  (phase5 SQL ALTER); Vanessa sets these on open recommendations each cycle.
- **Executive Queue + Daily Brief card** on the Command Hub; executive-priority filter +
  badges + reason on `/recommendations`; brief preview on `/workforce`.

## Reason

The workforce needed an oversight layer to reduce decision overload — surfacing *what matters*
rather than every output — while keeping Vault Memory the source of truth and humans in control.

## Alternatives considered

- **Separate executive-brief table** — rejected: briefs are stored as `executive_brief` nodes
  (Vault Memory = source of truth); only the recommendation priority needed new columns.
- **Vanessa auto-acting on priorities** — hard-rejected. She prioritizes and recommends only.
- **Runtime Obsidian writes** — rejected per [[ADR-0003-obsidian-cognitive-layer]]; briefs are
  captured via the `/vanessa` skill / local generators.

## Tradeoffs

- Vanessa runs hourly (not only daily) for testability + freshness, so a brief node is written
  each cycle (latest = newest). Acceptable for V1; a dedup/daily-collapse is future work.

## Impact

Fourth active executive; Executive Oversight operational. Human approval remains mandatory; no
external actions are ever automated.

## Related
- [[ADR-0004-workforce-collaboration-engine]] · [[ADR-0005-financial-intelligence-layer]]
- [[Vanessa]] · [[Roadmap]] · [[_Index]]
