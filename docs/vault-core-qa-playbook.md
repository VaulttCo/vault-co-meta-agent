# Vault Core QA Playbook (Hermes)

The operating procedure for QA on Vault Core. Run via the `/hermes-qa` skill. Claude Code builds ·
Codex audits · Hermes coordinates. **No fix is applied without human approval; production runtime
behavior is never changed by QA.**

## When to run (mandatory triggers)
Run a Hermes QA cycle after **any** of:
- A Vault Core phase, or a new executive activation
- GHL / Stripe integration change · Supabase schema change · Vercel/deploy change
- Cron/runtime change · API route change
- Command Hub / approval workflow / draft approval change
- UI production pass · environment-variable change · any security-related change

## The loop
1. **Implement** — Claude Code makes the change.
2. **Scan** — `node scripts/hermes-qa.mjs` (secrets, role guards, GHL GET-only, core mutations, mock
   fallback, draft-safety) + `pnpm build` (compile/typecheck/route count) + `pnpm lint`.
3. **Brief** — Hermes writes the Codex QA brief (what changed, files, review mode).
4. **Review** — Codex read-only review (`docs/codex-review-prompts.md`); manual fallback if Codex
   unavailable (paste findings back).
5. **Classify** — Hermes tags findings P0–P3.
6. **Approve** — human chooses which fixes to apply.
7. **Apply** — Claude Code applies approved fixes; re-run step 2 until clean.
8. **Log** — Hermes writes a QA session note to `vault-obsidian/Session Logs/` (+ `Development QA/`).

## Severity
| Level | Meaning | Action |
|---|---|---|
| **P0** | Blocks deployment (secret leak, missing guard, send/mutation risk, build break) | Fix immediately |
| **P1** | High risk | Fix before production |
| **P2** | Important but shippable | Ship with awareness |
| **P3** | Nice-to-have | Backlog |

## Hermes QA output format
Summary · What changed · Files reviewed · Build status · Typecheck status · Security status ·
Role-guard status · Mock-fallback status · Runtime status · DB-migration status · UI-risk status ·
Codex findings · Severity classification · Required fixes · Recommended fixes · Deferred
improvements · **Deployment readiness verdict**.

## Findings → Command Hub (human-approved)
Turn findings into internal **system proposals** (`/proposals`) or operator tasks. Examples:
fix missing route guard · improve mock fallback · review Supabase migration · validate Vercel cron
security · improve mobile layout · rotate exposed GHL key · verify production env vars · run live
visual QA · improve Vault Core identity docs. **Nothing executes automatically.**

## What QA must never do
Expose/commit secrets · add auto-send · add GHL/Stripe mutation · bypass approvals · weaken role
guards · remove mock fallback · modify production data · trigger client-facing actions.

## Quick reference
- Skill: `/hermes-qa` · Scan: `node scripts/hermes-qa.mjs`
- Setup: `docs/hermes-codex-qa.md` · Prompts: `docs/codex-review-prompts.md`
- Obsidian: `vault-obsidian/Development QA/Hermes QA System.md`, `vault-obsidian/Session Logs/`
