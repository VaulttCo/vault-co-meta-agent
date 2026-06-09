# Vault Core — Approved Execution Engine (Phase 9.0)

The foundation that lets agents **prepare** real work, humans **approve** it, and
approved **internal** work **execute** with a full audit trail. External execution
is **adapter-gated and disabled** in this phase — nothing is sent, launched,
charged, or mutated on any external system.

## Vault Co Internal-First Draft Principle
**Vault Core is for Vault Co first.** All draft builders (GHL workflows, message drafts, Meta
campaign drafts, finance drafts, creative briefs) — and the recommendations/actions feeding
them — default to **Vault Co's OWN internal growth machine**: Vault Co internal GHL sub-account
follow-up, Vault Co prospects/sales/onboarding/client-success, Vault Co's own client-acquisition
Meta ads, Vault Co's own content engine, and Vault Co revenue operations. They are **not**
generic client deliverables. Client-specific deliverables require an **explicitly selected
client context** (or an explicit user request). Client delivery improves downstream because
Vault Co's internal system improves first.

- Canonical rule: `src/lib/core/operating-principles.ts` (`VAULT_CORE_INTERNAL_FIRST_PRINCIPLE`).
- Wired into company DNA: `VAULT_CO_IDENTITY.internalPrinciples` + `internalFirstPrinciple`
  (`src/lib/core/identity/vault-co-identity.ts`).
