-- Vault Core — Agent Action Generation schema (Phase 9.1). ADDITIVE.
--
-- One backstop only: a PARTIAL UNIQUE INDEX so a generated action is unique per
-- (agent_id, source_type, source_id). This makes Phase 9.1 deduplication correct
-- even under CONCURRENT tick runs (e.g. a manual run overlapping a cron, or future
-- multi-tier crons) where two passes could read the same pending recommendation
-- before either insert is visible — the second insert now fails with a unique
-- violation (23505), which the app treats as a duplicate skip (not an error).
--
-- Scope: applies ONLY to rows that carry BOTH source_type AND source_id (i.e.
-- generated/sourced actions). Manual actions (no source_id) are unaffected, so a
-- human can still create multiple manual actions.
--
-- Rerun-safe (IF NOT EXISTS). Additive only — no table/column/constraint is dropped
-- or altered. RLS on `vault_actions` is unchanged (still enabled, service-role only,
-- NO permissive policies). Run AFTER `docs/vault-actions-schema.sql` (Phase 9.0).
--
-- NOTE: if earlier testing already left duplicate (agent_id, source_type, source_id)
-- rows, creating this unique index will fail until they are de-duplicated. Inspect
-- with:  select agent_id, source_type, source_id, count(*) from public.vault_actions
--        where source_type is not null and source_id is not null
--        group by 1,2,3 having count(*) > 1;
-- then archive/delete the redundant rows before re-running this file.

create unique index if not exists uq_vault_actions_generated_signal
  on public.vault_actions (agent_id, source_type, source_id)
  where source_type is not null and source_id is not null;
