# Vault Core — Approved Execution Engine (Phase 9.0)

The foundation that lets agents **prepare** real work, humans **approve** it, and
approved **internal** work **execute** with a full audit trail. External execution
is **adapter-gated and disabled** in this phase — nothing is sent, launched,
charged, or mutated on any external system.

## Flow
1. An agent identifies work and calls `createAction()`.
2. Vera/Vesper quality metadata is attached (score + safety status; recommend-only).
3. The action is stored `pending_review` and appears in Mission Control → Action Center → `/actions`.
4. A human **approves / rejects / requests revision / archives** it.
5. If approved **and** the target adapter is **enabled** (internal only), a human can **execute** it.
6. The execution policy gate runs; the internal adapter records the result into Vault Memory + the audit log.

## Core rule — nothing executes unless ALL hold
`approval_status = approved` · `approved_by` exists · Vera/Vesper safety passes ·
target **adapter is enabled** · action_type is allowed · risk level permits ·
execution policy allows it. The single gate is `canExecute()` in
`src/lib/core/actions/execution-policy.ts` and it **fails closed**.

## Data model — `vault_actions`
Types in `src/lib/core/actions/types.ts`; schema in `docs/vault-actions-schema.sql`
(rerun-safe, RLS on, no permissive policies, service-role only, indexed on
approval_status / execution_status / agent_id / client_id / action_type /
target_system / risk_level / created_at). `payload` is JSONB, **sanitized in the
app** before insert (control-stripped, secret-redacted, size-capped) and **never**
returned to the client — the API returns `VaultActionDTO` with a `safe_preview`.

**Action types →** internal preparation/drafts (`create_internal_task`,
`prepare_*`, `draft_*`, `draft_report`/`draft_invoice`) and external actions
(`send_sms`, `send_email`, `create_ghl_workflow`, `update_ghl_contact`,
`launch_meta_campaign`, `update_meta_budget`, `create_stripe_invoice`,
`publish_report`). The `action_type` **authoritatively** sets `target_system` and
`risk_level` via `ACTION_META` (`policies.ts`) — never trusted from client input.

**Risk levels →** `level_0_internal_note` · `level_1_internal_action` ·
`level_2_client_facing_message` (requires approval) · `level_3_money_ads_workflow`
(requires **admin** approval) · `level_4_admin_critical` (admin + explicit confirm).

## Adapters
`src/lib/core/actions/adapters/`. `getAdapter(target)` returns the **internal**
adapter for internal targets (`internal`/`content`/`report`) and the **disabled**
adapter for every external target.

- **Internal adapter (ENABLED):** marks the action executed, writes a Vault Memory
  node + activity, and returns safe result metadata. It NEVER sends SMS/email,
  updates GHL/CRM, launches Meta, changes budgets, touches Stripe, publishes
  externally, triggers workflows, or creates external tasks.
- **Disabled adapters (GHL/Meta/Stripe/SMS/email/calendar/Slack/ClickUp/website):**
  return `adapter_disabled` and do nothing. Enabling any of these is a separate,
  explicitly-approved future phase.

## APIs (auth-guarded, internal-only)
- `GET /api/core/actions` — list (DTOs) + counts (`canViewApprovals`).
- `POST /api/core/actions` — create (admin / `canConnectIntegrations`), validated.
- `GET /api/core/actions/[id]` · `PATCH` (rollback_notes only, admin/internal).
- `POST /api/core/actions/[id]/review` — approve/reject/request_revision/archive
  (`canViewApprovals` to triage; granting **approve** requires `canApproveVaultActions`,
  admin-only today; level 3+ approval also requires admin). Never executes. Withdrawal
  verbs (reject/request_revision/archive) may also be applied to an already-approved,
  not-yet-executed action and clear its approval stamp.
