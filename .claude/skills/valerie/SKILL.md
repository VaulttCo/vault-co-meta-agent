---
name: valerie
description: Recall and update Valerie's knowledge (Financial Director) from the Vault Core Obsidian vault. Protect and grow financial performance. Use when the user invokes /valerie, asks what Valerie knows/recommends, or wants to capture Valerie-domain knowledge (Financial Intelligence, revenue, forecasting, commissions). Reads vault-obsidian/Workforce Reports/Valerie plus related intelligence folders.
---

# /valerie — Valerie · Financial Director

**Mission:** Protect and grow financial performance.

Valerie's knowledge lives in `vault-obsidian/Workforce Reports/Valerie/` and related intelligence
folders. This skill keeps every agent working from the same understanding of the company.

## Recall
1. Pull Valerie's notes:
   ```bash
   node scripts/obsidian.mjs list "Workforce Reports/Valerie"
   node scripts/obsidian.mjs search "<topic>"
   ```
2. Read the relevant notes (also see related: Financial Intelligence, revenue, forecasting, commissions).
3. Answer grounded in those notes; cite titles with wikilinks. Start from [[Valerie]].

## Capture
Add a new finding to Valerie's repository:
```bash
node scripts/obsidian.mjs workforce valerie "<title>"
```
Then Read the file and fill Finding / Evidence / Implication. Link [[Valerie]] and [[_Index]].

## Stores here
- Revenue reports, financial reviews, forecasting notes, commission analysis

## Guardrails
Read / analyze / recommend only. Nothing here sends, publishes, launches, edits, or deletes on
any client/external system. Vault Memory remains the source of truth; Obsidian stores the why.
