---
title: "ADR-0004: Workforce Collaboration Engine + Victoria activation"
status: accepted
created: 2026-05-31
tags: [adr, vault-core, phase-3, collaboration]
---

# ADR-0004: Workforce Collaboration Engine + Victoria activation

- **Status:** accepted
- **Date:** 2026-05-31
- **Owner:** Nick (admin)
- **Related systems:** Workforce, Collaboration Engine, Reputation, Objectives, System Creation Engine, Command Hub

## Decision

Transform Vault Core from independent agents into a **collaborating workforce**.

- **Activate Victoria** as the 2nd runnable executive (read-only creative/campaign analysis →
  content/hook insights + recommendations, and opens collaborations).
- **Collaboration Engine** = 5 new tables (`agent_messages`, `agent_tasks`, `agent_collaborations`,
  `agent_objectives`, `agent_reputation`) + an orchestrator that advances open collaborations
  into joint recommendations (Victoria discovers → requests Vega analysis → joint rec → Command Hub).
- **Reputation + Objectives** computed/seeded per executive and surfaced on `/workforce`.
- **System Creation Engine V1** = `vault_system_proposals` table + `/proposals` console; agents
  propose improvements to Vault Core itself for human approval.

## Reason

The workforce should behave like departments inside a company — sharing discoveries, requesting
analysis, and producing collective recommendations. Reputation/objectives make value legible.

## Alternatives considered

- **Real competitor scraping for Victoria** — rejected: violates read-only/no-external-calls and
  we lack those data sources. Victoria analyzes available creative/campaign data instead.
- **Auto-build approved proposals** — rejected. A proposal approval signals intent for a human/
  engineer; nothing is built or executed automatically.
- **Runtime Obsidian writes for Victoria** — rejected per [[ADR-0003-obsidian-cognitive-layer]]
  (Vercel read-only FS). Discoveries go to Vault Memory; Obsidian capture stays skill-driven (`/victoria`).

## Tradeoffs

- The collaboration orchestrator advances collaborations deterministically (DB-mode only); it
  self-guards to mock mode so seeded data is never mutated. Richer multi-round dialogue is future work.

## Impact

First true collaboration layer. Vault Memory remains the source of truth; human approval remains
mandatory across recommendations and proposals.

## Related
- [[ADR-0001-vault-core-architecture]] · [[ADR-0002-command-hub-integration]] · [[ADR-0003-obsidian-cognitive-layer]]
- [[Victoria]] · [[Vega]] · [[Roadmap]] · [[_Index]]
