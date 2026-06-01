---
title: "ADR-0005: Valerie activation + Financial Intelligence Layer"
status: accepted
created: 2026-05-31
tags: [adr, vault-core, phase-4, financial, valerie]
---

# ADR-0005: Valerie activation + Financial Intelligence Layer

- **Status:** accepted
- **Date:** 2026-05-31
- **Owner:** Nick (admin)
- **Related systems:** Valerie, Vault Memory, Command Hub, Collaboration Engine, revenue data

## Decision

Activate **Valerie** (Financial Director) as the 3rd runnable executive and add a Financial
Intelligence Layer.

- **Read-only data:** `client_monthly_revenue_snapshots` (closed-won revenue, partner splits,
  `stripe_invoice_status`, `review_status`) + `client_revenue_settings`, via a dedicated reader
  (`valerie/data.ts`) with mock fallback to `clients.stats`.
- **Analysis:** revenue concentration, payment risk (at-risk invoice statuses), partner-earnings
  clarity, month-over-month signal.
- **8 new financial node categories:** `financial_insight`, `revenue_trend`, `payment_risk`,
  `failed_payment_signal`, `partner_earnings_signal`, `forecast_signal`, `client_revenue_signal`,
  `commission_signal`. Edge vocabulary extended with `related_to` + `supports`.
- **Outputs:** financial nodes/edges/activity + a financial recommendation into the Command Hub
  lifecycle; opens a Vega collaboration on anomalies (existing orchestrator advances it).
- **UI:** `/recommendations` source-agent filter + revenue-impact display; Command Hub revenue
  badge; `/workforce` + `/vault-memory` pick up Valerie automatically.

## Reason

The workforce needs financial oversight. Valerie makes revenue/payment risk legible and routes it
through the same human-approval pipeline as every other recommendation.

## Alternatives considered

- **Direct Stripe integration / actions** — hard-rejected. Valerie is strictly read/analyze/
  recommend. She never touches Stripe, sends invoices, charges, refunds, or moves money.
- **New financial approval pipeline** — rejected: reuse the existing recommendation lifecycle.
- **Runtime Obsidian writes** — rejected per [[ADR-0003-obsidian-cognitive-layer]]; Valerie's
  reports are captured via the `/valerie` skill.

## Tradeoffs

- Without the revenue tables, Valerie runs on mock-derived figures (clients.stats) — directionally
  useful, not exact. MoM analysis is limited until multiple billing months exist.

## Impact

Third active executive; Financial Intelligence operational. Human approval remains mandatory; no
financial action is ever automated.

## Related
- [[ADR-0001-vault-core-architecture]] · [[ADR-0002-command-hub-integration]] · [[ADR-0004-workforce-collaboration-engine]]
- [[Valerie]] · [[Vega]] · [[Roadmap]] · [[_Index]]
