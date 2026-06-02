-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005: RLS hardening (follow-up to 001 + 002)
--
-- ⚠️ PREPARE-ONLY. Do NOT auto-run against production. Review, then run manually in
-- the Supabase SQL editor during a maintenance window. This migration ONLY changes
-- RLS policies and a CHECK constraint — it does not drop tables or delete data.
--
-- Fixes Codex findings:
--   • 002 used `FOR ALL USING (true) WITH CHECK (true)` on integration_connections,
--     meta_campaign_snapshots, ghl_pipeline_snapshots — i.e. any anon/authenticated
--     client could read/write them directly. These tables are written and read ONLY
--     by the server-side service-role client, so lock them to service_role.
--   • 001 allowed every authenticated user to read ALL user_profiles. Restrict to
--     self-read + admin-read (admin determined via a SECURITY DEFINER helper to
--     avoid RLS recursion).
--   • 001's role CHECK omitted 'client_viewer', which the app's permission matrix
--     supports. Widen the constraint.
--
-- All policy creates are preceded by DROP POLICY IF EXISTS so this file is rerun-safe.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. user_profiles: role constraint — add client_viewer ────────────────────
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'media_buyer', 'setter', 'client_viewer'));

-- ── 2. Admin check helper (SECURITY DEFINER bypasses RLS → no recursion) ─────
-- Returns true iff the current auth user is an active admin. Used by read policies
-- below. SECURITY DEFINER + a fixed search_path is required so the inner SELECT is
-- not itself subject to user_profiles RLS (which would recurse).
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
      AND p.status = 'active'
  );
$$;

-- ── 3. user_profiles: replace permissive read with self-read + admin-read ────
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.user_profiles;

CREATE POLICY "profiles_self_read"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "profiles_admin_read"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

-- Writes remain service-role-only (server-side).
CREATE POLICY "profiles_service_role_all"
  ON public.user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 4. integration_connections: service-role-only ───────────────────────────
DROP POLICY IF EXISTS "integration_connections_all" ON public.integration_connections;
CREATE POLICY "integration_connections_service_role"
  ON public.integration_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 5. meta_campaign_snapshots: service-role-only ───────────────────────────
DROP POLICY IF EXISTS "meta_campaign_snapshots_all" ON public.meta_campaign_snapshots;
CREATE POLICY "meta_campaign_snapshots_service_role"
  ON public.meta_campaign_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 6. ghl_pipeline_snapshots: service-role-only ────────────────────────────
DROP POLICY IF EXISTS "ghl_pipeline_snapshots_all" ON public.ghl_pipeline_snapshots;
CREATE POLICY "ghl_pipeline_snapshots_service_role"
  ON public.ghl_pipeline_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Notes ────────────────────────────────────────────────────────────────────
-- • The app reads/writes these tables exclusively via getSupabaseServerClient()
--   (service role), so service-role-only policies do not affect app functionality.
-- • If a future authenticated client-side read is needed, add a narrow, ownership-
--   scoped SELECT policy — never `USING (true)`.
-- • RLS stays ENABLED on every table (001/002 already enabled it).
