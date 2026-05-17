"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp, DollarSign, Users, ChevronRight, Loader2,
  ShieldCheck, BarChart3, Calculator, Trophy, ToggleLeft,
  ToggleRight, AlertCircle, Info, Building2, RefreshCw,
  Target, ArrowUpRight, Zap, Layers, CheckCircle2,
} from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  makeDefaultSettings,
  type ClientRevenueSettings,
} from "@/lib/revenue/types";

// ─── Business constants ───────────────────────────────────────────────────────
const SETUP_FEE = 7000;
const M1_PAYMENT = 3500;
const M2_PAYMENT = 3500;
const JAXON_SETUP_PCT = 0.57;
const NICK_SETUP_PCT = 0.43;
const RECURRING_PCT = 0.05;
const JAXON_PER_SETUP = SETUP_FEE * JAXON_SETUP_PCT; // 3990
const NICK_PER_SETUP = SETUP_FEE * NICK_SETUP_PCT;   // 3010
const EST_JOBS_PER_MONTH = 5;

// ─── Style tokens ─────────────────────────────────────────────────────────────
const GOLD = "#c9a84c";
const GOLD_BG = "rgba(201,168,76,0.08)";
const GOLD_BORDER = "rgba(201,168,76,0.20)";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(n: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(n);
}

function parseAmount(s: string): number {
  const n = parseFloat((s ?? "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

type RevenuePhase = "pre_setup" | "month_1_due" | "month_2_due" | "recurring" | "paused" | "cancelled";

function getPhase(status: Client["status"]): RevenuePhase {
  switch (status) {
    case "onboarding": return "month_1_due";
    case "setup":      return "month_2_due";
    case "active":     return "recurring";
    case "paused":     return "paused";
    case "archived":   return "cancelled";
    default:           return "pre_setup";
  }
}

const PHASE_META: Record<RevenuePhase, { label: string; color: string; bg: string; border: string }> = {
  pre_setup:   { label: "Pre-Setup",        color: "rgba(107,122,153,0.8)", bg: "rgba(61,79,110,0.10)",  border: "rgba(61,79,110,0.18)"  },
  month_1_due: { label: "Month 1 — Due",    color: "#f59e0b",               bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.20)" },
  month_2_due: { label: "Month 2 — Due",    color: "#0081f2",               bg: "rgba(0,129,242,0.08)",  border: "rgba(0,129,242,0.20)"  },
  recurring:   { label: "Recurring Active", color: "#22c55e",               bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.20)"  },
  paused:      { label: "Paused",           color: "rgba(107,122,153,0.7)", bg: "rgba(61,79,110,0.08)",  border: "rgba(61,79,110,0.15)"  },
  cancelled:   { label: "Cancelled",        color: "#ef4444",               bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.20)"  },
};

function computeScenario(p: {
  startingActive: number;
  newPerMonth: number;
  lostPerMonth: number;
  setupFee: number;
  avgJobValue: number;
  jobsPerMonth: number;
  recurringPct: number;
  months: number;
}) {
  let active = p.startingActive;
  let totalSetup = 0, totalRecurring = 0, totalJaxon = 0, totalNick = 0;

  for (let m = 0; m < p.months; m++) {
    const setup = p.newPerMonth * p.setupFee;
    const clientRevenue = active * p.avgJobValue * p.jobsPerMonth;
    const vaultCoRecurring = clientRevenue * (p.recurringPct / 100);

    totalSetup += setup;
    totalRecurring += vaultCoRecurring;
    totalJaxon += setup * JAXON_SETUP_PCT;
    totalNick += setup * NICK_SETUP_PCT + vaultCoRecurring;

    if (m >= 1) active = Math.max(0, active + p.newPerMonth - p.lostPerMonth);
  }

  const finalClientRevenue = active * p.avgJobValue * p.jobsPerMonth;
  const finalRecurring = finalClientRevenue * (p.recurringPct / 100);

  return {
    monthlySetupRevenue:   p.newPerMonth * p.setupFee,
    monthlyRecurringRevenue: finalRecurring,
    monthlyJaxon:          p.newPerMonth * p.setupFee * JAXON_SETUP_PCT,
    monthlyNick:           p.newPerMonth * p.setupFee * NICK_SETUP_PCT + finalRecurring,
    monthlyTotalIncome:    p.newPerMonth * p.setupFee + finalRecurring,
    finalActiveClients:    active,
    total12MonthRevenue:   totalSetup + totalRecurring,
    totalJaxon,
    totalNick,
  };
}

// ─── Shared UI pieces ─────────────────────────────────────────────────────────

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon, title, badge, subtitle,
}: {
  icon: React.ElementType; title: string; badge?: React.ReactNode; subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
        <Icon size={13} style={{ color: GOLD }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold tracking-wide"
          style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
          {title}
        </div>
        {subtitle && <p className="text-[11px] mt-0.5" style={{ color: "var(--t-dim)" }}>{subtitle}</p>}
      </div>
      {badge}
    </div>
  );
}

function ProjectionBadge({ label = "PROJECTION" }: { label?: string }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ color: "#a78bfa", backgroundColor: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.20)" }}>
      {label}
    </span>
  );
}

