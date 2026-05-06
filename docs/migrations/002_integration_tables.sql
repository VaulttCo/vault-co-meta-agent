-- Migration 002: Integration tables for Meta Ads and GoHighLevel read-only sync
-- Run this in Supabase SQL Editor or via the Management API

-- ─── integration_connections ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           TEXT NOT NULL,
  provider            TEXT NOT NULL CHECK (provider IN ('meta', 'ghl')),
  provider_account_id TEXT,
  connection_status   TEXT NOT NULL DEFAULT 'not_connected'
                        CHECK (connection_status IN ('not_connected', 'connected', 'sync_failed', 'testing')),
  last_synced_at      TIMESTAMPTZ,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, provider)
);

ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_connections_all" ON public.integration_connections
  FOR ALL USING (true) WITH CHECK (true);

-- ─── meta_campaign_snapshots ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meta_campaign_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        TEXT NOT NULL,
  meta_account_id  TEXT NOT NULL,
  campaign_id      TEXT NOT NULL,
  campaign_name    TEXT,
  status           TEXT,
  objective        TEXT,
  spend            NUMERIC,
  impressions      BIGINT,
  clicks           BIGINT,
  ctr              NUMERIC,
  cpc              NUMERIC,
  cpm              NUMERIC,
  leads            BIGINT,
  cpl              NUMERIC,
  date_start       DATE,
  date_end         DATE,
  raw_payload      JSONB,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, campaign_id, date_start, date_end)
);

ALTER TABLE public.meta_campaign_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_campaign_snapshots_all" ON public.meta_campaign_snapshots
  FOR ALL USING (true) WITH CHECK (true);

-- ─── ghl_pipeline_snapshots ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ghl_pipeline_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             TEXT NOT NULL,
  ghl_location_id       TEXT NOT NULL,
  pipeline_id           TEXT,
  leads                 BIGINT,
  contacts              BIGINT,
  appointments          BIGINT,
  booked_appointments   BIGINT,
  show_rate             NUMERIC,
  opportunities         BIGINT,
  pipeline_value        NUMERIC,
  closed_revenue        NUMERIC,
  raw_payload           JSONB,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ghl_pipeline_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ghl_pipeline_snapshots_all" ON public.ghl_pipeline_snapshots
  FOR ALL USING (true) WITH CHECK (true);

-- ─── updated_at trigger for integration_connections ───────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_integration_connections_updated_at ON public.integration_connections;
CREATE TRIGGER set_integration_connections_updated_at
  BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
