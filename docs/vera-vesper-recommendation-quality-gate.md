# Vera + Vesper — Recommendation Quality Gate (backend QA layer)

> **Vera and Vesper are NOT active executives, NOT runtime agents, NOT in
> `ACTIVE_AGENT_IDS`, NOT in `RUNNABLE_AGENTS`, and never appear in the workforce
> ring.** They are backend recommendation-quality concepts implemented as **pure,
> deterministic functions** that run inside the recommendation pipeline. They make
> no external calls, mutate nothing, and never send/launch/charge/contact anyone.

## What they are

| Persona | Role | Implementation |
|---|---|---|
| **Vera** | Recommendation Quality Auditor — is a recommendation useful, specific, clear, safe, evidence-supported, actionable? | `src/lib/core/recommendations/scoring.ts` |
| **Vesper** | Deduplication & Coherence Auditor — does it duplicate / merge with an existing open recommendation? | `src/lib/core/recommendations/dedupe.ts` |
| Gate | Combines Vera + Vesper into one decision | `src/lib/core/recommendations/quality-gate.ts` |

## Where the gate runs

The gate is wired into **`insertRecommendation`** (`src/lib/core/memory/db.ts`) —
the single chokepoint every agent uses to persist a recommendation. It runs
**after** an agent produces a candidate and **before** the row is saved/surfaced,
so it applies uniformly to **every** active agent (Vega, Veronica, Valentina,
Valerie, Vanessa, and **Vivian**). It is **fail-open**: if the gate (or the read of
existing recommendations) throws, the recommendation is kept. Surviving rows are
still created as `pending_review` — **human approval is unchanged**.

## Scoring each candidate

Each candidate receives: `qualityScore`, `duplicateScore`, `confidence`,
`priority`, `actionability`, `safetyStatus`, and a `finalDecision` ∈
`keep | merge | suppress | downgrade | needs_human_review`. The scores are stamped
into the recommendation's `metadata.quality_gate` for traceability.

## How duplicates are detected (Vesper)

Candidates are compared against the current **open** (`pending_review`)
recommendations using normalized token sets of title + body, plus shared
`related_clients` and same `agent`:
- **exact** — same client and near-identical title (same issue + action), or
  identical phrasing → `suppress`.
- **near** — same client or same agent with high body/title overlap → `merge`
  (the existing open recommendation is the canonical; the candidate is folded in
  rather than creating a second row for the same issue).

This prevents recommendation spam — the same issue is not re-created every tick.

## How weak recommendations are handled (Vera)

- **Unsafe wording** that implies the AI executed an external action ("ads
  launched", "budget changed", "invoice sent", "I emailed…") → `needs_human_review`
  (kept and flagged — never silently dropped, and never auto-actioned).
- **Vague / generic / not actionable / no evidence** below threshold → `suppress`.
- **Borderline** quality → `downgrade` (kept, but `priority_score` is reduced so it
  doesn't crowd strong items).
- Otherwise → `keep`.

## Hermes / Codex relationship

- **Hermes** = the QA / dev-ops coordinator. Hermes can **audit** the
  recommendation-quality system (run `scripts/hermes-qa.mjs`, review the gate's
  behavior). Hermes is **not** a business executive and **not** part of the
  recommendation runtime.
- **Codex** = a **manual, read-only second-opinion** audit tool. Codex reviews
  code/design when a human runs it. **Codex is never called from production
  runtime**, and recommendations do **not** require Codex availability to work.
- Vera/Vesper, Hermes, and Codex **none execute external actions**.

## UI

The gate runs server-side and does not persist aggregate counters, so there is
**no** Mission Control panel for it (kept intentionally minimal to avoid clutter).
If surfaced later, it must be labeled **"Backend QA Layer · Not active executives ·
Recommendation quality only"** and must never be added to the active workforce ring.
