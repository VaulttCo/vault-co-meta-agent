// Server-side Supabase client — never import in client components.
// Uses the service role key for privileged operations (bypasses RLS).
// Returns null when env vars are absent so the app falls back to mock data.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function getSupabaseServerClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient<Database>(url, serviceKey, {
    auth: {
      // Service role clients should never auto-refresh or persist sessions
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseAnonServerClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient<Database>(url, anonKey);
}
