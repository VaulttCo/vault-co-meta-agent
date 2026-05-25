"use client";

// Monthly Revenue Closeout — /revenue-dashboard/monthly-closeout
// Leadership month-end checklist: review snapshots, confirm billing basis,
// identify missing items before future draft invoice creation.
//
// Read-only view. No GHL writes. No Stripe calls. No invoice creation.
// All data comes from existing Supabase tables via existing API routes.

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CalendarCheck, CheckCircle2, AlertCircle, Info,
  Loader2, ArrowRight, XCircle, Clock, Lock,
  Users, DollarSign, FileText,
} from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  makeDefaultSettings,
  type ClientRevenueSettings,
  type MonthlyRevenueSnapshot,
} from "@/lib/revenue/types";
import { GOLD, GOLD_BG, GOLD_BORDER, fmtCurrency } from "@/lib/revenue/calculations";
import {
  RevenuePageHeader,
  SectionCard,
  SectionHeader,
  PhaseBadge,
  TableHead,
  TableEmpty,
  PageErrorState,
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

type ChecklistStatus = "complete" | "attention" | "not-required";

interface ChecklistItemProps {
  label: string;
  note: string;
  status: ChecklistStatus;
  future?: boolean;
}

function ChecklistItem({ label, note, status, future }: ChecklistItemProps) {
  const cfg = {
    complete:     { icon: CheckCircle2, color: "#22c55e", bg: "rgba(34,197,94,0.06)",  border: "rgba(34,197,94,0.15)",  badge: "Complete"           },
    attention:    { icon: AlertCircle,  color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)", badge: "Needs Attention"    },
    "not-required": { icon: Clock,      color: "rgba(107,122,153,0.5)", bg: "rgba(61,79,110,0.05)", border: "rgba(61,79,110,0.12)", badge: "Not Required Yet" },
  }[status];

  const Icon = cfg.icon;

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-lg"
      style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Icon size={14} className="flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>
            {label}
          </span>
          {future && (
            <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ color: "rgba(107,122,153,0.55)", backgroundColor: "rgba(61,79,110,0.12)", border: "1px solid rgba(61,79,110,0.18)" }}>
              Future Phase
            </span>
          )}
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0"
            style={{ color: cfg.color, backgroundColor: "transparent", border: `1px solid ${cfg.border}` }}>
            {cfg.badge}
          </span>
        </div>
        <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--t-dim)" }}>{note}</p>
      </div>
    </div>
  );
}

