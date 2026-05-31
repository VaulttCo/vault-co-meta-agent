---
name: obsidian-summary
description: Produce a synthesized summary of a topic by reading across the Vault Core Obsidian vault (vault-obsidian/). Use when the user wants an overview that spans multiple notes — "summarize what we know about X", "give me the state of the Command Hub", "/obsidian-summary". Read-only synthesis across the cognitive vault.
---

# /obsidian-summary — synthesize across the vault

## Steps
1. Gather sources:
   ```bash
   node scripts/obsidian.mjs search "<topic>"
   ```
   (Also `tree` / `list <folder>` to scope a section.)
2. Read the relevant notes with the Read tool.
3. Write a concise synthesis: current state, key decisions (cite `[[ADR-...]]`), open questions,
   and next steps. Cross-reference [[Roadmap]] for sequencing.
4. Offer to persist the summary as a note (`/obsidian-note` → `Executive Briefings`) if useful.

## Notes
- Read-only by default. Distinguish what is documented vs. what is inferred.
