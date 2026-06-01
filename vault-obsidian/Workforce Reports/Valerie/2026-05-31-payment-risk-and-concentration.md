---
title: "Payment risk & revenue concentration"
agent: Valerie
created: 2026-05-31
tags: [workforce, valerie, financial, payment-risk]
---

# Payment risk & revenue concentration

> Valerie · seed financial intelligence report

## Finding
Two client invoices are in at-risk states (open / past-due) this cycle (~$7,000 exposed), and
tracked revenue is concentrated — the top client represents ~41% of revenue.

## Evidence
Read-only review of `client_monthly_revenue_snapshots` (closed-won revenue, `stripe_invoice_status`,
`review_status`, partner splits) with mock fallback to `clients.stats`. No Stripe calls were made.

## Implication
- **Cash-flow risk:** at-risk invoices warrant a human review of collection status. Valerie cannot
  send or charge — review only.
- **Dependency risk:** high single-client concentration suggests reviewing diversification.

Both surfaced as Command Hub recommendations for human approval; Vega was asked to corroborate the
payment-risk signal before a joint recommendation.

## Related
- [[Valerie]] · [[Vega]] · [[ADR-0005-financial-intelligence-layer]] · [[_Index]]
