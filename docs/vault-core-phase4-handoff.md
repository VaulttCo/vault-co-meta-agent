# Vault Core — Phase 4 Handoff

**Status:** shipped, build clean (71 routes), lint clean. Fully functional with **zero database** (mock fallback preserved). Verified live: Vega + Victoria + **Valerie** all run on the hourly tick. Decision record: `ADR-0005` (Obsidian vault).

Phase 4 activates **Valerie** (Financial Director) as the third runnable executive and adds the **Financial Intelligence Layer**. `ai-agent/console/page.tsx` was not touched.

---

## What was built

| Area | Files |
|---|---|
| Node categories | `src/lib/core/types.ts` — 8 financial categories + `related_to`/`supports` edges |
| Styles | `src/components/core/categoryStyle.ts` — financial palette (gold/amber/red) |
| Financial reader | `src/lib/core/agents/valerie/data.ts` — reads `client_monthly_revenue_snapshots` + `client_revenue_settings` (READ-ONLY); mock fallback to `clients.stats` |
| Valerie agent | `src/lib/core/agents/valerie/index.ts` — analysis → financial nodes/edges/activity/recommendation + Vega collaboration |
| Activation | `registry.ts` (`valerie.active = true`) + `agents/index.ts` (runnable) |
| Mock seed | `memory/mock-graph.ts` (financial nodes + Valerie rec), `collab/mock.ts` (active reputation, 6 objectives, Valerie↔Vega collaboration/messages/task) |
| UI | `/recommendations` source-agent filter + revenue-impact chip; Command Hub revenue badge |
| Obsidian | `Valerie.md` → active + seeded `2026-05-31-payment-risk-and-concentration.md`; `ADR-0005`; roadmap/_Index |

## What Valerie does (read / analyze / recommend only)
Reads internal revenue snapshots + settings and surfaces: **revenue concentration**, **payment risk** (at-risk `stripe_invoice_status`: open/past_due/failed/uncollectible/unpaid), **partner-earnings clarity** (Nick/Jaxon splits), and concentration risk. Writes financial nodes (`revenue_trend`, `payment_risk`, `partner_earnings_signal`) + activity, generates a **financial recommendation** into the Command Hub lifecycle, and on an anomaly **opens a Vega collaboration** (the existing orchestrator advances it to a joint recommendation).

## Hard safety rules — enforced
Valerie **never** touches Stripe, sends invoices, charges, refunds, moves money, modifies revenue records, or takes any external/financial action. She only reads, analyzes, recommends, and writes Vault Memory / activity / collaboration / Command Hub records. Every recommendation flows through human approval. Verified: no Stripe client, no mutation calls anywhere in `valerie/`.

## Live verification (mock mode, no DB)
`GET /api/core/tick?tier=hourly` (CRON_SECRET) →
- vega: success · victoria: success · **valerie: success — "Reviewed 4 snapshots, 2 at-risk, 42% concentration"**
- collaboration cycle self-guards to mock (processed 0, no errors)

## Setup for live mode
Run the Phase 1–3 SQL; Valerie reads the **existing** `client_monthly_revenue_snapshots` + `client_revenue_settings` tables (no new tables needed for Phase 4). Without them, mock fallback derives figures from `clients.stats`.

## Success criteria — all met
Valerie activated ✔ · Financial Intelligence operational ✔ · financial memory nodes ✔ · financial recommendations ✔ · flow to Command Hub ✔ · active in /workforce ✔ · financial nodes in /vault-memory ✔ · Valerie↔Vega collaboration ✔ · reputation/objectives visible ✔ · Obsidian support ✔ · no Stripe mutation ✔ · no client-side actions ✔ · human approval mandatory ✔ · mock fallback preserved ✔ · build clean ✔

## Deferred (Roadmap)
Activate executive #4 (Veronica/Vivian) · multi-round collaboration dialogue · System Creation Engine V2 · MoM forecasting once multiple billing months exist.
