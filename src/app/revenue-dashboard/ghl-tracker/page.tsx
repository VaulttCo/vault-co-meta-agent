"use client";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw, AlertCircle, Info, Loader2 } from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  makeDefaultSettings,
  type ClientRevenueSettings,
  type MonthlyRevenueSnapshot,
} from "@/lib/revenue/types";
import {
  GOLD, GOLD_BG, GOLD_BORDER, fmtCurrency,
} from "@/lib/revenue/calculations";
import {
  RevenuePageHeader, SectionCard, SectionHeader, TableEmpty,
  InvoiceStatusBadge, RecurringToggle, PhaseBadge, BillingEmptyState, SafetyNote,
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GhlTrackerPage() {
  // ── Clients + settings (existing Phase 2A) ────────────────────────────────
  const [clients, setClients]               = useState<Client[]>([]);
  const [loading, setLoading]               = useState(true);
  const [clientsError, setClientsError]     = useState<string | null>(null);
  const [settingsMap, setSettingsMap]       = useState<Record<string, ClientRevenueSettings>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError]   = useState<string | null>(null);
  const [savingToggle, setSavingToggle]     = useState<Record<string, boolean>>({});

  // ── Phase 2B: monthly revenue snapshots ───────────────────────────────────
  const [billingMonth, setBillingMonth]     = useState<string>(currentYearMonth);
  const [snapshotsMap, setSnapshotsMap]     = useState<Record<string, MonthlyRevenueSnapshot>>({});
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [revenueInputs, setRevenueInputs]   = useState<Record<string, string>>({});
  const [notesInputs, setNotesInputs]       = useState<Record<string, string>>({});
  const [savingSnapshot, setSavingSnapshot] = useState<Record<string, boolean>>({});

  // ── Load clients ──────────────────────────────────────────────────────────
  function loadClients() {
    setLoading(true);
    setClientsError(null);
    let cancelled = false;
    (async () => {
      try {
        const data = await getDataProvider().getClients();
        if (!cancelled) setClients(data);
      } catch {
        if (!cancelled) setClientsError("Unable to load clients. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }

  useEffect(() => loadClients(), []);

  // ── Load revenue settings (with 10s timeout) ─────────────────────────────
  useEffect(() => {
    setSettingsLoading(true);
    setSettingsError(null);
    let cancelled = false;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10_000);

    fetch("/api/revenue-settings", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { settings: [] }))
      .then(({ settings }: { settings: ClientRevenueSettings[] }) => {
        const map: Record<string, ClientRevenueSettings> = {};
        (settings ?? []).forEach((s) => { map[s.clientId] = s; });
        if (!cancelled) setSettingsMap(map);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const isAbort = err instanceof Error && err.name === "AbortError";
          setSettingsError(isAbort ? "Settings request timed out." : "Unable to load billing settings.");
        }
      })
      .finally(() => {
        clearTimeout(tid);
        if (!cancelled) setSettingsLoading(false);
      });

    return () => { cancelled = true; controller.abort(); clearTimeout(tid); };
  }, []);

  // ── Load snapshots when billing month changes (with 10s timeout) ──────────
  useEffect(() => {
    setSnapshotsLoading(true);
    setSnapshotsError(null);
    setSnapshotsMap({});
    setRevenueInputs({});
    setNotesInputs({});

    let cancelled = false;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10_000);

    fetch(`/api/revenue-snapshots?billing_month=${toBillingMonthDate(billingMonth)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { snapshots: [] }))
      .then(({ snapshots }: { snapshots: MonthlyRevenueSnapshot[] }) => {
        const map: Record<string, MonthlyRevenueSnapshot> = {};
        const inputs: Record<string, string> = {};
        const notes: Record<string, string> = {};
        (snapshots ?? []).forEach((s) => {
          map[s.clientId] = s;
          inputs[s.clientId] = s.closedWonRevenue > 0 ? String(s.closedWonRevenue) : "";
          notes[s.clientId]  = s.notes ?? "";
        });
        if (!cancelled) {
          setSnapshotsMap(map);
          setRevenueInputs(inputs);
          setNotesInputs(notes);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const isAbort = err instanceof Error && err.name === "AbortError";
          setSnapshotsError(isAbort ? "Snapshots request timed out." : "Unable to load revenue snapshots.");
        }
      })
      .finally(() => {
        clearTimeout(tid);
        if (!cancelled) setSnapshotsLoading(false);
      });

    return () => { cancelled = true; controller.abort(); clearTimeout(tid); };
  }, [billingMonth]);

  // ── Toggle recurring billing (Phase 2A) ───────────────────────────────────
  async function handleToggleRecurring(clientId: string) {
    const current = settingsMap[clientId]?.recurringBillingActive ?? false;
    const next = !current;

    setSettingsMap((prev) => ({
      ...prev,
      [clientId]: { ...(prev[clientId] ?? makeDefaultSettings(clientId)), recurringBillingActive: next },
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
        if (settings) setSettingsMap((prev) => ({ ...prev, [clientId]: settings }));
      } else {
        setSettingsMap((prev) => ({
          ...prev,
          [clientId]: { ...(prev[clientId] ?? makeDefaultSettings(clientId)), recurringBillingActive: current },
        }));
      }
    } catch {
      setSettingsMap((prev) => ({
        ...prev,
        [clientId]: { ...(prev[clientId] ?? makeDefaultSettings(clientId)), recurringBillingActive: current },
      }));
    } finally {
      setSavingToggle((prev) => ({ ...prev, [clientId]: false }));
    }
  }

  // ── Save revenue snapshot (Phase 2B) ──────────────────────────────────────
  async function handleSaveSnapshot(clientId: string) {
    const closedWonRevenue = parseFloat(revenueInputs[clientId] ?? "") || 0;
    const notes = notesInputs[clientId]?.trim() || null;
    const existingSnapshot = snapshotsMap[clientId];

    setSavingSnapshot((prev) => ({ ...prev, [clientId]: true }));

    try {
      let res: Response;
      if (existingSnapshot) {
        res = await fetch(`/api/revenue-snapshots/${existingSnapshot.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ closedWonRevenue, notes }),
        });
      } else {
        res = await fetch("/api/revenue-snapshots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            billingMonth: toBillingMonthDate(billingMonth),
            closedWonRevenue,
            notes,
            source: "manual",
          }),
        });
      }

      if (res.ok) {
        const { snapshot } = await res.json();
        if (snapshot) setSnapshotsMap((prev) => ({ ...prev, [clientId]: snapshot }));
      }
    } catch {
      // silent fail — no destructive rollback needed (read-only snapshot)
    } finally {
      setSavingSnapshot((prev) => ({ ...prev, [clientId]: false }));
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  // Show all non-archived clients so admins can enable recurring billing
  // for clients at any pipeline stage, not just those with status="active".
  const pipelineClients = useMemo(() => clients.filter((c) => c.status !== "archived"), [clients]);
  const recurringActiveCount = useMemo(
    () => pipelineClients.filter((c) => settingsMap[c.id]?.recurringBillingActive).length,
    [pipelineClients, settingsMap]
  );

  const monthTotals = useMemo(() => {
    const snaps = Object.values(snapshotsMap);
    return {
      closedWonRevenue: snaps.reduce((s, x) => s + x.closedWonRevenue, 0),
      vaultCoFee:       snaps.reduce((s, x) => s + x.vaultCoFee, 0),
      nickEarnings:     snaps.reduce((s, x) => s + x.nickRecurringEarnings, 0),
      reviewed:         snaps.filter((x) => x.reviewStatus !== "draft").length,
      draft:            snaps.filter((x) => x.reviewStatus === "draft").length,
      total:            snaps.length,
    };
  }, [snapshotsMap]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <RevenuePageHeader
        title="GHL Revenue Share Tracker"
        subtitle="Manual revenue snapshots · recurring billing toggles · Phase 2C will add live GHL sync and Stripe draft invoices"
        badge={<PhaseBadge label="PHASE 2B" />}
      />

      <SectionCard>
        <SectionHeader
          icon={RefreshCw}
          title="GHL Revenue Share Tracker"
          subtitle="Enter client Closed Won revenue manually. Vault Co 5% fee and Nick recurring earnings are computed server-side."
          badge={<PhaseBadge label="PHASE 2B" />}
        />

        {/* ── Billing Month Selector ──────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-b flex items-center gap-4 flex-wrap"
          style={{ borderColor: "var(--t-border-nav)" }}>
          <label className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
            Billing Month
          </label>
          <input
            type="month"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold bg-transparent outline-none"
            style={{
              backgroundColor: "rgba(0,129,242,0.04)",
              border: "1px solid rgba(61,79,110,0.25)",
              color: "var(--t-text)",
            }}
          />
          <span className="text-[11px]" style={{ color: "var(--t-dim)" }}>
            {formatBillingMonthLabel(billingMonth)}
          </span>
          {snapshotsLoading && (
            <div className="flex items-center gap-1.5 ml-auto" style={{ color: "var(--t-dim)" }}>
              <Loader2 size={12} className="animate-spin" />
              <span className="text-[11px]">Loading snapshots…</span>
            </div>
          )}
        </div>

        {/* ── Monthly Totals ──────────────────────────────────────────────── */}
        {monthTotals.total > 0 && (
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--t-border-nav)" }}>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-3"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
              {formatBillingMonthLabel(billingMonth)} — Snapshot Totals
              <span className="ml-2 normal-case font-normal" style={{ color: "rgba(107,122,153,0.5)" }}>
                (manual snapshots only — not confirmed revenue)
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: "Client Closed Won Revenue", value: fmtCurrency(monthTotals.closedWonRevenue), color: "var(--t-text)", note: "Client revenue — not Vault Co's" },
                { label: "Vault Co 5% Fee",           value: fmtCurrency(monthTotals.vaultCoFee),       color: GOLD,           note: "Estimated fee — not collected"  },
                { label: "Nick Recurring Earnings",   value: fmtCurrency(monthTotals.nickEarnings),     color: "#a78bfa",      note: "= Vault Co fee (100%)"          },
                { label: "Jaxon Recurring Earnings",  value: fmtCurrency(0),                            color: "rgba(107,122,153,0.5)", note: "$0 per business model" },
                { label: "Snapshots",
                  value: `${monthTotals.reviewed} reviewed · ${monthTotals.draft} draft`,
                  color: monthTotals.reviewed > 0 ? "#22c55e" : "rgba(107,122,153,0.6)",
                  note: "Review status" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg p-3"
                  style={{ backgroundColor: "rgba(0,129,242,0.03)", border: "1px solid rgba(61,79,110,0.12)" }}>
                  <div className="text-[13px] font-bold"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: item.color }}>
                    {item.value}
                  </div>
                  <div className="text-[9px] mt-0.5 font-medium" style={{ color: "var(--t-dim)" }}>{item.label}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: "rgba(107,122,153,0.45)" }}>{item.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Phase 2 Alerts ──────────────────────────────────────────────── */}
        <div className="px-5 pt-4 space-y-2">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
            style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <AlertCircle size={13} style={{ color: "#f59e0b" }} />
            <span className="text-[12px]" style={{ color: "#f59e0b" }}>
              GHL pipeline connection not yet active. Closed Won revenue is entered manually until Phase 2C.
            </span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
            style={{ backgroundColor: "rgba(61,79,110,0.08)", border: "1px solid rgba(61,79,110,0.18)" }}>
            <AlertCircle size={13} style={{ color: "rgba(107,122,153,0.7)" }} />
            <span className="text-[12px]" style={{ color: "rgba(107,122,153,0.7)" }}>
              Stripe not connected. No invoices are created or sent. Revenue snapshots are records only.
            </span>
          </div>
          {settingsError && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
              style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <AlertCircle size={13} style={{ color: "#ef4444" }} />
              <span className="text-[12px]" style={{ color: "#ef4444" }}>{settingsError} Recurring billing toggles are temporarily unavailable.</span>
            </div>
          )}
          {snapshotsError && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
              style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <AlertCircle size={13} style={{ color: "#ef4444" }} />
              <span className="text-[12px]" style={{ color: "#ef4444" }}>{snapshotsError}</span>
            </div>
          )}
          {!loading && !clientsError && pipelineClients.length > 0 && recurringActiveCount === 0 && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
              style={{ backgroundColor: "rgba(107,122,153,0.06)", border: "1px solid rgba(107,122,153,0.15)" }}>
              <AlertCircle size={13} style={{ color: "rgba(107,122,153,0.7)" }} />
              <span className="text-[12px]" style={{ color: "rgba(107,122,153,0.7)" }}>
                No clients have recurring billing active yet. Enable recurring billing for eligible clients using the toggle below.
              </span>
            </div>
          )}
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--t-border-nav)" }}>
                {["Client", "Recurring Billing", "GHL Connected",
                  "Client Closed Won Revenue", "Vault Co 5% Fee",
                  "Nick Recurring", "Source", "Review Status", "Save"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                    style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-dim)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableEmpty colSpan={9} message="" loading />
              ) : clientsError ? (
                <tr><td colSpan={9}><PageErrorState message="Unable to load clients." detail={clientsError} onRetry={loadClients} /></td></tr>
              ) : pipelineClients.length === 0 ? (
                <TableEmpty colSpan={9} message="No clients in the pipeline yet. Add clients to begin tracking." />
              ) : (
                pipelineClients.map((client) => {
                  const clientSettings  = settingsMap[client.id];
                  const isOn            = clientSettings?.recurringBillingActive ?? false;
                  const isSaving        = savingToggle[client.id] ?? false;
                  const isSnapshotSaving = savingSnapshot[client.id] ?? false;
                  const hasGHL          = Boolean(clientSettings?.ghlPipelineId ?? client.ghlLocationId);
                  const isSettingsLoaded = !settingsLoading;
                  const existingSnapshot = snapshotsMap[client.id];

                  // Live-computed values from current input (not yet saved)
                  const rawInput      = parseFloat(revenueInputs[client.id] ?? "") || 0;
                  const liveVaultFee  = Math.round(rawInput * 0.05 * 100) / 100;
                  const liveNick      = liveVaultFee;

                  // Display: live if user is editing, else saved snapshot values
                  const displayFee    = rawInput > 0 || revenueInputs[client.id] !== undefined
                    ? liveVaultFee
                    : (existingSnapshot?.vaultCoFee ?? 0);
                  const displayNick   = rawInput > 0 || revenueInputs[client.id] !== undefined
                    ? liveNick
                    : (existingSnapshot?.nickRecurringEarnings ?? 0);

                  return (
                    <tr key={client.id}
                      className="border-b transition-colors hover:bg-white/[0.01]"
                      style={{ borderColor: "var(--t-border-nav)" }}>

                      {/* Client */}
                      <td className="px-4 py-3.5">
                        <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{client.name}</div>
                        <div className="text-[10px]" style={{ color: "var(--t-dim)" }}>{client.market}</div>
                      </td>

                      {/* Recurring toggle */}
                      <td className="px-4 py-3.5">
                        <RecurringToggle
                          clientId={client.id}
                          isOn={isOn}
                          isSaving={isSaving}
                          disabled={!isSettingsLoaded}
                          onToggle={(id) => void handleToggleRecurring(id)}
                        />
                      </td>

                      {/* GHL status */}
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

                      {/* Client Closed Won Revenue — editable */}
                      <td className="px-4 py-3.5">
                        {!isOn ? (
                          <span className="text-[11px]"
                            style={{ color: "rgba(107,122,153,0.4)" }}>
                            Enable recurring billing above
                          </span>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[12px] flex-shrink-0" style={{ color: "var(--t-dim)" }}>$</span>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={revenueInputs[client.id] ?? ""}
                                onChange={(e) => setRevenueInputs((prev) => ({ ...prev, [client.id]: e.target.value }))}
                                placeholder="0.00"
                                className="w-28 px-2 py-1 rounded-md text-[12px] font-semibold bg-transparent outline-none"
                                style={{
                                  backgroundColor: "rgba(0,129,242,0.04)",
                                  border: "1px solid rgba(61,79,110,0.25)",
                                  color: "var(--t-text)",
                                  fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                                }}
                              />
                            </div>
                            <div className="text-[9px] font-medium px-0.5"
                              style={{ color: "rgba(107,122,153,0.5)" }}>
                              Manual Entry — client's own revenue
                            </div>
                            <input
                              type="text"
                              value={notesInputs[client.id] ?? ""}
                              onChange={(e) => setNotesInputs((prev) => ({ ...prev, [client.id]: e.target.value }))}
                              placeholder="Notes (optional)"
                              className="w-full px-2 py-0.5 rounded text-[10px] bg-transparent outline-none"
                              style={{
                                backgroundColor: "rgba(0,129,242,0.02)",
                                border: "1px solid rgba(61,79,110,0.12)",
                                color: "var(--t-dim)",
                              }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Vault Co 5% Fee (computed) */}
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: isOn && displayFee > 0 ? GOLD : "rgba(107,122,153,0.4)" }}>
                          {isOn && displayFee > 0 ? fmtCurrency(displayFee) : "—"}
                        </span>
                        {isOn && displayFee > 0 && (
                          <div className="text-[9px] mt-0.5" style={{ color: "rgba(107,122,153,0.45)" }}>
                            Estimated — not collected
                          </div>
                        )}
                      </td>

                      {/* Nick Recurring (= Vault Co fee) */}
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] font-semibold"
                          style={{ color: isOn && displayNick > 0 ? "#a78bfa" : "rgba(107,122,153,0.4)" }}>
                          {isOn && displayNick > 0 ? fmtCurrency(displayNick) : "—"}
                        </span>
                        {isOn && displayNick > 0 && (
                          <div className="text-[9px] mt-0.5" style={{ color: "rgba(107,122,153,0.45)" }}>
                            Jaxon: $0
                          </div>
                        )}
                      </td>

                      {/* Source badge */}
                      <td className="px-4 py-3.5">
                        {!isOn ? (
                          <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>—</span>
                        ) : existingSnapshot ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ color: "#0081f2", backgroundColor: "rgba(0,129,242,0.08)", border: "1px solid rgba(0,129,242,0.18)" }}>
                            {existingSnapshot.source === "ghl" ? "GHL Sync" : "Manual Entry"}
                          </span>
                        ) : (
                          <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>
                            No Snapshot
                          </span>
                        )}
                      </td>

                      {/* Review status */}
                      <td className="px-4 py-3.5">
                        {existingSnapshot ? (
                          <ReviewStatusBadge status={existingSnapshot.reviewStatus} />
                        ) : (
                          <span className="text-[10px]" style={{ color: "rgba(107,122,153,0.4)" }}>—</span>
                        )}
                      </td>

                      {/* Save */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => void handleSaveSnapshot(client.id)}
                          disabled={!isOn || isSaving || isSnapshotSaving}
                          className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ color: GOLD, backgroundColor: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}>
                          {isSnapshotSaving && <Loader2 size={10} className="animate-spin" />}
                          {isSnapshotSaving ? "Saving…" : existingSnapshot ? "Update" : "Save Snapshot"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Phase 2 safety note ──────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t mt-1" style={{ borderColor: "var(--t-border-nav)" }}>
          <div className="flex items-start gap-2.5">
            <Info size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--t-dim)" }} />
            <div>
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: "var(--t-muted)" }}>
                Phase 2B — Manual Revenue Snapshots
              </p>
              <p className="text-[11px] leading-snug" style={{ color: "var(--t-dim)" }}>
                Revenue snapshots are records of the client&apos;s Closed Won revenue — they are <strong>not</strong> confirmed collected revenue, not invoices, and not Stripe payments.
                Vault Co 5% fee and partner earnings are estimates computed from these entries.
                Snapshots default to <strong>Draft</strong> status. Phase 2C will add: GHL Closed Won sync (read-only) ·
                Review workflow · Stripe draft invoice creation (manual admin approval required, auto-send off by default).
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <BillingEmptyState />
      <SafetyNote text="Revenue snapshots are manual entries only. No Stripe API is called. No invoices are created or sent. No GHL pipeline is modified. These numbers are estimates — not confirmed collected revenue. Auth unchanged." />
    </div>
  );
}
