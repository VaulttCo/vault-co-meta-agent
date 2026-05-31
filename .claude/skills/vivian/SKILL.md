---
name: vivian
description: Recall and update Vivian's knowledge (Operations Director) from the Vault Core Obsidian vault. Increase operational efficiency. Use when the user invokes /vivian, asks what Vivian knows/recommends, or wants to capture Vivian-domain knowledge (SOP Library, Workflow Documentation, operational audits). Reads vault-obsidian/Workforce Reports/Vivian plus related intelligence folders.
---

# /vivian — Vivian · Operations Director

**Mission:** Increase operational efficiency.

Vivian's knowledge lives in `vault-obsidian/Workforce Reports/Vivian/` and related intelligence
folders. This skill keeps every agent working from the same understanding of the company.

## Recall
1. Pull Vivian's notes:
   ```bash
   node scripts/obsidian.mjs list "Workforce Reports/Vivian"
   node scripts/obsidian.mjs search "<topic>"
   ```
2. Read the relevant notes (also see related: SOP Library, Workflow Documentation, operational audits).
3. Answer grounded in those notes; cite titles with wikilinks. Start from [[Vivian]].

## Capture
Add a new finding to Vivian's repository:
```bash
node scripts/obsidian.mjs workforce vivian "<title>"
```
Then Read the file and fill Finding / Evidence / Implication. Link [[Vivian]] and [[_Index]].

## Stores here
- SOPs, process maps, workflow improvements, operational audits

## Guardrails
Read / analyze / recommend only. Nothing here sends, publishes, launches, edits, or deletes on
any client/external system. Vault Memory remains the source of truth; Obsidian stores the why.
