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

## 11. veronica_drafts

Approval-ready work products saved from the Veronica Console. Stores the full text of
Veronica-generated outputs (blueprints, messaging drafts, briefs, task lists) for operator
review. This is internal only — no row here triggers any external action.

```sql
create table public.veronica_drafts (
  id              text        primary key default gen_random_uuid()::text,
  client_id       text        references public.clients(id) on delete set null,
  draft_type      text        not null
                    check (draft_type in (
                      'campaign_draft',
                      'ghl_workflow_blueprint',
                      'client_message_draft',
                      'creative_brief',
                      'internal_task_list',
                      'report_draft',
                      'ad_copy_draft'
                    )),
  title           text        not null,
  content         text        not null,
  source_prompt   text,
  agents_used     text[]      not null default '{}',
  data_sources    text[]      not null default '{}',
  approval_status text        not null default 'needs_review'
                    check (approval_status in (
                      'needs_review', 'approved', 'changes_requested', 'archived'
                    )),
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index veronica_drafts_client_id_idx  on public.veronica_drafts(client_id);
create index veronica_drafts_type_idx       on public.veronica_drafts(draft_type);
create index veronica_drafts_status_idx     on public.veronica_drafts(approval_status);
create index veronica_drafts_created_at_idx on public.veronica_drafts(created_at desc);

create trigger veronica_drafts_updated_at
  before update on public.veronica_drafts
  for each row execute procedure update_updated_at();

alter table public.veronica_drafts enable row level security;

create policy "Authenticated read veronica drafts"
  on public.veronica_drafts for select
  using (auth.role() = 'authenticated');

create policy "Authenticated insert veronica drafts"
  on public.veronica_drafts for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update veronica drafts"
  on public.veronica_drafts for update
  using (auth.role() = 'authenticated');
```

---

## 12. operator_tasks

Internal execution queue for Vault Co tasks. Operator-only — not client-facing.
Stores tasks created manually or saved from Veronica recommendations.
No row in this table represents a live external action — it is a tracking record only.

```sql
create table public.operator_tasks (
  id              text primary key default gen_random_uuid()::text,
  client_id       text references public.clients(id) on delete set null,
  title           text not null,
  description     text,
  task_type       text not null default 'internal_admin'
                    check (task_type in (
                      'integration','creative','campaign','ghl_workflow',
                      'client_message','reporting','follow_up',
                      'sales_process','data_cleanup','internal_admin'
                    )),
  priority        text not null default 'medium'
                    check (priority in ('urgent','high','medium','low')),
  status          text not null default 'open'
                    check (status in ('open','in_progress','blocked','done','archived')),
  source          text not null default 'manual'
                    check (source in ('manual','veronica')),
  source_agent    text,
  source_draft_id text references public.veronica_drafts(id) on delete set null,
  due_date        date,
  assigned_to     text,
  created_by      text,
  checklist       jsonb not null default '[]',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index operator_tasks_client_id_idx  on public.operator_tasks(client_id);
create index operator_tasks_status_idx     on public.operator_tasks(status);
create index operator_tasks_priority_idx   on public.operator_tasks(priority);
create index operator_tasks_created_at_idx on public.operator_tasks(created_at desc);

create trigger operator_tasks_updated_at
  before update on public.operator_tasks
  for each row execute procedure update_updated_at();

alter table public.operator_tasks enable row level security;

create policy "Authenticated read operator tasks"
  on public.operator_tasks for select
  using (auth.role() = 'authenticated');

create policy "Authenticated insert operator tasks"
  on public.operator_tasks for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update operator tasks"
  on public.operator_tasks for update
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
13. `veronica_drafts` table
14. `operator_tasks` table

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

---

## Migrations

### Phase 3 — Operator Queue Guided Execution Steps

Add checklist column to `operator_tasks`. Run this in the Supabase SQL editor **after** the base table has been created:

```sql
alter table public.operator_tasks
  add column if not exists checklist jsonb not null default '[]';
```

This is safe to run on an existing table with rows — existing tasks get an empty checklist (`[]`) and the UI falls back to the per-task-type default template until the operator checks a step (which then saves the checklist to the DB).

---

### Phase 2A — Revenue Dashboard: Client Revenue Settings

Creates the `client_revenue_settings` table. Run this in the Supabase SQL editor **after** the `clients` table exists.

```sql
create table if not exists public.client_revenue_settings (
  id                           text primary key default gen_random_uuid()::text,
  client_id                    text not null references public.clients(id) on delete cascade,

  -- Recurring billing
  recurring_billing_active     boolean not null default false,
  recurring_billing_start_date date,

  -- Setup fee structure
  setup_fee_total              numeric(10,2) not null default 7000.00,
  setup_month_1_amount         numeric(10,2) not null default 3500.00,
  setup_month_2_amount         numeric(10,2) not null default 3500.00,

  -- Partner split configuration
  jaxon_setup_split            numeric(6,4) not null default 0.5700,
  nick_setup_split             numeric(6,4) not null default 0.4300,
  recurring_fee_percentage     numeric(6,4) not null default 0.0500,
  nick_recurring_split         numeric(6,4) not null default 1.0000,
  jaxon_recurring_split        numeric(6,4) not null default 0.0000,

  -- Integrations (reference data only — not used to call external APIs in Phase 2A)
  ghl_pipeline_id              text,
  ghl_location_id              text,
  stripe_customer_id           text,

  -- Invoice automation gates — always false until explicitly approved in a later phase
  stripe_invoice_auto_create   boolean not null default false,
  stripe_invoice_auto_send     boolean not null default false,

  -- Manual fallback
  manual_revenue_entry_enabled boolean not null default true,

  notes                        text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),

  constraint client_revenue_settings_client_id_unique unique (client_id)
);

