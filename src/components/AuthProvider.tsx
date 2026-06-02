"use client";

/**
 * AuthProvider — supports two modes:
 *
 *   NEXT_PUBLIC_AUTH_MODE=supabase  (production default)
 *     → Real Supabase Auth. Email/password or magic link.
 *     → User profile and role loaded from public.user_profiles table.
 *     → Demo role-picker is hidden.
 *
 *   NEXT_PUBLIC_AUTH_MODE=demo  (local development only)
 *     → Mock users stored in localStorage.
 *     → No network calls. Role-picker shown on /login.
 *     → Should NEVER be set in production Vercel env vars.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { AppUser, UserRole } from "@/lib/auth/types";
import { ROLE_COLORS, getInitials } from "@/lib/auth/types";
import { MOCK_USERS } from "@/lib/auth/mock-users";
import { getPermissions, type Permissions } from "@/lib/auth/permissions";
import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-client";

const DEMO_STORAGE_KEY = "vc_demo_auth_user";

// ── Determine auth mode ───────────────────────────────────────────────────────
// In production, NEXT_PUBLIC_AUTH_MODE must be "supabase".
// Locally, set NEXT_PUBLIC_AUTH_MODE=demo in .env.local to use the role-picker.
const AUTH_MODE =
  (process.env.NEXT_PUBLIC_AUTH_MODE as "supabase" | "demo" | undefined) ??
  "supabase";

// Demo mode is DEV/LOCAL ONLY. It can never activate in a production build, even if
// NEXT_PUBLIC_AUTH_MODE=demo is set in production env vars — production always uses
// real Supabase auth.
const IS_DEMO_MODE = AUTH_MODE === "demo" && process.env.NODE_ENV !== "production";

// ── Context value ─────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: AppUser | null;
  permissions: Permissions | null;
  isLoading: boolean;
  /** true when running in demo/local mode (role-picker visible) */
  isDemoMode: boolean;
  /** Demo only: sign in as a mock user by ID */
  signInAs(userId: string): void;
  /** Supabase: sign in with email + password */
  signInWithPassword(email: string, password: string): Promise<{ error: string | null }>;
  /** Supabase: send a magic link to the given email */
  signInWithMagicLink(email: string): Promise<{ error: string | null }>;
  /** Sign out (works in both modes) */
  signOut(): Promise<void>;
  can(permission: keyof Permissions): boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Helper: build AppUser from Supabase profile row ──────────────────────────
function profileToAppUser(profile: {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  role: string;
}): AppUser {
  const role = (profile.role ?? "setter") as UserRole;
  const name = profile.full_name || profile.email.split("@")[0];
  return {
    id: profile.auth_user_id,
    name,
    email: profile.email,
    role,
    initials: getInitials(name),
    color: ROLE_COLORS[role] ?? "#6b7a99",
    isReal: true,
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Demo mode bootstrap ───────────────────────────────────────────────────
  const bootstrapDemo = useCallback(() => {
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppUser;
        const found = MOCK_USERS.find((u) => u.id === parsed.id);
        if (found) setUser(found);
      }
    } catch {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Supabase mode bootstrap ───────────────────────────────────────────────
  const bootstrapSupabase = useCallback(async () => {
    const supabase = getSupabaseSSRBrowserClient();
    if (!supabase) {
      // Supabase not configured — fall back to demo mode silently
      setIsLoading(false);
      return;
    }

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      // Load the user profile from public.user_profiles
      const { data: profile } = await supabase
        .from("user_profiles" as never)
        .select("id, auth_user_id, email, full_name, role")
        .eq("auth_user_id", session.user.id)
        .single();

      if (profile) {
        setUser(profileToAppUser(profile as {
          id: string;
          auth_user_id: string;
          email: string;
          full_name: string;
          role: string;
        }));
      }
    }

    setIsLoading(false);

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const { data: profile } = await supabase
            .from("user_profiles" as never)
            .select("id, auth_user_id, email, full_name, role")
            .eq("auth_user_id", session.user.id)
            .single();

          if (profile) {
            setUser(profileToAppUser(profile as {
              id: string;
              auth_user_id: string;
              email: string;
              full_name: string;
              role: string;
            }));
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (IS_DEMO_MODE) {
      bootstrapDemo();
    } else {
      bootstrapSupabase();
    }
  }, [bootstrapDemo, bootstrapSupabase]);

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Demo only */
  function signInAs(userId: string) {
    if (!IS_DEMO_MODE) return;
    const found = MOCK_USERS.find((u) => u.id === userId);
    if (!found) return;
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(found));
    setUser(found);
  }

  /** Supabase: email + password */
  async function signInWithPassword(
    email: string,
    password: string
  ): Promise<{ error: string | null }> {
    const supabase = getSupabaseSSRBrowserClient();
    if (!supabase) return { error: "Supabase is not configured." };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  /** Supabase: magic link */
  async function signInWithMagicLink(
    email: string
  ): Promise<{ error: string | null }> {
    const supabase = getSupabaseSSRBrowserClient();
    if (!supabase) return { error: "Supabase is not configured." };

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  /** Sign out — works in both modes */
  async function signOut() {
    if (IS_DEMO_MODE) {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      setUser(null);
      return;
    }
    const supabase = getSupabaseSSRBrowserClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  }

  function can(permission: keyof Permissions): boolean {
    if (!user) return false;
    return getPermissions(user.role)[permission];
  }

  const permissions = user ? getPermissions(user.role) : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isLoading,
        isDemoMode: IS_DEMO_MODE,
        signInAs,
        signInWithPassword,
        signInWithMagicLink,
        signOut,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useRole(): UserRole | null {
  const { user } = useAuth();
  return user?.role ?? null;
}
