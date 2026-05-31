// Vault Core — Vault Memory page (Layer 1).
// Client experience lives in VaultMemoryView; this route is the entry point.

import { VaultMemoryView } from "@/components/core/VaultMemoryView";

export const metadata = {
  title: "Vault Memory · Vault Core",
};

export default function VaultMemoryPage() {
  return <VaultMemoryView />;
}
