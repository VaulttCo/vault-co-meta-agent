---
title: "Hermes QA System"
created: 2026-06-01
tags: [qa, hermes, codex, development, vault-core]
---

# Hermes QA System

**Hermes** is Vault Core's **Build Operations & QA Director** — a development/QA layer, **not** a
business executive and **not** part of the runtime workforce. It coordinates a second-opinion review
loop so bugs, drift, broken routes, weak coverage, security issues, and deployment risks are caught
before production.

> **Claude Code builds · Codex audits · Hermes coordinates.** No fix applies without human approval.
> No production runtime behavior is changed by QA.

## The loop
Implement (Claude Code) → scan + build + lint (Hermes) → Codex read-only review → classify P0–P3 →
human approves fixes → Claude Code applies → re-verify → Hermes logs a session note here / in
`Session Logs`.

## Tooling
- **Codex CLI** — official `@openai/codex` only. Setup + manual fallback: `docs/hermes-codex-qa.md`.
- **Claude Code Codex plugin** — official `codex-plugin-cc` (optional). Manual fallback documented.
- **Hermes scan** — `node scripts/hermes-qa.mjs` (deterministic: secrets, role guards, GHL GET-only,
  core mutations, mock fallback, draft-safety).
- **Skill** — `/hermes-qa`. **Prompts** — `docs/codex-review-prompts.md`. **Playbook** —
  `docs/vault-core-qa-playbook.md`.

## Review modes
Standard · Adversarial · Deployment · Security · UI · Database.

## Severity
P0 blocks deploy · P1 fix before prod · P2 shippable with awareness · P3 nice-to-have.

## Mandatory triggers
Any phase · executive activation · GHL/Stripe change · Supabase schema change · Vercel/deploy change ·
cron/runtime change · API route change · Command Hub/approval/draft change · UI pass · env change ·
security change.

## Safety
Hermes/Codex never expose or commit secrets, add auto-send, add GHL/Stripe mutation, bypass
approvals, weaken role guards, remove mock fallback, modify production data, or trigger client-facing
actions. Codex defaults to read-only.

## Related
- [[ADR-0010-Hermes-Codex-QA]] · [[Roadmap]] · [[_Index]]
- Session notes: `Session Logs/` (e.g. [[2026-06-01-hermes-qa-phase-6-9]])
