export type UserRole = "admin" | "media_buyer" | "setter" | "client_viewer";

/** Unified user object used throughout the app regardless of auth mode */
export interface AppUser {
  /** Supabase auth.users.id (UUID) in production; mock ID in demo mode */
  id: string;
  /** Display name */
  name: string;
  email: string;
  role: UserRole;
  /** Two-letter initials for avatar */
  initials: string;
  /** Hex color for avatar background */
  color: string;
  /** Whether this user came from Supabase Auth (true) or demo mock (false) */
  isReal: boolean;
}

/** Legacy alias — kept for backward compatibility with existing components */
export type MockUser = AppUser;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  media_buyer: "Media Buyer",
  setter: "Setter",
  client_viewer: "Client Viewer",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "#c9a84c",
  media_buyer: "#18b8f0",
  setter: "#22c55e",
  client_viewer: "#a78bfa",
};

/** Derive initials from a full name */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
