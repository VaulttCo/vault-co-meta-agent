---
title: "ADR-0010: Hermes QA + Codex bridge"
status: accepted
created: 2026-06-01
tags: [adr, vault-core, phase-6-9, qa, hermes, codex]
---

# ADR-0010: Hermes QA + Codex bridge

- **Status:** accepted
- **Date:** 2026-06-01
- **Owner:** Nick (admin)
- **Related systems:** Development workflow, Codex, Obsidian, Command Hub

## Decision

Add **Hermes** as a Build Operations & QA Director — a **development/QA layer** that coordinates a
second-opinion review loop. **Claude Code builds · Codex audits · Hermes coordinates.**

- **Hermes is not a business executive** and is **not** added to the Vault Core workforce registry or
  runtime. It changes **no production runtime behavior**.
- **Codex** = the official OpenAI CLI `@openai/codex` (and optional `codex-plugin-cc` Claude Code
  bridge). Read-only reviews; edits only on explicit human approval.
- **Deterministic scan**: `scripts/hermes-qa.mjs` checks secrets, role guards, GHL GET-only, core
  mutations, mock fallback, and draft-safety. `pnpm build` + `pnpm lint` cover compile/typecheck/lint.
- **Skill**: `/hermes-qa` runs the loop and writes a QA session note to Obsidian.
- **Findings → Command Hub**: optionally become system proposals / operator tasks, human-approved.

## Reason

As Vault Core grows (live on Vercel; 5 active executives; financial, conversation, and executive
intelligence), a single builder is a single point of failure for missed bugs, security issues, and
deploy risks. A coordinated build-then-audit loop with an independent reviewer (Codex) reduces
regressions before production, while keeping humans in control of every change.

## Alternatives considered

- **Auto-applying Codex fixes** — rejected. All fixes require human approval; Codex defaults read-only.
- **Making Hermes a runtime agent** — rejected. Hermes is dev-ops; adding it to the workforce would
  change runtime behavior and blur the business/dev boundary.
- **Unofficial "codex" packages** — rejected. Only the official `@openai/codex` / `codex-plugin-cc`
  are used; verified against the npm registry before any install.

## Environment notes

In this environment the global Codex install hit a permissions wall (`/usr/local/lib`, no root) and
the plugin marketplace add is a user action — so the **manual fallback** is documented and the phase
is not blocked: Hermes runs the deterministic scan + build + lint and asks the user to run Codex in
their terminal, then summarizes the findings.

## Safety

Hermes/Codex never expose/commit secrets, add auto-send, add GHL/Stripe mutation, bypass approvals,
weaken role guards, remove mock fallback, modify production data, or trigger client-facing actions.

## Related
- `docs/hermes-codex-qa.md` · `docs/codex-review-prompts.md` · `docs/vault-core-qa-playbook.md`
- [[Hermes QA System]] · [[ADR-0008-production-deployment-readiness]] · [[Roadmap]] · [[_Index]]
