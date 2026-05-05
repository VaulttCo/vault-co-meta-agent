// Browser-side Supabase client.
// Safe to import in client components. Returns null when env vars are absent.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const PLACEHOLDER_URLS = [
  "https://placeholder.supabase.co",
  "https://placeholder.supabase.co/",
];
const PLACEHOLDER_KEYS = [
  "placeholder-anon-key",
  "placeholder-service-role-key",
];

let _client: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || PLACEHOLDER_URLS.includes(url)) return null;
  if (!key || PLACEHOLDER_KEYS.includes(key)) return null;

  if (!_client) {
    _client = createClient<Database>(url, key);
  }
  return _client;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return (
    !!url &&
    !PLACEHOLDER_URLS.includes(url) &&
    !!key &&
    !PLACEHOLDER_KEYS.includes(key)
  );
}
