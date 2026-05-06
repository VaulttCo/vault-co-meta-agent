// Server-side Supabase client — never import in client components.
// Uses the service role key for privileged operations (bypasses RLS).
// Returns null when env vars are absent so the app falls back to mock data.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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

/**
 * Cookie-based session client for API route handlers.
 *
 * Uses @supabase/ssr createServerClient with the anon key so it can read the
 * user's auth session from HTTP cookies (set by the browser after login).
 * This is the ONLY client that can call supabase.auth.getUser() successfully
 * inside API routes — the service role client has no cookie access.
 *
 * Use this for auth checks in API routes, then use getSupabaseServerClient()
 * (service role) for privileged DB writes that need to bypass RLS.
 */
export async function getSupabaseSessionClient(): Promise<SupabaseClient<Database> | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll may throw in read-only cookie contexts (e.g. during RSC render).
          // Safe to ignore — the session will still be readable.
        }
      },
    },
  });
}
