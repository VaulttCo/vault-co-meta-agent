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

## Phase 9.3 — GHL Workflow Builder, Draft Mode (live)

Agents design GHL follow-up workflow **drafts** for human review at `/ghl-workflows`;
humans approve them **internally only**. **Draft-only** — there is no live GHL adapter:
nothing is published, no GHL workflow/contact/opportunity is mutated, no SMS/email is
sent, no GHL credentials are used. New `ghl_workflow_drafts` table (RLS on, no policies),
`src/lib/core/workflows/**`, `/api/core/ghl-workflow-drafts*`, 10 starter templates, and
an explicit disabled adapter boundary. Approving internally → `future_adapter_required`.
No new active agents; no external execution. See
[`vault-core-execution-engine.md`](./vault-core-execution-engine.md) (Phase 9.3).

## Phase 9.4 — Lead Reply + Client Message Drafting, Draft Mode (live)

Agents prepare lead replies, client messages, and follow-ups at `/message-drafts`;
humans approve them **internally only**. **Draft-only** — no live send adapter: no SMS/
email is sent, no GHL contact/opportunity/workflow mutation, no workflow trigger, no
provider credentials. New `vault_core_message_drafts` table (RLS on, no policies;
distinct from the Phase 6 `vault_message_drafts`), `src/lib/core/messages/**`,
`/api/core/message-drafts*`, 15 templates, per-channel compliance notes, and a disabled
send-adapter boundary. `draft_lead_reply`/`draft_client_message` actions are reclassified
to the disabled send lane. No new active agents; no external execution. See
[`vault-core-execution-engine.md`](./vault-core-execution-engine.md) (Phase 9.4).

## Phase 9.5 — Meta Campaign Action Builder, Draft Mode (live)

Agents design structured Meta campaign **plans** (strategy, objective, offer angle,
audience, ad-set structure, creative direction, ad copy, lead-form draft, budget
recommendation, launch checklist, missing inputs, compliance notes) for human review at
`/meta-campaign-drafts`; humans approve them **internally only**. **Draft-only** — there
is no live Meta adapter: no campaign is launched, no budget is changed, no ad set/ad is
created, no lead form is published, no Meta API is called, and no Meta credentials/tokens
are used. New `meta_campaign_drafts` table (RLS on, no policies), `src/lib/core/campaign-
drafts/**`, `/api/core/meta-campaign-drafts*` (incl. `from-action` and
`from-competitor-intel`), 10 starter templates, and an explicit disabled Meta-adapter
boundary. The `draft_meta_campaign` action is reclassified from the internal `content`
lane to the disabled `meta` lane (L2 → L3, admin approval) so it is `adapter_disabled`
from birth and only ever seeds an internal campaign DRAFT. Valentina can propose response
angles from **internal** competitor intel (no scraping, no live Meta Ads Library call).
Approving internally → `future_adapter_required`. No new active agents; no external
execution. See [`vault-core-execution-engine.md`](./vault-core-execution-engine.md)
(Phase 9.5).

## Phase 9.6 — Finance / Invoice Action Builder, Draft Mode (live)

Agents (primarily Valerie) prepare finance **plans** — invoice drafts, setup-fee tracking,
revenue-share calculations, partner-split summaries, payment follow-ups, overdue-invoice
reviews, monthly revenue closeouts, commission/attribution notes — for human review at
`/finance-drafts`; humans approve them **internally only**. **Draft-only** — there is no
live finance adapter: no Stripe invoice is created/sent/finalized, no card is charged, no
payment is collected, no money is moved, no bank account is touched, no client is
contacted, and no Stripe/payment API is called. New `finance_drafts` table (RLS on, no
policies), `src/lib/core/finance-drafts/**`, `/api/core/finance-drafts*` (incl.
`from-action` and `from-revenue-snapshot`), 10 starter templates, and an explicit disabled
finance-adapter boundary. The `from-action` handoff seeds from approved `draft_invoice` /
`prepare_budget_recommendation` actions (which keep their existing internal lanes); the
`from-revenue-snapshot` handoff reads only internal aggregate revenue values (Valerie's
read-only reader) — no Stripe call. Validation rejects charge/send/finalize/collect/debit/
withdraw/transfer language and strips Stripe IDs + card/bank numbers. Approving internally
→ `future_adapter_required`. No new active agents; no external execution. See
[`vault-core-execution-engine.md`](./vault-core-execution-engine.md) (Phase 9.6).

## Phase 9.7 — Content Ideas + Creative Brief Builder, Draft Mode (live)

Agents prepare content/creative **plans** — content ideas, ad creative briefs, editor
briefs, video scripts, hooks, captions, shot lists, thumbnail concepts, content-calendar
ideas, UGC/shoot directions — for human review at `/creative-briefs`; humans approve them
**internally only**. **Draft-only** — there is no live content adapter: nothing is posted to
any social platform, no video/image is uploaded, no post is scheduled, no Meta ad is
launched, no client/creator is contacted, and no social/Meta API is called. New
`creative_briefs` table (RLS on, no policies), `src/lib/core/creative-briefs/**`,
`/api/core/creative-briefs*` (incl. `from-action`, `from-meta-campaign-draft`,
`from-competitor-intel`), 15 starter templates, and an explicit disabled content-adapter
boundary. `from-action` seeds from approved `prepare_content_idea` /
`prepare_competitor_response` / `draft_meta_campaign` actions; `from-meta-campaign-draft`
reads an internal campaign draft (no Meta call); `from-competitor-intel` uses internal
captures only (no scraping). Validation rejects post/publish/upload/schedule/launch/boost
language and strips social/ad IDs. Ad/campaign-linked creative is L3; other client-facing
creative is L2. Approving internally → `future_adapter_required`. No new active agents; no
external execution. See
[`vault-core-execution-engine.md`](./vault-core-execution-engine.md) (Phase 9.7).

## Invariant

The active Vault Core runtime workforce is **exactly** `vega, veronica, valentina,
valerie, vanessa, vivian` (6). Vera and Vesper are backend QA only. Adding a
seventh active executive requires an explicit, approved activation phase and a full
safety re-verification.
