"use client";

import { useState, useEffect, useMemo } from "react";
import { Layers, Info } from "lucide-react";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import {
  SETUP_FEE, M1_PAYMENT, M2_PAYMENT,
  JAXON_SETUP_PCT, NICK_SETUP_PCT, JAXON_PER_SETUP, NICK_PER_SETUP,
  GOLD, fmtCurrency, getPhase, PHASE_META,
} from "@/lib/revenue/calculations";
import {
  RevenuePageHeader, SectionCard, SectionHeader, TableHead, TableEmpty,
  PaymentStatusCell, ProjectionBadge, BillingEmptyState, SafetyNote,
} from "../_components";

export default function SetupPipelinePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDataProvider().getClients()
      .then(setClients).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const revenueClients = useMemo(
    () => clients.filter((c) => c.status !== "archived"),
    [clients]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <RevenuePageHeader
        title="Setup Revenue Pipeline"
        subtitle={`$${SETUP_FEE.toLocaleString()} per client · Month 1: $${M1_PAYMENT.toLocaleString()} · Month 2: $${M2_PAYMENT.toLocaleString()}`}
        badge={<ProjectionBadge label="BILLING REQ. FOR ACTUALS" />}
      />

      <SectionCard>
        <SectionHeader
          icon={Layers}
          title="Client Pipeline"
          subtitle="Payment status inferred from pipeline stage — connect Stripe or Square for actual collections"
          badge={<ProjectionBadge label="BILLING REQ. FOR ACTUALS" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <TableHead cols={["Client", "Revenue Phase", "Setup Total", "M1 Status", "M2 Status", "Jaxon Share", "Nick Share", "Remaining"]} />
            <tbody>
              {loading ? (
                <TableEmpty colSpan={8} message="" loading />
              ) : revenueClients.length === 0 ? (
                <TableEmpty colSpan={8} message="No clients in revenue pipeline." />
              ) : (
                revenueClients.map((client) => {
                  const phase = getPhase(client.status);
                  const meta = PHASE_META[phase];
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
                        <PaymentStatusCell paid={m1Done} />
                      </td>
                      <td className="px-4 py-3.5">
                        <PaymentStatusCell paid={m2Done} />
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

      <BillingEmptyState />
      <SafetyNote />
    </div>
  );
}
