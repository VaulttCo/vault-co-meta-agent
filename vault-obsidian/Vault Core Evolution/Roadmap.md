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
2. **Workforce Agents** — specialized executives ◐ (Vega active; 5 stubs)
3. **Collaboration Engine** — agents exchange knowledge ☐
4. **Command Hub** — human review & approval ✅ (Phase 2 Part 1)
5. **Portal Systems** — dashboards, tools, reports ◐ (pre-existing portal)
6. **System Creation Engine** — designs future systems ☐

## Shipped

- **Phase 1** — [[ADR-0001-vault-core-architecture]]: Vault Memory, runtime, Vega, knowledge graph.
- **Phase 2 Part 1** — [[ADR-0002-command-hub-integration]]: recommendation workflow + traceability.
- **Phase 2 Part 2** — [[ADR-0003-obsidian-cognitive-layer]]: this cognitive vault + skills.

## Next (proposed order)

1. **Activate executive #2** — Valerie (Financial) or Victoria (Marketing): real read-only
   analysis cycles writing nodes/recommendations like Vega.
2. **Layer 3 — Collaboration Engine** — agents read each other's outputs (Victoria's hook →
   Veronica's messaging → Vega's measurement → Vanessa's briefing).
3. **Layer 6 — System Creation Engine** — agents propose missing systems/dashboards/workflows
   to the Command Hub as structured proposals.
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
