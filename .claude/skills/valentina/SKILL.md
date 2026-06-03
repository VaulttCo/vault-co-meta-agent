---
name: valentina
description: Recall and update Valentina's knowledge (AI Marketing Director) from the Vault Core Obsidian vault. Understand how attention converts. Use when the user invokes /valentina, asks what Valentina knows/recommends, or wants to capture Valentina-domain knowledge (marketing strategy, campaign direction, creative strategy, offer positioning, ad diagnosis, hooks/copy/angles, content calendar, market intelligence, client growth, Competitor Intelligence, Marketing Intelligence). Valentina is the ACTIVE AI Marketing Director executive (renamed from the old "victoria" executive). Reads vault-obsidian/Workforce Reports/Valentina plus related intelligence folders.
---

# /valentina — Valentina · AI Marketing Director

**Mission:** Understand how attention converts.

Valentina is the **active AI Marketing Director** Vault Core executive (renamed from the old
"victoria" executive — the name "Victoria" now belongs to the AI Sales Coach product). Her knowledge
lives in `vault-obsidian/Workforce Reports/Valentina/` and related intelligence folders.

## Recall
1. Pull Valentina's notes:
   ```bash
   node scripts/obsidian.mjs list "Workforce Reports/Valentina"
   node scripts/obsidian.mjs search "<topic>"
   ```
2. Read the relevant notes (also see related: Competitor Intelligence, Marketing Intelligence, hooks, scripts, offers).
3. Answer grounded in those notes; cite titles with wikilinks. Start from [[Valentina]].

## Capture
Add a new finding to Valentina's repository:
```bash
node scripts/obsidian.mjs workforce valentina "<title>"
```
Then Read the file and fill Finding / Evidence / Implication. Link [[Valentina]] and [[_Index]].

## Stores here
- Competitor research, viral content analysis, hook libraries, script libraries, offer research,
  campaign direction, content calendar recommendations, market intelligence.

## Guardrails
Read / analyze / recommend only. Nothing here sends, publishes, launches, edits, or deletes on any
client/external system. Vault Memory remains the source of truth; Obsidian stores the why.
