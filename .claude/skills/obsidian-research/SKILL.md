---
name: obsidian-research
description: Capture research findings into the Vault Core Obsidian vault (vault-obsidian/Research, or Competitor/Marketing/Sales/Financial Intelligence). Use when summarizing investigation, evaluations, competitor analysis, or reference findings — "save this research", "document what we found about X", "/obsidian-research". Preserves the reasoning behind future decisions.
---

# /obsidian-research — capture research

## Steps
1. Choose the destination folder by topic:
   - General/technical → `Research`
   - Competitors → `Competitor Intelligence`
   - Hooks/creative/offers → `Marketing Intelligence`
   - Objections/booking → `Sales Intelligence`
   - Revenue/forecasting → `Financial Intelligence`
2. Create the note:
   ```bash
   node scripts/obsidian.mjs new "<Folder Name>" "<research title>"
   ```
3. Read it and record: the question, what was found, sources, and the implication for Vault Core.
4. Link related notes and `[[_Index]]`. If it informs a decision, follow with `/obsidian-architecture`.

## Notes
- Summarize and cite — keep findings portable and AI-readable for future agents.
