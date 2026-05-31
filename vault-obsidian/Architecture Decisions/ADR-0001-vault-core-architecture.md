---
title: "ADR-0001: Vault Core Phase 1 architecture"
status: accepted
created: 2026-05-31
tags: [adr, vault-core, phase-1]
---

# ADR-0001: Vault Core Phase 1 architecture

- **Status:** accepted
- **Date:** 2026-05-31
- **Owner:** Nick (admin)
- **Related systems:** Vault Memory, Continuous Runtime, Knowledge Graph, Vega

## Decision

Build Vault Core Phase 1 as an **end-to-end vertical slice**:
`existing data → Vega agent cycle → Vault Memory (nodes/edges) → 24/7 runtime → Knowledge Graph + Activity feed`.

- **Vault Memory** = 5 Postgres tables (`vault_nodes`, `vault_edges`, `vault_activity`,
  `vault_recommendations`, `vault_agent_runs`) with a mandatory **mock fallback**.
- **Runtime** = **Vercel Cron + Upstash** (scheduled `/api/core/tick` per tier, Upstash locks).
- **Graph** = **React Flow** (`@xyflow/react`) radial "digital brain", styled with Veronica Design.
- **Workforce** = six executives registered; only **Vega** active, the rest metadata stubs.

## Reason

A thin but complete loop proves the whole architecture (data → agent → memory → UI) before
scaling to all six agents. Vercel Cron + Upstash is the lowest-infra path that is genuinely
always-on. React Flow gives custom-styled nodes with native zoom/pan/minimap.

## Alternatives considered

- **Memory/data layer first** or **graph UI first** — rejected: wouldn't prove the loop.
- **Durable jobs (Inngest/Trigger.dev)** — deferred: adds a third-party service; revisit if
  agent chains need retries/step functions.
- **Cytoscape / D3** — rejected for Phase 1: less native-React styling than React Flow.

## Tradeoffs

- Vercel **Hobby** only fires daily crons; sub-hourly tiers need **Pro** (or an external pinger).
- Best-effort Upstash locks (small check-then-set window) — fine for minutes-apart cron tiers.

## Impact

Establishes the foundation every later phase builds on. Vault Memory is the source of truth.

## Related
- [[ADR-0002-command-hub-integration]]
- [[ADR-0003-obsidian-cognitive-layer]]
- [[Roadmap]] · [[Vega]] · [[_Index]]
