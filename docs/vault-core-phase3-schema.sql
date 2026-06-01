-- ─────────────────────────────────────────────────────────────
-- Vault Core — Phase 3 schema (Workforce Collaboration Engine)
-- Run AFTER docs/vault-core-schema.sql and docs/vault-core-phase2-schema.sql.
--
-- Purely additive. Mock fallback keeps everything functional with zero database.
-- Agents collaborate, accumulate reputation, pursue objectives, and propose
-- system improvements — but nothing here executes any external action.
-- ─────────────────────────────────────────────────────────────

-- ── AGENT MESSAGES ───────────────────────────────────────────
-- The communication bus between executives.
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  from_agent TEXT NOT NULL,
  to_agent   TEXT,                      -- NULL = broadcast to the workforce

  -- share_discovery | request_analysis | escalate | share_context |
  -- assign_investigation | joint_proposal | response
  kind TEXT NOT NULL DEFAULT 'share_discovery',

  subject TEXT NOT NULL,
  body TEXT,

  related_node_ids UUID[] NOT NULL DEFAULT '{}',
  collaboration_id UUID,                -- set when part of a collaboration thread

  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created ON agent_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_messages_collab  ON agent_messages (collaboration_id);

-- ── AGENT TASKS ──────────────────────────────────────────────
-- One executive assigning investigative work to another.
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  assigned_to TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,

  status TEXT NOT NULL DEFAULT 'open',  -- open | in_progress | done
  collaboration_id UUID,
  related_node_ids UUID[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_assignee ON agent_tasks (assigned_to, status);

-- ── AGENT COLLABORATIONS ─────────────────────────────────────
-- A multi-agent thread that culminates in a joint recommendation.
CREATE TABLE IF NOT EXISTS agent_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,
  initiator TEXT NOT NULL,
  participants TEXT[] NOT NULL DEFAULT '{}',

  status TEXT NOT NULL DEFAULT 'open',   -- open | in_progress | resolved
  summary TEXT,

  joint_recommendation_id UUID REFERENCES vault_recommendations(id) ON DELETE SET NULL,
  related_node_ids UUID[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_agent_collab_status ON agent_collaborations (status, created_at DESC);

-- ── AGENT OBJECTIVES ─────────────────────────────────────────
-- Measurable goals per executive (progress 0..1).
CREATE TABLE IF NOT EXISTS agent_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent TEXT NOT NULL,
  objective TEXT NOT NULL,
  metric TEXT,
  target NUMERIC NOT NULL DEFAULT 1,
  progress NUMERIC NOT NULL DEFAULT 0,    -- 0..1
  period TEXT NOT NULL DEFAULT 'quarter', -- week | month | quarter

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent, objective)
);
CREATE INDEX IF NOT EXISTS idx_agent_objectives_agent ON agent_objectives (agent);

-- ── AGENT REPUTATION ─────────────────────────────────────────
-- Accumulated standing per executive. Scores are 0..100; revenue in dollars.
CREATE TABLE IF NOT EXISTS agent_reputation (
  agent TEXT PRIMARY KEY,

  trust_score INTEGER NOT NULL DEFAULT 50,
  accuracy_score INTEGER NOT NULL DEFAULT 50,
  adoption_rate INTEGER NOT NULL DEFAULT 0,         -- percent
  influence_score INTEGER NOT NULL DEFAULT 50,
  knowledge_contributions INTEGER NOT NULL DEFAULT 0,
  revenue_influence NUMERIC NOT NULL DEFAULT 0,
  collaboration_score INTEGER NOT NULL DEFAULT 50,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── VAULT SYSTEM PROPOSALS (System Creation Engine V1) ───────
-- Vault Core proposing improvements to itself, for human approval.
CREATE TABLE IF NOT EXISTS vault_system_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent TEXT NOT NULL,
  title TEXT NOT NULL,

  -- missing_dashboard | missing_workflow | missing_automation |
  -- missing_workforce_role | missing_command_hub_module | missing_intelligence_system
  category TEXT NOT NULL DEFAULT 'missing_intelligence_system',

  problem TEXT,
  impact TEXT,
  opportunity TEXT,
  solution TEXT,
  technical_requirements TEXT,
  ui_requirements TEXT,
  estimated_effort TEXT,             -- e.g. "S | M | L" or "~2 days"
  priority_score NUMERIC NOT NULL DEFAULT 0.5,
  expected_outcome TEXT,

  status TEXT NOT NULL DEFAULT 'pending_review',  -- pending_review|approved|rejected|archived|implemented
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  related_node_ids UUID[] NOT NULL DEFAULT '{}',
  collaboration_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_proposals_status ON vault_system_proposals (status, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- RLS NOTE (unchanged): access via the service-role server client only.
-- ─────────────────────────────────────────────────────────────