function ReviewStatusBadge({ status }: { status: "draft" | "reviewed" | "locked" }) {
  const cfg = {
    draft:    { label: "Draft",    color: "rgba(107,122,153,0.7)", bg: "rgba(61,79,110,0.08)",  border: "rgba(61,79,110,0.15)"  },
    reviewed: { label: "Reviewed", color: "#22c55e",               bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.20)"  },
    locked:   { label: "Locked",   color: "#0081f2",               bg: "rgba(0,129,242,0.08)",  border: "rgba(0,129,242,0.20)"  },
  }[status] ?? { label: "Draft", color: "rgba(107,122,153,0.7)", bg: "rgba(61,79,110,0.08)", border: "rgba(61,79,110,0.15)" };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

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

// ─── Next action derivation ───────────────────────────────────────────────────

function getNextAction(
  settings: ClientRevenueSettings | undefined,
  manualSnap: MonthlyRevenueSnapshot | undefined,
  ghlSnap: MonthlyRevenueSnapshot | undefined
): { label: string; color: string } {
  if (!settings?.recurringBillingActive) {
    return { label: "Enable Recurring Billing", color: "rgba(107,122,153,0.7)" };
  }
  const primarySnap = ghlSnap ?? manualSnap;
  if (!primarySnap) {
    return { label: "Enter Revenue Snapshot", color: "#f59e0b" };
  }
  if (primarySnap.reviewStatus === "draft") {
    return { label: "Mark Reviewed", color: "#22c55e" };
  }
  if (primarySnap.reviewStatus === "reviewed") {
    return { label: "Lock Snapshot", color: "#0081f2" };
  }
  // locked
  if (!settings?.stripeCustomerId) {
    return { label: "Add Stripe Customer ID", color: "#a78bfa" };
  }
  return { label: "Ready for Future Draft Invoice", color: GOLD };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonthlyCloseoutPage() {
  const [billingMonth, setBillingMonth] = useState<string>(currentYearMonth);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [clients, setClients]           = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);

  const [settingsMap, setSettingsMap]   = useState<Record<string, ClientRevenueSettings>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [manualSnapshotsMap, setManualSnapshotsMap] = useState<Record<string, MonthlyRevenueSnapshot>>({});
  const [ghlSnapshotsMap, setGhlSnapshotsMap]       = useState<Record<string, MonthlyRevenueSnapshot>>({});
  const [snapshotsLoading, setSnapshotsLoading]     = useState(true);
  const [snapshotsError, setSnapshotsError]         = useState<string | null>(null);

  // ── Load clients ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setClientsLoading(true);
    setClientsError(null);
    (async () => {
      try {
        const data = await getDataProvider().getClients();
        if (!cancelled) setClients(data);
      } catch {
        if (!cancelled) setClientsError("Unable to load clients.");
      } finally {
        if (!cancelled) setClientsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Load revenue settings ────────────────────────────────────────────────
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
    setSnapshotsError(null);
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
      .catch((err: unknown) => {
        if (cancelled) return;
        const isAbort = err instanceof Error && err.name === "AbortError";
        setSnapshotsError(isAbort ? "Snapshots request timed out." : "Unable to load snapshots.");
      })
      .finally(() => { clearTimeout(tid); if (!cancelled) setSnapshotsLoading(false); });

    return () => { cancelled = true; controller.abort(); clearTimeout(tid); };
  }, [billingMonth]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const activeClients = useMemo(
    () => clients.filter((c) => c.status !== "archived"),
    [clients]
  );

  const recurringClients = useMemo(
    () => activeClients.filter((c) => settingsMap[c.id]?.recurringBillingActive),
    [activeClients, settingsMap]
  );

  const allSnaps = useMemo(
    () => [...Object.values(manualSnapshotsMap), ...Object.values(ghlSnapshotsMap)],
    [manualSnapshotsMap, ghlSnapshotsMap]
  );

  const lockedSnaps   = useMemo(() => allSnaps.filter((s) => s.reviewStatus === "locked"),   [allSnaps]);
  const reviewedSnaps = useMemo(() => allSnaps.filter((s) => s.reviewStatus === "reviewed"), [allSnaps]);
  const draftSnaps    = useMemo(() => allSnaps.filter((s) => s.reviewStatus === "draft"),    [allSnaps]);

  const clientsWithSnap = useMemo(() => {
    const ids = new Set<string>();
    Object.keys(manualSnapshotsMap).forEach((id) => ids.add(id));
    Object.keys(ghlSnapshotsMap).forEach((id) => ids.add(id));
    return ids;
  }, [manualSnapshotsMap, ghlSnapshotsMap]);

  const clientsMissingSnap = useMemo(
    () => recurringClients.filter((c) => !clientsWithSnap.has(c.id)),
    [recurringClients, clientsWithSnap]
  );

  const clientsMissingStripe = useMemo(
    () => recurringClients.filter((c) => !settingsMap[c.id]?.stripeCustomerId),
    [recurringClients, settingsMap]
  );

  const summary = useMemo(() => ({
    totalClosedWon:  allSnaps.reduce((s, x) => s + x.closedWonRevenue, 0),
    lockedVaultFee:  lockedSnaps.reduce((s, x) => s + x.vaultCoFee, 0),
    lockedNick:      lockedSnaps.reduce((s, x) => s + x.nickRecurringEarnings, 0),
    draftCount:      draftSnaps.length,
    reviewedCount:   reviewedSnaps.length,
    lockedCount:     lockedSnaps.length,
    missingSnap:     clientsMissingSnap.length,
    missingStripe:   clientsMissingStripe.length,
  }), [allSnaps, lockedSnaps, reviewedSnaps, draftSnaps, clientsMissingSnap, clientsMissingStripe]);

  // ── Checklist ────────────────────────────────────────────────────────────
  const checklist = useMemo((): ChecklistItemProps[] => {
    const hasRecurring = recurringClients.length > 0;

    // 1. Revenue snapshots entered
    const allHaveSnap = hasRecurring && clientsMissingSnap.length === 0;
    const someHaveSnap = clientsWithSnap.size > 0;
    const snapStatus: ChecklistStatus = allHaveSnap ? "complete" : someHaveSnap ? "attention" : hasRecurring ? "attention" : "not-required";

    // 2. Draft snapshots reviewed
    const reviewStatus: ChecklistStatus = allSnaps.length === 0 ? "not-required" : draftSnaps.length === 0 ? "complete" : "attention";

    // 3. Billing basis locked
    const lockStatus: ChecklistStatus =
      lockedSnaps.length > 0 && reviewedSnaps.length === 0 ? "complete" :
      lockedSnaps.length > 0 ? "attention" :
      allSnaps.length > 0 ? "attention" : "not-required";

    // 4. Stripe customer IDs (future invoice readiness)
    const stripeStatus: ChecklistStatus =
      !hasRecurring ? "not-required" :
      clientsMissingStripe.length === 0 ? "complete" :
      clientsMissingStripe.length < recurringClients.length ? "attention" : "attention";

    // 5. Draft invoices — always future phase for now
    const invoiceStatus: ChecklistStatus = "not-required";

    return [
      {
        label: "Revenue snapshots entered",
        note: clientsMissingSnap.length === 0 && hasRecurring
          ? `All ${recurringClients.length} recurring client${recurringClients.length !== 1 ? "s" : ""} have a snapshot for ${formatBillingMonthLabel(billingMonth)}`
          : clientsMissingSnap.length > 0
          ? `${clientsMissingSnap.length} recurring client${clientsMissingSnap.length !== 1 ? "s" : ""} missing a revenue snapshot — use GHL Revenue Tracker to enter`
          : "No recurring billing clients yet",
        status: snapStatus,
      },
      {
        label: "Draft snapshots reviewed",
        note: draftSnaps.length === 0 && allSnaps.length > 0
          ? "All snapshots have been reviewed or locked"
          : draftSnaps.length > 0
          ? `${draftSnaps.length} snapshot${draftSnaps.length !== 1 ? "s" : ""} still in Draft — open the GHL Revenue Tracker to mark reviewed`
          : "No snapshots entered yet",
        status: reviewStatus,
      },
      {
        label: "Billing basis locked",
        note: lockedSnaps.length > 0 && reviewedSnaps.length === 0
          ? `${lockedSnaps.length} snapshot${lockedSnaps.length !== 1 ? "s" : ""} locked — billing basis confirmed`
          : lockedSnaps.length > 0
          ? `${lockedSnaps.length} locked, ${reviewedSnaps.length} still Reviewed — lock remaining to finalize billing basis`
          : reviewedSnaps.length > 0
          ? `${reviewedSnaps.length} snapshot${reviewedSnaps.length !== 1 ? "s" : ""} reviewed — lock to confirm billing basis`
          : "Review snapshots first, then lock to confirm billing basis",
        status: lockStatus,
      },
      {
        label: "Stripe Customer IDs added",
        note: clientsMissingStripe.length === 0 && hasRecurring
          ? `All ${recurringClients.length} recurring client${recurringClients.length !== 1 ? "s" : ""} have a Stripe Customer ID`
          : clientsMissingStripe.length > 0
          ? `${clientsMissingStripe.length} client${clientsMissingStripe.length !== 1 ? "s" : ""} missing Stripe Customer ID — required before draft invoice creation`
          : "No recurring billing clients yet",
        status: stripeStatus,
        future: false,
      },
      {
        label: "Draft invoices created",
        note: lockedSnaps.length > 0
          ? `${lockedSnaps.length} locked snapshot${lockedSnaps.length !== 1 ? "s" : ""} ready — Stripe account required to create draft invoices`
          : "Lock billing basis snapshots first, then create draft invoices in a future phase",
        status: invoiceStatus,
        future: true,
      },
    ];
  }, [recurringClients, clientsMissingSnap, clientsWithSnap, allSnaps, draftSnaps, reviewedSnaps, lockedSnaps, clientsMissingStripe, billingMonth]);

  // ── Missing items list ────────────────────────────────────────────────────
  const missingItems = useMemo(() => {
    const items: Array<{ label: string; color: string; icon: React.ElementType }> = [];

    if (clientsMissingSnap.length > 0) {
      items.push({
        label: `${clientsMissingSnap.length} client${clientsMissingSnap.length !== 1 ? "s" : ""} with recurring billing active but no ${formatBillingMonthLabel(billingMonth)} snapshot: ${clientsMissingSnap.map((c) => c.name).join(", ")}`,
        color: "#f59e0b",
        icon: AlertCircle,
      });
    }
    if (draftSnaps.length > 0) {
      items.push({
        label: `${draftSnaps.length} snapshot${draftSnaps.length !== 1 ? "s" : ""} still in Draft status — review before locking billing basis`,
        color: "#f59e0b",
        icon: AlertCircle,
      });
    }
    if (reviewedSnaps.length > 0) {
      items.push({
        label: `${reviewedSnaps.length} Reviewed snapshot${reviewedSnaps.length !== 1 ? "s" : ""} not yet locked — lock to confirm billing basis`,
        color: "#0081f2",
        icon: Lock,
      });
    }
    if (clientsMissingStripe.length > 0) {
      items.push({
        label: `${clientsMissingStripe.length} client${clientsMissingStripe.length !== 1 ? "s" : ""} with locked or reviewed snapshots but no Stripe Customer ID: ${clientsMissingStripe.map((c) => c.name).join(", ")}`,
        color: "#a78bfa",
        icon: AlertCircle,
      });
    }

    return items;
  }, [clientsMissingSnap, draftSnaps, reviewedSnaps, clientsMissingStripe, billingMonth]);

  const isLoading = clientsLoading || settingsLoading || snapshotsLoading;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <RevenuePageHeader
        title="Monthly Revenue Closeout"
        subtitle="Review revenue snapshots, lock billing basis amounts, and prepare client revenue share for future draft invoicing."
        badge={<PhaseBadge label="PHASE 2G" />}
      />

      {/* ── Billing Month Selector ───────────────────────────────────────── */}
      <SectionCard>
        <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
          <CalendarCheck size={14} style={{ color: GOLD }} className="flex-shrink-0" />
          <label className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
            Closeout Month
          </label>
          <input
            type="month"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold bg-transparent outline-none"
            style={{
              backgroundColor: "rgba(201,168,76,0.04)",
              border: `1px solid ${GOLD_BORDER}`,
              color: "var(--t-text)",
            }}
          />
          <span className="text-[12px] font-semibold" style={{ color: GOLD }}>
            {formatBillingMonthLabel(billingMonth)}
          </span>
          {isLoading && (
            <div className="flex items-center gap-1.5 ml-auto" style={{ color: "var(--t-dim)" }}>
              <Loader2 size={12} className="animate-spin" />
              <span className="text-[11px]">Loading…</span>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Month Summary Cards ──────────────────────────────────────────── */}
      <SectionCard>
        <SectionHeader
          icon={DollarSign}
          title="Month Summary"
          subtitle="Snapshot-based estimates only — not confirmed revenue, not invoiced amounts."
          badge={<PhaseBadge label="ESTIMATES" />}
        />
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Client Closed Won Revenue"
            value={fmtCurrency(summary.totalClosedWon)}
            color="var(--t-text)"
            sub="All snapshots · not collected"
            icon={DollarSign}
          />
          <SummaryCard
            label="Locked Vault Co 5% Fee"
            value={fmtCurrency(summary.lockedVaultFee)}
            color={GOLD}
            sub="Locked snapshots only · billing basis"
            icon={Lock}
          />
          <SummaryCard
            label="Est. Nick Recurring Earnings"
            value={fmtCurrency(summary.lockedNick)}
            color="#a78bfa"
            sub="Locked snapshots only · estimate"
            icon={DollarSign}
          />
          <SummaryCard
            label="Locked Snapshots"
            value={String(summary.lockedCount)}
            color="#0081f2"
            sub={`${summary.reviewedCount} reviewed · ${summary.draftCount} draft`}
            icon={Lock}
          />
        </div>
        <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Snapshots — Draft"
            value={String(summary.draftCount)}
            color={summary.draftCount > 0 ? "#f59e0b" : "rgba(107,122,153,0.5)"}
            sub="Need review before locking"
            icon={FileText}
          />
          <SummaryCard
            label="Snapshots — Reviewed"
            value={String(summary.reviewedCount)}
            color={summary.reviewedCount > 0 ? "#22c55e" : "rgba(107,122,153,0.5)"}
            sub="Ready to lock"
            icon={CheckCircle2}
          />
          <SummaryCard
            label="Missing Revenue Snapshot"
            value={String(summary.missingSnap)}
            color={summary.missingSnap > 0 ? "#f59e0b" : "rgba(107,122,153,0.5)"}
            sub="Recurring clients · this month"
            icon={AlertCircle}
          />
          <SummaryCard
            label="Missing Stripe Customer ID"
            value={String(summary.missingStripe)}
            color={summary.missingStripe > 0 ? "#a78bfa" : "rgba(107,122,153,0.5)"}
            sub="Future invoice requirement"
            icon={Users}
          />
        </div>
      </SectionCard>

      {/* ── Closeout Checklist ───────────────────────────────────────────── */}
      <SectionCard>
        <SectionHeader
          icon={CheckCircle2}
          title="Closeout Checklist"
          subtitle={`Month-end steps for ${formatBillingMonthLabel(billingMonth)}`}
        />
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {checklist.map((item) => (
            <ChecklistItem key={item.label} {...item} />
          ))}
        </div>
      </SectionCard>

      {/* ── Client Closeout Table ────────────────────────────────────────── */}
      <SectionCard>
        <SectionHeader
          icon={Users}
          title="Client Closeout Table"
          subtitle="Per-client revenue snapshot status and next action for this month."
        />

        {snapshotsError && (
          <div className="mx-5 mt-4 flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
            style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
            <AlertCircle size={13} style={{ color: "#ef4444" }} />
            <span className="text-[12px]" style={{ color: "#ef4444" }}>{snapshotsError}</span>
          </div>
        )}

        <div className="overflow-x-auto mt-2">
          <table className="w-full min-w-[1100px]">
            <TableHead cols={[
              "Client", "Recurring", "Snapshot Source",
              "Client Closed Won Revenue", "Vault Co 5% Fee", "Nick Recurring",
              "Review Status", "Billing Basis", "Stripe Customer", "Next Action",
            ]} />
            <tbody>
              {clientsLoading || snapshotsLoading ? (
                <TableEmpty colSpan={10} message="" loading />
              ) : clientsError ? (
                <tr>
                  <td colSpan={10}>
                    <PageErrorState message="Unable to load clients." detail={clientsError} />
                  </td>
                </tr>
              ) : activeClients.length === 0 ? (
                <TableEmpty colSpan={10} message="No clients found." />
              ) : (
                activeClients.map((client) => {
                  const settings    = settingsMap[client.id] ?? makeDefaultSettings(client.id);
                  const isRecurring = settings.recurringBillingActive;
                  const manualSnap  = manualSnapshotsMap[client.id];
                  const ghlSnap     = ghlSnapshotsMap[client.id];
                  const primarySnap = ghlSnap ?? manualSnap;
                  const nextAction  = getNextAction(settings, manualSnap, ghlSnap);

                  // Source label
                  const sourceLabel =
                    ghlSnap && manualSnap ? "GHL + Manual" :
                    ghlSnap               ? "GHL Sync" :
                    manualSnap            ? "Manual Entry" : "—";

                  // Vault Co fee display
                  const displayFee  = primarySnap?.vaultCoFee ?? 0;
                  const displayNick = primarySnap?.nickRecurringEarnings ?? 0;

                  // Billing basis
                  const billingBasis = primarySnap?.reviewStatus === "locked"
                    ? fmtCurrency(primarySnap.vaultCoFee)
                    : "—";

                  // Stripe status
                  const hasStripe = Boolean(settings.stripeCustomerId);

                  return (
                    <tr key={client.id}
                      className="border-b transition-colors hover:bg-white/[0.01]"
                      style={{ borderColor: "var(--t-border-nav)" }}>

                      {/* Client */}
                      <td className="px-4 py-3.5">
                        <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>
                          {client.name}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--t-dim)" }}>{client.market}</div>
                      </td>

                      {/* Recurring */}
                      <td className="px-4 py-3.5">
                        {isRecurring ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}>
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.5)" }}>Off</span>
                        )}
                      </td>

                      {/* Snapshot Source */}
                      <td className="px-4 py-3.5">
                        <span className="text-[11px]"
                          style={{ color: primarySnap ? "var(--t-text)" : "rgba(107,122,153,0.4)" }}>
                          {sourceLabel}
                        </span>
                      </td>

                      {/* Client Closed Won Revenue */}
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: primarySnap && primarySnap.closedWonRevenue > 0 ? "var(--t-text)" : "rgba(107,122,153,0.4)" }}>
                          {primarySnap ? fmtCurrency(primarySnap.closedWonRevenue) : "—"}
                        </span>
                        {primarySnap && (
                          <div className="text-[9px] mt-0.5" style={{ color: "rgba(107,122,153,0.45)" }}>
                            Not collected — snapshot only
                          </div>
                        )}
                      </td>

                      {/* Vault Co 5% Fee */}
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: displayFee > 0 ? GOLD : "rgba(107,122,153,0.4)" }}>
                          {displayFee > 0 ? fmtCurrency(displayFee) : "—"}
                        </span>
                        {displayFee > 0 && (
                          <div className="text-[9px] mt-0.5" style={{ color: "rgba(107,122,153,0.45)" }}>Estimated</div>
                        )}
                      </td>

                      {/* Nick Recurring */}
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: displayNick > 0 ? "#a78bfa" : "rgba(107,122,153,0.4)" }}>
                          {displayNick > 0 ? fmtCurrency(displayNick) : "—"}
                        </span>
                        {displayNick > 0 && (
                          <div className="text-[9px] mt-0.5" style={{ color: "rgba(107,122,153,0.45)" }}>Jaxon: $0</div>
                        )}
                      </td>

                      {/* Review Status */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          {ghlSnap && (
                            <div className="flex items-center gap-1.5">
                              <ReviewStatusBadge status={ghlSnap.reviewStatus} />
                              <span className="text-[8px]" style={{ color: "rgba(34,197,94,0.5)" }}>GHL</span>
                            </div>
                          )}
                          {manualSnap && (
                            <div className="flex items-center gap-1.5">
                              <ReviewStatusBadge status={manualSnap.reviewStatus} />
                              <span className="text-[8px]" style={{ color: "rgba(107,122,153,0.4)" }}>Manual</span>
                            </div>
                          )}
                          {!primarySnap && (
                            <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Billing Basis */}
                      <td className="px-4 py-3.5">
                        {billingBasis !== "—" ? (
                          <div>
                            <div className="text-[12px] font-semibold" style={{ color: "#0081f2" }}>
                              {billingBasis}
                            </div>
                            <div className="text-[9px] mt-0.5" style={{ color: "rgba(0,129,242,0.6)" }}>
                              Locked · Vault Co 5% Fee
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>
                            {primarySnap ? "Not locked" : "No snapshot"}
                          </span>
                        )}
                      </td>

                      {/* Stripe Customer */}
                      <td className="px-4 py-3.5">
                        {hasStripe ? (
                          <div className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#a78bfa" }}>
                            <CheckCircle2 size={10} /> Connected
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(107,122,153,0.5)" }}>
                            <XCircle size={10} /> Required
                          </div>
                        )}
                      </td>

                      {/* Next Action */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold" style={{ color: nextAction.color }}>
                            {nextAction.label}
                          </span>
                        </div>
                        <Link
                          href="/revenue-dashboard/ghl-tracker"
                          className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold transition-opacity hover:opacity-80"
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

      {/* ── Billing Basis Panel ──────────────────────────────────────────── */}
      <SectionCard>
        <SectionHeader
          icon={Lock}
          title="Billing Basis"
          subtitle={`Locked snapshots only · ${formatBillingMonthLabel(billingMonth)} · no invoice created`}
        />
        <div className="p-5">
          {summary.lockedCount === 0 ? (
            <div className="rounded-lg px-4 py-3"
              style={{ backgroundColor: "rgba(61,79,110,0.05)", border: "1px solid rgba(61,79,110,0.10)" }}>
              <p className="text-[12px]" style={{ color: "rgba(107,122,153,0.6)" }}>
                No locked billing basis yet for {formatBillingMonthLabel(billingMonth)}.
                Review and lock snapshots in the GHL Revenue Tracker before creating draft invoices in a future phase.
              </p>
            </div>
          ) : (
            <div className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: "rgba(0,129,242,0.04)", border: "1px solid rgba(0,129,242,0.18)" }}>
              <div className="text-[9px] font-bold uppercase tracking-widest"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#0081f2" }}>
                {summary.lockedCount} Locked Snapshot{summary.lockedCount !== 1 ? "s" : ""} · {formatBillingMonthLabel(billingMonth)}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Locked Client Closed Won Revenue", value: fmtCurrency(lockedSnaps.reduce((s, x) => s + x.closedWonRevenue, 0)), color: "var(--t-text)" },
                  { label: "Locked Vault Co 5% Fee",           value: fmtCurrency(summary.lockedVaultFee),                                   color: GOLD           },
                  { label: "Estimated Nick Recurring Earnings", value: fmtCurrency(summary.lockedNick),                                       color: "#a78bfa"       },
                  { label: "Locked Snapshot Count",             value: String(summary.lockedCount),                                           color: "#0081f2"       },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-[16px] font-bold"
                      style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: item.color }}>
                      {item.value}
                    </div>
                    <div className="text-[9px] mt-0.5 leading-snug" style={{ color: "var(--t-dim)" }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] pt-1" style={{ color: "rgba(107,122,153,0.45)" }}>
                Locked billing basis only. No invoice has been created or sent. No revenue has been collected or marked received.
                These figures are estimates based on Client Closed Won Revenue snapshots.
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Missing Items Panel ──────────────────────────────────────────── */}
      {missingItems.length > 0 && (
        <SectionCard>
          <SectionHeader
            icon={AlertCircle}
            title="Items Needing Attention"
            subtitle="Resolve these before finalizing the month-end closeout."
          />
          <div className="p-5 space-y-2">
            {missingItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-2.5 px-4 py-2.5 rounded-lg"
                  style={{
                    backgroundColor: `rgba(${item.color === "#f59e0b" ? "245,158,11" : item.color === "#a78bfa" ? "167,139,250" : "0,129,242"},0.06)`,
                    border: `1px solid rgba(${item.color === "#f59e0b" ? "245,158,11" : item.color === "#a78bfa" ? "167,139,250" : "0,129,242"},0.15)`,
                  }}>
                  <Icon size={13} className="flex-shrink-0 mt-0.5" style={{ color: item.color }} />
                  <span className="text-[12px]" style={{ color: "var(--t-text)" }}>{item.label}</span>
                </div>
              );
            })}
            <div className="pt-2">
              <Link
                href="/revenue-dashboard/ghl-tracker"
                className="inline-flex items-center gap-2 text-[11px] font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                Open GHL Revenue Tracker <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── Safety Note ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg"
        style={{ backgroundColor: "rgba(61,79,110,0.06)", border: "1px solid rgba(61,79,110,0.14)" }}>
        <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--t-dim)" }} />
        <p className="text-[11px] leading-snug" style={{ color: "var(--t-dim)" }}>
          Monthly closeout confirms estimated billing basis only. It does not create invoices, send invoices, charge clients, or mark revenue as collected.
          All revenue figures are estimates derived from Client Closed Won Revenue snapshots.
          No GHL data is modified. No Stripe API is called.
        </p>
      </div>

    </div>
  );
}
