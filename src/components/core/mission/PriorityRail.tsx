"use client";

// Vault OS Mission Control — Priority Rail (Section 2, moved above Workforce).
// Surfaces urgent items immediately below the header. When there is nothing to
// act on it shows a single calm "all clear" line (not a big empty card) so the
// standby state reads as intentional — the system checked, nothing needs a human.
//
// All counts are real (passed from the page's mission-data hook + plans/clients).
// Severity order: failed runs → launch blockers → urgent tasks → approvals.

import Link from "next/link";
import { ArrowRight, AlertTriangle, ShieldCheck } from "lucide-react";
import { VCPanel, VCPriorityDot, priorityColors } from "@/components/ui/VaultUI";

type Priority = "urgent" | "high" | "medium" | "low";

interface PriorityRailProps {
  loading: boolean;
  approvalsWaiting: number;
  launchBlockers: number;
  failedRuns: number;
  urgentTasks: number;
}

interface Row {
  label: string;
  count: number;
  href: string;
  priority: Priority;
}

export function PriorityRail({
  loading,
  approvalsWaiting,
  launchBlockers,
  failedRuns,
  urgentTasks,
}: PriorityRailProps) {
  // Never flash an empty rail while data is still resolving.
  if (loading) return null;

  // Annotate the literal directly so the `priority` strings keep their literal
  // types (a trailing .filter() would otherwise widen them to `string`).
  const allRows: Row[] = [
    { label: failedRuns === 1 ? "failed workflow" : "failed workflows", count: failedRuns, href: "/vault-core", priority: "urgent" },
    { label: launchBlockers === 1 ? "launch blocker" : "launch blockers", count: launchBlockers, href: "/clients", priority: "high" },
    { label: urgentTasks === 1 ? "urgent task" : "urgent tasks", count: urgentTasks, href: "/operator-queue", priority: "high" },
    { label: approvalsWaiting === 1 ? "approval waiting" : "approvals waiting", count: approvalsWaiting, href: "/approvals", priority: "medium" },
  ];
  const rows = allRows.filter((r) => r.count > 0);

  // Nothing needs a human right now — show a calm, intentional all-clear line
  // rather than an empty card. This communicates the system actively checked.
  if (rows.length === 0) {
    return (
      <div className="hub-fade-up w-full">
        <VCPanel accent="green">
          <div className="flex items-center gap-3 px-4 py-3">
            <ShieldCheck size={15} style={{ color: "#22c55e", flexShrink: 0 }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>
              All clear
            </span>
            <span className="text-[12px]" style={{ color: "var(--t-muted)" }}>
              Nothing needs human action right now. New priorities surface here the moment they appear.
            </span>
          </div>
        </VCPanel>
      </div>
    );
  }

  return (
    <div className="hub-fade-up w-full">
      <VCPanel accent="red">
        <div className="vc-panel-header">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: "#ef4444" }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>
              Priority
            </span>
            <span className="vc-label" style={{ marginBottom: 0 }}>Needs attention</span>
          </div>
        </div>

        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rows.map((r) => (
            <Link
              key={r.label}
              href={r.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
              style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}
            >
              <VCPriorityDot priority={r.priority} />
              <span
                className="text-[16px] font-bold leading-none flex-shrink-0"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: priorityColors[r.priority] }}
              >
                {r.count}
              </span>
              <span className="text-[12.5px] flex-1 truncate" style={{ color: "var(--t-text-body)" }}>
                {r.label}
              </span>
              <ArrowRight size={13} style={{ color: "var(--t-dim)", flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </VCPanel>
    </div>
  );
}