create trigger client_revenue_settings_updated_at
  before update on public.client_revenue_settings
  for each row execute procedure update_updated_at();

alter table public.client_revenue_settings enable row level security;

create policy "Authenticated read revenue settings"
  on public.client_revenue_settings for select
  using (auth.role() = 'authenticated');

create policy "Authenticated insert revenue settings"
  on public.client_revenue_settings for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update revenue settings"
  on public.client_revenue_settings for update
  using (auth.role() = 'authenticated');
```

**Safety notes:**
- `stripe_invoice_auto_create` and `stripe_invoice_auto_send` default `false` and are not writable via any Phase 2A API endpoint.
- `ghl_pipeline_id`, `ghl_location_id`, `stripe_customer_id` are stored as reference data only — no external API is called in Phase 2A.
- This table has no effect on any existing page. Only `/revenue-dashboard` reads from it.

---

### Phase 2B — Revenue Dashboard: Monthly Revenue Snapshots

Creates the `client_monthly_revenue_snapshots` table. Run this in the Supabase SQL editor **after** the `clients` table and `client_revenue_settings` table exist.

```sql
create table if not exists public.client_monthly_revenue_snapshots (
  id                       text primary key default gen_random_uuid()::text,
  client_id                text not null references public.clients(id) on delete cascade,

  -- Billing period (first day of the month, e.g. 2026-05-01)
  billing_month            date not null,

  -- Revenue figures — manual entry or future GHL sync
  -- closed_won_revenue is the client's own revenue, NOT Vault Co's collected revenue
  closed_won_revenue       numeric(12,2) not null default 0,

  -- Vault Co fee (computed server-side: closed_won_revenue * recurring_fee_percentage)
  vault_co_fee             numeric(12,2) not null default 0,
  recurring_fee_percentage numeric(6,4)  not null default 0.0500,

  -- Partner earnings (computed server-side)
  -- nick_recurring_earnings = vault_co_fee (100% of recurring to Nick)
  -- jaxon_recurring_earnings = 0 (Jaxon earns $0 on recurring)
  nick_recurring_earnings  numeric(12,2) not null default 0,
  jaxon_recurring_earnings numeric(12,2) not null default 0,

  -- Source of data: manual entry (Phase 2B) or future GHL sync (Phase 2C)
  source                   text not null default 'manual'
                             check (source in ('manual', 'ghl')),

  -- Review workflow gate for future Stripe draft invoice creation (Phase 2C)
  review_status            text not null default 'draft'
                             check (review_status in ('draft', 'reviewed', 'locked')),

  notes                    text,
  created_by               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- One manual row + one GHL row allowed per client per month
  constraint client_monthly_revenue_snapshots_unique
    unique (client_id, billing_month, source)
);

create index client_monthly_revenue_snapshots_client_id_idx
  on public.client_monthly_revenue_snapshots(client_id);
create index client_monthly_revenue_snapshots_billing_month_idx
  on public.client_monthly_revenue_snapshots(billing_month desc);

create trigger client_monthly_revenue_snapshots_updated_at
  before update on public.client_monthly_revenue_snapshots
  for each row execute procedure update_updated_at();

alter table public.client_monthly_revenue_snapshots enable row level security;

create policy "Authenticated read revenue snapshots"
  on public.client_monthly_revenue_snapshots for select
  using (auth.role() = 'authenticated');

create policy "Authenticated insert revenue snapshots"
  on public.client_monthly_revenue_snapshots for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update revenue snapshots"
  on public.client_monthly_revenue_snapshots for update
  using (auth.role() = 'authenticated');
```

**Safety notes:**
- `closed_won_revenue` is the client's own Closed Won revenue. It is not Vault Co's collected revenue, not a confirmed payment, and not an invoice amount.
- `vault_co_fee` is computed server-side as `closed_won_revenue * recurring_fee_percentage`. It is Vault Co's estimated fee — not a collected or invoiced amount.
- All rows default to `review_status: 'draft'`. Only `review_status: 'locked'` will be used as a gate for Stripe draft invoice creation in a future phase.
- `source: 'ghl'` rows are written by Phase 2C GHL sync. Phase 2B only writes `source: 'manual'` rows.
- No Stripe API is called in Phase 2B. No invoice is created or sent. No GHL write is performed.
- `jaxon_recurring_earnings` is always `0` — Jaxon earns $0 on recurring revenue per the Vault Co business model.

---

### Phase 2C — Revenue Dashboard: GHL Snapshot Metadata

Adds metadata columns to `client_monthly_revenue_snapshots` to support GHL read-only sync previews and deal tracking. Run **after** the Phase 2B migration.

```sql
alter table public.client_monthly_revenue_snapshots
  add column if not exists deal_count     integer      not null default 0,
  add column if not exists source_payload jsonb        not null default '{}'::jsonb,
  add column if not exists synced_at      timestamptz,
  add column if not exists reviewed_at    timestamptz;
