"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Target, Building2 } from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  SETUP_FEE, M1_PAYMENT, M2_PAYMENT,
  JAXON_SETUP_PCT, NICK_SETUP_PCT, RECURRING_PCT, EST_JOBS_PER_MONTH,
  JAXON_PER_SETUP, NICK_PER_SETUP,
  GOLD, GOLD_BG, GOLD_BORDER,
  fmtCurrency, parseAmount,
} from "@/lib/revenue/calculations";
import {
  RevenuePageHeader, SectionCard, EarningsRow, ProjectionBadge, BillingEmptyState, SafetyNote,
  PageErrorState,
} from "../_components";

export default function PartnerEarningsPage() {
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
        if (!cancelled) setError("Unable to load partner earnings data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }

  useEffect(() => load(), []);

  const activeClients = useMemo(() => clients.filter((c) => c.status === "active"), [clients]);
  const setupClients  = useMemo(() => clients.filter((c) => c.status === "setup"),  [clients]);

  const { projectedSetupRevenue, projectedJaxonSetup, projectedNickSetup } = useMemo(() => {
    const rev = activeClients.length * SETUP_FEE + setupClients.length * M1_PAYMENT;
    return {
      projectedSetupRevenue: rev,
      projectedJaxonSetup:   rev * JAXON_SETUP_PCT,
      projectedNickSetup:    rev * NICK_SETUP_PCT,
    };
  }, [activeClients, setupClients]);

  const recurringPotential = useMemo(() =>
    activeClients.reduce((sum, c) => {
      const jobVal = parseAmount(c.avgJobValue);
      return sum + jobVal * EST_JOBS_PER_MONTH * RECURRING_PCT;
    }, 0),
  [activeClients]);

  const projectedNickTotal = useMemo(
    () => projectedNickSetup + recurringPotential,
    [projectedNickSetup, recurringPotential]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <RevenuePageHeader
        title="Partner Earnings Split"
        subtitle="Jaxon 57% setup · Nick 43% setup + 100% recurring revenue"
        badge={<ProjectionBadge />}
      />

      {error && (
        <SectionCard>
          <PageErrorState
            message="Unable to load partner earnings data."
            detail="Check your connection or Supabase configuration."
            onRetry={load}
          />
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Jaxon */}
        <SectionCard>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "rgba(0,129,242,0.08)", border: "1px solid rgba(0,129,242,0.18)" }}>
                <Users size={14} style={{ color: "#0081f2" }} />
              </div>
              <div>
                <div className="text-[15px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                  Jaxon
                </div>
                <div className="text-[10px]" style={{ color: "var(--t-dim)" }}>Setup 57% · No recurring</div>
              </div>
            </div>
            <div className="space-y-2.5">
              <EarningsRow label="Projected Pipeline Earnings" value={loading ? "—" : fmtCurrency(projectedJaxonSetup)}        color="#0081f2"               />
              <EarningsRow label="Per New Client (Full Setup)"  value={fmtCurrency(JAXON_PER_SETUP)}                            color="#0081f2"               />
              <EarningsRow label="Per Month 1 Payment"          value={fmtCurrency(M1_PAYMENT * JAXON_SETUP_PCT)}              color="#0081f2"               />
              <EarningsRow label="Per Month 2 Payment"          value={fmtCurrency(M2_PAYMENT * JAXON_SETUP_PCT)}              color="#0081f2"               />
              <EarningsRow label="Recurring Share"              value="$0"                                                      color="rgba(107,122,153,0.5)" />
            </div>
            <div className="pt-3 border-t" style={{ borderColor: "var(--t-border-nav)" }}>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                  Projected Total
                </span>
                <span className="text-[20px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#0081f2" }}>
                  {loading ? "—" : fmtCurrency(projectedJaxonSetup)}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Nick */}
        <SectionCard>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.18)" }}>
                <Target size={14} style={{ color: "#a78bfa" }} />
              </div>
              <div>
                <div className="text-[15px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                  Nick
                </div>
                <div className="text-[10px]" style={{ color: "var(--t-dim)" }}>Setup 43% · Recurring 100%</div>
              </div>
            </div>
            <div className="space-y-2.5">
              <EarningsRow label="Projected Setup Earnings"    value={loading ? "—" : fmtCurrency(projectedNickSetup)}                   color="#a78bfa" />
              <EarningsRow label="Recurring Potential (Est.)"  value={loading ? "—" : fmtCurrency(recurringPotential) + "/mo"}            color="#22c55e" />
              <EarningsRow label="Per New Client (Full Setup)" value={fmtCurrency(NICK_PER_SETUP)}                                       color="#a78bfa" />
              <EarningsRow label="Per Month 1 Payment"         value={fmtCurrency(M1_PAYMENT * NICK_SETUP_PCT)}                          color="#a78bfa" />
              <EarningsRow label="Recurring Share"             value="100% of 5%"                                                        color="#22c55e" />
            </div>
            <div className="pt-3 border-t" style={{ borderColor: "var(--t-border-nav)" }}>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                  Projected Total
                </span>
                <span className="text-[20px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#a78bfa" }}>
                  {loading ? "—" : fmtCurrency(projectedNickTotal)}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Vault Co */}
        <SectionCard>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                <Building2 size={14} style={{ color: GOLD }} />
              </div>
              <div>
                <div className="text-[15px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                  Vault Co
                </div>
                <div className="text-[10px]" style={{ color: "var(--t-dim)" }}>Setup + 5% recurring</div>
              </div>
            </div>
            <div className="space-y-2.5">
              <EarningsRow label="Gross Setup (Proj.)"        value={loading ? "—" : fmtCurrency(projectedSetupRevenue)}               color={GOLD}         />
              <EarningsRow label="Recurring Potential (Est.)" value={loading ? "—" : fmtCurrency(recurringPotential) + "/mo"}           color={GOLD}         />
              <EarningsRow label="Jaxon Payout (Proj.)"       value={loading ? "—" : fmtCurrency(projectedJaxonSetup)}                  color="#0081f2"      />
              <EarningsRow label="Nick Payout (Proj.)"        value={loading ? "—" : fmtCurrency(projectedNickTotal)}                   color="#a78bfa"      />
              <EarningsRow label="Setup Split"                value="57% Jaxon · 43% Nick"                                             color="var(--t-dim)" />
            </div>
            <div className="pt-3 border-t" style={{ borderColor: "var(--t-border-nav)" }}>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                  Projected Total
                </span>
                <span className="text-[20px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: GOLD }}>
                  {loading ? "—" : fmtCurrency(projectedSetupRevenue + recurringPotential * 12)}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

      </div>

      <BillingEmptyState />
      <SafetyNote />
    </div>
  );
}
