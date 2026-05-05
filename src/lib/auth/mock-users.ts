import type { AppUser } from "./types";

/**
 * Demo users — only used when NEXT_PUBLIC_AUTH_MODE=demo (local development).
 * These are NEVER shown in production (NEXT_PUBLIC_AUTH_MODE=supabase).
 */
export const MOCK_USERS: AppUser[] = [
  {
    id: "nick-moore",
    name: "Nick Moore",
    email: "nick@vaultco.com",
    role: "admin",
    initials: "NM",
    color: "#c9a84c",
    isReal: false,
  },
  {
    id: "jaxon-parton",
    name: "Jaxon Parton",
    email: "jaxon@vaultco.com",
    role: "admin",
    initials: "JP",
    color: "#c9a84c",
    isReal: false,
  },
  {
    id: "vault-media-buyer",
    name: "Vault Co Media Buyer",
    email: "buyer@vaultco.com",
    role: "media_buyer",
    initials: "MB",
    color: "#18b8f0",
    isReal: false,
  },
  {
    id: "sam-setter",
    name: "Sam",
    email: "sam@vaultco.com",
    role: "setter",
    initials: "S",
    color: "#22c55e",
    isReal: false,
  },
];
