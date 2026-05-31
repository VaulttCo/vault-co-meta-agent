#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Vault Core — Obsidian vault CLI (Phase 2, Part 2)
//
// The canonical engine for reading/writing the in-repo Obsidian cognitive
// vault at vault-obsidian/. Claude Code skills call this so every agent writes
// notes the same way (same templates, same wikilinks, same frontmatter).
//
// No external dependencies — Node stdlib only. Run from anywhere:
//   node scripts/obsidian.mjs <command> [args]
//
// Commands:
//   search <query...>            Full-text + filename search across the vault
//   new <folder> <title...>      Create a note from the generic template
//   adr <title...>               Scaffold the next-numbered Architecture Decision Record
//   session [title...]           Create today's session log from the template
//   workforce <agent> <title..>  Create a note in an executive's Workforce Reports folder
//   list [folder]                List notes (optionally within a folder)
//   tree                         Print the vault folder structure
//   path                         Print the absolute vault path
// ─────────────────────────────────────────────────────────────

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const VAULT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "vault-obsidian");

const AGENTS = {
  veronica: "Veronica",
  victoria: "Victoria",
  vivian: "Vivian",
  valerie: "Valerie",
  vega: "Vega",
  vanessa: "Vanessa",
};

// ── helpers ───────────────────────────────────────────────────
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function rel(p) {
  return path.relative(VAULT, p);
}

function writeNote(filePath, content) {
  if (fs.existsSync(filePath)) {
    console.error(`✗ Already exists: ${rel(filePath)}`);
    process.exit(1);
  }
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✓ Created ${rel(filePath)}`);
  console.log(filePath);
}

function frontmatter(fields) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) lines.push(`${k}: [${v.join(", ")}]`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

// ── commands ──────────────────────────────────────────────────
function cmdSearch(args) {
  const query = args.join(" ").trim();
  if (!query) {
    console.error("Usage: obsidian.mjs search <query...>");
    process.exit(1);
  }
  const needle = query.toLowerCase();
  const files = walk(VAULT);
  let hits = 0;
  for (const f of files) {
    const name = path.basename(f).toLowerCase();
    const body = fs.readFileSync(f, "utf8");
    const nameHit = name.includes(needle);
    const lines = body.split("\n");
    const matched = lines
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => l.toLowerCase().includes(needle))
      .slice(0, 3);
    if (nameHit || matched.length) {
      hits++;
      console.log(`\n📄 ${rel(f)}`);
      for (const [n, l] of matched) console.log(`   ${n}: ${l.trim().slice(0, 140)}`);
    }
  }
  if (!hits) console.log(`No matches for "${query}".`);
  else console.log(`\n${hits} file(s) matched.`);
}

function cmdNew(args) {
  const folder = args[0];
  const title = args.slice(1).join(" ").trim();
  if (!folder || !title) {
    console.error('Usage: obsidian.mjs new "<Folder Name>" <title...>');
    process.exit(1);
  }
  const dir = path.join(VAULT, folder);
  const file = path.join(dir, `${slugify(title)}.md`);
  const content =
    frontmatter({ title: `"${title}"`, created: today(), tags: ["note"] }) +
    `# ${title}\n\n> Created ${nowIso()}\n\n## Context\n\n## Notes\n\n## Related\n- [[_Index]]\n`;
  writeNote(file, content);
}

function cmdAdr(args) {
  const title = args.join(" ").trim();
  if (!title) {
    console.error("Usage: obsidian.mjs adr <title...>");
    process.exit(1);
  }
  const dir = path.join(VAULT, "Architecture Decisions");
  ensureDir(dir);
  const existing = fs
    .readdirSync(dir)
    .map((f) => /^ADR-(\d+)/.exec(f))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
  const next = (existing.length ? Math.max(...existing) : 0) + 1;
  const num = String(next).padStart(4, "0");
  const file = path.join(dir, `ADR-${num}-${slugify(title)}.md`);
  const content =
    frontmatter({ title: `"ADR-${num}: ${title}"`, status: "proposed", created: today(), tags: ["adr"] }) +
    `# ADR-${num}: ${title}\n\n` +
    `- **Status:** proposed\n- **Date:** ${today()}\n- **Owner:** \n- **Related systems:** \n\n` +
    `## Decision\n\n## Reason\n\n## Alternatives considered\n\n## Tradeoffs\n\n## Impact\n\n## Related\n- [[_Index]]\n`;
  writeNote(file, content);
}

