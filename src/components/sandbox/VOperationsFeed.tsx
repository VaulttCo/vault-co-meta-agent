"use client";

/** Isolated sandbox — not imported by any production page */

import { Activity, BookOpen, RotateCcw, Terminal } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import {
  VCPanel,
  VCPanelHeader,
  VCSectionLabel,
  VCStatusBadge,
  VCChip,
  VCEmptyState,
  VCButton,
  VCDivider,
} from "@/components/ui/VaultUI";
import type { VeronicaHermesRunRow, VeronicaHermesSkillRow } from "@/lib/supabase/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type RunVariant = "success" | "danger" | "warning" | "neutral";

function runVariant(status: string): RunVariant {
  if (status === "success") return "success";
  if (status === "error") return "danger";
  if (status === "unreachable") return "warning";
  return "neutral";
}

function runLabel(status: string): string {
  if (status === "success") return "OK";
  if (status === "error") return "ERR";
  if (status === "unreachable") return "—";
  return status.toUpperCase();
}

// ── Run row ───────────────────────────────────────────────────────────────────

function RunRow({ run }: { run: VeronicaHermesRunRow }) {
  const preview =
    run.prompt.length > 72 ? run.prompt.slice(0, 72) + "…" : run.prompt;

  return (
    <div
      className="flex items-start gap-2.5 py-2.5"
      style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
    >
      <VCStatusBadge label={runLabel(run.status)} variant={runVariant(run.status)} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] leading-snug" style={{ color: "var(--t-text)" }}>
          {preview}
        </p>
        {run.error && (
          <p className="text-[10px] mt-0.5 truncate" style={{ color: "#ef4444" }}>
            {run.error}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {run.auto_skill_created && (
            <VCChip label="Skill saved" color="#a78bfa" />
          )}
          <span className="text-[10px]" style={{ color: "var(--t-dim)" }}>
            {relativeTime(run.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Skill row ─────────────────────────────────────────────────────────────────

function SkillRow({
  skill,
  running,
  reduced,
  onRun,
}: {
  skill: VeronicaHermesSkillRow;
  running: boolean;
  reduced: boolean;
  onRun: () => void;
}) {
  return (
    <div
      className="flex items-start justify-between gap-2 py-2.5"
      style={{ borderBottom: "1px solid var(--t-border-subtle)" }}
    >
      <div className="flex items-start gap-2 min-w-0">
        <BookOpen
          size={11}
          className="flex-shrink-0 mt-0.5"
          style={{ color: "#a78bfa" }}
        />
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold leading-tight truncate"
            style={{ color: "var(--t-text)" }}
          >
            {skill.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {skill.category && (
              <VCChip label={skill.category} color="#a78bfa" />
            )}
            {skill.usage_count > 0 && (
              <span className="text-[10px]" style={{ color: "var(--t-dim)" }}>
                {skill.usage_count}× used
              </span>
            )}
          </div>
        </div>
      </div>

      <VCButton variant="ghost" size="sm" onClick={onRun} disabled={running}>
        {running ? (
          <span
            className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
              reduced ? "" : "motion-safe:animate-spin"
            }`}
            style={{
              borderColor: "rgba(107,122,153,0.4)",
              borderTopColor: "transparent",
            }}
          />
        ) : (
          <RotateCcw size={10} />
        )}
        Run
      </VCButton>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface VOperationsFeedProps {
  runs: VeronicaHermesRunRow[];
  skills: VeronicaHermesSkillRow[];
  runsLoading: boolean;
  skillsLoading: boolean;
  runningSkillId: string | null;
  onRunSkill: (skill: VeronicaHermesSkillRow) => void;
}

export function VOperationsFeed({
  runs,
  skills,
  runsLoading,
  skillsLoading,
  runningSkillId,
  onRunSkill,
}: VOperationsFeedProps) {
  const reduced = useReducedMotion() ?? false;

  return (
    <VCPanel>
      <VCPanelHeader icon={Activity} title="Operations Feed" />

      {/* ── Recent Runs ──────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-1">
        <VCSectionLabel>Recent Runs</VCSectionLabel>
      </div>

      <div className="px-4" style={{ maxHeight: 360, overflowY: "auto" }}>
        {runsLoading ? (
          <div className="py-6">
            <VCEmptyState loading title="Loading runs…" />
          </div>
        ) : runs.length === 0 ? (
          <div className="py-6">
            <VCEmptyState
              icon={Terminal}
              title="No runs yet"
              description="Submit a prompt to Hermes to see activity here."
            />
          </div>
        ) : (
          runs.map((run) => <RunRow key={run.id} run={run} />)
        )}
      </div>

      <div className="px-4 py-3">
        <VCDivider />
      </div>

      {/* ── Saved Skills ─────────────────────────────────────────── */}
      <div className="px-4 pb-1">
        <VCSectionLabel>Saved Skills</VCSectionLabel>
      </div>

      <div className="px-4 pb-4" style={{ maxHeight: 280, overflowY: "auto" }}>
        {skillsLoading ? (
          <div className="py-6">
            <VCEmptyState loading title="Loading skills…" />
          </div>
        ) : skills.length === 0 ? (
          <div className="py-6">
            <VCEmptyState
              icon={BookOpen}
              title="No skills saved"
              description="Reusable outputs are auto-detected and saved here."
            />
          </div>
        ) : (
          <>
            {skills.slice(0, 8).map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                running={runningSkillId === skill.id}
                reduced={reduced}
                onRun={() => onRunSkill(skill)}
              />
            ))}
            {skills.length > 8 && (
              <p
                className="text-[11px] text-center pt-3"
                style={{ color: "var(--t-dim)" }}
              >
                + {skills.length - 8} more skills
              </p>
            )}
          </>
        )}
      </div>
    </VCPanel>
  );
}

// ── Sandbox preview ───────────────────────────────────────────────────────────
// Static mock data for visual testing. Never wired to a production page.

const MOCK_RUNS: VeronicaHermesRunRow[] = [
  {
    id: "r1",
    prompt:
      "Draft a 30-day onboarding SOP for a new roofing client entering their first Meta campaign",
    output: "Here is the 30-day SOP…",
    error: null,
    status: "success",
    created_by: null,
    created_at: new Date(Date.now() - 2 * 60_000).toISOString(),
    auto_skill_created: true,
    skill_id: "s1",
    task_id: null,
  },
  {
    id: "r2",
    prompt:
      "Analyze budget pacing for all active campaigns and flag any at risk of overspend this month",
    output: null,
    error: "Claude API timeout after 30s",
    status: "error",
    created_by: null,
    created_at: new Date(Date.now() - 14 * 60_000).toISOString(),
    auto_skill_created: false,
    skill_id: null,
    task_id: null,
  },
  {
    id: "r3",
    prompt:
      "Generate a client intelligence summary for JJ Roofing based on last 90 days of campaign performance",
    output: "Intelligence summary complete…",
    error: null,
    status: "success",
    created_by: null,
    created_at: new Date(Date.now() - 65 * 60_000).toISOString(),
    auto_skill_created: false,
    skill_id: null,
    task_id: null,
  },
  {
    id: "r4",
    prompt: "Check GHL pipeline for all active clients and report opportunity count by stage",
    output: null,
    error: null,
    status: "unreachable",
    created_by: null,
    created_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
    auto_skill_created: false,
    skill_id: null,
    task_id: null,
  },
];

const MOCK_SKILLS: VeronicaHermesSkillRow[] = [
  {
    id: "s1",
    name: "30-Day Onboarding SOP",
    description: null,
    category: "operations",
    instructions:
      "Draft a 30-day onboarding SOP for a new roofing client entering their first Meta campaign",
    source_run_id: "r1",
    created_at: new Date(Date.now() - 2 * 60_000).toISOString(),
    created_by: null,
    last_used_at: null,
    usage_count: 1,
    auto_created: true,
  },
  {
    id: "s2",
    name: "Budget Pacing Audit",
    description: null,
    category: "finance",
    instructions:
      "Analyze budget pacing for all active campaigns and flag any at risk of overspend",
    source_run_id: null,
    created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    created_by: null,
    last_used_at: null,
    usage_count: 4,
    auto_created: false,
  },
  {
    id: "s3",
    name: "Client Intelligence Report",
    description: null,
    category: "intelligence",
    instructions:
      "Generate a client intelligence summary based on last 90 days of campaign performance",
    source_run_id: null,
    created_at: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    created_by: null,
    last_used_at: null,
    usage_count: 2,
    auto_created: false,
  },
];

export default function VOperationsFeedPreview() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--t-bg)",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 400, margin: "0 auto" }}>
        <p className="vc-label mb-4">sandbox — VOperationsFeed</p>
        <VOperationsFeed
          runs={MOCK_RUNS}
          skills={MOCK_SKILLS}
          runsLoading={false}
          skillsLoading={false}
          runningSkillId={null}
          onRunSkill={() => {}}
        />
      </div>
    </div>
  );
}
