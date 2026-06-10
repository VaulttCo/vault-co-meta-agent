"use client";

// Vault Core — Executive Decision Center (Executive Command).
// A decision-compression layer: the most important PENDING decisions from every
// existing approval queue, grouped Critical / Recommended / Low urgency. Each
// card deep-links into the queue page that already handles review/approval.
// Read-only: this surface counts, ranks, and routes — it never approves, sends,
// publishes, or touches an external system.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Scale,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Target,
  Clapperboard,
  Play,
  Workflow,
  Wrench,
  Lightbulb,
  Receipt,
  MessageSquare,
  HeartPulse,
  Building2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { VCPanel, VCPanelHeader, VCStatusBadge, VCChip } from "@/components/ui/VaultUI";
// Type-only import — erased at compile, so no server code enters the client bundle.
// Keeps the card/center shapes in sync with the aggregator (single source of truth).
import type {
  DecisionUrgency,
  DecisionCard,
  ExecutiveDecisionCenter as ExecutiveDecisionCenterData,
} from "@/lib/core/executive-decisions/build";

// source → icon + accent. Mirrors the Vault Core sidebar so a queue reads the
// same everywhere; kept on the client so the server aggregator stays React-free.
const SOURCE_VISUAL: Record<string, { icon: LucideIcon; color: string }> = {
  "meta-campaign-drafts": { icon: Target, color: "#0081f2" },
  "creative-briefs": { icon: Clapperboard, color: "#ff8400" },
  "actions": { icon: Play, color: "#22c55e" },
  "ghl-workflows": { icon: Workflow, color: "#22d3ee" },
  "proposals": { icon: Wrench, color: "#a78bfa" },
  "recommendations": { icon: Lightbulb, color: "#c9a84c" },
  "finance-drafts": { icon: Receipt, color: "#c9a84c" },
  "message-drafts": { icon: MessageSquare, color: "#0081f2" },
  "client-health": { icon: HeartPulse, color: "#22c55e" },
  "sms-drafts": { icon: MessageSquare, color: "#0081f2" },
};

const SECTION_META: Record<DecisionUrgency, { label: string; color: string }> = {
  critical: { label: "Critical", color: "#ef4444" },
  recommended: { label: "Recommended", color: "#ff8400" },
  low: { label: "Low Urgency", color: "#6b7a99" },
};

function formatMinutes(mins: number): string {
  if (mins <= 0) return "0 min";
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}m`;
}

function DecisionRow({ card }: { card: DecisionCard }) {
  const v = SOURCE_VISUAL[card.source] ?? { icon: Play, color: "#6b7a99" };
  const Icon = v.icon;
  return (
    <Link
      href={card.href}
      aria-label={`Review ${card.title} in ${card.sourceLabel}`}
      className="block px-3 py-2.5 rounded-lg transition-colors"
      style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}
    >
      <div className="flex items-start gap-2.5">
        <Icon size={15} style={{ color: v.color, flexShrink: 0, marginTop: 1 }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-[12.5px] font-medium truncate" style={{ color: "var(--t-text)" }}>
              {card.title}
            </span>
            <VCStatusBadge label={card.statusLabel} variant="neutral" />
          </div>
          <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: "var(--t-muted)" }}>
            {card.whyItMatters}
          </p>
          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
            <VCChip label={card.sourceLabel} color={v.color} />
            <span className="inline-flex items-center gap-1 text-[10.5px]" style={{ color: "var(--t-dim)" }}>
              <Building2 size={10} /> {card.affects}
            </span>
            <span className="inline-flex items-center gap-1 text-[10.5px]" style={{ color: "var(--t-dim)" }}>
              <Clock size={10} /> {formatMinutes(card.minutesToReview)}
            </span>
            {card.businessImpact && (
              <span className="inline-flex items-center gap-1 text-[10.5px]" style={{ color: "#22c55e" }}>
                <TrendingUp size={10} /> {card.businessImpact}
              </span>
            )}
          </div>
        </div>
        <ArrowRight size={13} style={{ color: "var(--t-dim)", flexShrink: 0, marginTop: 2 }} />
      </div>
    </Link>
  );
}

function Section({ urgency, cards }: { urgency: DecisionUrgency; cards: DecisionCard[] }) {
  if (cards.length === 0) return null;
  const meta = SECTION_META[urgency];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {urgency === "critical" && <AlertTriangle size={12} style={{ color: meta.color }} />}
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <VCChip label={`${cards.length}`} color={meta.color} />
      </div>
      <div className="space-y-1.5">
        {cards.map((c) => (
          <DecisionRow key={c.id} card={c} />
        ))}
      </div>
    </div>
  );
}

export function ExecutiveDecisionCenter() {
  const [data, setData] = useState<ExecutiveDecisionCenterData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/core/executive-decisions")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (cancelled) return;
        setData(d.center ?? null);
        setLoaded(true);
      })
      .catch((s) => {
        if (cancelled) return;
        if (s === 403 || s === 401) setForbidden(true);
        else setErrored(true);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (forbidden) return null;

  const total = data?.total ?? 0;
  const partialFailures = data?.partialFailures ?? [];
  const degraded = partialFailures.length > 0;

  return (
    <VCPanel accent="gold">
      <VCPanelHeader
        icon={Scale}
        iconColor="#c9a84c"
        label="Vault Core · Executive Decision Center"
        title="Decisions Awaiting You"
        live
        action={
          data && total > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#c9a84c" }}>
              <Clock size={11} /> {formatMinutes(data.estimatedMinutes)} to clear
            </span>
          ) : undefined
        }
      />
      <div className="px-5 py-4 space-y-4">
        {!loaded && (
          <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>Compressing decisions…</p>
        )}

        {loaded && errored && (
          <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
            Couldn&apos;t load the decision center right now. Your queues are unaffected — open any module from the sidebar to review directly.
          </p>
        )}

        {/* Degraded-read banner — a failed queue must never masquerade as all-clear */}
        {loaded && !errored && degraded && (
          <div
            className="flex items-start gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)" }}
          >
            <AlertTriangle size={13} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
            <p className="text-[11.5px]" style={{ color: "var(--t-muted)" }}>
              Some queues couldn&apos;t be read this cycle ({partialFailures.join(", ")}). Counts may be
              incomplete — open those modules directly to confirm.
            </p>
          </div>
        )}

        {loaded && !errored && total === 0 && !degraded && (
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} style={{ color: "#22c55e" }} />
            <p className="text-[12.5px]" style={{ color: "var(--t-text)" }}>
              All clear — no decisions are awaiting you across any queue.
            </p>
          </div>
        )}

        {loaded && !errored && total > 0 && data && (
          <>
            <div className="flex items-center gap-2">
              <VCStatusBadge label={`${total} awaiting decision`} variant="gold" dot />
              {data.critical.length > 0 && (
                <VCChip label={`${data.critical.length} critical`} color="#ef4444" />
              )}
            </div>
            <Section urgency="critical" cards={data.critical} />
            <Section urgency="recommended" cards={data.recommended} />
            <Section urgency="low" cards={data.low} />
          </>
        )}

        <p className="text-[10.5px] flex items-center gap-1" style={{ color: "var(--t-dim)" }}>
          <Clock size={10} /> Read-only decision lens. Every item is approved in its own queue — Vault Core never sends, publishes, or pushes anything.
        </p>
      </div>
    </VCPanel>
  );
}
