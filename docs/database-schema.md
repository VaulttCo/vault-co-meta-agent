# Vault Co — Database Schema

SQL table definitions for the Supabase PostgreSQL database. Run these in order in the Supabase SQL editor (or as a migration file). See `/docs/supabase-setup.md` for full setup instructions.

All tables use `uuid` primary keys, `timestamptz` for timestamps, and include `created_at` / `updated_at` columns with auto-update triggers.

---

## Setup: Enable UUID Extension

```sql
create extension if not exists "pgcrypto";
```

## Setup: Auto-update `updated_at` Trigger

```sql
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```

---

## 1. clients

```sql
create table public.clients (
  id                   text primary key default gen_random_uuid()::text,
  company_name         text not null,
  owner_name           text not null,
  email                text,
  phone                text,
  website              text,
  service_areas        text[]  not null default '{}',
  services_offered     text[]  not null default '{}',
  average_job_value    text,
  monthly_ad_budget    text,
  meta_ad_account_id   text,
  facebook_page_id     text,
  instagram_account_id text,
  meta_pixel_id        text,
  ghl_location_id      text,
  ghl_pipeline_id      text,
  brand_tone           text,
  offer                text,
  notes                text,
  status               text not null default 'onboarding'
                         check (status in ('active','setup','onboarding','paused')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger clients_updated_at
  before update on public.clients
  for each row execute procedure update_updated_at();

-- Row Level Security
alter table public.clients enable row level security;

-- Authenticated users can read all clients (adjust to team/org scoping later)
create policy "Authenticated read clients"
  on public.clients for select
  using (auth.role() = 'authenticated');

create policy "Authenticated insert clients"
  on public.clients for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update clients"
  on public.clients for update
  using (auth.role() = 'authenticated');
```

---

## 2. client_intelligence

```sql
create table public.client_intelligence (
  id                    text primary key default gen_random_uuid()::text,
  client_id             text not null references public.clients(id) on delete cascade,
  onboarding_summary    text,
  company_profile       jsonb not null default '{}',
  service_area          jsonb not null default '{}',
  target_market         jsonb not null default '{}',
  competitive_landscape jsonb not null default '{}',
  kpi_baseline          jsonb not null default '{}',
  sales_audit           jsonb not null default '{}',
  content_planning      jsonb not null default '{}',
  buyer_profile         jsonb not null default '{}',
  market_research       jsonb not null default '{}',
  offer_intelligence    jsonb not null default '{}',
  sales_intelligence    jsonb not null default '{}',
  brand_intelligence    jsonb not null default '{}',
  campaign_implications jsonb not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (client_id)
);

create trigger client_intelligence_updated_at
  before update on public.client_intelligence
  for each row execute procedure update_updated_at();

alter table public.client_intelligence enable row level security;

create policy "Authenticated read intelligence"
  on public.client_intelligence for select
  using (auth.role() = 'authenticated');

create policy "Authenticated upsert intelligence"
  on public.client_intelligence for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update intelligence"
  on public.client_intelligence for update
  using (auth.role() = 'authenticated');
```

---

## 3. creative_assets

```sql
create table public.creative_assets (
  id               text primary key default gen_random_uuid()::text,
  client_id        text not null references public.clients(id) on delete cascade,
  file_name        text not null,
  file_type        text not null check (file_type in ('image','video','gif')),
  asset_type       text not null,
  thumbnail_url    text,
  storage_url      text,
  upload_date      date not null default current_date,
  service          text,
  market           text,
  campaign_use_case text,
  notes            text,
  status           text not null default 'Uploaded'
                     check (status in ('Uploaded','Needs Review','Approved','Used in Campaign','Archived')),
  tags             text[] not null default '{}',
  approved_for_ads boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index creative_assets_client_id_idx on public.creative_assets(client_id);
create index creative_assets_status_idx on public.creative_assets(status);
create index creative_assets_approved_idx on public.creative_assets(approved_for_ads);

create trigger creative_assets_updated_at
  before update on public.creative_assets
  for each row execute procedure update_updated_at();

alter table public.creative_assets enable row level security;

create policy "Authenticated read assets"
  on public.creative_assets for select
  using (auth.role() = 'authenticated');

create policy "Authenticated insert assets"
  on public.creative_assets for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update assets"
  on public.creative_assets for update
  using (auth.role() = 'authenticated');
```

---

## 4. campaign_drafts

