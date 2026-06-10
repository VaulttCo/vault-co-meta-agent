"use client";

// Vault Core — Daily Operator Brief panel (Executive Command).
// One prioritized worklist of everything awaiting a human decision today, across
// every approval queue, with an estimated time-to-clear. Read-only: it counts
// and links — it never sends, approves, or touches an external system. The
// review still happens in each queue's own page.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Command,
  ArrowRight,
  Clock,
  Target,
  Clapperboard,
  Play,
  Workflow,
  Wrench,
  Lightbulb,
  Receipt,
  MessageSquare,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { VCPanel, VCPanelHeader, VCStatusBadge, VCChip } from "@/components/ui/VaultUI";

interface OperatorQueueItem {
  key: string;
  label: string;
  href: string;
  pending: number;
  minutesEach: number;
}
interface OperatorPriority {
  id: string;
  title: string;
  agent: string;
  priority: string;
  reason: string;
}
interface OperatorWorklist {
  generatedAt: string;
  totalPending: number;
  estimatedMinutes: number;
  queues: OperatorQueueItem[];
  topPriorities: OperatorPriority[];
}

// key → icon + accent. Mirrors the Vault Core sidebar so a queue reads the same
// everywhere. Kept on the client so the server aggregator stays React-free.
const QUEUE_VISUAL: Record<string, { icon: LucideIcon; color: string }> = {
  "meta-campaign-drafts": { icon: Target, color: "#0081f2" },
  "creative-briefs": { icon: Clapperboard, color: "#ff8400" },
  "actions": { icon: Play, color: "#22c55e" },
  "ghl-workflows": { icon: Workflow, color: "#22d3ee" },
  "proposals": { icon: Wrench, color: "#a78bfa" },
  "recommendations": { icon: Lightbulb, color: "#c9a84c" },
  "finance-drafts": { icon: Receipt, color: "#c9a84c" },
  "message-drafts": { icon: MessageSquare, color: "#0081f2" },
  "sms-drafts": { icon: MessageSquare, color: "#0081f2" },
};

const PRIORITY_VARIANT: Record<string, "danger" | "orange" | "gold" | "blue" | "neutral"> = {
  critical: "danger",
  high: "orange",
  medium: "gold",
  low: "blue",
  watch: "neutral",
};

function formatMinutes(mins: number): string {
  if (mins <= 0) return "0 min";
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}m`;
}

export function CommandHubOperatorBrief() {
  const [data, setData] = useState<OperatorWorklist | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/core/operator-brief")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (cancelled) return;
        setData(d.worklist ?? null);
        setLoaded(true);
      })
      .catch((s) => {
        if (cancelled) return;
        if (s === 403 || s === 401) setForbidden(true);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (forbidden) return null;

  const active = (data?.queues ?? []).filter((q) => q.pending > 0);
  const total = data?.totalPending ?? 0;

  return (
    <VCPanel accent="gold">
      <VCPanelHeader
        icon={Command}
        iconColor="#c9a84c"
        label="Vault Core · Daily Operator Brief"
        title="Today — What Needs Your Decision"
        live
        action={
          data ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#c9a84c" }}>
              <Clock size={11} /> {formatMinutes(data.estimatedMinutes)} to clear
            </span>
          ) : undefined
        }
      />
      <div className="px-5 py-4">
        {!loaded && (
          <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>Loading worklist…</p>
        )}

        {loaded && total === 0 && (
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} style={{ color: "#22c55e" }} />
            <p className="text-[12.5px]" style={{ color: "var(--t-text)" }}>
              Inbox zero — nothing is awaiting your approval right now.
            </p>
          </div>
        )}

        {loaded && total > 0 && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <VCStatusBadge label={`${total} awaiting decision`} variant="gold" dot />
              <VCChip label={`${active.length} queue${active.length === 1 ? "" : "s"}`} color="#c9a84c" />
            </div>

            {/* Top priorities first — Vanessa's ranked recommendations */}
            {(data?.topPriorities.length ?? 0) > 0 && (
              <div className="mb-3 space-y-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
                  Start here
                </span>
                {data!.topPriorities.map((p) => (
                  <Link
                    key={p.id}
                    href="/recommendations"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                    style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium truncate" style={{ color: "var(--t-text)" }}>{p.title}</span>
                      <span className="block text-[11px] truncate" style={{ color: "var(--t-muted)" }}>{p.reason}</span>
                    </span>
                    <VCStatusBadge label={p.priority} variant={PRIORITY_VARIANT[p.priority] ?? "neutral"} />
                  </Link>
                ))}
              </div>
            )}

            {/* Queue rollup — every queue with pending work */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {active.map((q) => {
                const v = QUEUE_VISUAL[q.key] ?? { icon: Play, color: "#6b7a99" };
                const Icon = v.icon;
                return (
                  <Link
                    key={q.key}
                    href={q.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                    style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}
                  >
                    <Icon size={14} style={{ color: v.color, flexShrink: 0 }} />
                    <span className="min-w-0 flex-1 text-[12px] font-medium truncate" style={{ color: "var(--t-text)" }}>
                      {q.label}
                    </span>
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: v.color }}>{q.pending}</span>
                    <ArrowRight size={12} style={{ color: "var(--t-dim)" }} />
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <p className="text-[10.5px] mt-3 flex items-center gap-1" style={{ color: "var(--t-dim)" }}>
          <Clock size={10} /> Read-only roll-up. Every item is reviewed and approved in its own queue — Vault Core never sends, publishes, or pushes anything.
        </p>
      </div>
    </VCPanel>
  );
}
