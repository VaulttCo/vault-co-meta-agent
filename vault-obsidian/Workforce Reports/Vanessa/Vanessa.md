---
title: "Vanessa — Executive Director"
agent: Vanessa
status: active
created: 2026-05-31
tags: [workforce, vanessa, active]
---

# Vanessa — Executive Director 🧭

**Mission:** Coordinate the workforce and convert intelligence into executive priorities.
**Status: ACTIVE** — activated in Phase 5 ([[ADR-0006-executive-oversight-layer]]).
Code: `src/lib/core/agents/vanessa/`. Vanessa is the Executive Oversight Layer: she synthesizes
Vega/Victoria/Valerie outputs, runs the Priority Engine, generates the Daily Executive Brief,
sets executive priority on open recommendations, and pushes the top item to the Command Hub.

> **Read / analyze / prioritize / recommend only.** Vanessa never sends, publishes, launches,
> deletes, or modifies any client/Stripe system. Humans decide.

## Seed brief
- [[2026-05-31-daily-executive-brief]]

## Stores here
- Executive briefings
- Strategic plans
- Quarterly objectives
- Company priorities

## Tasks (when activated)
Review all recommendations · prioritize opportunities and risks · generate executive summaries ·
coordinate workforce focus.

Add notes with: `node scripts/obsidian.mjs workforce vanessa "<title>"` or `/vanessa`.

## Related
- [[_Index]] · [[Vega]] · [[Roadmap]]