```sql
create table public.campaign_drafts (
  id                       text primary key,
  client_id                text not null references public.clients(id) on delete cascade,
  campaign_name            text not null,
  market                   text not null,
  service                  text not null,
  goal                     text not null,
  budget                   text not null,
  creative_type            text,
  creative_asset_id        text references public.creative_assets(id) on delete set null,
  status                   text not null default 'draft'
                             check (status in (
                               'draft','needs_review','changes_requested',
                               'approved','rejected','ready_for_meta','pushed_paused','live'
                             )),
  approval_status          text not null default 'draft'
                             check (approval_status in (
                               'draft','needs_review','changes_requested',
                               'approved','rejected','ready_for_meta','pushed_paused','live'
                             )),
  meta_campaign_structure  jsonb,
  ad_copy                  jsonb,
  lead_form                jsonb,
  ghl_workflow             jsonb,
  creative_direction       jsonb,
  compliance_check         jsonb,
  optimization_rules       jsonb,
  buyer_psychology_used    jsonb,
  market_research_used     jsonb,
  client_intelligence_used jsonb,
  creative_intelligence_used jsonb,
  strategic_rationale      jsonb,
  created_by               text not null default 'AI Agent',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index campaign_drafts_client_id_idx on public.campaign_drafts(client_id);
create index campaign_drafts_status_idx on public.campaign_drafts(status);

create trigger campaign_drafts_updated_at
  before update on public.campaign_drafts
  for each row execute procedure update_updated_at();

alter table public.campaign_drafts enable row level security;

create policy "Authenticated read drafts"
  on public.campaign_drafts for select
  using (auth.role() = 'authenticated');

create policy "Authenticated insert drafts"
  on public.campaign_drafts for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update drafts"
  on public.campaign_drafts for update
  using (auth.role() = 'authenticated');
```

---

## 5. approvals

```sql
create table public.approvals (
  id            text primary key default gen_random_uuid()::text,
  client_id     text not null references public.clients(id) on delete cascade,
  related_type  text not null,   -- 'campaign_draft' | 'creative_asset' | 'budget' | etc.
  related_id    text,            -- FK to the related record
  approval_type text not null,   -- 'campaign' | 'creative' | 'budget' | 'copy' | 'report' | 'workflow'
  title         text not null,
  description   text,
  risk_level    text not null default 'low'
                  check (risk_level in ('low','medium','high')),
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected','changes_requested')),
  requested_by  text not null,
  reviewed_by   text,
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index approvals_client_id_idx on public.approvals(client_id);
create index approvals_status_idx on public.approvals(status);

create trigger approvals_updated_at
  before update on public.approvals
  for each row execute procedure update_updated_at();

alter table public.approvals enable row level security;

create policy "Authenticated read approvals"
  on public.approvals for select
  using (auth.role() = 'authenticated');

create policy "Authenticated insert approvals"
  on public.approvals for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update approvals"
  on public.approvals for update
  using (auth.role() = 'authenticated');
```

---

## 6. reports

```sql
create table public.reports (
  id                   text primary key default gen_random_uuid()::text,
  client_id            text not null references public.clients(id) on delete cascade,
  report_type          text not null default 'weekly'
                         check (report_type in ('weekly','monthly','quarterly')),
  report_period        text,              -- human-readable, e.g. "May 2026 — Week 1"
  report_period_start  date not null,
  report_period_end    date not null,
  spend                numeric(12,2),
  leads                integer,
  booked_appointments  integer,
  cpl                  numeric(10,2),
  cpba                 numeric(10,2),
  show_rate            numeric(5,4),      -- 0.0–1.0
  pipeline_value       numeric(12,2),
  revenue_generated    numeric(12,2),
  summary              text,
  wins                 text[] not null default '{}',
  issues               text[] not null default '{}',
  next_actions         text[] not null default '{}',
  generated_content    jsonb,             -- full WeeklyReportDraft from AI service
  status               text not null default 'draft'
                         check (status in ('draft','published')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index reports_client_id_idx on public.reports(client_id);
create index reports_period_idx on public.reports(report_period_start, report_period_end);

create trigger reports_updated_at
  before update on public.reports
  for each row execute procedure update_updated_at();

alter table public.reports enable row level security;

create policy "Authenticated read reports"
  on public.reports for select
  using (auth.role() = 'authenticated');

create policy "Authenticated insert reports"
  on public.reports for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update reports"
  on public.reports for update
  using (auth.role() = 'authenticated');
```

---

## 7. integration_connections

