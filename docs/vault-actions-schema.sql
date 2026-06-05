-- Vault Core — Approved Execution Engine schema (Phase 9.0)
-- Internal action queue: agents PREPARE, humans APPROVE, the INTERNAL adapter may
-- EXECUTE. External execution adapters are DISABLED in this phase.
--
-- Rerun-safe (IF NOT EXISTS). RLS ENABLED with NO permissive policies: the app
-- reads/writes via the SERVICE-ROLE server client (bypasses RLS), exactly like the
-- other internal vault_* tables. Do NOT add `USING (true)` policies for
-- authenticated/anon users — this table must never be client-readable directly.
-- `payload` is JSONB but is sanitized in the app before insert (no secrets, no raw
-- provider payloads). Review in the Supabase SQL Editor before running. No
-- destructive DDL.

create table if not exists public.vault_actions (
  id                 uuid primary key default gen_random_uuid(),
  agent_id           text not null,
  created_by         text,                                 -- human creator for manual actions; null for agent-originated
  source_type        text,
  source_id          text,
  client_id          text,
  title              text not null,
  summary            text not null,
  action_type        text not null,
  target_system      text not null,
  risk_level         text not null,
  approval_status    text not null default 'pending_review',
  execution_status   text not null default 'not_ready',
  payload            jsonb not null default '{}'::jsonb,   -- sanitized in app; server-side only
  safe_preview       text not null default '',
  reason             text,
  evidence           text[] not null default '{}',
  constraints        text[] not null default '{}',
  requires_approval  boolean not null default true,
  approved_by        text,
  approved_at        timestamptz,
  rejected_by        text,
  rejected_at        timestamptz,
  rejection_reason   text,
  executed_by_agent  text,
  executed_at        timestamptz,
  execution_result   jsonb,
  execution_error    text,
  rollback_notes     text,
  audit_log          jsonb not null default '[]'::jsonb,
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Forward-compat: add columns to an already-created table (rerun-safe).
alter table public.vault_actions add column if not exists created_by text;

create index if not exists idx_vault_actions_approval   on public.vault_actions (approval_status);
create index if not exists idx_vault_actions_execution  on public.vault_actions (execution_status);
create index if not exists idx_vault_actions_agent      on public.vault_actions (agent_id);
create index if not exists idx_vault_actions_client     on public.vault_actions (client_id);
create index if not exists idx_vault_actions_type       on public.vault_actions (action_type);
create index if not exists idx_vault_actions_target     on public.vault_actions (target_system);
create index if not exists idx_vault_actions_risk       on public.vault_actions (risk_level);
create index if not exists idx_vault_actions_created    on public.vault_actions (created_at desc);

-- Enum domain CHECK constraints — defense in depth so a malformed/tampered row can
-- never carry an out-of-vocabulary status/target/risk/type. The app's execution
-- policy is the authoritative gate (it re-derives target/risk from action_type and
-- denies on mismatch), but the DB should also refuse impossible values. Rerun-safe:
-- each constraint is (re)created via a guarded DO block.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vault_actions_action_type_chk') then
    alter table public.vault_actions add constraint vault_actions_action_type_chk check (action_type in (
      'create_internal_task','prepare_content_idea','prepare_competitor_response',
      'prepare_client_success_plan','prepare_tracking_fix','prepare_budget_recommendation',
      'draft_report','draft_client_message','draft_lead_reply','draft_ghl_workflow',
      'draft_meta_campaign','draft_invoice','send_sms','send_email','create_ghl_workflow',
      'update_ghl_contact','launch_meta_campaign','update_meta_budget','create_stripe_invoice',
      'publish_report'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vault_actions_target_system_chk') then
    alter table public.vault_actions add constraint vault_actions_target_system_chk check (target_system in (
      'internal','content','report',                                  -- internal (executable)
      'ghl','meta','stripe','email','sms','calendar','slack','clickup','website'  -- external (disabled)
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vault_actions_risk_level_chk') then
    alter table public.vault_actions add constraint vault_actions_risk_level_chk check (risk_level in (
      'level_0_internal_note','level_1_internal_action','level_2_client_facing_message',
      'level_3_money_ads_workflow','level_4_admin_critical'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vault_actions_approval_status_chk') then
    alter table public.vault_actions add constraint vault_actions_approval_status_chk check (approval_status in (
      'pending_review','approved','rejected','needs_revision','archived'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vault_actions_execution_status_chk') then
    alter table public.vault_actions add constraint vault_actions_execution_status_chk check (execution_status in (
      'not_ready','blocked','ready_after_approval','adapter_disabled','executing','executed','failed','cancelled'
    ));
  end if;
end $$;

-- RLS on, no policies → only the service-role server client can read/write.
alter table public.vault_actions enable row level security;