```

**Column notes:**
- `deal_count` — number of Closed Won deals pulled from GHL for this snapshot. `0` for manual entries.
- `source_payload` — safe JSON summary of the GHL deals (name, amount, status, closedDate). No contact IDs, no personal data, no GHL API tokens.
- `synced_at` — timestamp of the GHL read-only pull that produced this snapshot. `null` for manual entries.
- `reviewed_at` — reserved for a future review-lock workflow. Not written by Phase 2C.
- No invoice columns are added. No Stripe columns are added. No GHL write is performed by Phase 2C.

---

### Phase 2E — Revenue Dashboard: Stripe Draft Invoice Columns

Adds Stripe invoice tracking columns to `client_monthly_revenue_snapshots`. Run **after** the Phase 2C migration (which added `reviewed_at`).

No invoice is created, sent, finalized, or charged by this migration — it only adds nullable columns for storing Stripe invoice metadata after a human explicitly triggers draft creation via the API.

```sql
alter table public.client_monthly_revenue_snapshots
  add column if not exists stripe_invoice_id          text,
  add column if not exists stripe_invoice_status      text,
  add column if not exists stripe_invoice_url         text,
  add column if not exists invoice_draft_created_at   timestamptz;
```

**Column notes:**
- `stripe_invoice_id` — Stripe invoice object ID (e.g. `in_1234...`). Null until a draft is explicitly created. Used as a duplicate-creation guard: if non-null, the create-invoice-draft endpoint returns 409.
- `stripe_invoice_status` — Stripe invoice status at the time of creation (always `"draft"` for Phase 2E). Updated if the snapshot is re-fetched after a Stripe state change.
- `stripe_invoice_url` — Stripe-hosted invoice URL (read-only admin link). Null until created. Never exposed to end clients.
- `invoice_draft_created_at` — Server timestamp when the draft was created. Null until then.
- No `auto_advance`, no `send_invoice`, no finalize. Draft only.

---

### GHL Sync Phase 2 — Per-Opportunity Pipeline Snapshots

Creates the `ghl_opportunity_snapshots` table. Run in the Supabase SQL editor **after** the `clients` table exists.
Each row is one GHL opportunity at a point in time, upserted on `(client_id, opportunity_id)`.
This table is **read-only from GHL** — the sync route only writes to this Supabase table; it never modifies GHL.

```sql
create table if not exists public.ghl_opportunity_snapshots (
  id                  text primary key default gen_random_uuid()::text,
  client_id           text not null references public.clients(id) on delete cascade,
  ghl_location_id     text,
  opportunity_id      text not null,
  contact_id          text,
  pipeline_id         text,
  pipeline_stage_id   text,
  pipeline_stage_name text,
  opportunity_name    text,
  contact_name        text,
  status              text,
  monetary_value      numeric(12,2),
  source              text,
  assigned_user       text,
  created_at_ghl      timestamptz,
  updated_at_ghl      timestamptz,
  last_activity_at    timestamptz,
  appointment_status  text,
  raw_payload         jsonb,
  synced_at           timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  constraint ghl_opportunity_snapshots_unique unique (client_id, opportunity_id)
);

create index ghl_opportunity_snapshots_client_id_idx
  on public.ghl_opportunity_snapshots(client_id);
create index ghl_opportunity_snapshots_synced_at_idx
  on public.ghl_opportunity_snapshots(synced_at desc);
create index ghl_opportunity_snapshots_status_idx
  on public.ghl_opportunity_snapshots(status);

alter table public.ghl_opportunity_snapshots enable row level security;

create policy "Authenticated read ghl opportunity snapshots"
  on public.ghl_opportunity_snapshots for select
  using (auth.role() = 'authenticated');

create policy "Authenticated insert ghl opportunity snapshots"
  on public.ghl_opportunity_snapshots for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update ghl opportunity snapshots"
  on public.ghl_opportunity_snapshots for update
  using (auth.role() = 'authenticated');
```

**Safety notes:**
- The sync route (`POST /api/integrations/ghl/sync-opportunities`) only reads from GHL and writes to this Supabase table.
- No GHL contacts are created or modified. No GHL opportunities are moved or updated.
- `contact_name` is stored as a display label only — no phone or email is stored.
- `raw_payload` stores the full GHL API response for this opportunity (server-side only — never returned to the frontend directly).
- `assigned_user` stores the GHL user ID assigned to the opportunity. No user management is performed.
