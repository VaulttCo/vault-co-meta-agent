"use client";

// Vault Core — compact Command Hub panel for Veronica's draft approval queue.
// Read-only preview; review happens in /drafts. Drafts are never sent.

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, ArrowRight, Clock } from "lucide-react";
import { VCPanel, VCPanelHeader, VCStatusBadge, VCChip } from "@/components/ui/VaultUI";
import { DRAFT_STATUS_META, DRAFT_TYPE_LABEL } from "./recommendationStatus";
import type { MessageDraftRow, DraftCounts } from "@/lib/core/types";

export function CommandHubDraftsPanel() {
  const [drafts, setDrafts] = useState<MessageDraftRow[]>([]);
  const [counts, setCounts] = useState<DraftCounts | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/core/drafts?status=draft")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (cancelled) return;
        setDrafts((d.drafts ?? []).slice(0, 4));
        setCounts(d.counts ?? null);
        setLoaded(true);
      })
      .catch((s) => { if (cancelled) return; if (s === 403 || s === 401) setForbidden(true); setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  if (forbidden) return null;
  const pending = counts?.draft ?? drafts.length;

  return (
    <VCPanel accent="blue">
      <VCPanelHeader
        icon={MessageSquare}
        label="Vault Core · Veronica · Draft Queue"
        title="SMS / Follow-Up Drafts"
        live
        action={
          <Link href="/drafts" className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#0081f2" }}>
            Review drafts <ArrowRight size={11} />
          </Link>
        }
      />
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <VCStatusBadge label={`${pending} awaiting approval`} variant="blue" dot />
          {counts && <VCChip label={`${counts.approved} approved`} color="#22c55e" />}
        </div>
        {!loaded && <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>Loading…</p>}
        {loaded && drafts.length === 0 && <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No drafts awaiting approval.</p>}
        <div className="space-y-1.5">
          {drafts.map((d) => (
            <Link key={d.id} href="/drafts"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
              style={{ background: "var(--t-surface-2)", border: "1px solid var(--t-border-subtle)" }}>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium truncate" style={{ color: "var(--t-text)" }}>{d.lead_name ?? "Lead"}</span>
                <span className="block text-[11px] truncate" style={{ color: "var(--t-muted)" }}>{d.body}</span>
              </span>
              <VCChip label={DRAFT_TYPE_LABEL[d.draft_type] ?? d.draft_type} color="#0081f2" />
              <VCStatusBadge label={(DRAFT_STATUS_META[d.status] ?? DRAFT_STATUS_META.draft).label} variant={(DRAFT_STATUS_META[d.status] ?? DRAFT_STATUS_META.draft).variant} />
            </Link>
          ))}
        </div>
        <p className="text-[10.5px] mt-3 flex items-center gap-1" style={{ color: "var(--t-dim)" }}>
          <Clock size={10} /> Drafts require human approval. Vault Core never sends SMS or touches GHL.
        </p>
      </div>
    </VCPanel>
  );
}
