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
2. **Workforce Agents** — specialized executives ◐ (Vega + Victoria + Valerie active; 3 stubs)
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

## Next (proposed order)

1. **Activate executive #4** — Veronica (Lead Acquisition) or Vivian (Operations): read-only cycles.
2. **Collaboration depth** — multi-round agent dialogue; Vanessa synthesizes joint recommendations.
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
