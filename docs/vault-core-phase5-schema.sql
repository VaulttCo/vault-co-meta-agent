-- ─────────────────────────────────────────────────────────────
-- Vault Core — Phase 5 schema (Executive Oversight Layer / Vanessa)
-- Run AFTER docs/vault-core-schema.sql + phase2 + phase3.
--
-- Purely additive: adds Vanessa's executive prioritization fields to
-- vault_recommendations. Executive briefs / priorities / risk & opportunity
-- summaries are stored as vault_nodes (category = executive_*), so no new table
-- is required. Mock fallback keeps everything functional with zero database.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE vault_recommendations
  -- critical | high | medium | low | watch   (set by Vanessa's Priority Engine)
  ADD COLUMN IF NOT EXISTS vanessa_priority TEXT,
  ADD COLUMN IF NOT EXISTS priority_reason  TEXT;

CREATE INDEX IF NOT EXISTS idx_vault_recs_vanessa_priority
  ON vault_recommendations (vanessa_priority);

-- ─────────────────────────────────────────────────────────────
-- NOTE: Vanessa never executes anything. She reads workforce output, prioritizes,
-- writes executive_* nodes + activity, and creates Command Hub recommendations.
-- Humans remain the final decision makers.
-- ─────────────────────────────────────────────────────────────
