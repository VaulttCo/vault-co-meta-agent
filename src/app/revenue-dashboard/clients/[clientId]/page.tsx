"use client";

// Client Revenue Detail — /revenue-dashboard/clients/[clientId]
// Client-specific revenue command center for Vault Co leadership.
//
// Read-only. No GHL writes. No Stripe calls. No invoice creation. No POST/PATCH.
// All data: clients + client_revenue_settings + client_monthly_revenue_snapshots.

import { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import {
  Users, Target, Lock, DollarSign, CheckCircle2,
  AlertCircle, Info, Loader2, ArrowLeft, ArrowRight,
  RefreshCw, TrendingUp, Clock, FileText, ShieldCheck,
  CalendarCheck, Activity, Building2, XCircle,
} from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  makeDefaultSettings,
  type ClientRevenueSettings,
  type MonthlyRevenueSnapshot,
} from "@/lib/revenue/types";
import {
  SETUP_FEE, M1_PAYMENT, M2_PAYMENT,
  JAXON_SETUP_PCT, NICK_SETUP_PCT,
  GOLD, GOLD_BG, GOLD_BORDER,
  fmtCurrency, getPhase, PHASE_META,
} from "@/lib/revenue/calculations";
import {
  SectionCard, SectionHeader, EarningsRow,
  PageErrorState, SafetyNote,
} from "../../_components";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentBillingMonthDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function fmtMonth(isoDate: string): string {
  const [y, m] = isoDate.split("-");
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// How many setup dollars are at stake for this client based on their current phase
function setupBasis(client: Client): { total: number; phaseNote: string } {
  switch (client.status) {
    case "active":
      return { total: SETUP_FEE, phaseNote: "Full setup — both payments complete" };
    case "setup":
      return { total: M1_PAYMENT, phaseNote: "Month 1 complete — Month 2 pending" };
    case "onboarding":
      return { total: M1_PAYMENT, phaseNote: "Month 1 pending" };
    default:
      return { total: 0, phaseNote: "Not in billing phase" };
  }
}

// ─── Small reusable components ────────────────────────────────────────────────

function StatCard({
  label, value, color, sub, icon: Icon, badge,
}: {
  label: string; value: string; color?: string; sub?: string;
  icon?: React.ElementType; badge?: string;
}) {
  return (
    <div className="rounded-xl p-4 space-y-2"
      style={{ backgroundColor: "var(--t-surface-2, rgba(26,29,39,0.8))", border: "1px solid rgba(61,79,110,0.18)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={11} style={{ color: color ?? GOLD }} />}
          <div className="text-[9px] font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
            {label}
          </div>
        </div>
        {badge && (
          <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ color: "rgba(107,122,153,0.6)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.14)" }}>
            {badge}
          </span>
        )}
      </div>
      <div className="text-[20px] font-bold leading-none"
        style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: color ?? GOLD }}>
        {value}
      </div>
      {sub && <div className="text-[9px] leading-snug" style={{ color: "rgba(107,122,153,0.5)" }}>{sub}</div>}
    </div>
  );
}

function ReviewStatusBadge({ status }: { status: "draft" | "reviewed" | "locked" }) {
  const cfg = {
    draft:    { label: "Draft",    color: "rgba(107,122,153,0.7)", bg: "rgba(61,79,110,0.08)",  border: "rgba(61,79,110,0.15)"  },
    reviewed: { label: "Reviewed", color: "#22c55e",               bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.20)"  },
    locked:   { label: "Locked",   color: "#0081f2",               bg: "rgba(0,129,242,0.08)",  border: "rgba(0,129,242,0.20)"  },
  }[status];
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function SourceBadge({ source }: { source: "manual" | "ghl" }) {
  return source === "ghl" ? (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)" }}>
      GHL
    </span>
  ) : (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.06)", border: "1px solid rgba(0,129,242,0.18)" }}>
      Manual
    </span>
  );
}