- Seeded into **Vault Memory** as an `internal_principle` node ("Vault Core internal-first
  operating principle") via `identityNodeSpecs()` → `ingest.ts` (DB) and `memory/mock-graph.ts`
  (mock), so agents pull it as operating context before generating recommendations/actions/drafts.
- Applied in each draft module's `templates.ts` defaults + page copy.
- Still draft-only: no external execution, no provider mutation, human approval required.

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

## Phase 9.4 — Lead Reply + Client Message Drafting, Draft Mode (live)
Agents prepare lead replies, client messages, onboarding/revenue follow-ups, and
report/update messages for human review. **Draft-only**: there is NO live send adapter.
Nothing is sent — no SMS, no email, no GHL contact/opportunity/workflow mutation, no
workflow trigger. No provider credentials are used; no raw provider payloads, live IDs,
or raw contact PII (only a sanitized `contact_ref`) are stored or returned.

- **Files:** `src/lib/core/messages/` — `types.ts` (`VaultMessageDraft`, statuses,
  channels, audiences, message types), `validation.ts` (sanitize + reject live-send
  language + http(s)-only URLs + placeholder-only tokens + per-channel compliance
  notes), `templates.ts` (15 starter templates), `db.ts` (mock-safe CRUD + re-sanitized
  DTO + counts + CAS review), `message-draft.ts` (create helper), `adapters/send-disabled.ts`
  (explicit disabled boundary — NO I/O, no provider client, no credentials). Table:
  `docs/vault-message-drafts-schema.sql` → **`vault_core_message_drafts`** (RLS on, no
  policies). NOTE: distinct from the Phase 6 `vault_message_drafts` (legacy Veronica SMS
  queue at `/drafts`).
- **Lifecycle:** `draft` → `pending_review` → { `future_adapter_required` (approved) |
  `needs_revision` | `rejected` | `archived` }. `approve_internal` maps to
  `future_adapter_required` (the sole approved-internal terminal state; UI labels it
  "Approved (internal)"). Review is a true compare-and-set with explicit allowed prior
  states + `updated_at` guard + append-only audit trail. Reject/revision require a
  reason; approving requires an admin.
- **Validation/compliance:** title + body required (subject required for email);
  rejects live-send language ("send now"/"blast"/"trigger"/"deliver immediately");
  personalization tokens are `{{placeholder}}` shapes only; per-channel compliance notes
  are auto-attached (SMS concise + no false urgency + opt-out; email non-misleading
  subject; payment professional/non-threatening; review-request non-incentivized;
  reactivation opt-out aware). Send adapter (`adapters/send-disabled.ts`) is always off.
- **APIs** (`/api/core/message-drafts*`, all `canViewApprovals`-guarded): list, create
  (template or custom — **custom restricted to admin/integration managers**), `[id]`
  GET/PATCH (notes only), `[id]/review`, `from-action` (links an approved
  `draft_lead_reply`/`draft_client_message` action — both now in the DISABLED send lane),
  and `from-workflow-draft` (per-step link from a GHL workflow `draft_sms`/`draft_email`
  step). **No send route, no execute route, no provider call.** DTOs return safe_preview
  + sanitized body only.
- **Action integration:** `ACTION_META.draft_lead_reply` → `{ sms }` and
  `draft_client_message` → `{ email }` (both disabled) — so these actions are born
  `adapter_disabled` and can never execute/send. The `/actions` drawer offers "Create
  message draft" / "View message drafts" for an approved one.
- **GHL workflow integration:** a `draft_sms`/`draft_email` workflow-draft step offers
  "Create message draft from step" (links `source_workflow_draft_id`, many:1, per-step
  idempotent).
- **UI:** `/message-drafts` — exec summary, send-disabled banner, template library,
  draft queue, detail drawer (subject, body, personalization tokens, missing inputs,
  compliance notes, evidence, source links, review trail, review). No "Send/Blast/Push
  Live/Update Contact" controls. Action Center shows a Message Drafts tile.
- **Agents** may propose `draft_lead_reply`/`draft_client_message` actions (which stay
  `adapter_disabled`); auto-generation stays internal-only/capped/deduped; all
  client/lead-facing messages are human-approved and never sent.

## Phase 9.5 — Meta Campaign Action Builder, Draft Mode
- **What it is:** agents design structured Meta campaign **plans** for human review at
  `/meta-campaign-drafts`. **Draft-only** — there is NO live Meta adapter. Nothing is
  launched, no budget is changed, no ad set/ad is created, no lead form is published, no
  Meta Graph/Marketing API is called, and no Meta credentials/access tokens are used.
- **Model** (`src/lib/core/campaign-drafts/**`): a `VaultMetaCampaignDraft` carries
  campaign_type, objective, offer_angle, audience, ad_sets[], creative_direction[],
  ad_copy{primary_texts,headlines,descriptions}, lead_form{intro,questions,privacy_note},
  budget_recommendation (human-readable advisory text ONLY — never a numeric value bound
  for a Meta API, never an ad-account id), launch_checklist, missing_inputs,
  compliance_notes, safe_preview, evidence, audit_log. `target_system` is pinned to
  `meta`; `risk_level` defaults to `level_3_money_ads_workflow`.
- **Statuses:** { `draft` | `pending_review` | `approved_internal` | `needs_revision` |
  `rejected` | `archived` | `future_adapter_required` }. `approve_internal` maps to
  `future_adapter_required` (UI labels it "Approved (internal)"). Review is a true
  compare-and-set (allowed prior states + `updated_at` guard + append-only audit). Reject/
  revision require a reason; **approving requires an admin** (money/ads tier, L3).
- **Validation/compliance:** title + objective required; campaign_type allowed; target
  pinned to `meta`; ad_sets/ad_copy/lead_form sanitized JSON; Meta-aware scrubbing strips
  ad-account ids (`act_…`), long Meta-id-like numeric runs, secrets/tokens, and non-http
  links; **rejects launch/publish/go-live/"update budget"/"create ad set" language**;
  lead-gen / financing / storm verticals auto-attach compliance reminders. Meta adapter
  (`adapters/meta-disabled.ts`) is always off and performs no I/O.
- **APIs** (`/api/core/meta-campaign-drafts*`, `canViewApprovals`-guarded): list, create
  (template or custom — **custom restricted to admin/integration managers**), `[id]`
  GET/PATCH (notes only), `[id]/review`, `from-action` (links an approved
  `draft_meta_campaign` action on the DISABLED `meta` lane), and `from-competitor-intel`
  (Valentina builds a response-angle draft from **internal** competitor profiles/captures
  — no scraping, no external fetch, no Meta Ads Library call). **No launch route, no
  execute route, no Meta API call.** DTOs return safe_preview + sanitized fields only.
- **Action integration:** `ACTION_META.draft_meta_campaign` is reclassified to
  `{ target: meta, risk: level_3 }` (was `{ content, level_2 }`) — so the action is born
  `adapter_disabled` and can never execute/launch. The `/actions` drawer offers "Create
  Meta campaign draft" / "View Meta campaign drafts" for an approved one. (Like the GHL/
  message draft actions, it is therefore never auto-generated to an external lane.)
- **UI:** `/meta-campaign-drafts` — exec summary, Meta-adapter-disabled banner, template
  library (10 starters), campaign draft queue, detail drawer (objective, offer angle,
  audience, ad-set structure, creative direction, ad copy, lead-form draft, budget
  recommendation, launch checklist, missing inputs, compliance notes, evidence, source
  links, human review status, review). **No "Launch/Publish/Push Live/Update Budget/Create
  Ad Set/Activate" controls.** Action Center shows a Meta Campaign Drafts tile.
