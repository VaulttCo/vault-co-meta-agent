"use client";

// Vault OS Mission Control — Operations Feed (Section 5). NAME LOCKED.
// A living stream built only from real data: Vault Core activity[] + agent runs[].
// No fabricated entries. Empty / forbidden → VaultUI empty state.

import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { VCPanel, VCPanelHeader, VCEmptyState } from "@/components/ui/VaultUI";
import type { VaultActivityRow, VaultAgentRunRow } from "@/lib/core/types";
import { relativeTime } from "./relativeTime";

interface FeedItem {
  id: string;
  agent: string;
  text: string;
  ts: string;
  dotColor: string;
}

const RUN_STATUS_COLOR: Record<string, string> = {
  success: "#22c55e",
  error: "#ef4444",
  skipped: "#6b7a99",
};

interface OperationsFeedProps {
  loading: boolean;
  activity: VaultActivityRow[];
  runs: VaultAgentRunRow[];
}

export function OperationsFeed({ loading, activity, runs }: OperationsFeedProps) {
  const items: FeedItem[] = [
    ...activity.map((a) => ({
      id: `act-${a.id}`,
      agent: a.agent,
      text: a.message,
      ts: a.created_at,
      dotColor: "#0081f2",
    })),
    ...runs.map((r) => ({
      id: `run-${r.id}`,
      agent: r.agent,
      text: r.detail ?? `${r.tier} cycle · ${r.status}`,
      ts: r.started_at,
      dotColor: RUN_STATUS_COLOR[r.status] ?? "#6b7a99",
    })),
  ]
    .filter((i) => i.ts)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 8);

  return (
    <VCPanel>
      <VCPanelHeader
        icon={Activity}
        title="Operations Feed"
        live={items.length > 0}
        action={
          <Link href="/vault-core" className="flex items-center gap-1 text-[11px] font-medium opacity-60 hover:opacity-100" style={{ color: "var(--t-muted)" }}>
            View all <ArrowRight size={10} />
          </Link>
        }
      />
      <div className="px-5 py-4">
        {loading ? (
          <VCEmptyState loading title="Loading operations…" />
        ) : items.length === 0 ? (
          <VCEmptyState
            icon={Activity}
            title="No operations yet"
            description="Workforce activity and agent runs will appear here as they happen."
          />
        ) : (
          <div className="flex flex-col">
            {items.map((it, i) => (
              <div
                key={it.id}
                className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: i < items.length - 1 ? "1px solid var(--t-border-subtle)" : "none" }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: it.dotColor }} />
                <span className="text-[10px] font-bold uppercase tracking-wide flex-shrink-0" style={{ color: "var(--t-dim)", minWidth: 56 }}>
                  {it.agent}
                </span>
                <span className="text-[12.5px] flex-1 truncate" style={{ color: "var(--t-text-body)" }}>
                  {it.text}
                </span>
                <span className="text-[10.5px] flex-shrink-0" style={{ color: "var(--t-dim)" }}>
                  {relativeTime(it.ts)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </VCPanel>
  );
}
