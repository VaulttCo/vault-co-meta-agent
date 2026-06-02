---
title: "Legacy GHL Messaging Lessons"
created: 2026-06-01
tags: [sales-intelligence, legacy, ghl, messaging, vault-co]
---

# Legacy GHL Messaging Lessons

What Vault Co's **old GHL sub-account** teaches us. Treated as a **read-only learning archive** — no
mutation, no sending. Source: `src/lib/core/identity/legacy.ts` (live legacy data confirms volume;
the durable lessons are curated here). Surfaced into Vault Memory as `legacy_learning` nodes and into
the Command Hub as human-reviewed recommendations.

## What worked (strong patterns)
- **Same-day, specific-time booking offers got replies** — "tomorrow 9am or 1pm?" beat "when works for you?"
- **Real seasonal urgency booked faster** — storm-season references tied to actual weather.

## What failed (weak patterns)
- **"Just following up" texts were ignored** — generic check-ins with no new value or ask were most-ghosted.
- **Multi-question messages reduced replies** — two+ asks lowered response; one clear ask won.

## Objections that repeated
- **"Price seems high"** — historically met with discounts instead of reframing to cost-per-booked-job.
- **"Comparing quotes"** — went cold without a differentiation follow-up.

## Timing lessons
- **Follow-up gaps > 48h → ghosting.**
- **Late missed-call texts lost the lead** — minutes matter, not hours.

## Automation lessons
- **Reactivation flow too aggressive** (daily texts → opt-outs).
- **No human-takeover step** when a lead replied with a question.

## How this is used
Veronica drafts better follow-ups; Vega validates the patterns; Vanessa turns them into company
standards; Victoria sharpens positioning. All outputs are human-reviewed — nothing sends or mutates GHL.

## Related
- [[Vault Co Identity Core]] · [[What Vault Co Should Stop Doing]] · [[What Vault Co Should Double Down On]]
- [[Legacy GHL Automation Map]] · [[ADR-0009-Vault-Co-GHL-Scopes]] · [[_Index]]
