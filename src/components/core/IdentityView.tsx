"use client";

// Vault Core — Vault Co Identity Core view (Phase 6.8). Read-only.
// Who Vault Co is, how it communicates, what to avoid / double down on, the
// legacy learning archive, and GHL source status. Veronica Design.

import { useCallback, useEffect, useState } from "react";
import {
  Fingerprint,
  Target,
  Package,
  Mic2,
  AlertTriangle,
  TrendingUp,
  History,
  Database,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { VCPageWrapper, VCPanel, VCPanelHeader, VCStatusBadge, VCEmptyState, VCSkeleton } from "@/components/ui/VaultUI";
import type { IdentitySummary } from "@/lib/core/types";

function List({ items, color = "var(--t-text-body)", marker = "•" }: { items: string[]; color?: string; marker?: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((s, i) => (
        <li key={i} className="text-[12.5px] leading-snug flex gap-2" style={{ color }}>
          <span style={{ color: "var(--t-dim)" }}>{marker}</span>
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

export function IdentityView() {
  const [identity, setIdentity] = useState<IdentitySummary | null>(null);
  const [legacySource, setLegacySource] = useState<string>("mock");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/core/identity").then((r) => r.json());
      if (res.error) {
        setError("You don't have access to the Vault Co Identity Core.");
        return;
      }
      setError(null);
      setIdentity(res.identity ?? null);
      setLegacySource(res.legacySource ?? "mock");
    } catch {
      setError("Failed to load the Identity Core.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (error) {
    return (
      <VCPageWrapper>
        <PageHeader sectionLabel="Vault Core · Identity" title="Vault Co Identity Core" />
        <VCPanel><VCEmptyState icon={Fingerprint} title="Identity Core unavailable" description={error} /></VCPanel>
      </VCPageWrapper>
    );
  }

  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Identity"
        title="Vault Co Identity Core"
        description="Who Vault Co is, how it communicates, and what its own history teaches the workforce. Read-only."
        badge={<VCStatusBadge label="Company DNA" variant="gold" dot />}
      />

      {loading && <VCPanel><div className="px-5 py-5"><VCSkeleton rows={5} /></div></VCPanel>}

      {!loading && identity && (
        <>
          {/* Who Vault Co is */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <VCPanel accent="gold">
              <VCPanelHeader icon={Fingerprint} label="Identity" title="Positioning" />
              <p className="px-5 py-4 text-[12.5px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>{identity.positioning}</p>
            </VCPanel>
            <VCPanel accent="blue">
              <VCPanelHeader icon={Target} label="Audience" title="Target Market" />
              <p className="px-5 py-4 text-[12.5px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>{identity.targetMarket}</p>
            </VCPanel>
            <VCPanel accent="green">
              <VCPanelHeader icon={Package} label="Offer" title="Core Offer" />
              <p className="px-5 py-4 text-[12.5px] leading-relaxed" style={{ color: "var(--t-text-body)" }}>{identity.coreOffer}</p>
            </VCPanel>
          </div>

          {/* Voice + principles */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <VCPanel accent="purple">
              <VCPanelHeader icon={Mic2} label="Voice" title="Brand Voice" />
              <div className="px-5 py-4"><List items={identity.brandVoice} /></div>
            </VCPanel>
            <VCPanel accent="blue">
              <VCPanelHeader icon={Mic2} label="Messaging" title="Messaging Principles" />
              <div className="px-5 py-4"><List items={identity.messagingPrinciples} /></div>
            </VCPanel>
          </div>

          {/* Stop / double down */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <VCPanel accent="red">
              <VCPanelHeader icon={AlertTriangle} label="Guardrails" title="What to Avoid / Stop" />
              <div className="px-5 py-4"><List items={identity.avoid} color="var(--t-text-body)" marker="✕" /></div>
            </VCPanel>
            <VCPanel accent="green">
              <VCPanelHeader icon={TrendingUp} label="Strengths" title="Double Down On" />
              <div className="px-5 py-4"><List items={identity.doubleDownOn} marker="↑" /></div>
            </VCPanel>
          </div>

          {/* Legacy learnings */}
          <VCPanel accent="orange">
            <VCPanelHeader icon={History} label="Legacy GHL Archive" title="Messaging Lessons" action={<VCStatusBadge label={legacySource === "live" ? "Live archive" : "Curated lessons"} variant={legacySource === "live" ? "success" : "blue"} />} />
            <div className="px-5 py-4 space-y-2.5">
              {identity.legacyLearnings.map((l, i) => (
                <div key={i} className="px-3.5 py-2.5 rounded-xl" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{l.title}</p>
                  <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "var(--t-text-body)" }}>{l.detail}</p>
                </div>
              ))}
            </div>
            <p className="px-5 pb-4 text-[10.5px]" style={{ color: "var(--t-dim)" }}>
              Read-only learning archive. Improvement recommendations flow to the Command Hub for human review — nothing sends or mutates GHL.
            </p>
          </VCPanel>

          {/* GHL source status */}
          <VCPanel>
            <VCPanelHeader icon={Database} label="Data Sources" title="Vault Co GHL Scope" />
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {identity.sources.map((s) => (
                <div key={s.account} className="px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
                  {s.configured ? <CheckCircle2 size={18} style={{ color: "#22c55e" }} /> : <XCircle size={18} style={{ color: "var(--t-dim)" }} />}
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold capitalize" style={{ color: "var(--t-text)" }}>{s.account} Vault Co GHL</p>
                    <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                      {s.configured ? `Connected (read-only)${s.locationId ? ` · ${s.locationId}` : ""}` : "Not configured — using mock data"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="px-5 pb-4 text-[10.5px]" style={{ color: "var(--t-dim)" }}>
              Vault Core reads only Vault Co-owned sub-accounts (current + legacy). Client sub-accounts are never accessed. GET-only — no mutation.
            </p>
          </VCPanel>
        </>
      )}
    </VCPageWrapper>
  );
}
