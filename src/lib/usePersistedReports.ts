"use client";
import { useState, useEffect, useCallback } from "react";
import type { PersistedReport } from "@/lib/data/data-provider";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const LS_KEY = "vc_persisted_reports";

function loadFromLocalStorage(): PersistedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PersistedReport[]) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(reports: PersistedReport[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(reports));
  } catch {
    // ignore quota errors
  }
}

export function usePersistedReports(clientId?: string) {
  const [reports, setReports] = useState<PersistedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const usingSupabase = isSupabaseConfigured();

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      if (usingSupabase) {
        try {
          const url = clientId
            ? `/api/reports?clientId=${encodeURIComponent(clientId)}`
            : "/api/reports";
          const res = await fetch(url);
          if (res.ok) {
            const data: PersistedReport[] = await res.json();
            if (!cancelled) setReports(data);
            setLoading(false);
            return;
          }
        } catch {
          // fall through to localStorage
        }
      }
      // localStorage fallback
      const local = loadFromLocalStorage();
      const filtered = clientId
        ? local.filter((r) => r.clientId === clientId)
        : local;
      if (!cancelled) setReports(filtered);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [clientId, usingSupabase]);

  const addReport = useCallback(
    async (report: PersistedReport): Promise<void> => {
      // Optimistic update
      setReports((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);

      if (usingSupabase) {
        try {
          const res = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(report),
          });
          if (res.ok) return;
        } catch {
          // fall through to localStorage
        }
      }
      // localStorage fallback
      const existing = loadFromLocalStorage();
      const updated = [report, ...existing.filter((r) => r.id !== report.id)];
      saveToLocalStorage(updated);
    },
    [usingSupabase]
  );

  return { reports, addReport, usingSupabase, loading };
}
