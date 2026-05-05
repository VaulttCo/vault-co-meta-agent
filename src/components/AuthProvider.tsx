"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { MockUser, UserRole } from "@/lib/auth/types";
import { MOCK_USERS } from "@/lib/auth/mock-users";
import { getPermissions, type Permissions } from "@/lib/auth/permissions";

const STORAGE_KEY = "vc_auth_user";

interface AuthContextValue {
  user: MockUser | null;
  permissions: Permissions | null;
  isLoading: boolean;
  isDemoMode: boolean;
  signInAs(userId: string): void;
  signOut(): void;
  can(permission: keyof Permissions): boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Demo mode is active when Supabase is not configured
  const isDemoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as MockUser;
        // Verify the stored user still exists in mock users (role may have changed)
        const found = MOCK_USERS.find((u) => u.id === parsed.id);
        if (found) setUser(found);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  function signInAs(userId: string) {
    const found = MOCK_USERS.find((u) => u.id === userId);
    if (!found) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    setUser(found);
  }

  function signOut() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  function can(permission: keyof Permissions): boolean {
    if (!user) return false;
    return getPermissions(user.role)[permission];
  }

  const permissions = user ? getPermissions(user.role) : null;

  return (
    <AuthContext.Provider
      value={{ user, permissions, isLoading, isDemoMode, signInAs, signOut, can }}
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

// Convenience: get current user's role, defaulting to "admin" in loading state
export function useRole(): UserRole | null {
  const { user } = useAuth();
  return user?.role ?? null;
}
