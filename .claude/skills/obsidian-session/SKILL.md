---
name: obsidian-session
description: Capture a development session summary into the Vault Core Obsidian vault (vault-obsidian/Session Logs) so future sessions and agents can continue where this one ended. Use at the end of a significant work session, when the user says "log this session", "save session notes", "/obsidian-session", or before context is about to be lost. Records completed work, files modified, decisions, problems, solutions, and next steps.
---

# /obsidian-session — persist session memory

Long-running work loses context across sessions. This skill writes a durable session log so the
next agent can pick up seamlessly.

## Steps
1. Scaffold today's log:
   ```bash
   node scripts/obsidian.mjs session "<short session title>"
   ```
   (Prints the created file path.)
2. Open it with the Read tool, then fill every section using the **actual** work from this
   session — do not invent. Sections: Summary, Completed work, Files modified, Decisions made,
   Problems encountered, Solutions implemented, Next steps.
3. Link related notes with wikilinks: `[[_Index]]`, `[[Roadmap]]`, relevant `[[ADR-...]]`.
4. For any significant decision made this session, also create an ADR (`/obsidian-architecture`).

## Notes
- Be specific: list real file paths and real decisions so the log is actionable later.
- If a log for today already exists, append to it rather than creating a duplicate.
