-- ─────────────────────────────────────────────────────────────
-- Vault Core — Phase 2 schema migration (Command Hub Integration)
-- Run in your Supabase SQL editor AFTER docs/vault-core-schema.sql.
--
-- Purely additive: extends vault_recommendations with traceability + review
-- fields and adds a review-history table. Existing rows are migrated in place.
-- Mock fallback continues to work with zero database.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Extend vault_recommendations ──────────────────────────
ALTER TABLE vault_recommendations
  ADD COLUMN IF NOT EXISTS influence_score      NUMERIC NOT NULL DEFAULT 0.5,  -- 0..1, how much this ripples across memory
  ADD COLUMN IF NOT EXISTS revenue_impact       TEXT,                          -- est. revenue effect, human-readable
  ADD COLUMN IF NOT EXISTS related_clients      TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_campaigns    TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_conversations TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_node_ids     UUID[]  NOT NULL DEFAULT '{}',  -- traceability into the graph
  ADD COLUMN IF NOT EXISTS reviewed_by          TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes         TEXT,
  ADD COLUMN IF NOT EXISTS implemented_at       TIMESTAMPTZ;

-- New human-review status model:
--   pending_review | approved | rejected | archived | implemented
-- Phase 1 created recommendations with status 'open'. Migrate those + move the
-- column default forward. (Older 'reviewed'/'accepted'/'dismissed' values, if any,
-- are mapped to the closest new state.)
UPDATE vault_recommendations SET status = 'pending_review' WHERE status IN ('open', 'reviewed');
UPDATE vault_recommendations SET status = 'approved'       WHERE status = 'accepted';
UPDATE vault_recommendations SET status = 'rejected'       WHERE status = 'dismissed';

ALTER TABLE vault_recommendations ALTER COLUMN status SET DEFAULT 'pending_review';

-- ── 2. Review history ────────────────────────────────────────
-- One row per human action on a recommendation. Retained permanently so the
-- full decision trail is auditable. Nothing here executes anything.
CREATE TABLE IF NOT EXISTS vault_recommendation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  recommendation_id UUID NOT NULL REFERENCES vault_recommendations(id) ON DELETE CASCADE,

  -- approve | reject | archive | implement | request_revision
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,

  actor TEXT NOT NULL,        -- user id / name of the human reviewer
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_rec_reviews_rec ON vault_recommendation_reviews (recommendation_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- RLS NOTE (unchanged): access is via the service-role server client only.
-- Do NOT expose these tables to the anon key.
-- ─────────────────────────────────────────────────────────────
