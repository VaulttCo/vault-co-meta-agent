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
 * SECURITY (fail-closed): an authenticated user with NO explicitly-assigned valid
 * role is NEVER granted a role (and never defaulted to admin). admin requires an
 * explicit, valid `admin` role from one of the sources above. If a user_profiles
 * row exists but its `status` is not `active`, access is denied. Any error while
 * reading the profile (other than the table simply not being deployed) fails
 * closed and returns null.
 *
 * Returns null when:
 *   - Supabase env vars are missing / placeholder (unauthenticated context)
 *   - No valid session cookie is present
 *   - The user record cannot be retrieved
 *   - No valid role can be resolved from any source
 *   - The profile row is present but not active, or the lookup errors
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
  // SECURITY: this lookup fails CLOSED. A genuine read error returns null so a
  // transient DB problem can never silently escalate a user. The ONLY tolerated
  // error is the table not being deployed yet (undefined_table), in which case
  // we fall through to the session-token metadata sources below.
  const serviceClient = getSupabaseServerClient();
  if (serviceClient) {
    const profileResult = await lookupProfile(serviceClient, user.id);

    if (profileResult.error === "lookup_failed") {
      // Fail closed — do not fall through, do not escalate.
      return null;
    }

    if (profileResult.profile) {
      const { role, status, hasStatusColumn } = profileResult.profile;

      // Require an active account when the status field exists.
      if (hasStatusColumn && status !== "active") {
        return null;
      }

      // A profile row with a valid role is authoritative.
      if (isValidRole(role)) {
        return { userId: user.id, role };
      }

      // Profile exists but carries no valid role → do NOT escalate. Fall
      // through to explicit metadata roles, then ultimately deny.
    }
    // No profile row, or table not deployed → fall through to metadata.
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

  // ── Step 6: No explicit valid role anywhere → DENY (fail closed) ──────────
  // An authenticated user with no assigned role is NEVER granted access, and is
  // never silently elevated to admin. Roles must be assigned explicitly.
  return null;
}

interface ProfileLookup {
  role: unknown;
  status: unknown;
  hasStatusColumn: boolean;
}

/**
 * Reads the user_profiles row for a user, tolerating two non-fatal conditions:
 *   • the table not existing yet (undefined_table) → { profile: null }
 *   • the optional `status` column not existing (undefined_column) → retried
 *     without it, with hasStatusColumn=false
 * Any other error is reported as "lookup_failed" so the caller fails closed.
 */
async function lookupProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  authUserId: string
): Promise<{ profile: ProfileLookup | null; error?: "lookup_failed" }> {
  try {
    const withStatus = await serviceClient
      .from("user_profiles")
      .select("role, status")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (!withStatus.error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = withStatus.data as any;
      if (!row) return { profile: null };
      return { profile: { role: row.role, status: row.status, hasStatusColumn: true } };
    }

    const code = withStatus.error.code;
    // Table not deployed yet — treat as "no profile system", fall through.
    if (code === "42P01") return { profile: null };
    // `status` column not present — retry selecting only the role.
    if (code === "42703") {
      const roleOnly = await serviceClient
        .from("user_profiles")
        .select("role")
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      if (roleOnly.error) {
        if (roleOnly.error.code === "42P01") return { profile: null };
        return { profile: null, error: "lookup_failed" };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = roleOnly.data as any;
      if (!row) return { profile: null };
      return { profile: { role: row.role, status: undefined, hasStatusColumn: false } };
    }

    // Any other DB error → fail closed.
    return { profile: null, error: "lookup_failed" };
  } catch {
    // Unexpected throw → fail closed.
    return { profile: null, error: "lookup_failed" };
  }
}
