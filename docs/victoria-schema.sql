-- ─────────────────────────────────────────────────────────────
-- Victoria AI Sales Coach — Database Schema
-- Run this in your Supabase SQL editor.
-- Enable pgvector first: CREATE EXTENSION IF NOT EXISTS vector;
-- ─────────────────────────────────────────────────────────────

-- Enable pgvector for knowledge base embeddings (run once per project)
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────
-- PROSPECTS
-- Persistent prospect intelligence across all calls.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS victoria_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,

  vertical TEXT,  -- roofing | hvac | remodeling | landscaping | etc.
  location_city TEXT,
  location_state TEXT,
  business_size TEXT,
  years_in_business INTEGER,

  -- Intelligence extracted from calls
  personality_type TEXT,
  communication_style TEXT,
  known_pain_points TEXT[] DEFAULT '{}',
  known_objections TEXT[] DEFAULT '{}',
  known_triggers TEXT[] DEFAULT '{}',
  known_resistances TEXT[] DEFAULT '{}',
  primary_fear TEXT,
  primary_desire TEXT,

  -- Deal status
  deal_stage TEXT DEFAULT 'prospect',
  last_contact TIMESTAMPTZ,
  next_step TEXT,
  urgency_level TEXT DEFAULT 'low',
  total_calls INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vp_vertical ON victoria_prospects(vertical);
CREATE INDEX IF NOT EXISTS idx_vp_deal_stage ON victoria_prospects(deal_stage);
CREATE INDEX IF NOT EXISTS idx_vp_email ON victoria_prospects(email);