- **Agents:** Veronica (lead-gen structure, ad copy, lead-form), Valentina (competitor
  response angles, offer positioning), Vega (tracking/budget review notes), Vanessa
  (priority/approval agenda), Vivian (client readiness/missing assets — never contacts
  clients), Valerie (budget/revenue context) contribute to plans. All drafts are
  human-approved; `execution_status` stays `adapter_disabled` / `future_adapter_required`.

## Phase 9.6 — Finance / Invoice Action Builder, Draft Mode
- **What it is:** agents (primarily Valerie) prepare finance / invoice **plans** for human
  review at `/finance-drafts`. **Draft-only** — there is NO live finance adapter. Nothing
  is invoiced, charged, collected, refunded, or moved; no Stripe/payment API is called; no
  bank account is touched; no client is contacted.
- **Model** (`src/lib/core/finance-drafts/**`): a `VaultFinanceDraft` carries finance_type,
  amount_summary (advisory TEXT only — never a charge instruction), calculation, line_items[]
  ({label, amount_text, notes}), partner_split ({summary, shares[]}), payment_terms,
  follow_up_message_ref, missing_inputs, compliance_notes, safe_preview, evidence, audit_log.
  `target_system` ∈ {`internal`,`stripe`,`report`} (stripe is a DISABLED lane; the finance
  adapter is ALWAYS off regardless); `risk_level` defaults to `level_3_money_ads_workflow`.
- **Statuses:** { `draft` | `pending_review` | `approved_internal` | `needs_revision` |
  `rejected` | `archived` | `future_adapter_required` }. `approve_internal` →
  `future_adapter_required` (UI labels it "Approved (internal)"). Review is a true compare-
  and-set (allowed prior states + `updated_at` guard + append-only audit). Reject/revision
  require a reason; **approving requires an admin** (money tier, L3).
- **Validation/compliance:** title required; finance_type allowed; target ∈ {internal,
  stripe,report}; line_items/partner_split sanitized JSON; amount_summary advisory text;
  **rejects "charge now"/"send invoice"/"finalize invoice"/"collect payment"/"debit"/
  "withdraw"/"transfer funds"/"create stripe invoice" language** anywhere in the draft;
  strips Stripe object ids (`in_`/`ch_`/`pi_`/`cus_`/`pm_`/`acct_`/…) and card/bank/account
  numbers (12+ digit runs); per-type compliance notes auto-attached. `source_action_id` is
  validated as a strict UUID (DB column is uuid); `source_snapshot_id` is a safe aggregate
  ref (text). Finance adapter (`adapters/finance-disabled.ts`) is always off and does no I/O.
- **APIs** (`/api/core/finance-drafts*`, `canViewApprovals`-guarded): list, create (template
  or custom — **custom restricted to admin/integration managers**), `[id]` GET/PATCH (notes
  only), `[id]/review`, `from-action` (links an approved `draft_invoice` /
  `prepare_budget_recommendation` action), and `from-revenue-snapshot` (builds a closeout
  draft from INTERNAL aggregate revenue values via Valerie's read-only reader — no Stripe
  call, safe aggregate values only). **No invoice/charge/collect route, no Stripe API call.**
  DTOs return safe_preview + sanitized fields only.
- **Action integration:** the `/actions` drawer offers "Create finance draft" / "View
  finance drafts" for an approved `draft_invoice` or `prepare_budget_recommendation` action.
  Those actions keep their existing INTERNAL lanes (`report`/`internal`) — their internal
  completion never touches Stripe; the finance draft is the separate draft-only artifact.
- **Revenue snapshot integration:** `from-revenue-snapshot` reads `getFinancialData()`
  (internal aggregate revenue/fee/split values), links a sanitized `source_snapshot_id`, and
  seeds a `revenue_closeout` draft. No Stripe mutation, no invoice send, safe values only.
- **UI:** `/finance-drafts` — exec summary, finance-adapter-disabled banner, template
  library (10 starters), finance draft queue, detail drawer (amount summary, calculation,
  line items, partner split, payment terms, missing inputs, compliance notes, evidence,
  source links, human review status, review). **No "Send Invoice/Create Stripe Invoice/
  Finalize/Charge/Collect Payment/Transfer Funds/Withdraw/Push Live" controls.** Action
  Center shows a Finance Drafts tile.
- **Agents:** Valerie (primary owner — setup-fee/revenue-share/retainer invoice drafts,
  partner splits, closeouts, payment follow-ups), Vanessa (priority/approval agenda,
  highlights high-value/overdue), Vivian (client-success finance context / missing-input
  warnings — never contacts clients), Vega (attribution/tracking evidence for revenue
  share), Veronica (campaign/client context), Valentina (campaign performance context).
  All drafts are human-approved; payment-facing items stay `adapter_disabled` /
  `future_adapter_required`.

