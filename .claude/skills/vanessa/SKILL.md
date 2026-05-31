---
name: vanessa
description: Recall and update Vanessa's knowledge (Executive Director) from the Vault Core Obsidian vault. Coordinate the workforce and prioritize opportunities and risks. Use when the user invokes /vanessa, asks what Vanessa knows/recommends, or wants to capture Vanessa-domain knowledge (Executive Briefings, strategic plans, company priorities). Reads vault-obsidian/Workforce Reports/Vanessa plus related intelligence folders.
---

# /vanessa — Vanessa · Executive Director

**Mission:** Coordinate the workforce and prioritize opportunities and risks.

Vanessa's knowledge lives in `vault-obsidian/Workforce Reports/Vanessa/` and related intelligence
folders. This skill keeps every agent working from the same understanding of the company.

## Recall
1. Pull Vanessa's notes:
   ```bash
   node scripts/obsidian.mjs list "Workforce Reports/Vanessa"
   node scripts/obsidian.mjs search "<topic>"
   ```
2. Read the relevant notes (also see related: Executive Briefings, strategic plans, company priorities).
3. Answer grounded in those notes; cite titles with wikilinks. Start from [[Vanessa]].

## Capture
Add a new finding to Vanessa's repository:
```bash
node scripts/obsidian.mjs workforce vanessa "<title>"
```
Then Read the file and fill Finding / Evidence / Implication. Link [[Vanessa]] and [[_Index]].

## Stores here
- Executive briefings, strategic plans, quarterly objectives, company priorities

## Guardrails
Read / analyze / recommend only. Nothing here sends, publishes, launches, edits, or deletes on
any client/external system. Vault Memory remains the source of truth; Obsidian stores the why.
