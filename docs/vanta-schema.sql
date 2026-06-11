-- VANTA — Creative Intelligence module schema (Phase V1)
-- Vault Co's AI Creative Director: footage intelligence, color, edit plans, hooks,
-- captions, thumbnails, sound design, QA, exports, memory, performance learning.
--
-- Rerun-safe (IF NOT EXISTS). RLS ENABLED with NO permissive policies on every table:
-- the app + the Vanta Worker read/write via the SERVICE-ROLE client only. Do NOT add
-- `USING (true)` policies for authenticated/anon users. JSONB columns store sanitized
-- artifact data only — no provider credentials/tokens, no raw client PII.
-- Vanta NEVER launches ads or posts content; exports flow into the existing Vault Core
-- creative-brief / meta-campaign-draft approval lanes. No destructive DDL. No backfill.
--
-- Storage buckets (create separately, all PRIVATE): vanta-raw-footage, vanta-proxies,
-- vanta-transcripts, vanta-thumbnails, vanta-captions, vanta-color-previews,
-- vanta-edits, vanta-exports. Path convention: {project_id}/{asset_id}/{artifact}.

-- ── 1. Projects ──────────────────────────────────────────────────────────────
create table if not exists public.vanta_projects (
  id            uuid primary key default gen_random_uuid(),
  client_id     text,                          -- null = Vault Co internal content
  title         text not null,
  description   text,
  industry      text not null default 'roofing',
  objective     text not null default 'lead_generation',
  status        text not null default 'intake',
  brand_kit     jsonb not null default '{}'::jsonb,
  strategy      jsonb not null default '{}'::jsonb,  -- Creative Strategist output
  metadata      jsonb not null default '{}'::jsonb,
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 2. Assets (footage, audio, image, music, sfx, lut, motion template, b-roll) ──
create table if not exists public.vanta_assets (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid references public.vanta_projects(id),
  asset_kind     text not null default 'footage',
  file_name      text not null,
  storage_bucket text,
  storage_path   text,
  source_url     text,                          -- http(s) only, validated app-side
  mime_type      text,
  size_bytes     bigint,
  duration_ms    integer,
  width          integer,
  height         integer,
  fps            numeric,
  codec          text,
  probe          jsonb not null default '{}'::jsonb,   -- ffprobe output (worker)
  audio_analysis jsonb not null default '{}'::jsonb,   -- loudness/noise flags (worker)
  license        jsonb not null default '{}'::jsonb,   -- source/license for library assets
  status         text not null default 'registered',
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── 3. Scenes (detector output) ──────────────────────────────────────────────
create table if not exists public.vanta_scenes (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid references public.vanta_assets(id),
  scene_index integer not null default 0,
  start_ms    integer not null default 0,
  end_ms      integer not null default 0,
  kind        text not null default 'unknown',  -- talking_head | b_roll | drone | site | unknown
  detector    text,                              -- pyscenedetect detector + threshold
  thumb_path  text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ── 4. Clips (scored moments — the heart of footage intelligence) ───────────
create table if not exists public.vanta_clips (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.vanta_projects(id),
  asset_id      uuid references public.vanta_assets(id),
  scene_id      uuid references public.vanta_scenes(id),
  start_ms      integer not null default 0,
  end_ms        integer not null default 0,
  clip_score    integer not null default 0,      -- 1..100
  is_hook       boolean not null default false,
  is_highlight  boolean not null default false,
  is_dead_space boolean not null default false,
  is_emotional  boolean not null default false,
  energy        text,                             -- low | medium | high
  transcript_excerpt text,
  score_reasons jsonb not null default '[]'::jsonb,
  flags         jsonb not null default '[]'::jsonb, -- shake | poor_audio | filler_words | silence
  created_at    timestamptz not null default now()
);

-- ── 5. Transcripts ───────────────────────────────────────────────────────────
create table if not exists public.vanta_transcripts (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid references public.vanta_assets(id),
  language    text not null default 'en',
  source      text not null default 'manual',   -- manual | whisper | import
  full_text   text,
  segments    jsonb not null default '[]'::jsonb, -- [{start_ms,end_ms,text,speaker}]
  word_count  integer not null default 0,
  filler_word_count integer not null default 0,
  storage_path text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 6. Color grades ──────────────────────────────────────────────────────────
create table if not exists public.vanta_color_grades (
  id                 uuid primary key default gen_random_uuid(),
  asset_id           uuid references public.vanta_assets(id),
  project_id         uuid references public.vanta_projects(id),
  detected_condition jsonb not null default '[]'::jsonb, -- log|flat|underexposed|overexposed|bad_wb|poor_skin
  preset_key         text not null default 'vault_signature',
  ffmpeg_recipe      text,
  resolve_recipe     jsonb not null default '{}'::jsonb,
  premiere_recipe    jsonb not null default '{}'::jsonb,
  lut_recommendation text,
  consistency_score  integer not null default 0,   -- 0..100 across project assets
  before_path        text,
  after_path         text,
  notes              text,
  created_at         timestamptz not null default now()
);

-- ── 7. Edit plans (transcript-anchored timelines + sound design cue sheet) ──
create table if not exists public.vanta_edit_plans (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.vanta_projects(id),
  asset_id      uuid references public.vanta_assets(id),
  title         text not null default 'Edit plan',
  format        text not null default 'short_916',  -- short_916 | wide_169 | square_11
  target_duration_s integer,
  story_beats   jsonb not null default '[]'::jsonb,
  timeline      jsonb not null default '[]'::jsonb, -- [{order,clip_id,start_ms,end_ms,note,zoom,broll}]
  pacing_notes  jsonb not null default '[]'::jsonb,
  sound_design  jsonb not null default '[]'::jsonb, -- cue sheet [{at_ms,cue,category}]
  music_brief   jsonb not null default '{}'::jsonb, -- {category,energy,tempo,mood}
  export_spec   jsonb not null default '{}'::jsonb, -- xml/json/otio targets
  status        text not null default 'draft',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 8. Hooks ────────────────────────────────────────────────────────────────
create table if not exists public.vanta_hooks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.vanta_projects(id),
  asset_id     uuid references public.vanta_assets(id),
  clip_id      uuid references public.vanta_clips(id),
  hook_text    text not null,
  hook_type    text not null default 'spoken',  -- spoken | text_overlay | visual | pattern_interrupt
  three_sec_score integer not null default 0,   -- 1..100
  rationale    text,
  created_at   timestamptz not null default now()
);

-- ── 9. Captions ─────────────────────────────────────────────────────────────
create table if not exists public.vanta_captions (
  id           uuid primary key default gen_random_uuid(),
  asset_id     uuid references public.vanta_assets(id),
  project_id   uuid references public.vanta_projects(id),
  format       text not null default 'srt',     -- srt | vtt | styled_json
  payload      text,                             -- srt/vtt body (worker) — sanitized text
  style_spec   jsonb not null default '{}'::jsonb, -- font/colors/emphasis/burn-in recipe
  emphasis_map jsonb not null default '[]'::jsonb,
  storage_path text,
  created_at   timestamptz not null default now()
);

-- ── 10. Thumbnails ──────────────────────────────────────────────────────────
create table if not exists public.vanta_thumbnails (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.vanta_projects(id),
  asset_id      uuid references public.vanta_assets(id),
  concept       text not null,
  layout_spec   jsonb not null default '{}'::jsonb,
  text_options  jsonb not null default '[]'::jsonb,
  ctr_rank      integer not null default 0,
  predicted_ctr_note text,
  image_path    text,
  created_at    timestamptz not null default now()
);

-- ── 11. Exports (deliverables — flow into Vault Core approval lanes) ────────
create table if not exists public.vanta_exports (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.vanta_projects(id),
  edit_plan_id  uuid references public.vanta_edit_plans(id),
  target        text not null default 'internal_review', -- internal_review | creative_brief | meta_campaign_draft
  format        text,
  storage_path  text,
  status        text not null default 'pending',
  linked_brief_id text,                          -- creative_briefs.id when handed off
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 12. Scores (typed score events for any entity) ──────────────────────────
create table if not exists public.vanta_scores (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.vanta_projects(id),
  entity_type text not null,                     -- clip | hook | edit_plan | export | qa
  entity_id   uuid,
  score_kind  text not null,                     -- clip_score | hook_3s | quality | ctr_rank
  score       integer not null default 0,
  reasons     jsonb not null default '[]'::jsonb,
  scored_by   text not null default 'vanta',     -- vanta | human
  created_at  timestamptz not null default now()
);

-- ── 13. Memory (winning patterns — the learn loop) ──────────────────────────
create table if not exists public.vanta_memory (
  id           uuid primary key default gen_random_uuid(),
  memory_kind  text not null,                    -- hook | caption | thumbnail | transition | edit_style | color | cta | sound
  industry     text not null default 'roofing',
  pattern      text not null,                    -- the winning pattern (sanitized text)
  evidence     jsonb not null default '[]'::jsonb,
  win_count    integer not null default 1,
  loss_count   integer not null default 0,
  confidence   numeric not null default 0.5,
  source       text not null default 'performance', -- performance | human | seed
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── 14. Agent runs (job queue + audit — the worker contract) ────────────────
create table if not exists public.vanta_agent_runs (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.vanta_projects(id),
  asset_id     uuid references public.vanta_assets(id),
  agent        text not null,                    -- strategist|footage|color|editor|caption|hook|thumbnail|sound|qa|performance
  job_type     text not null,                    -- analyze|proxy|transcribe|scenes|grade|render|score
  status       text not null default 'queued',   -- queued|claimed|running|succeeded|failed
  params       jsonb not null default '{}'::jsonb,
  params_hash  text,
  result       jsonb not null default '{}'::jsonb,
  error        text,
  claimed_by   text,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── 15. Performance (results joined back to creative — the learning input) ──
create table if not exists public.vanta_performance (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.vanta_projects(id),
  export_id     uuid references public.vanta_exports(id),
  channel       text not null default 'meta',
  period        text,
  impressions   bigint,
  ctr           numeric,
  watch_time_s  numeric,
  hold_3s_pct   numeric,
  cpl           numeric,
  appointments  integer,
  closed_revenue numeric,
  verdict       text,                            -- winner | loser | neutral
  insights      jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_vanta_projects_status   on public.vanta_projects (status);
create index if not exists idx_vanta_projects_client   on public.vanta_projects (client_id);
create index if not exists idx_vanta_projects_created  on public.vanta_projects (created_at desc);
create index if not exists idx_vanta_assets_project    on public.vanta_assets (project_id);
create index if not exists idx_vanta_assets_kind       on public.vanta_assets (asset_kind);
create index if not exists idx_vanta_assets_status     on public.vanta_assets (status);
create index if not exists idx_vanta_scenes_asset      on public.vanta_scenes (asset_id);
create index if not exists idx_vanta_clips_project     on public.vanta_clips (project_id);
create index if not exists idx_vanta_clips_asset       on public.vanta_clips (asset_id);
create index if not exists idx_vanta_clips_score       on public.vanta_clips (clip_score desc);
create index if not exists idx_vanta_transcripts_asset on public.vanta_transcripts (asset_id);
create index if not exists idx_vanta_color_asset       on public.vanta_color_grades (asset_id);
create index if not exists idx_vanta_plans_project     on public.vanta_edit_plans (project_id);
create index if not exists idx_vanta_hooks_project     on public.vanta_hooks (project_id);
create index if not exists idx_vanta_hooks_score       on public.vanta_hooks (three_sec_score desc);
create index if not exists idx_vanta_captions_asset    on public.vanta_captions (asset_id);
create index if not exists idx_vanta_thumbs_project    on public.vanta_thumbnails (project_id);
create index if not exists idx_vanta_exports_project   on public.vanta_exports (project_id);
create index if not exists idx_vanta_scores_project    on public.vanta_scores (project_id);
create index if not exists idx_vanta_scores_entity     on public.vanta_scores (entity_type, entity_id);
create index if not exists idx_vanta_memory_kind       on public.vanta_memory (memory_kind, industry);
create index if not exists idx_vanta_runs_status       on public.vanta_agent_runs (status, created_at);
create index if not exists idx_vanta_runs_project      on public.vanta_agent_runs (project_id);
create index if not exists idx_vanta_perf_project      on public.vanta_performance (project_id);

-- Idempotency: one job per (asset, job_type, params_hash) — repeat enqueues no-op.
create unique index if not exists uq_vanta_runs_dedupe
  on public.vanta_agent_runs (asset_id, job_type, params_hash)
  where params_hash is not null and status in ('queued','claimed','running');

-- ── CHECK constraints (rerun-safe) ───────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vanta_projects_status_chk') then
    alter table public.vanta_projects add constraint vanta_projects_status_chk check (status in (
      'intake','analyzing','review','editing','qa','exported','archived'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vanta_assets_kind_chk') then
    alter table public.vanta_assets add constraint vanta_assets_kind_chk check (asset_kind in (
      'footage','audio','image','music','sfx','lut','motion_template','broll','drone','stock','brand'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vanta_runs_status_chk') then
    alter table public.vanta_agent_runs add constraint vanta_runs_status_chk check (status in (
      'queued','claimed','running','succeeded','failed'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vanta_clips_score_chk') then
    alter table public.vanta_clips add constraint vanta_clips_score_chk check (clip_score between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vanta_hooks_score_chk') then
    alter table public.vanta_hooks add constraint vanta_hooks_score_chk check (three_sec_score between 0 and 100);
  end if;
end $$;

-- ── RLS: on, no policies → service-role only ─────────────────────────────────
alter table public.vanta_projects     enable row level security;
alter table public.vanta_assets       enable row level security;
alter table public.vanta_scenes       enable row level security;
alter table public.vanta_clips        enable row level security;
alter table public.vanta_transcripts  enable row level security;
alter table public.vanta_color_grades enable row level security;
alter table public.vanta_edit_plans   enable row level security;
alter table public.vanta_hooks        enable row level security;
alter table public.vanta_captions     enable row level security;
alter table public.vanta_thumbnails   enable row level security;
alter table public.vanta_exports      enable row level security;
alter table public.vanta_scores       enable row level security;
alter table public.vanta_memory       enable row level security;
alter table public.vanta_agent_runs   enable row level security;
alter table public.vanta_performance  enable row level security;
