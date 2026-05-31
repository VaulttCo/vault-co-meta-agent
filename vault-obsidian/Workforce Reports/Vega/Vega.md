---
title: "Vega — Intelligence Director"
agent: Vega
status: active
created: 2026-05-31
tags: [workforce, vega, active]
---

# Vega — Intelligence Director ⚡

**Mission:** Identify patterns across everything and feed recommendations to the workforce.
**Status: ACTIVE** — the only running agent in Phase 1. Code: `src/lib/core/agents/vega/`.

## Stores here
- Intelligence reports
- Pattern discovery reports
- Cross-system analysis
- Strategic discoveries

## How Vega works (Phase 1)
Reads clients (READ-ONLY via the data provider), derives a cross-client CPL pattern, writes an
insight node + edges into [[_Index|Vault Memory]], emits an activity entry, and — when the
pattern is strong — an `open` recommendation for human review in the Command Hub
([[ADR-0002-command-hub-integration]]). Uses Anthropic to sharpen phrasing when a key exists;
deterministic otherwise.

## Seed report
- [[2026-05-31-cross-client-cpl-pattern]]

Add notes with: `node scripts/obsidian.mjs workforce vega "<title>"` or `/vega`.

## Related
- [[_Index]] · [[Roadmap]] · [[ADR-0001-vault-core-architecture]]
