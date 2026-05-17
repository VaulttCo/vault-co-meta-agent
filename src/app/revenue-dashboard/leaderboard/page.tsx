"use client";

import { useState, useEffect, useMemo } from "react";
import { Trophy } from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  SETUP_FEE, M1_PAYMENT, EST_JOBS_PER_MONTH, RECURRING_PCT,
  GOLD, fmtCurrency, parseAmount, getPhase, PHASE_META,
} from "@/lib/revenue/calculations";
import {
  RevenuePageHeader, SectionCard, SectionHeader, TableHead, TableEmpty,
  EstimateBadge, SafetyNote, PageErrorState,
} from "../_components";

export default function LeaderboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    let cancelled = false;
    (async () => {
      try {
        const data = await getDataProvider().getClients();
        if (!cancelled) setClients(data);
      } catch {
        if (!cancelled) setError("Unable to load leaderboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }

  useEffect(() => load(), []);

  const leaderboard = useMemo(() => {
    const revenueClients = clients.filter((c) => c.status !== "archived");
    return revenueClients
      .map((c) => {
        const jobVal = parseAmount(c.avgJobValue);
        const monthlyClientRevenue = jobVal * EST_JOBS_PER_MONTH;
        const vaultCoRecurring = c.status === "active" ? monthlyClientRevenue * RECURRING_PCT : 0;
        const setupPaid = c.status === "active" ? SETUP_FEE : c.status === "setup" ? M1_PAYMENT : 0;
        const totalValue = setupPaid + vaultCoRecurring * 12;
        return { client: c, jobVal, monthlyClientRevenue, vaultCoRecurring, setupPaid, totalValue };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [clients]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <RevenuePageHeader
        title="Client Revenue Leaderboard"
        subtitle={`Ranked by total projected value · Avg job value × est. ${EST_JOBS_PER_MONTH} jobs/mo × 5% recurring`}
        badge={<EstimateBadge />}
      />

      <SectionCard>
        <SectionHeader
          icon={Trophy}
          title="Client Revenue Leaderboard"
          subtitle={`Ranked by total projected value · Avg job value × est. ${EST_JOBS_PER_MONTH} jobs/mo × 5% recurring`}
          badge={<EstimateBadge />}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <TableHead cols={["#", "Client", "Phase", "Avg Job Value", "Est. Jobs/Mo", "Est. Client Rev/Mo", "Vault Co 5%", "Setup Paid (Proj.)", "12mo Total Value", "Nick Recurring"]} />
            <tbody>
              {loading ? (
                <TableEmpty colSpan={10} message="" loading />
              ) : error ? (
                <tr>
                  <td colSpan={10}>
                    <PageErrorState
                      message="Unable to load leaderboard data."
                      detail="Check your connection or Supabase configuration."
                      onRetry={load}
                    />
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <TableEmpty colSpan={10} message="No revenue clients available yet." />
              ) : (
                leaderboard.map(({ client, jobVal, monthlyClientRevenue, vaultCoRecurring, setupPaid, totalValue }, idx) => {
                  const phase = getPhase(client.status);
                  const meta  = PHASE_META[phase];
                  return (
                    <tr key={client.id}
                      className="border-b transition-colors hover:bg-white/[0.01]"
                      style={{ borderColor: "var(--t-border-nav)" }}>
                      <td className="px-4 py-3.5">
                        <span className="text-[14px] font-bold"
                          style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: idx === 0 ? GOLD : "var(--t-dim)" }}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{client.name}</div>
                        <div className="text-[10px]" style={{ color: "var(--t-dim)" }}>{client.market}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-medium" style={{ color: "var(--t-text)" }}>
                          {jobVal > 0 ? fmtCurrency(jobVal) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px]" style={{ color: "var(--t-dim)" }}>{EST_JOBS_PER_MONTH}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-medium" style={{ color: "var(--t-text)" }}>
                          {monthlyClientRevenue > 0 ? fmtCurrency(monthlyClientRevenue) + "/mo" : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: vaultCoRecurring > 0 ? GOLD : "rgba(107,122,153,0.5)" }}>
                          {vaultCoRecurring > 0 ? fmtCurrency(vaultCoRecurring) + "/mo" : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px]" style={{ color: setupPaid > 0 ? "#22c55e" : "rgba(107,122,153,0.5)" }}>
                          {setupPaid > 0 ? fmtCurrency(setupPaid) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-[13px] font-bold" style={{ color: GOLD }}>{fmtCurrency(totalValue)}</div>
                        <div className="text-[9px]" style={{ color: "var(--t-dim)" }}>setup + 12mo recurring</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-medium"
                          style={{ color: vaultCoRecurring > 0 ? "#a78bfa" : "rgba(107,122,153,0.5)" }}>
                          {vaultCoRecurring > 0 ? fmtCurrency(vaultCoRecurring) + "/mo" : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SafetyNote />
    </div>
  );
}
