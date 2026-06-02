---
title: "Vault Core — Evolution Roadmap"
created: 2026-05-31
tags: [roadmap, vault-core]
---

# Vault Core — Evolution Roadmap

The long-term objective: a self-improving business operating system + a permanent
organizational brain (Vault Memory + Obsidian).

## Layers
1. **Vault Memory** — permanent intelligence layer ✅ (Phase 1)
2. **Workforce Agents** — specialized executives ◐ (Vega + Victoria + Valerie + Vanessa + Veronica active; 1 stub: Vivian)
3. **Collaboration Engine** — agents exchange knowledge ✅ (Phase 3)
4. **Command Hub** — human review & approval ✅ (Phase 2 Part 1)
5. **Portal Systems** — dashboards, tools, reports ◐ (pre-existing portal)
6. **System Creation Engine** — designs future systems ◐ (V1, Phase 3)

## Shipped

- **Phase 1** — [[ADR-0001-vault-core-architecture]]: Vault Memory, runtime, Vega, knowledge graph.
- **Phase 2 Part 1** — [[ADR-0002-command-hub-integration]]: recommendation workflow + traceability.
- **Phase 2 Part 2** — [[ADR-0003-obsidian-cognitive-layer]]: cognitive vault + skills.
- **Phase 3** — [[ADR-0004-workforce-collaboration-engine]]: Victoria activated, Collaboration
  Engine, Reputation + Objectives, System Creation Engine V1.
- **Phase 4** — [[ADR-0005-financial-intelligence-layer]]: Valerie activated, Financial
  Intelligence Layer (revenue trends, payment risk, partner earnings), Valerie↔Vega collaboration.
- **Phase 5** — [[ADR-0006-executive-oversight-layer]]: Vanessa activated, Executive Oversight
  Layer (Priority Engine, Daily Executive Brief, Executive Queue), prioritizes across the workforce.
- **Phase 6** — [[ADR-0007-conversation-intelligence-layer]]: Veronica activated, Conversation
  Intelligence Layer, GHL read-only integration, Draft Approval Queue (drafts never sent).
- **Phase 6.5** — Veronica Design production pass + Vault Co brand lock (Command Hub as executive
  home base; removed "Layer N" jargon; consistent loading skeletons). No new features.
- **Phase 6.6** — [[ADR-0008-production-deployment-readiness]]: Vercel deployment prep — security
  audit (no committed secrets), env-var + SQL-order + route-verification docs, deployment guide.
  **Ready to deploy** (rotate the GHL key first).
- **Phase 6.8** — [[ADR-0009-Vault-Co-GHL-Scopes]]: [[Vault Co Identity Core]] + legacy Vault Co GHL
  read-only learning archive (current + legacy accounts only; no client scanning). Messaging
  intelligence + improvement recommendations; `/vault-core/identity` view.
- **Phase 6.9** — [[ADR-0010-Hermes-Codex-QA]]: [[Hermes QA System]] + Codex second-opinion review
  (dev-ops layer; not a business executive). `/hermes-qa` skill + `scripts/hermes-qa.mjs` + Codex
  prompts/playbook. No production runtime change.

## Recommendation — Victoria / Valentina role split (SPEC ONLY)

See `docs/valentina-marketing-director-spec.md`. Corrected naming:
- **Victoria = AI Sales Coach** (live sales-call product: Fathom/live-listen, rep coaching,
  objection detection, call summaries, deal risk, follow-up coaching, sales-training intelligence).
- **Valentina = AI Marketing Director** (marketing strategy, Meta/Google campaign direction, creative
  strategy, offer positioning, ad diagnosis, hooks/copy/angles, content calendar, market intelligence,
  client growth recs, coordination with Veronica for campaign drafts).

The active executive currently registered as `victoria` (title "Marketing Director") performs the
**Valentina** role. **Spec only for now — NOT activated, NO runtime change.** The rename/activation is
deferred to a future phase (see the spec's activation checklist). Recommend doing this BEFORE
activating Vivian so the workforce naming is correct first.

## Next (proposed order)

1. **Activate Vivian** (Operations) — the last stub: SOPs, bottlenecks, onboarding (read-only).
2. **Reposition Victoria → Valentina (AI Marketing Director)** and scope Victoria to AI Sales Coach
   — execute `docs/valentina-marketing-director-spec.md` (spec ready; not started).
2. **Collaboration depth** — multi-round agent dialogue across all six executives.
3. **System Creation Engine V2** — data-aware gap detection (not a single canned proposal).
4. **Outbound (post-Phase 6, gated)** — only after explicit human-in-the-loop send controls;
   currently NO sending exists by design.
4. **Knowledge graph depth** — filter/search/expand-collapse, Memory Timeline, dedup.
5. **Obsidian runtime bridge** — optionally let the runtime auto-generate briefings into the
   vault (revisit [[ADR-0003-obsidian-cognitive-layer]] "Runtime → GitHub/Storage").

## Invariants (never break)

- Vault Memory is the source of truth; Obsidian strengthens understanding, never replaces it.
- Read / analyze / recommend only. Human approval is mandatory. No external writes.
- Mock fallback must always keep the system functional without a database.
- Veronica Design governs every interface ([[Veronica-Design-Standards]]).

## Related
- [[_Index]]
