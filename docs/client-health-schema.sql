-- Vault Core — Client Health / Retention Risk Builder DRAFT schema (Phase 9.8)
-- Internal DRAFT planning artifacts only. Agents (primarily Vivian) prepare client-health
-- / retention-risk / missing-access / save-plan reviews for Vault Co's OWN client-success
-- operations; humans review/approve them INSIDE Vault Core. NOTHING is executed: no client
-- is contacted, no SMS/email is sent, no GHL contact/task/opportunity/note/workflow is
-- created or updated, no Stripe/Meta call is made, no money moves. There is NO live
-- client-success adapter in this phase.
--
-- Rerun-safe (IF NOT EXISTS). RLS ENABLED with NO permissive policies: the app
-- reads/writes via the SERVICE-ROLE server client (bypasses RLS). Do NOT add
-- `USING (true)` policies for authenticated/anon users. JSONB/text columns store
-- SANITIZED draft content only: no raw provider payloads, no credentials/tokens, no live
-- GHL/Stripe/Meta IDs, and no raw contact PII. health_score / risk labels are INTERNAL
-- advisory TEXT only — never a client-facing truth or a contact instruction. Review in
-- the Supabase SQL Editor before running. No destructive DDL. NO automatic backfill /
-- mutation of any existing table.

create table if not exists public.client_health_drafts (
  id                        uuid primary key default gen_random_uuid(),
  client_id                 text,
  title                     text not null,
  description               text,
  health_type               text not null default 'custom',
  source_agent              text,
  source_action_id          uuid,
  source_message_draft_id   uuid,
  source_finance_draft_id   uuid,
  -- A safe AGGREGATE snapshot reference (e.g. "clientId:billingMonth"), never a raw
  -- provider/customer id — so it is `text`, not `uuid`.
  source_snapshot_id        text,
  status                    text not null default 'draft',
  risk_level                text not null default 'level_2_client_facing_message',
  target_system             text not null default 'internal',
  health_score              text,
  risk_level_label          text,
  risk_reasons              jsonb not null default '[]'::jsonb,
  missing_access            jsonb not null default '[]'::jsonb,
  missing_assets            jsonb not null default '[]'::jsonb,
  delivery_risks            jsonb not null default '[]'::jsonb,
  communication_risks       jsonb not null default '[]'::jsonb,
  next_best_actions         jsonb not null default '[]'::jsonb,
  owner_notes               text,
  save_plan                 jsonb not null default '[]'::jsonb,
  upsell_opportunities      jsonb not null default '[]'::jsonb,
  follow_up_message_ref     text,
  missing_inputs            jsonb not null default '[]'::jsonb,
  compliance_notes          jsonb not null default '[]'::jsonb,
  safe_preview              jsonb not null default '{}'::jsonb,
  evidence                  jsonb not null default '{}'::jsonb,
  audit_log                 jsonb not null default '[]'::jsonb,
  metadata                  jsonb not null default '{}'::jsonb,
  reviewed_by               text,
  reviewed_at               timestamptz,
  created_by                text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_client_health_client    on public.client_health_drafts (client_id);
create index if not exists idx_client_health_agent     on public.client_health_drafts (source_agent);
create index if not exists idx_client_health_action    on public.client_health_drafts (source_action_id);
create index if not exists idx_client_health_message   on public.client_health_drafts (source_message_draft_id);
create index if not exists idx_client_health_finance   on public.client_health_drafts (source_finance_draft_id);
create index if not exists idx_client_health_snapshot  on public.client_health_drafts (source_snapshot_id);
create index if not exists idx_client_health_status    on public.client_health_drafts (status);
create index if not exists idx_client_health_type      on public.client_health_drafts (health_type);
create index if not exists idx_client_health_created   on public.client_health_drafts (created_at desc);

-- Idempotency backstop: at most ONE health draft per source action (1:1 action → draft).
create unique index if not exists uq_client_health_source_action
  on public.client_health_drafts (source_action_id)
  where source_action_id is not null;

-- Idempotency backstop: at most ONE health draft per source message draft.
create unique index if not exists uq_client_health_source_message
  on public.client_health_drafts (source_message_draft_id)
  where source_message_draft_id is not null;

-- Idempotency backstop: at most ONE health draft per source finance draft.
create unique index if not exists uq_client_health_source_finance
  on public.client_health_drafts (source_finance_draft_id)
  where source_finance_draft_id is not null;

-- Idempotency backstop: at most ONE health draft per revenue snapshot ref PER health type
-- (the monthly closeout today; scoped so a future snapshot-driven type can coexist).
create unique index if not exists uq_client_health_source_snapshot_type
  on public.client_health_drafts (source_snapshot_id, health_type)
  where source_snapshot_id is not null;

-- Enum domain CHECK constraints — defense in depth (rerun-safe via guarded DO block).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'client_health_status_chk') then
    alter table public.client_health_drafts add constraint client_health_status_chk check (status in (
      'draft','pending_review','approved_internal','needs_revision','rejected','archived','future_adapter_required'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'client_health_type_chk') then
    alter table public.client_health_drafts add constraint client_health_type_chk check (health_type in (
      'client_health_review','retention_risk_review','missing_access_review','missing_assets_review',
      'stalled_delivery_review','communication_risk_review','onboarding_risk_review',
      'fulfillment_bottleneck_review','client_save_plan','upsell_opportunity_review',
      'monthly_client_health_closeout','custom'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'client_health_risk_chk') then
    alter table public.client_health_drafts add constraint client_health_risk_chk check (risk_level in (
      'level_0_internal_note','level_1_internal_action','level_2_client_facing_message',
      'level_3_money_ads_workflow','level_4_admin_critical'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'client_health_target_chk') then
    alter table public.client_health_drafts add constraint client_health_target_chk check (target_system in (
      'internal','report','ghl','message'
    ));
  end if;
end $$;

-- RLS on, no policies → only the service-role server client can read/write.
alter table public.client_health_drafts enable row level security;

-- NOTE: this phase performs NO backfill and NO mutation of any existing table. The
-- client-success source actions (`prepare_client_success_plan`, `draft_client_message`,
-- `draft_report`, `draft_invoice`) keep their existing lanes; client-health drafts are a
-- separate, additive artifact.
