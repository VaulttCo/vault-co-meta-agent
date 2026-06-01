---
title: "Valerie — Financial Director"
agent: Valerie
status: active
created: 2026-05-31
tags: [workforce, valerie, active]
---

# Valerie — Financial Director 💰

**Mission:** Protect and grow financial performance.
**Status: ACTIVE** — activated in Phase 4 ([[ADR-0005-financial-intelligence-layer]]).
Code: `src/lib/core/agents/valerie/`. Reads `client_monthly_revenue_snapshots` +
`client_revenue_settings` **READ-ONLY** (mock fallback to `clients.stats`), surfaces revenue
trends, payment risk, partner-earnings clarity, and concentration risk, and **opens a
collaboration** requesting Vega's cross-system confidence on anomalies.

> **Strictly read / analyze / recommend.** Valerie never touches Stripe, sends invoices, charges,
> refunds, moves money, or modifies any revenue record. Humans decide.

## Seed report
- [[2026-05-31-payment-risk-and-concentration]]

## Stores here
- Revenue reports
- Financial reviews
- Forecasting notes
- Commission analysis

## Tasks (when activated)
Monitor Stripe · track invoices · monitor commissions · detect anomalies · analyze revenue trends.

Add notes with: `node scripts/obsidian.mjs workforce valerie "<title>"` or `/valerie`.

## Related
- [[_Index]] · [[Vega]] · [[Roadmap]]
