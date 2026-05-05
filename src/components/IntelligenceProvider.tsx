"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ClientIntelligence } from "@/lib/clientIntelligence";
import { KACZMAR_INTELLIGENCE } from "@/lib/clientIntelligence";
import { getDataProvider } from "@/lib/data/data-provider";

const STORAGE_KEY = "vc_client_intelligence";

interface IntelligenceContextValue {
  intelligenceMap: Record<string, ClientIntelligence>;
  hasLoaded: boolean;
  getIntelligence: (clientId: string) => ClientIntelligence | null;
  saveIntelligence: (intel: ClientIntelligence) => void;
  clearIntelligence: (clientId: string) => void;
  fetchAndCacheIntelligence: (clientId: string) => Promise<void>;
}

const IntelligenceContext = createContext<IntelligenceContextValue | null>(null);

function defaultMap(): Record<string, ClientIntelligence> {
  return { "kaczmar-builders": KACZMAR_INTELLIGENCE };
}

export function IntelligenceProvider({ children }: { children: React.ReactNode }) {
  const [intelligenceMap, setIntelligenceMap] = useState<Record<string, ClientIntelligence>>({});
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, ClientIntelligence>;
        setIntelligenceMap({ "kaczmar-builders": KACZMAR_INTELLIGENCE, ...parsed });
      } else {
        setIntelligenceMap(defaultMap());
      }
    } catch {
      setIntelligenceMap(defaultMap());
    }
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(intelligenceMap));
    } catch { /* quota */ }
  }, [intelligenceMap, hasLoaded]);

  function getIntelligence(clientId: string): ClientIntelligence | null {
    return intelligenceMap[clientId] ?? null;
  }

  function saveIntelligence(intel: ClientIntelligence) {
    setIntelligenceMap((prev) => ({ ...prev, [intel.clientId]: intel }));
    // Fire-and-forget to data provider
    getDataProvider()
      .saveClientIntelligence(intel.clientId, intel)
      .catch(console.error);
  }

  function clearIntelligence(clientId: string) {
    setIntelligenceMap((prev) => {
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
  }

  // Load intelligence for a specific client from the data provider (Supabase if configured).
  // Called from client profile page on mount so Supabase data wins over stale localStorage.
  const fetchAndCacheIntelligence = useCallback(async (clientId: string) => {
    try {
      const intel = await getDataProvider().getClientIntelligence(clientId);
      if (intel) {
        setIntelligenceMap((prev) => ({ ...prev, [clientId]: intel }));
      }
    } catch {
      // Ignore — in-memory/localStorage data already available
    }
  }, []);

  return (
    <IntelligenceContext.Provider
      value={{ intelligenceMap, hasLoaded, getIntelligence, saveIntelligence, clearIntelligence, fetchAndCacheIntelligence }}
    >
      {children}
    </IntelligenceContext.Provider>
  );
}

export function useIntelligence() {
  const ctx = useContext(IntelligenceContext);
  if (!ctx) throw new Error("useIntelligence must be used inside IntelligenceProvider");
  return ctx;
}
