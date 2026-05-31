---
name: obsidian-note
description: Create a general note in the Vault Core Obsidian vault (vault-obsidian/) in a chosen folder. Use when the user wants to capture knowledge that isn't a session log, ADR, or research entry — "save a note about X", "document this in Obsidian", "/obsidian-note". Keeps organizational knowledge as portable markdown.
---

# /obsidian-note — capture a note

## Steps
1. Pick the right folder (run `node scripts/obsidian.mjs tree` if unsure). Common targets:
   `System Design`, `Product Roadmaps`, `Meeting Notes`, `SOP Library`, `Workflow Documentation`,
   `Command Hub Decisions`, `Marketing Intelligence`, `Sales Intelligence`, `Financial Intelligence`.
2. Create the note:
   ```bash
   node scripts/obsidian.mjs new "<Folder Name>" "<note title>"
   ```
3. Read it and fill Context / Notes / Related. Add wikilinks (`[[_Index]]`, related notes).

## Notes
- For session summaries use `/obsidian-session`, decisions use `/obsidian-architecture`,
  research use `/obsidian-research`, and per-executive knowledge use the executive skills.
- Filenames are auto-slugified; the command errors if the note already exists.
