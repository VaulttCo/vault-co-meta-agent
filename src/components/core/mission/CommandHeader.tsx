"use client";

// Vault OS Mission Control — Command Header (instrument cluster).
// VAULT OS wordmark + Mission Status + "Last System Update" + four real KPIs.
// No marketing copy, no paragraphs — operational information only.
//
// KPI sources (all real, all passed in from the page's mission-data hook):
//   Active Automations → active runtime agents (workforce.filter(active))
//   Pending Reviews    → plans needs_review + core recs/proposals pending_review
//   Open Tasks         → operator tasks (open + in_progress)
//   System Health      → derived nominal state from governance safety gates
//                        (count of engaged gates — NOT a fabricated uptime %)

import Image from "next/image";
import { Activity, ClipboardCheck, ListChecks, ShieldCheck, RefreshCw } from "lucide-react";
import { VCStat, VCStatusBadge } from "@/components/ui/VaultUI";
import { relativeTime } from "./relativeTime";

interface CommandHeaderProps {
  loading: boolean;
  activeAutomations: number;
  pendingReviews: number;
  openTaskCount: number;
  /** Count of engaged governance safety gates, e.g. 5 of 5. */
  safetyGatesActive: number;
  safetyGatesTotal: number;
  lastUpdate: string | null;
}

export function CommandHeader({
  loading,
  activeAutomations,
  pendingReviews,
  openTaskCount,
  safetyGatesActive,
  safetyGatesTotal,
  lastUpdate,
}: CommandHeaderProps) {
  return (
    <div className="hub-fade-up w-full flex flex-col gap-5">
      {/* Identity row */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Image src="/vaultco-logo.png" alt="Vault Co" width={44} height={44} className="object-contain" priority />
          <div className="flex flex-col">
            <h1
              className="text-[30px] sm:text-[36px] font-bold tracking-[0.14em] leading-none"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
            >
              VAULT OS
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--t-dim)" }}>
                Mission Status
              </span>
              <VCStatusBadge label="Operational" variant="success" dot />
            </div>
          </div>
        </div>

        {/* Last System Update — newest real activity timestamp */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border-subtle)" }}>
          <RefreshCw size={12} style={{ color: "var(--t-dim)" }} />
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--t-dim)" }}>
              Last System Update
            </span>
            <span className="text-[12px] font-semibold" style={{ color: "var(--t-muted)" }}>
              {loading ? "…" : relativeTime(lastUpdate)}
            </span>
          </div>
        </div>
      </div>

      {/* Instrument cluster — four KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <VCStat
          icon={Activity}
          iconColor="#0081f2"
          label="Active Automations"
          value={loading ? null : activeAutomations}
        />
        <VCStat
          icon={ClipboardCheck}
          iconColor={pendingReviews > 0 ? "#ff8400" : "#0081f2"}
          label="Pending Reviews"
          value={loading ? null : pendingReviews}
        />
        <VCStat
          icon={ListChecks}
          iconColor="#0081f2"
          label="Open Tasks"
          value={loading ? null : openTaskCount}
        />
        <VCStat
          icon={ShieldCheck}
          iconColor="#22c55e"
          label="System Health"
          value={`${safetyGatesActive} / ${safetyGatesTotal}`}
        />
      </div>
    </div>
  );
}
