#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Hermes QA — fast, READ-ONLY static safety scan for Vault Core (Phase 6.9).
//
// Run:  node scripts/hermes-qa.mjs
//
// This is Hermes's automated first pass — the deterministic checks that don't
// need Codex (secrets, role guards, mutation risk, mock fallback, GHL safety).
// Build / typecheck / lint are run separately by the Hermes QA skill
// (`pnpm build`, `pnpm lint`). Codex provides the second-opinion review on top.
//
// Read-only: scans files, edits nothing. Exit code 1 if any P0 is found (so it
// can gate CI), else 0. Never prints secret values.
// ─────────────────────────────────────────────────────────────

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

const findings = []; // { sev: "P0"|"P1"|"P2"|"P3", check, detail }
const add = (sev, check, detail) => findings.push({ sev, check, detail });

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(full, filter, out);
    } else if (filter(full)) out.push(full);
  }
  return out;
}
const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } };
const rel = (f) => path.relative(ROOT, f);

// ── 1. Secrets: no tracked .env, no hardcoded keys, no NEXT_PUBLIC secret misuse
function checkSecrets() {
  for (const f of [".env", ".env.local", ".env.production"]) {
    // .gitignore should cover these; flag only if they exist AND are tracked is hard here —
    // we just note presence as a reminder (not a P0 unless committed; git check is in the skill).
    if (fs.existsSync(path.join(ROOT, f))) add("P3", "secrets", `${f} present locally — ensure it is gitignored (it is by .env*).`);
  }
  const codeFiles = walk(SRC, (f) => /\.(ts|tsx|mjs|js)$/.test(f));
  const secretRe = /(eyJ[A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9]{20,}|pit-[A-Za-z0-9-]{20,})/;
  const npPublicSecret = /NEXT_PUBLIC_[A-Z_]*(KEY|SECRET|TOKEN)/;
  for (const f of codeFiles) {
    const body = read(f);
    if (secretRe.test(body)) add("P0", "secrets", `Possible hardcoded secret in ${rel(f)}`);
    for (const line of body.split("\n")) {
      const m = npPublicSecret.exec(line);
      if (m && !/ANON_KEY/.test(line)) add("P0", "secrets", `NEXT_PUBLIC secret misuse in ${rel(f)}: ${m[0]}`);
    }
  }
}

// ── 2. Role guards: every /api/core route handler calls resolveServerRole
function checkRoleGuards() {
  const apiCore = path.join(SRC, "app/api/core");
  const routes = walk(apiCore, (f) => f.endsWith("route.ts"));
  for (const f of routes) {
    const body = read(f);
    if (!/resolveServerRole/.test(body)) add("P0", "role-guard", `Missing resolveServerRole in ${rel(f)}`);
    if (!/can\(auth\.role|auth\.role ===|isCronAuthorized/.test(body)) add("P1", "permission", `No explicit permission/secret check in ${rel(f)}`);
  }
  return routes.length;
}

// ── 3. GHL safety: client must be GET-only; no mutation verbs
function checkGhlSafety() {
  const ghl = walk(path.join(SRC, "lib/core/integrations/ghl"), (f) => f.endsWith(".ts"));
  for (const f of ghl) {
    const body = read(f);
    if (/method:\s*["'](POST|PUT|PATCH|DELETE)/i.test(body)) add("P0", "ghl-safety", `GHL client uses a mutation verb in ${rel(f)} — must be GET-only`);
  }
}

// ── 4. No external mutation anywhere in src/lib/core (outbound non-GET fetch)
function checkCoreMutations() {
  const core = walk(path.join(SRC, "lib/core"), (f) => f.endsWith(".ts"));
  for (const f of core) {
    const body = read(f);
    // Outbound mutation = method: POST/PUT/PATCH/DELETE in a module that fetches an external URL.
    if (/method:\s*["'](POST|PUT|PATCH|DELETE)/i.test(body) && /https?:\/\//.test(body)) {
      add("P1", "mutation", `Outbound non-GET request in ${rel(f)} — verify it is not a client-system mutation`);
    }
  }
}

// ── 5. Mock fallback present in the memory/collab DB layers
function checkMockFallback() {
  const dbFiles = [
    "lib/core/memory/db.ts",
    "lib/core/collab/db.ts",
    "lib/core/agents/veronica/drafts.ts",
  ].map((p) => path.join(SRC, p));
  for (const f of dbFiles) {
    if (!fs.existsSync(f)) continue;
    const body = read(f);
    if (!/buildMock|mock|return \[\]|fallback/i.test(body)) add("P1", "mock-fallback", `No obvious mock fallback in ${rel(f)}`);
  }
}

// ── 6. Drafts must never send (no outbound send in drafts module)
function checkDraftSafety() {
  const f = path.join(SRC, "lib/core/agents/veronica/drafts.ts");
  if (fs.existsSync(f)) {
    const body = read(f);
    if (/sendSms|sendMessage|twilio|\/messages\b.*POST|sendDraft/i.test(body)) add("P0", "draft-safety", `Draft module appears to send — drafts must never send in Phase 6`);
  }
}

// ── run ───────────────────────────────────────────────────────
checkSecrets();
const routeCount = checkRoleGuards();
checkGhlSafety();
checkCoreMutations();
checkMockFallback();
checkDraftSafety();

const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
findings.sort((a, b) => order[a.sev] - order[b.sev]);
const counts = findings.reduce((m, x) => ((m[x.sev] = (m[x.sev] || 0) + 1), m), {});

console.log("─".repeat(60));
console.log("Hermes QA — static safety scan (read-only)");
console.log("─".repeat(60));
console.log(`/api/core routes scanned: ${routeCount}`);
console.log(`Findings: P0=${counts.P0 || 0}  P1=${counts.P1 || 0}  P2=${counts.P2 || 0}  P3=${counts.P3 || 0}`);
console.log("");
if (findings.length === 0) {
  console.log("✓ No static safety findings. (Still run: pnpm build, pnpm lint, + Codex review.)");
} else {
  for (const x of findings) console.log(`  [${x.sev}] ${x.check}: ${x.detail}`);
}
console.log("");
console.log("Next: `pnpm build` · `pnpm lint` · Codex review (see docs/codex-review-prompts.md)");

process.exit((counts.P0 || 0) > 0 ? 1 : 0);
