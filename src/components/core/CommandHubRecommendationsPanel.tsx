"use client";

// Vault Core — compact Command Hub panel surfacing the recommendation queue.
// Renders on the Command Hub (/) so agent intelligence becomes actionable
// without leaving the hub. Links to the full /recommendations console.
// Read-only summary — all review actions happen in the console.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, ArrowRight, Gauge } from "lucide-react";
import { VCPanel, VCPanelHeader, VCStatusBadge, VCChip } from "@/components/ui/VaultUI";
import { STATUS_META } from "./recommendationStatus";
import type { VaultRecommendationRow, RecommendationCounts } from "@/lib/core/types";

export function CommandHubRecommendationsPanel() {
  const [recs, setRecs] = useState<VaultRecommendationRow[]>([]);
  const [counts, setCounts] = useState<RecommendationCounts | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/core/recommendations?status=pending_review")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (cancelled) return;
        setRecs((d.recommendations ?? []).slice(0, 4));
        setCounts(d.counts ?? null);
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

  // Operators without approval access simply don't see the panel.
  if (forbidden) return null;

  const pending = counts?.pending_review ?? recs.length;

  return (
    <VCPanel accent="orange">
      <VCPanelHeader
        icon={Lightbulb}
        label="Vault Core · Human Review"
        title="Recommendations"
        live
        action={
          <Link href="/recommendations" className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#ff8400" }}>
            Open queue <ArrowRight size={11} />
          </Link>
        }
      />
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <VCStatusBadge label={`${pending} pending review`} variant="blue" dot />
          {counts && <VCChip label={`${counts.approved} approved`} color="#22c55e" />}
          {counts && <VCChip label={`${counts.implemented} implemented`} color="#a78bfa" />}
        </div>

        {!loaded && <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>Loading…</p>}
        {loaded && recs.length === 0 && (
          <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No recommendations pending review.</p>
        )}

        <div className="space-y-1.5">
          {recs.map((r) => (
            <Link
              key={r.id}
              href="/recommendations"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all"
              style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}
            >
              <span className="text-[12.5px] truncate flex-1" style={{ color: "var(--t-text-body)" }}>{r.title}</span>
              {r.revenue_impact && (
                <span className="text-[10.5px] font-semibold flex-shrink-0 px-1.5 py-0.5 rounded-full hidden sm:inline"
                  style={{ color: "#c9a84c", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.22)" }}>
                  {r.revenue_impact}
                </span>
              )}
              <span className="inline-flex items-center gap-1 flex-shrink-0">
                <Gauge size={11} style={{ color: "#ff8400" }} />
                <span className="text-[11px] font-semibold" style={{ color: "#ff8400" }}>{Math.round(r.priority_score * 100)}</span>
              </span>
              <VCStatusBadge label={STATUS_META[r.status].label} variant={STATUS_META[r.status].variant} />
            </Link>
          ))}
        </div>

        <p className="text-[10.5px] mt-3" style={{ color: "var(--t-dim)" }}>
          Human approval required. Nothing executes automatically.
        </p>
      </div>
    </VCPanel>
  );
}
