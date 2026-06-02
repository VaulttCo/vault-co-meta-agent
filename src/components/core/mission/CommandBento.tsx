"use client";

// Vault OS Mission Control — Command Bento (Section 4).
// Production build — real counts + real destinations. Does NOT import or reuse
// src/components/sandbox/VaultCommandBentoGrid.tsx (placeholder data). Every
// number here is passed in from real providers/APIs; destinations are unchanged.

import Link from "next/link";
import { Bot, BarChart3, FileText, ShieldCheck, ListChecks, ArrowRight, type LucideIcon } from "lucide-react";
import { VCBentoCell, VCGlowIcon } from "@/components/ui/VaultUI";

interface Stat {
  label: string;
  value: number | null;
}

interface CommandBentoProps {
  loading: boolean;
  veronicaStats: Stat[];
  pendingReviews: number;
  openTaskCount: number;
}

function NavCard({
  index,
  icon,
  accent,
  title,
  subtitle,
  href,
  value,
}: {
  index: number;
  icon: LucideIcon;
  accent: string;
  title: string;
  subtitle: string;
  href: string;
  value?: number | null;
}) {
  return (
    <VCBentoCell index={index} colSpan={1} accent={accent} minHeight={140}>
      <Link href={href} className="flex flex-col h-full p-5 gap-3">
        <div className="flex items-start justify-between">
          <VCGlowIcon icon={icon} color={accent} size={18} ringSize={40} />
          {value !== undefined && (
            <span
              className="text-[24px] font-bold leading-none"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: value && value > 0 ? accent : "var(--t-dim)" }}
            >
              {value === null ? "—" : value}
            </span>
          )}
        </div>
        <div className="mt-auto">
          <p
            className="text-[15px] font-bold leading-tight"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)", letterSpacing: "0.02em" }}
          >
            {title}
          </p>
          <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: "var(--t-muted)" }}>
            {subtitle}
            <ArrowRight size={11} style={{ color: "var(--t-dim)" }} />
          </p>
        </div>
      </Link>
    </VCBentoCell>
  );
}

export function CommandBento({ loading, veronicaStats, pendingReviews, openTaskCount }: CommandBentoProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Veronica workspace hero (2-col) */}
      <VCBentoCell index={0} colSpan={2} accent="#0081f2" minHeight={140}>
        <Link href="/ai-agent" className="flex flex-col h-full p-5 gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <VCGlowIcon icon={Bot} color="#0081f2" size={18} ringSize={40} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--t-dim)" }}>
                  Fulfillment command center
                </p>
                <p
                  className="text-[16px] font-bold leading-tight"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)", letterSpacing: "0.02em" }}
                >
                  Veronica Meta AI
                </p>
              </div>
            </div>
            <ArrowRight size={14} style={{ color: "var(--t-dim)" }} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-auto">
            {veronicaStats.map((s) => (
              <div
                key={s.label}
                className="px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: "rgba(0,129,242,0.07)", border: "1px solid rgba(0,129,242,0.16)" }}
              >
                <div
                  className="text-[18px] font-bold leading-none"
                  style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "#4da6ff" }}
                >
                  {loading || s.value === null ? "—" : s.value}
                </div>
                <div className="text-[9px] mt-1 leading-tight" style={{ color: "var(--t-dim)" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </Link>
      </VCBentoCell>

      <NavCard index={1} icon={BarChart3} accent="#ff8400" title="Revenue Dashboard" subtitle="Leadership overview" href="/revenue-dashboard" />
      <NavCard index={2} icon={FileText} accent="#a78bfa" title="Reporting" subtitle="Client reports" href="/reports" />
      <NavCard index={3} icon={ShieldCheck} accent="#0081f2" title="Approvals" subtitle="Review queue" href="/approvals" value={loading ? null : pendingReviews} />
      <NavCard index={4} icon={ListChecks} accent="#22c55e" title="Operator Queue" subtitle="Open work" href="/operator-queue" value={loading ? null : openTaskCount} />
    </div>
  );
}
