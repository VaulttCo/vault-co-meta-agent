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

Vera/Vesper run in **two** always-on places — both fail-open, both backend-only,
neither approves/rejects/implements anything:

1. **Future recommendations (insert-time gate)** — wired into **`insertRecommendation`**
   (`src/lib/core/memory/db.ts`), the single chokepoint every agent uses. It runs
   after an agent produces a candidate and before the row is saved, applying to
   **every** active agent (Vega, Veronica, Valentina, Valerie, Vanessa, **Vivian**).
   Fail-open: if the gate or the live read throws, the recommendation is kept.

2. **Current recommendations (end-of-tick hygiene pass)** — `runRecommendationHygiene()`
   (`src/lib/core/recommendations/hygiene.ts`) runs at the **end of every Vault
   Core tick** (wired in `dispatcher.ts`, after all agents). It re-reviews the
   **existing open** recommendations using full Vault Memory context and applies
   **soft, reversible** metadata only — never changing `status`, never deleting,
   never erasing evidence. A hygiene error never fails the tick.

Surviving rows are always `pending_review` — **human approval is unchanged**.

## Safe Vault Memory context

Both paths can read a **bounded, non-PII** memory context via
`buildRecommendationMemoryContext` (`src/lib/core/recommendations/memory-context.ts`):
related open recommendations, related memory nodes/edges, recent agent activity,
prior (resolved/merged) actions for the same client/topic, duplicate candidates,
and stale/contradiction indicators. It is capped (max related recs/nodes/edges/
activity) and returns only ids, categories, labels, summaries, and timestamps —
**never** raw credentials, GHL contacts/payloads, emails/phones/messages, Stripe
secrets, Meta tokens, env values, or giant graph blobs. The insert-time gate uses
a lightweight context (open recs only); the hygiene pass uses the full context
(open recs + graph + activity). When context is unavailable, scoring continues
recommendation-only.

## Soft visibility (keeps Mission Control high-signal)

The hygiene pass classifies each current recommendation as `keep_visible`,
`merge_into_existing`, `suppress_from_mission_control`, `downgrade_priority`,
`needs_human_review`, or `stale_archive_candidate`, and writes it to
`metadata.hygiene` (classification, visibility, reason, mergeTargetId,
relatedRecommendationIds, `reviewedBy: ["vera","vesper"]`, `neverAutoExecute`).
Items marked `visibility: "hidden"` are excluded from Mission Control's count
(`getRecommendationCounts().mission_visible`) — **soft and reversible**; the full
recommendations queue still shows every row for human review/audit. A single
auditable hygiene summary is written to the activity feed each pass.

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
