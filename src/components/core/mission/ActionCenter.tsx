"use client";

// Vault OS Mission Control — Action Center (Phase 8.4).
//
// One operator workflow strip answering "what needs my attention today?". It
// prefers CLEANED data: recommendations are mission-visible (Vera/Vesper-cleaned),
// with hidden/merged shown only as small audit context — never as the headline
// number. It links to existing pages and adds nothing executable.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crosshair, Lightbulb, ClipboardCheck, FileText, Boxes, Radar, Play, ArrowRight, type LucideIcon } from "lucide-react";
import { VCPanel, VCPanelHeader, VCChip } from "@/components/ui/VaultUI";

interface ActionCenterProps {
  loading: boolean;
  recVisible: number; // mission-visible recommendations
  recHidden: number; // hygiene-hidden (audit context only)
  plansNeedsReview: number;
  draftPending: number;
  propPending: number;
  urgentTasks: number;
  failedRuns: number;
  lastUpdate: string | null;
}

interface Tile {
  icon: LucideIcon;
  label: string;
  sub: string;
  value: number;
  href: string;
  accent: string;
  note?: string;
}

export function ActionCenter(props: ActionCenterProps) {
  const { loading, recVisible, recHidden, plansNeedsReview, draftPending, propPending, urgentTasks, failedRuns } = props;
  const [comp, setComp] = useState<{ captures: number; profiles: number; topHook: string | null } | null>(null);
  const [acts, setActs] = useState<{ pending: number; approved: number; disabled: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/core/competitor-intel")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const ov = d?.overview;
        setComp({
          captures: ov?.totalCaptures ?? 0,
          profiles: ov?.totalProfiles ?? 0,
          topHook: ov?.topHookAngle ?? ov?.topOfferShift ?? null,
        });
      })
      .catch(() => { if (!cancelled) setComp({ captures: 0, profiles: 0, topHook: null }); });
    fetch("/api/core/actions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const c = d?.counts;
        setActs({ pending: c?.pending_review ?? 0, approved: c?.approved ?? 0, disabled: c?.adapter_disabled ?? 0 });
      })
      .catch(() => { if (!cancelled) setActs({ pending: 0, approved: 0, disabled: 0 }); });
    return () => { cancelled = true; };
  }, []);
  const competitorSignals = comp?.captures ?? null;

  // Today's priority — the single most urgent thing. Vault Actions (agents
  // prepared → human approves → internal execute) sit ahead of generic
  // recommendations: pending actions need review, approved ones are ready to run.
  const actsPending = acts?.pending ?? 0;
  const actsApproved = acts?.approved ?? 0;
  const priority =
    failedRuns > 0 ? `${failedRuns} failed runtime signal${failedRuns === 1 ? "" : "s"} — inspect Vault Core.`
    : urgentTasks > 0 ? `${urgentTasks} urgent task${urgentTasks === 1 ? "" : "s"} need attention.`
    : plansNeedsReview > 0 ? `${plansNeedsReview} approval${plansNeedsReview === 1 ? "" : "s"} blocking progress.`
    : actsPending > 0 ? `${actsPending} prepared action${actsPending === 1 ? "" : "s"} to review in Actions.`
    : actsApproved > 0 ? `${actsApproved} approved internal action${actsApproved === 1 ? "" : "s"} ready to execute.`
    : recVisible > 0 ? `${recVisible} mission-visible recommendation${recVisible === 1 ? "" : "s"} to review.`
    : "All clear — nothing needs human action right now.";

  const tiles: Tile[] = [
    { icon: Lightbulb, label: "Recommendations", sub: "mission-visible", value: recVisible, href: "/recommendations", accent: "#ff8400", note: recHidden > 0 ? `${recHidden} hidden` : undefined },
    { icon: ClipboardCheck, label: "Approvals", sub: "blocking progress", value: plansNeedsReview, href: "/approvals", accent: "#22c55e" },
    { icon: FileText, label: "Drafts", sub: "awaiting review", value: draftPending, href: "/drafts", accent: "#0081f2" },
    { icon: Boxes, label: "System Proposals", sub: "pending", value: propPending, href: "/proposals", accent: "#a78bfa" },
    { icon: Play, label: "Actions", sub: "agents prepared", value: acts?.pending ?? 0, href: "/actions", accent: "#22d3ee", note: acts && acts.approved > 0 ? `${acts.approved} approved` : (acts && acts.disabled > 0 ? `${acts.disabled} adapter-off` : undefined) },
    { icon: Radar, label: "Competitor Intel", sub: comp ? `${comp.profiles} profile${comp.profiles === 1 ? "" : "s"}` : "Valentina signals", value: competitorSignals ?? 0, href: "/competitor-intel", accent: "#fb923c", note: comp?.topHook ? `top: ${comp.topHook.slice(0, 18)}` : undefined },
  ];

  return (
    <VCPanel accent="blue">
      <VCPanelHeader
        icon={Crosshair}
        iconColor="#0081f2"
        label="What needs my attention today"
        title="Action Center"
        action={
          <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>
            cleaned by Vera/Vesper{recHidden > 0 ? ` · ${recHidden} hidden in audit` : ""}
          </span>
        }
      />

      {/* Today's priority */}
      <div className="px-5 pt-3">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={{ background: "rgba(0,129,242,0.06)", border: "1px solid rgba(0,129,242,0.18)" }}>
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] flex-shrink-0" style={{ color: "var(--t-dim)" }}>Today</span>
          <span className="text-[12.5px]" style={{ color: "var(--t-text-body)" }}>{loading ? "…" : priority}</span>
        </div>
      </div>

      {/* Action tiles */}
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {tiles.map((t) => {
          const Icon = t.icon;
          const has = t.value > 0;
          return (
            <Link
              key={t.label}
              href={t.href}
              className="flex flex-col gap-1.5 px-3 py-3 rounded-xl transition-all"
              style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}
            >
              <div className="flex items-center justify-between">
                <Icon size={15} style={{ color: t.accent }} />
                <ArrowRight size={11} style={{ color: "var(--t-dim)" }} />
              </div>
              <span className="text-[20px] font-bold leading-none" style={{ fontFamily: "var(--font-rajdhani), sans-serif", color: has ? t.accent : "var(--t-dim)" }}>
                {loading ? "—" : t.value}
              </span>
              <div>
                <p className="text-[11.5px] font-semibold leading-tight" style={{ color: "var(--t-text)" }}>{t.label}</p>
                <p className="text-[9.5px] flex items-center gap-1" style={{ color: "var(--t-dim)" }}>
                  {t.sub}
                  {t.note && <VCChip label={t.note} color="#6b7a99" />}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </VCPanel>
  );
}
