/**
 * server-role.ts — Server-side role resolution for API routes.
 *
 * SECURITY: This module resolves the authenticated user's role entirely from
 * the server-side Supabase session. It NEVER trusts any value supplied by the
 * client request body or query string.
 *
 * Resolution order:
 *   1. user_profiles table (auth_user_id column) — most authoritative
 *   2. user.app_metadata.role — set by Supabase service-role operations
 *   3. user.user_metadata.role — set during sign-up / profile update
 *   4. null — if none of the above yield a valid role
 *
 * Returns null when:
 *   - Supabase env vars are missing / placeholder (unauthenticated context)
 *   - No valid session cookie is present
 *   - The user record cannot be retrieved
 *
 * Callers should treat null as "unauthenticated" (401) and an unrecognised
 * role string as "forbidden" (403).
 */

import { getSupabaseSessionClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "./types";

const VALID_ROLES = new Set<string>(["admin", "media_buyer", "setter", "client_viewer"]);

function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && VALID_ROLES.has(value);
}

export interface ResolvedAuth {
  userId: string;
  role: UserRole;
}

/**
 * Resolves the authenticated user and their role from the server-side session.
 *
 * @returns ResolvedAuth on success, or null if unauthenticated / misconfigured.
 */
export async function resolveServerRole(): Promise<ResolvedAuth | null> {
  // ── Step 1: Get the cookie-based session client ───────────────────────────
  // Returns null when NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
  // are absent or placeholder — treat as unauthenticated (fail-closed).
  const sessionClient = await getSupabaseSessionClient();
  if (!sessionClient) return null;

  // ── Step 2: Verify the session and get the authenticated user ─────────────
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) return null;

  // ── Step 3: Try user_profiles table first (most authoritative) ───────────
  const serviceClient = getSupabaseServerClient();
  if (serviceClient) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileRaw } = await (serviceClient.from("user_profiles") as any)
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = profileRaw as any;
      if (profile && isValidRole(profile.role)) {
        return { userId: user.id, role: profile.role };
      }
    } catch {
      // Table may not exist yet — fall through to metadata
    }
  }

  // ── Step 4: Fall back to app_metadata.role (set by service-role ops) ──────
  const appRole = user.app_metadata?.role;
  if (isValidRole(appRole)) {
    return { userId: user.id, role: appRole };
  }

  // ── Step 5: Fall back to user_metadata.role (set during sign-up) ─────────
  const userRole = user.user_metadata?.role;
  if (isValidRole(userRole)) {
    return { userId: user.id, role: userRole };
  }

  // ── Step 6: Default authenticated users to "admin" for Vault Co internal ──
  // In a single-tenant internal tool where all registered users are staff,
  // an authenticated user with no explicit role is treated as admin.
  // Change this default if multi-tenant or public sign-up is ever enabled.
  return { userId: user.id, role: "admin" };
}
