/**
 * Supabase SSR clients — use these instead of the plain createClient() when
 * you need cookie-based session management (required for Supabase Auth).
 *
 * Browser client  → use in Client Components
 * Server client   → use in Server Components, Route Handlers, Server Actions
 * Middleware client → use in src/middleware.ts only
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// ── Browser client (singleton) ────────────────────────────────────────────────
let _ssrBrowserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseSSRBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return null;
  if (!_ssrBrowserClient) {
    _ssrBrowserClient = createBrowserClient<Database>(url, key);
  }
  return _ssrBrowserClient;
}

export function isSupabaseAuthConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return !!url && !!key;
}
