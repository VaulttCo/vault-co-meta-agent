"use client";

// Partner Earnings — /revenue-dashboard/partner-earnings
// Shows projected setup splits and locked recurring earnings for Jaxon and Nick.
// No Stripe calls. No GHL writes. No invoice creation.
// All recurring figures come from locked client_monthly_revenue_snapshots rows only.

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users, Target, Building2, Lock, DollarSign,
  AlertCircle, Loader2, ArrowRight, CheckCircle2,
} from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  SETUP_FEE, M1_PAYMENT, M2_PAYMENT,
  JAXON_SETUP_PCT, NICK_SETUP_PCT,
  JAXON_PER_SETUP, NICK_PER_SETUP,
  GOLD, GOLD_BG, GOLD_BORDER,
  fmtCurrency, getPhase, PHASE_META,
} from "@/lib/revenue/calculations";
import {
  makeDefaultSettings,
  type ClientRevenueSettings,
  type MonthlyRevenueSnapshot,
} from "@/lib/revenue/types";
import {
  RevenuePageHeader, SectionCard, SectionHeader, EarningsRow,
  ProjectionBadge, PhaseBadge, TableHead, TableEmpty,
  BillingEmptyState, SafetyNote, PageErrorState,
} from "../_components";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toBillingMonthDate(ym: string): string { return `${ym}-01`; }

function formatBillingMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Setup revenue basis per client based on status */
function clientSetupBasis(client: Client): number {
  switch (client.status) {
    case "active":     return SETUP_FEE;                   // full $7k
    case "setup":      return M1_PAYMENT;                  // M1 paid, M2 pending
    case "onboarding": return M1_PAYMENT;                  // M1 pending
    default:           return 0;
  }
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function EarningsCard({
  label, value, color, sub, badge, icon: Icon,
}: {
  label: string; value: string; color: string; sub?: string;
  badge?: "projection" | "locked" | "estimate"; icon?: React.ElementType;
}) {
  return (
    <div className="rounded-xl p-4 space-y-2"
      style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--t-card-shadow)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={12} style={{ color }} />}
          <div className="text-[9px] font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
            {label}
          </div>
        </div>
        {badge === "projection" && <ProjectionBadge />}
        {badge === "locked"     && <PhaseBadge label="LOCKED BASIS" />}
        {badge === "estimate"   && <PhaseBadge label="ESTIMATE" />}
      </div>
      <div className="text-[22px] font-bold leading-none"
        style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color }}>
        {value}
      </div>
      {sub && <div className="text-[9px] leading-snug" style={{ color: "rgba(107,122,153,0.5)" }}>{sub}</div>}
    </div>
  );
}

// ─── Phase badge ──────────────────────────────────────────────────────────────

function ClientPhaseBadge({ status }: { status: string }) {
  const phase = getPhase(status);
  const meta  = PHASE_META[phase];
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}>
      {meta.label}
    </span>
  );
}

// ─── Snapshot status ──────────────────────────────────────────────────────────

function SnapStatusBadge({ status, source }: { status: "draft" | "reviewed" | "locked"; source: "manual" | "ghl" }) {
  const colors = {
    draft:    { color: "rgba(107,122,153,0.7)", bg: "rgba(61,79,110,0.08)",  border: "rgba(61,79,110,0.15)"  },
    reviewed: { color: "#22c55e",               bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.20)"  },
    locked:   { color: "#0081f2",               bg: "rgba(0,129,242,0.08)",  border: "rgba(0,129,242,0.20)"  },
  }[status];
  const srcLabel = source === "ghl" ? "GHL" : "Manual";
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ color: colors.color, backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
      <span className="text-[8px]" style={{ color: "rgba(107,122,153,0.4)" }}>{srcLabel}</span>
    </div>
  );
}

// ─── Next Action ──────────────────────────────────────────────────────────────