## Phase 9.7 — Content Ideas + Creative Brief Builder, Draft Mode
- **What it is:** agents prepare content/creative **plans** for human review at
  `/creative-briefs`. **Draft-only** — there is NO live content adapter. Nothing is posted,
  published, uploaded, scheduled, or launched; no social/Meta API is called; no client/
  creator is contacted.
- **Model** (`src/lib/core/creative-briefs/**`): a `VaultCreativeBrief` carries brief_type,
  platform, content_format, objective, audience, hook_bank[], script, shot_list[],
  editor_notes, visual_direction[], caption_options[], thumbnail_concepts[], deliverables[],
  missing_inputs, compliance_notes, safe_preview, evidence, audit_log. `target_system` ∈
  {`internal`,`content`,`social`,`meta`,`website`} (external lanes disabled; the content
  adapter is ALWAYS off). `risk_level` is `level_3_money_ads_workflow` for ad/campaign-linked
  creative (video_ad_brief / ugc_ad_brief / competitor_response_creative / linked to a Meta
  campaign draft) and `level_2_client_facing_message` otherwise.
- **Statuses:** { `draft` | `pending_review` | `approved_internal` | `needs_revision` |
  `rejected` | `archived` | `future_adapter_required` }. `approve_internal` →
  `future_adapter_required` (UI: "Approved (internal)"). Review is a true compare-and-set
  (allowed prior states + `updated_at` guard + append-only audit). Reject/revision require a
  reason; **approving requires an admin**.
- **Validation/compliance:** title + objective required; brief_type/target/platform/format
  validated; all list/text fields sanitized; **rejects post/publish/upload/schedule/launch/
  boost/"send to client" language** across every field (scoped so legit creative language
  like "schedule the shoot"/"upload raw footage to the editor" is allowed); strips social/ad
  IDs (`act_…`, 13+ digit runs) + http(s)-only URLs; per-type compliance notes auto-attached.
  `source_action_id` + `source_meta_campaign_draft_id` validated as strict UUIDs;
  `source_competitor_profile_id` a safe slug. Content adapter (`adapters/content-disabled.ts`)
  is always off and does no I/O.
- **APIs** (`/api/core/creative-briefs*`, `canViewApprovals`-guarded): list, create (template
  or custom — **custom restricted to admin/integration managers**), `[id]` GET/PATCH (notes
  only), `[id]/review`, `from-action` (approved `prepare_content_idea` /
  `prepare_competitor_response` / `draft_meta_campaign`), `from-meta-campaign-draft` (reads an
  INTERNAL campaign draft — no Meta call; idempotent per campaign+brief_type), and
  `from-competitor-intel` (INTERNAL captures only — no scraping). **No post/publish/upload/
  launch route, no social/Meta API call.** DTOs return safe_preview + sanitized fields only.
- **Action integration:** the `/actions` drawer offers "Create creative brief" / "View
  creative briefs" for an approved `prepare_content_idea` / `prepare_competitor_response` /
  `draft_meta_campaign` action. (Content-lane actions keep their internal lane; the brief is
  the separate draft-only artifact.)
- **Meta campaign draft integration:** `from-meta-campaign-draft` maps the campaign's
  objective/offer-angle/audience/ad-copy/creative-direction/lead-form/compliance into a
  video-ad brief, links `source_meta_campaign_draft_id`, reads internal only, idempotent.
- **Competitor intel integration:** `from-competitor-intel` builds a competitor-response
  creative brief from internal profiles/captures (no scraping / no Ads Library call), links
  `source_competitor_profile_id`, and forbids naming/disparaging the competitor.
- **UI:** `/creative-briefs` — exec summary, content-adapter-disabled banner, template
  library (15 starters), brief queue, detail drawer (objective, audience, hook bank, script,
  shot list, editor notes, visual direction, caption options, thumbnail concepts,
  deliverables, missing inputs, compliance notes, evidence, source links, review status,
  review). **No "Post/Publish/Upload/Schedule/Boost/Launch Ad/Send to Client" controls.**
  Action Center shows a Creative Briefs tile.
- **Agents:** Veronica (primary — ad creative, scripts, hooks, shot lists, campaign-linked
  creative), Valentina (competitor-response angles, positioning, testing angles), Vanessa
  (content priority/approval agenda), Vivian (brand consistency / missing assets — never
  contacts clients), Vega (hook/angle performance context), Valerie (value/case-study
  context). All briefs human-approved; external-facing items stay `adapter_disabled` /
  `future_adapter_required`.

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
