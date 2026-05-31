---
name: obsidian-search
description: Search the Vault Core Obsidian cognitive vault (vault-obsidian/) for prior context — architecture decisions, session history, design standards, research, workforce reports, strategic plans. Use when the user asks "what did we decide about X", "have we documented Y", "what do we know about Z", "/obsidian-search", or before making a decision that might already have an ADR or prior note. Prevents agent drift by grounding work in the permanent project memory.
---

# /obsidian-search — recall from the cognitive vault

The Obsidian vault at `vault-obsidian/` is Vault Core's permanent project memory (the "why").
Vault Memory (`vault_*` tables) is the "what". Before answering questions about past decisions,
reasoning, or documentation, search the vault first — never reconstruct it from chat history.

## Steps
1. Run the search:
   ```bash
   node scripts/obsidian.mjs search "<query terms>"
   ```
2. Read the most relevant returned files with the Read tool to get full context.
3. Answer grounded in what you found, citing note titles (e.g. `[[ADR-0001-vault-core-architecture]]`).
4. If nothing matches and the knowledge clearly should exist, say so and offer to capture it
   (`/obsidian-note`, `/obsidian-architecture`, or `/obsidian-research`).

## Notes
- Try a few query phrasings — the search matches filenames and content.
- `node scripts/obsidian.mjs tree` shows the full structure; `list <folder>` lists a section.
- Read-only. This skill never modifies the vault.