function getNextAction(
  settings: ClientRevenueSettings | undefined,
  ghlSnap: MonthlyRevenueSnapshot | undefined,
  manualSnap: MonthlyRevenueSnapshot | undefined
): string {
  if (!settings?.recurringBillingActive) return "Enable Recurring Billing";
  const snap = ghlSnap ?? manualSnap;
  if (!snap) return "Enter Revenue Snapshot";
  if (snap.reviewStatus === "draft")     return "Mark Reviewed";
  if (snap.reviewStatus === "reviewed")  return "Lock Snapshot";
  if (!settings?.stripeCustomerId)       return "Add Stripe Customer ID";
  return "Ready for Future Draft Invoice";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerEarningsPage() {
  const [billingMonth, setBillingMonth] = useState<string>(currentYearMonth);

  const [clients, setClients]             = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError]   = useState<string | null>(null);

  const [settingsMap, setSettingsMap]     = useState<Record<string, ClientRevenueSettings>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [manualSnapshotsMap, setManualSnapshotsMap] = useState<Record<string, MonthlyRevenueSnapshot>>({});
  const [ghlSnapshotsMap, setGhlSnapshotsMap]       = useState<Record<string, MonthlyRevenueSnapshot>>({});
  const [snapshotsLoading, setSnapshotsLoading]     = useState(true);

  // ── Load clients ────────────────────────────────────────────────────────────
  function loadClients() {
    setClientsLoading(true);
    setClientsError(null);
    let cancelled = false;
    (async () => {
      try {
        const data = await getDataProvider().getClients();
        if (!cancelled) setClients(data);
      } catch {
        if (!cancelled) setClientsError("Unable to load client data.");
      } finally {
        if (!cancelled) setClientsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }
  useEffect(() => loadClients(), []);

  // ── Load settings ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10_000);
    setSettingsLoading(true);

    fetch("/api/revenue-settings", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { settings: [] }))
      .then(({ settings }: { settings: ClientRevenueSettings[] }) => {
        if (cancelled) return;
        const map: Record<string, ClientRevenueSettings> = {};
        (settings ?? []).forEach((s) => { map[s.clientId] = s; });
        setSettingsMap(map);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(tid); if (!cancelled) setSettingsLoading(false); });

    return () => { cancelled = true; controller.abort(); clearTimeout(tid); };
  }, []);

  // ── Load snapshots for selected month ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10_000);
    setSnapshotsLoading(true);
    setManualSnapshotsMap({});
    setGhlSnapshotsMap({});

    fetch(`/api/revenue-snapshots?billing_month=${toBillingMonthDate(billingMonth)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { snapshots: [] }))
      .then(({ snapshots }: { snapshots: MonthlyRevenueSnapshot[] }) => {
        if (cancelled) return;
        const manual: Record<string, MonthlyRevenueSnapshot> = {};
        const ghl:    Record<string, MonthlyRevenueSnapshot> = {};
        (snapshots ?? []).forEach((s) => {
          if (s.source === "ghl") ghl[s.clientId] = s;
          else manual[s.clientId] = s;
        });
        setManualSnapshotsMap(manual);
        setGhlSnapshotsMap(ghl);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(tid); if (!cancelled) setSnapshotsLoading(false); });

    return () => { cancelled = true; controller.abort(); clearTimeout(tid); };
  }, [billingMonth]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const activeClients  = useMemo(() => clients.filter((c) => c.status === "active"),   [clients]);
  const billingClients = useMemo(() => clients.filter((c) => c.status !== "archived" && c.status !== "paused"), [clients]);

  // Setup projection from client phases
  const { projectedSetupRevenue, projectedJaxonSetup, projectedNickSetup } = useMemo(() => {
    const rev = billingClients.reduce((s, c) => s + clientSetupBasis(c), 0);
    return { projectedSetupRevenue: rev, projectedJaxonSetup: rev * JAXON_SETUP_PCT, projectedNickSetup: rev * NICK_SETUP_PCT };
  }, [billingClients]);

  // Locked recurring from selected month's locked snapshots
  const allSnaps    = useMemo(() => [...Object.values(manualSnapshotsMap), ...Object.values(ghlSnapshotsMap)], [manualSnapshotsMap, ghlSnapshotsMap]);
  const lockedSnaps = useMemo(() => allSnaps.filter((s) => s.reviewStatus === "locked"), [allSnaps]);

  const lockedVaultFee  = useMemo(() => lockedSnaps.reduce((s, x) => s + x.vaultCoFee, 0),             [lockedSnaps]);
  const lockedNickRecur = useMemo(() => lockedSnaps.reduce((s, x) => s + x.nickRecurringEarnings, 0),  [lockedSnaps]);
  const totalNickEst    = useMemo(() => projectedNickSetup + lockedNickRecur, [projectedNickSetup, lockedNickRecur]);
  const totalJaxonEst   = useMemo(() => projectedJaxonSetup,                  [projectedJaxonSetup]);

  const isLoading = clientsLoading || settingsLoading || snapshotsLoading;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <RevenuePageHeader
        title="Partner Earnings"
        subtitle="Track setup splits, locked recurring billing basis, and estimated Jaxon/Nick earnings."
        badge={<PhaseBadge label="PHASE 2H" />}
      />

      {/* ── Month selector ──────────────────────────────────────────────── */}
      <SectionCard>
        <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
          <Lock size={13} style={{ color: GOLD }} className="flex-shrink-0" />
          <label className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
            Recurring Basis Month
          </label>
          <input
            type="month"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold bg-transparent outline-none"
            style={{ backgroundColor: "rgba(201,168,76,0.04)", border: `1px solid ${GOLD_BORDER}`, color: "var(--t-text)" }}
          />
          <span className="text-[12px] font-semibold" style={{ color: GOLD }}>
            {formatBillingMonthLabel(billingMonth)}
          </span>
          <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.5)" }}>
            Recurring figures use locked snapshots from this month.
          </span>
          {isLoading && (
            <div className="flex items-center gap-1.5 ml-auto" style={{ color: "var(--t-dim)" }}>
              <Loader2 size={12} className="animate-spin" />
              <span className="text-[11px]">Loading…</span>
            </div>
          )}
        </div>
      </SectionCard>

      {clientsError && (
        <SectionCard>
          <PageErrorState message="Unable to load client data." detail={clientsError} onRetry={loadClients} />
        </SectionCard>
      )}

      {/* ── Top Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <EarningsCard
          label="Jaxon Estimated Setup Earnings"
          value={clientsLoading ? "—" : fmtCurrency(projectedJaxonSetup)}
          color="#0081f2" badge="projection" icon={Users}
          sub={`${billingClients.length} billing-phase clients × 57%`}
        />
        <EarningsCard
          label="Nick Estimated Setup Earnings"
          value={clientsLoading ? "—" : fmtCurrency(projectedNickSetup)}
          color="#a78bfa" badge="projection" icon={Target}
          sub={`${billingClients.length} billing-phase clients × 43%`}
        />
        <EarningsCard
          label="Nick Locked Recurring Earnings"
          value={snapshotsLoading ? "—" : fmtCurrency(lockedNickRecur)}
          color="#22c55e" badge="locked" icon={Lock}
          sub={`${lockedSnaps.length} locked snapshot${lockedSnaps.length !== 1 ? "s" : ""} · ${formatBillingMonthLabel(billingMonth)} · not collected`}
        />
        <EarningsCard
          label="Jaxon Recurring Earnings"
          value="$0"
          color="rgba(107,122,153,0.5)" icon={Users}
          sub="Jaxon earns $0 on recurring per business model"
        />
        <EarningsCard
          label="Locked Vault Co 5% Fee"
          value={snapshotsLoading ? "—" : fmtCurrency(lockedVaultFee)}
          color={GOLD} badge="locked" icon={DollarSign}
          sub="Locked billing basis · not collected"
        />
        <EarningsCard
          label="Total Estimated Nick Earnings"
          value={isLoading ? "—" : fmtCurrency(totalNickEst)}
          color="#a78bfa" badge="estimate" icon={Target}
          sub="Setup (projected) + Locked recurring"
        />
      </div>

      {/* ── Partner Panels ───────────────────────────────────────────────── */}
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
              <ProjectionBadge />
            </div>
            <div className="space-y-2.5">
              <EarningsRow label="Setup Split"                    value="57%"                                          color="#0081f2"               />
              <EarningsRow label="Per Full Setup Client"          value={fmtCurrency(JAXON_PER_SETUP)}                 color="#0081f2"               />
              <EarningsRow label="Per Month 1 Payment"           value={fmtCurrency(M1_PAYMENT * JAXON_SETUP_PCT)}    color="#0081f2"               />
              <EarningsRow label="Per Month 2 Payment"           value={fmtCurrency(M2_PAYMENT * JAXON_SETUP_PCT)}    color="#0081f2"               />
              <EarningsRow label="Recurring Share"                value="$0"                                           color="rgba(107,122,153,0.5)" />
              <EarningsRow label="Projected Setup Earnings"       value={clientsLoading ? "—" : fmtCurrency(projectedJaxonSetup)} color="#0081f2"  />
              <EarningsRow label={`Locked Recurring (${formatBillingMonthLabel(billingMonth)})`}
                           value="$0"                                                                                  color="rgba(107,122,153,0.5)" />
            </div>
            <div className="pt-3 border-t" style={{ borderColor: "var(--t-border-nav)" }}>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                  Estimated Total
                </span>
                <span className="text-[20px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#0081f2" }}>
                  {clientsLoading ? "—" : fmtCurrency(totalJaxonEst)}
                </span>
              </div>
              <p className="text-[9px] mt-1" style={{ color: "rgba(107,122,153,0.4)" }}>
                Projected setup only · not collected
              </p>
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
              <EarningsRow label="Setup Split"                    value="43%"                                          color="#a78bfa"               />
              <EarningsRow label="Per Full Setup Client"          value={fmtCurrency(NICK_PER_SETUP)}                  color="#a78bfa"               />
              <EarningsRow label="Per Month 1 Payment"           value={fmtCurrency(M1_PAYMENT * NICK_SETUP_PCT)}     color="#a78bfa"               />
              <EarningsRow label="Per Month 2 Payment"           value={fmtCurrency(M2_PAYMENT * NICK_SETUP_PCT)}     color="#a78bfa"               />
              <EarningsRow label="Recurring Share"                value="100% of Vault Co 5%"                          color="#22c55e"               />
              <EarningsRow label="Projected Setup Earnings"       value={clientsLoading ? "—" : fmtCurrency(projectedNickSetup)} color="#a78bfa"   />
              <EarningsRow label={`Locked Recurring (${formatBillingMonthLabel(billingMonth)})`}
                           value={snapshotsLoading ? "—" : fmtCurrency(lockedNickRecur)}                             color="#22c55e"               />
            </div>
            <div className="pt-3 border-t" style={{ borderColor: "var(--t-border-nav)" }}>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                  Estimated Total
                </span>
                <span className="text-[20px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#a78bfa" }}>
                  {isLoading ? "—" : fmtCurrency(totalNickEst)}
                </span>
              </div>
              <p className="text-[9px] mt-1" style={{ color: "rgba(107,122,153,0.4)" }}>
                Setup (projected) + locked recurring · not collected
              </p>
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
              <EarningsRow label="Gross Setup (Proj.)"             value={clientsLoading ? "—" : fmtCurrency(projectedSetupRevenue)}       color={GOLD} />
              <EarningsRow label={`Locked Vault Co 5% Fee (${formatBillingMonthLabel(billingMonth)})`}
                           value={snapshotsLoading ? "—" : fmtCurrency(lockedVaultFee)}                                                    color={GOLD} />
              <EarningsRow label="Jaxon Setup Payout (Proj.)"      value={clientsLoading ? "—" : fmtCurrency(projectedJaxonSetup)}          color="#0081f2" />
              <EarningsRow label="Nick Setup Payout (Proj.)"        value={clientsLoading ? "—" : fmtCurrency(projectedNickSetup)}           color="#a78bfa" />
              <EarningsRow label="Nick Recurring Payout (Locked)"   value={snapshotsLoading ? "—" : fmtCurrency(lockedNickRecur)}            color="#22c55e" />
              <EarningsRow label="Setup Split"                      value="57% Jaxon · 43% Nick"                                            color="var(--t-dim)" />
            </div>
            <div className="pt-3 border-t" style={{ borderColor: "var(--t-border-nav)" }}>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                  Locked Fee + Setup Basis
                </span>
                <span className="text-[20px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: GOLD }}>
                  {isLoading ? "—" : fmtCurrency(projectedSetupRevenue + lockedVaultFee)}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Earnings By Month Panel ──────────────────────────────────────── */}
      <SectionCard>
        <SectionHeader
          icon={Lock}
          title={`Earnings Basis — ${formatBillingMonthLabel(billingMonth)}`}
          subtitle="Locked billing basis only. Setup figures are projections."
          badge={<PhaseBadge label="LOCKED BASIS" />}
        />
        <div className="p-5">
          {lockedSnaps.length === 0 ? (
            <div className="rounded-lg px-4 py-3"
              style={{ backgroundColor: "rgba(61,79,110,0.05)", border: "1px solid rgba(61,79,110,0.10)" }}>
              <p className="text-[12px]" style={{ color: "rgba(107,122,153,0.6)" }}>
                No locked snapshots for {formatBillingMonthLabel(billingMonth)}.
                Review and lock revenue snapshots in the GHL Revenue Tracker.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Locked Client Closed Won Revenue", value: fmtCurrency(lockedSnaps.reduce((s, x) => s + x.closedWonRevenue, 0)), color: "var(--t-text)" },
                { label: "Locked Vault Co 5% Fee",           value: fmtCurrency(lockedVaultFee),                                          color: GOLD           },
                { label: "Nick Recurring Earnings",          value: fmtCurrency(lockedNickRecur),                                         color: "#a78bfa"       },
                { label: "Jaxon Recurring Earnings",         value: "$0",                                                                  color: "rgba(107,122,153,0.5)" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg p-3"
                  style={{ backgroundColor: "rgba(0,129,242,0.03)", border: "1px solid rgba(61,79,110,0.12)" }}>
                  <div className="text-[16px] font-bold"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: item.color }}>
                    {item.value}
                  </div>
                  <div className="text-[9px] mt-0.5 leading-snug" style={{ color: "var(--t-dim)" }}>{item.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Partner Earnings Table ───────────────────────────────────────── */}
      <SectionCard>
        <SectionHeader
          icon={Users}
          title="Partner Earnings by Client"
          subtitle={`Setup projections + locked recurring basis for ${formatBillingMonthLabel(billingMonth)}`}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <TableHead cols={[
              "Client", "Setup Phase", "Setup Revenue Basis",
              "Jaxon Setup Share", "Nick Setup Share",
              "Locked Client Closed Won", "Vault Co 5% Fee",
              "Nick Recurring", "Jaxon Recurring",
              "Snapshot Status", "Next Action",
            ]} />
            <tbody>
              {clientsLoading || snapshotsLoading ? (
                <TableEmpty colSpan={11} message="" loading />
              ) : clientsError ? (
                <tr><td colSpan={11}><PageErrorState message="Unable to load clients." onRetry={loadClients} /></td></tr>
              ) : clients.filter((c) => c.status !== "archived").length === 0 ? (
                <TableEmpty colSpan={11} message="No clients found." />
              ) : (
                clients.filter((c) => c.status !== "archived").map((client) => {
                  const settings     = settingsMap[client.id] ?? makeDefaultSettings(client.id);
                  const ghlSnap      = ghlSnapshotsMap[client.id];
                  const manualSnap   = manualSnapshotsMap[client.id];
                  const primarySnap  = ghlSnap ?? manualSnap;
                  const setupBasis   = clientSetupBasis(client);
                  const jaxonShare   = setupBasis * JAXON_SETUP_PCT;
                  const nickShare    = setupBasis * NICK_SETUP_PCT;
                  const lockedSnap   = primarySnap?.reviewStatus === "locked" ? primarySnap : undefined;
                  const nextAction   = getNextAction(settings, ghlSnap, manualSnap);

                  return (
                    <tr key={client.id}
                      className="border-b transition-colors hover:bg-white/[0.01]"
                      style={{ borderColor: "var(--t-border-nav)" }}>

                      <td className="px-4 py-3.5">
                        <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{client.name}</div>
                        <div className="text-[10px]" style={{ color: "var(--t-dim)" }}>{client.market}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <ClientPhaseBadge status={client.status} />
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: setupBasis > 0 ? GOLD : "rgba(107,122,153,0.4)" }}>
                          {setupBasis > 0 ? fmtCurrency(setupBasis) : "—"}
                        </span>
                        {setupBasis > 0 && (
                          <div className="text-[9px] mt-0.5" style={{ color: "rgba(107,122,153,0.4)" }}>Projected · not collected</div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: jaxonShare > 0 ? "#0081f2" : "rgba(107,122,153,0.4)" }}>
                          {jaxonShare > 0 ? fmtCurrency(jaxonShare) : "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: nickShare > 0 ? "#a78bfa" : "rgba(107,122,153,0.4)" }}>
                          {nickShare > 0 ? fmtCurrency(nickShare) : "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {lockedSnap ? (
                          <>
                            <div className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
                              {fmtCurrency(lockedSnap.closedWonRevenue)}
                            </div>
                            <div className="text-[9px] mt-0.5" style={{ color: "rgba(107,122,153,0.45)" }}>
                              Locked · not collected
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>
                            {primarySnap ? "Not locked" : "No snapshot"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: lockedSnap ? GOLD : "rgba(107,122,153,0.4)" }}>
                          {lockedSnap ? fmtCurrency(lockedSnap.vaultCoFee) : "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: lockedSnap ? "#a78bfa" : "rgba(107,122,153,0.4)" }}>
                          {lockedSnap ? fmtCurrency(lockedSnap.nickRecurringEarnings) : "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-[11px]" style={{ color: "rgba(107,122,153,0.5)" }}>$0</span>
                      </td>

                      <td className="px-4 py-3.5">
                        {primarySnap ? (
                          <SnapStatusBadge status={primarySnap.reviewStatus} source={primarySnap.source} />
                        ) : (
                          <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-[11px] font-semibold mb-1"
                          style={{ color: primarySnap?.reviewStatus === "locked" ? "#22c55e" : "#f59e0b" }}>
                          {nextAction}
                        </div>
                        <Link href="/revenue-dashboard/ghl-tracker"
                          className="inline-flex items-center gap-1 text-[9px] font-bold transition-opacity hover:opacity-80"
                          style={{ color: "rgba(107,122,153,0.6)" }}>
                          Manage Snapshot <ArrowRight size={8} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <BillingEmptyState />
      <SafetyNote text="Partner earnings are estimated from setup structure and locked revenue snapshots. They are not collected payments unless Stripe payment tracking is connected." />
    </div>
  );
}
