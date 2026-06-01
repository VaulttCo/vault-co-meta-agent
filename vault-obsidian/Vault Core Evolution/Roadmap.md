---
title: "Vault Core — Evolution Roadmap"
created: 2026-05-31
tags: [roadmap, vault-core]
---

# Vault Core — Evolution Roadmap

The long-term objective: a self-improving business operating system + a permanent
organizational brain (Vault Memory + Obsidian).

## Layers
1. **Vault Memory** — permanent intelligence layer ✅ (Phase 1)
2. **Workforce Agents** — specialized executives ◐ (Vega + Victoria + Valerie + Vanessa active; 2 stubs)
3. **Collaboration Engine** — agents exchange knowledge ✅ (Phase 3)
4. **Command Hub** — human review & approval ✅ (Phase 2 Part 1)
5. **Portal Systems** — dashboards, tools, reports ◐ (pre-existing portal)
6. **System Creation Engine** — designs future systems ◐ (V1, Phase 3)

## Shipped

- **Phase 1** — [[ADR-0001-vault-core-architecture]]: Vault Memory, runtime, Vega, knowledge graph.
- **Phase 2 Part 1** — [[ADR-0002-command-hub-integration]]: recommendation workflow + traceability.
- **Phase 2 Part 2** — [[ADR-0003-obsidian-cognitive-layer]]: cognitive vault + skills.
- **Phase 3** — [[ADR-0004-workforce-collaboration-engine]]: Victoria activated, Collaboration
  Engine, Reputation + Objectives, System Creation Engine V1.
- **Phase 4** — [[ADR-0005-financial-intelligence-layer]]: Valerie activated, Financial
  Intelligence Layer (revenue trends, payment risk, partner earnings), Valerie↔Vega collaboration.
- **Phase 5** — [[ADR-0006-executive-oversight-layer]]: Vanessa activated, Executive Oversight
  Layer (Priority Engine, Daily Executive Brief, Executive Queue), prioritizes across the workforce.

## Next (proposed order)

1. **Activate executive #5/#6** — Veronica (Lead Acquisition) + Vivian (Operations): read-only cycles.
2. **Collaboration depth** — multi-round agent dialogue across all executives.
3. **System Creation Engine V2** — data-aware gap detection (not a single canned proposal).
4. **Knowledge graph depth** — filter/search/expand-collapse, Memory Timeline, dedup.
5. **Obsidian runtime bridge** — optionally let the runtime auto-generate briefings into the
   vault (revisit [[ADR-0003-obsidian-cognitive-layer]] "Runtime → GitHub/Storage").

## Invariants (never break)

- Vault Memory is the source of truth; Obsidian strengthens understanding, never replaces it.
- Read / analyze / recommend only. Human approval is mandatory. No external writes.
- Mock fallback must always keep the system functional without a database.
- Veronica Design governs every interface ([[Veronica-Design-Standards]]).

## Related
- [[_Index]]
