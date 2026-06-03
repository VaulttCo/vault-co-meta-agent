# Vault Core — Workforce Roadmap

The canonical, at-a-glance status of the Vault Core workforce. Source of truth for
runtime is `src/lib/core/agents/registry.ts` (`WORKFORCE`, `ACTIVE_AGENT_IDS`) and
`src/lib/core/agents/index.ts` (`RUNNABLE_AGENTS`). This doc must stay consistent
with those files.

## Active Vault Core runtime executives (5)

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

## Planned / dormant (NOT active)

| ID | Name | Role | Status |
|---|---|---|---|
| `vivian` | Vivian | AI Client Success / Experience Operator | **PLANNED · DORMANT · NOT ACTIVE · NOT IN RUNTIME** |

**Vivian** is a metadata stub only (`active: false`). She is **planned, not
active**: not in `ACTIVE_AGENT_IDS`, not in `RUNNABLE_AGENTS`, not in the
dispatcher, not in the tick, and **not a runtime executive yet**. She is not
counted as an active contributor. In Mission Control and the Vault Memory brain she
appears (if at all) only as a clearly-labeled dormant/roadmap reference, dimmed and
outside the active executive ring. Activation is a separate, explicitly-approved
phase — see [`vivian-client-success-operator-spec.md`](./vivian-client-success-operator-spec.md).

## Not Vault Core executives (do not add to the runtime workforce)

| Name | What it is |
|---|---|
| Victoria | **AI Sales Coach — product surface only** (`src/lib/victoria/**`, `/victoria`). Not a Vault Core executive, not in the registry, not in the tick. |
| Hermes | **QA / dev-ops layer only** (Execution & Validation). Not a business operator, not a runtime executive. |

## Invariant

The active Vault Core runtime workforce is **exactly** `vega, veronica, valentina,
valerie, vanessa`. Adding a sixth active executive (including activating Vivian)
requires an explicit, approved activation phase and a full safety re-verification.
