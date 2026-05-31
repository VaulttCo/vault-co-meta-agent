---
name: victoria
description: Recall and update Victoria's knowledge (Marketing Director) from the Vault Core Obsidian vault. Understand why attention converts. Use when the user invokes /victoria, asks what Victoria knows/recommends, or wants to capture Victoria-domain knowledge (Competitor Intelligence, Marketing Intelligence, hooks, scripts, offers). Reads vault-obsidian/Workforce Reports/Victoria plus related intelligence folders.
---

# /victoria — Victoria · Marketing Director

**Mission:** Understand why attention converts.

Victoria's knowledge lives in `vault-obsidian/Workforce Reports/Victoria/` and related intelligence
folders. This skill keeps every agent working from the same understanding of the company.

## Recall
1. Pull Victoria's notes:
   ```bash
   node scripts/obsidian.mjs list "Workforce Reports/Victoria"
   node scripts/obsidian.mjs search "<topic>"
   ```
2. Read the relevant notes (also see related: Competitor Intelligence, Marketing Intelligence, hooks, scripts, offers).
3. Answer grounded in those notes; cite titles with wikilinks. Start from [[Victoria]].

## Capture
Add a new finding to Victoria's repository:
```bash
node scripts/obsidian.mjs workforce victoria "<title>"
```
Then Read the file and fill Finding / Evidence / Implication. Link [[Victoria]] and [[_Index]].

## Stores here
- Competitor research, viral content analysis, hook libraries, script libraries, offer research

## Guardrails
Read / analyze / recommend only. Nothing here sends, publishes, launches, edits, or deletes on
any client/external system. Vault Memory remains the source of truth; Obsidian stores the why.
