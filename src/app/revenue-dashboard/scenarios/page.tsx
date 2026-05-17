"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  GOLD, fmtCurrency, computeScenario, SCENARIO_PRESETS,
} from "@/lib/revenue/calculations";
import {
  RevenuePageHeader, SectionCard, ScenarioRow, SafetyNote,
} from "../_components";

const SCENARIO_BADGE = (
  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
    style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.10)", border: "1px solid rgba(0,129,242,0.20)" }}>
    SCENARIO
  </span>
);

export default function ScenariosPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getDataProvider().getClients();
        if (!cancelled) setClients(data);
      } catch {
        // silent — scenarios render with base=0 on failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeClients = useMemo(() => clients.filter((c) => c.status === "active"), [clients]);

  const scenarios = useMemo(() => {
    const base = activeClients.length;
    return SCENARIO_PRESETS.map((s) => ({
      ...s,
      result: computeScenario({ startingActive: base, ...s.params }),
    }));
  }, [activeClients.length]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <RevenuePageHeader
        title="12-Month Scenario Modeling"
        subtitle={`Starting from ${loading ? "—" : activeClients.length} active clients · Low / Middle / High growth cases`}
        badge={SCENARIO_BADGE}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {scenarios.map((s) => (
          <SectionCard key={s.label}>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[17px] font-bold"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: s.color }}>
                    {s.label}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--t-dim)" }}>{s.desc}</div>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}>
                  <BarChart3 size={14} style={{ color: s.color }} />
                </div>
              </div>

              <div className="space-y-2">
                <ScenarioRow label="Monthly Setup Revenue"    value={fmtCurrency(s.result.monthlySetupRevenue)}     color={GOLD}          />
                <ScenarioRow label="Monthly Recurring Rev."   value={fmtCurrency(s.result.monthlyRecurringRevenue)} color={GOLD}          />
                <ScenarioRow label="Jaxon Monthly Income"     value={fmtCurrency(s.result.monthlyJaxon)}            color="#0081f2"       />
                <ScenarioRow label="Nick Monthly Income"      value={fmtCurrency(s.result.monthlyNick)}             color="#a78bfa"       />
                <ScenarioRow label="Total Monthly Income"     value={fmtCurrency(s.result.monthlyTotalIncome)}      color={s.color}       />
                <ScenarioRow label="Active Recurring Clients" value={String(s.result.finalActiveClients)}           color="var(--t-text)" />
              </div>

              <div className="pt-3 border-t" style={{ borderColor: "var(--t-border-nav)" }}>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold uppercase tracking-wide"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                    12-Month Revenue
                  </span>
                  <span className="text-[21px] font-bold"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: s.color }}>
                    {fmtCurrency(s.result.total12MonthRevenue)}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: "var(--t-border-nav)" }}>
                  <ScenarioRow label="Jaxon 12-Month Total" value={fmtCurrency(s.result.totalJaxon)} color="#0081f2" />
                  <ScenarioRow label="Nick 12-Month Total"  value={fmtCurrency(s.result.totalNick)}  color="#a78bfa" />
                </div>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>

      <SafetyNote />
    </div>
  );
}
