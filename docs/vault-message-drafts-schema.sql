-- Vault Core — Lead Reply + Client Message DRAFT schema (Phase 9.4)
-- Internal DRAFT artifacts only. Agents prepare lead replies / client messages /
-- follow-ups; humans review/approve them INSIDE Vault Core. NOTHING is sent: no SMS,
-- no email, no GHL contact/opportunity/workflow mutation. There is NO live send adapter.
--
-- TABLE NAME NOTE: this is `public.vault_core_message_drafts` (NOT `vault_message_drafts`,
-- which already exists from Phase 6 as Veronica's legacy SMS draft queue at /drafts with
-- a different schema). The two are independent.
--
-- Rerun-safe (IF NOT EXISTS). RLS ENABLED with NO permissive policies: the app
-- reads/writes via the SERVICE-ROLE server client (bypasses RLS). Do NOT add
-- `USING (true)` policies for authenticated/anon users. JSONB/text columns store
-- SANITIZED draft content only: no raw provider payloads, no credentials, no live
-- provider IDs, no raw contact PII (only a sanitized contact_ref). Review in the
-- Supabase SQL Editor before running. No destructive DDL.

create table if not exists public.vault_core_message_drafts (
  id                       uuid primary key default gen_random_uuid(),
  client_id                text,
  -- NO lead_id: Phase 9.4 data minimization — a raw lead/contact/provider id is never
  -- stored. Only a sanitized `contact_ref` label is kept.
  contact_ref              text,
  title                    text not null,
  message_type             text not null,
  channel                  text not null,
  audience                 text not null,
  source_agent             text,
  source_action_id         uuid,
  source_workflow_draft_id uuid,
  status                   text not null default 'draft',
  risk_level               text not null default 'level_2_client_facing_message',
  target_system            text not null default 'internal',
  subject                  text,
  body                     text not null,
  tone                     text,
  intent                   text,
  personalization_tokens   jsonb not null default '[]'::jsonb,
  missing_inputs           jsonb not null default '[]'::jsonb,
  compliance_notes         jsonb not null default '[]'::jsonb,
  safe_preview             jsonb not null default '{}'::jsonb,
  evidence                 jsonb not null default '{}'::jsonb,
  audit_log                jsonb not null default '[]'::jsonb,
  metadata                 jsonb not null default '{}'::jsonb,
  reviewed_by              text,
  reviewed_at              timestamptz,
  created_by               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_vc_msg_drafts_client   on public.vault_core_message_drafts (client_id);
create index if not exists idx_vc_msg_drafts_agent     on public.vault_core_message_drafts (source_agent);
create index if not exists idx_vc_msg_drafts_action    on public.vault_core_message_drafts (source_action_id);
create index if not exists idx_vc_msg_drafts_wfdraft   on public.vault_core_message_drafts (source_workflow_draft_id);
create index if not exists idx_vc_msg_drafts_status    on public.vault_core_message_drafts (status);
create index if not exists idx_vc_msg_drafts_type      on public.vault_core_message_drafts (message_type);
create index if not exists idx_vc_msg_drafts_channel   on public.vault_core_message_drafts (channel);
create index if not exists idx_vc_msg_drafts_audience  on public.vault_core_message_drafts (audience);
create index if not exists idx_vc_msg_drafts_created   on public.vault_core_message_drafts (created_at desc);

-- Idempotency backstop: at most ONE draft per source action (1:1 action → message).
create unique index if not exists uq_vc_msg_drafts_source_action
  on public.vault_core_message_drafts (source_action_id)
  where source_action_id is not null;
-- NOTE: a single GHL workflow draft can have several draft_sms/draft_email steps, so
-- workflow → message is many:1 (NO unique index on source_workflow_draft_id alone).
-- Per-step idempotency is enforced both in the app and by this expression partial
-- unique index on (source_workflow_draft_id, metadata->>'source_step_id').
create unique index if not exists uq_vc_msg_drafts_source_wf_step
  on public.vault_core_message_drafts (source_workflow_draft_id, (metadata ->> 'source_step_id'))
  where source_workflow_draft_id is not null and (metadata ? 'source_step_id');

-- Enum domain CHECK constraints — defense in depth (rerun-safe via guarded DO block).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vc_msg_drafts_status_chk') then
    alter table public.vault_core_message_drafts add constraint vc_msg_drafts_status_chk check (status in (
      'draft','pending_review','approved_internal','needs_revision','rejected','archived','future_adapter_required'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vc_msg_drafts_channel_chk') then
    alter table public.vault_core_message_drafts add constraint vc_msg_drafts_channel_chk check (channel in (
      'sms','email','internal_note','client_update','lead_reply','report_message'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vc_msg_drafts_audience_chk') then
    alter table public.vault_core_message_drafts add constraint vc_msg_drafts_audience_chk check (audience in (
      'lead','client','internal','setter','media_buyer','owner'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vc_msg_drafts_type_chk') then
    alter table public.vault_core_message_drafts add constraint vc_msg_drafts_type_chk check (message_type in (
      'lead_reply','missed_call_reply','appointment_confirmation','appointment_reminder','no_show_follow_up',
      'estimate_follow_up','proposal_follow_up','onboarding_access_request','client_check_in','client_update',
      'payment_follow_up','report_summary','review_request','reactivation','nurture_message','competitor_response','custom'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vc_msg_drafts_risk_chk') then
    alter table public.vault_core_message_drafts add constraint vc_msg_drafts_risk_chk check (risk_level in (
      'level_0_internal_note','level_1_internal_action','level_2_client_facing_message',
      'level_3_money_ads_workflow','level_4_admin_critical'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vc_msg_drafts_target_chk') then
    alter table public.vault_core_message_drafts add constraint vc_msg_drafts_target_chk check (target_system in (
      'internal','sms','email','ghl','report'
    ));
  end if;
end $$;

-- RLS on, no policies → only the service-role server client can read/write.
alter table public.vault_core_message_drafts enable row level security;

-- ── OPTIONAL backfill (Phase 9.4) — tidy legacy message-action rows ──────────────
-- Phase 9.4 reclassified `draft_lead_reply` → sms and `draft_client_message` → email
-- (both DISABLED). Existing `vault_actions` rows created before this phase may still
-- carry the old `content` target / a non-disabled execution_status. They are ALREADY
-- safe at runtime — `canExecute()` denies any row whose persisted target/risk disagree
-- with ACTION_META, and the review route derives adapter state from ACTION_META — so
-- they can never execute/send. This backfill only tidies the stored rows so the
-- /actions UI and the from-action handoff are consistent. Idempotent (only touches
-- rows not already on the new lane). Safe to skip. Run AFTER `vault-actions-schema.sql`.
update public.vault_actions
   set target_system = 'sms', execution_status = 'adapter_disabled'
 where action_type = 'draft_lead_reply'
   and (target_system is distinct from 'sms' or execution_status not in ('adapter_disabled','executed','cancelled'));
update public.vault_actions
   set target_system = 'email', execution_status = 'adapter_disabled'
 where action_type = 'draft_client_message'
   and (target_system is distinct from 'email' or execution_status not in ('adapter_disabled','executed','cancelled'));
