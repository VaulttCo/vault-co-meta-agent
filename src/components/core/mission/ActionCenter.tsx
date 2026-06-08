"use client";

// Vault OS Mission Control — Action Center (Phase 8.4).
//
// One operator workflow strip answering "what needs my attention today?". It
// prefers CLEANED data: recommendations are mission-visible (Vera/Vesper-cleaned),
// with hidden/merged shown only as small audit context — never as the headline
// number. It links to existing pages and adds nothing executable.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crosshair, Lightbulb, ClipboardCheck, FileText, Boxes, Radar, Play, Workflow, MessageSquare, Target, Receipt, Clapperboard, ArrowRight, type LucideIcon } from "lucide-react";
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
  const [acts, setActs] = useState<{ pending: number; ready: number; readyUrgentHigh: number; needsRevision: number; highRiskPending: number; failed: number; disabled: number } | null>(null);
  const [wf, setWf] = useState<{ pending: number; approved: number; futureAdapter: number } | null>(null);
  const [msg, setMsg] = useState<{ pending: number; futureAdapter: number } | null>(null);
  const [camp, setCamp] = useState<{ pending: number; futureAdapter: number; missing: number } | null>(null);
  const [fin, setFin] = useState<{ pending: number; futureAdapter: number; missing: number } | null>(null);
  const [cb, setCb] = useState<{ pending: number; futureAdapter: number; missing: number } | null>(null);

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
        setActs({
          pending: c?.pending_review ?? 0, ready: c?.ready ?? 0, readyUrgentHigh: c?.ready_urgent_high ?? 0,
          needsRevision: c?.needs_revision ?? 0, highRiskPending: c?.high_risk_pending ?? 0,
          failed: c?.failed ?? 0, disabled: c?.adapter_disabled ?? 0,
        });
      })
      .catch(() => { if (!cancelled) setActs({ pending: 0, ready: 0, readyUrgentHigh: 0, needsRevision: 0, highRiskPending: 0, failed: 0, disabled: 0 }); });
    fetch("/api/core/ghl-workflow-drafts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const c = d?.counts;
        setWf({ pending: c?.pending_review ?? 0, approved: c?.approved_internal ?? 0, futureAdapter: c?.future_adapter_required ?? 0 });
      })
      .catch(() => { if (!cancelled) setWf({ pending: 0, approved: 0, futureAdapter: 0 }); });
    fetch("/api/core/message-drafts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const c = d?.counts;
        setMsg({ pending: c?.pending_review ?? 0, futureAdapter: c?.future_adapter_required ?? 0 });
      })
      .catch(() => { if (!cancelled) setMsg({ pending: 0, futureAdapter: 0 }); });
    fetch("/api/core/meta-campaign-drafts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const c = d?.counts;
        setCamp({ pending: c?.pending_review ?? 0, futureAdapter: c?.future_adapter_required ?? 0, missing: c?.missing_inputs ?? 0 });
      })
      .catch(() => { if (!cancelled) setCamp({ pending: 0, futureAdapter: 0, missing: 0 }); });
    fetch("/api/core/finance-drafts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const c = d?.counts;
        setFin({ pending: c?.pending_review ?? 0, futureAdapter: c?.future_adapter_required ?? 0, missing: c?.missing_inputs ?? 0 });
      })
      .catch(() => { if (!cancelled) setFin({ pending: 0, futureAdapter: 0, missing: 0 }); });
    fetch("/api/core/creative-briefs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const c = d?.counts;
        setCb({ pending: c?.pending_review ?? 0, futureAdapter: c?.future_adapter_required ?? 0, missing: c?.missing_inputs ?? 0 });
      })
      .catch(() => { if (!cancelled) setCb({ pending: 0, futureAdapter: 0, missing: 0 }); });
    return () => { cancelled = true; };
  }, []);
  const competitorSignals = comp?.captures ?? null;

  // Today's priority — the single most urgent thing. Phase 9.2 lifecycle order:
  // failed internal actions → urgent/high ready-to-execute → high-risk pending
  // approval → actions needing revision → ready internal actions → pending review →
  // generic recommendations → all clear.
  const aPending = acts?.pending ?? 0, aReady = acts?.ready ?? 0, aReadyUH = acts?.readyUrgentHigh ?? 0;
  const aRevision = acts?.needsRevision ?? 0, aHighRisk = acts?.highRiskPending ?? 0, aFailed = acts?.failed ?? 0;
  const plural = (n: number) => (n === 1 ? "" : "s");
  const priority =
    failedRuns > 0 ? `${failedRuns} failed runtime signal${plural(failedRuns)} — inspect Vault Core.`
    : aFailed > 0 ? `${aFailed} internal action${plural(aFailed)} failed to execute — inspect Actions.`
    : aReadyUH > 0 ? `${aReadyUH} urgent/high internal action${plural(aReadyUH)} ready to execute.`
    : aHighRisk > 0 ? `${aHighRisk} high-risk action${plural(aHighRisk)} awaiting your approval.`
    : aRevision > 0 ? `${aRevision} action${plural(aRevision)} need revision before they can proceed.`
    : urgentTasks > 0 ? `${urgentTasks} urgent task${plural(urgentTasks)} need attention.`
    : aReady > 0 ? `${aReady} approved internal action${plural(aReady)} ready to execute.`
    : aPending > 0 ? `${aPending} prepared action${plural(aPending)} to review in Actions.`
    : (wf?.pending ?? 0) > 0 ? `${wf?.pending} GHL workflow draft${plural(wf?.pending ?? 0)} to review (draft-only).`
    : (msg?.pending ?? 0) > 0 ? `${msg?.pending} message draft${plural(msg?.pending ?? 0)} to review (draft-only).`
    : (camp?.pending ?? 0) > 0 ? `${camp?.pending} Meta campaign draft${plural(camp?.pending ?? 0)} to review (draft-only).`
    : (fin?.pending ?? 0) > 0 ? `${fin?.pending} finance draft${plural(fin?.pending ?? 0)} to review (draft-only).`
    : (cb?.pending ?? 0) > 0 ? `${cb?.pending} creative brief${plural(cb?.pending ?? 0)} to review (draft-only).`
    : plansNeedsReview > 0 ? `${plansNeedsReview} approval${plural(plansNeedsReview)} blocking progress.`
    : recVisible > 0 ? `${recVisible} mission-visible recommendation${plural(recVisible)} to review.`
    : "All clear — nothing needs human action right now.";

  // Actions tile — value + sub describe the SAME (highest-priority) metric so the
  // number never contradicts the label; a secondary count is shown as the note.
  // Order mirrors Today's Priority above (failed → ready → pending → revision → clear)
  // so the tile's headline number never disagrees with the priority message.
  const actionsTile: Tile = (() => {
    const base = { icon: Play, label: "Actions", href: "/actions", accent: "#22d3ee" } as const;
    if (aFailed > 0) return { ...base, sub: "failed to execute", value: aFailed, accent: "#ef4444", note: aReady > 0 ? `${aReady} ready` : undefined };
    if (aReady > 0) return { ...base, sub: "ready to execute", value: aReady, accent: "#22c55e", note: aPending > 0 ? `${aPending} pending` : undefined };
    if (aPending > 0) return { ...base, sub: "pending review", value: aPending, note: aRevision > 0 ? `${aRevision} revision` : undefined };
    if (aRevision > 0) return { ...base, sub: "need revision", value: aRevision, accent: "#f59e0b" };
    return { ...base, sub: "all clear", value: 0, note: (acts?.disabled ?? 0) > 0 ? `${acts?.disabled} adapter-off` : undefined };
  })();

  const tiles: Tile[] = [
    { icon: Lightbulb, label: "Recommendations", sub: "mission-visible", value: recVisible, href: "/recommendations", accent: "#ff8400", note: recHidden > 0 ? `${recHidden} hidden` : undefined },
    { icon: ClipboardCheck, label: "Approvals", sub: "blocking progress", value: plansNeedsReview, href: "/approvals", accent: "#22c55e" },
    { icon: FileText, label: "Drafts", sub: "awaiting review", value: draftPending, href: "/drafts", accent: "#0081f2" },
    { icon: Boxes, label: "System Proposals", sub: "pending", value: propPending, href: "/proposals", accent: "#a78bfa" },
    actionsTile,
    { icon: Workflow, label: "GHL Workflows", sub: "drafts · adapter off", value: wf?.pending ?? 0, href: "/ghl-workflows", accent: "#c9a84c",
      note: wf && wf.futureAdapter > 0 ? `${wf.futureAdapter} future-adapter` : (wf && wf.approved > 0 ? `${wf.approved} approved` : undefined) },
    { icon: MessageSquare, label: "Message Drafts", sub: "drafts · send off", value: msg?.pending ?? 0, href: "/message-drafts", accent: "#c9a84c",
      note: msg && msg.futureAdapter > 0 ? `${msg.futureAdapter} approved` : undefined },
    { icon: Target, label: "Meta Campaign Drafts", sub: "drafts · meta off", value: camp?.pending ?? 0, href: "/meta-campaign-drafts", accent: "#c9a84c",
      note: camp && camp.futureAdapter > 0 ? `${camp.futureAdapter} approved` : (camp && camp.missing > 0 ? `${camp.missing} missing inputs` : undefined) },
    { icon: Receipt, label: "Finance Drafts", sub: "drafts · finance off", value: fin?.pending ?? 0, href: "/finance-drafts", accent: "#c9a84c",
      note: fin && fin.futureAdapter > 0 ? `${fin.futureAdapter} approved` : (fin && fin.missing > 0 ? `${fin.missing} missing inputs` : undefined) },
    { icon: Clapperboard, label: "Creative Briefs", sub: "drafts · content off", value: cb?.pending ?? 0, href: "/creative-briefs", accent: "#c9a84c",
      note: cb && cb.futureAdapter > 0 ? `${cb.futureAdapter} approved` : (cb && cb.missing > 0 ? `${cb.missing} missing inputs` : undefined) },
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
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-11 gap-2.5">
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
