# Vault Core — Workforce Roadmap

The canonical, at-a-glance status of the Vault Core workforce. Source of truth for
runtime is `src/lib/core/agents/registry.ts` (`WORKFORCE`, `ACTIVE_AGENT_IDS`) and
`src/lib/core/agents/index.ts` (`RUNNABLE_AGENTS`). This doc must stay consistent
with those files.

## Active Vault Core runtime executives (6)

These are in `ACTIVE_AGENT_IDS` **and** `RUNNABLE_AGENTS`, run in the tick, and are
counted as active. All are **read / analyze / recommend / prioritize only** — they
never send, launch, charge, or mutate external systems; humans approve everything.

| ID | Name | Role |
|---|---|---|
| `vega` | Vega | Intelligence Director |
| `veronica` | Veronica | Lead Acquisition Director |
| `valentina` | Valentina | AI Marketing Director |
| `valerie` | Valerie | Financial Director |
| `vanessa` | Vanessa | Executive Director |
| `vivian` | Vivian | AI Client Success / Experience Operator — **recommend-only** (activated Phase 8.2) |

**Vivian** (activated Phase 8.2) is the sixth active runtime agent and is
**recommend-only**: she reads safe internal data, surfaces client-success /
experience / retention recommendations for **human approval**, and never mutates
any external system (no GHL/Stripe/Meta/SMS/email/workflow, no client contact, no
auto tasks). Her recommendations pass the Vera/Vesper quality gate. See
[`vivian-client-success-operator-spec.md`](./vivian-client-success-operator-spec.md).

## Backend QA layer (NOT active executives)

| Name | What it is |
|---|---|
| Vera | **Recommendation Quality Auditor** — pure backend scoring. Not a runtime agent, not in `ACTIVE_AGENT_IDS`/`RUNNABLE_AGENTS`. |
| Vesper | **Recommendation Deduplication / Coherence Auditor** — pure backend dedupe. Not a runtime agent. |

See [`vera-vesper-recommendation-quality-gate.md`](./vera-vesper-recommendation-quality-gate.md).

## Not Vault Core executives (do not add to the runtime workforce)

| Name | What it is |
|---|---|
| Victoria | **AI Sales Coach — product surface only** (`src/lib/victoria/**`, `/victoria`). Not a Vault Core executive, not in the registry, not in the tick. |
| Hermes | **QA / dev-ops coordinator only** (can audit the quality gate). Not a business operator, not a runtime executive. |
| Codex | **Manual, read-only second-opinion audit tool.** Never called from production runtime. |

## Phase 9.1 — Agent Action Generation (live)

The 6 active agents now auto-create a small number of approval-ready **internal**
Vault Actions from their existing pending recommendations, at the end of each tick
(after Vera/Vesper hygiene), **fail-open**. Capped (≤2/agent/tick), deduped, and
quality-gated. External execution stays disabled; all actions are approval-gated; no
new active agents; tick cadence unchanged. See
[`vault-core-execution-engine.md`](./vault-core-execution-engine.md) (Phase 9.1) for
the policy, dedupe, Vera/Vesper metadata, and per-agent responsibilities.

## Phase 9.2 — Approval-to-Execution Workflow (live)

Approved actions are now operational and controlled: a metadata-first lifecycle
timeline (rich `audit_log` events), human notes, owner/priority/due/labels, and a
ready-to-execute queue. `request_revision`/`reject` require a reason; approving an
internal action makes it `ready_after_approval` and executable only via the internal
adapter; external approvals stay `adapter_disabled`. Internal execution feeds a safe
Vault Memory activity/audit trail. No schema change, no new active agents, no external
execution. See [`vault-core-execution-engine.md`](./vault-core-execution-engine.md)
(Phase 9.2).

## Invariant

The active Vault Core runtime workforce is **exactly** `vega, veronica, valentina,
valerie, vanessa, vivian` (6). Vera and Vesper are backend QA only. Adding a
seventh active executive requires an explicit, approved activation phase and a full
safety re-verification.
