"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { CampaignDraft, DraftStatus } from "@/lib/planStore";
import { getDataProvider } from "@/lib/data/data-provider";

const STORAGE_KEY = "vc_campaign_drafts";

interface PlanContextValue {
  plans: CampaignDraft[];
  hasLoaded: boolean;
  saveDraft: (plan: CampaignDraft) => void;
  updateStatus: (id: string, status: DraftStatus) => void;
  getPlan: (id: string) => CampaignDraft | undefined;
  deleteDraft: (id: string) => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

function now() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  // Always start empty so server and client initial renders match exactly.
  // localStorage is read in a useEffect (client-only) to avoid hydration mismatch.
  const [plans, setPlans] = useState<CampaignDraft[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // 1. Load from localStorage immediately (fast, unblocks the UI)
    let localPlans: CampaignDraft[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) localPlans = JSON.parse(stored) as CampaignDraft[];
    } catch {
      // parse error — keep empty
    }
    setPlans(localPlans);
    setHasLoaded(true);

    // 2. Merge with data provider in background (Supabase if configured)
    getDataProvider()
      .getCampaignDrafts()
      .then((dbPlans) => {
        if (!dbPlans.length) return;
        setPlans((prev) => {
          const dbById = new Map(dbPlans.map((d) => [d.id, d]));
          // DB wins for known IDs; keep localStorage-only drafts alongside
          const localOnlyIds = new Set(
            prev.map((p) => p.id).filter((id) => !dbById.has(id))
          );
          const result = [...dbPlans];
          for (const p of prev) {
            if (localOnlyIds.has(p.id)) result.push(p);
          }
          return result;
        });
      })
      .catch(() => {
        // Network/Supabase error — localStorage data is already set, ignore
      });
  }, []);

  // Persist to localStorage whenever plans changes (after initial load)
  useEffect(() => {
    if (!hasLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch {
      // localStorage quota exceeded — ignore
    }
  }, [plans, hasLoaded]);

  function saveDraft(plan: CampaignDraft) {
    const updated = { ...plan, updatedAt: now() };
    setPlans((prev) => {
      const idx = prev.findIndex((p) => p.id === plan.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
    // Fire-and-forget to data provider
    getDataProvider().saveCampaignDraft(updated).catch(console.error);
  }

  function updateStatus(id: string, status: DraftStatus) {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status, approvalStatus: status, updatedAt: now() }
          : p
      )
    );
    // Fire-and-forget to data provider
    getDataProvider().updateCampaignStatus(id, status).catch(console.error);
  }

  function deleteDraft(id: string) {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    getDataProvider().deleteCampaignDraft(id).catch(console.error);
  }

  function getPlan(id: string) {
    return plans.find((p) => p.id === id);
  }

  return (
    <PlanContext.Provider value={{ plans, hasLoaded, saveDraft, updateStatus, getPlan, deleteDraft }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlans() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlans must be used inside PlanProvider");
  return ctx;
}
