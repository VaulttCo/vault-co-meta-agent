-- Vault Core — Competitor Intelligence schema (Phase 8.4)
-- Internal, manual-sourced competitor profiles + intelligence captures.
-- Rerun-safe (IF NOT EXISTS). RLS is ENABLED with NO permissive policies:
-- the app reads/writes via the SERVICE-ROLE server client (bypasses RLS), exactly
-- like the other internal vault_* tables. Do NOT add `USING (true)` policies for
-- authenticated/anon users — these tables must never be client-readable directly.
-- No external data, no credentials, no client PII, no raw provider payloads.

create table if not exists public.competitor_profiles (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  website                     text,
  market_niche                text,
  service_area                text,
  offer_notes                 text,
  social_links                text[] not null default '{}',
  meta_ad_library_url         text,
  google_business_profile_url text,
  notes                       text,
  status                      text not null default 'active',
  client_id                   text,
  industry                    text,
  location                    text,
  priority                    text,
  tags                        text[] not null default '{}',
  source                      text not null default 'manual',
  confidence                  double precision not null default 0.5,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  created_by                  text,
  last_reviewed_at            timestamptz
);

create table if not exists public.competitor_intelligence_captures (
  id                        uuid primary key default gen_random_uuid(),
  competitor_profile_id     uuid not null references public.competitor_profiles(id) on delete cascade,
  client_id                 text,
  capture_type              text not null,
  hook                      text,
  offer                     text,
  angle                     text,
  screenshot_url            text,
  ad_copy                   text,
  landing_page_url          text,
  pricing_positioning_notes text,
  creative_pattern          text,
  source_url                text,
  source_platform           text,
  observed_at               text,
  confidence                double precision not null default 0.5,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                text
);

create index if not exists idx_competitor_captures_profile
  on public.competitor_intelligence_captures (competitor_profile_id);
create index if not exists idx_competitor_captures_created
  on public.competitor_intelligence_captures (created_at desc);
create index if not exists idx_competitor_profiles_created
  on public.competitor_profiles (created_at desc);

-- RLS on, no policies → only the service-role server client can read/write.
alter table public.competitor_profiles                enable row level security;
alter table public.competitor_intelligence_captures   enable row level security;