function InvoiceDraftStatus({
  snap, hasStripeCustomer,
}: {
  snap: MonthlyRevenueSnapshot;
  hasStripeCustomer: boolean;
}) {
  if (snap.stripeInvoiceId) {
    return (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
        style={{ color: "#a78bfa", backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.20)" }}>
        Draft Created
      </span>
    );
  }
  if (snap.reviewStatus !== "locked") {
    return <span className="text-[9px]" style={{ color: "rgba(107,122,153,0.4)" }}>—</span>;
  }
  if (!hasStripeCustomer) {
    return (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
        style={{ color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
        Stripe Customer Req.
      </span>
    );
  }
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
      Draft Invoice Ready
    </span>
  );
}

// Table column header
function TH({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2.5 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap ${right ? "text-right" : "text-left"}`}
      style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
      {children}
    </th>
  );
}

// ─── Next Actions derivation ──────────────────────────────────────────────────

type ActionStatus = "done" | "pending" | "info";

interface ActionItem {
  label: string;
  detail: string;
  status: ActionStatus;
  color: string;
}

function deriveActions(
  client: Client | null,
  settings: ClientRevenueSettings | undefined,
  currentMonthSnap: MonthlyRevenueSnapshot | undefined,
): ActionItem[] {
  if (!client || !settings) return [];
  const items: ActionItem[] = [];

  // 1. Recurring billing
  if (!settings.recurringBillingActive) {
    items.push({ label: "Enable Recurring Billing", detail: "Configure in GHL Revenue Tracker → Settings", status: "pending", color: "#f59e0b" });
  } else {
    items.push({ label: "Recurring Billing Active", detail: "Client enrolled in recurring billing", status: "done", color: "#22c55e" });
  }

  // 2. GHL pipeline
  if (!settings.ghlPipelineId || !settings.ghlLocationId) {
    items.push({ label: "Configure GHL Pipeline", detail: "Add GHL pipeline and location IDs in Settings", status: "pending", color: "#f59e0b" });
  } else {
    items.push({ label: "GHL Pipeline Configured", detail: "GHL pipeline and location IDs set", status: "done", color: "#22c55e" });
  }

  // 3. Current month snapshot
  if (!currentMonthSnap) {
    items.push({ label: "Enter Revenue Snapshot", detail: "No snapshot for current billing month — use GHL Revenue Tracker", status: "pending", color: "#f59e0b" });
  } else if (currentMonthSnap.reviewStatus === "draft") {
    items.push({ label: "Mark Snapshot Reviewed", detail: "Current month snapshot is in draft — open GHL Revenue Tracker to review", status: "pending", color: "#f59e0b" });
  } else if (currentMonthSnap.reviewStatus === "reviewed") {
    items.push({ label: "Lock Snapshot", detail: "Snapshot reviewed — lock to confirm billing basis", status: "pending", color: "#0081f2" });
  } else {
    items.push({ label: "Snapshot Locked", detail: "Locked billing basis confirmed for current month", status: "done", color: "#22c55e" });
  }

  // 4. Stripe Customer ID
  if (!settings.stripeCustomerId) {
    items.push({ label: "Add Stripe Customer ID", detail: "Required before a future draft invoice can be created", status: "info", color: "#a78bfa" });
  } else {
    items.push({ label: "Stripe Customer Connected", detail: `ID: ${settings.stripeCustomerId}`, status: "done", color: "#a78bfa" });
  }

  // 5. Invoice readiness
  if (currentMonthSnap?.reviewStatus === "locked") {
    if (currentMonthSnap.stripeInvoiceId) {
      items.push({ label: "Draft Invoice Created", detail: `Status: ${currentMonthSnap.stripeInvoiceStatus ?? "draft"} — manage in GHL Revenue Tracker`, status: "done", color: GOLD });
    } else if (settings.stripeCustomerId) {
      items.push({ label: "Draft Invoice Ready", detail: "Locked + Stripe Customer connected — create in GHL Revenue Tracker", status: "info", color: GOLD });
    } else {
      items.push({ label: "Draft Invoice Blocked", detail: "Add Stripe Customer ID to enable future draft invoice creation", status: "info", color: "rgba(107,122,153,0.6)" });
    }
  }

  return items;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientRevenuePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);

  const [client, setClient]           = useState<Client | null>(null);
  const [clientLoading, setClientLoading] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  const [settings, setSettings]       = useState<ClientRevenueSettings | undefined>(undefined);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [snapshots, setSnapshots]     = useState<MonthlyRevenueSnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [snapshotsError, setSnapshotsError]     = useState<string | null>(null);

  // ── Load client ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setClientLoading(true);
    setClientError(null);
    getDataProvider().getClient(clientId)
      .then((data) => {
        if (!cancelled) { setClient(data); setClientLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setClientError("Unable to load client."); setClientLoading(false); }
      });
    return () => { cancelled = true; };
  }, [clientId]);

  // ── Load settings ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setSettingsLoading(true);
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 10_000);
    fetch("/api/revenue-settings", { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : { settings: [] })
      .then(({ settings: all }: { settings: ClientRevenueSettings[] }) => {
        if (!cancelled) {
          const found = (all ?? []).find(s => s.clientId === clientId);
          setSettings(found ?? makeDefaultSettings(clientId));
          setSettingsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setSettings(makeDefaultSettings(clientId)); setSettingsLoading(false); }
      })
      .finally(() => clearTimeout(tid));
    return () => { cancelled = true; ctrl.abort(); };
  }, [clientId]);

  // ── Load all snapshots for this client ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setSnapshotsLoading(true);
    setSnapshotsError(null);
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 10_000);
    fetch("/api/revenue-snapshots", { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : { snapshots: [] })
      .then(({ snapshots: all }: { snapshots: MonthlyRevenueSnapshot[] }) => {
        if (!cancelled) {
          const mine = (all ?? [])
            .filter(s => s.clientId === clientId)
            .sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
          setSnapshots(mine);
          setSnapshotsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setSnapshotsError("Unable to load snapshot history."); setSnapshotsLoading(false); }
      })
      .finally(() => clearTimeout(tid));
    return () => { cancelled = true; ctrl.abort(); };
  }, [clientId]);

  // ── Derived values ───────────────────────────────────────────────────────

  const currentMonthDate   = currentBillingMonthDate();
  const currentMonthSnap   = useMemo(
    () => snapshots.find(s => s.billingMonth === currentMonthDate),
    [snapshots, currentMonthDate],
  );

  const lockedSnaps        = useMemo(() => snapshots.filter(s => s.reviewStatus === "locked"),   [snapshots]);
  const reviewedSnaps      = useMemo(() => snapshots.filter(s => s.reviewStatus === "reviewed"), [snapshots]);
  const draftSnaps         = useMemo(() => snapshots.filter(s => s.reviewStatus === "draft"),    [snapshots]);

  const totalClosedWon     = useMemo(() => snapshots.reduce((s, x) => s + x.closedWonRevenue,      0), [snapshots]);
  const totalVaultFee      = useMemo(() => snapshots.reduce((s, x) => s + x.vaultCoFee,            0), [snapshots]);
  const totalNickRecur     = useMemo(() => snapshots.reduce((s, x) => s + x.nickRecurringEarnings, 0), [snapshots]);

  const lockedClosedWon    = useMemo(() => lockedSnaps.reduce((s, x) => s + x.closedWonRevenue,      0), [lockedSnaps]);
  const lockedVaultFee     = useMemo(() => lockedSnaps.reduce((s, x) => s + x.vaultCoFee,            0), [lockedSnaps]);
  const lockedNickRecur    = useMemo(() => lockedSnaps.reduce((s, x) => s + x.nickRecurringEarnings, 0), [lockedSnaps]);

  const { total: setupTotal, phaseNote } = useMemo(
    () => client ? setupBasis(client) : { total: 0, phaseNote: "—" },
    [client],
  );

  const jaxonSetupShare    = setupTotal * JAXON_SETUP_PCT;
  const nickSetupShare     = setupTotal * NICK_SETUP_PCT;
  const hasStripeCustomer  = Boolean(settings?.stripeCustomerId);

  const phase      = client ? getPhase(client.status) : "pre_setup";
  const phaseMeta  = PHASE_META[phase];

  const actions    = useMemo(
    () => deriveActions(client, settings, currentMonthSnap),
    [client, settings, currentMonthSnap],
  );

  const isLoading = clientLoading || settingsLoading || snapshotsLoading;

  // ─── Not found ────────────────────────────────────────────────────────────
  if (!clientLoading && !client && clientError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/revenue-dashboard/monthly-closeout"
            className="flex items-center gap-1.5 text-[11px] font-medium hover:opacity-80"
            style={{ color: "rgba(107,122,153,0.7)" }}>
            <ArrowLeft size={11} /> Monthly Closeout
          </Link>
        </div>
        <PageErrorState message={`Client not found: ${clientId}`} detail="Check the client ID and try again." />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Section 1: Client Revenue Header ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl"
        style={{ backgroundColor: "var(--t-surface)", border: `1px solid ${GOLD_BORDER}`, boxShadow: "var(--t-card-shadow)" }}>
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "rgba(201,168,76,0.04)" }} />

        <div className="relative px-6 py-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Link href="/revenue-dashboard"
              className="text-[10px] font-medium hover:opacity-80"
              style={{ color: "rgba(107,122,153,0.6)" }}>
              Revenue Overview
            </Link>
            <span style={{ color: "rgba(107,122,153,0.35)", fontSize: 10 }}>/</span>
            <Link href="/revenue-dashboard/monthly-closeout"
              className="text-[10px] font-medium hover:opacity-80"
              style={{ color: "rgba(107,122,153,0.6)" }}>
              Monthly Closeout
            </Link>
            <span style={{ color: "rgba(107,122,153,0.35)", fontSize: 10 }}>/</span>
            <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.9)" }}>
              {clientLoading ? "Loading…" : (client?.name ?? clientId)}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {/* Client name */}
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                {clientLoading ? (
                  <div className="flex items-center gap-2" style={{ color: "var(--t-dim)" }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[18px]">Loading…</span>
                  </div>
                ) : (
                  <h1 className="text-[22px] font-bold"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}>
                    {client?.name ?? clientId}
                  </h1>
                )}
                {client && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: phaseMeta.color, backgroundColor: phaseMeta.bg, border: `1px solid ${phaseMeta.border}` }}>
                    {phaseMeta.label}
                  </span>
                )}
              </div>
              {client?.market && (
                <div className="text-[12px]" style={{ color: "var(--t-dim)" }}>{client.market}</div>
              )}
            </div>

            {/* Action links */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/revenue-dashboard/monthly-closeout"
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                style={{ color: "rgba(107,122,153,0.7)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
                <CalendarCheck size={11} /> Monthly Closeout
              </Link>
              <Link href="/revenue-dashboard/live-tracker"
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                style={{ color: "rgba(107,122,153,0.7)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
                <Activity size={11} /> Live Tracker
              </Link>
              <Link href="/revenue-dashboard/ghl-tracker"
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                <RefreshCw size={11} /> Manage in GHL Tracker
              </Link>
            </div>
          </div>

          {/* Status badges row */}
          {!clientLoading && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {/* Recurring billing */}
              {settings?.recurringBillingActive ? (
                <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full"
                  style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}>
                  <CheckCircle2 size={9} /> Recurring Billing Active
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full"
                  style={{ color: "rgba(107,122,153,0.6)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
                  <XCircle size={9} /> Recurring Billing Off
                </div>
              )}

              {/* GHL pipeline */}
              {settings?.ghlPipelineId ? (
                <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full"
                  style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}>
                  <CheckCircle2 size={9} /> GHL Connected
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full"
                  style={{ color: "rgba(107,122,153,0.6)", backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.15)" }}>
                  <AlertCircle size={9} /> GHL Not Configured
                </div>
              )}

              {/* Stripe */}
              {hasStripeCustomer ? (
                <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full"
                  style={{ color: "#a78bfa", backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.20)" }}>
                  <CheckCircle2 size={9} /> Stripe Customer Connected
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full"
                  style={{ color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
                  <AlertCircle size={9} /> Stripe Customer Required
                </div>
              )}

              {/* Snapshots count */}
              {!snapshotsLoading && (
                <div className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-full"
                  style={{ color: "rgba(107,122,153,0.6)", backgroundColor: "rgba(61,79,110,0.06)", border: "1px solid rgba(61,79,110,0.12)" }}>
                  <FileText size={9} /> {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Setup Revenue Summary ──────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: GOLD }}>
            Setup Revenue
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: GOLD_BORDER }} />
          <span className="text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ color: "#a78bfa", backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.16)" }}>
            Projected — not collected
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Setup Fee Total"
            value={clientLoading ? "—" : fmtCurrency(SETUP_FEE)}
            color={GOLD}
            icon={DollarSign}
            badge="Projected"
            sub={phaseNote}
          />
          <StatCard
            label="Month 1 Amount"
            value={fmtCurrency(M1_PAYMENT)}
            color={GOLD}
            icon={DollarSign}
            badge="Projected"
            sub="First setup payment"
          />
          <StatCard
            label="Month 2 Amount"
            value={fmtCurrency(M2_PAYMENT)}
            color={GOLD}
            icon={DollarSign}
            badge="Projected"
            sub="Second setup payment"
          />
          <StatCard
            label="Current Phase"
            value={clientLoading ? "—" : phaseMeta.label}
            color={phaseMeta.color}
            icon={TrendingUp}
            sub={phaseNote}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <SectionCard>
            <div className="p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: "rgba(0,129,242,0.08)", border: "1px solid rgba(0,129,242,0.18)" }}>
                  <Users size={11} style={{ color: "#0081f2" }} />
                </div>
                <span className="text-[12px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#0081f2" }}>
                  Jaxon — 57% Setup Split
                </span>
              </div>
              <EarningsRow label="Projected Setup Share" value={clientLoading ? "—" : fmtCurrency(jaxonSetupShare)} color="#0081f2" />
              <EarningsRow label="Per Full Setup"        value={fmtCurrency(SETUP_FEE * JAXON_SETUP_PCT)}           color="#0081f2" />
              <EarningsRow label="Per Month 1 Payment"   value={fmtCurrency(M1_PAYMENT * JAXON_SETUP_PCT)}          color="#0081f2" />
              <EarningsRow label="Per Month 2 Payment"   value={fmtCurrency(M2_PAYMENT * JAXON_SETUP_PCT)}          color="#0081f2" />
              <EarningsRow label="Recurring Share"       value="$0 always"                                          color="rgba(107,122,153,0.5)" />
            </div>
          </SectionCard>
          <SectionCard>
            <div className="p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.18)" }}>
                  <Target size={11} style={{ color: "#a78bfa" }} />
                </div>
                <span className="text-[12px] font-bold"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#a78bfa" }}>
                  Nick — 43% Setup + 100% Recurring
                </span>
              </div>
              <EarningsRow label="Projected Setup Share"   value={clientLoading ? "—" : fmtCurrency(nickSetupShare)} color="#a78bfa" />
              <EarningsRow label="Per Full Setup"          value={fmtCurrency(SETUP_FEE * NICK_SETUP_PCT)}            color="#a78bfa" />
              <EarningsRow label="Per Month 1 Payment"     value={fmtCurrency(M1_PAYMENT * NICK_SETUP_PCT)}           color="#a78bfa" />
              <EarningsRow label="Per Month 2 Payment"     value={fmtCurrency(M2_PAYMENT * NICK_SETUP_PCT)}           color="#a78bfa" />
              <EarningsRow label="Recurring Share"         value="100% of Vault Co 5% Fee"                           color="#22c55e" />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Section 3: Recurring Revenue Summary ──────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: GOLD }}>
            Recurring Revenue — All Months
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: GOLD_BORDER }} />
          <span className="text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ color: "#a78bfa", backgroundColor: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.16)" }}>
            Estimated Billing Basis — not collected
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Client Closed Won Revenue"
            value={snapshotsLoading ? "—" : fmtCurrency(totalClosedWon)}
            color={GOLD}
            icon={TrendingUp}
            sub={`${snapshots.length} snapshot${snapshots.length !== 1 ? "s" : ""} · not collected`}
          />
          <StatCard
            label="Total Vault Co 5% Fee"
            value={snapshotsLoading ? "—" : fmtCurrency(totalVaultFee)}
            color={GOLD}
            icon={DollarSign}
            sub="Estimated billing basis"
          />
          <StatCard
            label="Total Est. Nick Recurring"
            value={snapshotsLoading ? "—" : fmtCurrency(totalNickRecur)}
            color="#22c55e"
            icon={Target}
            sub="100% of Vault Co 5% Fee"
          />
          <StatCard
            label="Jaxon Recurring Earnings"
            value="$0"
            color="rgba(107,122,153,0.5)"
            icon={Users}
            sub="$0 per business model — always"
          />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <StatCard
            label="Draft Snapshots"
            value={snapshotsLoading ? "—" : String(draftSnaps.length)}
            color="rgba(107,122,153,0.6)"
            icon={FileText}
            sub="Awaiting review"
          />
          <StatCard
            label="Reviewed Snapshots"
            value={snapshotsLoading ? "—" : String(reviewedSnaps.length)}
            color="#22c55e"
            icon={CheckCircle2}
            sub="Reviewed — not yet locked"
          />
          <StatCard
            label="Locked Snapshots"
            value={snapshotsLoading ? "—" : String(lockedSnaps.length)}
            color="#0081f2"
            icon={Lock}
            sub="Locked billing basis confirmed"
          />
        </div>
      </div>

      {/* ── Section 4: Locked Billing Basis Panel ─────────────────────────── */}
      <SectionCard>
        <SectionHeader
          icon={Lock}
          title="Locked Billing Basis"
          subtitle="Only locked snapshots count toward billing basis. Draft and reviewed snapshots are excluded."
        />
        <div className="p-5">
          {snapshotsLoading ? (
            <div className="flex items-center gap-2" style={{ color: "var(--t-dim)" }}>
              <Loader2 size={13} className="animate-spin" />
              <span className="text-[12px]">Loading snapshots…</span>
            </div>
          ) : lockedSnaps.length === 0 ? (
            <div className="rounded-lg px-4 py-4"
              style={{ backgroundColor: "rgba(61,79,110,0.05)", border: "1px solid rgba(61,79,110,0.12)" }}>
              <div className="flex items-start gap-2.5">
                <Info size={13} style={{ color: "rgba(107,122,153,0.5)", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
                    No locked billing basis yet.
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-dim)" }}>
                    Review and lock snapshots before creating draft invoices in a future phase.{" "}
                    <Link href="/revenue-dashboard/ghl-tracker"
                      className="font-semibold hover:underline" style={{ color: GOLD }}>
                      Open GHL Revenue Tracker →
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Locked Closed Won Revenue"
                  value={fmtCurrency(lockedClosedWon)}
                  color={GOLD}
                  icon={TrendingUp}
                  sub="Locked basis · not collected"
                />
                <StatCard
                  label="Locked Vault Co 5% Fee"
                  value={fmtCurrency(lockedVaultFee)}
                  color={GOLD}
                  icon={DollarSign}
                  sub="Locked billing basis"
                />
                <StatCard
                  label="Locked Nick Recurring"
                  value={fmtCurrency(lockedNickRecur)}
                  color="#22c55e"
                  icon={Target}
                  sub="Locked billing basis"
                />
                <StatCard
                  label="Locked Months"
                  value={String(lockedSnaps.length)}
                  color="#0081f2"
                  icon={Lock}
                  sub="snapshot months locked"
                />
              </div>

              {/* Invoice readiness */}
              <div className="rounded-lg px-4 py-3"
                style={{
                  backgroundColor: hasStripeCustomer ? "rgba(201,168,76,0.04)" : "rgba(245,158,11,0.04)",
                  border: `1px solid ${hasStripeCustomer ? GOLD_BORDER : "rgba(245,158,11,0.18)"}`,
                }}>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={12} style={{ color: hasStripeCustomer ? GOLD : "#f59e0b" }} />
                  <span className="text-[11px] font-semibold"
                    style={{ color: hasStripeCustomer ? GOLD : "#f59e0b" }}>
                    {hasStripeCustomer
                      ? "Draft Invoice Ready — locked basis + Stripe Customer connected. Create draft in GHL Revenue Tracker."
                      : "Add Stripe Customer ID to enable future draft invoice creation for locked billing basis."}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Section 5: Monthly Snapshot History ───────────────────────────── */}
      <SectionCard>
        <SectionHeader
          icon={CalendarCheck}
          title="Monthly Snapshot History"
          subtitle={`All revenue snapshots for this client · ${snapshots.length} total`}
        />
        {snapshotsError && (
          <div className="px-5 py-3">
            <PageErrorState message="Unable to load snapshot history." detail={snapshotsError} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1200px]"
            style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ backgroundColor: "rgba(61,79,110,0.10)" }}>
                <TH>Billing Month</TH>
                <TH>Source</TH>
                <TH right>Client Closed Won</TH>
                <TH right>Vault Co 5%</TH>
                <TH right>Nick Recurring</TH>
                <TH right>Jaxon Recurring</TH>
                <TH>Review Status</TH>
                <TH right>Deal Count</TH>
                <TH>Synced At</TH>
                <TH>Draft Invoice Status</TH>
                <TH>Next Action</TH>
              </tr>
            </thead>
            <tbody>
              {snapshotsLoading && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={13} className="animate-spin" style={{ color: GOLD }} />
                      <span className="text-[11px]" style={{ color: "var(--t-dim)" }}>Loading snapshot history…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!snapshotsLoading && snapshots.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center">
                    <p className="text-[12px]" style={{ color: "var(--t-dim)" }}>
                      No revenue snapshots found for this client.{" "}
                      <Link href="/revenue-dashboard/ghl-tracker"
                        className="font-semibold hover:underline" style={{ color: GOLD }}>
                        Create one in GHL Revenue Tracker →
                      </Link>
                    </p>
                  </td>
                </tr>
              )}
              {!snapshotsLoading && snapshots.map((snap, idx) => {
                const isEven = idx % 2 === 0;
                const isCurrentMonth = snap.billingMonth === currentMonthDate;

                // Derive per-row next action (read-only label)
                let rowNextAction: { label: string; color: string };
                if (snap.reviewStatus === "draft")          rowNextAction = { label: "Mark Reviewed", color: "#f59e0b" };
                else if (snap.reviewStatus === "reviewed")  rowNextAction = { label: "Lock Snapshot", color: "#0081f2" };
                else if (!hasStripeCustomer)                rowNextAction = { label: "Add Stripe Customer ID", color: "#a78bfa" };
                else if (!snap.stripeInvoiceId)             rowNextAction = { label: "Draft Invoice Ready", color: GOLD };
                else                                        rowNextAction = { label: "Draft Created ✓", color: "#22c55e" };

                return (
                  <tr key={snap.id}
                    style={{ backgroundColor: isCurrentMonth ? "rgba(201,168,76,0.04)" : isEven ? "rgba(26,29,39,0.3)" : "transparent" }}
                    className="hover:bg-[rgba(61,79,110,0.06)] transition-colors">

                    {/* Billing Month */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <div className="text-[11px] font-semibold" style={{ color: "var(--t-text)" }}>
                        {fmtMonth(snap.billingMonth)}
                      </div>
                      {isCurrentMonth && (
                        <div className="text-[8px] font-bold uppercase tracking-wide mt-0.5" style={{ color: GOLD }}>
                          Current Month
                        </div>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <SourceBadge source={snap.source} />
                    </td>

                    {/* Client Closed Won Revenue */}
                    <td className="px-3 py-2.5 text-right" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <span className="text-[12px] font-bold" style={{ color: snap.closedWonRevenue > 0 ? GOLD : "rgba(107,122,153,0.4)" }}>
                        {snap.closedWonRevenue > 0 ? fmtCurrency(snap.closedWonRevenue) : "—"}
                      </span>
                    </td>

                    {/* Vault Co 5% Fee */}
                    <td className="px-3 py-2.5 text-right" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <span className="text-[11px] font-semibold" style={{ color: snap.vaultCoFee > 0 ? GOLD : "rgba(107,122,153,0.4)" }}>
                        {snap.vaultCoFee > 0 ? fmtCurrency(snap.vaultCoFee) : "—"}
                      </span>
                    </td>

                    {/* Nick Recurring */}
                    <td className="px-3 py-2.5 text-right" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <span className="text-[11px] font-semibold" style={{ color: snap.nickRecurringEarnings > 0 ? "#22c55e" : "rgba(107,122,153,0.4)" }}>
                        {snap.nickRecurringEarnings > 0 ? fmtCurrency(snap.nickRecurringEarnings) : "—"}
                      </span>
                    </td>

                    {/* Jaxon Recurring */}
                    <td className="px-3 py-2.5 text-right" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>$0</span>
                    </td>

                    {/* Review Status */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <ReviewStatusBadge status={snap.reviewStatus} />
                    </td>

                    {/* Deal Count */}
                    <td className="px-3 py-2.5 text-right" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <span className="text-[11px]" style={{ color: snap.dealCount > 0 ? "var(--t-text)" : "rgba(107,122,153,0.4)" }}>
                        {snap.dealCount > 0 ? snap.dealCount : "—"}
                      </span>
                    </td>

                    {/* Synced At */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.55)" }}>
                        {fmtDate(snap.syncedAt)}
                      </span>
                    </td>

                    {/* Draft Invoice Status */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <InvoiceDraftStatus snap={snap} hasStripeCustomer={hasStripeCustomer} />
                    </td>

                    {/* Next Action (read-only) */}
                    <td className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(61,79,110,0.10)" }}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold" style={{ color: rowNextAction.color }}>
                          {rowNextAction.label}
                        </span>
                        <Link href="/revenue-dashboard/ghl-tracker"
                          className="text-[8px] hover:opacity-70 transition-opacity flex-shrink-0"
                          style={{ color: "rgba(107,122,153,0.5)" }}>
                          <ArrowRight size={8} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── Section 6: Next Actions Panel ─────────────────────────────────── */}
      <SectionCard>
        <SectionHeader
          icon={ShieldCheck}
          title="Next Actions"
          subtitle="Auto-derived from current client settings and snapshot state — all actions performed in GHL Revenue Tracker"
        />
        <div className="p-5">
          {isLoading ? (
            <div className="flex items-center gap-2" style={{ color: "var(--t-dim)" }}>
              <Loader2 size={13} className="animate-spin" />
              <span className="text-[12px]">Deriving actions…</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {actions.map((action, i) => {
                const Icon = action.status === "done"
                  ? CheckCircle2
                  : action.status === "pending"
                  ? AlertCircle
                  : Info;
                return (
                  <div key={i}
                    className="flex items-start gap-3 px-4 py-3 rounded-lg"
                    style={{
                      backgroundColor: action.status === "done"
                        ? "rgba(34,197,94,0.03)"
                        : action.status === "pending"
                        ? "rgba(245,158,11,0.04)"
                        : "rgba(61,79,110,0.06)",
                      border: `1px solid ${
                        action.status === "done"
                          ? "rgba(34,197,94,0.12)"
                          : action.status === "pending"
                          ? "rgba(245,158,11,0.15)"
                          : "rgba(61,79,110,0.12)"
                      }`,
                    }}>
                    <Icon size={13} className="flex-shrink-0 mt-0.5" style={{ color: action.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
                        {action.label}
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--t-dim)" }}>
                        {action.detail}
                      </div>
                    </div>
                    {action.status !== "done" && (
                      <Link href="/revenue-dashboard/ghl-tracker"
                        className="flex items-center gap-1 text-[10px] font-semibold flex-shrink-0 hover:opacity-80 transition-opacity"
                        style={{ color: GOLD }}>
                        Open <ArrowRight size={9} />
                      </Link>
                    )}
                  </div>
                );
              })}
              {actions.length === 0 && (
                <p className="text-[12px]" style={{ color: "var(--t-dim)" }}>No actions to display.</p>
              )}
            </div>
          )}

          {/* Settings summary (read-only) */}
          {!settingsLoading && settings && (
            <div className="mt-5 pt-4 border-t" style={{ borderColor: "rgba(61,79,110,0.12)" }}>
              <div className="text-[9px] font-bold uppercase tracking-widest mb-2"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                Settings Summary
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                {[
                  { label: "GHL Pipeline ID", value: settings.ghlPipelineId || "—" },
                  { label: "GHL Location ID", value: settings.ghlLocationId  || "—" },
                  { label: "Stripe Customer ID", value: settings.stripeCustomerId || "—" },
                  { label: "Recurring Start Date", value: settings.recurringBillingStartDate || "—" },
                  { label: "Notes", value: settings.notes || "—" },
                ].map(item => (
                  <div key={item.label}>
                    <span className="text-[9px]" style={{ color: "rgba(107,122,153,0.5)" }}>{item.label}: </span>
                    <span className="text-[9px] font-mono"
                      style={{ color: item.value === "—" ? "rgba(107,122,153,0.35)" : "var(--t-dim)" }}>
                      {item.value.length > 24 ? item.value.slice(0, 24) + "…" : item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Safety note */}
      <SafetyNote text="All figures are estimated from revenue snapshots and client phase. They are not collected payments. This page does not create invoices, send invoices, charge clients, modify GHL opportunities, or mark revenue as collected." />

    </div>
  );
}
