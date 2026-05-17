"use client";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw, AlertCircle, Info } from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import { makeDefaultSettings, type ClientRevenueSettings } from "@/lib/revenue/types";
import {
  GOLD, GOLD_BG, GOLD_BORDER,
} from "@/lib/revenue/calculations";
import {
  RevenuePageHeader, SectionCard, SectionHeader, TableEmpty,
  InvoiceStatusBadge, RecurringToggle, PhaseBadge, BillingEmptyState, SafetyNote,
} from "../_components";

export default function GhlTrackerPage() {
  const [clients, setClients]           = useState<Client[]>([]);
  const [loading, setLoading]           = useState(true);
  const [settingsMap, setSettingsMap]   = useState<Record<string, ClientRevenueSettings>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingToggle, setSavingToggle] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getDataProvider().getClients()
      .then(setClients).catch(() => {}).finally(() => setLoading(false));
  }, []);

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

  const activeClients = useMemo(() => clients.filter((c) => c.status === "active"), [clients]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <RevenuePageHeader
        title="GHL Revenue Share Tracker"
        subtitle="Track client Closed Won revenue from GHL, calculate Vault Co's 5% recurring fee, and prepare branded Stripe invoices after the 60 day setup period."
        badge={<PhaseBadge label="PHASE 2" />}
      />

      <SectionCard>
        <SectionHeader
          icon={RefreshCw}
          title="GHL Revenue Share Tracker"
          subtitle="Recurring billing toggles · GHL sync and Stripe invoice creation require Phase 2 connections"
          badge={<PhaseBadge label="PHASE 2" />}
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
                <TableEmpty colSpan={8} message="" loading />
              ) : activeClients.length === 0 ? (
                <TableEmpty colSpan={8} message="No active clients yet. Recurring billing activates after the 60 day setup period." />
              ) : (
                activeClients.map((client) => {
                  const clientSettings  = settingsMap[client.id];
                  const isOn            = clientSettings?.recurringBillingActive ?? false;
                  const isSaving        = savingToggle[client.id] ?? false;
                  const hasGHL          = Boolean(clientSettings?.ghlPipelineId ?? client.ghlLocationId);
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
                        <RecurringToggle
                          clientId={client.id}
                          isOn={isOn}
                          isSaving={isSaving}
                          disabled={!isSettingsLoaded}
                          onToggle={(id) => void handleToggleRecurring(id)}
                        />
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

      <BillingEmptyState />
      <SafetyNote />
    </div>
  );
}
