---
title: "2026-06-01 — Hermes QA: Phase 6.9 (Hermes + Codex bridge)"
created: 2026-06-01
tags: [session, qa, hermes, phase-6-9]
---

# Hermes QA — Phase 6.9 (Hermes + Codex bridge)

First QA cycle, run on Phase 6.9 itself (using the Hermes output format).

## Summary
Added the Hermes QA + Codex second-opinion review system. Dev-ops layer only — no production runtime
behavior changed. Verdict: **ready to ship.**

## What changed
Hermes QA skill (`/hermes-qa`), deterministic scan (`scripts/hermes-qa.mjs`), Codex setup + prompts +
playbook docs, Obsidian QA system doc + [[ADR-0010-Hermes-Codex-QA]]. No `src/` runtime files changed.

## Files reviewed
`.claude/skills/hermes-qa/SKILL.md` · `scripts/hermes-qa.mjs` · `docs/hermes-codex-qa.md` ·
`docs/codex-review-prompts.md` · `docs/vault-core-qa-playbook.md` · Obsidian QA docs + ADR-0010.

## Status
- **Build:** ✓ clean (76 routes, unchanged)
- **Typecheck:** ✓ no errors
- **Lint:** ✓ clean (new files)
- **Security:** ✓ Hermes scan P0=0 (no secrets, no NEXT_PUBLIC misuse)
- **Role guards:** ✓ 16/16 `/api/core` routes guarded
- **Mock fallback:** ✓ present in memory/collab/drafts layers
- **Runtime:** ✓ unchanged — `src/` not modified
- **DB migrations:** n/a (no schema change)
- **UI risk:** n/a (no UI change)

## Codex findings
Codex CLI not installed in this environment (EACCES on global install; plugin add is a user action) →
**manual fallback documented**. Recommended Codex pass before the next production deploy:
`codex exec --sandbox read-only "<Vault Core audit prompt>"` (see `docs/codex-review-prompts.md`).

## Severity classification
- **P0:** none
- **P1:** none
- **P2:** Run a Codex adversarial + security pass on the full Vault Core surface before the next deploy.
- **P3:** Install Codex CLI (`@openai/codex`) via a user-writable npm prefix or `sudo`.

## Required fixes
None.

## Recommended fixes
Install `@openai/codex` (P3) and run the security + deployment review prompts once (P2).

## Deferred improvements
Optional Claude Code `codex-plugin-cc` integration once plugin install is available in-environment.

## Deployment readiness verdict
**READY.** No runtime change; build clean; safety invariants intact. (Reminder: push to `origin/main`
from your terminal — the harness commits with a lag and the sandbox can't push.)

## Related
- [[Hermes QA System]] · [[ADR-0010-Hermes-Codex-QA]] · [[_Index]] · [[Roadmap]]
