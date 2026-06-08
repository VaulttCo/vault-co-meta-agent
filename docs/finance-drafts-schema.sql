-- Vault Core — Finance / Invoice Action Builder DRAFT schema (Phase 9.6)
-- Internal DRAFT planning artifacts only. Agents (primarily Valerie) prepare invoice /
-- revenue-share / split / closeout / follow-up plans; humans review/approve them INSIDE
-- Vault Core. NOTHING is executed: no Stripe invoice is created/sent/finalized, no card is
-- charged, no payment is collected, no money is moved, no bank account is touched, no
-- client is contacted. There is NO live finance adapter in this phase.
--
-- Rerun-safe (IF NOT EXISTS). RLS ENABLED with NO permissive policies: the app
-- reads/writes via the SERVICE-ROLE server client (bypasses RLS). Do NOT add
-- `USING (true)` policies for authenticated/anon users. JSONB/text columns store
-- SANITIZED draft content only: no raw provider payloads, no credentials/tokens, no live
-- Stripe IDs (invoice / payment-intent / customer / payment-method / charge / account),
-- and no card/bank/account numbers. amount_summary / line items are advisory TEXT only —
-- never a charge instruction. Review in the Supabase SQL Editor before running. No
-- destructive DDL. NO automatic backfill / mutation of any existing table.

create table if not exists public.finance_drafts (
  id                       uuid primary key default gen_random_uuid(),
  client_id                text,
  title                    text not null,
  description              text,
  finance_type             text not null default 'custom',
  source_agent             text,
  source_action_id         uuid,
  -- A safe AGGREGATE snapshot reference (e.g. "clientId:billingMonth"), never a raw
  -- provider/customer id — so it is `text`, not `uuid`.
  source_snapshot_id       text,
  status                   text not null default 'draft',
  risk_level               text not null default 'level_3_money_ads_workflow',
  target_system            text not null default 'internal',
  amount_summary           text,
  calculation              text,
  line_items               jsonb not null default '[]'::jsonb,
  partner_split            jsonb not null default '{}'::jsonb,
  payment_terms            text,
  follow_up_message_ref    text,
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

create index if not exists idx_finance_drafts_client    on public.finance_drafts (client_id);
create index if not exists idx_finance_drafts_agent      on public.finance_drafts (source_agent);
create index if not exists idx_finance_drafts_action     on public.finance_drafts (source_action_id);
create index if not exists idx_finance_drafts_snapshot   on public.finance_drafts (source_snapshot_id);
create index if not exists idx_finance_drafts_status     on public.finance_drafts (status);
create index if not exists idx_finance_drafts_type       on public.finance_drafts (finance_type);
create index if not exists idx_finance_drafts_created    on public.finance_drafts (created_at desc);

-- Idempotency backstop: at most ONE finance draft per source action (1:1 action → draft).
create unique index if not exists uq_finance_drafts_source_action
  on public.finance_drafts (source_action_id)
  where source_action_id is not null;

-- Idempotency backstop: at most ONE finance draft per revenue snapshot ref
-- (1:1 snapshot → closeout draft) so repeat from-revenue-snapshot POSTs don't duplicate.
create unique index if not exists uq_finance_drafts_source_snapshot
  on public.finance_drafts (source_snapshot_id)
  where source_snapshot_id is not null;

-- Enum domain CHECK constraints — defense in depth (rerun-safe via guarded DO block).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'finance_drafts_status_chk') then
    alter table public.finance_drafts add constraint finance_drafts_status_chk check (status in (
      'draft','pending_review','approved_internal','needs_revision','rejected','archived','future_adapter_required'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'finance_drafts_type_chk') then
    alter table public.finance_drafts add constraint finance_drafts_type_chk check (finance_type in (
      'setup_fee_invoice','revenue_share_invoice','monthly_retainer_invoice','commission_calculation',
      'partner_split_summary','payment_follow_up','overdue_invoice_review','revenue_closeout',
      'attribution_review','refund_review','custom'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'finance_drafts_risk_chk') then
    alter table public.finance_drafts add constraint finance_drafts_risk_chk check (risk_level in (
      'level_0_internal_note','level_1_internal_action','level_2_client_facing_message',
      'level_3_money_ads_workflow','level_4_admin_critical'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'finance_drafts_target_chk') then
    alter table public.finance_drafts add constraint finance_drafts_target_chk check (target_system in (
      'internal','stripe','report'
    ));
  end if;
end $$;

-- RLS on, no policies → only the service-role server client can read/write.
alter table public.finance_drafts enable row level security;

-- NOTE: this phase performs NO backfill and NO mutation of any existing table. The
-- finance source actions (`draft_invoice`, `prepare_budget_recommendation`) keep their
-- existing internal lanes; finance drafts are a separate, additive artifact.
