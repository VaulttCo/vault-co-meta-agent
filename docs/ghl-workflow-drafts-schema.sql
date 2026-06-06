-- Vault Core — GHL Workflow Builder DRAFT MODE schema (Phase 9.3)
-- Internal DRAFT artifacts only. Agents design GHL follow-up workflow DRAFTS, humans
-- review/approve them INSIDE Vault Core — NOTHING is published, created, updated, or
-- triggered in GHL. There is NO live GHL adapter in this phase.
--
-- Rerun-safe (IF NOT EXISTS). RLS ENABLED with NO permissive policies: the app
-- reads/writes via the SERVICE-ROLE server client (bypasses RLS), exactly like the
-- other internal vault_*/action tables. Do NOT add `USING (true)` policies for
-- authenticated/anon users — this table must never be client-readable directly.
-- The JSONB columns store SANITIZED draft content only: no raw GHL provider payloads,
-- no credentials, no live GHL IDs, no contact PII. Review in the Supabase SQL Editor
-- before running. No destructive DDL.

create table if not exists public.ghl_workflow_drafts (
  id                 uuid primary key default gen_random_uuid(),
  client_id          text,
  title              text not null,
  description        text,
  workflow_type      text not null,
  source_agent       text,
  source_action_id   uuid,
  status             text not null default 'draft',
  risk_level         text not null default 'level_3_money_ads_workflow',
  target_system      text not null default 'ghl',
  trigger            jsonb not null default '{}'::jsonb,   -- sanitized in app
  steps              jsonb not null default '[]'::jsonb,   -- draft-only steps, sanitized in app
  guardrails         jsonb not null default '{}'::jsonb,
  required_assets    jsonb not null default '[]'::jsonb,
  missing_inputs     jsonb not null default '[]'::jsonb,
  human_review_notes text,
  safe_preview       jsonb not null default '{}'::jsonb,
  evidence           jsonb not null default '{}'::jsonb,
  audit_log          jsonb not null default '[]'::jsonb,   -- append-only review trail
  metadata           jsonb not null default '{}'::jsonb,
  reviewed_by        text,
  reviewed_at        timestamptz,
  created_by         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_ghl_wf_drafts_client   on public.ghl_workflow_drafts (client_id);
create index if not exists idx_ghl_wf_drafts_agent     on public.ghl_workflow_drafts (source_agent);
create index if not exists idx_ghl_wf_drafts_action    on public.ghl_workflow_drafts (source_action_id);
create index if not exists idx_ghl_wf_drafts_status    on public.ghl_workflow_drafts (status);
create index if not exists idx_ghl_wf_drafts_type      on public.ghl_workflow_drafts (workflow_type);
create index if not exists idx_ghl_wf_drafts_created   on public.ghl_workflow_drafts (created_at desc);

-- Idempotency backstop: at most ONE draft per source action (the from-action handoff
-- is idempotent in the app; this prevents duplicates under concurrent clicks too).
create unique index if not exists uq_ghl_wf_drafts_source_action
  on public.ghl_workflow_drafts (source_action_id)
  where source_action_id is not null;

-- Enum domain CHECK constraints — defense in depth (rerun-safe via guarded DO block).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ghl_wf_drafts_status_chk') then
    alter table public.ghl_workflow_drafts add constraint ghl_wf_drafts_status_chk check (status in (
      'draft','pending_review','approved_internal','needs_revision','rejected','archived','future_adapter_required'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ghl_wf_drafts_type_chk') then
    alter table public.ghl_workflow_drafts add constraint ghl_wf_drafts_type_chk check (workflow_type in (
      'missed_call_text_back','speed_to_lead_new_inquiry','appointment_confirmation','appointment_reminder',
      'no_show_follow_up','estimate_follow_up','proposal_follow_up','review_request','reactivation',
      'nurture_sequence','onboarding_access_request','client_check_in','custom'
    ));
  end if;
end $$;

-- RLS on, no policies → only the service-role server client can read/write.
alter table public.ghl_workflow_drafts enable row level security;
