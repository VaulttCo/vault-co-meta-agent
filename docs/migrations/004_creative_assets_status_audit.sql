-- Migration 004: Creative assets status constraint audit + alignment
-- Run in the Supabase SQL Editor to inspect and align the status constraint.
--
-- BACKGROUND
-- The creative_assets.status column has a CHECK constraint named
-- creative_assets_status_check. The app code uses lowercase status values
-- ('uploaded', 'active', 'pending', 'archived') to match this constraint.
-- The docs/database-schema.md schema reference incorrectly shows title-case
-- values — that is a documentation error, not a DB change.
--
-- STEP 1: Inspect the actual constraint (run this first, read-only)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.creative_assets'::regclass
  AND contype = 'c';

-- STEP 2: Inspect any rows with unexpected status values
-- ─────────────────────────────────────────────────────────────────────────────
SELECT status, count(*) FROM public.creative_assets GROUP BY status ORDER BY count DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- OPTIONAL: Only run the blocks below if inspection in Step 1 shows a
-- constraint that blocks 'uploaded', 'active', 'pending', or 'archived'.
-- ─────────────────────────────────────────────────────────────────────────────

-- OPTION A: Drop the existing constraint entirely (safest — app validates in code)
-- ALTER TABLE public.creative_assets
--   DROP CONSTRAINT IF EXISTS creative_assets_status_check;

-- OPTION B: Recreate constraint with the lowercase values the app uses
-- ALTER TABLE public.creative_assets
--   DROP CONSTRAINT IF EXISTS creative_assets_status_check;
-- ALTER TABLE public.creative_assets
--   ADD CONSTRAINT creative_assets_status_check
--   CHECK (status IN ('uploaded', 'active', 'pending', 'archived', 'draft'));
