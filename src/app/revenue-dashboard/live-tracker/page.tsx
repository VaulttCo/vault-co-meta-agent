"use client";

// Live Revenue Tracker — /revenue-dashboard/live-tracker
// Operational view of current month client revenue basis.
// Shows Live GHL Closed Won Revenue, snapshot review status, invoice readiness.
//
// Read-only. No GHL writes. No Stripe calls. No invoice creation.
// All data comes from existing Supabase tables via existing API routes.

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Activity, CheckCircle2, AlertCircle, Info,
  Loader2, Lock, FileText, XCircle, RefreshCw,
  Users, DollarSign, TrendingUp, ShieldCheck,
} from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  makeDefaultSettings,
  type ClientRevenueSettings,
  type MonthlyRevenueSnapshot,
} from "@/lib/revenue/types";
import {
  GOLD, GOLD_BG, GOLD_BORDER,
  fmtCurrency,
  getPhase, PHASE_META,
} from "@/lib/revenue/calculations";
import {
  RevenuePageHeader,
  SectionCard,
  SectionHeader,
  TableEmpty,
  PageErrorState,
  SafetyNote,
} from "../_components";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toBillingMonthDate(ym: string): string {
  return `${ym}-01`;
}

function formatBillingMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label, value, color, sub, icon: Icon,
}: {
  label: string; value: string; color?: string; sub?: string; icon?: React.ElementType;
}) {
  return (
    <div className="rounded-xl p-4 space-y-2"
      style={{ backgroundColor: "var(--t-surface-2, rgba(26,29,39,0.8))", border: "1px solid rgba(61,79,110,0.18)" }}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={12} style={{ color: color ?? GOLD }} />}
        <div className="text-[9px] font-bold uppercase tracking-widest"
          style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
          {label}
        </div>
      </div>
      <div className="text-[22px] font-bold leading-none"
        style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: color ?? GOLD }}>
        {value}
      </div>
      {sub && <div className="text-[9px]" style={{ color: "rgba(107,122,153,0.5)" }}>{sub}</div>}
    </div>
  );
}

function ClientPhaseBadge({ status }: { status: string }) {
  const phase = getPhase(status);
  const meta  = PHASE_META[phase];
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}>
      {meta.label}
    </span>
  );
}