```sql
create table public.integration_connections (
  id                  text primary key default gen_random_uuid()::text,
  client_id           text not null references public.clients(id) on delete cascade,
  provider            text not null,   -- 'meta' | 'ghl' | 'google_ads' | 'stripe' etc.
  provider_account_id text,
  connection_status   text not null default 'disconnected'
                        check (connection_status in ('connected','disconnected','error','pending')),
  last_synced_at      timestamptz,
  metadata            jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (client_id, provider)
);

create index integration_connections_client_id_idx on public.integration_connections(client_id);

create trigger integration_connections_updated_at
  before update on public.integration_connections
  for each row execute procedure update_updated_at();

alter table public.integration_connections enable row level security;

create policy "Authenticated read integrations"
  on public.integration_connections for select
  using (auth.role() = 'authenticated');

create policy "Authenticated upsert integrations"
  on public.integration_connections for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update integrations"
  on public.integration_connections for update
  using (auth.role() = 'authenticated');
```

---

## 8. client_integration_credentials

Stores per-client encrypted API credentials for Meta Ads and GoHighLevel.
`encrypted_data` is AES-256-GCM ciphertext — never readable without `CREDENTIAL_ENCRYPTION_KEY`.
All reads and writes go through the Supabase service role client. No authenticated user policies
are granted; RLS is enabled with no select/insert/update policies so direct client access is denied.

```sql
create table public.client_integration_credentials (
  id             text primary key default gen_random_uuid()::text,
  client_id      text not null references public.clients(id) on delete cascade,
  provider       text not null check (provider in ('meta', 'ghl')),
  encrypted_data text not null,
  account_id     text,
  account_label  text,
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (client_id, provider)
);

create index client_integration_credentials_client_id_idx
  on public.client_integration_credentials(client_id);

create trigger client_integration_credentials_updated_at
  before update on public.client_integration_credentials
  for each row execute procedure update_updated_at();

-- RLS enabled — no authenticated policies — all access via service role only
alter table public.client_integration_credentials enable row level security;
```

---

## 9. meta_campaign_snapshots

Point-in-time snapshots of Meta Ads campaign performance, written by `/api/integrations/meta/sync`.
Each row covers one campaign for one date range. The sync route upserts on
`(client_id, campaign_id, date_start, date_end)`.

```sql
create table public.meta_campaign_snapshots (
  id              text primary key default gen_random_uuid()::text,
  client_id       text not null references public.clients(id) on delete cascade,
  meta_account_id text,
  campaign_id     text not null,
  campaign_name   text,
  status          text,
  objective       text,
  spend           numeric(12,2),
  impressions     integer,
  clicks          integer,
  ctr             numeric(10,6),
  cpc             numeric(10,6),
  cpm             numeric(10,6),
  leads           integer,
  cpl             numeric(10,2),
  date_start      date not null,
  date_end        date not null,
  raw_payload     jsonb,
  synced_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (client_id, campaign_id, date_start, date_end)
);

create index meta_campaign_snapshots_client_id_idx
  on public.meta_campaign_snapshots(client_id);
create index meta_campaign_snapshots_synced_at_idx
  on public.meta_campaign_snapshots(synced_at desc);

alter table public.meta_campaign_snapshots enable row level security;

create policy "Authenticated read meta snapshots"
  on public.meta_campaign_snapshots for select
  using (auth.role() = 'authenticated');
```

---

## 10. ghl_pipeline_snapshots

Point-in-time snapshots of GoHighLevel pipeline data, written by `/api/integrations/ghl/sync`.
One row per client location (upserted on `(client_id, ghl_location_id)`), always reflecting
the most recent sync.

```sql
create table public.ghl_pipeline_snapshots (
  id                  text primary key default gen_random_uuid()::text,
  client_id           text not null references public.clients(id) on delete cascade,
  ghl_location_id     text not null,
  leads               integer,
  contacts            integer,
  appointments        integer,
  booked_appointments integer,
  show_rate           numeric(5,2),
  opportunities       integer,
  pipeline_value      numeric(12,2),
  closed_revenue      numeric(12,2),
  raw_payload         jsonb,
  synced_at           timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  unique (client_id, ghl_location_id)
);

create index ghl_pipeline_snapshots_client_id_idx
  on public.ghl_pipeline_snapshots(client_id);
create index ghl_pipeline_snapshots_synced_at_idx
  on public.ghl_pipeline_snapshots(synced_at desc);

alter table public.ghl_pipeline_snapshots enable row level security;

create policy "Authenticated read ghl snapshots"
  on public.ghl_pipeline_snapshots for select
  using (auth.role() = 'authenticated');
```

---

## Run Order

Execute the SQL blocks in this order:

