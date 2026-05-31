---
name: veronica
description: Recall and update Veronica's knowledge (Lead Acquisition Director) from the Vault Core Obsidian vault. Understand why leads convert. Use when the user invokes /veronica, asks what Veronica knows/recommends, or wants to capture Veronica-domain knowledge (Sales Intelligence, lead/booking/follow-up insights). Reads vault-obsidian/Workforce Reports/Veronica plus related intelligence folders.
---

# /veronica — Veronica · Lead Acquisition Director

**Mission:** Understand why leads convert.

Veronica's knowledge lives in `vault-obsidian/Workforce Reports/Veronica/` and related intelligence
folders. This skill keeps every agent working from the same understanding of the company.

## Recall
1. Pull Veronica's notes:
   ```bash
   node scripts/obsidian.mjs list "Workforce Reports/Veronica"
   node scripts/obsidian.mjs search "<topic>"
   ```
2. Read the relevant notes (also see related: Sales Intelligence, lead/booking/follow-up insights).
3. Answer grounded in those notes; cite titles with wikilinks. Start from [[Veronica]].

## Capture
Add a new finding to Veronica's repository:
```bash
node scripts/obsidian.mjs workforce veronica "<title>"
```
Then Read the file and fill Finding / Evidence / Implication. Link [[Veronica]] and [[_Index]].

## Stores here
- Lead intelligence, booking insights, follow-up discoveries, conversation patterns

## Guardrails
Read / analyze / recommend only. Nothing here sends, publishes, launches, edits, or deletes on
any client/external system. Vault Memory remains the source of truth; Obsidian stores the why.
