-- Vault Core — Content Ideas + Creative Brief Builder DRAFT schema (Phase 9.7)
-- Internal DRAFT planning artifacts only. Agents prepare content ideas / ad creative
-- briefs / scripts / hooks / shot lists; humans review/approve them INSIDE Vault Core.
-- NOTHING is executed: nothing is posted, published, uploaded, scheduled, or launched; no
-- social/Meta API is called; no client/creator is contacted. There is NO live content
-- adapter in this phase.
--
-- Rerun-safe (IF NOT EXISTS). RLS ENABLED with NO permissive policies: the app
-- reads/writes via the SERVICE-ROLE server client (bypasses RLS). Do NOT add
-- `USING (true)` policies for authenticated/anon users. JSONB/text columns store
-- SANITIZED draft content only: no raw provider payloads, no credentials/tokens, no live
-- social-post or ad IDs, and no raw creator/contact PII. Review in the Supabase SQL Editor
-- before running. No destructive DDL. NO automatic backfill / mutation of any table.

create table if not exists public.creative_briefs (
  id                              uuid primary key default gen_random_uuid(),
  client_id                       text,
  title                           text not null,
  description                     text,
  brief_type                      text not null default 'custom',
  source_agent                    text,
  source_action_id                uuid,
  source_meta_campaign_draft_id   uuid,
  -- competitor profile refs may be non-UUID (mock/manual) — kept as text.
  source_competitor_profile_id    text,
  status                          text not null default 'draft',
  risk_level                      text not null default 'level_2_client_facing_message',
  target_system                   text not null default 'content',
  platform                        text not null default 'multi',
  content_format                  text not null default 'video',
  objective                       text not null,
  audience                        text,
  hook_bank                       jsonb not null default '[]'::jsonb,
  script                          text,
  shot_list                       jsonb not null default '[]'::jsonb,
  editor_notes                    text,
  visual_direction                jsonb not null default '[]'::jsonb,
  caption_options                 jsonb not null default '[]'::jsonb,
  thumbnail_concepts              jsonb not null default '[]'::jsonb,
  deliverables                    jsonb not null default '[]'::jsonb,
  missing_inputs                  jsonb not null default '[]'::jsonb,
  compliance_notes                jsonb not null default '[]'::jsonb,
  safe_preview                    jsonb not null default '{}'::jsonb,
  evidence                        jsonb not null default '{}'::jsonb,
  audit_log                       jsonb not null default '[]'::jsonb,
  metadata                        jsonb not null default '{}'::jsonb,
  reviewed_by                     text,
  reviewed_at                     timestamptz,
  created_by                      text,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

create index if not exists idx_creative_briefs_client    on public.creative_briefs (client_id);
create index if not exists idx_creative_briefs_agent      on public.creative_briefs (source_agent);
create index if not exists idx_creative_briefs_action     on public.creative_briefs (source_action_id);
create index if not exists idx_creative_briefs_campaign   on public.creative_briefs (source_meta_campaign_draft_id);
create index if not exists idx_creative_briefs_competitor on public.creative_briefs (source_competitor_profile_id);
create index if not exists idx_creative_briefs_status     on public.creative_briefs (status);
create index if not exists idx_creative_briefs_type       on public.creative_briefs (brief_type);
create index if not exists idx_creative_briefs_platform   on public.creative_briefs (platform);
create index if not exists idx_creative_briefs_created    on public.creative_briefs (created_at desc);

-- Idempotency backstop: at most ONE brief per source action (1:1 action → brief).
create unique index if not exists uq_creative_briefs_source_action
  on public.creative_briefs (source_action_id)
  where source_action_id is not null;

-- Idempotency backstop: at most ONE brief per (Meta campaign draft, brief_type) so repeat
-- from-meta-campaign-draft POSTs don't duplicate the same brief type for a campaign.
create unique index if not exists uq_creative_briefs_campaign_type
  on public.creative_briefs (source_meta_campaign_draft_id, brief_type)
  where source_meta_campaign_draft_id is not null;

-- Enum domain CHECK constraints — defense in depth (rerun-safe via guarded DO block).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'creative_briefs_status_chk') then
    alter table public.creative_briefs add constraint creative_briefs_status_chk check (status in (
      'draft','pending_review','approved_internal','needs_revision','rejected','archived','future_adapter_required'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'creative_briefs_type_chk') then
    alter table public.creative_briefs add constraint creative_briefs_type_chk check (brief_type in (
      'video_ad_brief','ugc_ad_brief','organic_reel','youtube_short','tiktok_short','instagram_reel',
      'content_calendar','shoot_brief','editor_brief','thumbnail_brief','caption_pack','hook_bank',
      'case_study','client_brand_story','competitor_response_creative','custom'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'creative_briefs_risk_chk') then
    alter table public.creative_briefs add constraint creative_briefs_risk_chk check (risk_level in (
      'level_0_internal_note','level_1_internal_action','level_2_client_facing_message',
      'level_3_money_ads_workflow','level_4_admin_critical'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'creative_briefs_target_chk') then
    alter table public.creative_briefs add constraint creative_briefs_target_chk check (target_system in (
      'internal','content','social','meta','website'
    ));
  end if;
end $$;

-- RLS on, no policies → only the service-role server client can read/write.
alter table public.creative_briefs enable row level security;

-- NOTE: this phase performs NO backfill and NO mutation of any existing table. Source
-- actions keep their existing lanes; creative briefs are a separate, additive artifact.
