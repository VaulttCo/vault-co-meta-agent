-- Vault Core — Meta Campaign Action Builder DRAFT schema (Phase 9.5)
-- Internal DRAFT planning artifacts only. Agents design structured Meta campaign plans;
-- humans review/approve them INSIDE Vault Core. NOTHING is launched: no campaign launch,
-- no budget change, no ad set/ad creation, no lead-form publish, no Meta API mutation.
-- There is NO live Meta adapter in this phase.
--
-- Rerun-safe (IF NOT EXISTS). RLS ENABLED with NO permissive policies: the app
-- reads/writes via the SERVICE-ROLE server client (bypasses RLS). Do NOT add
-- `USING (true)` policies for authenticated/anon users. JSONB/text columns store
-- SANITIZED draft content only: no raw provider payloads, no credentials/access tokens,
-- no live campaign / ad-account IDs, and no numeric budget values destined for a Meta
-- API (budget_recommendation is human-readable advisory text only). Review in the
-- Supabase SQL Editor before running. No destructive DDL.

create table if not exists public.meta_campaign_drafts (
  id                            uuid primary key default gen_random_uuid(),
  client_id                     text,
  title                         text not null,
  description                   text,
  campaign_type                 text not null default 'custom',
  source_agent                  text,
  source_action_id              uuid,
  source_competitor_profile_id  uuid,
  status                        text not null default 'draft',
  risk_level                    text not null default 'level_3_money_ads_workflow',
  target_system                 text not null default 'meta',
  objective                     text not null,
  offer_angle                   text,
  audience                      jsonb not null default '{}'::jsonb,
  ad_sets                       jsonb not null default '[]'::jsonb,
  creative_direction            jsonb not null default '[]'::jsonb,
  ad_copy                       jsonb not null default '{}'::jsonb,
  lead_form                     jsonb not null default '{}'::jsonb,
  budget_recommendation         jsonb not null default '{}'::jsonb,
  launch_checklist              jsonb not null default '[]'::jsonb,
  missing_inputs                jsonb not null default '[]'::jsonb,
  compliance_notes              jsonb not null default '[]'::jsonb,
  safe_preview                  jsonb not null default '{}'::jsonb,
  evidence                      jsonb not null default '{}'::jsonb,
  audit_log                     jsonb not null default '[]'::jsonb,
  metadata                      jsonb not null default '{}'::jsonb,
  reviewed_by                   text,
  reviewed_at                   timestamptz,
  created_by                    text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create index if not exists idx_meta_campaign_drafts_client   on public.meta_campaign_drafts (client_id);
create index if not exists idx_meta_campaign_drafts_agent     on public.meta_campaign_drafts (source_agent);
create index if not exists idx_meta_campaign_drafts_action    on public.meta_campaign_drafts (source_action_id);
create index if not exists idx_meta_campaign_drafts_profile   on public.meta_campaign_drafts (source_competitor_profile_id);
create index if not exists idx_meta_campaign_drafts_status    on public.meta_campaign_drafts (status);
create index if not exists idx_meta_campaign_drafts_type      on public.meta_campaign_drafts (campaign_type);
create index if not exists idx_meta_campaign_drafts_created   on public.meta_campaign_drafts (created_at desc);

-- Idempotency backstop: at most ONE campaign draft per source action (1:1 action → draft).
create unique index if not exists uq_meta_campaign_drafts_source_action
  on public.meta_campaign_drafts (source_action_id)
  where source_action_id is not null;

-- Enum domain CHECK constraints — defense in depth (rerun-safe via guarded DO block).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meta_campaign_drafts_status_chk') then
    alter table public.meta_campaign_drafts add constraint meta_campaign_drafts_status_chk check (status in (
      'draft','pending_review','approved_internal','needs_revision','rejected','archived','future_adapter_required'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'meta_campaign_drafts_type_chk') then
    alter table public.meta_campaign_drafts add constraint meta_campaign_drafts_type_chk check (campaign_type in (
      'roofing_lead_generation','remodeling_lead_generation','storm_damage','roof_replacement','roof_repair',
      'inspection_offer','financing_offer','seasonal_promo','retargeting','reactivation','brand_awareness','custom'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'meta_campaign_drafts_risk_chk') then
    alter table public.meta_campaign_drafts add constraint meta_campaign_drafts_risk_chk check (risk_level in (
      'level_0_internal_note','level_1_internal_action','level_2_client_facing_message',
      'level_3_money_ads_workflow','level_4_admin_critical'
    ));
  end if;
  -- target_system is pinned to 'meta' — a campaign draft has no other lane.
  if not exists (select 1 from pg_constraint where conname = 'meta_campaign_drafts_target_chk') then
    alter table public.meta_campaign_drafts add constraint meta_campaign_drafts_target_chk check (target_system in (
      'meta'
    ));
  end if;
end $$;

-- RLS on, no policies → only the service-role server client can read/write.
alter table public.meta_campaign_drafts enable row level security;

-- ── OPTIONAL backfill (Phase 9.5) — tidy legacy meta-campaign-action rows ─────────────
-- Phase 9.5 reclassified `draft_meta_campaign` from the internal `content` lane to the
-- DISABLED `meta` lane (risk level_2 → level_3). Existing `vault_actions` rows created
-- before this phase may still carry the old `content` target / a non-disabled
-- execution_status. They are ALREADY safe at runtime — `canExecute()` denies any row
-- whose persisted target/risk disagree with ACTION_META, and the review/from-action
-- routes derive adapter state from ACTION_META — so they can never execute/launch. This
-- backfill only tidies the stored rows so the /actions UI and the from-action handoff are
-- consistent. Idempotent (only touches rows not already on the new lane). Safe to skip.
--
-- ⚠ MANUAL / OPT-IN — DO NOT RUN AUTOMATICALLY. This file is otherwise additive-only
-- (CREATE … IF NOT EXISTS). The statement below is a row MUTATION of an existing table,
-- so it is intentionally COMMENTED OUT: running this schema file must not silently mutate
-- `vault_actions`. If you want to tidy legacy rows, run it as a DELIBERATE, separate step
-- in the Supabase SQL Editor AFTER `vault-actions-schema.sql`, and review the affected
-- rows first. (Runtime is already safe without it — `canExecute()` denies mismatched rows.)
--
-- update public.vault_actions
--    set target_system = 'meta', risk_level = 'level_3_money_ads_workflow', execution_status = 'adapter_disabled'
--  where action_type = 'draft_meta_campaign'
--    and (target_system is distinct from 'meta'
--         or risk_level is distinct from 'level_3_money_ads_workflow'
--         or execution_status not in ('adapter_disabled','executed','cancelled'));
