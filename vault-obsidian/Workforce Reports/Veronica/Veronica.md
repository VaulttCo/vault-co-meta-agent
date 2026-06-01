---
title: "Veronica — Lead Acquisition Director"
agent: Veronica
status: active
created: 2026-05-31
tags: [workforce, veronica, active]
---

# Veronica — Lead Acquisition Director 📞

**Mission:** Understand why leads convert.
**Status: ACTIVE** — activated in Phase 6 ([[ADR-0007-conversation-intelligence-layer]]).
Code: `src/lib/core/agents/veronica/`. Reads lead conversations (GoHighLevel **read-only**, or
mock), surfaces hot leads, dead conversations, missed opportunities, booking patterns, objections,
and no-show risk; drafts follow-up messages for **human approval only**; opens a Vega collaboration
to validate patterns.

> **Read / analyze / recommend / draft only.** Veronica never sends SMS, replies to leads, modifies
> GHL/CRM, books appointments, changes pipeline stages, or triggers workflows. Drafts are never
> sent — a human approves and sends manually.

## Seed report
- [[2026-05-31-sms-booking-pattern]]

## Stores here
- Lead intelligence
- Booking insights
- Follow-up discoveries
- Conversation patterns

## Tasks (when activated)
Analyze SMS conversations · analyze call transcripts · analyze booking rates · detect missed
opportunities · recommend follow-up and nurture improvements · generate conversation intelligence.

Add notes with: `node scripts/obsidian.mjs workforce veronica "<title>"` or `/veronica`.

## Related
- [[_Index]] · [[Vega]] · [[Roadmap]]
