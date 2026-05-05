export type UserRole = "admin" | "media_buyer" | "setter" | "client_viewer";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  color: string;
}

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