1. `create extension if not exists "pgcrypto"`
2. `create or replace function update_updated_at()`
3. `clients` table
4. `client_intelligence` table
5. `creative_assets` table
6. `campaign_drafts` table
7. `approvals` table
8. `reports` table
9. `integration_connections` table
10. `client_integration_credentials` table
11. `meta_campaign_snapshots` table
12. `ghl_pipeline_snapshots` table

## Seed Data — 4 Demo Clients

Run in the Supabase SQL Editor after creating all tables.

```sql
-- ─────────────────────────────────────────────────────────────
-- Seed clients
-- ─────────────────────────────────────────────────────────────

insert into public.clients (
  id, company_name, owner_name, email, phone, website,
  service_areas, services_offered, average_job_value, monthly_ad_budget,
  meta_ad_account_id, meta_pixel_id, facebook_page_id, instagram_account_id,
  ghl_location_id, ghl_pipeline_id, brand_tone, offer, notes, status
) values
(
  'jj-roofing-group',
  'JJ Roofing Group',
  'Jason Johnson',
  'jason@jjroofinggroup.com',
  '(480) 555-0182',
  'jjroofinggroup.com',
  array['Tempe, AZ'],
  array['Roof Repair','Roof Replacement','Roof Inspections','Storm Damage'],
  '$12,000',
  '$1,500/mo',
  'act_110482930',
  '482910372849',
  'JJRoofingGroup',
  '@jjroofing_az',
  'GHL-AZ-0012',
  'PIPE-JJ-001',
  'Trustworthy, local, professional. We help Tempe homeowners protect their biggest investment.',
  'Schedule a Free Roof Inspection',
  'Active since March 2026. Budget focused on lead gen, not brand awareness. Owner prefers Monday morning check-ins.',
  'active'
),
(
  'open-forge-construction',
  'Open Forge Construction',
  'Marcus Webb',
  'marcus@openforge.build',
  '(404) 555-0247',
  'openforge.build',
  array['Georgia'],
  array['Kitchen Remodeling','Bathroom Remodeling','Basement Remodeling','Home Remodeling'],
  '$30,000',
  '$3,000/mo',
  'act_220594841',
  '594830261748',
  'OpenForgeConstruction',
  '@openforge_ga',
  'GHL-GA-0034',
  'PIPE-OF-002',
  'Premium, reliable, detail-focused. We speak to homeowners investing in their forever home.',
  'Book a Free Remodeling Consultation',
  'Longer sales cycle — 2–4 weeks from lead to booked. Focus on quality leads over volume.',
  'active'
),
(
  'acorns-roofing',
  'Acorns Roofing',
  'Derek Shields',
  'derek@acornsroofing.com',
  '(678) 555-0394',
  'acornsroofing.com',
  array['Georgia'],
  array['Residential Roofing','Roof Repair','Roof Replacement','Roof Inspections'],
  '$10,000',
  '$2,500/mo',
  null,
  null,
  'AcornsRoofing',
  '@acorns_roofing',
  'GHL-GA-0056',
  null,
  'Local, honest, community-based. Georgia homeowners trust Acorns because we''re neighbors first.',
  'Free Roof Inspection',
  'Currently in setup phase. Meta Pixel being installed on website. Ad account access pending.',
  'setup'
),
(
  'kaczmar-builders',
  'Kaczmar Builders',
  'Stanley Kaczmar',
  'stan@kaczmarbuilders.com',
  '216-210-3645',
  'kaczmarbuilders.com',
  array['Northeast Ohio'],
  array['Roof Replacement','Storm Damage Inspection','Roof Repair','Remodeling'],
  '$25,000',
  '$2,000/mo',
  null,
  null,
  'KaczmarBuilders',
  '@kaczmar_build',
  null,
  null,
  'Friendly, direct, personable. Family-owned luxury roofing for Northeast Ohio homeowners who want quality, warranty, and a contractor they can actually trust.',
  'Schedule a Warranty-Backed Roof Replacement Consultation',
  'Intake call completed May 2026. GAF Certified Plus. Full intelligence extracted. GHL and Meta access not yet granted.',
  'onboarding'
);
```

> After seeding clients, run the full `docs/database-schema.md` SQL in order (including tables), then paste the seed block. The `id` values must match the client IDs used in campaign drafts and intelligence records.

---

## Storage Buckets

Creative asset files (images, videos) are stored in Supabase Storage, not in the database. Create these buckets in the Supabase dashboard under Storage:

| Bucket | Public | Description |
|---|---|---|
| `creative-assets` | No | Raw uploaded files |
| `creative-thumbnails` | Yes | Compressed thumbnail previews |

RLS policies for the `creative-assets` bucket should mirror the table policies: authenticated users can read and write.
