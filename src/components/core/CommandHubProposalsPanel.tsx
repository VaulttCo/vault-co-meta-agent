"use client";

// Vault Core — compact Command Hub panel for System Creation Engine proposals.
// Surfaces Vault Core's self-improvement proposals on the hub. Read-only summary;
// review happens in the /proposals console.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wrench, ArrowRight, Gauge } from "lucide-react";
import { VCPanel, VCPanelHeader, VCStatusBadge, VCChip } from "@/components/ui/VaultUI";
import { STATUS_META } from "./recommendationStatus";
import type { SystemProposalRow, RecommendationCounts } from "@/lib/core/types";

export function CommandHubProposalsPanel() {
  const [proposals, setProposals] = useState<SystemProposalRow[]>([]);
  const [counts, setCounts] = useState<RecommendationCounts | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/core/proposals?status=pending_review")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (cancelled) return;
        setProposals((d.proposals ?? []).slice(0, 4));
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

  if (forbidden) return null;
  const pending = counts?.pending_review ?? proposals.length;

  return (
    <VCPanel accent="purple">
      <VCPanelHeader
        icon={Wrench}
        label="Vault Core · System Creation Engine"
        title="System Proposals"
        live
        action={
          <Link href="/proposals" className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#a78bfa" }}>
            Open queue <ArrowRight size={11} />
          </Link>
        }
      />
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <VCStatusBadge label={`${pending} pending review`} variant="blue" dot />
          {counts && <VCChip label={`${counts.implemented} implemented`} color="#a78bfa" />}
        </div>
        {!loaded && <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>Loading…</p>}
        {loaded && proposals.length === 0 && (
          <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No system proposals pending.</p>
        )}
        <div className="space-y-1.5">
          {proposals.map((p) => (
            <Link key={p.id} href="/proposals"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all"
              style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
              <span className="text-[12.5px] truncate flex-1" style={{ color: "var(--t-text-body)" }}>{p.title}</span>
              <span className="inline-flex items-center gap-1 flex-shrink-0">
                <Gauge size={11} style={{ color: "#a78bfa" }} />
                <span className="text-[11px] font-semibold" style={{ color: "#a78bfa" }}>{Math.round(p.priority_score * 100)}</span>
              </span>
              <VCStatusBadge label={STATUS_META[p.status].label} variant={STATUS_META[p.status].variant} />
            </Link>
          ))}
        </div>
        <p className="text-[10.5px] mt-3" style={{ color: "var(--t-dim)" }}>
          Vault Core proposes; humans approve. Nothing is built automatically.
        </p>
      </div>
    </VCPanel>
  );
}
