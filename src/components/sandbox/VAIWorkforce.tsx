"use client";

/** Isolated sandbox — not imported by any production page */

import type { LucideIcon } from "lucide-react";
import { Bot, Terminal, Sparkles } from "lucide-react";
import {
  VCPanel,
  VCPanelHeader,
  VCGlowIcon,
  VCStatusBadge,
  VCActionLink,
} from "@/components/ui/VaultUI";
import type { VeronicaHermesRunRow, VeronicaHermesSkillRow } from "@/lib/supabase/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

type StatusVariant = "success" | "warning" | "danger" | "neutral";

function hermesStatusVariant(
  runs: VeronicaHermesRunRow[],
  loading: boolean
): StatusVariant {
  if (loading || runs.length === 0) return "neutral";
  const s = runs[0].status;
  if (s === "success") return "success";
  if (s === "unreachable") return "warning";
  return "danger";
}

function hermesStatusLabel(
  runs: VeronicaHermesRunRow[],
  loading: boolean
): string {
  if (loading) return "Checking…";
  if (runs.length === 0) return "No runs yet";
  const s = runs[0].status;
  if (s === "success") return "Ready";
  if (s === "unreachable") return "Unreachable";
  return "Last run failed";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Agent card ────────────────────────────────────────────────────────────────

interface AgentCardProps {
  icon: LucideIcon;
  iconColor: string;
  name: string;
  role: string;
  statusVariant: StatusVariant;
  statusLabel: string;
  stat1: string;
  stat2: string;
  actionLabel: string;
  actionHref: string;
}

function AgentCard({
  icon,
  iconColor,
  name,
  role,
  statusVariant,
  statusLabel,
  stat1,
  stat2,
  actionLabel,
  actionHref,
}: AgentCardProps) {
  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl"
      style={{
        backgroundColor: "var(--t-surface-2)",
        border: "1px solid var(--t-border-subtle)",
      }}
    >
      {/* Header: icon + name + status badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <VCGlowIcon icon={icon} color={iconColor} size={15} ringSize={34} />
          <div>
            <p
              className="text-[13px] font-semibold leading-tight"
              style={{
                fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                color: "var(--t-text)",
              }}
            >
              {name}
            </p>
            <p className="text-[10px]" style={{ color: "var(--t-dim)" }}>
              {role}
            </p>
          </div>
        </div>
        <VCStatusBadge
          label={statusLabel}
          variant={statusVariant}
          dot={statusVariant === "success"}
        />
      </div>

      {/* Stats */}
      <div className="space-y-0.5">
        <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
          {stat1}
        </p>
        <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
          {stat2}
        </p>
      </div>

      {/* Action link */}
      <VCActionLink href={actionHref} label={actionLabel} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface VAIWorkforceProps {
  pendingPlans: number;
  draftPlans: number;
  approvedPlans: number;
  hermesRuns: VeronicaHermesRunRow[];
  hermesSkills: VeronicaHermesSkillRow[];
  hermesRunsLoading: boolean;
}

export function VAIWorkforce({
  pendingPlans,
  draftPlans,
  approvedPlans,
  hermesRuns,
  hermesSkills,
  hermesRunsLoading,
}: VAIWorkforceProps) {
  // Veronica — derives from plan state
  const totalActiveDrafts = draftPlans + approvedPlans;
  const veronicaStat1 = `${totalActiveDrafts} draft${totalActiveDrafts !== 1 ? "s" : ""} in progress`;
  const veronicaStat2 = `${pendingPlans} pending review`;

  // Hermes — derives from run history
  const hermesVariant = hermesStatusVariant(hermesRuns, hermesRunsLoading);
  const hermesLabel   = hermesStatusLabel(hermesRuns, hermesRunsLoading);
  const hermesLastRun = hermesRuns.length > 0
    ? `Last run: ${relativeTime(hermesRuns[0].created_at)}`
    : "No runs yet";
  const hermesStat2 = `${hermesSkills.length} skill${hermesSkills.length !== 1 ? "s" : ""} saved`;

  // Victoria — always active (route exists, no runtime data loaded here)
  const victoriaStat1 = "Sales AI · Prospect queue";
  const victoriaStat2 = "Live session support";

  return (
    <VCPanel accent="blue">
      <VCPanelHeader icon={Sparkles} title="AI Workforce" label="VAULT CO" />
      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AgentCard
          icon={Bot}
          iconColor="#0081f2"
          name="Veronica"
          role="Campaign AI"
          statusVariant="success"
          statusLabel="Active"
          stat1={veronicaStat1}
          stat2={veronicaStat2}
          actionLabel="Open Console"
          actionHref="/ai-agent/console"
        />
        <AgentCard
          icon={Terminal}
          iconColor="#4aabff"
          name="Hermes"
          role="Execution Layer"
          statusVariant={hermesVariant}
          statusLabel={hermesLabel}
          stat1={hermesLastRun}
          stat2={hermesStat2}
          actionLabel="View Operations Feed"
          actionHref="#operations-feed"
        />
        <AgentCard
          icon={Sparkles}
          iconColor="#a78bfa"
          name="Victoria"
          role="Sales Intelligence"
          statusVariant="success"
          statusLabel="Active"
          stat1={victoriaStat1}
          stat2={victoriaStat2}
          actionLabel="Open Victoria"
          actionHref="/victoria"
        />
      </div>
    </VCPanel>
  );
}

// ── Sandbox preview ───────────────────────────────────────────────────────────
// Static mock data for visual testing. Never wired to a production page.

const MOCK_RUNS: VeronicaHermesRunRow[] = [
  {
    id: "r1",
    prompt: "Draft onboarding SOP",
    output: "Complete.",
    error: null,
    status: "success",
    created_by: null,
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    auto_skill_created: true,
    skill_id: "s1",
    task_id: null,
  },
];

const MOCK_SKILLS: VeronicaHermesSkillRow[] = [
  {
    id: "s1",
    name: "Onboarding SOP",
    description: null,
    category: "ops",
    instructions: "Draft onboarding SOP",
    source_run_id: "r1",
    created_at: new Date().toISOString(),
    created_by: null,
    last_used_at: null,
    usage_count: 1,
    auto_created: true,
  },
  {
    id: "s2",
    name: "Budget Audit",
    description: null,
    category: "finance",
    instructions: "Analyze budget pacing",
    source_run_id: null,
    created_at: new Date().toISOString(),
    created_by: null,
    last_used_at: null,
    usage_count: 4,
    auto_created: false,
  },
];

export default function VAIWorkforcePreview() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--t-bg)",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <p className="vc-label mb-4">sandbox — VAIWorkforce</p>
        <VAIWorkforce
          pendingPlans={3}
          draftPlans={2}
          approvedPlans={1}
          hermesRuns={MOCK_RUNS}
          hermesSkills={MOCK_SKILLS}
          hermesRunsLoading={false}
        />
      </div>
    </div>
  );
}