function SnapshotStatusBadge({ status }: { status: "draft" | "reviewed" | "locked" }) {
  const cfg = {
    draft:    { label: "Draft",    color: "rgba(107,122,153,0.7)", bg: "rgba(61,79,110,0.08)",  border: "rgba(61,79,110,0.15)"  },
    reviewed: { label: "Reviewed", color: "#22c55e",               bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.20)"  },
    locked:   { label: "Locked",   color: "#0081f2",               bg: "rgba(0,129,242,0.08)",  border: "rgba(0,129,242,0.20)"  },
  }[status] ?? { label: "Draft", color: "rgba(107,122,153,0.7)", bg: "rgba(61,79,110,0.08)", border: "rgba(61,79,110,0.15)" };
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

type InvoiceStatusKind = "no-draft" | "draft-created" | "stripe-required" | "not-eligible";

function InvoiceStatusBadge({ kind }: { kind: InvoiceStatusKind }) {
  const cfg: Record<InvoiceStatusKind, { label: string; color: string; bg: string; border: string }> = {
    "no-draft":        { label: "No Draft",             color: "rgba(107,122,153,0.6)", bg: "rgba(61,79,110,0.06)",   border: "rgba(61,79,110,0.12)"   },
    "draft-created":   { label: "Draft Created",        color: "#a78bfa",               bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.20)" },
    "stripe-required": { label: "Stripe Customer Req.", color: "#f59e0b",               bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)"  },
    "not-eligible":    { label: "Not Eligible",         color: "rgba(107,122,153,0.4)", bg: "rgba(61,79,110,0.04)",  border: "rgba(61,79,110,0.10)"   },
  };
  const c = cfg[kind];
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: c.color, backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function GhlSyncBadge({ hasGhl, lastSynced }: { hasGhl: boolean; lastSynced?: string | null }) {
  if (!hasGhl) {
    return (
      <span className="text-[9px] font-medium" style={{ color: "rgba(107,122,153,0.45)" }}>
        No GHL data
      </span>
    );
  }
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1">
        <CheckCircle2 size={9} style={{ color: "#22c55e" }} />
        <span className="text-[9px] font-semibold" style={{ color: "#22c55e" }}>GHL Synced</span>
      </div>
      {lastSynced && (
        <div className="text-[8px]" style={{ color: "rgba(107,122,153,0.45)" }}>
          {new Date(lastSynced).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      )}
    </div>
  );
}

// Determine invoice status from snapshot + settings
function deriveInvoiceStatus(
  snap: MonthlyRevenueSnapshot | undefined,
  settings: ClientRevenueSettings | undefined,
): InvoiceStatusKind {
  if (!settings?.recurringBillingActive) return "not-eligible";
  if (!snap) return "not-eligible";
  if (snap.reviewStatus !== "locked") return "no-draft";
  if (snap.stripeInvoiceId) return "draft-created";
  if (!settings?.stripeCustomerId) return "stripe-required";
  return "no-draft";
}

// ─── Table column header ──────────────────────────────────────────────────────

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest whitespace-nowrap"
      style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
      {children}
    </th>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiveTrackerPage() {
  const [billingMonth, setBillingMonth] = useState<string>(currentYearMonth);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [clients, setClients]               = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError]     = useState<string | null>(null);

  const [settingsMap, setSettingsMap]         = useState<Record<string, ClientRevenueSettings>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [manualSnapshotsMap, setManualSnapshotsMap] = useState<Record<string, MonthlyRevenueSnapshot>>({});
  const [ghlSnapshotsMap, setGhlSnapshotsMap]       = useState<Record<string, MonthlyRevenueSnapshot>>({});
  const [snapshotsLoading, setSnapshotsLoading]     = useState(true);
  const [snapshotsError, setSnapshotsError]         = useState<string | null>(null);

  // ── Load clients ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setClientsLoading(true);
    setClientsError(null);
    getDataProvider().getClients()
      .then((data) => { if (!cancelled) { setClients(data); setClientsLoading(false); } })
      .catch(() => { if (!cancelled) { setClientsError("Failed to load clients."); setClientsLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  // ── Load revenue settings ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setSettingsLoading(true);
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    fetch("/api/revenue-settings", { signal: ctrl.signal })
      .then(r => r.json())
      .then((data: { settings?: ClientRevenueSettings[] }) => {
        if (!cancelled) {
          const map: Record<string, ClientRevenueSettings> = {};
          (data.settings ?? []).forEach(s => { map[s.clientId] = s; });
          setSettingsMap(map);
          setSettingsLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setSettingsLoading(false); })
      .finally(() => clearTimeout(timer));
    return () => { cancelled = true; ctrl.abort(); };
  }, []);

  // ── Load snapshots for selected billing month ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setSnapshotsLoading(true);
    setSnapshotsError(null);
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const dateStr = toBillingMonthDate(billingMonth);
    fetch(`/api/revenue-snapshots?billing_month=${encodeURIComponent(dateStr)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then((data: { snapshots?: MonthlyRevenueSnapshot[] }) => {
        if (!cancelled) {
          const manual: Record<string, MonthlyRevenueSnapshot> = {};
          const ghl:    Record<string, MonthlyRevenueSnapshot> = {};
          (data.snapshots ?? []).forEach(s => {
            if (s.source === "manual") manual[s.clientId] = s;
            else ghl[s.clientId] = s;
          });
          setManualSnapshotsMap(manual);
          setGhlSnapshotsMap(ghl);
          setSnapshotsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setSnapshotsError("Failed to load snapshots."); setSnapshotsLoading(false); }
      })
      .finally(() => clearTimeout(timer));
    return () => { cancelled = true; ctrl.abort(); };
  }, [billingMonth]);

  // ── Derived values ───────────────────────────────────────────────────────

  const billingClients = useMemo(() =>
    clients.filter(c => ["active", "setup", "onboarding"].includes(c.status)),
  [clients]);

  const recurringActiveClients = useMemo(() =>
    billingClients.filter(c => settingsMap[c.id]?.recurringBillingActive),
  [billingClients, settingsMap]);

  const totalGhlRevenue = useMemo(() =>
    Object.values(ghlSnapshotsMap).reduce((s, x) => s + (x.closedWonRevenue ?? 0), 0),
  [ghlSnapshotsMap]);

  const totalManualRevenue = useMemo(() =>
    Object.values(manualSnapshotsMap).reduce((s, x) => s + (x.closedWonRevenue ?? 0), 0),
  [manualSnapshotsMap]);

  const lockedSnaps = useMemo(() => {
    const result: MonthlyRevenueSnapshot[] = [];
    billingClients.forEach(c => {
      const snap = ghlSnapshotsMap[c.id] ?? manualSnapshotsMap[c.id];
      if (snap?.reviewStatus === "locked") result.push(snap);
    });
    return result;
  }, [billingClients, ghlSnapshotsMap, manualSnapshotsMap]);

  const totalLockedBasis    = useMemo(() => lockedSnaps.reduce((s, x) => s + (x.closedWonRevenue ?? 0), 0), [lockedSnaps]);
  const totalLockedVaultFee = useMemo(() => lockedSnaps.reduce((s, x) => s + (x.vaultCoFee ?? 0), 0), [lockedSnaps]);
  const totalLockedNickEst  = useMemo(() => lockedSnaps.reduce((s, x) => s + (x.nickRecurringEarnings ?? 0), 0), [lockedSnaps]);

  const invoiceReadyCount = useMemo(() =>
    lockedSnaps.filter(s => !!settingsMap[s.clientId]?.stripeCustomerId && !s.stripeInvoiceId).length,
  [lockedSnaps, settingsMap]);

  const isLoading = clientsLoading || settingsLoading || snapshotsLoading;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page header */}
      <RevenuePageHeader
        title="Live Revenue Tracker"
        subtitle={`Operational view — ${formatBillingMonthLabel(billingMonth)} — Live GHL Closed Won Revenue · Not Collected`}
      />

      {/* Month selector */}
      <SectionCard>
        <div className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity size={13} style={{ color: GOLD }} />
            <span className="text-[11px] font-bold uppercase tracking-widest"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
              Billing Month
            </span>
          </div>
          <input
            type="month"
            value={billingMonth}
            onChange={e => setBillingMonth(e.target.value)}
            className="text-[12px] font-semibold rounded-lg px-3 py-1.5 outline-none"
            style={{
              color: GOLD,
              backgroundColor: GOLD_BG,
              border: `1px solid ${GOLD_BORDER}`,
              fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
            }}
          />
          <div className="text-[11px]" style={{ color: "var(--t-dim)" }}>
            Showing Live GHL Closed Won Revenue and snapshot status. All amounts are Not Collected — billing basis only.
          </div>
          {isLoading && (
            <Loader2 size={13} className="animate-spin ml-auto flex-shrink-0" style={{ color: GOLD }} />
          )}
        </div>
      </SectionCard>

      {/* Error states */}
      {clientsError && (
        <PageErrorState message="Failed to load clients." detail={clientsError} />
      )}
      {snapshotsError && (
        <PageErrorState message="Failed to load snapshot data." detail={snapshotsError} />
      )}

      {/* Summary cards — 8 cards */}
      {!clientsError && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Billing Clients"
            value={isLoading ? "—" : String(billingClients.length)}
            icon={Users}
            sub="active / setup / onboarding"
          />
          <SummaryCard
            label="Recurring Active"
            value={isLoading ? "—" : String(recurringActiveClients.length)}
            color="#22c55e"
            icon={CheckCircle2}
            sub="recurring billing enabled"
          />
          <SummaryCard
            label="Live GHL Closed Won"
            value={isLoading ? "—" : fmtCurrency(totalGhlRevenue)}
            color={GOLD}
            icon={TrendingUp}
            sub="GHL synced — not collected"
          />
          <SummaryCard
            label="Manual Entry Revenue"
            value={isLoading ? "—" : fmtCurrency(totalManualRevenue)}
            color="#0081f2"
            icon={FileText}
            sub="manual snapshot entries"
          />
          <SummaryCard
            label="Locked Billing Basis"
            value={isLoading ? "—" : fmtCurrency(totalLockedBasis)}
            color="#a78bfa"
            icon={Lock}
            sub="locked snapshot total"
          />
          <SummaryCard
            label="Vault Co 5% Fee (Est.)"
            value={isLoading ? "—" : fmtCurrency(totalLockedVaultFee)}
            color={GOLD}
            icon={DollarSign}
            sub="estimated — not collected"
          />
          <SummaryCard
            label="Nick Recurring Est."
            value={isLoading ? "—" : fmtCurrency(totalLockedNickEst)}
            color="#22c55e"
            icon={Users}
            sub="estimated — not collected"
          />
          <SummaryCard
            label="Ready for Draft Invoice"
            value={isLoading ? "—" : String(invoiceReadyCount)}
            color="#f59e0b"
            icon={ShieldCheck}
            sub="locked + Stripe Customer ID set"
          />
        </div>
      )}

      {/* Live tracker table */}
      <SectionCard>
        <SectionHeader
          icon={Activity}
          title="Live Client Revenue Tracker"
          subtitle={`${formatBillingMonthLabel(billingMonth)} — Live GHL Closed Won Revenue and snapshot status`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1300px]" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ backgroundColor: "rgba(61,79,110,0.10)" }}>
                <TH>Client</TH>
                <TH>Phase</TH>
                <TH>Recurring Billing</TH>
                <TH>GHL Pipeline</TH>
                <TH>Live GHL Closed Won</TH>
                <TH>Manual Entry</TH>
                <TH>Locked Billing Basis</TH>
                <TH>Vault Co 5% Fee</TH>
                <TH>Nick Est. Recurring</TH>
                <TH>Snapshot Status</TH>
                <TH>GHL Sync</TH>
                <TH>Invoice Status</TH>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" style={{ color: GOLD }} />
                      <span className="text-[11px]" style={{ color: "var(--t-dim)" }}>Loading client data…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && billingClients.length === 0 && (
                <TableEmpty colSpan={12} message="No clients in active billing phases." />
              )}
              {!isLoading && billingClients.map((client, idx) => {
                const settings   = settingsMap[client.id] ?? makeDefaultSettings(client.id);
                const ghlSnap    = ghlSnapshotsMap[client.id];
                const manualSnap = manualSnapshotsMap[client.id];
                const primarySnap = ghlSnap ?? manualSnap;

                const ghlRevenue    = ghlSnap?.closedWonRevenue    ?? 0;
                const manualRevenue = manualSnap?.closedWonRevenue  ?? 0;

                const isLocked    = primarySnap?.reviewStatus === "locked";
                const lockedBasis = isLocked ? (primarySnap!.closedWonRevenue ?? 0) : null;
                const vaultFee    = isLocked ? (primarySnap!.vaultCoFee ?? 0) : null;
                const nickEst     = isLocked ? (primarySnap!.nickRecurringEarnings ?? 0) : null;

                const invoiceStatus = deriveInvoiceStatus(primarySnap, settings);
                const hasGhl        = !!ghlSnap;
                const isEven        = idx % 2 === 0;

                return (
                  <tr key={client.id}
                    style={{ backgroundColor: isEven ? "rgba(26,29,39,0.3)" : "transparent" }}
                    className="hover:bg-[rgba(61,79,110,0.08)] transition-colors">

                    {/* Client */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <div className="text-[11px] font-semibold" style={{ color: "var(--t-text)" }}>
                        {client.name}
                      </div>
                      <div className="text-[9px]" style={{ color: "var(--t-dim)" }}>{client.status}</div>
                    </td>

                    {/* Phase */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <ClientPhaseBadge status={client.status} />
                    </td>

                    {/* Recurring Billing */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      {settings.recurringBillingActive ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}>
                          Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium" style={{ color: "rgba(107,122,153,0.45)" }}>Disabled</span>
                      )}
                    </td>

                    {/* GHL Pipeline */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      {settings.ghlPipelineId ? (
                        <span className="text-[9px] font-mono" style={{ color: "rgba(107,122,153,0.7)" }}>
                          {settings.ghlPipelineId.slice(0, 10)}…
                        </span>
                      ) : (
                        <span className="text-[9px]" style={{ color: "rgba(107,122,153,0.35)" }}>—</span>
                      )}
                    </td>

                    {/* Live GHL Closed Won Revenue */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      {ghlRevenue > 0 ? (
                        <span className="text-[11px] font-bold" style={{ color: GOLD }}>
                          {fmtCurrency(ghlRevenue)}
                        </span>
                      ) : (
                        <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>—</span>
                      )}
                    </td>

                    {/* Manual Entry Revenue */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      {manualRevenue > 0 ? (
                        <span className="text-[11px] font-bold" style={{ color: "#0081f2" }}>
                          {fmtCurrency(manualRevenue)}
                        </span>
                      ) : (
                        <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>—</span>
                      )}
                    </td>

                    {/* Locked Billing Basis */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      {lockedBasis !== null ? (
                        <div className="flex items-center gap-1">
                          <Lock size={9} style={{ color: "#0081f2" }} />
                          <span className="text-[11px] font-bold" style={{ color: "#0081f2" }}>
                            {fmtCurrency(lockedBasis)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px]" style={{ color: "rgba(107,122,153,0.4)" }}>Not Locked</span>
                      )}
                    </td>

                    {/* Vault Co 5% Fee */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      {vaultFee !== null ? (
                        <span className="text-[11px] font-bold" style={{ color: GOLD }}>
                          {fmtCurrency(vaultFee)}
                        </span>
                      ) : (
                        <span className="text-[9px]" style={{ color: "rgba(107,122,153,0.4)" }}>—</span>
                      )}
                    </td>

                    {/* Nick Est. Recurring */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      {nickEst !== null ? (
                        <span className="text-[11px] font-bold" style={{ color: "#22c55e" }}>
                          {fmtCurrency(nickEst)}
                        </span>
                      ) : (
                        <span className="text-[9px]" style={{ color: "rgba(107,122,153,0.4)" }}>—</span>
                      )}
                    </td>

                    {/* Snapshot Status */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      {primarySnap ? (
                        <SnapshotStatusBadge status={primarySnap.reviewStatus} />
                      ) : (
                        <span className="text-[9px]" style={{ color: "rgba(107,122,153,0.4)" }}>No Snapshot</span>
                      )}
                    </td>

                    {/* GHL Sync */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <GhlSyncBadge hasGhl={hasGhl} lastSynced={ghlSnap?.syncedAt ?? null} />
                    </td>

                    {/* Invoice Status */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <InvoiceStatusBadge kind={invoiceStatus} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Non-billing clients (informational) */}
      {!isLoading && !clientsError && clients.filter(c => !["active","setup","onboarding"].includes(c.status)).length > 0 && (
        <SectionCard>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info size={12} style={{ color: "rgba(107,122,153,0.5)" }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(107,122,153,0.5)" }}>
                Not in Billing Phase
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {clients
                .filter(c => !["active","setup","onboarding"].includes(c.status))
                .map(c => (
                  <span key={c.id} className="text-[10px] px-2 py-1 rounded-md"
                    style={{ color: "rgba(107,122,153,0.6)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.12)" }}>
                    {c.name} — {c.status}
                  </span>
                ))}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Quick links */}
      <div className="flex items-center gap-3 px-1">
        <Link
          href="/revenue-dashboard/ghl-tracker"
          className="flex items-center gap-2 text-[11px] font-semibold px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
          style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
          <RefreshCw size={12} />
          GHL Revenue Tracker
        </Link>
        <Link
          href="/revenue-dashboard/monthly-closeout"
          className="flex items-center gap-2 text-[11px] font-semibold px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
          style={{ color: "rgba(107,122,153,0.7)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
          <CheckCircle2 size={12} />
          Monthly Closeout Checklist
        </Link>
      </div>

      {/* Safety note */}
      <SafetyNote text="Live Revenue Tracker shows Live GHL Closed Won Revenue and Locked Billing Basis for the selected billing month. All amounts are Estimated and Not Collected. This page does not create invoices, send invoices, charge clients, or mark revenue as collected." />
    </div>
  );
}
