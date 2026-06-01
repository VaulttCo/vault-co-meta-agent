"use client";

// Vault Core — Command Hub Daily Executive Brief + Executive Queue (Phase 5).
// Vanessa's synthesized oversight: top priorities, risks, opportunities, and a
// priority-ranked queue of items needing human review. Read-only summary; all
// review actions happen in /recommendations.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { VCPanel, VCPanelHeader } from "@/components/ui/VaultUI";
import { PRIORITY_META } from "./recommendationStatus";
import type { ExecutiveBrief, ExecutivePriorityItem } from "@/lib/core/types";

function PriorityChip({ p }: { p: ExecutivePriorityItem["priority"] }) {
  const m = PRIORITY_META[p];
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ color: m.color, background: `${m.color}18`, border: `1px solid ${m.color}38` }}>
      {m.label}
    </span>
  );
}

export function CommandHubExecutiveBrief() {
  const [brief, setBrief] = useState<ExecutiveBrief | null>(null);
  const [queue, setQueue] = useState<ExecutivePriorityItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/core/executive-brief")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (cancelled) return;
        setBrief(d.brief ?? null);
        setQueue(d.queue ?? []);
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

  return (
    <VCPanel accent="purple">
      <VCPanelHeader
        icon={ClipboardCheck}
        label="Vault Core · Executive Oversight"
        title="Daily Executive Brief"
        live
        action={
          <Link href="/workforce" className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#a78bfa" }}>
            Workforce <ArrowRight size={11} />
          </Link>
        }
      />
      <div className="px-5 py-4 space-y-4">
        {!loaded && <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>Loading…</p>}

        {loaded && brief && (
          <>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>
              {brief.executiveSummary}
            </p>

            {/* Top 3 priorities */}
            <div>
              <p className="vc-label mb-2 flex items-center gap-1.5"><ListChecks size={12} /> Top Priorities</p>
              <div className="space-y-1.5">
                {brief.topPriorities.length === 0 && (
                  <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No standout priorities.</p>
                )}
                {brief.topPriorities.map((p, i) => (
                  <div key={p.recommendationId ?? i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                    <PriorityChip p={p.priority} />
                    <span className="text-[12.5px] truncate flex-1" style={{ color: "var(--t-text-body)" }}>{p.title}</span>
                    <span className="text-[10.5px] flex-shrink-0 capitalize" style={{ color: "var(--t-dim)" }}>{p.agent}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risks + opportunities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="vc-label mb-1.5 flex items-center gap-1.5" style={{ color: "#ef4444" }}><AlertTriangle size={12} /> Top Risks</p>
                <ul className="space-y-1">
                  {brief.topRisks.length === 0 && <li className="text-[11.5px]" style={{ color: "var(--t-muted)" }}>None flagged.</li>}
                  {brief.topRisks.map((r, i) => (
                    <li key={i} className="text-[11.5px] leading-snug" style={{ color: "var(--t-text-body)" }}>• {r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="vc-label mb-1.5 flex items-center gap-1.5" style={{ color: "#22c55e" }}><Sparkles size={12} /> Top Opportunities</p>
                <ul className="space-y-1">
                  {brief.topOpportunities.length === 0 && <li className="text-[11.5px]" style={{ color: "var(--t-muted)" }}>None flagged.</li>}
                  {brief.topOpportunities.map((o, i) => (
                    <li key={i} className="text-[11.5px] leading-snug" style={{ color: "var(--t-text-body)" }}>• {o}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Executive queue snapshot */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="vc-label">Executive Queue</p>
                <Link href="/recommendations" className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#a78bfa" }}>
                  Review all <ArrowRight size={11} />
                </Link>
              </div>
              <div className="space-y-1.5">
                {queue.slice(0, 4).map((q, i) => (
                  <Link key={q.recommendationId ?? i} href="/recommendations"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                    <PriorityChip p={q.priority} />
                    <span className="text-[12px] truncate flex-1" style={{ color: "var(--t-text-body)" }}>{q.title}</span>
                    {q.revenueImpact && (
                      <span className="text-[10px] font-semibold flex-shrink-0 hidden sm:inline" style={{ color: "#c9a84c" }}>{q.revenueImpact}</span>
                    )}
                  </Link>
                ))}
                {queue.length === 0 && <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>Queue empty.</p>}
              </div>
            </div>

            <p className="text-[10.5px]" style={{ color: "var(--t-dim)" }}>
              Vanessa prioritizes and recommends. Every item requires human review — nothing executes automatically.
            </p>
          </>
        )}
      </div>
    </VCPanel>
  );
}
