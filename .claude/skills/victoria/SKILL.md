---
name: victoria
description: Recall and update Victoria's knowledge (AI Sales Coach) from the Vault Core Obsidian vault. Use when the user invokes /victoria, asks what Victoria knows/recommends, or wants to capture Victoria-domain knowledge (live sales-call support, rep coaching, objection detection, call summaries, deal risk, follow-up coaching, sales-training intelligence). NOTE: the AI Marketing Director role is being repositioned as Valentina (see docs/valentina-marketing-director-spec.md); legacy marketing-intelligence notes filed under Victoria belong to that Valentina-to-be role. Reads vault-obsidian/Workforce Reports/Victoria plus related folders.
---

# /victoria — Victoria · AI Sales Coach

**Scope:** live sales call support, Fathom/live-listen, rep coaching, objection detection, sales call
summaries, deal risk, follow-up coaching, sales-training intelligence.

> ⚠️ **Role split:** Victoria = **AI Sales Coach**. The **AI Marketing Director** function (campaign
> direction, creative strategy, offer positioning, hooks/copy/angles, content calendar, market
> intelligence) is being repositioned as **Valentina** — see `docs/valentina-marketing-director-spec.md`.
> Any legacy marketing-intelligence notes in this folder describe the Valentina-to-be role; Valentina
> is spec-only (not an active agent yet).

Victoria's knowledge lives in `vault-obsidian/Workforce Reports/Victoria/` and related folders.
This skill keeps every agent working from the same understanding of the company.

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
