-- Migration 003: RLS policies for creative_assets storage buckets and table
-- Run this in the Supabase SQL Editor.
--
-- Context:
--   - creative-assets  : private bucket, stores raw uploaded files (images + videos)
--   - creative-thumbnails : public bucket, stores image preview thumbnails
--
-- Role model (from user_profiles.role):
--   admin        → can upload, read, update, delete
--   media_buyer  → can upload, read, update (no delete)
--   setter       → read-only on table; no storage access
--   client_viewer → no access to creatives at all
--
-- IMPORTANT: The role is stored in public.user_profiles.role, NOT in the JWT.
-- Storage RLS policies use auth.uid() to join user_profiles for role checks.
-- This is the safest approach — no service role key is exposed to the frontend.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: storage.objects policies for creative-assets (private bucket)
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper function: returns the role of the currently authenticated user
-- from user_profiles. Returns null if not authenticated or no profile found.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- ── creative-assets bucket ────────────────────────────────────────────────────

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "creative_assets_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "creative_assets_insert_uploader" ON storage.objects;
DROP POLICY IF EXISTS "creative_assets_update_uploader" ON storage.objects;
DROP POLICY IF EXISTS "creative_assets_delete_admin" ON storage.objects;

-- SELECT: admin and media_buyer can read files in creative-assets
CREATE POLICY "creative_assets_select_authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'creative-assets'
    AND public.get_user_role() IN ('admin', 'media_buyer')
  );

-- INSERT: admin and media_buyer can upload files to creative-assets
CREATE POLICY "creative_assets_insert_uploader"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'creative-assets'
    AND public.get_user_role() IN ('admin', 'media_buyer')
  );

-- UPDATE: admin and media_buyer can update files in creative-assets
CREATE POLICY "creative_assets_update_uploader"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'creative-assets'
    AND public.get_user_role() IN ('admin', 'media_buyer')
  );

-- DELETE: admin only can delete files from creative-assets
CREATE POLICY "creative_assets_delete_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'creative-assets'
    AND public.get_user_role() = 'admin'
  );

-- ── creative-thumbnails bucket ────────────────────────────────────────────────
-- This bucket is PUBLIC for reads (no RLS needed for SELECT on public buckets).
-- We still restrict INSERT/UPDATE/DELETE to admin and media_buyer.

DROP POLICY IF EXISTS "creative_thumbnails_insert_uploader" ON storage.objects;
DROP POLICY IF EXISTS "creative_thumbnails_update_uploader" ON storage.objects;
DROP POLICY IF EXISTS "creative_thumbnails_delete_admin" ON storage.objects;

-- INSERT: admin and media_buyer can upload thumbnails
CREATE POLICY "creative_thumbnails_insert_uploader"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'creative-thumbnails'
    AND public.get_user_role() IN ('admin', 'media_buyer')
  );

-- UPDATE: admin and media_buyer can update thumbnails
CREATE POLICY "creative_thumbnails_update_uploader"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'creative-thumbnails'
    AND public.get_user_role() IN ('admin', 'media_buyer')
  );

-- DELETE: admin only
CREATE POLICY "creative_thumbnails_delete_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'creative-thumbnails'
    AND public.get_user_role() = 'admin'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: creative_assets table policies (role-scoped)
-- ─────────────────────────────────────────────────────────────────────────────
-- The existing policies use auth.role() = 'authenticated' which allows ALL
-- authenticated users including setter and client_viewer.
-- Replace with role-scoped policies.

-- Drop existing broad policies
DROP POLICY IF EXISTS "Authenticated read assets" ON public.creative_assets;
DROP POLICY IF EXISTS "Authenticated insert assets" ON public.creative_assets;
DROP POLICY IF EXISTS "Authenticated update assets" ON public.creative_assets;

-- SELECT: admin, media_buyer, setter can read assets (setter can view for context)
-- client_viewer cannot see creatives at all
CREATE POLICY "creative_assets_select_staff"
  ON public.creative_assets
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'media_buyer', 'setter')
  );

-- INSERT: admin and media_buyer only
CREATE POLICY "creative_assets_insert_uploader"
  ON public.creative_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('admin', 'media_buyer')
  );

-- UPDATE: admin and media_buyer only
CREATE POLICY "creative_assets_update_uploader"
  ON public.creative_assets
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'media_buyer')
  );

-- DELETE: admin only
DROP POLICY IF EXISTS "creative_assets_delete_admin" ON public.creative_assets;
CREATE POLICY "creative_assets_delete_admin"
  ON public.creative_assets
  FOR DELETE
  TO authenticated
  USING (
    public.get_user_role() = 'admin'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3: Verify (run these SELECT statements to confirm policies exist)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT policyname, cmd, qual FROM pg_policies
-- WHERE tablename = 'objects' AND schemaname = 'storage'
-- AND policyname LIKE 'creative%'
-- ORDER BY policyname;
--
-- SELECT policyname, cmd, qual FROM pg_policies
-- WHERE tablename = 'creative_assets' AND schemaname = 'public'
-- ORDER BY policyname;