function cmdSession(args) {
  const title = args.join(" ").trim() || "Development session";
  const dir = path.join(VAULT, "Session Logs");
  ensureDir(dir);
  const file = path.join(dir, `${today()}-${slugify(title)}.md`);
  const content =
    frontmatter({ title: `"${today()} — ${title}"`, created: today(), tags: ["session"] }) +
    `# ${today()} — ${title}\n\n> Logged ${nowIso()}\n\n` +
    `## Summary\n\n## Completed work\n\n## Files modified\n\n## Decisions made\n\n` +
    `## Problems encountered\n\n## Solutions implemented\n\n## Next steps\n\n` +
    `## Related\n- [[_Index]]\n- [[Roadmap]]\n`;
  writeNote(file, content);
}

function cmdWorkforce(args) {
  const agent = (args[0] || "").toLowerCase();
  const title = args.slice(1).join(" ").trim();
  if (!AGENTS[agent] || !title) {
    console.error(`Usage: obsidian.mjs workforce <${Object.keys(AGENTS).join("|")}> <title...>`);
    process.exit(1);
  }
  const dir = path.join(VAULT, "Workforce Reports", AGENTS[agent]);
  const file = path.join(dir, `${today()}-${slugify(title)}.md`);
  const content =
    frontmatter({ title: `"${title}"`, agent: AGENTS[agent], created: today(), tags: ["workforce", agent] }) +
    `# ${title}\n\n> ${AGENTS[agent]} · ${nowIso()}\n\n## Finding\n\n## Evidence\n\n## Implication\n\n` +
    `## Related\n- [[${AGENTS[agent]}]]\n- [[_Index]]\n`;
  writeNote(file, content);
}

function cmdList(args) {
  const folder = args.join(" ").trim();
  const base = folder ? path.join(VAULT, folder) : VAULT;
  const files = walk(base);
  if (!files.length) {
    console.log(folder ? `No notes in ${folder}.` : "Vault is empty.");
    return;
  }
  for (const f of files) console.log(rel(f));
  console.log(`\n${files.length} note(s).`);
}

function cmdTree() {
  function print(dir, prefix = "") {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => !e.name.startsWith("."))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    entries.forEach((e, i) => {
      const last = i === entries.length - 1;
      console.log(prefix + (last ? "└── " : "├── ") + e.name);
      if (e.isDirectory()) print(path.join(dir, e.name), prefix + (last ? "    " : "│   "));
    });
  }
  console.log("vault-obsidian/");
  print(VAULT);
}

// ── dispatch ──────────────────────────────────────────────────
const [, , command, ...rest] = process.argv;

if (!fs.existsSync(VAULT) && command !== "path") {
  console.error(`Vault not found at ${VAULT}. Create it first (see vault-obsidian/README.md).`);
  process.exit(1);
}

switch (command) {
  case "search": cmdSearch(rest); break;
  case "new": cmdNew(rest); break;
  case "adr": cmdAdr(rest); break;
  case "session": cmdSession(rest); break;
  case "workforce": cmdWorkforce(rest); break;
  case "list": cmdList(rest); break;
  case "tree": cmdTree(); break;
  case "path": console.log(VAULT); break;
  default:
    console.log(
      [
        "Vault Core — Obsidian CLI",
        "",
        "Usage: node scripts/obsidian.mjs <command> [args]",
        "",
        "  search <query...>           Search the vault",
        '  new "<Folder>" <title...>   New note from template',
        "  adr <title...>              New Architecture Decision Record",
        "  session [title...]          New session log for today",
        "  workforce <agent> <title>   New note in an executive's folder",
        "  list [folder]               List notes",
        "  tree                        Print folder structure",
        "  path                        Print the vault path",
        "",
        `Agents: ${Object.keys(AGENTS).join(", ")}`,
      ].join("\n")
    );
    if (command && command !== "help") process.exit(1);
}