- `POST /api/core/actions/[id]/execute` — **runs `canExecute()` first**, then the
  resolved adapter. Gated by `canExecuteVaultActions` (admin-only today; a dedicated
  permission so authority can't silently widen). External → `adapter_disabled`.

No external calls, no credentials, no raw payloads/PII in any response.

## Vera/Vesper integration
`createAction()` attaches `metadata.quality_gate` (`qualityScore`, `safety_status`,
`reviewed_by: ["vera","vesper"]`) and `never_auto_execute: true` /
`requires_human_review: true`. Vera/Vesper score clarity/safety and the gate can
deny execution on `safety_status: unsafe`. They **never** approve/reject/execute/
send/publish/launch/mutate — backend QA only.

## Agent responsibilities (how each agent will use it)
- **Vega** — tracking fix / analytics diagnosis / performance review actions.
- **Veronica** — lead reply / campaign preparation / report·message / GHL follow-up prep actions.
- **Valentina** — competitor response / creative test / offer positioning / campaign angle actions.
- **Valerie** — invoice review / revenue closeout / unpaid-client follow-up / commission-split review actions.
- **Vanessa** — executive priority / daily approval agenda / cross-agent coordination actions.
- **Vivian** — client follow-up / onboarding-blocker / retention-risk / client-success-plan actions (recommend-only; never contacts clients).

All agent-prepared actions are `pending_review`, quality-gated, and human-approved.
Agents use `createAction()` (limited per tick, quality over volume) — they do not
execute automatically and never bypass approval.

## Phase 9.1 — Agent Action Generation (live)
Agents now AUTOMATICALLY create a small number of approval-ready **internal** Vault
Actions from their existing pending recommendations, so `/actions` fills itself with
useful, low-noise work. This runs at the **end of every tick, after Vera/Vesper
hygiene**, and is **fail-open** — action generation can never fail the tick (errors
are logged as internal activity). Tick cadence is unchanged; no new active agents.

- **Files:** `actions/generation-policy.ts` (caps, quality floor, allowed types/
  targets per agent, internal-only gate, `shouldCreateAction`), `actions/dedupe.ts`
  (`findDuplicateAction` — source-signal + title-similarity), `actions/agent-action-
  generator.ts` (`generateActionsForAgent` / `generateAllAgentActions`), wired in
  `runtime/dispatcher.ts`. Policy version: `9.1.0`.
- **Caps & quality:** ≤ 2 actions per agent per tick (`MAX_ACTIONS_PER_AGENT`),
  Vera quality floor (`MIN_QUALITY_SCORE`), required reason + evidence + safe_preview,
  `safety_status !== "unsafe"`. No useful signal → **zero** actions (no placeholder spam).
- **Dedupe:** a candidate sharing the same source signal (`source_type`/`source_id`),
  or a similar title in the same action lane, against any LIVE (pending/approved/
  needs_revision) action within `DEDUPE_WINDOW_HOURS` is **skipped** — so the same
  recommendation never re-spawns an action every tick.
- **Internal-only:** auto-generation produces **internal/content/report** target
  actions only. `shouldCreateAction` rejects any external target — external actions
  are never auto-generated and, if created via another path, always land
  `adapter_disabled`. **External execution remains disabled.**
- **Vera/Vesper metadata** on every generated action (`metadata.quality_gate` +
  `metadata.generation`): `quality_score`, `duplicate_score`, `safety_status`,
  `needs_human_review`, `never_auto_execute: true`, `reviewed_by: ["vera","vesper"]`,
  `generation_source`, `generation_reason`, `evidence_count`, `policy_version`.
  Vera/Vesper supply metadata only — they never approve/reject/execute.
- **Per-agent generation:** Vanessa → executive-priority internal review tasks;
  Vivian → internal client-success plans (never contacts clients); Valentina →
  competitor/strategy prep (no scraping/live fetch); Veronica → campaign/lead/report
  prep review tasks; Valerie → finance/closeout review tasks (no Stripe/invoice
  send); Vega → tracking/budget/analytics review prep. All internal, all
  approval-gated.
- **Tick summary** includes `actions: { reviewedSignals, created, skippedDuplicates,
  skippedLowQuality, byAgent }`.
- **Dev seed:** `scripts/seed-vault-actions.mjs --yes` (dev/manual only; never runs
  in production; inserts 2–3 safe internal `pending_review` actions).

## Phase 9.2 — Approval-to-Execution Workflow (live)
Makes approved actions operational and controlled. Lifecycle, notes, owner/priority,
and a ready-to-execute queue — all **metadata-first** (no schema change). External
execution stays disabled; humans approve; only the internal adapter executes.

- **Lifecycle timeline** — every governance step appends a rich `audit_log` entry
  (`event`, `actor`, `at`, `message`, `previous_status`, `next_status`, `note`).
  Events: `created`, `generated`, `reviewed_by_vera_vesper`, `approved`, `rejected`,
  `revision_requested`, `archived`, `assigned`, `priority_changed`, `note_added`,
  `execution_ready`, `internal_execution_started`, `internal_execution_completed`,
  `internal_execution_failed`, `adapter_disabled`. Audit-only — appending an entry
  NEVER bypasses approval or executes anything.
- **Human notes** — `POST /api/core/actions/[id]/note` appends a **sanitized**
  `note_added` entry. Internal-only, audit-only — changes no status. Notes are
  scrubbed (emails/phones/tokens redacted); no secrets/PII reach the DTO.
- **Owner / priority / due / labels** — `POST /api/core/actions/[id]/assign` stores
  these in `metadata.assignment` (sanitized) and appends `assigned` /
  `priority_changed`. Priority ∈ `low|medium|high|urgent`. Surfaced on the DTO as
  `owner`, `priority`, `due_at`, `labels`. Internal triage only — never affects
  approval/execution. (No full user-management system.)
- **Ready-to-execute queue** — `ready_to_execute` on the DTO = `approved` +
  `ready_after_approval` + internal adapter. Exposed as a **Ready** filter/tab in
  `/actions`, a "Ready to execute" stat, and the Action Center. Approving an internal
  action moves `execution_status` → `ready_after_approval`; external approvals stay
  `adapter_disabled` (shown as "Future Adapter Required", never executable).
- **Revision loop** — `request_revision` (and `reject`) now **require a reason**;
  `request_revision` sets `execution_status = blocked` and keeps the action in the
  Needs-Revision queue. Same-source dedupe (Phase 9.1) suppresses regeneration so the
  agent doesn't recreate it each tick.
- **Internal execution feedback** — on execute, status → `executed`/`failed`,
  `executed_at`/`executed_by_agent` set, `internal_execution_started` +
  `internal_execution_completed`/`_failed` audit entries (with prev/next status), and
  the internal adapter writes a Vault Memory node + activity (action id/title/agent/
  result, `external_side_effects: false`). Failures store a **sanitized**
  `execution_error` — raw `execution_result` is never returned to the client.
- **Action Center / Today's Priority** order: failed internal actions → urgent/high
  ready → high-risk pending approval → needs revision → ready → pending review →
  recommendations → all clear.
- **APIs:** new `POST …/note` and `POST …/assign` (both `canViewApprovals`,
  internal-only); `review` requires reason for reject/revision; `execute` still calls
  `canExecute()` first and L4 still needs the typed confirmation. No raw
  payload/execution_result in any DTO.

## Phase 9.3 — GHL Workflow Builder, Draft Mode (live)
Agents can DESIGN GHL follow-up workflow **drafts** for human review. This phase is
**draft-only**: there is NO live GHL adapter. Nothing is published, created, updated,
or triggered in GHL; no contact/opportunity is mutated; no SMS/email is sent; no GHL
credentials are used; no raw GHL payloads or live IDs are stored or returned.

- **Files:** `src/lib/core/workflows/` — `types.ts` (`GHLWorkflowDraft`, statuses,
  workflow types, step types), `validation.ts` (sanitize + reject live-execution
  language + http(s)-only URLs + no PII/secrets), `templates.ts` (10 starter
  workflows), `db.ts` (mock-safe CRUD + DTO + counts), `ghl-workflow-draft.ts`
  (create helper), `adapters/ghl-disabled.ts` (explicit disabled boundary — performs
  NO I/O, imports no GHL client, uses no credentials). Table:
  `docs/ghl-workflow-drafts-schema.sql` (`ghl_workflow_drafts`, RLS on, no policies).
- **Lifecycle:** `draft` → `pending_review` → { `future_adapter_required` (approved) |
  `needs_revision` | `rejected` | `archived` }. **`approve_internal` maps to
  `future_adapter_required`** — that is the sole approved-internal terminal state for
  Phase 9.3 (honest that a future approved GHL adapter would be needed to publish; the
  UI labels it "Approved (internal)"). The `approved_internal` enum value is reserved/
  unused in this phase. Review transitions are a true compare-and-set with explicit
  allowed prior states + an `updated_at` guard + an append-only audit trail. Reject/
  revision require a reason; approving internally requires an admin.
- **Steps are draft-only:** `draft_sms`/`draft_email` hold copy that is never sent;
  tag/task/pipeline/assign steps are marked draft-only; `webhook_placeholder` is
  explicitly disabled/future-adapter-required. Every step carries `draft_only: true`.
- **APIs** (`/api/core/ghl-workflow-drafts*`, all `canViewApprovals`-guarded): list,
  create (from `template_key` or custom), `[id]` GET/PATCH (notes only), `[id]/review`
  (`approve_internal`/`request_revision`/`reject`/`archive`), and `from-action` (links
  an approved `draft_ghl_workflow` action to a new draft; never publishes, never
  changes the action's adapter state). **No publish route, no execute route, no GHL
  call anywhere.** DTOs return sanitized steps + safe_preview only.
- **UI:** `/ghl-workflows` — exec summary, future-adapter-disabled banner, template
  library, draft queue, and a detail drawer (trigger, step timeline, guardrails,
  required assets, missing inputs, safe preview, review). No "Publish/Send/Activate/
  Update Contact" controls exist. The `/actions` drawer offers "Create workflow draft"
  / "View workflow drafts" for an approved `draft_ghl_workflow` action. The Action
  Center shows a GHL Workflows tile.
- **Agents** may propose `draft_ghl_workflow` actions (which always land
  `adapter_disabled`) and own workflow templates by domain (Veronica → lead/campaign
  follow-up, Vivian → onboarding/access (never contacts clients), Vega →
  tracking/lead-quality, Vanessa → prioritization, Valentina → strategy gaps, Valerie
  → proposal/closeout). Auto-generation remains internal-only and capped/deduped;
  `draft_ghl_workflow` actions are human-approved and never execute externally.

## Future adapter path
External adapters stay disabled until a dedicated, explicitly-approved phase that
(per adapter) defines scope, rate limits, compliance, idempotency, rollback, and
keeps human approval mandatory. Flipping `isAdapterEnabled()` for an external
target is the single, reviewed switch — there is no other path to external
execution.

## Audit / rollback
Every create/review/execute appends to `audit_log` (actor, event, timestamp,
detail). `rollback_notes` is a human field. Nothing is hard-deleted; archive/reject
are soft status changes. Internal execution is fully auditable in Vault Memory.

## Hermes / Codex
Hermes (QA/dev-ops) can audit the engine; Codex is a manual read-only second
opinion — neither is a production runtime dependency. Any real external execution
(SMS/email/GHL/Meta/Stripe) before an approved adapter phase is a **P0**.
