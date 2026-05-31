---
title: "ADR-0003: Obsidian cognitive layer"
status: accepted
created: 2026-05-31
tags: [adr, vault-core, phase-2, obsidian]
---

# ADR-0003: Obsidian cognitive layer

- **Status:** accepted
- **Date:** 2026-05-31
- **Owner:** Nick (admin)
- **Related systems:** Obsidian vault, Claude Code skills, Vault Memory

## Decision

Add a **git-versioned, in-repo Obsidian vault** at `vault-obsidian/` as Vault Core's long-term
cognitive memory, written by **Claude Code skills** (+ a Node CLI), read by the Obsidian app and
by future agents.

- **Location:** `vault-obsidian/` inside the repo — version-controlled, portable, AI-readable.
- **Write surface:** Claude Code skills in `.claude/skills/` calling `scripts/obsidian.mjs`
  (the single canonical engine). The deployed web app does **not** write at runtime.
- **Read surface:** the Obsidian desktop app (`Open folder as vault`) + any agent reading markdown.

## Reason

Obsidian is a local-markdown app; the portal deploys to Vercel serverless (read-only filesystem
at runtime). An in-repo git vault keeps everything portable and auditable, and the skills surface
directly serves the goal: prevent agent drift and let future sessions continue where previous
ones ended. It satisfies "no proprietary formats, no vendor lock-in, searchable, portable,
AI-readable."

## Alternatives considered

- **Runtime → GitHub/Storage** (web app commits markdown via API) — deferred: more infra +
  tokens; revisit if runtime auto-generation from agents is needed.
- **External local vault** outside the repo — rejected: not version-controlled with the code,
  harder for agents to find.
- **In-portal Knowledge viewer ("Both")** — deferred: the user chose Claude Code skills only for
  Phase 2. A read-only portal viewer can be added later.

## Tradeoffs

- Auto-generation is **session-driven** (an agent runs a skill), not continuous from the runtime.
  Acceptable for the cognitive layer, whose purpose is cross-session understanding, not real-time ops.

## Impact

Establishes the permanent organizational brain alongside Vault Memory. See [[README]] for the
source-of-truth rule.

## Related
- [[ADR-0001-vault-core-architecture]] · [[ADR-0002-command-hub-integration]]
- [[Roadmap]] · [[_Index]]
