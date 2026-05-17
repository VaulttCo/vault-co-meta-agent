"use client";

import { useState, useEffect, useMemo } from "react";
import { Calculator } from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  SETUP_FEE, GOLD, fmtCurrency,
} from "@/lib/revenue/calculations";
import {
  RevenuePageHeader, SectionCard, SectionHeader, CalcInput, CalcOutput, SafetyNote,
} from "../_components";

const CALC_BADGE = (
  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
    style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.10)", border: "1px solid rgba(0,129,242,0.20)" }}>
    CALCULATOR
  </span>
);

export default function ForecastPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [calc, setCalc] = useState({
    newPerMonth:     3,
    lostPerMonth:    1,
    setupFee:        SETUP_FEE,
    m1Payment:       3500,
    m2Payment:       3500,
    jaxonSplit:      57,
    nickSplit:       43,
    avgJobValue:     18000,
    jobsPerMonth:    5,
    recurringPct:    5,
    monthsProjected: 12,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getDataProvider().getClients();
        if (!cancelled) setClients(data);
      } catch {
        // silent — calculator works with $0 defaults on failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeClients = useMemo(() => clients.filter((c) => c.status === "active"), [clients]);

  const calcOutputs = useMemo(() => {
    let active = activeClients.length;
    let totalGrossSetup = 0, totalJaxon = 0, totalNick = 0, totalVaultCo = 0, totalClientRevenue = 0;
    const jaxonPct = calc.jaxonSplit / 100;
    const nickPct  = calc.nickSplit  / 100;

    for (let m = 0; m < calc.monthsProjected; m++) {
      const grossSetup       = calc.newPerMonth * calc.setupFee;
      const clientRevenue    = active * calc.avgJobValue * calc.jobsPerMonth;
      const vaultCoRecurring = clientRevenue * (calc.recurringPct / 100);

      totalGrossSetup     += grossSetup;
      totalJaxon          += grossSetup * jaxonPct;
      totalNick           += grossSetup * nickPct + vaultCoRecurring;
      totalVaultCo        += grossSetup + vaultCoRecurring;
      totalClientRevenue  += clientRevenue;

      if (m >= 1) active = Math.max(0, active + calc.newPerMonth - calc.lostPerMonth);
    }

    return {
      grossSetupRevenue:       totalGrossSetup,
      jaxonSetupEarnings:      totalGrossSetup * jaxonPct,
      nickSetupEarnings:       totalGrossSetup * nickPct,
      nickRecurringEarnings:   totalNick - totalGrossSetup * nickPct,
      totalNickEarnings:       totalNick,
      activeRecurringClients:  active,
      clientRevenueGenerated:  totalClientRevenue,
      vaultCoRevenue:          totalVaultCo,
    };
  }, [calc, activeClients.length]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <RevenuePageHeader
        title="Revenue Forecast Calculator"
        subtitle="Adjust inputs to model projected earnings across any time horizon"
        badge={CALC_BADGE}
      />

      <SectionCard>
        <SectionHeader
          icon={Calculator}
          title="Revenue Forecast Calculator"
          subtitle="Adjust inputs to model projected earnings across any time horizon"
          badge={CALC_BADGE}
        />
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CalcInput label="New Clients / Month"    value={calc.newPerMonth}     onChange={(v) => setCalc((c) => ({ ...c, newPerMonth: v }))}                                         min={0}   max={100}     />
            <CalcInput label="Clients Lost / Month"   value={calc.lostPerMonth}    onChange={(v) => setCalc((c) => ({ ...c, lostPerMonth: v }))}                                        min={0}   max={100}     />
            <CalcInput label="Setup Fee / Client"     value={calc.setupFee}        onChange={(v) => setCalc((c) => ({ ...c, setupFee: v }))}                                            min={0}   max={100000}  prefix="$" />
            <CalcInput label="Month 1 Payment"        value={calc.m1Payment}       onChange={(v) => setCalc((c) => ({ ...c, m1Payment: v }))}                                           min={0}   max={100000}  prefix="$" />
            <CalcInput label="Month 2 Payment"        value={calc.m2Payment}       onChange={(v) => setCalc((c) => ({ ...c, m2Payment: v }))}                                           min={0}   max={100000}  prefix="$" />
            <CalcInput label="Jaxon Setup Split"      value={calc.jaxonSplit}      onChange={(v) => setCalc((c) => ({ ...c, jaxonSplit: v, nickSplit: 100 - v }))}                      min={0}   max={100}     suffix="%" />
            <CalcInput label="Nick Setup Split"       value={calc.nickSplit}       onChange={(v) => setCalc((c) => ({ ...c, nickSplit: v, jaxonSplit: 100 - v }))}                      min={0}   max={100}     suffix="%" />
            <CalcInput label="Avg Job Value"          value={calc.avgJobValue}     onChange={(v) => setCalc((c) => ({ ...c, avgJobValue: v }))}                                         min={0}   max={1000000} prefix="$" />
            <CalcInput label="Jobs / Client / Month"  value={calc.jobsPerMonth}    onChange={(v) => setCalc((c) => ({ ...c, jobsPerMonth: v }))}                                        min={0}   max={100}     />
            <CalcInput label="Recurring %"            value={calc.recurringPct}    onChange={(v) => setCalc((c) => ({ ...c, recurringPct: v }))}                                        min={0}   max={100}     suffix="%" />
            <CalcInput label="Months Projected"       value={calc.monthsProjected} onChange={(v) => setCalc((c) => ({ ...c, monthsProjected: v }))}                                    min={1}   max={120}     />
            <div className="flex items-end">
              <div className="text-[10px] font-medium px-3 py-2 rounded-lg w-full text-center"
                style={{ color: "var(--t-dim)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
                Starting active: {loading ? "—" : activeClients.length} clients
              </div>
            </div>
          </div>

          <div className="pt-4 border-t" style={{ borderColor: "var(--t-border-nav)" }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-3"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
              Projected Outputs — {calc.monthsProjected} Month{calc.monthsProjected !== 1 ? "s" : ""}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <CalcOutput label="Gross Setup Revenue"      value={fmtCurrency(calcOutputs.grossSetupRevenue)}      color={GOLD}           />
              <CalcOutput label="Jaxon Setup Earnings"     value={fmtCurrency(calcOutputs.jaxonSetupEarnings)}     color="#0081f2"        />
              <CalcOutput label="Nick Setup Earnings"      value={fmtCurrency(calcOutputs.nickSetupEarnings)}      color="#a78bfa"        />
              <CalcOutput label="Nick Recurring Earnings"  value={fmtCurrency(calcOutputs.nickRecurringEarnings)}  color="#22c55e"        />
              <CalcOutput label="Total Nick Earnings"      value={fmtCurrency(calcOutputs.totalNickEarnings)}      color="#a78bfa"        />
              <CalcOutput label="Active Recurring Clients" value={String(calcOutputs.activeRecurringClients)}      color={GOLD}           />
              <CalcOutput label="Client Revenue Generated" value={fmtCurrency(calcOutputs.clientRevenueGenerated)} color="var(--t-text)"  />
              <CalcOutput label="Total Vault Co Revenue"   value={fmtCurrency(calcOutputs.vaultCoRevenue)}         color={GOLD}           />
            </div>
          </div>
        </div>
      </SectionCard>

      <SafetyNote />
    </div>
  );
}
