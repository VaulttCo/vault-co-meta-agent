-- ─────────────────────────────────────────────────────────────
-- Vault Core — Vault Memory schema (Phase 1)
-- Run this in your Supabase SQL editor.
--
-- These tables back Layer 1 (Vault Memory). Until they exist, the app
-- falls back to a seeded in-memory mock graph (see src/lib/core/memory/
-- mock-graph.ts) so /vault-memory renders and the agent runtime works
-- with zero database. This file is purely additive — it never alters or
-- drops any existing table.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- VAULT NODES
-- Every unit of knowledge in the company is a node. Vega and (later) the
-- rest of the workforce write nodes; the knowledge graph reads them.
-- `ref_type`/`ref_id` optionally point a node at an existing portal record
-- (e.g. a client, campaign) WITHOUT a FK so this schema stays decoupled.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- lead | client | campaign | ad | hook | script | conversation | call |
  -- revenue_event | sop | workflow | recommendation | agent | proposal |
  -- portal_system | decision | initiative | insight | memory_core
  category TEXT NOT NULL,

  label TEXT NOT NULL,
  summary TEXT,

  confidence NUMERIC NOT NULL DEFAULT 0.5,  -- 0..1
  source_agent TEXT,                        -- which agent created/owns it

  ref_type TEXT,                            -- optional pointer to a portal record
  ref_id TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_nodes_category   ON vault_nodes (category);
CREATE INDEX IF NOT EXISTS idx_vault_nodes_source     ON vault_nodes (source_agent);
CREATE INDEX IF NOT EXISTS idx_vault_nodes_ref        ON vault_nodes (ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_vault_nodes_created_at ON vault_nodes (created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- VAULT EDGES
-- Directed relationships between nodes. Relationships continuously expand
-- as the workforce discovers new connections.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  from_node UUID NOT NULL REFERENCES vault_nodes(id) ON DELETE CASCADE,
  to_node   UUID NOT NULL REFERENCES vault_nodes(id) ON DELETE CASCADE,

  -- connected_to | influences | contributed_by | impacts | derived_from
  relationship TEXT NOT NULL DEFAULT 'connected_to',
  weight NUMERIC NOT NULL DEFAULT 0.5,       -- 0..1 relationship strength
  source_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (from_node, to_node, relationship)
);

CREATE INDEX IF NOT EXISTS idx_vault_edges_from ON vault_edges (from_node);
CREATE INDEX IF NOT EXISTS idx_vault_edges_to   ON vault_edges (to_node);

-- ─────────────────────────────────────────────────────────────
-- VAULT ACTIVITY
-- The continuously-updating operational feed. Every agent cycle that does
-- something appends here — this is what makes the system feel "alive at 3:17 AM".
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent TEXT NOT NULL,
  -- insight | analysis | recommendation | memory_update | collaboration | monitor
  kind TEXT NOT NULL DEFAULT 'analysis',
  message TEXT NOT NULL,

  node_id UUID REFERENCES vault_nodes(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_activity_created_at ON vault_activity (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_activity_agent      ON vault_activity (agent);

-- ─────────────────────────────────────────────────────────────
-- VAULT RECOMMENDATIONS
-- Agent-generated recommendations awaiting human review (Layer 4 / Command Hub).
-- Vault Core may recommend but NEVER acts — `status` is moved by humans only.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  impact TEXT,                               -- e.g. "Could lift booked calls ~12%"
  priority_score NUMERIC NOT NULL DEFAULT 0.5,

  -- open | reviewed | accepted | dismissed  (changed by humans only)
  status TEXT NOT NULL DEFAULT 'open',

  node_id UUID REFERENCES vault_nodes(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_recs_status     ON vault_recommendations (status);
CREATE INDEX IF NOT EXISTS idx_vault_recs_created_at ON vault_recommendations (created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- VAULT AGENT RUNS
-- One row per agent cycle execution. Powers Workforce Health + observability
-- and lets the runtime see when each agent last ran.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent TEXT NOT NULL,
  tier TEXT NOT NULL,                        -- 5min | 15min | hourly | daily | weekly | monthly
  status TEXT NOT NULL DEFAULT 'success',    -- success | error | skipped
  nodes_created INTEGER NOT NULL DEFAULT 0,
  edges_created INTEGER NOT NULL DEFAULT 0,
  recommendations_created INTEGER NOT NULL DEFAULT 0,
  activity_created INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  detail TEXT,

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vault_runs_agent      ON vault_agent_runs (agent);
CREATE INDEX IF NOT EXISTS idx_vault_runs_started_at ON vault_agent_runs (started_at DESC);

-- ─────────────────────────────────────────────────────────────
-- RLS NOTE
-- All Vault Core reads/writes go through the service-role server client,
-- which bypasses RLS. If you enable RLS on these tables, add a service-role
-- policy. Do NOT expose these tables to the anon key.
-- ─────────────────────────────────────────────────────────────
