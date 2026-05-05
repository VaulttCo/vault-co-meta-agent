"use client";
/**
 * usePersistedReports
 *
 * Provides a list of generated reports that survive page refresh.
 * Storage priority:
 *   1. Supabase `reports` table — uses the browser (anon key) client directly,
 *      same pattern as usePersistedCreativeAssets (avoids server-side key issues).
 *   2. localStorage key "vc_persisted_reports" — fallback for non-Supabase deployments.
 */
import { useState, useEffect, useCallback } from "react";
import type { PersistedReport } from "@/lib/data/data-provider";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const LS_KEY = "vc_persisted_reports";

// ── localStorage helpers ──────────────────────────────────────
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

// ── Row → PersistedReport mapper ─────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToReport(row: Record<string, any>): PersistedReport {
  const fmt = (n: number | null) =>
    n !== null && n !== undefined ? `$${n.toLocaleString()}` : "—";
  const fmtRate = (n: number | null) =>
    n !== null && n !== undefined ? `${Math.round(n * 100)}%` : "—";

  return {
    id: row.id as string,
    clientId: row.client_id as string,
    clientName: (row.client_name as string) ?? undefined,
    reportType: (row.report_type as PersistedReport["reportType"]) ?? "weekly",
    reportPeriod: (row.report_period as string) ?? "",
    reportPeriodStart: row.report_period_start as string,
    reportPeriodEnd: row.report_period_end as string,
    spend: fmt(row.spend as number | null),
    leads: (row.leads as number) ?? 0,
    booked: (row.booked_appointments as number) ?? 0,
    cpl: fmt(row.cpl as number | null),
    cpba: fmt(row.cpba as number | null),
    showRate: fmtRate(row.show_rate as number | null),
    pipelineValue: fmt(row.pipeline_value as number | null),
    revenueGenerated: fmt(row.revenue_generated as number | null),
    wins: (row.wins as string[]) ?? [],
    issues: (row.issues as string[]) ?? [],
    nextActions: (row.next_actions as string[]) ?? [],
    generatedContent: (row.generated_content as PersistedReport["generatedContent"]) ?? undefined,
    status: (row.status as "draft" | "published") ?? "draft",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── PersistedReport → Supabase row mapper ────────────────────
function reportToRow(report: PersistedReport): Record<string, unknown> {
  const parseNum = (s: string) => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ""));
    return isNaN(n) ? null : n;
  };
  const parseRate = (s: string) => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ""));
    return isNaN(n) ? null : n / 100;
  };

  return {
    id: report.id,
    client_id: report.clientId,
    report_type: report.reportType ?? "weekly",
    report_period: report.reportPeriod,
    report_period_start: report.reportPeriodStart,
    report_period_end: report.reportPeriodEnd,
    spend: parseNum(report.spend),
    leads: report.leads,
    booked_appointments: report.booked,
    cpl: parseNum(report.cpl),
    cpba: parseNum(report.cpba),
    show_rate: parseRate(report.showRate),
    pipeline_value: parseNum(report.pipelineValue),
    revenue_generated: parseNum(report.revenueGenerated),
    wins: report.wins,
    issues: report.issues,
    next_actions: report.nextActions,
    generated_content: report.generatedContent ?? null,
    status: report.status ?? "draft",
  };
}

// ── Hook ─────────────────────────────────────────────────────
export function usePersistedReports(clientId?: string) {
  const [reports, setReports] = useState<PersistedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const usingSupabase = isSupabaseConfigured();

  // ── Load on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      if (usingSupabase) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let query = (supabase as any)
            .from("reports")
            .select("*")
            .order("created_at", { ascending: false });

          if (clientId) query = query.eq("client_id", clientId);

          const { data, error } = await query;

          if (!cancelled) {
            if (!error && data) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const mapped: PersistedReport[] = (data as any[]).map(rowToReport);
              setReports(mapped);
            }
            setLoading(false);
          }
          return;
        }
      }

      // localStorage fallback
      const local = loadFromLocalStorage();
      const filtered = clientId
        ? local.filter((r) => r.clientId === clientId)
        : local;
      if (!cancelled) {
        setReports(filtered);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [clientId, usingSupabase]);

  // ── Add / upsert report ───────────────────────────────────
  const addReport = useCallback(
    async (report: PersistedReport): Promise<void> => {
      // Optimistic update
      setReports((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);

      if (usingSupabase) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from("reports")
            .upsert(reportToRow(report));

          if (!error) return;
          // Log the error but fall through to localStorage as backup
          console.warn("[usePersistedReports] Supabase upsert error:", error.message);
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
