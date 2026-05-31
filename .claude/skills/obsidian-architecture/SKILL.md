---
name: obsidian-architecture
description: Record an Architecture Decision Record (ADR) in the Vault Core Obsidian vault (vault-obsidian/Architecture Decisions). Use whenever a significant system, naming, strategic, or design decision is made — "document this decision", "write an ADR", "/obsidian-architecture". Future engineers and workforce agents read ADRs to understand WHY things are the way they are.
---

# /obsidian-architecture — record a decision (ADR)

Every major decision should leave an ADR so the reasoning outlives chat history.

## Steps
1. Scaffold the next-numbered ADR:
   ```bash
   node scripts/obsidian.mjs adr "<decision title>"
   ```
   (Auto-increments ADR-NNNN; prints the path.)
2. Read it, then fill: **Decision, Reason, Alternatives considered, Tradeoffs, Impact**, and set
   Status (`proposed` → `accepted`), Date, Owner, Related systems.
3. Cross-link with `[[ADR-...]]` to related decisions and add `[[_Index]]` + `[[Roadmap]]`.
4. If the decision changes the plan, also update [[Roadmap]] in `Vault Core Evolution/`.

## What counts as ADR-worthy
Architecture, naming conventions, strategic direction, design standards, technology choices,
data-model changes, and anything a future agent would otherwise have to reverse-engineer.

## Notes
- Keep it honest about tradeoffs — the rejected alternatives are as valuable as the choice.
