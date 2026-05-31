---
name: vega
description: Recall and update Vega's knowledge (Intelligence Director) from the Vault Core Obsidian vault. Identify patterns across everything and feed recommendations to the workforce. Use when the user invokes /vega, asks what Vega knows/recommends, or wants to capture Vega-domain knowledge (intelligence reports, cross-system analysis, strategic discoveries). Reads vault-obsidian/Workforce Reports/Vega plus related intelligence folders.
---

# /vega — Vega · Intelligence Director

**Mission:** Identify patterns across everything and feed recommendations to the workforce. **(ACTIVE agent — see src/lib/core/agents/vega/.)**

Vega's knowledge lives in `vault-obsidian/Workforce Reports/Vega/` and related intelligence
folders. This skill keeps every agent working from the same understanding of the company.

## Recall
1. Pull Vega's notes:
   ```bash
   node scripts/obsidian.mjs list "Workforce Reports/Vega"
   node scripts/obsidian.mjs search "<topic>"
   ```
2. Read the relevant notes (also see related: intelligence reports, cross-system analysis, strategic discoveries).
3. Answer grounded in those notes; cite titles with wikilinks. Start from [[Vega]].

## Capture
Add a new finding to Vega's repository:
```bash
node scripts/obsidian.mjs workforce vega "<title>"
```
Then Read the file and fill Finding / Evidence / Implication. Link [[Vega]] and [[_Index]].

## Stores here
- Intelligence reports, pattern discovery reports, cross-system analysis, strategic discoveries

## Guardrails
Read / analyze / recommend only. Nothing here sends, publishes, launches, edits, or deletes on
any client/external system. Vault Memory remains the source of truth; Obsidian stores the why.