-- ─────────────────────────────────────────────────────────────
-- CALLS
-- One row per call session.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS victoria_calls (
  id TEXT PRIMARY KEY,  -- Format: vc_{timestamp}_{random} or test_{timestamp}_{random}
  prospect_id UUID REFERENCES victoria_prospects(id),
  rep_id TEXT,

  status TEXT NOT NULL DEFAULT 'active',  -- active | completed | abandoned | no_show
  phase TEXT DEFAULT 'rapport',
  is_test_call BOOLEAN DEFAULT FALSE,

  outcome TEXT,  -- closed | follow_up | lost | no_show
  close_probability_final INTEGER,

  -- Full session state snapshot (Redis is live source; this is final snapshot on call end)
  session_state JSONB,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vc_prospect ON victoria_calls(prospect_id);
CREATE INDEX IF NOT EXISTS idx_vc_rep ON victoria_calls(rep_id);
CREATE INDEX IF NOT EXISTS idx_vc_status ON victoria_calls(status);
CREATE INDEX IF NOT EXISTS idx_vc_started ON victoria_calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_vc_test ON victoria_calls(is_test_call);


-- ─────────────────────────────────────────────────────────────
-- TRANSCRIPT CHUNKS
-- Every chunk of spoken audio, attributed to a speaker.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS victoria_transcript_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL REFERENCES victoria_calls(id) ON DELETE CASCADE,

  chunk_index INTEGER NOT NULL,
  speaker TEXT NOT NULL,  -- 'rep' | 'prospect'
  text TEXT NOT NULL,

  started_at_seconds NUMERIC,
  ended_at_seconds NUMERIC,

  -- Pre-processing flags (set by chunk-preprocessor)
  contains_objection BOOLEAN DEFAULT FALSE,
  contains_buying_signal BOOLEAN DEFAULT FALSE,
  contains_emotional_shift BOOLEAN DEFAULT FALSE,

  -- Future: vector embedding for semantic search of transcripts
  -- embedding VECTOR(1536),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vtc_call ON victoria_transcript_chunks(call_id);
CREATE INDEX IF NOT EXISTS idx_vtc_call_idx ON victoria_transcript_chunks(call_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_vtc_speaker ON victoria_transcript_chunks(speaker);
CREATE INDEX IF NOT EXISTS idx_vtc_objection ON victoria_transcript_chunks(contains_objection) WHERE contains_objection = TRUE;
CREATE INDEX IF NOT EXISTS idx_vtc_buying ON victoria_transcript_chunks(contains_buying_signal) WHERE contains_buying_signal = TRUE;


-- ─────────────────────────────────────────────────────────────
-- COACHING EVENTS
-- Every coaching card generated during a call.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS victoria_coaching_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL REFERENCES victoria_calls(id) ON DELETE CASCADE,

  chunk_index INTEGER,
  coaching_type TEXT NOT NULL,
  priority TEXT NOT NULL,  -- critical | high | normal | background

  headline TEXT NOT NULL,
  primary_action TEXT NOT NULL,
  why TEXT,
  suggested_language TEXT,
  what_not_to_do TEXT,

  context_tags TEXT[] DEFAULT '{}',
  confidence NUMERIC,

  source_agent TEXT NOT NULL,  -- discovery | objection_intel | orchestrator | buying_signal

  -- Optional rep feedback (future)
  acknowledged BOOLEAN DEFAULT FALSE,
  rep_rating INTEGER,  -- 1-5

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vce_call ON victoria_coaching_events(call_id);
CREATE INDEX IF NOT EXISTS idx_vce_type ON victoria_coaching_events(coaching_type);
CREATE INDEX IF NOT EXISTS idx_vce_priority ON victoria_coaching_events(priority);
CREATE INDEX IF NOT EXISTS idx_vce_source ON victoria_coaching_events(source_agent);


-- ─────────────────────────────────────────────────────────────
-- OBJECTION EVENTS
-- Every objection detected and analyzed during a call.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS victoria_objection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL REFERENCES victoria_calls(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES victoria_prospects(id),

  chunk_index INTEGER,

  raw_text TEXT NOT NULL,
  category TEXT NOT NULL,
  hidden_meaning TEXT,
  emotional_driver TEXT,
  reframe_recommended TEXT,
  follow_up_question TEXT,

  resolution TEXT,  -- resolved | unresolved | deferred

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voe_call ON victoria_objection_events(call_id);
CREATE INDEX IF NOT EXISTS idx_voe_category ON victoria_objection_events(category);
CREATE INDEX IF NOT EXISTS idx_voe_prospect ON victoria_objection_events(prospect_id);


-- ─────────────────────────────────────────────────────────────
-- DEAL SCORES
-- Periodic deal scoring snapshots during a call.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS victoria_deal_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL REFERENCES victoria_calls(id) ON DELETE CASCADE,

  chunk_index INTEGER,

  overall_score INTEGER,
  trust_score INTEGER,
  urgency_score INTEGER,
  pain_clarity_score INTEGER,
  authority_score INTEGER,
  budget_fit_score INTEGER,
  engagement_score INTEGER,

  biggest_risk TEXT,
  recommendation TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vds_call ON victoria_deal_scores(call_id);


-- ─────────────────────────────────────────────────────────────
-- AGENT OUTPUTS
-- Raw output log from every agent run. Used for debugging,
-- analytics, and future fine-tuning.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS victoria_agent_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL REFERENCES victoria_calls(id) ON DELETE CASCADE,

  agent_name TEXT NOT NULL,
  chunk_index INTEGER,

  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  model_used TEXT,

  output JSONB NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vao_call ON victoria_agent_outputs(call_id);
CREATE INDEX IF NOT EXISTS idx_vao_agent ON victoria_agent_outputs(agent_name);


-- ─────────────────────────────────────────────────────────────
-- POST-CALL DEBRIEFS
-- Generated by the Debrief Agent after each call.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS victoria_post_call_debriefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT UNIQUE NOT NULL REFERENCES victoria_calls(id),

  executive_summary TEXT,

  prospect_intelligence JSONB,
  objections_encountered JSONB,
  deal_assessment JSONB,
  rep_coaching_report JSONB,

  crm_notes TEXT,
  follow_up_strategy TEXT,
  suggested_follow_up_message TEXT,
  next_call_briefing TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vpcd_call ON victoria_post_call_debriefs(call_id);


-- ─────────────────────────────────────────────────────────────
-- KNOWLEDGE BASE
-- RAG-powered knowledge store for Vault Co sales intelligence.
-- Populated via the KB management interface.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS victoria_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  domain TEXT NOT NULL,  -- scripts | objections | case_studies | positioning | frameworks | pricing | etc.
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Vector embedding (requires pgvector extension)
  embedding VECTOR(1536),

  -- Metadata for filtering during retrieval
  vertical_relevance TEXT[] DEFAULT '{}',  -- Which contractor verticals apply
  objection_type TEXT,                      -- If objection-specific
  call_phase TEXT[] DEFAULT '{}',           -- When to use this content

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vkb_domain ON victoria_knowledge_base(domain);
CREATE INDEX IF NOT EXISTS idx_vkb_active ON victoria_knowledge_base(is_active);
-- Vector similarity index (IVFFlat — good for < 1M rows)
CREATE INDEX IF NOT EXISTS idx_vkb_embedding ON victoria_knowledge_base
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);


-- ─────────────────────────────────────────────────────────────
-- PROSPECT MEMORY SNAPSHOTS
-- Point-in-time snapshots of prospect intelligence after each call.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS victoria_prospect_memory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES victoria_prospects(id),
  call_id TEXT REFERENCES victoria_calls(id),

  snapshot JSONB NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vpms_prospect ON victoria_prospect_memory_snapshots(prospect_id);
CREATE INDEX IF NOT EXISTS idx_vpms_call ON victoria_prospect_memory_snapshots(call_id);


-- ─────────────────────────────────────────────────────────────
-- Helpful views
-- ─────────────────────────────────────────────────────────────

-- Call summary view for the Victoria dashboard
CREATE OR REPLACE VIEW victoria_call_summary AS
SELECT
  c.id,
  c.status,
  c.phase,
  c.is_test_call,
  c.outcome,
  c.started_at,
  c.ended_at,
  c.duration_seconds,
  p.name AS prospect_name,
  p.company AS prospect_company,
  p.vertical AS prospect_vertical,
  COUNT(DISTINCT t.id) AS total_chunks,
  COUNT(DISTINCT ce.id) AS coaching_cards_generated,
  COUNT(DISTINCT oe.id) AS objections_detected
FROM victoria_calls c
LEFT JOIN victoria_prospects p ON c.prospect_id = p.id
LEFT JOIN victoria_transcript_chunks t ON t.call_id = c.id
LEFT JOIN victoria_coaching_events ce ON ce.call_id = c.id
LEFT JOIN victoria_objection_events oe ON oe.call_id = c.id
GROUP BY c.id, p.name, p.company, p.vertical;
