"use client";

// Vault OS Mission Control — Human Review Queue (Section 5).
//
// Surfaces the internal approval items Vault Core produces: recommendations,
// drafts, and system proposals — plus campaign plans awaiting review. Counts are
// real (passed from the page's mission-data hook + plans). This module exists to
// make human approval OBVIOUS and to reinforce the core safety rule:
//   AI recommends · AI drafts · AI prioritizes — humans approve.
//   Approving only updates internal status. Nothing sends, launches, or mutates
//   GHL / Stripe / Meta / SMS / email / workflows.

import Link from "next/link";
import { ShieldCheck, Lightbulb, FileText, Boxes, ClipboardCheck, ArrowRight, type LucideIcon } from "lucide-react";
import { VCPanel, VCPanelHeader } from "@/components/ui/VaultUI";

interface ReviewQueueProps {
  loading: boolean;
  recPending: number;
  draftPending: number;
  propPending: number;
  plansNeedsReview: number;
}

interface Row {
  icon: LucideIcon;
  label: string;
  sub: string;
  count: number;
  href: string;
  accent: string;
}

export function ReviewQueue({ loading, recPending, draftPending, propPending, plansNeedsReview }: ReviewQueueProps) {
  const rows: Row[] = [
    { icon: Lightbulb,     label: "Recommendations", sub: "AI recommends", href: "/recommendations", accent: "#ff8400", count: recPending },
    { icon: FileText,      label: "Drafts",          sub: "AI drafts",     href: "/drafts",          accent: "#0081f2", count: draftPending },
    { icon: Boxes,         label: "System Proposals", sub: "AI proposes",  href: "/proposals",       accent: "#a78bfa", count: propPending },
    { icon: ClipboardCheck, label: "Approvals",      sub: "Campaign plans", href: "/approvals",      accent: "#22c55e", count: plansNeedsReview },
  ];

  const total = recPending + draftPending + propPending + plansNeedsReview;

  return (
    <VCPanel accent="blue">
      <VCPanelHeader
        icon={ShieldCheck}
        iconColor="#0081f2"
        label="Human review"
        title="Approval Queue"
        action={
          <span className="text-[11px] font-semibold" style={{ color: total > 0 ? "#ff8400" : "var(--t-dim)" }}>
            {loading ? "—" : `${total} awaiting`}
          </span>
        }
      />

      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map((r) => {
          const Icon = r.icon;
          const has = r.count > 0;
          return (
            <Link
              key={r.label}
              href={r.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
              style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${r.accent}14`, border: `1px solid ${r.accent}2e` }}
              >
                <Icon size={15} style={{ color: r.accent }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold leading-tight" style={{ color: "var(--t-text)" }}>
                  {r.label}
                </p>
                <p className="text-[10px]" style={{ color: "var(--t-dim)" }}>{r.sub}</p>
              </div>
              <span
                className="text-[18px] font-bold leading-none flex-shrink-0"
                style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: has ? r.accent : "var(--t-dim)" }}
              >
                {loading ? "—" : r.count}
              </span>
              <ArrowRight size={13} style={{ color: "var(--t-dim)", flexShrink: 0 }} />
            </Link>
          );
        })}
      </div>

      <div className="px-5 pb-4 pt-1">
        <p className="text-[10.5px] leading-snug" style={{ color: "var(--t-dim)" }}>
          Humans approve. Approving updates internal status only — nothing sends, launches ads, changes
          budgets, or mutates GHL, Stripe, or Meta.
        </p>
      </div>
    </VCPanel>
  );
}
