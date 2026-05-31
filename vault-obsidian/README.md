---
title: "Vault Core — Obsidian Cognitive Vault"
created: 2026-05-31
tags: [vault, readme]
---

# Vault Core — Obsidian Cognitive Vault

This folder is the **cognitive memory layer** of Vault Core. Open it directly as an
Obsidian vault (`Open folder as vault` → select `vault-obsidian/`).

## Source of truth rule

> **Vault Memory stores intelligence. Obsidian stores understanding.**

| | Vault Memory (`vault_*` tables) | Obsidian (this folder) |
|---|---|---|
| Answers | *What does the company know?* | *Why does the company know it?* |
| Holds | Nodes, edges, recommendations, influence, operational memory | Context, reasoning, history, decisions, documentation |
| Lives in | Supabase (+ mock fallback) | Git-versioned markdown |

Obsidian **never replaces** Vault Memory. It exists to strengthen workforce context,
continuity, and long-term understanding across development sessions and agent iterations.

## Why this exists

Large AI systems lose context. Long-running projects accumulate architecture decisions,
naming decisions, strategic decisions, design standards, session history, research, and
lessons learned. None of that should depend on chat history. This vault is the **permanent
project memory layer** — human-readable markdown, no proprietary formats, no vendor lock-in,
fully searchable, fully AI-readable, fully portable.

A workforce agent joining Vault Core years from now should read this vault + Vault Memory and
immediately understand why the company exists, how systems work, why decisions were made, what
has been learned, and what should happen next.

## How agents use it

All reads/writes go through the CLI so every agent writes notes the same way:

```bash
node scripts/obsidian.mjs search "knowledge graph"
node scripts/obsidian.mjs adr "Adopt durable job queue"
node scripts/obsidian.mjs session "Phase 3 kickoff"
node scripts/obsidian.mjs workforce vega "Cross-client CPL pattern"
node scripts/obsidian.mjs tree
```

Claude Code skills wrap these commands:
`/obsidian-search`, `/obsidian-note`, `/obsidian-summary`, `/obsidian-session`,
`/obsidian-architecture`, `/obsidian-research`, and per-executive recall:
`/veronica` `/victoria` `/vivian` `/valerie` `/vega` `/vanessa`.

## Structure

See [[_Index]] for the full map of content.