function EstimateBadge() {
  return (
    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
      ESTIMATE
    </span>
  );
}

function EarningsRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: "var(--t-dim)" }}>{label}</span>
      <span className="text-[12px] font-semibold flex-shrink-0" style={{ color }}>{value}</span>
    </div>
  );
}

function ScenarioRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: "var(--t-dim)" }}>{label}</span>
      <span className="text-[12px] font-bold flex-shrink-0" style={{ color }}>{value}</span>
    </div>
  );
}

function CalcInput({
  label, value, onChange, min = 0, max, prefix, suffix,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; prefix?: string; suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-bold uppercase tracking-widest"
        style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-[12px] flex-shrink-0" style={{ color: "var(--t-dim)" }}>{prefix}</span>}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.max(min, Math.min(max ?? Infinity, v)));
          }}
          className="w-full px-2.5 py-2 rounded-lg text-[13px] font-semibold bg-transparent outline-none"
          style={{
            backgroundColor: "rgba(0,129,242,0.04)",
            border: "1px solid rgba(61,79,110,0.25)",
            color: "var(--t-text)",
            fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
          }}
        />
        {suffix && <span className="text-[12px] flex-shrink-0" style={{ color: "var(--t-dim)" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function CalcOutput({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-3 space-y-1"
      style={{ backgroundColor: "rgba(0,129,242,0.03)", border: "1px solid rgba(61,79,110,0.15)" }}>
      <div className="text-[9px] font-bold uppercase tracking-widest"
        style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
        {label}
      </div>
      <div className="text-[18px] font-bold"
        style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color }}>
        {value}
      </div>
    </div>
  );
}

function InvoiceStatusBadge({ active, ghlConnected }: { active: boolean; ghlConnected: boolean }) {
  if (!active) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: "rgba(107,122,153,0.7)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
      Not Active
    </span>
  );
  if (!ghlConnected) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)" }}>
      Needs GHL
    </span>
  );
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.08)", border: "1px solid rgba(0,129,242,0.20)" }}>
      Ready to Invoice
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RevenueDashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Revenue settings — keyed by clientId, loaded from /api/revenue-settings
  const [settingsMap, setSettingsMap] = useState<Record<string, ClientRevenueSettings>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  // Per-client save indicator for the toggle
  const [savingToggle, setSavingToggle] = useState<Record<string, boolean>>({});

  const [calc, setCalc] = useState({
    newPerMonth: 3,
    lostPerMonth: 1,
    setupFee: 7000,
    m1Payment: 3500,
    m2Payment: 3500,
    jaxonSplit: 57,
    nickSplit: 43,
    avgJobValue: 18000,
    jobsPerMonth: 5,
    recurringPct: 5,
    monthsProjected: 12,
  });

  useEffect(() => {
    getDataProvider()
      .getClients()
      .then(setClients)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load persisted revenue settings for all clients
  useEffect(() => {
    setSettingsLoading(true);
    fetch("/api/revenue-settings")
      .then((r) => (r.ok ? r.json() : { settings: [] }))
      .then(({ settings }: { settings: ClientRevenueSettings[] }) => {
        const map: Record<string, ClientRevenueSettings> = {};
        (settings ?? []).forEach((s) => { map[s.clientId] = s; });
        setSettingsMap(map);
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  }, []);

  // Toggle recurring billing active for a client — persists to Supabase
  async function handleToggleRecurring(clientId: string) {
    const current = settingsMap[clientId]?.recurringBillingActive ?? false;
    const next = !current;

    // Optimistic update
    setSettingsMap((prev) => ({
      ...prev,
      [clientId]: {
        ...(prev[clientId] ?? makeDefaultSettings(clientId)),
        recurringBillingActive: next,
      },
    }));
    setSavingToggle((prev) => ({ ...prev, [clientId]: true }));

    try {
      const res = await fetch(`/api/revenue-settings/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recurringBillingActive: next }),
      });

      if (res.ok) {
        const { settings } = await res.json();
        if (settings) {
          setSettingsMap((prev) => ({ ...prev, [clientId]: settings }));
        }
      } else {
        // Revert on server error
        setSettingsMap((prev) => ({
          ...prev,
          [clientId]: {
            ...(prev[clientId] ?? makeDefaultSettings(clientId)),
            recurringBillingActive: current,
          },
        }));
      }
    } catch {
      // Revert on network error
      setSettingsMap((prev) => ({
        ...prev,
        [clientId]: {
          ...(prev[clientId] ?? makeDefaultSettings(clientId)),
          recurringBillingActive: current,
        },
      }));
    } finally {
      setSavingToggle((prev) => ({ ...prev, [clientId]: false }));
    }
  }

  // ── Derived client groups ─────────────────────────────────────────────────
  const activeClients  = useMemo(() => clients.filter((c) => c.status === "active"), [clients]);
  const setupClients   = useMemo(() => clients.filter((c) => c.status === "setup"), [clients]);
  const revenueClients = useMemo(() => clients.filter((c) => c.status !== "archived"), [clients]);

  // ── Revenue projections ───────────────────────────────────────────────────
  const { projectedSetupRevenue, projectedJaxonSetup, projectedNickSetup } = useMemo(() => {
    const rev = activeClients.length * SETUP_FEE + setupClients.length * M1_PAYMENT;
    return {
      projectedSetupRevenue: rev,
      projectedJaxonSetup: rev * JAXON_SETUP_PCT,
      projectedNickSetup: rev * NICK_SETUP_PCT,
    };
  }, [activeClients, setupClients]);

  const recurringPotential = useMemo(() =>
    activeClients.reduce((sum, c) => {
      const jobVal = parseAmount(c.avgJobValue);
      return sum + jobVal * EST_JOBS_PER_MONTH * RECURRING_PCT;
    }, 0),
  [activeClients]);

  const projectedNickTotal = useMemo(() => projectedNickSetup + recurringPotential, [projectedNickSetup, recurringPotential]);

  // ── Leaderboard ───────────────────────────────────────────────────────────
  const leaderboard = useMemo(() =>
    revenueClients
      .map((c) => {
        const jobVal = parseAmount(c.avgJobValue);
        const monthlyClientRevenue = jobVal * EST_JOBS_PER_MONTH;
        const vaultCoRecurring = c.status === "active" ? monthlyClientRevenue * RECURRING_PCT : 0;
        const setupPaid = c.status === "active" ? SETUP_FEE : c.status === "setup" ? M1_PAYMENT : 0;
        const totalValue = setupPaid + vaultCoRecurring * 12;
        return { client: c, jobVal, monthlyClientRevenue, vaultCoRecurring, setupPaid, totalValue };
      })
      .sort((a, b) => b.totalValue - a.totalValue),
  [revenueClients]);

  // ── Calculator outputs ────────────────────────────────────────────────────
  const calcOutputs = useMemo(() => {
    let active = activeClients.length;
    let totalGrossSetup = 0, totalJaxon = 0, totalNick = 0, totalVaultCo = 0, totalClientRevenue = 0;
    const jaxonPct = calc.jaxonSplit / 100;
    const nickPct  = calc.nickSplit / 100;

    for (let m = 0; m < calc.monthsProjected; m++) {
      const grossSetup = calc.newPerMonth * calc.setupFee;
      const clientRevenue = active * calc.avgJobValue * calc.jobsPerMonth;
      const vaultCoRecurring = clientRevenue * (calc.recurringPct / 100);

      totalGrossSetup += grossSetup;
      totalJaxon += grossSetup * jaxonPct;
      totalNick += grossSetup * nickPct + vaultCoRecurring;
      totalVaultCo += grossSetup + vaultCoRecurring;
      totalClientRevenue += clientRevenue;

      if (m >= 1) active = Math.max(0, active + calc.newPerMonth - calc.lostPerMonth);
    }

    return {
      grossSetupRevenue:    totalGrossSetup,
      jaxonSetupEarnings:   totalGrossSetup * jaxonPct,
      nickSetupEarnings:    totalGrossSetup * nickPct,
      nickRecurringEarnings: totalNick - totalGrossSetup * nickPct,
      totalNickEarnings:    totalNick,
      activeRecurringClients: active,
      clientRevenueGenerated: totalClientRevenue,
      vaultCoRevenue:       totalVaultCo,
    };
  }, [calc, activeClients.length]);

  // ── Scenarios ─────────────────────────────────────────────────────────────
  const scenarios = useMemo(() => {
    const base = activeClients.length;
    return [
      {
        label: "Low Case",
        color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)",
        desc: "3 new · 2 lost · $18k avg · 4 jobs",
        params: { startingActive: base, newPerMonth: 3, lostPerMonth: 2, setupFee: SETUP_FEE, avgJobValue: 18000, jobsPerMonth: 4, recurringPct: 5, months: 12 },
      },
      {
        label: "Middle Case",
        color: GOLD, bg: GOLD_BG, border: GOLD_BORDER,
        desc: "4 new · 1 lost · $18k avg · 5 jobs",
        params: { startingActive: base, newPerMonth: 4, lostPerMonth: 1, setupFee: SETUP_FEE, avgJobValue: 18000, jobsPerMonth: 5, recurringPct: 5, months: 12 },
      },
      {
        label: "High Case",
        color: "#22c55e", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.15)",
        desc: "5 new · 1 lost · $22k avg · 6 jobs",
        params: { startingActive: base, newPerMonth: 5, lostPerMonth: 1, setupFee: SETUP_FEE, avgJobValue: 22000, jobsPerMonth: 6, recurringPct: 5, months: 12 },
      },
    ].map((s) => ({ ...s, result: computeScenario(s.params) }));
  }, [activeClients.length]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden rounded-xl"
        style={{ backgroundColor: "var(--t-surface)", border: `1px solid ${GOLD_BORDER}`, boxShadow: "var(--t-card-shadow)" }}>
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "rgba(201,168,76,0.05)" }} />
        <div className="relative px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <TrendingUp size={18} style={{ color: GOLD }} />
              <h1 className="text-[22px] font-bold tracking-wide"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                Vault Co Revenue Dashboard
              </h1>
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                Phase 1
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ color: "rgba(107,122,153,0.7)", backgroundColor: "rgba(61,79,110,0.10)", border: "1px solid rgba(61,79,110,0.18)" }}>
                Billing Not Connected
              </span>
            </div>
            <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
              Setup revenue · partner earnings · recurring projections · scenario modeling.
              All figures are projections until Stripe or Square is connected.
            </p>
          </div>
          <Link href="/" className="flex items-center gap-1 text-[11px] flex-shrink-0"
            style={{ color: "var(--t-dim)" }}>
            Command Hub <ChevronRight size={11} />
          </Link>
        </div>
      </div>

      {/* ── 1. Executive Revenue Snapshot ──────────────────────────────── */}
      <div id="executive-snapshot">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: GOLD }}>
            Executive Revenue Snapshot
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: GOLD_BORDER }} />
          <ProjectionBadge />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              label: "Gross Setup Revenue",
              value: loading ? "—" : fmtCurrency(projectedSetupRevenue),
              sub: loading ? "" : `${activeClients.length + setupClients.length} clients in paid phases`,
              icon: DollarSign, color: GOLD, bg: GOLD_BG, border: GOLD_BORDER, badge: "projection",
            },
            {
              label: "Jaxon Earnings (57%)",
              value: loading ? "—" : fmtCurrency(projectedJaxonSetup),
              sub: "Setup revenue × 0.57",
              icon: Users, color: "#0081f2", bg: "rgba(0,129,242,0.08)", border: "rgba(0,129,242,0.18)", badge: "projection",
            },
            {
              label: "Nick Setup Earnings (43%)",
              value: loading ? "—" : fmtCurrency(projectedNickSetup),
              sub: "Setup revenue × 0.43",
              icon: Target, color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.18)", badge: "projection",
            },
            {
              label: "Recurring Revenue Potential",
              value: loading ? "—" : fmtCurrency(recurringPotential) + "/mo",
              sub: `${activeClients.length} active clients · est. ${EST_JOBS_PER_MONTH} jobs/mo × 5%`,
              icon: ArrowUpRight, color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.18)", badge: "estimate",
            },
            {
              label: "Active Revenue Clients",
              value: loading ? "—" : String(activeClients.length),
              sub: loading ? "" : `${revenueClients.length} total in pipeline`,
              icon: Zap, color: GOLD, bg: GOLD_BG, border: GOLD_BORDER, badge: "",
            },
            {
              label: "Nick Projected Monthly",
              value: loading ? "—" : fmtCurrency(projectedNickTotal),
              sub: "Setup + recurring at current volume",
              icon: BarChart3, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.18)", badge: "estimate",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl p-5 flex flex-col gap-3"
                style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}>
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.bg, border: `1px solid ${card.border}` }}>
                    <Icon size={14} style={{ color: card.color }} />
                  </div>
                  {card.badge === "projection" && <ProjectionBadge />}
                  {card.badge === "estimate" && <EstimateBadge />}
                </div>
                <div>
                  <div className="text-[22px] font-bold"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: card.color }}>
                    {card.value}
                  </div>
                  <div className="text-[11px] font-medium mt-0.5" style={{ color: "var(--t-text)" }}>{card.label}</div>
                  {card.sub && <div className="text-[10px] mt-0.5" style={{ color: "var(--t-dim)" }}>{card.sub}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. Setup Revenue Pipeline ───────────────────────────────────── */}
      <div id="setup-pipeline">
        <SectionCard>
          <SectionHeader
            icon={Layers}
            title="Setup Revenue Pipeline"
            subtitle={`$${SETUP_FEE.toLocaleString()} per client · Month 1: $${M1_PAYMENT.toLocaleString()} · Month 2: $${M2_PAYMENT.toLocaleString()}`}
            badge={<ProjectionBadge label="BILLING REQ. FOR ACTUALS" />}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--t-border-nav)" }}>
                  {["Client", "Revenue Phase", "Setup Total", "M1 Status", "M2 Status", "Jaxon Share", "Nick Share", "Remaining"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center">
                      <div className="flex items-center justify-center gap-2" style={{ color: "var(--t-dim)" }}>
                        <Loader2 size={13} className="animate-spin" />
                        <span className="text-[12px]">Loading pipeline…</span>
                      </div>
                    </td>
                  </tr>
                ) : revenueClients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center">
                      <p className="text-[12px]" style={{ color: "var(--t-dim)" }}>No clients in revenue pipeline.</p>
                    </td>
                  </tr>
                ) : (
                  revenueClients.map((client) => {
                    const phase = getPhase(client.status);
                    const meta  = PHASE_META[phase];
                    const m1Done = phase === "month_2_due" || phase === "recurring";
                    const m2Done = phase === "recurring";
                    const paidAmt = m2Done ? SETUP_FEE : m1Done ? M1_PAYMENT : 0;
                    const remaining = SETUP_FEE - paidAmt;

                    return (
                      <tr key={client.id}
                        className="border-b transition-colors hover:bg-white/[0.01]"
                        style={{ borderColor: "var(--t-border-nav)" }}>
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
                          <span className="text-[13px] font-bold" style={{ color: GOLD }}>{fmtCurrency(SETUP_FEE)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {m1Done ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 size={12} style={{ color: "#22c55e" }} />
                              <span className="text-[11px]" style={{ color: "#22c55e" }}>Pipeline ✓</span>
                            </div>
                          ) : (
                            <span className="text-[11px]" style={{ color: "rgba(107,122,153,0.5)" }}>Billing Req.</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {m2Done ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 size={12} style={{ color: "#22c55e" }} />
                              <span className="text-[11px]" style={{ color: "#22c55e" }}>Pipeline ✓</span>
                            </div>
                          ) : (
                            <span className="text-[11px]" style={{ color: "rgba(107,122,153,0.5)" }}>Billing Req.</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-[12px] font-medium" style={{ color: "#0081f2" }}>
                            {paidAmt > 0 ? fmtCurrency(paidAmt * JAXON_SETUP_PCT) : "—"}
                          </div>
                          <div className="text-[9px]" style={{ color: "var(--t-dim)" }}>of {fmtCurrency(JAXON_PER_SETUP)}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-[12px] font-medium" style={{ color: "#a78bfa" }}>
                            {paidAmt > 0 ? fmtCurrency(paidAmt * NICK_SETUP_PCT) : "—"}
                          </div>
                          <div className="text-[9px]" style={{ color: "var(--t-dim)" }}>of {fmtCurrency(NICK_PER_SETUP)}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[12px] font-semibold"
                            style={{ color: remaining === 0 ? "#22c55e" : "#f59e0b" }}>
                            {fmtCurrency(remaining)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor: "var(--t-border-nav)" }}>
            <Info size={11} className="flex-shrink-0" style={{ color: "var(--t-dim)" }} />
            <p className="text-[11px]" style={{ color: "var(--t-dim)" }}>
              M1/M2 status is inferred from pipeline stage, not confirmed payment data. Connect Stripe or Square to track actual collections.
            </p>
          </div>
        </SectionCard>
      </div>

      {/* ── 3. Partner Earnings Split ───────────────────────────────────── */}
      <div id="partner-earnings">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: GOLD }}>
            Partner Earnings Split
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: GOLD_BORDER }} />
          <ProjectionBadge />
        </div>
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
                <EarningsRow label="Projected Pipeline Earnings" value={loading ? "—" : fmtCurrency(projectedJaxonSetup)} color="#0081f2" />
                <EarningsRow label="Per New Client (Full Setup)" value={fmtCurrency(JAXON_PER_SETUP)} color="#0081f2" />
                <EarningsRow label="Per Month 1 Payment" value={fmtCurrency(M1_PAYMENT * JAXON_SETUP_PCT)} color="#0081f2" />
                <EarningsRow label="Per Month 2 Payment" value={fmtCurrency(M2_PAYMENT * JAXON_SETUP_PCT)} color="#0081f2" />
                <EarningsRow label="Recurring Share" value="$0" color="rgba(107,122,153,0.5)" />
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
                <EarningsRow label="Projected Setup Earnings" value={loading ? "—" : fmtCurrency(projectedNickSetup)} color="#a78bfa" />
                <EarningsRow label="Recurring Potential (Est.)" value={loading ? "—" : fmtCurrency(recurringPotential) + "/mo"} color="#22c55e" />
                <EarningsRow label="Per New Client (Full Setup)" value={fmtCurrency(NICK_PER_SETUP)} color="#a78bfa" />
                <EarningsRow label="Per Month 1 Payment" value={fmtCurrency(M1_PAYMENT * NICK_SETUP_PCT)} color="#a78bfa" />
                <EarningsRow label="Recurring Share" value="100% of 5%" color="#22c55e" />
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
                <EarningsRow label="Gross Setup (Proj.)" value={loading ? "—" : fmtCurrency(projectedSetupRevenue)} color={GOLD} />
                <EarningsRow label="Recurring Potential (Est.)" value={loading ? "—" : fmtCurrency(recurringPotential) + "/mo"} color={GOLD} />
                <EarningsRow label="Jaxon Payout (Proj.)" value={loading ? "—" : fmtCurrency(projectedJaxonSetup)} color="#0081f2" />
                <EarningsRow label="Nick Payout (Proj.)" value={loading ? "—" : fmtCurrency(projectedNickTotal)} color="#a78bfa" />
                <EarningsRow label="Setup Split" value="57% Jaxon · 43% Nick" color="var(--t-dim)" />
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
      </div>

      {/* ── 4. Client Revenue Leaderboard ───────────────────────────────── */}
      <div id="leaderboard">
        <SectionCard>
          <SectionHeader
            icon={Trophy}
            title="Client Revenue Leaderboard"
            subtitle={`Ranked by total projected value · Avg job value × est. ${EST_JOBS_PER_MONTH} jobs/mo × 5% recurring`}
            badge={<EstimateBadge />}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--t-border-nav)" }}>
                  {["#", "Client", "Phase", "Avg Job Value", "Est. Jobs/Mo", "Est. Client Rev/Mo", "Vault Co 5%", "Setup Paid (Proj.)", "12mo Total Value", "Nick Recurring"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-8 text-center">
                      <div className="flex items-center justify-center gap-2" style={{ color: "var(--t-dim)" }}>
                        <Loader2 size={13} className="animate-spin" />
                        <span className="text-[12px]">Loading leaderboard…</span>
                      </div>
                    </td>
                  </tr>
                ) : leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-8 text-center">
                      <p className="text-[12px]" style={{ color: "var(--t-dim)" }}>No clients in revenue pipeline.</p>
                    </td>
                  </tr>
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
      </div>

      {/* ── 5. Revenue Forecast Calculator ─────────────────────────────── */}
      <div id="forecast-calculator">
        <SectionCard>
          <SectionHeader
            icon={Calculator}
            title="Revenue Forecast Calculator"
            subtitle="Adjust inputs to model projected earnings across any time horizon"
            badge={
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.10)", border: "1px solid rgba(0,129,242,0.20)" }}>
                CALCULATOR
              </span>
            }
          />
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <CalcInput label="New Clients / Month"   value={calc.newPerMonth}     onChange={(v) => setCalc((c) => ({ ...c, newPerMonth: v }))}  min={0} max={100} />
              <CalcInput label="Clients Lost / Month"  value={calc.lostPerMonth}    onChange={(v) => setCalc((c) => ({ ...c, lostPerMonth: v }))} min={0} max={100} />
              <CalcInput label="Setup Fee / Client"    value={calc.setupFee}        onChange={(v) => setCalc((c) => ({ ...c, setupFee: v }))}     min={0} max={100000} prefix="$" />
              <CalcInput label="Month 1 Payment"       value={calc.m1Payment}       onChange={(v) => setCalc((c) => ({ ...c, m1Payment: v }))}    min={0} max={100000} prefix="$" />
              <CalcInput label="Month 2 Payment"       value={calc.m2Payment}       onChange={(v) => setCalc((c) => ({ ...c, m2Payment: v }))}    min={0} max={100000} prefix="$" />
              <CalcInput label="Jaxon Setup Split"     value={calc.jaxonSplit}      onChange={(v) => setCalc((c) => ({ ...c, jaxonSplit: v, nickSplit: 100 - v }))} min={0} max={100} suffix="%" />
              <CalcInput label="Nick Setup Split"      value={calc.nickSplit}       onChange={(v) => setCalc((c) => ({ ...c, nickSplit: v, jaxonSplit: 100 - v }))} min={0} max={100} suffix="%" />
              <CalcInput label="Avg Job Value"         value={calc.avgJobValue}     onChange={(v) => setCalc((c) => ({ ...c, avgJobValue: v }))}  min={0} max={1000000} prefix="$" />
              <CalcInput label="Jobs / Client / Month" value={calc.jobsPerMonth}    onChange={(v) => setCalc((c) => ({ ...c, jobsPerMonth: v }))} min={0} max={100} />
              <CalcInput label="Recurring %"           value={calc.recurringPct}    onChange={(v) => setCalc((c) => ({ ...c, recurringPct: v }))} min={0} max={100} suffix="%" />
              <CalcInput label="Months Projected"      value={calc.monthsProjected} onChange={(v) => setCalc((c) => ({ ...c, monthsProjected: v }))} min={1} max={120} />
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
                <CalcOutput label="Gross Setup Revenue"       value={fmtCurrency(calcOutputs.grossSetupRevenue)}    color={GOLD}    />
                <CalcOutput label="Jaxon Setup Earnings"      value={fmtCurrency(calcOutputs.jaxonSetupEarnings)}   color="#0081f2" />
                <CalcOutput label="Nick Setup Earnings"       value={fmtCurrency(calcOutputs.nickSetupEarnings)}    color="#a78bfa" />
                <CalcOutput label="Nick Recurring Earnings"   value={fmtCurrency(calcOutputs.nickRecurringEarnings)} color="#22c55e" />
                <CalcOutput label="Total Nick Earnings"       value={fmtCurrency(calcOutputs.totalNickEarnings)}    color="#a78bfa" />
                <CalcOutput label="Active Recurring Clients"  value={String(calcOutputs.activeRecurringClients)}    color={GOLD}    />
                <CalcOutput label="Client Revenue Generated"  value={fmtCurrency(calcOutputs.clientRevenueGenerated)} color="var(--t-text)" />
                <CalcOutput label="Total Vault Co Revenue"    value={fmtCurrency(calcOutputs.vaultCoRevenue)}       color={GOLD}    />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── 6. Scenario Modeling ────────────────────────────────────────── */}
      <div id="scenarios">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: GOLD }}>
            12-Month Scenario Modeling
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: GOLD_BORDER }} />
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.10)", border: "1px solid rgba(0,129,242,0.20)" }}>
            SCENARIO
          </span>
        </div>
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
                  <ScenarioRow label="Monthly Setup Revenue"    value={fmtCurrency(s.result.monthlySetupRevenue)}    color={GOLD}    />
                  <ScenarioRow label="Monthly Recurring Rev."   value={fmtCurrency(s.result.monthlyRecurringRevenue)} color={GOLD}    />
                  <ScenarioRow label="Jaxon Monthly Income"     value={fmtCurrency(s.result.monthlyJaxon)}           color="#0081f2" />
                  <ScenarioRow label="Nick Monthly Income"      value={fmtCurrency(s.result.monthlyNick)}            color="#a78bfa" />
                  <ScenarioRow label="Total Monthly Income"     value={fmtCurrency(s.result.monthlyTotalIncome)}     color={s.color} />
                  <ScenarioRow label="Active Recurring Clients" value={String(s.result.finalActiveClients)}          color="var(--t-text)" />
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
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      </div>

      {/* ── 7. GHL Revenue Share Tracker ────────────────────────────────── */}
      <div id="ghl-tracker">
        <SectionCard>
          <SectionHeader
            icon={RefreshCw}
            title="GHL Revenue Share Tracker"
            subtitle="Track client Closed Won revenue from GHL, calculate Vault Co's 5% recurring fee, and prepare branded Stripe invoices after the 60 day setup period."
            badge={
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.20)" }}>
                PHASE 2
              </span>
            }
          />

          <div className="px-5 pt-4 space-y-2">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
              style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <AlertCircle size={13} style={{ color: "#f59e0b" }} />
              <span className="text-[12px]" style={{ color: "#f59e0b" }}>
                GHL pipeline connection required to calculate revenue share.
              </span>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
              style={{ backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.18)" }}>
              <AlertCircle size={13} style={{ color: "rgba(107,122,153,0.7)" }} />
              <span className="text-[12px]" style={{ color: "rgba(107,122,153,0.7)" }}>
                Stripe connection required to create branded Vault Co invoices.
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--t-border-nav)" }}>
                  {["Client", "Recurring Billing", "GHL Connected", "Closed Won Revenue", "Vault Co 5%", "Nick Earnings", "Invoice Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center">
                      <div className="flex items-center justify-center gap-2" style={{ color: "var(--t-dim)" }}>
                        <Loader2 size={13} className="animate-spin" />
                        <span className="text-[12px]">Loading clients…</span>
                      </div>
                    </td>
                  </tr>
                ) : activeClients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center">
                      <p className="text-[12px]" style={{ color: "var(--t-dim)" }}>
                        No active clients yet. Recurring billing activates after the 60 day setup period.
                      </p>
                    </td>
                  </tr>
                ) : (
                  activeClients.map((client) => {
                    const clientSettings = settingsMap[client.id];
                    const isOn = clientSettings?.recurringBillingActive ?? false;
                    const isSaving = savingToggle[client.id] ?? false;
                    // GHL connected: check persisted ghlPipelineId from settings first, then client profile
                    const hasGHL = Boolean(clientSettings?.ghlPipelineId ?? client.ghlLocationId);
                    const isSettingsLoaded = !settingsLoading;
                    return (
                      <tr key={client.id}
                        className="border-b transition-colors hover:bg-white/[0.01]"
                        style={{ borderColor: "var(--t-border-nav)" }}>
                        <td className="px-4 py-3.5">
                          <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{client.name}</div>
                          <div className="text-[10px]" style={{ color: "var(--t-dim)" }}>{client.market}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => void handleToggleRecurring(client.id)}
                            disabled={isSaving || !isSettingsLoaded}
                            className="flex items-center gap-1.5 transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving
                              ? <Loader2 size={16} className="animate-spin" style={{ color: "rgba(107,122,153,0.5)" }} />
                              : isOn
                              ? <ToggleRight size={20} style={{ color: "#22c55e" }} />
                              : <ToggleLeft  size={20} style={{ color: "rgba(107,122,153,0.5)" }} />}
                            <span className="text-[10px] font-medium"
                              style={{ color: isOn ? "#22c55e" : "rgba(107,122,153,0.5)" }}>
                              {isSaving ? "Saving…" : isOn ? "Active" : "Off"}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: hasGHL ? "#22c55e" : "rgba(107,122,153,0.5)" }} />
                            <span className="text-[11px]"
                              style={{ color: hasGHL ? "#22c55e" : "rgba(107,122,153,0.5)" }}>
                              {hasGHL ? "Connected" : "Not Connected"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {!isOn
                            ? <span className="text-[11px]" style={{ color: "rgba(107,122,153,0.5)" }}>Recurring Disabled</span>
                            : !hasGHL
                            ? <span className="text-[11px]" style={{ color: "#f59e0b" }}>Needs GHL Pipeline</span>
                            : <span className="text-[11px]" style={{ color: "var(--t-dim)" }}>— GHL sync Phase 2B</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[11px]" style={{ color: isOn && hasGHL ? GOLD : "rgba(107,122,153,0.5)" }}>—</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[11px]" style={{ color: isOn && hasGHL ? "#a78bfa" : "rgba(107,122,153,0.5)" }}>—</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <InvoiceStatusBadge active={isOn} ghlConnected={hasGHL} />
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            disabled
                            className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg opacity-35 cursor-not-allowed"
                            style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                            Phase 2B
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t mt-1" style={{ borderColor: "var(--t-border-nav)" }}>
            <div className="flex items-start gap-2.5">
              <Info size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--t-dim)" }} />
              <div>
                <p className="text-[11px] font-semibold mb-0.5" style={{ color: "var(--t-muted)" }}>
                  Phase 2 Required for Live GHL + Stripe
                </p>
                <p className="text-[11px] leading-snug" style={{ color: "var(--t-dim)" }}>
                  Phase 2 enables: GHL Closed Won deal sync · Vault Co 5% fee from real revenue · Draft Stripe invoice creation (manual admin approval required before any invoice sends). Auto-send is disabled by default and requires a separate opt-in. No invoices will be created or sent in Phase 1.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Billing Connection Empty State ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl px-6 py-5"
        style={{ backgroundColor: "var(--t-surface)", border: `1px solid ${GOLD_BORDER}`, boxShadow: "var(--t-card-shadow)" }}>
        <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "rgba(201,168,76,0.06)" }} />
        <div className="relative flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
            <DollarSign size={18} style={{ color: GOLD }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold mb-1"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
              Actual Revenue Tracking Requires Connected Billing Data
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-dim)" }}>
              Connect Stripe, Square, or manual invoice records to activate collected revenue, outstanding balances, and payout reporting.
              All figures above are projections and estimates based on the Vault Co offer structure — no actual collected revenue is shown until billing is connected.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {["Stripe — Not Connected", "Square — Not Connected", "Manual Invoice Records — Not Connected"].map((label) => (
                <span key={label} className="text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-not-allowed"
                  style={{ color: "rgba(107,122,153,0.6)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Architecture safety note */}
      <div className="flex items-start gap-3 px-5 py-3.5 rounded-xl"
        style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <ShieldCheck size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--t-dim)" }} />
        <p className="text-[11px] leading-snug" style={{ color: "var(--t-dim)" }}>
          Revenue Dashboard is read-only. No external writes · No Stripe or Square calls · No GHL modifications · No invoice creation in Phase 1.
          Auth unchanged. Veronica AI and Victoria AI untouched. Command Hub untouched.
        </p>
      </div>

    </div>
  );
}
