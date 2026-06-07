# Vault Core — Supabase SQL Install Order

Run these in the **Supabase SQL Editor**, in this exact order. All migrations are **additive** —
they never drop or alter existing non-Vault-Core tables. Vault Core is fully functional on **mock
fallback before any SQL is run**; running the SQL switches each surface to live persistence.

> Mock-fallback behavior: with no Supabase service role (or before these tables exist), every
> Vault Core read returns seeded mock data and every write no-ops. Nothing breaks — you just see
> the seeded Vault Co environment instead of live data.

## Foundation — base application migrations (run first, before production)

Before the Vault Core phase schemas below, a **fresh install** must run the base
application migrations in `docs/migrations/`, in this exact order:

| Order | File | Creates / Does | Required before production? |
|---|---|---|---|
| 001 | `docs/migrations/001_user_profiles.sql` | `user_profiles` (roles backing Supabase Auth) | **Yes** |
| 002 | `docs/migrations/002_integration_tables.sql` | integration tables | **Yes** |
| 005 | `docs/migrations/005_rls_hardening.sql` | Row Level Security hardening | **Yes** |

**Canonical order for a fresh install: run `001`, then `002`, then `005` — before
production use.** `005` (RLS hardening) depends on the tables created by `001` and
`002`, so it must run after them. Only once these three are applied should you run
the Vault Core phase schemas below.

## Vault Core phase schemas

| Order | File | Phase | Required? | Creates | If not run |
|---|---|---|---|---|---|
| 1 | `docs/vault-core-schema.sql` | 1 | Required for live | `vault_nodes`, `vault_edges`, `vault_activity`, `vault_recommendations`, `vault_agent_runs` (+ indexes) | Knowledge graph, activity, recommendations all serve mock data |
| 2 | `docs/vault-core-phase2-schema.sql` | 2 | Required for live | `ALTER vault_recommendations` (traceability + review columns) + `vault_recommendation_reviews` | Recommendation review/traceability serve mock; reviews don't persist |
| 3 | `docs/vault-core-phase3-schema.sql` | 3 | Required for live | `agent_messages`, `agent_tasks`, `agent_collaborations`, `agent_objectives`, `agent_reputation`, `vault_system_proposals` | Collaboration feed, reputation, objectives, proposals serve mock |
| — | *(none)* | 4 | n/a | **Phase 4 added NO new tables.** Valerie reads the **existing** `client_monthly_revenue_snapshots` + `client_revenue_settings` | Valerie falls back to mock financial data derived from `clients.stats` |
| 4 | `docs/vault-core-phase5-schema.sql` | 5 | Required for live | `ALTER vault_recommendations` (`vanessa_priority`, `priority_reason`) | Executive priorities computed on the fly (not persisted); brief still works |
| 5 | `docs/vault-core-phase6-schema.sql` | 6 | Required for live | `vault_message_drafts` (draft approval queue) | Draft queue serves mock drafts; approvals don't persist |
| — | *(none)* | 6.5 | n/a | **Design pass — no SQL.** | n/a |
| — | *(none)* | 6.6 | n/a | **Deployment prep — no SQL.** | n/a |
| 6 | `docs/vault-actions-schema.sql` | 9.0 | Required for live | `vault_actions` (approved internal execution queue) + enum CHECK constraints (+ indexes, RLS on, no policies) | Actions queue serves mock; prepared/approved/executed actions don't persist |
| 7 | `docs/vault-actions-phase9-1-schema.sql` | 9.1 | **Required for live** | partial UNIQUE index on `vault_actions (agent_id, source_type, source_id)` — concurrency backstop for agent action-generation dedupe (prevents overlapping ticks inserting duplicate actions for the same source signal) | Snapshot dedupe still works single-threaded, but overlapping cron/manual ticks could insert duplicates |
| 8 | `docs/ghl-workflow-drafts-schema.sql` | 9.3 | Required for live | `ghl_workflow_drafts` (internal GHL workflow DRAFT artifacts) + enum CHECK constraints (+ indexes, RLS on, no policies). DRAFT-ONLY — no GHL adapter, nothing published. | Workflow drafts serve mock; created/approved drafts don't persist |
| 9 | `docs/vault-message-drafts-schema.sql` | 9.4 | Required for live | `vault_core_message_drafts` (internal lead-reply/client-message DRAFT artifacts) + enum CHECKs (status/channel/audience/message_type/risk_level/target_system), a unique index on `source_action_id` and an expression unique index on `(source_workflow_draft_id, metadata->>'source_step_id')` (+ indexes, RLS on, no policies). DRAFT-ONLY — no send adapter, nothing sent. **NOTE: distinct from the Phase 6 `vault_message_drafts` (legacy Veronica SMS queue at `/drafts`).** | Message drafts serve mock; created/approved drafts don't persist |

## Notes
- **Phase 4 expects pre-existing revenue tables.** `client_monthly_revenue_snapshots` and
  `client_revenue_settings` come from the earlier Revenue Dashboard work (see `docs/database-schema.md`).
  If your project doesn't have them, Valerie simply uses mock financial figures — safe.
- **RLS:** Vault Core reads/writes go through the **service-role** server client, which bypasses RLS.
  If you enable RLS on the `vault_*` / `agent_*` tables, add a service-role policy. Never expose these
  tables to the anon key.
- **Idempotent:** every statement uses `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, so
  re-running the files is safe.
- **Optional:** after running, you may regenerate types with `npx supabase gen types typescript …`,
  but it's not required — Vault Core uses a typed escape hatch (`db() as any`) like the Victoria subsystem.
