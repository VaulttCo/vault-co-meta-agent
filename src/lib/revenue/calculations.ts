// Shared revenue calculation constants, types, and pure functions.
// No JSX, no React, no external API calls. Safe to import in any context.

export const SETUP_FEE        = 7000;
export const M1_PAYMENT       = 3500;
export const M2_PAYMENT       = 3500;
export const JAXON_SETUP_PCT  = 0.57;
export const NICK_SETUP_PCT   = 0.43;
export const RECURRING_PCT    = 0.05;
export const JAXON_PER_SETUP  = SETUP_FEE * JAXON_SETUP_PCT; // 3990
export const NICK_PER_SETUP   = SETUP_FEE * NICK_SETUP_PCT;  // 3010
export const EST_JOBS_PER_MONTH = 5;

// ─── Style tokens (shared across revenue pages) ───────────────────────────────
export const GOLD        = "#c9a84c";
export const GOLD_BG     = "rgba(201,168,76,0.08)";
export const GOLD_BORDER = "rgba(201,168,76,0.20)";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function fmtCurrency(n: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(n);
}

export function parseAmount(s: string): number {
  const n = parseFloat((s ?? "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

// ─── Revenue phase ────────────────────────────────────────────────────────────

export type RevenuePhase =
  | "pre_setup"
  | "month_1_due"
  | "month_2_due"
  | "recurring"
  | "paused"
  | "cancelled";

export function getPhase(status: string): RevenuePhase {
  switch (status) {
    case "onboarding": return "month_1_due";
    case "setup":      return "month_2_due";
    case "active":     return "recurring";
    case "paused":     return "paused";
    case "archived":   return "cancelled";
    default:           return "pre_setup";
  }
}

export const PHASE_META: Record<
  RevenuePhase,
  { label: string; color: string; bg: string; border: string }
> = {
  pre_setup:   { label: "Pre-Setup",        color: "rgba(107,122,153,0.8)", bg: "rgba(61,79,110,0.10)",  border: "rgba(61,79,110,0.18)"  },
  month_1_due: { label: "Month 1 — Due",    color: "#f59e0b",               bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.20)" },
  month_2_due: { label: "Month 2 — Due",    color: "#0081f2",               bg: "rgba(0,129,242,0.08)",  border: "rgba(0,129,242,0.20)"  },
  recurring:   { label: "Recurring Active", color: "#22c55e",               bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.20)"  },
  paused:      { label: "Paused",           color: "rgba(107,122,153,0.7)", bg: "rgba(61,79,110,0.08)",  border: "rgba(61,79,110,0.15)"  },
  cancelled:   { label: "Cancelled",        color: "#ef4444",               bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.20)"  },
};

// ─── Scenario computation ─────────────────────────────────────────────────────

export interface ScenarioParams {
  startingActive: number;
  newPerMonth: number;
  lostPerMonth: number;
  setupFee: number;
  avgJobValue: number;
  jobsPerMonth: number;
  recurringPct: number;
  months: number;
}

export interface ScenarioResult {
  monthlySetupRevenue: number;
  monthlyRecurringRevenue: number;
  monthlyJaxon: number;
  monthlyNick: number;
  monthlyTotalIncome: number;
  finalActiveClients: number;
  total12MonthRevenue: number;
  totalJaxon: number;
  totalNick: number;
}

export function computeScenario(p: ScenarioParams): ScenarioResult {
  let active = p.startingActive;
  let totalSetup = 0, totalRecurring = 0, totalJaxon = 0, totalNick = 0;

  for (let m = 0; m < p.months; m++) {
    const setup           = p.newPerMonth * p.setupFee;
    const clientRevenue   = active * p.avgJobValue * p.jobsPerMonth;
    const vaultCoRecurring = clientRevenue * (p.recurringPct / 100);

    totalSetup     += setup;
    totalRecurring += vaultCoRecurring;
    totalJaxon     += setup * JAXON_SETUP_PCT;
    totalNick      += setup * NICK_SETUP_PCT + vaultCoRecurring;

    if (m >= 1) active = Math.max(0, active + p.newPerMonth - p.lostPerMonth);
  }

  const finalClientRevenue  = active * p.avgJobValue * p.jobsPerMonth;
  const finalRecurring      = finalClientRevenue * (p.recurringPct / 100);

  return {
    monthlySetupRevenue:     p.newPerMonth * p.setupFee,
    monthlyRecurringRevenue: finalRecurring,
    monthlyJaxon:            p.newPerMonth * p.setupFee * JAXON_SETUP_PCT,
    monthlyNick:             p.newPerMonth * p.setupFee * NICK_SETUP_PCT + finalRecurring,
    monthlyTotalIncome:      p.newPerMonth * p.setupFee + finalRecurring,
    finalActiveClients:      active,
    total12MonthRevenue:     totalSetup + totalRecurring,
    totalJaxon,
    totalNick,
  };
}

// ─── Preset scenarios ─────────────────────────────────────────────────────────

export const SCENARIO_PRESETS = [
  {
    label: "Low Case",
    color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)",
    desc:  "3 new · 2 lost · $18k avg · 4 jobs",
    params: { newPerMonth: 3, lostPerMonth: 2, setupFee: SETUP_FEE, avgJobValue: 18000, jobsPerMonth: 4, recurringPct: 5, months: 12 },
  },
  {
    label: "Middle Case",
    color: GOLD, bg: GOLD_BG, border: GOLD_BORDER,
    desc:  "4 new · 1 lost · $18k avg · 5 jobs",
    params: { newPerMonth: 4, lostPerMonth: 1, setupFee: SETUP_FEE, avgJobValue: 18000, jobsPerMonth: 5, recurringPct: 5, months: 12 },
  },
  {
    label: "High Case",
    color: "#22c55e", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.15)",
    desc:  "5 new · 1 lost · $22k avg · 6 jobs",
    params: { newPerMonth: 5, lostPerMonth: 1, setupFee: SETUP_FEE, avgJobValue: 22000, jobsPerMonth: 6, recurringPct: 5, months: 12 },
  },
] as const;
