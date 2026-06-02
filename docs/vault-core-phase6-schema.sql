-- ─────────────────────────────────────────────────────────────
-- Vault Core — Phase 6 schema (Conversation Intelligence / Veronica)
-- Run AFTER the prior phase migrations. Purely additive.
--
-- Adds the draft-message approval queue. Conversation intelligence itself is
-- stored as vault_nodes (category = conversation_insight / sms_pattern / ...),
-- so no node table is needed. Mock fallback keeps everything functional with
-- zero database.
--
-- SAFETY: drafts are NEVER sent. Approving a draft only marks it approved
-- internally — no outbound SMS, no GHL writes, no workflow triggers.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vault_message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent TEXT NOT NULL DEFAULT 'veronica',
  -- sms_reply | follow_up | reactivation | appointment_confirmation |
  -- no_show_recovery | objection_response | lead_nurture
  draft_type TEXT NOT NULL DEFAULT 'follow_up',

  lead_name TEXT,                         -- lead context label (no secrets)
  conversation_summary TEXT,
  rationale TEXT,                         -- why this message was drafted
  body TEXT NOT NULL,                     -- the draft message text

  confidence NUMERIC NOT NULL DEFAULT 0.5,
  risk_level TEXT NOT NULL DEFAULT 'low', -- low | medium | high
  suggested_send_window TEXT,

  -- draft | approved | edited | rejected   (advanced by humans only; NEVER sends)
  status TEXT NOT NULL DEFAULT 'draft',

  related_node_ids UUID[] NOT NULL DEFAULT '{}',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_drafts_status ON vault_message_drafts (status, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- GHL: no schema. The GoHighLevel / LeadConnector integration is READ-ONLY and
-- server-side only, reading credentials from environment variables.
--   Vault Core (executive runtime, incl. Veronica) uses ONLY the Vault-Co-owned
--   accounts and NEVER the generic GHL_* fallback:
--     VAULT_CO_GHL_API_KEY, VAULT_CO_GHL_LOCATION_ID
--     VAULT_CO_LEGACY_GHL_API_KEY, VAULT_CO_LEGACY_GHL_LOCATION_ID
--   (.env.local locally, Vercel env in prod)
--   NOTE: generic GHL_API_KEY / GHL_LOCATION_ID are CLIENT-TRACKING LEGACY ONLY
--   (Revenue Dashboard per-client resolver fallback) — NOT used by Vault Core.
-- If config is missing, the integration fails safely and falls back to mock data.
-- Credentials are never logged, returned, exposed to the client, or committed.
-- ─────────────────────────────────────────────────────────────
